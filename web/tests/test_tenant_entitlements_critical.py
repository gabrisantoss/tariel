from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone

from app.domains.chat.report_pack_helpers import atualizar_report_pack_draft_laudo
from app.shared.database import (
    ApprovedCaseSnapshot,
    Empresa,
    Laudo,
    MensagemLaudo,
    RegistroAuditoriaEmpresa,
    SignatarioGovernadoLaudo,
    StatusRevisao,
    TipoMensagem,
    Usuario,
)
from app.shared.tenant_admin_policy import summarize_tenant_admin_policy
from tests.regras_rotas_criticas_support import (
    _criar_laudo,
    _csrf_pagina,
    _extrair_csrf,
    _login_admin,
    _login_app_inspetor,
    _login_cliente,
    _login_revisor,
)


def _extrair_boot_inspetor(html: str) -> dict[str, object]:
    match = re.search(
        r'<script[^>]+id="tariel-boot"[^>]*>\s*(\{.*?\})\s*</script>',
        html,
        flags=re.DOTALL,
    )
    assert match, "Bootstrap do inspetor não encontrado."
    return json.loads(match.group(1))


def test_admin_ceo_persiste_superficies_contratuais_sem_bloquear_operacao_interna(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    _login_admin(client, "admin@empresa-a.test")
    csrf = _csrf_pagina(client, f"/admin/clientes/{ids['empresa_a']}")

    resposta = client.post(
        f"/admin/clientes/{ids['empresa_a']}/politica-admin-cliente",
        data={
            "csrf_token": csrf,
            "tenant_portal_revisor_enabled": "false",
            "tenant_capability_admin_manage_team_enabled": "false",
            "tenant_capability_reviewer_issue_enabled": "false",
        },
        follow_redirects=False,
    )

    assert resposta.status_code == 303

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        resumo = summarize_tenant_admin_policy(empresa.admin_cliente_policy_json)

    assert resumo["tenant_portal_entitlements"]["revisor"] is False
    assert resumo["tenant_capability_entitlements"]["admin_manage_team"] is True
    assert resumo["tenant_capability_entitlements"]["reviewer_issue"] is False
    assert resumo["tenant_capability_flag_semantics"] == "derived_from_contract_surface"


def test_case_action_mode_legado_nao_bloqueia_acoes_da_superficie_contratada() -> None:
    resumo = summarize_tenant_admin_policy(
        {
            "case_visibility_mode": "case_list",
            "case_action_mode": "read_only",
            "commercial_service_package": "inspector_chat_mesa",
            "tenant_capability_inspector_case_finalize_enabled": False,
            "tenant_capability_reviewer_decision_enabled": False,
        }
    )

    assert resumo["case_action_mode_deprecated"] is True
    assert resumo["case_action_mode_semantics"] == "legacy_display_only"
    assert resumo["case_actions_enabled"] is True
    assert resumo["tenant_capability_entitlements"]["inspector_case_finalize"] is True
    assert resumo["tenant_capability_entitlements"]["reviewer_decision"] is True


def test_superficies_expoem_tenant_access_policy_governado(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None

        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "operational_user_cross_portal_enabled": True,
            "operational_user_admin_portal_enabled": True,
            "tenant_capability_admin_manage_team_enabled": False,
            "tenant_capability_inspector_case_finalize_enabled": False,
            "tenant_capability_reviewer_issue_enabled": False,
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor", "cliente"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        banco.commit()

    resposta_login_mobile = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": "inspetor@empresa-a.test",
            "senha": "Senha@123",
            "lembrar": True,
        },
    )
    assert resposta_login_mobile.status_code == 200
    tenant_policy_mobile = resposta_login_mobile.json()["usuario"]["tenant_access_policy"]
    assert tenant_policy_mobile["governed_by_admin_ceo"] is True
    assert tenant_policy_mobile["allowed_portals"] == ["inspetor", "revisor", "cliente"]
    assert tenant_policy_mobile["user_capability_entitlements"]["inspector_case_finalize"] is True

    csrf_cliente = _login_cliente(client, "cliente@empresa-a.test")
    bootstrap_cliente = client.get("/cliente/api/bootstrap")
    assert bootstrap_cliente.status_code == 200
    tenant_policy_cliente = bootstrap_cliente.json()["tenant_access_policy"]
    assert tenant_policy_cliente["user_capability_entitlements"]["admin_manage_team"] is True
    pacote_cliente = bootstrap_cliente.json()["tenant_commercial_package"]
    assert pacote_cliente["label"] == "Chat Inspetor + Mesa Avaliadora"
    assert pacote_cliente["surface_availability"]["mesa"] is True

    usuario_bootstrap = next(
        item
        for item in bootstrap_cliente.json()["usuarios"]
        if item["email"] == "inspetor@empresa-a.test"
    )
    assert usuario_bootstrap["tenant_access_policy"]["allowed_portals"] == [
        "inspetor",
        "revisor",
        "cliente",
    ]

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_portal = client.get("/app/")
    assert resposta_portal.status_code == 200
    boot_inspetor = _extrair_boot_inspetor(resposta_portal.text)
    assert boot_inspetor["tenantAccessPolicy"]["user_capability_entitlements"]["inspector_case_finalize"] is True

    csrf_revisor = _login_revisor(client, "revisor@empresa-a.test")
    resposta_pacote = client.get(f"/revisao/api/laudo/{laudo_id}/pacote")
    assert resposta_pacote.status_code == 200
    tenant_policy_mesa = resposta_pacote.json()["tenant_access_policy"]
    assert tenant_policy_mesa["user_capability_entitlements"]["reviewer_issue"] is True
    assert tenant_policy_mesa["portal_entitlements"]["revisor"] is True

    assert csrf_cliente
    assert csrf_inspetor
    assert csrf_revisor


