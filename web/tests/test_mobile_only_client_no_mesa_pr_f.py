from __future__ import annotations

from sqlalchemy import select

from app.shared.database import (
    ApprovedCaseSnapshot,
    EmissaoOficialLaudo,
    Empresa,
    Laudo,
    MensagemLaudo,
    StatusRevisao,
    TipoMensagem,
    Usuario,
)
from tests.regras_rotas_criticas_support import (
    _criar_laudo,
    _login_app_inspetor,
    _login_cliente,
)


def _configurar_tenant_individual_mobile_only(banco, ids: dict[str, int]) -> None:
    empresa = banco.get(Empresa, ids["empresa_a"])
    inspetor = banco.get(Usuario, ids["inspetor_a"])
    assert empresa is not None
    assert inspetor is not None

    empresa.admin_cliente_policy_json = {
        "commercial_service_package": "inspector_chat",
        "operating_model": "mobile_single_operator",
        "case_visibility_mode": "case_list",
        "case_action_mode": "case_actions",
    }
    inspetor.allowed_portals_json = ["inspetor", "cliente"]


def _criar_laudo_simples_com_pdf_operacional(banco, ids: dict[str, int]) -> int:
    laudo_id = _criar_laudo(
        banco,
        empresa_id=ids["empresa_a"],
        usuario_id=ids["inspetor_a"],
        status_revisao=StatusRevisao.RASCUNHO.value,
        tipo_template="padrao",
    )
    laudo = banco.get(Laudo, laudo_id)
    assert laudo is not None
    laudo.primeira_mensagem = "Inspeção simples de quadro elétrico residencial."
    laudo.report_pack_draft_json = {
        "family": "geral",
        "template_key": "padrao",
        "quality_gates": {"final_validation_mode": "mesa_required"},
    }
    banco.add_all(
        [
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=ids["inspetor_a"],
                tipo=TipoMensagem.USER.value,
                conteudo="Coleta técnica concluída com evidência textual suficiente.",
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
                conteudo="Parecer preliminar: sem não conformidades críticas para esta família simples.",
            ),
        ]
    )
    return laudo_id


def _buscar_item_por_laudo_id(items: list[dict[str, object]], laudo_id: int) -> dict[str, object]:
    return next(item for item in items if int(item.get("id") or item.get("laudo_id") or 0) == int(laudo_id))


