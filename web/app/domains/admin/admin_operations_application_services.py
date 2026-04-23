from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domains.admin.admin_client_detail_services import (
    buscar_detalhe_cliente as _admin_client_detail_buscar_detalhe_cliente,
)
from app.domains.admin.admin_dashboard_services import (
    buscar_metricas_ia_painel as _admin_dashboard_buscar_metricas_ia_painel,
)
from app.domains.admin.admin_presentation_services import (
    resumir_primeiro_acesso_empresa as _admin_presentation_first_access_summary,
    serializar_usuario_admin as _admin_presentation_user_serializer,
)
from app.domains.admin.admin_welcome_notification_services import (
    aviso_notificacao_boas_vindas as _admin_welcome_notice_message,
)
from app.domains.admin.tenant_onboarding_services import (
    registrar_novo_cliente as _tenant_onboarding_registrar_novo_cliente,
)
from app.domains.admin.tenant_user_services import criar_usuario_empresa
from app.shared.database import Empresa, Laudo, NivelAcesso, Usuario
from app.shared.security import criar_hash_senha
from app.shared.tenant_admin_policy import (
    summarize_tenant_admin_policy,
    tenant_admin_default_admin_cliente_portal_grants,
)


def _serializar_usuario_admin(usuario, *, sessoes_usuario: list[Any]) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_presentation_user_serializer(
        usuario,
        sessoes_usuario=sessoes_usuario,
        max_datetime_admin=admin_services._max_datetime_admin,
        normalizar_datetime_admin=admin_services._normalizar_datetime_admin,
        role_label=admin_services._role_label,
        formatar_data_admin=admin_services._formatar_data_admin,
    )


def _resumir_primeiro_acesso_empresa(
    *,
    empresa,
    admins_cliente: list[dict[str, Any]],
) -> dict[str, Any]:
    return _admin_presentation_first_access_summary(
        empresa=empresa,
        admins_cliente=admins_cliente,
    )


def _aviso_notificacao_boas_vindas() -> str:
    return _admin_welcome_notice_message()


def _disparar_email_boas_vindas(email: str, empresa: str, senha: str) -> str | None:
    from app.domains.admin import services as admin_services

    return admin_services._disparar_email_boas_vindas(email, empresa, senha)


def registrar_novo_cliente(
    db: Session,
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
) -> tuple[Empresa, str, str | None]:
    from app.domains.admin import services as admin_services

    return _tenant_onboarding_registrar_novo_cliente(
        db,
        nome=nome,
        cnpj=cnpj,
        email_admin=email_admin,
        plano=plano,
        segmento=segmento,
        cidade_estado=cidade_estado,
        nome_responsavel=nome_responsavel,
        observacoes=observacoes,
        admin_cliente_case_visibility_mode=admin_cliente_case_visibility_mode,
        admin_cliente_case_action_mode=admin_cliente_case_action_mode,
        admin_cliente_operating_model=admin_cliente_operating_model,
        admin_cliente_mobile_web_inspector_enabled=admin_cliente_mobile_web_inspector_enabled,
        admin_cliente_mobile_web_review_enabled=admin_cliente_mobile_web_review_enabled,
        admin_cliente_operational_user_cross_portal_enabled=admin_cliente_operational_user_cross_portal_enabled,
        admin_cliente_operational_user_admin_portal_enabled=admin_cliente_operational_user_admin_portal_enabled,
        provisionar_inspetor_inicial=provisionar_inspetor_inicial,
        inspetor_nome=inspetor_nome,
        inspetor_email=inspetor_email,
        inspetor_telefone=inspetor_telefone,
        provisionar_revisor_inicial=provisionar_revisor_inicial,
        revisor_nome=revisor_nome,
        revisor_email=revisor_email,
        revisor_telefone=revisor_telefone,
        revisor_crea=revisor_crea,
        dependencies={
            "observe_backend_hotspot": admin_services.observe_backend_hotspot,
            "logger": admin_services.logger,
            "select": select,
            "IntegrityError": IntegrityError,
            "Empresa": Empresa,
            "Usuario": Usuario,
            "NivelAcesso": NivelAcesso,
            "normalizar_texto_curto": admin_services._normalizar_texto_curto,
            "normalizar_cnpj": admin_services._normalizar_cnpj,
            "normalizar_email": admin_services._normalizar_email,
            "normalizar_plano": admin_services._normalizar_plano,
            "normalizar_texto_opcional": admin_services._normalizar_texto_opcional,
            "normalizar_politica_admin_cliente_empresa": admin_services._normalizar_politica_admin_cliente_empresa,
            "gerar_senha_fortificada": admin_services.gerar_senha_fortificada,
            "criar_hash_senha": criar_hash_senha,
            "tenant_admin_default_admin_cliente_portal_grants": tenant_admin_default_admin_cliente_portal_grants,
            "criar_usuario_empresa": criar_usuario_empresa,
            "commit_ou_rollback_integridade": admin_services.commit_ou_rollback_integridade,
            "disparar_email_boas_vindas": _disparar_email_boas_vindas,
        },
    )


def buscar_metricas_ia_painel(db: Session) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_dashboard_buscar_metricas_ia_painel(
        db,
        dependencies={
            "select": select,
            "func": func,
            "Empresa": Empresa,
            "Laudo": Laudo,
            "tenant_cliente_clause": admin_services._tenant_cliente_clause,
            "case_prioridade_plano": admin_services._case_prioridade_plano,
            "listar_catalogo_familias": admin_services.listar_catalogo_familias,
            "serializar_familia_catalogo_row": admin_services._serializar_familia_catalogo_row,
            "build_catalog_governance_rollup": admin_services._build_catalog_governance_rollup,
            "build_commercial_scale_rollup": admin_services._build_commercial_scale_rollup,
            "build_calibration_queue_rollup": admin_services._build_calibration_queue_rollup,
            "agora_utc": admin_services._agora_utc,
        },
    )


def buscar_detalhe_cliente(db: Session, empresa_id: int) -> dict[str, Any] | None:
    from app.domains.admin import services as admin_services

    return _admin_client_detail_buscar_detalhe_cliente(
        db,
        empresa_id,
        dependencies={
            "tenant_client_read_services": admin_services._tenant_client_read_services,
            "portfolio_summary_fn": admin_services.resumir_portfolio_catalogo_empresa,
            "tenant_admin_policy_summary_fn": summarize_tenant_admin_policy,
            "user_serializer": _serializar_usuario_admin,
            "first_access_summary_fn": _resumir_primeiro_acesso_empresa,
            "signatory_serializer": admin_services._serializar_signatario_governado_admin,
        },
    )


__all__ = [
    "buscar_detalhe_cliente",
    "buscar_metricas_ia_painel",
    "registrar_novo_cliente",
]