def test_revogacao_do_portal_revisor_reflete_nos_grants_e_bloqueia_login(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None

        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "operational_user_cross_portal_enabled": True,
            "operational_user_admin_portal_enabled": True,
            "tenant_portal_revisor_enabled": False,
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor", "cliente"]
        banco.commit()

    resposta_login_mobile = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": "inspetor@empresa-a.test",
            "senha": "Senha@123",
            "lembrar": True,
        },
    )
    assert resposta_login_mobile.status_code == 200
    usuario_mobile = resposta_login_mobile.json()["usuario"]
    assert usuario_mobile["allowed_portals"] == ["inspetor", "cliente"]
    assert usuario_mobile["tenant_access_policy"]["portal_entitlements"]["revisor"] is False

    _login_cliente(client, "cliente@empresa-a.test")
    bootstrap_cliente = client.get("/cliente/api/bootstrap")
    assert bootstrap_cliente.status_code == 200
    usuario_bootstrap = next(
        item
        for item in bootstrap_cliente.json()["usuarios"]
        if item["email"] == "inspetor@empresa-a.test"
    )
    assert usuario_bootstrap["allowed_portals"] == ["inspetor", "cliente"]

    tela_login_revisor = client.get("/revisao/login")
    csrf = _extrair_csrf(tela_login_revisor.text)
    resposta_login_revisor = client.post(
        "/revisao/login",
        data={
            "email": "revisor@empresa-a.test",
            "senha": "Senha@123",
            "csrf_token": csrf,
        },
    )
    assert resposta_login_revisor.status_code == 403
    assert "portal correto" in resposta_login_revisor.text.lower()


