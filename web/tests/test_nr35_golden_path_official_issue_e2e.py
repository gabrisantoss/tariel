from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import uuid
import zipfile

import app.domains.admin.services as admin_services
import pytest
from sqlalchemy import select

from app.domains.chat.nr35_linha_vida_pdf_contract import (
    NR35_REQUIRED_PDF_SECTIONS,
    NR35_REQUIRED_PHOTO_SLOTS,
)
from app.domains.chat.nr35_linha_vida_structured_review import (
    apply_nr35_structured_review_edits_to_laudo,
    ensure_nr35_structured_review_ready_for_mesa_approval,
    mark_nr35_structured_review_mesa_approved,
)
from app.domains.chat.nr35_linha_vida_validation import (
    NR35_FAMILY_KEY,
    NR35_TEMPLATE_KEY,
    validate_nr35_linha_vida_golden_path,
)
from app.shared.database import (
    EmissaoOficialLaudo,
    Empresa,
    Laudo,
    NivelAcesso,
    SignatarioGovernadoLaudo,
    StatusLaudo,
    StatusRevisao,
    Usuario,
)
from app.shared.official_issue_package import build_official_issue_package
from app.shared.official_issue_transaction import emitir_oficialmente_transacional
from app.shared.operational_memory_hooks import record_approved_case_snapshot_for_laudo
from app.shared.tenant_admin_policy import sanitize_tenant_admin_policy
from app.shared.tenant_entitlement_guard import tenant_capability_enabled_for_user
from app.shared.tenant_report_catalog import (
    build_catalog_selection_token,
    build_tenant_template_option_snapshot,
)
from tests.regras_rotas_criticas_support import (
    SENHA_HASH_PADRAO,
    _login_cliente,
    _pdf_base_bytes_teste,
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_nr35_payload() -> dict:
    payload = json.loads(
        (
            _repo_root()
            / "docs"
            / "family_schemas"
            / "nr35_inspecao_linha_de_vida.laudo_output_exemplo.json"
        ).read_text(encoding="utf-8")
    )
    payload["family_key"] = NR35_FAMILY_KEY
    payload["template_code"] = NR35_TEMPLATE_KEY
    payload["auditoria"] = dict(payload.get("auditoria") or {})
    return payload


def _payload_nr35_mesa_pending() -> dict:
    payload = _load_nr35_payload()
    payload["mesa_review"] = {
        "status": "pendente",
        "aprovacao_origem": None,
        "ia_aprovou_mesa": False,
        "observacoes_mesa": "Aguardando revisão humana.",
    }
    payload["auditoria"]["mesa_status"] = "pendente"
    return payload


def _payload_nr35_mesa_humana_aprovada() -> dict:
    payload = _load_nr35_payload()
    payload["mesa_review"] = {
        "status": StatusRevisao.APROVADO.value,
        "aprovacao_origem": "mesa_humana",
        "ia_aprovou_mesa": False,
        "aprovado_por_id": 42,
        "aprovado_por_nome": "Mesa NR35",
        "aprovado_em": "2026-04-26T12:00:00+00:00",
    }
    payload["auditoria"]["mesa_status"] = StatusRevisao.APROVADO.value
    return payload


def _payload_nr35_mesa_ia_aprovada() -> dict:
    payload = _payload_nr35_mesa_humana_aprovada()
    payload["mesa_review"]["aprovacao_origem"] = "ia"
    payload["mesa_review"]["ia_aprovou_mesa"] = True
    return payload


def _report_pack_nr35(*, quatro_fotos: bool = True) -> dict:
    slots = list(NR35_REQUIRED_PHOTO_SLOTS)
    if not quatro_fotos:
        slots = [slot for slot in slots if slot != "foto_detalhe_critico"]
    missing_evidence = []
    if not quatro_fotos:
        missing_evidence.append(
            {
                "kind": "image_slot",
                "slot": "foto_detalhe_critico",
                "message": "Foto obrigatória de detalhe crítico ausente.",
            }
        )
    return {
        "family": NR35_FAMILY_KEY,
        "template_key": NR35_TEMPLATE_KEY,
        "image_slots": [
            {
                "slot": slot,
                "title": slot.replace("_", " "),
                "required": True,
                "status": "resolved",
                "resolved_evidence_id": f"IMG_{index}",
                "resolved_message_id": index,
                "resolved_caption": f"Legenda tecnica {slot}",
                "campo_json": (
                    "nao_conformidades_ou_lacunas.evidencias"
                    if slot == "foto_detalhe_critico"
                    else "registros_fotograficos.slots_obrigatorios"
                ),
                "achado_relacionado": (
                    "achado_critico_ou_nao_conformidade"
                    if slot == "foto_detalhe_critico"
                    else "contexto_do_sistema"
                ),
                "secao_pdf": (
                    "achados_nao_conformidades"
                    if slot == "foto_detalhe_critico"
                    else "evidencias_registros_fotograficos"
                ),
            }
            for index, slot in enumerate(slots, start=701)
        ],
        "quality_gates": {
            "final_validation_mode": "mesa_required",
            "missing_evidence": missing_evidence,
        },
    }


def _patch_official_issue_storage(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    import app.shared.official_issue_package as official_issue_package
    import app.shared.official_issue_transaction as official_issue_transaction

    monkeypatch.setenv("SCHEMATHESIS_TEST_HINTS", "1")
    monkeypatch.setattr(official_issue_package, "WEB_ROOT", tmp_path)
    monkeypatch.setattr(official_issue_transaction, "WEB_ROOT", tmp_path)


def _configure_tenant_nr35_governance(banco, ids: dict) -> str:
    empresa = banco.get(Empresa, ids["empresa_a"])
    revisor = banco.get(Usuario, ids["revisor_a"])
    admin_cliente = banco.get(Usuario, ids["admin_cliente_a"])
    assert empresa is not None
    assert revisor is not None
    assert admin_cliente is not None

    empresa.admin_cliente_policy_json = sanitize_tenant_admin_policy(
        {
            "commercial_service_package": "inspector_chat_mesa",
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
        }
    )

    admin_services.upsert_familia_catalogo(
        banco,
        family_key=NR35_FAMILY_KEY,
        nome_exibicao="NR35 · Linha de Vida",
        macro_categoria="NR35",
        status_catalogo="publicado",
        criado_por_id=ids["admin_a"],
    )
    admin_services.upsert_oferta_comercial_familia(
        banco,
        family_key=NR35_FAMILY_KEY,
        nome_oferta="NR35 Golden Path",
        lifecycle_status="active",
        material_real_status="parcial",
        material_level="partial",
        release_channel="pilot",
        variantes_comerciais_text=(
            "piloto_linha_vida | Piloto linha de vida | nr35_linha_vida | Linha de vida"
        ),
        criado_por_id=ids["admin_a"],
    )
    selection_token = build_catalog_selection_token(NR35_FAMILY_KEY, "piloto_linha_vida")
    admin_services.upsert_tenant_family_release(
        banco,
        tenant_id=ids["empresa_a"],
        family_key=NR35_FAMILY_KEY,
        release_status="active",
        allowed_templates=[NR35_TEMPLATE_KEY],
        allowed_variants=[selection_token],
        force_review_mode="mesa_required",
        max_review_mode="mobile_review_allowed",
        mobile_review_override="allow",
        mobile_autonomous_override="deny",
        release_channel_override="pilot",
        criado_por_id=ids["admin_a"],
    )
    admin_services.sincronizar_portfolio_catalogo_empresa(
        banco,
        empresa_id=ids["empresa_a"],
        selection_tokens=[selection_token],
        admin_id=ids["admin_a"],
    )
    tenant_snapshot = build_tenant_template_option_snapshot(banco, empresa_id=ids["empresa_a"])
    assert tenant_snapshot["governed_mode"] is True
    assert NR35_TEMPLATE_KEY in tenant_snapshot["runtime_codes"]
    assert tenant_capability_enabled_for_user(revisor, capability="reviewer_decision") is True
    assert tenant_capability_enabled_for_user(revisor, capability="reviewer_issue") is True
    assert tenant_capability_enabled_for_user(admin_cliente, capability="reviewer_issue") is True
    return selection_token


def _add_nr35_signatory(banco, ids: dict) -> SignatarioGovernadoLaudo:
    signatario = SignatarioGovernadoLaudo(
        tenant_id=ids["empresa_a"],
        nome="Eng. NR35 Governado",
        funcao="Responsável técnico NR35",
        registro_profissional="CREA 3535",
        valid_until=datetime.now(timezone.utc) + timedelta(days=120),
        allowed_family_keys_json=[NR35_FAMILY_KEY],
        ativo=True,
        criado_por_id=ids["admin_a"],
    )
    banco.add(signatario)
    banco.flush()
    return signatario


def _create_admin_cliente_b(banco, ids: dict) -> Usuario:
    admin_cliente_b = Usuario(
        empresa_id=ids["empresa_b"],
        nome_completo="Admin Cliente B",
        email="cliente-nr35-b@empresa-b.test",
        senha_hash=SENHA_HASH_PADRAO,
        nivel_acesso=NivelAcesso.ADMIN_CLIENTE.value,
    )
    banco.add(admin_cliente_b)
    banco.flush()
    return admin_cliente_b


def _create_nr35_laudo(
    banco,
    ids: dict,
    *,
    payload: dict,
    report_pack: dict,
    selection_token: str | None = None,
    status_revisao: str = StatusRevisao.AGUARDANDO.value,
    nome_arquivo_pdf: str = "laudo_nr35_golden_path.pdf",
) -> Laudo:
    laudo = Laudo(
        empresa_id=ids["empresa_a"],
        usuario_id=ids["inspetor_a"],
        setor_industrial="NR35 Linha de Vida",
        tipo_template=NR35_TEMPLATE_KEY,
        catalog_family_key=NR35_FAMILY_KEY,
        catalog_family_label="NR35 · Linha de Vida",
        catalog_variant_key="piloto_linha_vida",
        catalog_variant_label="Piloto linha de vida",
        catalog_selection_token=selection_token,
        status_revisao=status_revisao,
        status_conformidade=StatusLaudo.NAO_CONFORME.value,
        codigo_hash=f"nr35e2e{uuid.uuid4().hex[:24]}",
        nome_arquivo_pdf=nome_arquivo_pdf,
        dados_formulario=deepcopy(payload),
        report_pack_draft_json=deepcopy(report_pack),
    )
    banco.add(laudo)
    banco.flush()

    payload_atual = deepcopy(laudo.dados_formulario)
    payload_atual.setdefault("case_context", {})
    payload_atual["case_context"]["laudo_id"] = int(laudo.id)
    payload_atual["case_context"]["empresa_nome"] = "Empresa A"
    laudo.dados_formulario = payload_atual
    banco.flush()
    return laudo


def _materialize_primary_pdf(
    *,
    tmp_path: Path,
    empresa_id: int,
    laudo_id: int,
    filename: str,
    pdf_bytes: bytes | None = None,
) -> tuple[Path, bytes]:
    content = pdf_bytes or _pdf_base_bytes_teste()
    caminho = (
        tmp_path
        / "storage"
        / "laudos_emitidos"
        / f"empresa_{empresa_id}"
        / f"laudo_{laudo_id}"
        / "v0003"
        / filename
    )
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(content)
    return caminho, content


def _approve_with_human_structured_review(banco, *, laudo: Laudo, revisor: Usuario):
    mesa_validation = validate_nr35_linha_vida_golden_path(
        payload=laudo.dados_formulario,
        report_pack_draft=laudo.report_pack_draft_json,
        template_key=NR35_TEMPLATE_KEY,
        catalog_family_key=NR35_FAMILY_KEY,
        level="mesa",
    )
    assert mesa_validation.ok is True

    review_state = apply_nr35_structured_review_edits_to_laudo(
        banco,
        laudo=laudo,
        actor_user=revisor,
        edits=[
                {
                    "target": "payload",
                    "path": "identificacao.codigo_interno",
                    "value": f"NR35-E2E-{int(laudo.id):04d}",
                    "justification": "Revisor humano consolidou o codigo interno antes da aprovacao Mesa.",
                    "resolves_issue_codes": [],
                }
        ],
    )
    assert review_state["applied_changes"]
    assert review_state["ready_for_mesa"] is True

    ready_state = ensure_nr35_structured_review_ready_for_mesa_approval(laudo)
    assert ready_state is not None
    assert ready_state["ready_for_mesa"] is True

    approved_state = mark_nr35_structured_review_mesa_approved(
        laudo,
        actor_user_id=int(revisor.id),
        actor_name="Revisor A",
    )
    assert approved_state is not None
    assert approved_state["ready_for_official_pdf"] is True

    laudo.status_revisao = StatusRevisao.APROVADO.value
    laudo.status_conformidade = StatusLaudo.NAO_CONFORME.value
    banco.flush()
    snapshot = record_approved_case_snapshot_for_laudo(
        banco,
        laudo=laudo,
        approved_by_id=int(revisor.id),
        document_outcome="approved_by_mesa",
        mesa_resolution_summary={
            "decision": "aprovar",
            "decision_source": "mesa_humana",
            "reviewer_id": int(revisor.id),
            "reviewer_name": "Revisor A",
        },
    )
    banco.flush()
    return snapshot, review_state


def _active_issue_count(banco, *, laudo_id: int) -> int:
    return len(
        list(
            banco.scalars(
                select(EmissaoOficialLaudo).where(
                    EmissaoOficialLaudo.laudo_id == int(laudo_id),
                    EmissaoOficialLaudo.issue_state == "issued",
                )
            ).all()
        )
    )


def _blocker_codes(summary: dict) -> set[str]:
    return {str(item.get("code") or "") for item in list(summary.get("blockers") or [])}


def _validation_issue_codes(summary: dict) -> set[str]:
    codes: set[str] = set()
    for blocker in list(summary.get("blockers") or []):
        validation = blocker.get("validation") if isinstance(blocker, dict) else None
        if not isinstance(validation, dict):
            continue
        for issue in list(validation.get("issues") or []):
            if isinstance(issue, dict) and issue.get("code"):
                codes.add(str(issue["code"]))
    return codes


def _bootstrap_documento_nr35(client, laudo_id: int) -> dict:
    resposta = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta.status_code == 200
    return next(
        item
        for item in resposta.json()["documentos"]["items"]
        if int(item["laudo_id"]) == int(laudo_id)
    )


def _prepare_approved_nr35_for_issue(
    banco,
    ids: dict,
    tmp_path: Path,
    *,
    payload: dict | None = None,
    report_pack: dict | None = None,
    with_signatory: bool = True,
):
    selection_token = _configure_tenant_nr35_governance(banco, ids)
    signatario = _add_nr35_signatory(banco, ids) if with_signatory else None
    laudo = _create_nr35_laudo(
        banco,
        ids,
        payload=payload or _payload_nr35_mesa_humana_aprovada(),
        report_pack=report_pack or _report_pack_nr35(quatro_fotos=True),
        selection_token=selection_token,
        status_revisao=StatusRevisao.APROVADO.value,
    )
    _materialize_primary_pdf(
        tmp_path=tmp_path,
        empresa_id=ids["empresa_a"],
        laudo_id=int(laudo.id),
        filename=str(laudo.nome_arquivo_pdf),
    )
    snapshot = record_approved_case_snapshot_for_laudo(
        banco,
        laudo=laudo,
        approved_by_id=ids["revisor_a"],
        document_outcome="approved_by_mesa",
        mesa_resolution_summary={
            "decision": "aprovar",
            "decision_source": "mesa_humana",
            "reviewer_id": ids["revisor_a"],
        },
    )
    banco.flush()
    return laudo, snapshot, signatario


def test_nr35_golden_path_emite_oficialmente_e_entrega_no_portal_cliente(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    _patch_official_issue_storage(monkeypatch, tmp_path)
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    pdf_bytes = _pdf_base_bytes_teste()

    with SessionLocal() as banco:
        selection_token = _configure_tenant_nr35_governance(banco, ids)
        _create_admin_cliente_b(banco, ids)
        signatario = _add_nr35_signatory(banco, ids)
        laudo = _create_nr35_laudo(
            banco,
            ids,
            payload=_payload_nr35_mesa_pending(),
            report_pack=_report_pack_nr35(quatro_fotos=True),
            selection_token=selection_token,
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        revisor = banco.get(Usuario, ids["revisor_a"])
        assert revisor is not None

        snapshot, review_state = _approve_with_human_structured_review(
            banco,
            laudo=laudo,
            revisor=revisor,
        )
        caminho_pdf, pdf_bytes = _materialize_primary_pdf(
            tmp_path=tmp_path,
            empresa_id=ids["empresa_a"],
            laudo_id=int(laudo.id),
            filename=str(laudo.nome_arquivo_pdf),
            pdf_bytes=pdf_bytes,
        )
        _anexo_pack_pre, emissao_pre = build_official_issue_package(banco, laudo=laudo)
        assert emissao_pre["ready_for_issue"] is True
        assert emissao_pre["already_issued"] is False
        assert _active_issue_count(banco, laudo_id=int(laudo.id)) == 0
        banco.commit()
        laudo_id = int(laudo.id)
        snapshot_id = int(snapshot.id)
        signatory_id = int(signatario.id)
        review_change_count = len(review_state["applied_changes"])

    _login_cliente(client, "cliente@empresa-a.test")
    item_pre_emissao = _bootstrap_documento_nr35(client, laudo_id)
    assert item_pre_emissao["status_revisao"] == StatusRevisao.APROVADO.value
    assert item_pre_emissao["pdf_file_name"] == "laudo_nr35_golden_path.pdf"
    assert item_pre_emissao["ready_for_issue"] is True
    assert item_pre_emissao["already_issued"] is False
    assert item_pre_emissao["emissao_oficial"]["existe"] is False
    assert item_pre_emissao["emissao_oficial"]["download_pdf_url"] is None
    assert item_pre_emissao["emissao_oficial"]["download_package_url"] is None

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        actor_user = banco.get(Usuario, ids["revisor_a"])
        assert laudo is not None
        assert actor_user is not None

        resultado = emitir_oficialmente_transacional(
            banco,
            laudo=laudo,
            actor_user=actor_user,
            signatory_id=signatory_id,
        )
        banco.commit()

        registro = resultado["record"]
        pacote_path = Path(str(registro.package_storage_path))
        package_bytes = pacote_path.read_bytes()
        record_payload = dict(resultado["record_payload"])

    assert caminho_pdf.read_bytes() == pdf_bytes
    assert record_payload["issue_state"] == "issued"
    assert record_payload["issue_number"]
    assert record_payload["approval_snapshot_id"] == snapshot_id
    assert record_payload["package_sha256"] == hashlib.sha256(package_bytes).hexdigest()
    assert record_payload["primary_pdf_sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
    assert record_payload["signatory_name"] == "Eng. NR35 Governado"
    assert record_payload["nr35_official_pdf"]["manifest_ok"] is True

    with zipfile.ZipFile(io.BytesIO(package_bytes)) as arquivo_zip:
        manifest = json.loads(arquivo_zip.read("manifest.json").decode("utf-8"))
        nr35_manifest = json.loads(
            arquivo_zip.read("governanca/nr35_official_pdf_manifest.json").decode("utf-8")
        )
        assert arquivo_zip.read("documentos/laudo_nr35_golden_path.pdf") == pdf_bytes

    assert manifest["ready_for_issue"] is True
    assert manifest["case_operational_phase"] == "issued"
    assert manifest["nr35_official_pdf"]["approved_snapshot"]["snapshot_id"] == snapshot_id
    assert manifest["nr35_official_pdf"]["official_pdf_validation"]["ok"] is True
    assert len(manifest["nr35_official_pdf"]["required_pdf_sections"]) == len(NR35_REQUIRED_PDF_SECTIONS)
    assert {item["slot"] for item in manifest["nr35_official_pdf"]["photo_slots"]} == set(NR35_REQUIRED_PHOTO_SLOTS)
    assert nr35_manifest["mesa_review"]["aprovacao_origem"] == "mesa_humana"
    assert nr35_manifest["primary_pdf_artifact"]["sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
    assert nr35_manifest["human_review"]["change_count"] >= review_change_count >= 1

    item_pos_emissao = _bootstrap_documento_nr35(client, laudo_id)
    assert item_pos_emissao["already_issued"] is True
    assert item_pos_emissao["emissao_oficial"]["existe"] is True
    assert item_pos_emissao["emissao_oficial"]["status"] == "emitido"
    assert str(item_pos_emissao["emissao_oficial"]["mesa_status"]).lower() == "aprovado"
    assert item_pos_emissao["emissao_oficial"]["package_sha256"] == hashlib.sha256(package_bytes).hexdigest()
    assert item_pos_emissao["emissao_oficial"]["primary_pdf_sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
    assert item_pos_emissao["nr35"]["slots_fotograficos"] == 4
    assert item_pos_emissao["nr35"]["manifest_ok"] is True
    assert item_pos_emissao["nr35"]["auditavel"] is True
    assert item_pos_emissao["historico_emissoes"][0]["issue_number"] == record_payload["issue_number"]

    resposta_pdf = client.get(item_pos_emissao["emissao_oficial"]["download_pdf_url"])
    resposta_pacote = client.get(item_pos_emissao["emissao_oficial"]["download_package_url"])
    assert resposta_pdf.status_code == 200
    assert resposta_pdf.content == pdf_bytes
    assert resposta_pacote.status_code == 200
    assert resposta_pacote.content == package_bytes

    _login_cliente(client, "cliente-nr35-b@empresa-b.test")
    resposta_pdf_tenant_errado = client.get(item_pos_emissao["emissao_oficial"]["download_pdf_url"])
    resposta_pacote_tenant_errado = client.get(item_pos_emissao["emissao_oficial"]["download_package_url"])
    assert resposta_pdf_tenant_errado.status_code == 404
    assert resposta_pacote_tenant_errado.status_code == 404


def test_nr35_pdf_operacional_nao_vira_emissao_oficial_no_portal_cliente(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    _patch_official_issue_storage(monkeypatch, tmp_path)
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        selection_token = _configure_tenant_nr35_governance(banco, ids)
        laudo = _create_nr35_laudo(
            banco,
            ids,
            payload=_payload_nr35_mesa_humana_aprovada(),
            report_pack=_report_pack_nr35(quatro_fotos=True),
            selection_token=selection_token,
            status_revisao=StatusRevisao.APROVADO.value,
            nome_arquivo_pdf="pdf_operacional_nr35.pdf",
        )
        _materialize_primary_pdf(
            tmp_path=tmp_path,
            empresa_id=ids["empresa_a"],
            laudo_id=int(laudo.id),
            filename=str(laudo.nome_arquivo_pdf),
        )
        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)
        assert emissao["already_issued"] is False
        banco.commit()
        laudo_id = int(laudo.id)

    _login_cliente(client, "cliente@empresa-a.test")
    item = _bootstrap_documento_nr35(client, laudo_id)
    assert item["status_revisao"] == StatusRevisao.APROVADO.value
    assert item["pdf_file_name"] == "pdf_operacional_nr35.pdf"
    assert item["already_issued"] is False
    assert item["emissao_oficial"]["existe"] is False
    assert item["emissao_oficial"]["download_pdf_url"] is None
    assert item["emissao_oficial"]["download_package_url"] is None
    assert item["nr35"]["auditavel"] is False

    resposta_pdf = client.get(f"/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pdf")
    resposta_pacote = client.get(f"/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pacote")
    assert resposta_pdf.status_code == 404
    assert resposta_pacote.status_code == 404


def test_nr35_golden_path_bloqueia_emissao_com_tres_fotos(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    _patch_official_issue_storage(monkeypatch, tmp_path)
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo, _snapshot, signatario = _prepare_approved_nr35_for_issue(
            banco,
            ids,
            tmp_path,
            report_pack=_report_pack_nr35(quatro_fotos=False),
            with_signatory=True,
        )
        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)
        assert emissao["ready_for_issue"] is False
        assert "nr35_golden_path_validation_failed" in _blocker_codes(emissao)
        assert "nr35_required_photo_slot_missing" in _validation_issue_codes(emissao)
        actor_user = banco.get(Usuario, ids["revisor_a"])
        assert actor_user is not None
        with pytest.raises(ValueError):
            emitir_oficialmente_transacional(
                banco,
                laudo=laudo,
                actor_user=actor_user,
                signatory_id=int(signatario.id),
            )
        assert _active_issue_count(banco, laudo_id=int(laudo.id)) == 0
        banco.commit()
        laudo_id = int(laudo.id)

    _login_cliente(client, "cliente@empresa-a.test")
    item = _bootstrap_documento_nr35(client, laudo_id)
    assert item["emissao_oficial"]["existe"] is False
    assert item["emissao_oficial"]["download_pdf_url"] is None
    assert item["nr35"]["auditavel"] is False


def test_nr35_golden_path_bloqueia_emissao_sem_mesa_humana(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    _patch_official_issue_storage(monkeypatch, tmp_path)
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo, _snapshot, signatario = _prepare_approved_nr35_for_issue(
            banco,
            ids,
            tmp_path,
            payload=_payload_nr35_mesa_ia_aprovada(),
            with_signatory=True,
        )
        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)
        assert emissao["ready_for_issue"] is False
        issue_codes = _validation_issue_codes(emissao)
        assert "nr35_mesa_review_origin_invalid" in issue_codes
        assert "nr35_mesa_review_ai_approved" in issue_codes
        actor_user = banco.get(Usuario, ids["revisor_a"])
        assert actor_user is not None
        with pytest.raises(ValueError):
            emitir_oficialmente_transacional(
                banco,
                laudo=laudo,
                actor_user=actor_user,
                signatory_id=int(signatario.id),
            )
        assert _active_issue_count(banco, laudo_id=int(laudo.id)) == 0


def test_nr35_golden_path_bloqueia_emissao_sem_signatario_governado(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    _patch_official_issue_storage(monkeypatch, tmp_path)
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo, _snapshot, _signatario = _prepare_approved_nr35_for_issue(
            banco,
            ids,
            tmp_path,
            with_signatory=False,
        )
        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)
        assert emissao["ready_for_issue"] is False
        assert "no_eligible_signatory" in _blocker_codes(emissao)
        actor_user = banco.get(Usuario, ids["revisor_a"])
        assert actor_user is not None
        with pytest.raises(ValueError):
            emitir_oficialmente_transacional(
                banco,
                laudo=laudo,
                actor_user=actor_user,
                signatory_id=None,
            )
        assert _active_issue_count(banco, laudo_id=int(laudo.id)) == 0
