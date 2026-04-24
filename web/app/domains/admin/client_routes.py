"""Sub-roteador de onboarding e gestao SaaS do portal admin."""

from __future__ import annotations

import logging
from typing import Any, Callable, Optional, TypeVar

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import (
    listar_auditoria_admin_empresa,
    serializar_registro_auditoria_admin,
)
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _normalizar_plano,
    _normalizar_texto,
    _redirect_err,
    _redirect_login,
    _redirect_step_up_admin,
    _render_template,
    _sessao_admin_reauth_expirada,
    _verificar_acesso_admin,
)
from app.domains.admin.client_catalog_form_routes import (
    registrar_rotas_formularios_catalogo_cliente,
)
from app.domains.admin.client_catalog_import_routes import (
    registrar_rotas_importacao_catalogo_cliente,
)
from app.domains.admin.client_catalog_lifecycle_routes import (
    registrar_rotas_catalogo_lifecycle_cliente,
)
from app.domains.admin.client_catalog_view_routes import (
    registrar_rotas_visualizacao_catalogo_cliente,
)
from app.domains.admin.client_diagnostic_routes import registrar_rotas_diagnostico_cliente
from app.domains.admin.client_employee_routes import registrar_rotas_funcionarios_cliente
from app.domains.admin.client_onboarding_routes import registrar_rotas_onboarding_cliente
from app.domains.admin.client_surface_policy_routes import (
    registrar_rotas_politica_superficies_cliente,
)
from app.domains.admin.client_support_routes import registrar_rotas_suporte_excepcional_cliente
from app.domains.admin.client_tenant_catalog_routes import registrar_rotas_catalogo_tenant_cliente
from app.domains.admin.client_tenant_sensitive_routes import (
    registrar_rotas_operacoes_sensiveis_tenant,
)
from app.domains.admin.services import (
    buscar_detalhe_cliente,
    buscar_todos_clientes,
    get_support_exceptional_policy_snapshot,
    get_tenant_exceptional_support_state,
    registrar_novo_cliente,
)
from app.domains.cliente.auditoria import listar_auditoria_empresa, serializar_registro_auditoria
from app.shared.database import Empresa, Usuario, obter_banco
from app.shared.security import obter_usuario_html
from app.shared.tenant_admin_policy import summarize_tenant_admin_policy

logger = logging.getLogger("tariel.admin")

roteador_admin_clientes = APIRouter()
_T = TypeVar("_T")


def _exigir_step_up_admin_ou_redirect(request: Request, *, return_to: str, mensagem: str) -> RedirectResponse | None:
    if not _sessao_admin_reauth_expirada(request):
        return None
    return _redirect_step_up_admin(request, return_to=return_to, mensagem=mensagem)


def _contexto_log_admin(**contexto: Any) -> dict[str, Any]:
    return {chave: valor for chave, valor in contexto.items() if valor is not None}


def _executar_leitura_admin(
    *,
    fallback: _T,
    mensagem_log: str,
    operacao: Callable[[], _T],
    **contexto: Any,
) -> _T:
    try:
        return operacao()
    except Exception:
        logger.exception(mensagem_log, extra=_contexto_log_admin(**contexto))
        return fallback


def _executar_acao_admin_redirect(
    *,
    url_erro: str,
    mensagem_log: str,
    operacao: Callable[[], RedirectResponse],
    mensagem_erro_usuario: str = "Erro interno. Tente novamente.",
    **contexto: Any,
) -> RedirectResponse:
    try:
        return operacao()
    except ValueError as erro:
        return _redirect_err(url_erro, str(erro))
    except Exception:
        logger.exception(mensagem_log, extra=_contexto_log_admin(**contexto))
        return _redirect_err(url_erro, mensagem_erro_usuario)


def _empresa_cliente_existe_no_banco(banco: Session, empresa_id: int) -> bool:
    empresa = banco.get(Empresa, int(empresa_id))
    return empresa is not None and not bool(getattr(empresa, "escopo_plataforma", False))