def test_portal_inspetor_abre_chat_principal_por_padrao_apos_login(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get("/app/")

    assert resposta.status_code == 200
    assert "Portal do Inspetor" in resposta.text
    assert re.search(
        r'id="tela-boas-vindas"[\s\S]*?data-active="false"[\s\S]*?hidden inert',
        resposta.text,
    )
    assert re.search(
        r'id="workspace-assistant-landing"[\s\S]*?aria-label="Chat livre com o assistente"',
        resposta.text,
    )


def test_pacote_servicos_mesa_libera_ferramentas_para_inspetor_com_grant_legado(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None

        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
        }
        inspetor.allowed_portals_json = ["inspetor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_portal = client.get(f"/app/?laudo={laudo_id}")
    assert resposta_portal.status_code == 200
    boot_inspetor = _extrair_boot_inspetor(resposta_portal.text)
    assert boot_inspetor["tenantAccessPolicy"]["allowed_portals"] == ["inspetor", "revisor"]
    assert boot_inspetor["tenantAccessPolicy"]["user_capability_entitlements"]["reviewer_decision"] is True
    assert boot_inspetor["tenantAccessPolicy"]["user_capability_entitlements"]["reviewer_issue"] is True

    _login_revisor(client, "inspetor@empresa-a.test")
    resposta_editor = client.get(
        f"/revisao/templates-laudo/editor?laudo_id={laudo_id}&origin=inspetor"
    )
    assert resposta_editor.status_code == 200


def test_flags_finas_legadas_nao_bloqueiam_funcionarios_do_cliente(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "tenant_capability_admin_manage_team_enabled": False,
            "tenant_capability_inspector_case_create_enabled": False,
            "tenant_capability_inspector_case_finalize_enabled": False,
            "tenant_capability_inspector_send_to_mesa_enabled": False,
            "tenant_capability_mobile_case_approve_enabled": False,
            "tenant_capability_reviewer_decision_enabled": False,
            "tenant_capability_reviewer_issue_enabled": False,
        }
        laudo_aguardando_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        banco.commit()

    csrf_cliente = _login_cliente(client, "cliente@empresa-a.test")
    resposta_criar_usuario = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf_cliente},
        json={
            "nome": "Operador Bloqueado",
            "email": "operador-bloqueado@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62999990001",
            "crea": "",
            "allowed_portals": [],
        },
    )
    assert resposta_criar_usuario.status_code == 201
    assert resposta_criar_usuario.json()["usuario"]["email"] == "operador-bloqueado@empresa-a.test"

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_iniciar = client.post(
        "/app/api/laudo/iniciar",
        headers={"X-CSRF-Token": csrf_inspetor},
        data={"tipo_template": "padrao"},
    )
    assert resposta_iniciar.status_code == 200
    assert int(resposta_iniciar.json()["laudo_id"]) > 0

    resposta_login_mobile = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": "inspetor@empresa-a.test",
            "senha": "Senha@123",
            "lembrar": True,
        },
    )
    assert resposta_login_mobile.status_code == 200
    capabilities_mobile = resposta_login_mobile.json()["usuario"]["tenant_access_policy"][
        "user_capability_entitlements"
    ]
    assert capabilities_mobile["inspector_case_create"] is True
    assert capabilities_mobile["inspector_case_finalize"] is True
    assert capabilities_mobile["inspector_send_to_mesa"] is True
    assert capabilities_mobile["mobile_case_approve"] is True

    csrf_revisor = _login_revisor(client, "revisor@empresa-a.test")
    resposta_pacote = client.get(f"/revisao/api/laudo/{laudo_aguardando_id}/pacote")
    assert resposta_pacote.status_code == 200
    capabilities_mesa = resposta_pacote.json()["tenant_access_policy"][
        "user_capability_entitlements"
    ]
    assert capabilities_mesa["reviewer_decision"] is True
    assert capabilities_mesa["reviewer_issue"] is True
    assert csrf_revisor


