from __future__ import annotations

from sqlalchemy import select

from app.shared.database import (
    ApprovedCaseSnapshot,
    EmissaoOficialLaudo,
    Empresa,
    Laudo,
    MensagemLaudo,
    NivelAcesso,
    PlanoEmpresa,
    StatusRevisao,
    TipoMensagem,
    Usuario,
)
from tests.regras_rotas_criticas_support import (
    SENHA_HASH_PADRAO,
    _criar_laudo,
    _login_app_inspetor,
    _login_cliente,
)


def _criar_empresa_sem_mesa_multiusuario_base(banco, *, sufixo: str) -> dict[str, int | str]:
    sufixo_numerico = "".join(ch for ch in sufixo if ch.isdigit()) or "0"
    empresa = Empresa(
        nome_fantasia=f"Empresa Aprovação interna {sufixo.upper()}",
        cnpj=f"33000000000{int(sufixo_numerico):03d}",
        plano_ativo=PlanoEmpresa.ILIMITADO.value,
        admin_cliente_policy_json={
            "commercial_service_package": "inspector_chat",
            "operating_model": "standard",
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
        },
    )
    banco.add(empresa)
    banco.flush()

    admin = Usuario(
        empresa_id=int(empresa.id),
        nome_completo="Admin Cliente Aprovação interna",
        email=f"cliente-sem-mesa-{sufixo}@empresa.test",
        senha_hash=SENHA_HASH_PADRAO,
        nivel_acesso=NivelAcesso.ADMIN_CLIENTE.value,
        allowed_portals_json=["cliente"],
    )
    inspetor = Usuario(
        empresa_id=int(empresa.id),
        nome_completo="Inspetor Operacional Aprovação interna",
        email=f"inspetor-sem-mesa-{sufixo}@empresa.test",
        senha_hash=SENHA_HASH_PADRAO,
        nivel_acesso=NivelAcesso.INSPETOR.value,
        allowed_portals_json=["inspetor"],
    )
    banco.add_all([admin, inspetor])
    banco.commit()

    return {
        "empresa_id": int(empresa.id),
        "admin_id": int(admin.id),
        "inspetor_id": int(inspetor.id),
        "admin_email": str(admin.email),
        "inspetor_email": str(inspetor.email),
    }


def _buscar_item_por_laudo_id(items: list[dict[str, object]], laudo_id: int) -> dict[str, object]:
    return next(item for item in items if int(item.get("id") or item.get("laudo_id") or 0) == int(laudo_id))


def _preparar_laudo_simples_para_finalizacao(
    banco,
    *,
    laudo_id: int,
    inspetor_id: int,
) -> None:
    laudo = banco.get(Laudo, laudo_id)
    assert laudo is not None
    laudo.primeira_mensagem = "Inspecao simples em ambiente administrativo."
    laudo.report_pack_draft_json = {
        "family": "geral",
        "template_key": "padrao",
        "quality_gates": {"final_validation_mode": "mesa_required"},
    }
    banco.add_all(
        [
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="Coleta tecnica concluida com evidencias textuais suficientes.",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="[imagem]",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                tipo=TipoMensagem.IA.value,
                conteudo="Parecer preliminar: familia simples sem nao conformidade critica.",
            ),
        ]
    )
    banco.commit()


def _criar_laudo_nr35_rascunho(
    banco,
    *,
    empresa_id: int,
    inspetor_id: int,
) -> int:
    laudo_id = _criar_laudo(
        banco,
        empresa_id=empresa_id,
        usuario_id=inspetor_id,
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
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="Sistema de linha de vida inspecionado em cobertura industrial.",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="Componentes principais exigem validacao tecnica governada.",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="[imagem]",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="[foto]",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=inspetor_id,
                tipo=TipoMensagem.USER.value,
                conteudo="imagem enviada",
            ),
            MensagemLaudo(
                laudo_id=laudo_id,
                tipo=TipoMensagem.IA.value,
                conteudo="Parecer tecnico preliminar NR35 depende de Revisão Técnica.",
            ),
        ]
    )
    banco.commit()
    return laudo_id


