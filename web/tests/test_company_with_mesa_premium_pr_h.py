from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import uuid
import zipfile

from sqlalchemy import select

from app.domains.chat.templates_ai import MAPA_VERIFICACOES_CBMGO
from app.shared.database import (
    AprendizadoVisualIa,
    ApprovedCaseSnapshot,
    EmissaoOficialLaudo,
    Empresa,
    Laudo,
    MensagemLaudo,
    RegistroAuditoriaEmpresa,
    SignatarioGovernadoLaudo,
    StatusRevisao,
    TipoMensagem,
    Usuario,
)
from tests.regras_rotas_criticas_support import (
    _imagem_png_data_uri_teste,
    _login_app_inspetor,
    _login_cliente,
    _login_revisor,
    _pdf_base_bytes_teste,
)


SIMPLE_FAMILY_KEY = "cbmgo_vistoria_bombeiro"
SIMPLE_TEMPLATE_KEY = "cbmgo"


def _patch_official_issue_storage(monkeypatch, tmp_path) -> None:
    import app.shared.official_issue_package as official_issue_package
    import app.shared.official_issue_transaction as official_issue_transaction

    monkeypatch.setattr(official_issue_package, "WEB_ROOT", tmp_path)
    monkeypatch.setattr(official_issue_transaction, "WEB_ROOT", tmp_path)


def _buscar_item_por_laudo_id(items: list[dict[str, object]], laudo_id: int) -> dict[str, object]:
    return next(item for item in items if int(item.get("id") or item.get("laudo_id") or 0) == int(laudo_id))


def _materializar_pdf_operacional(
    tmp_path,
    *,
    empresa_id: int,
    laudo_id: int,
    filename: str,
    version_label: str = "v0001",
) -> tuple[bytes, str]:
    pdf_bytes = _pdf_base_bytes_teste()
    caminho = (
        tmp_path
        / "storage"
        / "laudos_emitidos"
        / f"empresa_{int(empresa_id)}"
        / f"laudo_{int(laudo_id)}"
        / version_label
        / filename
    )
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(pdf_bytes)
    return pdf_bytes, str(caminho)


def _cbmgo_guided_checklist() -> list[dict[str, str]]:
    return [
        {
            "id": "informacoes_gerais",
            "title": "Informacoes gerais da vistoria",
            "prompt": "registre responsavel, local, tipologia e data",
            "evidence_hint": "responsavel, local, tipologia e data",
        },
        {
            "id": "seguranca_estrutural",
            "title": "Seguranca estrutural",
            "prompt": "consolide achados estruturais e localizacao",
            "evidence_hint": "fissuras, corrosao e localizacao resumida",
        },
        {
            "id": "cmar",
            "title": "CMAR",
            "prompt": "resuma materiais empregados e divergencias",
            "evidence_hint": "piso, paredes, teto e cobertura",
        },
        {
            "id": "verificacao_documental",
            "title": "Verificacao documental",
            "prompt": "relacione plano, documentos e acessos",
            "evidence_hint": "documentos conferidos e lacunas",
        },
        {
            "id": "registros_fotograficos",
            "title": "Registros fotograficos",
            "prompt": "anexe vista geral, achado e apoio documental",
            "evidence_hint": "fachada, achado e documento",
        },
        {
            "id": "conclusao",
            "title": "Conclusao",
            "prompt": "resuma conclusao e prontidao do formulario",
            "evidence_hint": "resumo executivo e recomendacoes",
        },
    ]


def _cbmgo_dados_formulario_validos() -> dict[str, object]:
    payload: dict[str, object] = {
        "informacoes_gerais": {
            "responsavel_pela_inspecao": "Gabriel Santos",
            "data_inspecao": "2026-04-06",
            "local_inspecao": "Unidade 1 - Goiania/GO",
            "tipologia": "Industrial",
            "possui_cercon": "Sim",
            "responsavel_empresa_acompanhamento": "Carlos Lima",
        },
        "seguranca_estrutural": {},
        "cmar": {},
        "trrf_observacoes": "TRRF em linha com memorial e vistoria visual.",
        "verificacao_documental": {},
        "recomendacoes_gerais": {
            "outros": "Sem outras recomendacoes alem da manutencao rotineira.",
        },
        "coleta_assinaturas": {
            "responsavel_pela_inspecao": "Gabriel Santos",
            "responsavel_empresa_acompanhamento": "Carlos Lima",
        },
        "resumo_executivo": "Vistoria CBMGO com evidencias completas para revisao premium.",
    }
    for section_key, section_map in MAPA_VERIFICACOES_CBMGO.items():
        target = payload.setdefault(section_key, {})
        assert isinstance(target, dict)
        for item_key in section_map:
            target[item_key] = {
                "condicao": "C",
                "localizacao": "Setor principal",
                "observacao": "Sem nao conformidade visual relevante.",
            }
    return payload