def test_finalizacao_sem_mesa_contratada_aprova_no_fluxo_interno_governado(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "tenant_portal_revisor_enabled": False,
            "tenant_capability_inspector_case_create_enabled": True,
            "tenant_capability_inspector_case_finalize_enabled": True,
            "tenant_capability_inspector_send_to_mesa_enabled": False,
            "tenant_capability_mobile_case_approve_enabled": True,
            "tenant_capability_reviewer_decision_enabled": False,
            "tenant_capability_reviewer_issue_enabled": False,
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.primeira_mensagem = "Inspeção inicial em painel elétrico da linha de produção."
        banco.add_all(
            [
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="Identifiquei aquecimento anormal no borne principal do painel.",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="[imagem]",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    tipo=TipoMensagem.IA.value,
                    conteudo="Parecer preliminar: recomenda-se correção e isolamento preventivo.",
                ),
            ]
        )
        banco.commit()

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.post(
        f"/app/api/laudo/{laudo_id}/finalizar",
        headers={"X-CSRF-Token": csrf_inspetor},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["success"] is True
    assert corpo["review_mode_final"] == "mobile_autonomous"
    assert corpo["review_mode_final_reason"] == "tenant_without_mesa"
    assert "sem Mesa Avaliadora" in corpo["message"]

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.APROVADO.value
        assert (
            (laudo.report_pack_draft_json or {})
            .get("quality_gates", {})
            .get("final_validation_mode")
            == "mobile_autonomous"
        )


def test_finalizacao_sem_mesa_bloqueia_correcoes_estruturadas_abertas(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.primeira_mensagem = "Inspeção inicial em painel elétrico da linha de produção."
        laudo.report_pack_draft_json = {
            "structured_corrections": [
                {
                    "id": "corr-test-1",
                    "block": "conclusao",
                    "intent": "corrigir",
                    "description": "Revisar conclusão antes da aprovação sem mesa.",
                    "status": "enviada_ia",
                }
            ],
        }
        banco.add_all(
            [
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="Identifiquei aquecimento anormal no borne principal do painel.",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="[imagem]",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    tipo=TipoMensagem.IA.value,
                    conteudo="Parecer preliminar: recomenda-se correção e isolamento preventivo.",
                ),
            ]
        )
        banco.commit()

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.post(
        f"/app/api/laudo/{laudo_id}/finalizar",
        headers={"X-CSRF-Token": csrf_inspetor},
    )

    assert resposta.status_code == 422
    detalhe = resposta.json()["detail"]
    assert detalhe["code"] == "structured_corrections_pending"
    assert detalhe["open_correction_count"] == 1
    assert detalhe["open_corrections"][0]["id"] == "corr-test-1"

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.RASCUNHO.value


def test_previa_finalizacao_sem_mesa_orienta_resolver_correcoes_abertas(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.report_pack_draft_json = {
            "structured_corrections": [
                {
                    "id": "corr-preview-1",
                    "block": "observacoes",
                    "intent": "adicionar",
                    "description": "Adicionar ressalva antes da aprovação.",
                    "status": "pendente",
                }
            ],
        }
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["can_finalize"] is False
    assert corpo["primary_action"] == "resolve_pending"
    assert corpo["direct_without_mesa"] is True
    assert corpo["corrections"]["open"] == 1
    assert corpo["blocking_items"][0]["code"] == "structured_corrections_pending"
    assert corpo["mobile_chat_first_governance"]["review_governance_mode"] == "self_review_allowed"
    assert corpo["mobile_chat_first_governance"]["self_review_allowed"] is True
    assert corpo["chat_review_tools"]["title"] == "Pendências do caso"
    assert corpo["chat_review_tools"]["self_review_allowed"] is True
    assert corpo["chat_review_tools"]["separate_mesa_required"] is False
    assert corpo["chat_review_tools"]["official_issue_allowed"] is False
    assert corpo["chat_review_tools"]["official_issue_create"] is False
    assert corpo["chat_review_tools"]["structured_review_edit"] is False
    assert "case_self_review" in corpo["chat_review_tools"]["available_case_actions"]


def test_previa_finalizacao_sem_mesa_expoe_revisao_interna_sem_rotulo_mesa(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["can_finalize"] is True
    assert corpo["primary_action"] == "approve_without_mesa"
    assert corpo["primary_label"] == "Aprovar sem Mesa"
    assert corpo["chat_review_tools"]["title"] == "Revisão interna governada"
    assert corpo["chat_review_tools"]["primary_label"] == "Confirmar revisão interna"
    assert "Mesa Avaliadora" not in corpo["chat_review_tools"]["title"]
    assert corpo["chat_review_tools"]["self_review_allowed"] is True
    assert corpo["chat_review_tools"]["case_self_review"] is True
    assert corpo["chat_review_tools"]["separate_mesa_required"] is False
    assert corpo["chat_review_tools"]["official_issue_allowed"] is False
    assert corpo["chat_review_tools"]["official_issue_create"] is False
    assert corpo["mobile_chat_first_governance"]["approval_actor_scope"] == "inspector_self"


def test_previa_finalizacao_com_mesa_mantem_rotulo_mesa_avaliadora(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["primary_action"] == "send_to_mesa"
    assert corpo["chat_review_tools"]["title"] == "Revisão pela Mesa Avaliadora"
    assert corpo["chat_review_tools"]["primary_label"] == "Enviar para Mesa"
    assert corpo["chat_review_tools"]["separate_mesa_required"] is True
    assert corpo["chat_review_tools"]["case_send_to_separate_review"] is True
    assert corpo["chat_review_tools"]["self_review_allowed"] is False
    assert corpo["mobile_chat_first_governance"]["approval_actor_scope"] == "separate_mesa"


def test_previa_finalizacao_com_servicos_revisor_expoe_emissao_oficial_neutra(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["chat_review_tools"]["official_issue_allowed"] is True
    assert corpo["chat_review_tools"]["official_issue_create"] is True
    assert corpo["chat_review_tools"]["official_issue_download"] is True
    assert corpo["chat_review_tools"]["governed_signatory_select"] is True
    assert corpo["chat_review_tools"]["case_review_decide"] is True
    assert corpo["chat_review_tools"]["structured_review_edit"] is True
    assert corpo["chat_review_tools"]["suggested_labels"]["official_issue_label"] == "Emissão oficial"
    assert "official_issue_create" in corpo["chat_review_tools"]["available_case_actions"]


def test_previa_finalizacao_nr35_sem_mesa_continua_bloqueada_por_familia(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.tipo_template = "nr35_linha_vida"
        laudo.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo.report_pack_draft_json = {
            "family": "nr35_inspecao_linha_de_vida",
            "quality_gates": {"final_validation_mode": "mesa_required"},
        }
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 422
    detalhe = resposta.json()["detail"]
    assert detalhe["code"] == "nr35_mesa_required_unavailable"
    assert detalhe["required_capability"] == "inspector_send_to_mesa"


def test_inspetor_com_servicos_da_mesa_abre_preparacao_de_emissao_governada(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        banco.commit()

    resposta_login_mobile = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": "inspetor@empresa-a.test",
            "senha": "Senha@123",
            "lembrar": True,
        },
    )
    assert resposta_login_mobile.status_code == 200
    usuario_mobile = resposta_login_mobile.json()["usuario"]
    assert usuario_mobile["commercial_service_package_label"] == "Chat Inspetor + Mesa + servicos no Inspetor"
    assert (
        usuario_mobile["tenant_access_policy"]["commercial_service_package_effective"]
        == "inspector_chat_mesa_reviewer_services"
    )

    _login_cliente(client, "cliente@empresa-a.test")
    resposta_bootstrap_cliente = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap_cliente.status_code == 200
    assert (
        resposta_bootstrap_cliente.json()["tenant_access_policy"]["commercial_service_package_label"]
        == "Chat Inspetor + Mesa + servicos no Inspetor"
    )
    assert (
        resposta_bootstrap_cliente.json()["tenant_commercial_package"]["label"]
        == "Chat Inspetor + Mesa + servicos no Inspetor"
    )

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/laudo/{laudo_id}/preparar-emissao?tool=pdf")

    assert resposta.status_code == 200
    assert "Preparar emissao oficial" in resposta.text
    assert "Template aplicado" in resposta.text
    assert "Assinatura digital" in resposta.text
    assert "Aguardando aprova" in resposta.text
    assert "Emitir oficialmente" in resposta.text
    assert f"/revisao/api/laudo/{laudo_id}/pacote/exportar-pdf" in resposta.text

    resposta_assinatura = client.get(f"/app/laudo/{laudo_id}/assinatura")
    assert resposta_assinatura.status_code == 200
    assert "Assinatura digital do laudo" in resposta_assinatura.text
    assert "Selecione o signatario governado" in resposta_assinatura.text


def test_inspetor_sem_servicos_da_mesa_nao_abre_preparacao_de_emissao(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        inspetor.allowed_portals_json = ["inspetor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/laudo/{laudo_id}/preparar-emissao?tool=pdf")

    assert resposta.status_code == 403
    assert "emissão oficial" in resposta.json()["detail"].lower()

    _login_cliente(client, "cliente@empresa-a.test")
    resposta_portal = client.get("/cliente/painel")
    assert resposta_portal.status_code == 200
    assert "Chat Inspetor sem Mesa" in resposta_portal.text
    assert 'id="tab-mesa"' in resposta_portal.text
    assert 'data-surface-disabled="true"' in resposta_portal.text.split('id="tab-mesa"', 1)[1].split(">", 1)[0]


def test_inspetor_com_servicos_da_mesa_emite_oficialmente_no_fluxo_do_chat(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.nome_arquivo_pdf = "laudo_emitido.pdf"
        laudo.tipo_template = "nr13"
        laudo.catalog_family_key = "nr13_inspecao_caldeira"
        laudo.report_pack_draft_json = {"quality_gates": {"missing_evidence": []}}
        banco.add(
            ApprovedCaseSnapshot(
                laudo_id=laudo_id,
                empresa_id=ids["empresa_a"],
                family_key="nr13_inspecao_caldeira",
                approval_version=1,
                document_outcome="approved",
                laudo_output_snapshot={"codigo_hash": laudo.codigo_hash},
            )
        )
        signatario = SignatarioGovernadoLaudo(
            tenant_id=ids["empresa_a"],
            nome="Eng. Inspetor Responsavel",
            funcao="Responsavel tecnico",
            registro_profissional="CREA 123456-GO",
            valid_until=datetime.now(timezone.utc) + timedelta(days=120),
            allowed_family_keys_json=["nr13_inspecao_caldeira"],
            ativo=True,
            criado_por_id=ids["admin_a"],
        )
        banco.add(signatario)
        banco.commit()
        signatory_id = int(signatario.id)

    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.post(
        f"/app/api/laudo/{laudo_id}/emissao-oficial",
        headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
        json={"signatory_id": signatory_id},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["success"] is True
    assert corpo["issue_number"].startswith("TAR-")
    assert corpo["download_url"] == f"/app/api/laudo/{laudo_id}/emissao-oficial/download"
    assert corpo["record"]["package_storage_ready"] is True

    resposta_download = client.get(corpo["download_url"])
    assert resposta_download.status_code == 200
    assert "application/zip" in resposta_download.headers.get("content-type", "").lower()

    with SessionLocal() as banco:
        registros_download = (
            banco.query(RegistroAuditoriaEmpresa)
            .filter(
                RegistroAuditoriaEmpresa.empresa_id == ids["empresa_a"],
                RegistroAuditoriaEmpresa.acao == "emissao_oficial_download",
                RegistroAuditoriaEmpresa.portal == "inspetor",
            )
            .order_by(RegistroAuditoriaEmpresa.id.asc())
            .all()
        )
    assert len(registros_download) == 1
    payload = registros_download[0].payload_json or {}
    assert payload["laudo_id"] == laudo_id
    assert payload["artifact_kind"] == "official_package"
    assert payload["issue_number"] == corpo["issue_number"]
    assert payload["route_path"] == corpo["download_url"]
    assert "package_storage_path" not in payload
    assert "storage_path" not in payload


def test_preparacao_emissao_exibe_contexto_documental_e_fotos_curadas(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.nome_arquivo_pdf = "laudo_emitido.pdf"
        laudo.catalog_family_key = "nr13_inspecao_caldeira"
        laudo.dados_formulario = {
            "correcoes_estruturadas_aplicadas": [
                {
                    "id": "corr-1",
                    "block": "observacoes",
                    "description": "Registrar ressalva documental sobre acesso parcial.",
                    "applied_at": "2026-04-23T14:00:00+00:00",
                    "fields": ["dados_formulario.observacoes"],
                }
            ],
            "checklist_correcoes_estruturadas": [
                {"description": "Ajustar checklist final para NC controlada."}
            ],
            "evidencias_correcoes_estruturadas": [
                {"description": "Substituir foto superior por anexo validado."}
            ],
        }
        laudo.report_pack_draft_json = {
            "structured_corrections": [
                {"id": "corr-1", "status": "aplicada"},
                {"id": "corr-2", "status": "pendente"},
            ],
            "analysis_basis": {
                "coverage_summary": "2 foto(s) elegiveis para emissao.",
                "photo_evidence": [
                    {
                        "message_id": 701,
                        "reference": "msg:701",
                        "label": "Vista geral",
                        "caption": "Linha de vida vertical na escada de acesso",
                    },
                    {
                        "message_id": 702,
                        "reference": "msg:702",
                        "label": "Ponto superior",
                        "caption": "Corrosao inicial no cabo proximo ao topo",
                    },
                ],
                "selected_photo_evidence": [
                    {
                        "message_id": 701,
                        "reference": "msg:701",
                        "label": "Vista geral",
                        "caption": "Linha de vida vertical na escada de acesso",
                    }
                ],
            },
            "quality_gates": {"missing_evidence": []},
        }
        banco.add(
            ApprovedCaseSnapshot(
                laudo_id=laudo_id,
                empresa_id=ids["empresa_a"],
                family_key="nr13_inspecao_caldeira",
                approval_version=3,
                document_outcome="approved",
                laudo_output_snapshot={"codigo_hash": laudo.codigo_hash},
            )
        )
        signatario = SignatarioGovernadoLaudo(
            tenant_id=ids["empresa_a"],
            nome="Eng. Inspetor Responsavel",
            funcao="Responsavel tecnico",
            registro_profissional="CREA 123456-GO",
            valid_until=datetime.now(timezone.utc) + timedelta(days=120),
            allowed_family_keys_json=["nr13_inspecao_caldeira"],
            ativo=True,
            criado_por_id=ids["admin_a"],
        )
        banco.add(signatario)
        banco.commit()

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/laudo/{laudo_id}/preparar-emissao?tool=pdf")

    assert resposta.status_code == 200
    assert "Correcoes no documento" in resposta.text
    assert "Registrar ressalva documental sobre acesso parcial." in resposta.text
    assert "Fotos para emissao" in resposta.text
    assert "2 foto(s) elegiveis para emissao." in resposta.text
    assert "msg:701" in resposta.text
    assert "Mudancas desde a emissao ativa" in resposta.text
    assert f"/revisao/templates-laudo/editor?laudo_id={laudo_id}&amp;origin=inspetor_preparar_emissao" in resposta.text


def test_editor_visual_recebe_contexto_do_inspetor_para_laudo_real(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.catalog_family_key = "nr13_inspecao_caldeira"
        laudo.dados_formulario = {
            "informacoes_gerais": {"cliente": "Cliente demonstracao"},
            "checklist_correcoes_estruturadas": [
                {"description": "Ajustar checklist final para NC controlada."}
            ],
            "evidencias_correcoes_estruturadas": [
                {"description": "Substituir foto superior por anexo validado."}
            ],
            "correcoes_estruturadas_aplicadas": [
                {
                    "id": "corr-1",
                    "block": "observacoes",
                    "description": "Registrar ressalva documental sobre acesso parcial.",
                }
            ],
        }
        laudo.report_pack_draft_json = {
            "analysis_basis": {
                "selected_photo_evidence": [
                    {
                        "label": "Vista geral",
                        "caption": "Linha de vida vertical na escada de acesso",
                    }
                ]
            },
            "structured_corrections": [
                {"id": "corr-1", "status": "aplicada"},
                {"id": "corr-2", "status": "pendente"},
            ],
            "quality_gates": {"missing_evidence": []},
        }
        banco.add(
            ApprovedCaseSnapshot(
                laudo_id=laudo_id,
                empresa_id=ids["empresa_a"],
                family_key="nr13_inspecao_caldeira",
                approval_version=2,
                document_outcome="approved",
                laudo_output_snapshot={"codigo_hash": laudo.codigo_hash},
            )
        )
        banco.commit()

    _login_revisor(client, "revisor@empresa-a.test")
    resposta = client.get(
        f"/revisao/templates-laudo/editor?laudo_id={laudo_id}&origin=inspetor_preparar_emissao"
    )

    assert resposta.status_code == 200
    assert "Contexto do laudo" in resposta.text
    assert "Chat Inspetor" in resposta.text
    assert "Registrar ressalva documental sobre acesso parcial." in resposta.text
    assert "Inserir checklist" in resposta.text
    assert '"laudo_id": %d' % laudo_id in resposta.text


def test_inspetor_salva_curadoria_de_fotos_para_emissao_no_fluxo_do_chat(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
        }
        inspetor.allowed_portals_json = ["inspetor", "revisor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.report_pack_draft_json = {
            "analysis_basis": {
                "photo_evidence": [
                    {
                        "message_id": 801,
                        "reference": "msg:801",
                        "label": "Vista geral",
                        "caption": "Visao geral do conjunto inspecionado",
                    },
                    {
                        "message_id": 802,
                        "reference": "msg:802",
                        "label": "Detalhe",
                        "caption": "Detalhe do achado principal",
                    },
                ]
            },
            "quality_gates": {"missing_evidence": []},
        }
        banco.commit()

    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.post(
        f"/app/api/laudo/{laudo_id}/fotos-emissao",
        headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
        json={
            "selected_photo_keys": ["msg:802"],
            "selection_source": "inspetor_prepare_issue",
        },
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["ok"] is True
    analysis_basis = corpo["report_pack_draft"]["analysis_basis"]
    assert analysis_basis["issued_photo_selection"]["selection_source"] == "inspetor_prepare_issue"
    assert analysis_basis["issued_photo_selection"]["selected_keys"] == ["msg:802"]
    assert analysis_basis["selected_photo_evidence"][0]["message_id"] == 802


def test_correcoes_estruturadas_do_inspetor_persistem_no_laudo(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        inspetor = banco.get(Usuario, ids["inspetor_a"])
        assert empresa is not None
        assert inspetor is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        inspetor.allowed_portals_json = ["inspetor"]
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        banco.commit()

    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_criacao = client.post(
        f"/app/api/laudo/{laudo_id}/correcoes-estruturadas",
        headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
        json={
            "block": "evidencias",
            "intent": "substituir",
            "description": "Trocar foto superior por imagem anexada.",
        },
    )

    assert resposta_criacao.status_code == 201
    corpo = resposta_criacao.json()
    item_id = corpo["item"]["id"]
    assert corpo["summary"]["pending"] == 1
    assert corpo["item"]["status"] == "pendente"

    resposta_status = client.patch(
        f"/app/api/laudo/{laudo_id}/correcoes-estruturadas/{item_id}",
        headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
        json={"status": "enviada_ia"},
    )
    assert resposta_status.status_code == 200
    assert resposta_status.json()["item"]["status"] == "enviada_ia"

    resposta_lista = client.get(f"/app/api/laudo/{laudo_id}/correcoes-estruturadas")
    assert resposta_lista.status_code == 200
    assert resposta_lista.json()["items"][0]["description"] == "Trocar foto superior por imagem anexada."

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        draft = laudo.report_pack_draft_json
        assert isinstance(draft, dict)
        assert draft["structured_corrections"][0]["id"] == item_id

        atualizar_report_pack_draft_laudo(banco=banco, laudo=laudo)
        banco.flush()
        draft_recalculado = laudo.report_pack_draft_json
        assert isinstance(draft_recalculado, dict)
        assert draft_recalculado["structured_corrections"][0]["id"] == item_id
        assert draft_recalculado["structured_corrections"][0]["status"] == "enviada_ia"


def test_correcao_estruturada_aplicada_atualiza_documento_do_laudo(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.dados_formulario = {
            "conclusao": {"conclusao_tecnica": "Conclusão inicial."},
            "observacoes": "Observação anterior.",
        }
        banco.commit()

    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_criacao = client.post(
        f"/app/api/laudo/{laudo_id}/correcoes-estruturadas",
        headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
        json={
            "block": "observacoes",
            "intent": "adicionar",
            "description": "Registrar ressalva de acesso parcial controlado.",
        },
    )
    assert resposta_criacao.status_code == 201
    item_id = resposta_criacao.json()["item"]["id"]

    resposta_status = client.patch(
        f"/app/api/laudo/{laudo_id}/correcoes-estruturadas/{item_id}",
        headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
        json={"status": "aplicada"},
    )

    assert resposta_status.status_code == 200
    corpo = resposta_status.json()
    assert corpo["item"]["status"] == "aplicada"
    assert "dados_formulario.observacoes" in corpo["item"]["applied_to"]

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert isinstance(laudo.dados_formulario, dict)
        assert "Observação anterior." in laudo.dados_formulario["observacoes"]
        assert "Registrar ressalva de acesso parcial controlado." in laudo.dados_formulario["observacoes"]
        assert (
            "Registrar ressalva de acesso parcial controlado."
            in laudo.dados_formulario["documentacao_e_registros"]["observacoes_documentais"]
        )
        draft = laudo.report_pack_draft_json
        assert isinstance(draft, dict)
        assert draft["structured_data_candidate"]["observacoes"] == laudo.dados_formulario["observacoes"]
        assert draft["structured_corrections"][0]["application_mode"] == "document_payload_append"


def test_correcao_estruturada_aplicada_registra_checklist_e_evidencias(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        banco.commit()

    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")
    created_ids = {}
    for block, description in {
        "checklist": "Alterar item de proteção para NC após validação humana.",
        "evidencias": "Substituir foto superior por anexo com foco adequado.",
    }.items():
        resposta_criacao = client.post(
            f"/app/api/laudo/{laudo_id}/correcoes-estruturadas",
            headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
            json={
                "block": block,
                "intent": "corrigir",
                "description": description,
            },
        )
        assert resposta_criacao.status_code == 201
        created_ids[block] = resposta_criacao.json()["item"]["id"]

    for item_id in created_ids.values():
        resposta_status = client.patch(
            f"/app/api/laudo/{laudo_id}/correcoes-estruturadas/{item_id}",
            headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
            json={"status": "aplicada"},
        )
        assert resposta_status.status_code == 200
        assert resposta_status.json()["item"]["applied_to"]

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert isinstance(laudo.dados_formulario, dict)
        assert (
            laudo.dados_formulario["checklist_correcoes_estruturadas"][0]["description"]
            == "Alterar item de proteção para NC após validação humana."
        )
        assert (
            laudo.dados_formulario["evidencias_correcoes_estruturadas"][0]["description"]
            == "Substituir foto superior por anexo com foco adequado."
        )


def test_superficie_mesa_contratada_mantem_avaliador_operacional_com_flags_finas_falsas(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "tenant_capability_reviewer_decision_enabled": False,
            "tenant_capability_reviewer_issue_enabled": False,
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        banco.commit()

    _login_revisor(client, "revisor@empresa-a.test")

    resposta_pacote = client.get(f"/revisao/api/laudo/{laudo_id}/pacote")
    assert resposta_pacote.status_code == 200
    tenant_policy = resposta_pacote.json()["tenant_access_policy"]
    assert tenant_policy["portal_entitlements"]["revisor"] is True
    assert tenant_policy["user_capability_entitlements"]["reviewer_decision"] is True
    assert tenant_policy["user_capability_entitlements"]["reviewer_issue"] is True