def test_cliente_individual_mobile_only_aprova_familia_simples_sem_mesa_e_sem_emissao_oficial(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        _configurar_tenant_individual_mobile_only(banco, ids)
        laudo_id = _criar_laudo_simples_com_pdf_operacional(banco, ids)
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
    token_mobile = resposta_login_mobile.json()["access_token"]
    policy_mobile = usuario_mobile["tenant_access_policy"]

    assert usuario_mobile["commercial_service_package"] == "inspector_chat"
    assert usuario_mobile["commercial_operating_model"] == "mobile_single_operator"
    assert usuario_mobile["allowed_portals"] == ["inspetor", "cliente"]
    assert policy_mobile["portal_entitlements"]["cliente"] is True
    assert policy_mobile["portal_entitlements"]["inspetor"] is True
    assert policy_mobile["portal_entitlements"]["revisor"] is False
    assert policy_mobile["user_capability_entitlements"]["inspector_case_create"] is True
    assert policy_mobile["user_capability_entitlements"]["inspector_case_finalize"] is True
    assert policy_mobile["user_capability_entitlements"]["mobile_case_approve"] is True
    assert policy_mobile["user_capability_entitlements"]["inspector_send_to_mesa"] is False
    assert policy_mobile["user_capability_entitlements"]["reviewer_decision"] is False
    assert policy_mobile["user_capability_entitlements"]["reviewer_issue"] is False
    assert policy_mobile["user_capability_aliases"]["case_self_review"] is True
    assert policy_mobile["user_capability_aliases"]["official_issue_create"] is False
    assert policy_mobile["user_mobile_chat_first_governance"]["self_review_allowed"] is True
    assert policy_mobile["user_mobile_chat_first_governance"]["separate_mesa_required"] is False
    assert policy_mobile["user_mobile_chat_first_governance"]["official_issue_allowed"] is False

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_preview = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")
    assert resposta_preview.status_code == 200
    preview = resposta_preview.json()
    assert preview["primary_action"] == "approve_without_mesa"
    assert preview["direct_without_mesa"] is True
    assert preview["mobile_chat_first_governance"]["self_review_allowed"] is True
    assert preview["mobile_chat_first_governance"]["separate_mesa_required"] is False
    assert preview["mobile_chat_first_governance"]["official_issue_allowed"] is False
    assert preview["chat_review_tools"]["title"] == "Aprovação interna"
    assert preview["chat_review_tools"]["official_issue_create"] is False

    resposta_finalizar = client.post(
        f"/app/api/laudo/{laudo_id}/finalizar",
        headers={"X-CSRF-Token": csrf_inspetor},
    )
    assert resposta_finalizar.status_code == 200
    corpo_finalizar = resposta_finalizar.json()
    assert corpo_finalizar["success"] is True
    assert corpo_finalizar["review_mode_final"] == "mobile_autonomous"
    assert corpo_finalizar["review_mode_final_reason"] == "tenant_without_mesa"
    assert "aprovação interna" in corpo_finalizar["message"]

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.APROVADO.value
        laudo.nome_arquivo_pdf = "laudo_operacional_cliente_individual.pdf"
        assert (
            (laudo.report_pack_draft_json or {})
            .get("quality_gates", {})
            .get("final_validation_mode")
            == "mobile_autonomous"
        )
        snapshots = list(
            banco.scalars(
                select(ApprovedCaseSnapshot).where(ApprovedCaseSnapshot.laudo_id == laudo_id)
            ).all()
        )
        assert len(snapshots) == 1
        assert snapshots[0].document_outcome == "approved_mobile_autonomous"
        emissoes = list(
            banco.scalars(
                select(EmissaoOficialLaudo).where(EmissaoOficialLaudo.laudo_id == laudo_id)
            ).all()
        )
        assert emissoes == []
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")
    resposta_bootstrap = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap.status_code == 200
    bootstrap = resposta_bootstrap.json()
    pacote = bootstrap["tenant_commercial_package"]
    overview = bootstrap["tenant_commercial_overview"]
    recursos = {item["key"]: item for item in overview["resources"]}

    assert pacote["key"] == "inspector_chat"
    assert pacote["operating_model"] == "mobile_single_operator"
    assert pacote["surface_availability"]["chat"] is True
    assert pacote["surface_availability"]["mesa"] is False
    assert pacote["capability_aliases"]["case_self_review"] is True
    assert pacote["capability_aliases"]["official_issue_create"] is False
    assert pacote["mobile_chat_first_governance"]["official_issue_allowed"] is False
    assert overview["resource_summary"]["mobile_enabled"] is True
    assert overview["resource_summary"]["chat_enabled"] is True
    assert overview["resource_summary"]["self_review_allowed"] is True
    assert overview["resource_summary"]["separate_mesa_available"] is False
    assert overview["resource_summary"]["official_issue_allowed"] is False
    assert overview["mesa_contracted"] is False
    assert overview["official_issue_included"] is False
    assert recursos["mobile"]["available"] is True
    assert recursos["chat"]["available"] is True
    assert recursos["self_review"]["available"] is True
    assert recursos["mesa"]["available"] is False
    assert recursos["official_issue"]["available"] is False
    assert "pdf operacional" in recursos["official_issue"]["detail"].lower()

    documento = _buscar_item_por_laudo_id(bootstrap["documentos"]["items"], laudo_id)
    assert documento["pdf_file_name"] == "laudo_operacional_cliente_individual.pdf"
    assert documento["already_issued"] is False
    assert documento["reissue_recommended"] is False
    assert documento["issue_number"] is None
    assert documento["historico_emissoes"] == []
    assert documento["emissao_oficial"]["existe"] is False
    assert documento["emissao_oficial"]["issue_number"] is None

    resposta_mobile_laudos = client.get(
        "/app/api/mobile/laudos",
        headers={"Authorization": f"Bearer {token_mobile}"},
    )
    assert resposta_mobile_laudos.status_code == 200
    item_mobile = _buscar_item_por_laudo_id(resposta_mobile_laudos.json()["itens"], laudo_id)
    assert "official_issue_summary" not in item_mobile
    assert (
        (item_mobile["report_pack_draft"] or {})
        .get("quality_gates", {})
        .get("final_validation_mode")
        == "mobile_autonomous"
    )


def test_cliente_individual_mobile_only_nao_converte_nr35_em_self_review_sem_mesa(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        _configurar_tenant_individual_mobile_only(banco, ids)
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
            tipo_template="nr35_linha_vida",
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo.report_pack_draft_json = {
            "family": "nr35_inspecao_linha_de_vida",
            "template_key": "nr35_linha_vida",
            "quality_gates": {"final_validation_mode": "mesa_required"},
        }
        banco.add_all(
            [
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="Sistema de linha de vida inspecionado em cobertura industrial.",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="Componentes principais exigem validação técnica governada.",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="[imagem]",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="[foto]",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    remetente_id=ids["inspetor_a"],
                    tipo=TipoMensagem.USER.value,
                    conteudo="imagem enviada",
                ),
                MensagemLaudo(
                    laudo_id=laudo_id,
                    tipo=TipoMensagem.IA.value,
                    conteudo="Parecer técnico preliminar NR35 depende de Revisão Técnica.",
                ),
            ]
        )
        banco.commit()

    csrf_inspetor = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_preview = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")
    assert resposta_preview.status_code == 422
    detalhe_preview = resposta_preview.json()["detail"]
    assert detalhe_preview["code"] == "nr35_mesa_required_unavailable"
    assert detalhe_preview["review_mode_requested"] == "mesa_required"
    assert detalhe_preview["required_capability"] == "inspector_send_to_mesa"
    assert "NR35 Linha de Vida exige Revisão Técnica" in detalhe_preview["message"]

    resposta_finalizar = client.post(
        f"/app/api/laudo/{laudo_id}/finalizar",
        headers={"X-CSRF-Token": csrf_inspetor},
    )

    assert resposta_finalizar.status_code == 422

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.RASCUNHO.value
        assert (
            (laudo.report_pack_draft_json or {})
            .get("quality_gates", {})
            .get("final_validation_mode")
            == "mesa_required"
        )
        assert (
            banco.scalar(
                select(ApprovedCaseSnapshot).where(ApprovedCaseSnapshot.laudo_id == laudo_id)
            )
            is None
        )
        assert (
            banco.scalar(
                select(EmissaoOficialLaudo).where(EmissaoOficialLaudo.laudo_id == laudo_id)
            )
            is None
        )