def _preparar_coleta_premium_simples(banco, *, laudo_id: int, inspetor_id: int) -> None:
    laudo = banco.get(Laudo, laudo_id)
    assert laudo is not None
    laudo.tipo_template = SIMPLE_TEMPLATE_KEY
    laudo.catalog_family_key = SIMPLE_FAMILY_KEY
    laudo.catalog_family_label = "CBMGO Vistoria Bombeiro"
    laudo.setor_industrial = "CBMGO Vistoria Bombeiro"
    laudo.primeira_mensagem = "Vistoria CBMGO premium com evidencias consolidadas."
    laudo.codigo_hash = uuid.uuid4().hex
    laudo.entry_mode_preference = "chat_first"
    laudo.entry_mode_effective = "chat_first"
    laudo.entry_mode_reason = "tenant_policy"
    laudo.dados_formulario = _cbmgo_dados_formulario_validos()

    def add_inspetor_message(texto: str) -> MensagemLaudo:
        mensagem = MensagemLaudo(
            laudo_id=laudo_id,
            remetente_id=inspetor_id,
            tipo=TipoMensagem.HUMANO_INSP.value,
            conteudo=texto,
        )
        banco.add(mensagem)
        banco.flush()
        return mensagem

    msg_info = add_inspetor_message(
        "Responsavel: Gabriel Santos; Local: Unidade 1 - Goiania/GO; Tipologia: Industrial."
    )
    msg_estrutural = add_inspetor_message(
        "Sem fissuras, corrosao, deformacoes ou recalques aparentes nos elementos inspecionados."
    )
    msg_cmar = add_inspetor_message(
        "Piso, paredes, teto e cobertura compativeis com o memorial. Sem divergencias observadas."
    )
    msg_documental = add_inspetor_message(
        "Plano de manutencao disponivel, coerente e com documentos pertinentes acessiveis."
    )
    msg_conclusao = add_inspetor_message(
        "Conclusao: vistoria sem nao conformidades objetivas, com formulario estruturado consistente."
    )

    refs = [
        {
            "message_id": int(msg_info.id),
            "step_id": "informacoes_gerais",
            "step_title": "Informacoes gerais da vistoria",
            "captured_at": msg_info.criado_em.isoformat(),
            "evidence_kind": "chat_message",
            "attachment_kind": "none",
        },
        {
            "message_id": int(msg_estrutural.id),
            "step_id": "seguranca_estrutural",
            "step_title": "Seguranca estrutural",
            "captured_at": msg_estrutural.criado_em.isoformat(),
            "evidence_kind": "chat_message",
            "attachment_kind": "none",
        },
        {
            "message_id": int(msg_cmar.id),
            "step_id": "cmar",
            "step_title": "CMAR",
            "captured_at": msg_cmar.criado_em.isoformat(),
            "evidence_kind": "chat_message",
            "attachment_kind": "none",
        },
        {
            "message_id": int(msg_documental.id),
            "step_id": "verificacao_documental",
            "step_title": "Verificacao documental",
            "captured_at": msg_documental.criado_em.isoformat(),
            "evidence_kind": "chat_message",
            "attachment_kind": "none",
        },
        {
            "message_id": int(msg_conclusao.id),
            "step_id": "conclusao",
            "step_title": "Conclusao",
            "captured_at": msg_conclusao.criado_em.isoformat(),
            "evidence_kind": "chat_message",
            "attachment_kind": "none",
        },
    ]

    imagem_data_uri = _imagem_png_data_uri_teste()
    imagem_sha256 = hashlib.sha256(imagem_data_uri.encode("utf-8")).hexdigest()
    for indice, titulo in enumerate(
        ("Vista geral", "Achado estrutural", "Documento de apoio"),
        start=1,
    ):
        mensagem_foto = add_inspetor_message("[imagem]")
        refs.append(
            {
                "message_id": int(mensagem_foto.id),
                "step_id": "registros_fotograficos",
                "step_title": titulo,
                "captured_at": mensagem_foto.criado_em.isoformat(),
                "evidence_kind": "chat_message",
                "attachment_kind": "image",
            }
        )
        banco.add(
            AprendizadoVisualIa(
                empresa_id=int(laudo.empresa_id),
                laudo_id=laudo_id,
                mensagem_referencia_id=int(mensagem_foto.id),
                criado_por_id=inspetor_id,
                setor_industrial="CBMGO Vistoria Bombeiro",
                resumo=f"Foto {indice} da vistoria CBMGO",
                descricao_contexto=f"Evidencia fotografica {indice} do caso CBMGO.",
                correcao_inspetor="Registro fotografico confirmado pelo inspetor.",
                imagem_url=f"/static/test/cbmgo_{indice}.png",
                imagem_nome_original=f"cbmgo_{indice}.png",
                imagem_mime_type="image/png",
                imagem_sha256=imagem_sha256,
                caminho_arquivo=f"/tmp/cbmgo_{indice}.png",
            )
        )

    laudo.guided_inspection_draft_json = {
        "template_key": SIMPLE_TEMPLATE_KEY,
        "template_label": "CBM-GO Vistoria Bombeiro",
        "started_at": "2026-04-06T23:50:00.000Z",
        "current_step_index": 5,
        "completed_step_ids": [item["id"] for item in _cbmgo_guided_checklist()],
        "checklist": _cbmgo_guided_checklist(),
        "evidence_bundle_kind": "case_thread",
        "evidence_refs": refs,
        "mesa_handoff": None,
    }
    banco.add(
        MensagemLaudo(
            laudo_id=laudo_id,
            tipo=TipoMensagem.IA.value,
            conteudo="Parecer preliminar: encaminhar para Mesa Avaliadora antes da emissao oficial.",
        )
    )
    banco.commit()


