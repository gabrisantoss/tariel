from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import zipfile

from app.domains.chat.nr35_linha_vida_pdf_contract import (
    NR35_REQUIRED_PDF_SECTIONS,
    NR35_REQUIRED_PHOTO_SLOTS,
)
from app.domains.chat.nr35_linha_vida_structured_review import NR35_STRUCTURED_REVIEW_VERSION
from app.shared.database import (
    ApprovedCaseSnapshot,
    Laudo,
    SignatarioGovernadoLaudo,
    StatusLaudo,
    StatusRevisao,
    Usuario,
)
from app.shared.official_issue_package import build_official_issue_package
from app.shared.official_issue_transaction import emitir_oficialmente_transacional
from tests.regras_rotas_criticas_support import _pdf_base_bytes_teste


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _payload_nr35_aprovado() -> dict:
    payload = json.loads(
        (
            _repo_root()
            / "docs"
            / "family_schemas"
            / "nr35_inspecao_linha_de_vida.laudo_output_exemplo.json"
        ).read_text(encoding="utf-8")
    )
    payload["mesa_review"] = {
        "status": StatusRevisao.APROVADO.value,
        "aprovacao_origem": "mesa_humana",
        "ia_aprovou_mesa": False,
        "aprovado_por_id": 42,
        "aprovado_por_nome": "Mesa NR35",
        "aprovado_em": "2026-04-26T12:00:00+00:00",
    }
    payload["nr35_structured_review"] = {
        "contract_version": NR35_STRUCTURED_REVIEW_VERSION,
        "status": "mesa_approved",
        "last_reviewed_at": "2026-04-26T11:45:00+00:00",
        "last_reviewed_by": {"user_id": 42, "name": "Mesa NR35"},
        "mesa_approved_at": "2026-04-26T12:00:00+00:00",
        "mesa_approved_by": {"user_id": 42, "name": "Mesa NR35"},
        "change_log": [
            {
                "path": "conclusao.justificativa",
                "target": "payload",
                "previous_value": "Texto preliminar",
                "new_value": payload["conclusao"]["justificativa"],
                "actor_user_id": 42,
                "actor_name": "Mesa NR35",
                "justification": "Justificativa ajustada pela revisao humana antes da emissao.",
                "changed_at": "2026-04-26T11:50:00+00:00",
                "resolved_issue_codes": ["nr35_required_field_missing"],
            }
        ],
    }
    payload["auditoria"]["mesa_status"] = StatusRevisao.APROVADO.value
    return payload


def _report_pack_nr35_quatro_fotos() -> dict:
    return {
        "family": "nr35_inspecao_linha_de_vida",
        "template_key": "nr35_linha_vida",
        "image_slots": [
            {
                "slot": slot,
                "title": slot.replace("_", " "),
                "required": True,
                "status": "resolved",
                "resolved_evidence_id": f"IMG_{index}",
                "resolved_message_id": index,
                "resolved_caption": f"Legenda tecnica {slot}",
            }
            for index, slot in enumerate(NR35_REQUIRED_PHOTO_SLOTS, start=701)
        ],
        "quality_gates": {"final_validation_mode": "mesa_required", "missing_evidence": []},
    }


def _snapshot_payload(laudo: Laudo, payload: dict, report_pack: dict) -> dict:
    return {
        "laudo_id": int(laudo.id),
        "codigo_hash": laudo.codigo_hash,
        "tipo_template": "nr35_linha_vida",
        "family_key": "nr35_inspecao_linha_de_vida",
        "status_revisao": laudo.status_revisao,
        "status_conformidade": laudo.status_conformidade,
        "dados_formulario": deepcopy(payload),
        "report_pack_draft": deepcopy(report_pack),
    }