def _tenant_admin_visibility_policy_snapshot(
    banco: Session,
    *,
    empresa: Empresa | None = None,
) -> dict[str, Any]:
    support_policy = get_support_exceptional_policy_snapshot(banco)
    tenant_admin_policy = summarize_tenant_admin_policy(
        getattr(empresa, "admin_cliente_policy_json", None)
    )
    return {
        "management_projection_authoritative": True,
        "technical_access_mode": "surface_scoped_operational",
        "per_case_visibility_configurable": True,
        "per_case_action_configurable": True,
        "per_case_governance_owner": "admin_ceo_contract_setup",
        "commercial_operating_model": str(tenant_admin_policy["operating_model"]),
        "mobile_primary": bool(tenant_admin_policy["mobile_primary"]),
        "contract_operational_user_limit": tenant_admin_policy["contract_operational_user_limit"],
        "shared_mobile_operator_enabled": bool(
            tenant_admin_policy["shared_mobile_operator_enabled"]
        ),
        "shared_mobile_operator_web_inspector_enabled": bool(
            tenant_admin_policy["shared_mobile_operator_web_inspector_enabled"]
        ),
        "shared_mobile_operator_web_review_enabled": bool(
            tenant_admin_policy["shared_mobile_operator_web_review_enabled"]
        ),
        "shared_mobile_operator_surface_set": list(
            tenant_admin_policy["shared_mobile_operator_surface_set"]
        ),
        "operational_user_cross_portal_enabled": bool(
            tenant_admin_policy["operational_user_cross_portal_enabled"]
        ),
        "operational_user_admin_portal_enabled": bool(
            tenant_admin_policy["operational_user_admin_portal_enabled"]
        ),
        "tenant_assignable_portal_set": list(
            tenant_admin_policy["tenant_assignable_portal_set"]
        ),
        "commercial_package_scope": str(
            tenant_admin_policy["commercial_package_scope"]
        ),
        "commercial_capability_axes": list(
            tenant_admin_policy["commercial_capability_axes"]
        ),
        "cross_surface_session_strategy": str(
            tenant_admin_policy["cross_surface_session_strategy"]
        ),
        "cross_surface_session_unified": bool(
            tenant_admin_policy["cross_surface_session_unified"]
        ),
        "cross_surface_session_note": str(
            tenant_admin_policy["cross_surface_session_note"]
        ),
        "admin_client_case_visibility_mode": str(tenant_admin_policy["case_visibility_mode"]),
        "admin_client_case_action_mode": str(tenant_admin_policy["case_action_mode"]),
        "case_list_visible": bool(tenant_admin_policy["case_list_visible"]),
        "case_actions_enabled": bool(tenant_admin_policy["case_actions_enabled"]),
        "raw_evidence_access": "not_granted_by_projection",
        "issued_document_access": "tenant_scope_only",
        "exceptional_support_access": str(support_policy["mode"]),
        "exceptional_support_scope_level": str(support_policy["scope_level"]),
        "support_exceptional_protocol": str(
            tenant_admin_policy["support_exceptional_protocol"]
        ),
        "exceptional_support_step_up_required": bool(support_policy["step_up_required"]),
        "exceptional_support_approval_required": bool(support_policy["approval_required"]),
        "exceptional_support_justification_required": bool(support_policy["justification_required"]),
        "exceptional_support_max_duration_minutes": int(support_policy["max_duration_minutes"]),
        "tenant_retention_policy_owner": str(
            tenant_admin_policy["tenant_retention_policy_owner"]
        ),
        "technical_case_retention_min_days": int(
            tenant_admin_policy["technical_case_retention_min_days"]
        ),
        "issued_document_retention_min_days": int(
            tenant_admin_policy["issued_document_retention_min_days"]
        ),
        "audit_retention_min_days": int(
            tenant_admin_policy["audit_retention_min_days"]
        ),
        "human_signoff_required": bool(
            tenant_admin_policy["human_signoff_required"]
        ),
        "ai_assistance_audit_required": bool(
            tenant_admin_policy["ai_assistance_audit_required"]
        ),
        "human_override_justification_required": bool(
            tenant_admin_policy["human_override_justification_required"]
        ),
        "consent_collection_mode": str(
            tenant_admin_policy["consent_collection_mode"]
        ),
        "mandatory_audit_fields": list(
            tenant_admin_policy["mandatory_audit_fields"]
        ),
        "audit_scope": "tenant_operational_timeline",
        "audit_categories_visible": ["access", "commercial", "team", "support", "chat", "mesa"],
    }