def test_empresa_com_mesa_premium_mantem_handoff_aprovacao_emissao_e_portal_cliente(
    ambiente_critico,
    monkeypatch,
    tmp_path,
) -> None:
    _patch_official_issue_storage(monkeypatch, tmp_path)
    monkeypatch.setenv("TARIEL_V2_ANDROID_PUBLIC_CONTRACT", "1")

    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        revisor = banco.get(Usuario, ids["revisor_a"])
        assert empresa is not None
        assert inspetor is not None
        assert revisor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa",
            "operating_model": "standard",
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
        }
        inspetor.allowed_portals_json = ["inspetor"]
        revisor.allowed_portals_json = ["revisor"]
        signatario = SignatarioGovernadoLaudo(
            tenant_id=ids["empresa_a"],
            nome="Eng. Premium Geral",
            funcao="Responsavel tecnico",
            registro_profissional="CREA 101010",
            valid_until=datetime.now(timezone.utc) + timedelta(days=120),
            allowed_family_keys_json=[SIMPLE_FAMILY_KEY],
            ativo=True,
            criado_por_id=ids["admin_a"],
        )
        banco.add(signatario)
        banco.commit()
        signatory_id = int(signatario.id)

    _login_cliente(client, "cliente@empresa-a.test")
    resposta_bootstrap_premium = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap_premium.status_code == 200
    bootstrap_premium = resposta_bootstrap_premium.json()
    pacote = bootstrap_premium["tenant_commercial_package"]
    overview = bootstrap_premium["tenant_commercial_overview"]
    recursos = {item["key"]: item for item in overview["resources"]}

    assert pacote["key"] == "inspector_chat_mesa"
    assert pacote["operating_model"] == "standard"
    assert pacote["surface_availability"]["chat"] is True
    assert pacote["surface_availability"]["mesa"] is True
    assert pacote["capability_entitlements"]["inspector_case_create"] is True
    assert pacote["capability_entitlements"]["inspector_case_finalize"] is True
    assert pacote["capability_entitlements"]["inspector_send_to_mesa"] is True
    assert pacote["capability_entitlements"]["reviewer_decision"] is True
    assert pacote["capability_entitlements"]["reviewer_issue"] is True
    assert pacote["capability_aliases"]["case_send_to_separate_review"] is True
    assert pacote["capability_aliases"]["official_issue_create"] is True
    assert pacote["capability_aliases"]["governed_signatory_select"] is True
    assert pacote["mobile_chat_first_governance"]["separate_mesa_required"] is True
    assert pacote["mobile_chat_first_governance"]["official_issue_allowed"] is True
    assert overview["mesa_contracted"] is True
    assert overview["official_issue_included"] is True
    assert overview["resource_summary"]["separate_mesa_available"] is True
    assert overview["resource_summary"]["official_issue_allowed"] is True
    assert overview["resource_summary"]["official_issue_download_allowed"] is True
    assert recursos["mesa"]["available"] is True
    assert recursos["official_issue"]["available"] is True
    assert recursos["documents"]["available"] is True

    resposta_login_mobile = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": "inspetor@empresa-a.test",
            "senha": "Senha@123",
            "lembrar": True,
        },
    )
    assert resposta_login_mobile.status_code == 200
    token_mobile = resposta_login_mobile.json()["access_token"]
    usuario_mobile = resposta_login_mobile.json()["usuario"]
    policy_mobile = usuario_mobile["tenant_access_policy"]
    assert usuario_mobile["commercial_service_package"] == "inspector_chat_mesa"
    assert usuario_mobile["commercial_operating_model"] == "standard"
    assert usuario_mobile["allowed_portals"] == ["inspetor"]
    assert policy_mobile["portal_entitlements"]["revisor"] is True
    assert policy_mobile["user_capability_aliases"]["case_send_to_separate_review"] is True
    assert policy_mobile["user_capability_aliases"]["case_self_review"] is True
    assert policy_mobile["user_capability_aliases"]["official_issue_create"] is False
    assert policy_mobile["user_mobile_chat_first_governance"]["separate_mesa_required"] is True
    assert policy_mobile["user_mobile_chat_first_governance"]["self_review_allowed"] is False
    assert policy_mobile["user_mobile_chat_first_governance"]["official_issue_allowed"] is False

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_iniciar = client.post(
        "/app/api/laudo/iniciar",
        headers={"X-CSRF-Token": csrf_inspetor},
        data={"tipo_template": SIMPLE_TEMPLATE_KEY},
    )
    assert resposta_iniciar.status_code == 200
    laudo_id = int(resposta_iniciar.json()["laudo_id"])

    with SessionLocal() as banco:
        _preparar_coleta_premium_simples(
            banco,
            laudo_id=laudo_id,
            inspetor_id=ids["inspetor_a"],
        )

    resposta_preview = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")
    assert resposta_preview.status_code == 200
    preview = resposta_preview.json()
    assert preview["primary_action"] == "send_to_mesa"
    assert preview["chat_review_tools"]["title"] == "Revisão pela Mesa Avaliadora"
    assert preview["chat_review_tools"]["case_send_to_separate_review"] is True
    assert preview["chat_review_tools"]["self_review_allowed"] is False
    assert preview["chat_review_tools"]["official_issue_create"] is False
    assert preview["mobile_chat_first_governance"]["approval_actor_scope"] == "separate_mesa"

    resposta_finalizar = client.post(
        f"/app/api/laudo/{laudo_id}/finalizar",
        headers={"X-CSRF-Token": csrf_inspetor},
    )
    assert resposta_finalizar.status_code == 200, resposta_finalizar.text
    corpo_finalizar = resposta_finalizar.json()
    assert corpo_finalizar["success"] is True
    assert corpo_finalizar["review_mode_final"] == "mesa_required"

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.AGUARDANDO.value

    _login_cliente(client, "cliente@empresa-a.test")
    item_pre_aprovacao = _buscar_item_por_laudo_id(
        client.get("/cliente/api/bootstrap?surface=documentos").json()["documentos"]["items"],
        laudo_id,
    )
    assert item_pre_aprovacao["pdf_file_name"] is None
    assert item_pre_aprovacao["ready_for_issue"] is False
    assert item_pre_aprovacao["already_issued"] is False
    assert item_pre_aprovacao["emissao_oficial"]["existe"] is False
    assert item_pre_aprovacao["issue_number"] is None

    csrf_revisor = _login_revisor(client, "revisor@empresa-a.test")
    resposta_pacote_mesa = client.get(f"/revisao/api/laudo/{laudo_id}/pacote")
    assert resposta_pacote_mesa.status_code == 200
    pacote_mesa = resposta_pacote_mesa.json()
    assert pacote_mesa["tenant_access_policy"]["user_capability_entitlements"]["reviewer_decision"] is True
    assert pacote_mesa["tenant_access_policy"]["user_capability_entitlements"]["reviewer_issue"] is True
    assert pacote_mesa["emissao_oficial"]["ready_for_issue"] is False
    assert pacote_mesa["emissao_oficial"]["already_issued"] is False

    resposta_aprovar = client.post(
        f"/revisao/api/laudo/{laudo_id}/avaliar",
        data={"acao": "aprovar", "motivo": "", "csrf_token": csrf_revisor},
        follow_redirects=False,
    )
    assert resposta_aprovar.status_code == 303, resposta_aprovar.text
    assert resposta_aprovar.headers["location"] == "/revisao/painel"

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.APROVADO.value
        laudo.nome_arquivo_pdf = "laudo_premium_padrao.pdf"
        pdf_bytes, caminho_pdf = _materializar_pdf_operacional(
            tmp_path,
            empresa_id=ids["empresa_a"],
            laudo_id=laudo_id,
            filename=str(laudo.nome_arquivo_pdf),
        )
        banco.commit()

    resposta_pacote_aprovado = client.get(f"/revisao/api/laudo/{laudo_id}/pacote")
    assert resposta_pacote_aprovado.status_code == 200
    pacote_aprovado = resposta_pacote_aprovado.json()
    assert pacote_aprovado["emissao_oficial"]["ready_for_issue"] is True, json.dumps(
        pacote_aprovado["emissao_oficial"],
        ensure_ascii=False,
    )
    assert pacote_aprovado["emissao_oficial"]["already_issued"] is False
    assert pacote_aprovado["emissao_oficial"]["eligible_signatory_count"] >= 1

    _login_cliente(client, "cliente@empresa-a.test")
    item_pos_pdf_operacional = _buscar_item_por_laudo_id(
        client.get("/cliente/api/bootstrap?surface=documentos").json()["documentos"]["items"],
        laudo_id,
    )
    assert item_pos_pdf_operacional["pdf_file_name"] == "laudo_premium_padrao.pdf"
    assert item_pos_pdf_operacional["ready_for_issue"] is True, json.dumps(
        {
            "issue_status": item_pos_pdf_operacional.get("issue_status"),
            "issue_status_label": item_pos_pdf_operacional.get("issue_status_label"),
            "case_lifecycle_status": item_pos_pdf_operacional.get("case_lifecycle_status"),
            "status_revisao": item_pos_pdf_operacional.get("status_revisao"),
            "pdf_present": item_pos_pdf_operacional.get("pdf_present"),
            "public_verification_present": item_pos_pdf_operacional.get("public_verification_present"),
            "emissao_oficial": item_pos_pdf_operacional.get("emissao_oficial"),
            "document_timeline": item_pos_pdf_operacional.get("document_timeline"),
        },
        ensure_ascii=False,
    )
    assert item_pos_pdf_operacional["already_issued"] is False
    assert item_pos_pdf_operacional["emissao_oficial"]["existe"] is False
    assert item_pos_pdf_operacional["issue_number"] is None

    resposta_emitir = client.post(
        f"/revisao/api/laudo/{laudo_id}/emissao-oficial",
        headers={"X-CSRF-Token": csrf_revisor, "Content-Type": "application/json"},
        json={"signatory_id": signatory_id},
    )
    assert resposta_emitir.status_code == 200
    emissao = resposta_emitir.json()
    assert emissao["success"] is True
    assert emissao["idempotent_replay"] is False
    assert emissao["issue_state"] == "issued"
    assert emissao["issue_number"].startswith("TAR-")
    assert emissao["record"]["package_storage_ready"] is True
    assert emissao["record"]["primary_pdf_sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
    assert emissao["record"]["signatory_name"] == "Eng. Premium Geral"
    assert emissao["download_url"].endswith("/emissao-oficial/download")

    resposta_download = client.get(emissao["download_url"])
    assert resposta_download.status_code == 200
    assert "application/zip" in resposta_download.headers.get("content-type", "").lower()
    with zipfile.ZipFile(io.BytesIO(resposta_download.content)) as arquivo_zip:
        manifest = json.loads(arquivo_zip.read("manifest.json").decode("utf-8"))
        assert arquivo_zip.read("documentos/laudo_premium_padrao.pdf") == pdf_bytes
    assert manifest["bundle_kind"] == "tariel_official_issue_package"
    assert manifest["ready_for_issue"] is True

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.APROVADO.value
        snapshot = banco.scalar(
            select(ApprovedCaseSnapshot)
            .where(ApprovedCaseSnapshot.laudo_id == laudo_id)
            .order_by(ApprovedCaseSnapshot.id.desc())
        )
        assert snapshot is not None
        registro = banco.scalar(
            select(EmissaoOficialLaudo).where(
                EmissaoOficialLaudo.laudo_id == laudo_id,
                EmissaoOficialLaudo.issue_state == "issued",
            )
        )
        assert registro is not None
        assert registro.issue_number == emissao["issue_number"]
        assert registro.approval_snapshot_id == snapshot.id
        assert registro.package_sha256 == emissao["package_sha256"]
        auditoria_download = banco.scalar(
            select(RegistroAuditoriaEmpresa)
            .where(
                RegistroAuditoriaEmpresa.empresa_id == ids["empresa_a"],
                RegistroAuditoriaEmpresa.acao == "emissao_oficial_download",
                RegistroAuditoriaEmpresa.portal == "mesa",
            )
            .order_by(RegistroAuditoriaEmpresa.id.desc())
        )
        assert auditoria_download is not None
        assert (auditoria_download.payload_json or {})["issue_number"] == emissao["issue_number"]

    _login_cliente(client, "cliente@empresa-a.test")
    item_pos_emissao = _buscar_item_por_laudo_id(
        client.get("/cliente/api/bootstrap?surface=documentos").json()["documentos"]["items"],
        laudo_id,
    )
    assert item_pos_emissao["already_issued"] is True
    assert item_pos_emissao["ready_for_issue"] is True
    assert item_pos_emissao["issue_number"] == emissao["issue_number"]
    assert item_pos_emissao["signatory_name"] == "Eng. Premium Geral"
    assert item_pos_emissao["emissao_oficial"]["existe"] is True
    assert item_pos_emissao["emissao_oficial"]["status"] == "emitido"
    assert item_pos_emissao["emissao_oficial"]["issue_number"] == emissao["issue_number"]
    assert item_pos_emissao["emissao_oficial"]["package_sha256"] == emissao["package_sha256"]
    assert item_pos_emissao["emissao_oficial"]["primary_pdf_sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
    assert item_pos_emissao["emissao_oficial"]["package_ready"] is True
    assert item_pos_emissao["historico_emissoes"][0]["issue_number"] == emissao["issue_number"]
    assert item_pos_emissao["historico_emissoes"][0]["issue_state"] == "issued"
    assert item_pos_emissao["document_visual_state"] == "official"

    resposta_thread_mobile = client.get(
        f"/app/api/mobile/v2/laudo/{laudo_id}/mesa/mensagens",
        headers={"Authorization": f"Bearer {token_mobile}"},
    )
    assert resposta_thread_mobile.status_code == 200
    pacote_mobile = resposta_thread_mobile.json()["mobile_review_package"]
    assert pacote_mobile["emissao_oficial"]["already_issued"] is True
    assert pacote_mobile["emissao_oficial"]["current_issue"]["issue_number"] == emissao["issue_number"]
    assert pacote_mobile["emissao_oficial"]["current_issue"]["download_url"].endswith(
        "/emissao-oficial/download"
    )
    assert pacote_mobile["emissao_oficial"]["current_issue"]["primary_pdf_sha256"] == hashlib.sha256(
        pdf_bytes
    ).hexdigest()
    assert caminho_pdf.endswith("laudo_premium_padrao.pdf")