def _criar_laudo_nr35_oficial(
    banco,
    ids: dict,
    *,
    payload: dict | None = None,
    report_pack: dict | None = None,
    criar_snapshot: bool = True,
):
    payload = deepcopy(payload or _payload_nr35_aprovado())
    report_pack = deepcopy(report_pack or _report_pack_nr35_quatro_fotos())
    laudo = Laudo(
        empresa_id=ids["empresa_a"],
        usuario_id=ids["inspetor_a"],
        setor_industrial="NR35 Linha de Vida",
        tipo_template="nr35_linha_vida",
        catalog_family_key="nr35_inspecao_linha_de_vida",
        status_revisao=StatusRevisao.APROVADO.value,
        status_conformidade=StatusLaudo.NAO_CONFORME.value,
        codigo_hash=f"nr35{datetime.now(timezone.utc).timestamp()}".replace(".", "")[:32],
        nome_arquivo_pdf="laudo_nr35_emitido.pdf",
        dados_formulario=deepcopy(payload),
        report_pack_draft_json=deepcopy(report_pack),
    )
    banco.add(laudo)
    banco.flush()

    snapshot = None
    if criar_snapshot:
        snapshot = ApprovedCaseSnapshot(
            laudo_id=int(laudo.id),
            empresa_id=ids["empresa_a"],
            family_key="nr35_inspecao_linha_de_vida",
            approval_version=1,
            approved_by_id=ids["revisor_a"],
            source_status_revisao=StatusRevisao.APROVADO.value,
            source_status_conformidade=StatusLaudo.NAO_CONFORME.value,
            document_outcome="approved_by_mesa",
            laudo_output_snapshot=_snapshot_payload(laudo, payload, report_pack),
            evidence_manifest_json=[
                {"kind": "image_slot", "slot": slot, "status": "resolved"}
                for slot in NR35_REQUIRED_PHOTO_SLOTS
            ],
            mesa_resolution_summary_json={"decision": "aprovar", "reviewer_id": ids["revisor_a"]},
            snapshot_hash=hashlib.sha256(
                json.dumps(_snapshot_payload(laudo, payload, report_pack), sort_keys=True, default=str).encode("utf-8")
            ).hexdigest(),
        )
        banco.add(snapshot)

    signatario = SignatarioGovernadoLaudo(
        tenant_id=ids["empresa_a"],
        nome="Eng. NR35",
        funcao="Responsável técnico",
        registro_profissional="CREA 3535",
        valid_until=datetime.now(timezone.utc) + timedelta(days=120),
        allowed_family_keys_json=["nr35_inspecao_linha_de_vida"],
        ativo=True,
        criado_por_id=ids["admin_a"],
    )
    banco.add(signatario)
    banco.flush()
    return laudo, snapshot, signatario


def test_nr35_official_issue_bloqueia_sem_snapshot_aprovado(ambiente_critico) -> None:
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo, _snapshot, _signatario = _criar_laudo_nr35_oficial(
            banco,
            ids,
            criar_snapshot=False,
        )
        banco.commit()

        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)

    blocker_codes = {item["code"] for item in emissao["blockers"]}
    assert "nr35_approved_snapshot_missing" in blocker_codes
    assert emissao["ready_for_issue"] is False


def test_nr35_official_issue_bloqueia_mesa_aprovada_por_ia(ambiente_critico) -> None:
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    payload = _payload_nr35_aprovado()
    payload["mesa_review"]["aprovacao_origem"] = "ia"
    payload["mesa_review"]["ia_aprovou_mesa"] = True

    with SessionLocal() as banco:
        laudo, _snapshot, _signatario = _criar_laudo_nr35_oficial(banco, ids, payload=payload)
        banco.commit()

        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)

    nr35_blockers = [item for item in emissao["blockers"] if item["code"].startswith("nr35_")]
    assert nr35_blockers
    issue_codes = {
        issue["code"]
        for blocker in nr35_blockers
        for issue in ((blocker.get("validation") or {}).get("issues") or [])
    }
    assert "nr35_mesa_review_origin_invalid" in issue_codes
    assert "nr35_mesa_review_ai_approved" in issue_codes
    assert emissao["ready_for_issue"] is False


def test_nr35_official_issue_bloqueia_divergencia_do_json_aprovado(ambiente_critico) -> None:
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo, _snapshot, _signatario = _criar_laudo_nr35_oficial(banco, ids)
        laudo.dados_formulario = deepcopy(laudo.dados_formulario)
        laudo.dados_formulario["identificacao"]["codigo_interno"] = "ALTERADO-APOS-MESA"
        banco.commit()

        _anexo_pack, emissao = build_official_issue_package(banco, laudo=laudo)

    blocker_codes = {item["code"] for item in emissao["blockers"]}
    assert "nr35_approved_payload_diverged" in blocker_codes
    assert emissao["ready_for_issue"] is False