def test_empresa_sem_mesa_multiusuario_admin_gerencia_inspetor_opera_e_portal_nao_expoe_emissao(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]

    with SessionLocal() as banco:
        contexto = _criar_empresa_sem_mesa_multiusuario_base(banco, sufixo="g1")

    csrf_cliente = _login_cliente(client, str(contexto["admin_email"]))

    resposta_bootstrap_inicial = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap_inicial.status_code == 200
    bootstrap_inicial = resposta_bootstrap_inicial.json()
    pacote_inicial = bootstrap_inicial["tenant_commercial_package"]
    overview_inicial = bootstrap_inicial["tenant_commercial_overview"]

    assert pacote_inicial["key"] == "inspector_chat"
    assert pacote_inicial["operating_model"] == "standard"
    assert pacote_inicial["surface_availability"]["chat"] is True
    assert pacote_inicial["surface_availability"]["mesa"] is False
    assert pacote_inicial["capability_entitlements"]["inspector_case_create"] is True
    assert pacote_inicial["capability_entitlements"]["inspector_case_finalize"] is True
    assert pacote_inicial["capability_entitlements"]["inspector_send_to_mesa"] is False
    assert pacote_inicial["capability_entitlements"]["reviewer_decision"] is False
    assert pacote_inicial["capability_entitlements"]["reviewer_issue"] is False
    assert pacote_inicial["capability_aliases"]["case_self_review"] is True
    assert pacote_inicial["capability_aliases"]["official_issue_create"] is False
    assert pacote_inicial["capability_aliases"]["governed_signatory_select"] is False
    assert pacote_inicial["mobile_chat_first_governance"]["self_review_allowed"] is True
    assert pacote_inicial["mobile_chat_first_governance"]["separate_mesa_required"] is False
    assert pacote_inicial["mobile_chat_first_governance"]["official_issue_allowed"] is False
    assert overview_inicial["mesa_contracted"] is False
    assert overview_inicial["official_issue_included"] is False
    assert overview_inicial["resource_summary"]["self_review_allowed"] is True
    assert overview_inicial["resource_summary"]["separate_mesa_available"] is False
    assert overview_inicial["resource_summary"]["official_issue_allowed"] is False
    recursos_iniciais = {item["key"]: item for item in overview_inicial["resources"]}
    assert recursos_iniciais["mesa"]["available"] is False
    assert recursos_iniciais["official_issue"]["available"] is False
    assert recursos_iniciais["governed_signatory"]["available"] is False
    assert "pdf operacional" in recursos_iniciais["official_issue"]["detail"].lower()

    resposta_admin_cliente_extra = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf_cliente},
        json={
            "nome": "Admin Cliente Extra",
            "email": "admin-cliente-extra-g1@empresa.test",
            "nivel_acesso": "admin_cliente",
            "telefone": "62990000000",
            "crea": "",
        },
    )
    assert resposta_admin_cliente_extra.status_code == 403
    assert "Admin-Cliente" in resposta_admin_cliente_extra.json()["detail"]

    resposta_plano = client.patch(
        "/cliente/api/empresa/plano",
        headers={"X-CSRF-Token": csrf_cliente},
        json={"plano": "Intermediario"},
    )
    assert resposta_plano.status_code == 403
    assert "Registre interesse" in resposta_plano.json()["detail"]

    resposta_inspetor_extra = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf_cliente},
        json={
            "nome": "Inspetor Operacional G2",
            "email": "inspetor-sem-mesa-g2@empresa.test",
            "nivel_acesso": "inspetor",
            "telefone": "62990000002",
            "crea": "",
            "allowed_portals": ["inspetor", "revisor"],
        },
    )
    assert resposta_inspetor_extra.status_code == 400
    assert "revisor" in resposta_inspetor_extra.json()["detail"].lower()

    resposta_inspetor_extra = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf_cliente},
        json={
            "nome": "Inspetor Operacional G2",
            "email": "inspetor-sem-mesa-g2@empresa.test",
            "nivel_acesso": "inspetor",
            "telefone": "62990000002",
            "crea": "",
            "allowed_portals": ["inspetor"],
        },
    )
    assert resposta_inspetor_extra.status_code == 201
    corpo_inspetor_extra = resposta_inspetor_extra.json()
    inspetor_extra_id = int(corpo_inspetor_extra["usuario"]["id"])
    assert corpo_inspetor_extra["usuario"]["papel"] == "Operador de campo"
    assert corpo_inspetor_extra["usuario"]["allowed_portals"] == ["inspetor"]
    assert corpo_inspetor_extra["credencial_onboarding"]["portais"] == [
        {
            "portal": "inspetor",
            "label": "Inspeção IA",
            "login_url": "/app/login",
        }
    ]

    resposta_usuarios = client.get("/cliente/api/usuarios")
    assert resposta_usuarios.status_code == 200
    usuarios_payload = resposta_usuarios.json()["itens"]
    assert {item["email"] for item in usuarios_payload} == {
        str(contexto["inspetor_email"]),
        "inspetor-sem-mesa-g2@empresa.test",
    }
    assert {item["papel"] for item in usuarios_payload} == {"Operador de campo"}
    assert all(item["allowed_portals"] == ["inspetor"] for item in usuarios_payload)

    with SessionLocal() as banco:
        inspetor_extra = banco.get(Usuario, inspetor_extra_id)
        assert inspetor_extra is not None
        assert int(inspetor_extra.empresa_id) == int(contexto["empresa_id"])
        assert int(inspetor_extra.nivel_acesso) == int(NivelAcesso.INSPETOR)
        assert inspetor_extra.allowed_portals == ("inspetor",)
        inspetor_extra.senha_hash = SENHA_HASH_PADRAO
        inspetor_extra.senha_temporaria_ativa = False
        banco.commit()

    resposta_login_mobile = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": str(contexto["inspetor_email"]),
            "senha": "Senha@123",
            "lembrar": True,
        },
    )
    assert resposta_login_mobile.status_code == 200
    token_mobile = resposta_login_mobile.json()["access_token"]
    usuario_mobile = resposta_login_mobile.json()["usuario"]
    policy_mobile = usuario_mobile["tenant_access_policy"]
    assert usuario_mobile["commercial_service_package"] == "inspector_chat"
    assert usuario_mobile["commercial_operating_model"] == "standard"
    assert usuario_mobile["allowed_portals"] == ["inspetor"]
    assert policy_mobile["portal_entitlements"]["cliente"] is True
    assert policy_mobile["portal_entitlements"]["inspetor"] is True
    assert policy_mobile["portal_entitlements"]["revisor"] is False
    assert policy_mobile["user_capability_aliases"]["case_create"] is True
    assert policy_mobile["user_capability_aliases"]["case_finalize_request"] is True
    assert policy_mobile["user_capability_aliases"]["case_self_review"] is True
    assert policy_mobile["user_capability_aliases"]["case_send_to_separate_review"] is False
    assert policy_mobile["user_capability_aliases"]["official_issue_create"] is False
    assert policy_mobile["user_mobile_chat_first_governance"]["self_review_allowed"] is True
    assert policy_mobile["user_mobile_chat_first_governance"]["separate_mesa_required"] is False
    assert policy_mobile["user_mobile_chat_first_governance"]["official_issue_allowed"] is False

    csrf_inspetor = _login_app_inspetor(client, str(contexto["inspetor_email"]))
    resposta_iniciar = client.post(
        "/app/api/laudo/iniciar",
        headers={"X-CSRF-Token": csrf_inspetor},
        data={"tipo_template": "padrao"},
    )
    assert resposta_iniciar.status_code == 200
    laudo_id = int(resposta_iniciar.json()["laudo_id"])

    with SessionLocal() as banco:
        _preparar_laudo_simples_para_finalizacao(
            banco,
            laudo_id=laudo_id,
            inspetor_id=int(contexto["inspetor_id"]),
        )

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
        assert laudo.usuario_id == int(contexto["inspetor_id"])
        laudo.nome_arquivo_pdf = "laudo_operacional_empresa_sem_mesa.pdf"
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
        assert (
            banco.scalar(
                select(EmissaoOficialLaudo).where(EmissaoOficialLaudo.laudo_id == laudo_id)
            )
            is None
        )
        banco.commit()

    _login_cliente(client, str(contexto["admin_email"]))
    resposta_bootstrap_final = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap_final.status_code == 200
    bootstrap_final = resposta_bootstrap_final.json()
    overview_final = bootstrap_final["tenant_commercial_overview"]
    assert overview_final["operators_in_use"] == 2
    assert overview_final["mesa_contracted"] is False
    assert overview_final["official_issue_included"] is False
    assert "Aprovação interna contratada" in overview_final["active_summary"]
    assert "Sem emissão oficial contratada" in overview_final["active_summary"]

    documento = _buscar_item_por_laudo_id(bootstrap_final["documentos"]["items"], laudo_id)
    assert documento["pdf_file_name"] == "laudo_operacional_empresa_sem_mesa.pdf"
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

    _login_app_inspetor(client, "inspetor-sem-mesa-g2@empresa.test")
    resposta_preview_inspetor_errado = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")
    assert resposta_preview_inspetor_errado.status_code == 403
    assert "inspetor autenticado" in resposta_preview_inspetor_errado.json()["detail"]


def test_empresa_sem_mesa_multiusuario_nao_converte_nr35_em_self_review(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]

    with SessionLocal() as banco:
        contexto = _criar_empresa_sem_mesa_multiusuario_base(banco, sufixo="g3")
        laudo_id = _criar_laudo_nr35_rascunho(
            banco,
            empresa_id=int(contexto["empresa_id"]),
            inspetor_id=int(contexto["inspetor_id"]),
        )

    csrf_inspetor = _login_app_inspetor(client, str(contexto["inspetor_email"]))
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

    _login_cliente(client, str(contexto["admin_email"]))
    resposta_bootstrap = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap.status_code == 200
    overview = resposta_bootstrap.json()["tenant_commercial_overview"]
    assert overview["resource_summary"]["self_review_allowed"] is True
    assert overview["resource_summary"]["separate_mesa_available"] is False
    assert overview["resource_summary"]["official_issue_allowed"] is False
    assert overview["mesa_contracted"] is False
    assert overview["official_issue_included"] is False