@roteador_admin_clientes.get("/clientes", response_class=HTMLResponse)
async def lista_clientes(
    request: Request,
    nome: str = "",
    codigo: str = "",
    plano: str = "",
    status: str = "",
    saude: str = "",
    atividade: str = "",
    ordenar: str = "nome",
    direcao: str = "asc",
    pagina: int = 1,
    por_pagina: int = 20,
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    nome = _normalizar_texto(nome, max_len=120)
    codigo = _normalizar_texto(codigo, max_len=40)
    plano = _normalizar_plano(plano) if plano else ""
    status = str(status or "").strip().lower()
    saude = str(saude or "").strip().lower()
    atividade = str(atividade or "").strip().lower()
    ordenar = str(ordenar or "").strip().lower()
    direcao = str(direcao or "").strip().lower()

    painel_clientes: dict[str, Any] = _executar_leitura_admin(
        fallback={"itens": [], "totais": {}, "pagination": {}, "filtros": {}},
        mensagem_log="Falha ao buscar lista de clientes",
        admin_id=usuario.id if usuario else None,
        operacao=lambda: buscar_todos_clientes(
            banco,
            filtro_nome=nome,
            filtro_codigo=codigo,
            filtro_plano=plano,
            filtro_status=status,
            filtro_saude=saude,
            filtro_atividade=atividade,
            ordenar_por=ordenar,
            direcao=direcao,
            pagina=pagina,
            por_pagina=por_pagina,
        ),
    )

    return _render_template(
        request,
        "admin/clientes.html",
        {
            "usuario": usuario,
            "clientes": painel_clientes.get("itens") or [],
            "totais_listagem": painel_clientes.get("totais") or {},
            "pagination": painel_clientes.get("pagination") or {},
            "filtros_listagem": painel_clientes.get("filtros") or {},
            "filtro_nome": nome,
            "filtro_codigo": codigo,
            "filtro_plano": plano,
            "filtro_status": status,
            "filtro_saude": saude,
            "filtro_atividade": atividade,
            "ordenar": ordenar,
            "direcao": direcao,
            "por_pagina": por_pagina,
            "total_ativos": int((painel_clientes.get("totais") or {}).get("ativos", 0)),
            "total_bloqueios": int((painel_clientes.get("totais") or {}).get("bloqueados", 0)),
            "total_alerta": int((painel_clientes.get("totais") or {}).get("alerta", 0)),
            "total_pendentes": int((painel_clientes.get("totais") or {}).get("pendentes", 0)),
            "total_sem_atividade": int((painel_clientes.get("totais") or {}).get("sem_atividade", 0)),
        },
    )


@roteador_admin_clientes.get("/clientes/{empresa_id}", response_class=HTMLResponse)
async def detalhe_cliente(
    request: Request,
    empresa_id: int,
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    dados = _executar_leitura_admin(
        fallback=None,
        mensagem_log="Falha ao buscar detalhe do cliente",
        empresa_id=empresa_id,
        admin_id=usuario.id if usuario else None,
        operacao=lambda: buscar_detalhe_cliente(banco, empresa_id),
    )

    if not dados:
        mensagem = (
            "Não foi possível carregar os detalhes da empresa."
            if _empresa_cliente_existe_no_banco(banco, empresa_id)
            else "Empresa não encontrada."
        )
        return _redirect_err(URL_CLIENTES, mensagem)

    auditoria_admin = [
        serializar_registro_auditoria_admin(item)
        for item in listar_auditoria_admin_empresa(
            banco,
            empresa_id=empresa_id,
            limite=12,
        )
    ]
    auditoria_cliente = [
        serializar_registro_auditoria(item)
        for item in listar_auditoria_empresa(
            banco,
            empresa_id=empresa_id,
            limite=12,
        )
    ]
    suporte_excepcional = get_tenant_exceptional_support_state(banco, empresa_id=empresa_id)

    return _render_template(
        request,
        "admin/cliente_detalhe.html",
        {
            "usuario": usuario,
            "auditoria_admin": auditoria_admin,
            "auditoria_cliente": auditoria_cliente,
            "suporte_excepcional": suporte_excepcional,
            "visibility_policy": _tenant_admin_visibility_policy_snapshot(
                banco,
                empresa=dados.get("empresa") if isinstance(dados, dict) else None,
            ),
            **dados,
        },
    )


registrar_rotas_funcionarios_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect=_exigir_step_up_admin_ou_redirect,
)
registrar_rotas_onboarding_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
)
registrar_rotas_visualizacao_catalogo_cliente(
    roteador_admin_clientes,
    executar_leitura_admin=_executar_leitura_admin,
)
registrar_rotas_formularios_catalogo_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
)
registrar_rotas_importacao_catalogo_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
)
registrar_rotas_catalogo_lifecycle_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
)
registrar_rotas_catalogo_tenant_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
)
registrar_rotas_politica_superficies_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
)
registrar_rotas_diagnostico_cliente(
    roteador_admin_clientes,
    exigir_step_up_admin_ou_redirect=_exigir_step_up_admin_ou_redirect,
    empresa_cliente_existe_no_banco=_empresa_cliente_existe_no_banco,
    tenant_admin_visibility_policy_snapshot=_tenant_admin_visibility_policy_snapshot,
)
registrar_rotas_operacoes_sensiveis_tenant(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect=_exigir_step_up_admin_ou_redirect,
)
registrar_rotas_suporte_excepcional_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect=_exigir_step_up_admin_ou_redirect,
)


__all__ = ["registrar_novo_cliente", "roteador_admin_clientes"]