def test_emitir_nr35_congela_manifest_pdf_auditavel_com_fotos_e_changelog(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    import app.shared.official_issue_package as official_issue_package
    import app.shared.official_issue_transaction as official_issue_transaction

    monkeypatch.setattr(official_issue_package, "WEB_ROOT", tmp_path)
    monkeypatch.setattr(official_issue_transaction, "WEB_ROOT", tmp_path)

    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    pdf_bytes = _pdf_base_bytes_teste()

    with SessionLocal() as banco:
        laudo, snapshot, signatario = _criar_laudo_nr35_oficial(banco, ids)
        banco.commit()
        laudo = banco.get(Laudo, int(laudo.id))
        actor_user = banco.get(Usuario, ids["revisor_a"])
        assert laudo is not None
        assert snapshot is not None
        assert actor_user is not None

        caminho_pdf = (
            tmp_path
            / "storage"
            / "laudos_emitidos"
            / f"empresa_{ids['empresa_a']}"
            / f"laudo_{int(laudo.id)}"
            / "v0003"
            / "laudo_nr35_emitido.pdf"
        )
        caminho_pdf.parent.mkdir(parents=True, exist_ok=True)
        caminho_pdf.write_bytes(pdf_bytes)

        resultado = emitir_oficialmente_transacional(
            banco,
            laudo=laudo,
            actor_user=actor_user,
            signatory_id=int(signatario.id),
        )
        banco.commit()

        registro = resultado["record"]
        pacote_path = Path(str(registro.package_storage_path))
        assert pacote_path.is_file()

        with zipfile.ZipFile(io.BytesIO(pacote_path.read_bytes())) as arquivo_zip:
            nomes = set(arquivo_zip.namelist())
            assert "governanca/nr35_official_pdf_manifest.json" in nomes
            assert "documento/nr35_dados_formulario_aprovado.json" in nomes
            assert "documento/nr35_report_pack_aprovado.json" in nomes
            assert "governanca/nr35_revisao_humana_changelog.json" in nomes
            assert arquivo_zip.read("documentos/laudo_nr35_emitido.pdf") == pdf_bytes

            manifest = json.loads(arquivo_zip.read("manifest.json").decode("utf-8"))
            nr35_manifest = json.loads(
                arquivo_zip.read("governanca/nr35_official_pdf_manifest.json").decode("utf-8")
            )
            approved_payload = json.loads(
                arquivo_zip.read("documento/nr35_dados_formulario_aprovado.json").decode("utf-8")
            )
            human_changelog = json.loads(
                arquivo_zip.read("governanca/nr35_revisao_humana_changelog.json").decode("utf-8")
            )

        assert manifest["nr35_official_pdf"]["approved_snapshot"]["snapshot_id"] == int(snapshot.id)
        assert manifest["nr35_official_pdf"]["official_pdf_validation"]["ok"] is True
        assert len(manifest["nr35_official_pdf"]["required_pdf_sections"]) == len(NR35_REQUIRED_PDF_SECTIONS)
        assert len(manifest["nr35_official_pdf"]["photo_slots"]) == 4
        assert {item["slot"] for item in manifest["nr35_official_pdf"]["photo_slots"]} == set(NR35_REQUIRED_PHOTO_SLOTS)
        assert nr35_manifest["schema_version"] == approved_payload["schema_version"]
        assert nr35_manifest["template_version"] == approved_payload["template_version"]
        assert nr35_manifest["mesa_review"]["aprovacao_origem"] == "mesa_humana"
        assert nr35_manifest["primary_pdf_artifact"]["sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
        assert human_changelog["change_count"] == 1
        assert registro.manifest_json["nr35_official_pdf"]["human_review"]["change_count"] == 1
        assert registro.issue_context_json["nr35_official_pdf"]["approved_snapshot"]["snapshot_id"] == int(snapshot.id)
        assert resultado["record_payload"]["package_sha256"] == hashlib.sha256(pacote_path.read_bytes()).hexdigest()
