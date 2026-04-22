from __future__ import annotations

from typing import Any


def registrar_novo_cliente(
    db,
    *,
    nome: str,
    cnpj: str,
    email_admin: str,
    plano: str,
    segmento: str = "",
    cidade_estado: str = "",
    nome_responsavel: str = "",
    observacoes: str = "",
    admin_cliente_case_visibility_mode: str = "",
    admin_cliente_case_action_mode: str = "",
    admin_cliente_operating_model: str = "",
    admin_cliente_mobile_web_inspector_enabled: str | bool = "",
    admin_cliente_mobile_web_review_enabled: str | bool = "",
    admin_cliente_operational_user_cross_portal_enabled: str | bool = "",
    admin_cliente_operational_user_admin_portal_enabled: str | bool = "",
    provisionar_inspetor_inicial: str | bool = "",
    inspetor_nome: str = "",
    inspetor_email: str = "",
    inspetor_telefone: str = "",
    provisionar_revisor_inicial: str | bool = "",
    revisor_nome: str = "",
    revisor_email: str = "",
    revisor_telefone: str = "",
    revisor_crea: str = "",
    dependencies: dict[str, Any],
) -> tuple[Any, str, str | None]:
    observe_backend_hotspot = dependencies["observe_backend_hotspot"]
    logger = dependencies["logger"]
    select = dependencies["select"]
    IntegrityError = dependencies["IntegrityError"]
    Empresa = dependencies["Empresa"]
    Usuario = dependencies["Usuario"]
    NivelAcesso = dependencies["NivelAcesso"]
    normalizar_texto_curto = dependencies["normalizar_texto_curto"]
    normalizar_cnpj = dependencies["normalizar_cnpj"]
    normalizar_email = dependencies["normalizar_email"]
    normalizar_plano = dependencies["normalizar_plano"]
    normalizar_texto_opcional = dependencies["normalizar_texto_opcional"]
    normalizar_politica_admin_cliente_empresa = dependencies["normalizar_politica_admin_cliente_empresa"]
    gerar_senha_fortificada = dependencies["gerar_senha_fortificada"]
    criar_hash_senha = dependencies["criar_hash_senha"]
    tenant_admin_default_admin_cliente_portal_grants = dependencies[
        "tenant_admin_default_admin_cliente_portal_grants"
    ]
    criar_usuario_empresa = dependencies["criar_usuario_empresa"]
    commit_ou_rollback_integridade = dependencies["commit_ou_rollback_integridade"]
    disparar_email_boas_vindas = dependencies["disparar_email_boas_vindas"]

    def _flag_ligada(valor: Any) -> bool:
        if isinstance(valor, bool):
            return valor
        return str(valor or "").strip().lower() in {"1", "true", "on", "sim", "yes"}

    def _nome_padrao_operacional(tipo: str, empresa_nome: str) -> str:
        if tipo == "revisor":
            return f"Equipe de analise {empresa_nome}"
        return f"Equipe de campo {empresa_nome}"

    def _serializar_credencial_onboarding_operacional(usuario: Any, *, senha: str) -> dict[str, Any]:
        papel = "Equipe de analise" if int(usuario.nivel_acesso) == int(NivelAcesso.REVISOR) else "Equipe de campo"
        return {
            "usuario_id": int(usuario.id),
            "usuario_nome": str(
                getattr(usuario, "nome", None)
                or getattr(usuario, "nome_completo", None)
                or f"Usuário #{usuario.id}"
            ),
            "papel": papel,
            "login": str(usuario.email or ""),
            "senha": str(senha or ""),
            "allowed_portals": list(getattr(usuario, "allowed_portals", ())),
        }

    with observe_backend_hotspot(
        "admin_tenant_onboarding",
        surface="admin_ceo",
        route_path="service:registrar_novo_cliente",
        method="SERVICE",
        detail={
            "provision_inspetor": bool(provisionar_inspetor_inicial),
            "provision_revisor": bool(provisionar_revisor_inicial),
        },
    ) as hotspot:
        nome_norm = normalizar_texto_curto(nome, campo="Nome da empresa", max_len=200)
        cnpj_norm = normalizar_cnpj(cnpj)
        email_norm = normalizar_email(email_admin)
        plano_norm = normalizar_plano(plano)

        if db.scalar(select(Empresa).where(Empresa.cnpj == cnpj_norm)):
            raise ValueError("CNPJ já cadastrado no sistema.")

        if db.scalar(select(Usuario).where(Usuario.email == email_norm)):
            raise ValueError("E-mail já em uso.")

        nova_empresa = Empresa(
            nome_fantasia=nome_norm,
            cnpj=cnpj_norm,
            plano_ativo=plano_norm,
            escopo_plataforma=False,
            admin_cliente_policy_json=normalizar_politica_admin_cliente_empresa(
                case_visibility_mode=admin_cliente_case_visibility_mode,
                case_action_mode=admin_cliente_case_action_mode,
                operating_model=admin_cliente_operating_model,
                mobile_web_inspector_enabled=admin_cliente_mobile_web_inspector_enabled,
                mobile_web_review_enabled=admin_cliente_mobile_web_review_enabled,
                operational_user_cross_portal_enabled=admin_cliente_operational_user_cross_portal_enabled,
                operational_user_admin_portal_enabled=admin_cliente_operational_user_admin_portal_enabled,
            ),
            segmento=normalizar_texto_opcional(segmento, 100),
            cidade_estado=normalizar_texto_opcional(cidade_estado, 100),
            nome_responsavel=normalizar_texto_opcional(nome_responsavel, 150),
            observacoes=normalizar_texto_opcional(observacoes),
        )
        db.add(nova_empresa)

        try:
            db.flush()
        except IntegrityError as erro:
            db.rollback()
            logger.warning(
                "Falha ao criar empresa no onboarding | nome=%s cnpj=%s erro=%s",
                nome_norm,
                cnpj_norm,
                erro,
            )
            raise ValueError("Falha ao reservar registro da empresa.") from erro

        hotspot.tenant_id = int(getattr(nova_empresa, "id", 0) or 0) or None
        senha_plana = gerar_senha_fortificada()

        usuario_admin = Usuario(
            empresa_id=nova_empresa.id,
            nome_completo=f"Administrador {nome_norm}",
            email=email_norm,
            senha_hash=criar_hash_senha(senha_plana),
            nivel_acesso=int(NivelAcesso.ADMIN_CLIENTE),
            ativo=True,
            senha_temporaria_ativa=True,
            allowed_portals_json=tenant_admin_default_admin_cliente_portal_grants(
                nova_empresa.admin_cliente_policy_json
            ),
        )
        db.add(usuario_admin)

        credenciais_operacionais_onboarding: list[dict[str, Any]] = []
        provisionamentos_operacionais: tuple[dict[str, Any], ...] = (
            {
                "habilitado": _flag_ligada(provisionar_inspetor_inicial),
                "nome": inspetor_nome,
                "email": inspetor_email,
                "telefone": inspetor_telefone,
                "crea": "",
                "nivel": NivelAcesso.INSPETOR,
                "tipo": "inspetor",
            },
            {
                "habilitado": _flag_ligada(provisionar_revisor_inicial),
                "nome": revisor_nome,
                "email": revisor_email,
                "telefone": revisor_telefone,
                "crea": revisor_crea,
                "nivel": NivelAcesso.REVISOR,
                "tipo": "revisor",
            },
        )
        provisionados: list[str] = ["admin_cliente"]
        for provisionamento in provisionamentos_operacionais:
            if not provisionamento["habilitado"]:
                continue

            email_operacional = normalizar_email(str(provisionamento["email"] or ""))
            if not email_operacional:
                papel = "equipe de analise" if provisionamento["tipo"] == "revisor" else "equipe de campo"
                raise ValueError(f"Informe o e-mail da {papel} inicial.")

            nome_operacional = normalizar_texto_curto(
                str(provisionamento["nome"] or _nome_padrao_operacional(provisionamento["tipo"], nome_norm)),
                campo="Nome do usuário",
                max_len=150,
            )
            usuario_operacional, senha_operacional = criar_usuario_empresa(
                db,
                empresa_id=int(nova_empresa.id),
                nome=nome_operacional,
                email=email_operacional,
                nivel_acesso=provisionamento["nivel"],
                telefone=str(provisionamento["telefone"] or ""),
                crea=str(provisionamento["crea"] or ""),
            )
            credenciais_operacionais_onboarding.append(
                _serializar_credencial_onboarding_operacional(
                    usuario_operacional,
                    senha=senha_operacional,
                )
            )
            provisionados.append(str(provisionamento["tipo"]))

        commit_ou_rollback_integridade(
            db,
            logger_operacao=logger,
            mensagem_erro="Falha de integridade ao concluir o cadastro. Verifique CNPJ e e-mail.",
        )

        db.refresh(nova_empresa)
        setattr(
            nova_empresa,
            "_onboarding_operational_credentials",
            credenciais_operacionais_onboarding,
        )

        aviso_boas_vindas: str | None = None
        try:
            aviso_boas_vindas = disparar_email_boas_vindas(email_norm, nome_norm, senha_plana)
        except RuntimeError as erro:
            aviso_boas_vindas = str(erro).strip() or None
            logger.error(
                "Falha ao enviar e-mail de boas-vindas | empresa=%s email=%s erro=%s",
                nome_norm,
                email_norm,
                erro,
                exc_info=True,
            )

        hotspot.outcome = "tenant_created"
        hotspot.response_status_code = 200
        hotspot.detail.update(
            {
                "plan": plano_norm,
                "provisioned_roles": provisionados,
                "welcome_notice_present": bool(aviso_boas_vindas),
            }
        )
        return nova_empresa, senha_plana, aviso_boas_vindas
