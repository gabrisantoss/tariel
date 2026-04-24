"""Sub-roteador de onboarding e gestao SaaS do portal admin."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any, Callable, Optional, TypeVar

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import (
    listar_auditoria_admin_empresa,
    registrar_auditoria_admin_empresa_segura,
    serializar_registro_auditoria_admin,
)
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    URL_NOVO_CLIENTE,
    URL_PAINEL,
    _consumir_flash,
    _flash_primeiro_acesso_empresa,
    _normalizar_email,
    _normalizar_plano,
    _normalizar_texto,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _redirect_step_up_admin,
    _render_template,
    _sessao_admin_reauth_expirada,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.client_surface_policy import (
    AdminClienteSurfacePolicyForm,
    atualizar_politica_admin_cliente_por_superficie,
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
from app.domains.admin.client_employee_routes import registrar_rotas_funcionarios_cliente
from app.domains.admin.client_support_routes import registrar_rotas_suporte_excepcional_cliente
from app.domains.admin.client_tenant_catalog_routes import registrar_rotas_catalogo_tenant_cliente
from app.domains.admin.services import (
    alternar_bloqueio,
    alterar_plano,
    buscar_detalhe_cliente,
    buscar_todos_clientes,
    get_platform_default_new_tenant_plan,
    get_support_exceptional_policy_snapshot,
    get_tenant_exceptional_support_state,
    registrar_novo_cliente,
)
from app.domains.cliente.auditoria import listar_auditoria_empresa, serializar_registro_auditoria
from app.shared.backend_hotspot_metrics import observe_backend_hotspot
from app.shared.database import Empresa, Usuario, obter_banco
from app.shared.security import obter_usuario_html
from app.shared.tenant_admin_policy import summarize_tenant_admin_policy, tenant_admin_user_portal_label
from app.v2.contracts.envelopes import utc_now

logger = logging.getLogger("tariel.admin")

roteador_admin_clientes = APIRouter()
_T = TypeVar("_T")
URL_LOGIN_CLIENTE_PORTAL = "/cliente/login"
URL_LOGIN_INSPETOR_PORTAL = "/app/login"
URL_LOGIN_REVISOR_PORTAL = "/revisao/login"
_CHAVE_ONBOARDING_EMPRESA = "_admin_company_onboarding_bundle"
_PORTAL_LOGIN_URLS = {
    "cliente": URL_LOGIN_CLIENTE_PORTAL,
    "inspetor": URL_LOGIN_INSPETOR_PORTAL,
    "revisor": URL_LOGIN_REVISOR_PORTAL,
}

def _dict_payload(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _flag_ligada(valor: Any) -> bool:
    if isinstance(valor, bool):
        return valor
    return str(valor or "").strip().lower() in {"1", "true", "on", "sim", "yes"}


def _montar_portais_onboarding(portais: list[str] | tuple[str, ...] | None) -> list[dict[str, str]]:
    itens: list[dict[str, str]] = []
    for portal in list(portais or []):
        portal_norm = str(portal or "").strip().lower()
        login_url = _PORTAL_LOGIN_URLS.get(portal_norm)
        if not login_url:
            continue
        itens.append(
            {
                "portal": portal_norm,
                "label": tenant_admin_user_portal_label(portal_norm),
                "login_url": login_url,
            }
        )
    return itens


def _credencial_onboarding_admin_empresa(
    *,
    empresa: Empresa,
    login: str,
    senha: str,
) -> dict[str, Any]:
    return {
        "referencia": "Administrador da empresa",
        "usuario_nome": f"Responsavel {empresa.nome_fantasia}",
        "papel": "Administrador da empresa",
        "login": str(login or ""),
        "senha": str(senha or ""),
        "orientacao": "Use o login do portal da empresa e troque a senha temporaria no primeiro acesso.",
        "portais": _montar_portais_onboarding(["cliente"]),
    }


def _normalizar_credencial_onboarding_admin(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    referencia = _normalizar_texto(str(payload.get("referencia", "")), max_len=180)
    usuario_nome = _normalizar_texto(str(payload.get("usuario_nome", "")), max_len=180)
    papel = _normalizar_texto(str(payload.get("papel", "")), max_len=120)
    login = _normalizar_texto(str(payload.get("login", "")), max_len=254)
    senha = _normalizar_texto(str(payload.get("senha", "")), max_len=180)
    orientacao = _normalizar_texto(str(payload.get("orientacao", "")), max_len=260)

    portais_brutos = payload.get("portais")
    portais: list[dict[str, str]] = []
    if isinstance(portais_brutos, list):
        for item in portais_brutos:
            if not isinstance(item, dict):
                continue
            portal = _normalizar_texto(str(item.get("portal", "")), max_len=40).lower()
            label = _normalizar_texto(str(item.get("label", "")), max_len=120)
            login_url = _normalizar_texto(str(item.get("login_url", "")), max_len=240)
            if not portal or not login_url:
                continue
            portais.append(
                {
                    "portal": portal,
                    "label": label or tenant_admin_user_portal_label(portal),
                    "login_url": login_url,
                }
            )

    if not login or not senha:
        return None
    if not portais:
        allowed_portals = payload.get("allowed_portals")
        if isinstance(allowed_portals, (list, tuple)):
            portais = _montar_portais_onboarding(
                [str(portal or "").strip().lower() for portal in allowed_portals]
            )
    if not portais:
        portais = _montar_portais_onboarding(["cliente"])

    papel_resolvido = papel or "Acesso inicial"
    orientacao_padrao = (
        "Use o login abaixo no portal indicado. "
        "No primeiro acesso, o usuario precisa trocar a senha temporaria antes de continuar."
    )
    if len(portais) == 1 and portais[0].get("portal") == "cliente":
        orientacao_padrao = "Use o login do portal da empresa e troque a senha temporaria no primeiro acesso."

    return {
        "referencia": referencia or papel_resolvido,
        "usuario_nome": usuario_nome or login,
        "papel": papel_resolvido,
        "login": login,
        "senha": senha,
        "orientacao": orientacao or orientacao_padrao,
        "portais": portais,
    }


def _armazenar_bundle_onboarding_empresa(
    request: Request,
    *,
    empresa_id: int,
    empresa_nome: str,
    credenciais: list[dict[str, Any]],
) -> None:
    credenciais_norm = [
        item
        for item in (
            _normalizar_credencial_onboarding_admin(credencial)
            for credencial in list(credenciais or [])
        )
        if item is not None
    ]
    if not credenciais_norm:
        request.session.pop(_CHAVE_ONBOARDING_EMPRESA, None)
        return

    fila = request.session.get(_CHAVE_ONBOARDING_EMPRESA, {})
    if not isinstance(fila, dict):
        fila = {}

    fila[str(int(empresa_id))] = {
        "empresa_nome": _normalizar_texto(empresa_nome, max_len=200),
        "credenciais": credenciais_norm,
    }
    while len(fila) > 8:
        primeira = next(iter(fila))
        fila.pop(primeira, None)
    request.session[_CHAVE_ONBOARDING_EMPRESA] = fila


def _consumir_bundle_onboarding_empresa(
    request: Request,
    *,
    empresa_id: int,
) -> tuple[str, list[dict[str, Any]]]:
    fila = request.session.get(_CHAVE_ONBOARDING_EMPRESA, {})
    if not isinstance(fila, dict):
        request.session.pop(_CHAVE_ONBOARDING_EMPRESA, None)
        return "", []

    payload = fila.pop(str(int(empresa_id)), None)
    if fila:
        request.session[_CHAVE_ONBOARDING_EMPRESA] = fila
    else:
        request.session.pop(_CHAVE_ONBOARDING_EMPRESA, None)

    if not isinstance(payload, dict):
        return "", []

    empresa_nome = _normalizar_texto(str(payload.get("empresa_nome", "")), max_len=200)
    credenciais = [
        item
        for item in (
            _normalizar_credencial_onboarding_admin(credencial)
            for credencial in list(payload.get("credenciais") or [])
        )
        if item is not None
    ]
    return empresa_nome, credenciais


def _exigir_step_up_admin_ou_redirect(request: Request, *, return_to: str, mensagem: str) -> RedirectResponse | None:
    if not _sessao_admin_reauth_expirada(request):
        return None
    return _redirect_step_up_admin(request, return_to=return_to, mensagem=mensagem)


def _resolver_compat_admin(nome: str, fallback):
    modulo_rotas = sys.modules.get("app.domains.admin.routes")
    if modulo_rotas is None:
        return fallback
    candidato = getattr(modulo_rotas, nome, fallback)
    return candidato if callable(candidato) else fallback


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


def _processar_cadastro_cliente(
    *,
    request: Request,
    banco: Session,
    usuario_admin: Usuario,
    nome: str,
    cnpj: str,
    email: str,
    plano: str,
    segmento: str = "",
    cidade_estado: str = "",
    nome_responsavel: str = "",
    observacoes: str = "",
    admin_cliente_case_visibility_mode: str = "",
    admin_cliente_operating_model: str = "",
    admin_cliente_mobile_web_inspector_enabled: str = "",
    admin_cliente_mobile_web_review_enabled: str = "",
    admin_cliente_operational_user_cross_portal_enabled: str = "",
    admin_cliente_operational_user_admin_portal_enabled: str = "",
    provisionar_inspetor_inicial: str = "",
    inspetor_nome: str = "",
    inspetor_email: str = "",
    inspetor_telefone: str = "",
    provisionar_revisor_inicial: str = "",
    revisor_nome: str = "",
    revisor_email: str = "",
    revisor_telefone: str = "",
    revisor_crea: str = "",
    url_erro: str,
    url_sucesso: str | None = None,
) -> RedirectResponse:
    nome = _normalizar_texto(nome, max_len=200)
    cnpj = _normalizar_texto(cnpj, max_len=18)
    email = _normalizar_email(email)
    plano = _normalizar_plano(plano)
    segmento = _normalizar_texto(segmento, max_len=100)
    cidade_estado = _normalizar_texto(cidade_estado, max_len=100)
    nome_responsavel = _normalizar_texto(nome_responsavel, max_len=150)
    observacoes = _normalizar_texto(observacoes)
    inspetor_nome = _normalizar_texto(inspetor_nome, max_len=150)
    inspetor_email = _normalizar_email(inspetor_email) if inspetor_email else ""
    inspetor_telefone = _normalizar_texto(inspetor_telefone, max_len=30)
    revisor_nome = _normalizar_texto(revisor_nome, max_len=150)
    revisor_email = _normalizar_email(revisor_email) if revisor_email else ""
    revisor_telefone = _normalizar_texto(revisor_telefone, max_len=30)
    revisor_crea = _normalizar_texto(revisor_crea, max_len=60)

    if not nome or not cnpj or not email or not plano:
        return _redirect_err(url_erro, "Preencha os campos obrigatórios.")

    def _operacao() -> RedirectResponse:
        registrar_cliente = _resolver_compat_admin("registrar_novo_cliente", registrar_novo_cliente)
        resultado = registrar_cliente(
            banco,
            nome=nome,
            cnpj=cnpj,
            email_admin=email,
            plano=plano,
            segmento=segmento,
            cidade_estado=cidade_estado,
            nome_responsavel=nome_responsavel,
            observacoes=observacoes,
            admin_cliente_case_visibility_mode=admin_cliente_case_visibility_mode,
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
        )
        aviso_boas_vindas: str | None = None
        if isinstance(resultado, tuple) and len(resultado) == 3:
            empresa, senha_inicial, aviso_boas_vindas = resultado
        else:
            empresa, senha_inicial = resultado
            aviso_boas_vindas = None

        logger.info(
            "Cliente cadastrado | empresa_id=%s | admin_id=%s | email_admin=%s",
            empresa.id,
            usuario_admin.id,
            email,
        )

        credenciais_onboarding = [
            _credencial_onboarding_admin_empresa(
                empresa=empresa,
                login=email,
                senha=senha_inicial,
            )
        ]
        credenciais_onboarding.extend(list(getattr(empresa, "_onboarding_operational_credentials", []) or []))
        _armazenar_bundle_onboarding_empresa(
            request,
            empresa_id=int(empresa.id),
            empresa_nome=str(getattr(empresa, "nome_fantasia", "") or nome),
            credenciais=credenciais_onboarding,
        )
        _flash_primeiro_acesso_empresa(
            request,
            empresa=empresa.nome_fantasia,
            email=email,
        )

        destino = url_sucesso or f"{URL_CLIENTES}/{empresa.id}/acesso-inicial"
        mensagem_sucesso = f"Cliente {empresa.nome_fantasia} cadastrado com sucesso."
        if _flag_ligada(provisionar_inspetor_inicial) or _flag_ligada(provisionar_revisor_inicial):
            mensagem_sucesso = f"{mensagem_sucesso} Equipe inicial provisionada quando solicitada."
        if aviso_boas_vindas:
            mensagem_sucesso = f"{mensagem_sucesso} {aviso_boas_vindas}"
        return _redirect_ok(
            destino,
            mensagem_sucesso,
        )

    return _executar_acao_admin_redirect(
        url_erro=url_erro,
        mensagem_log="Falha inesperada ao cadastrar cliente",
        operacao=_operacao,
        admin_id=usuario_admin.id,
        email=email,
    )


@roteador_admin_clientes.get("/novo-cliente", response_class=HTMLResponse)
async def pagina_novo_cliente(
    request: Request,
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    return _render_template(
        request,
        "admin/novo_cliente.html",
        {
            "usuario": usuario,
            "plano_padrao_onboarding": get_platform_default_new_tenant_plan(banco),
        },
    )


@roteador_admin_clientes.post("/novo-cliente")
async def processar_novo_cliente(
    request: Request,
    csrf_token: str = Form(default=""),
    nome: str = Form(...),
    cnpj: str = Form(...),
    segmento: str = Form(default=""),
    cidade_estado: str = Form(default=""),
    plano: str = Form(...),
    email: str = Form(...),
    nome_responsavel: str = Form(default=""),
    observacoes: str = Form(default=""),
    admin_cliente_case_visibility_mode: str = Form(default=""),
    admin_cliente_operating_model: str = Form(default=""),
    admin_cliente_mobile_web_inspector_enabled: str = Form(default=""),
    admin_cliente_mobile_web_review_enabled: str = Form(default=""),
    admin_cliente_operational_user_cross_portal_enabled: str = Form(default=""),
    admin_cliente_operational_user_admin_portal_enabled: str = Form(default=""),
    provisionar_inspetor_inicial: str = Form(default=""),
    inspetor_nome: str = Form(default=""),
    inspetor_email: str = Form(default=""),
    inspetor_telefone: str = Form(default=""),
    provisionar_revisor_inicial: str = Form(default=""),
    revisor_nome: str = Form(default=""),
    revisor_email: str = Form(default=""),
    revisor_telefone: str = Form(default=""),
    revisor_crea: str = Form(default=""),
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    if not _validar_csrf(request, csrf_token):
        return _redirect_err(URL_NOVO_CLIENTE, "Requisição inválida.")

    return _processar_cadastro_cliente(
        request=request,
        banco=banco,
        usuario_admin=usuario,
        nome=nome,
        cnpj=cnpj,
        email=email,
        plano=plano,
        segmento=segmento,
        cidade_estado=cidade_estado,
        nome_responsavel=nome_responsavel,
        observacoes=observacoes,
        admin_cliente_case_visibility_mode=admin_cliente_case_visibility_mode,
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
        url_erro=URL_NOVO_CLIENTE,
    )


@roteador_admin_clientes.post("/cadastrar-empresa")
async def cadastrar_empresa(
    request: Request,
    csrf_token: str = Form(default=""),
    nome: str = Form(...),
    cnpj: str = Form(...),
    email: str = Form(...),
    plano: str = Form(...),
    admin_cliente_case_visibility_mode: str = Form(default=""),
    admin_cliente_operating_model: str = Form(default=""),
    admin_cliente_mobile_web_inspector_enabled: str = Form(default=""),
    admin_cliente_mobile_web_review_enabled: str = Form(default=""),
    admin_cliente_operational_user_cross_portal_enabled: str = Form(default=""),
    admin_cliente_operational_user_admin_portal_enabled: str = Form(default=""),
    provisionar_inspetor_inicial: str = Form(default=""),
    inspetor_nome: str = Form(default=""),
    inspetor_email: str = Form(default=""),
    inspetor_telefone: str = Form(default=""),
    provisionar_revisor_inicial: str = Form(default=""),
    revisor_nome: str = Form(default=""),
    revisor_email: str = Form(default=""),
    revisor_telefone: str = Form(default=""),
    revisor_crea: str = Form(default=""),
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    if not _validar_csrf(request, csrf_token):
        return _redirect_err(URL_PAINEL, "Requisição inválida.")

    return _processar_cadastro_cliente(
        request=request,
        banco=banco,
        usuario_admin=usuario,
        nome=nome,
        cnpj=cnpj,
        email=email,
        plano=plano,
        admin_cliente_case_visibility_mode=admin_cliente_case_visibility_mode,
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
        url_erro=URL_PAINEL,
    )


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


def _extrair_credenciais_onboarding_legadas(mensagens_flash: list[dict[str, Any]]) -> list[dict[str, Any]]:
    credenciais: list[dict[str, Any]] = []
    for mensagem in mensagens_flash:
        credencial = mensagem.get("credencial_onboarding")
        if not isinstance(credencial, dict):
            continue
        credencial_legada = _normalizar_credencial_onboarding_admin(
            {
                "referencia": str(credencial.get("referencia", "")),
                "usuario_nome": str(credencial.get("referencia", "")),
                "papel": str(credencial.get("portal_label", "")) or "Administrador da empresa",
                "login": str(credencial.get("login", "")),
                "senha": str(credencial.get("senha", "")),
                "orientacao": str(credencial.get("orientacao", "")),
                "portais": [
                    {
                        "portal": "cliente",
                        "label": str(credencial.get("portal_label", "")) or "Portal da empresa",
                        "login_url": str(credencial.get("portal_login_url", "")) or URL_LOGIN_CLIENTE_PORTAL,
                    }
                ],
            }
        )
        if credencial_legada is not None:
            credenciais.append(credencial_legada)
    return credenciais


@roteador_admin_clientes.get("/clientes/{empresa_id}/acesso-inicial", response_class=HTMLResponse)
async def acesso_inicial_cliente(
    request: Request,
    empresa_id: int,
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    with observe_backend_hotspot(
        "admin_tenant_initial_access_view",
        request=request,
        surface="admin_ceo",
        tenant_id=empresa_id,
        user_id=getattr(usuario, "id", None),
        route_path=f"/admin/clientes/{empresa_id}/acesso-inicial",
        method="GET",
    ) as hotspot:
        if not _verificar_acesso_admin(usuario):
            hotspot.outcome = "redirect_login"
            hotspot.response_status_code = 303
            return _redirect_login()

        mensagens_flash = _consumir_flash(request)
        sucesso = _normalizar_texto(request.query_params.get("sucesso", ""), max_len=300)
        erro = _normalizar_texto(request.query_params.get("erro", ""), max_len=300)
        if sucesso:
            mensagens_flash.append({"tipo": "success", "texto": sucesso})
        if erro:
            mensagens_flash.append({"tipo": "error", "texto": erro})

        empresa_nome_onboarding, credenciais_onboarding = _consumir_bundle_onboarding_empresa(
            request,
            empresa_id=empresa_id,
        )
        if not credenciais_onboarding:
            credenciais_onboarding = _extrair_credenciais_onboarding_legadas(mensagens_flash)

        if not credenciais_onboarding:
            hotspot.outcome = "redirect_missing_bundle"
            hotspot.response_status_code = 303
            return _redirect_err(
                f"{URL_CLIENTES}/{empresa_id}",
                "Credencial inicial não está mais disponível. Gere uma nova senha no detalhe da empresa.",
            )

        empresa = banco.get(Empresa, empresa_id)
        empresa_nome = (
            getattr(empresa, "nome_fantasia", None)
            or empresa_nome_onboarding
            or credenciais_onboarding[0].get("referencia")
            or f"Empresa #{empresa_id}"
        )

        hotspot.outcome = "render_initial_access"
        hotspot.response_status_code = 200
        hotspot.detail.update({"credential_count": len(credenciais_onboarding)})
        return _render_template(
            request,
            "admin/cliente_acesso_inicial.html",
            {
                "usuario": usuario,
                "empresa": empresa,
                "empresa_id": empresa_id,
                "empresa_nome": empresa_nome,
                "credencial_onboarding": credenciais_onboarding[0],
                "credenciais_onboarding": credenciais_onboarding,
                "total_credenciais_onboarding": len(credenciais_onboarding),
                "mensagens_flash": mensagens_flash,
                "tem_detalhe_empresa": empresa is not None,
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


@roteador_admin_clientes.post("/clientes/{empresa_id}/politica-admin-cliente")
async def atualizar_politica_operacional_admin_cliente(
    request: Request,
    empresa_id: int,
    csrf_token: str = Form(default=""),
    admin_cliente_commercial_service_package: str = Form(default=""),
    admin_cliente_case_visibility_mode: str = Form(default=""),
    admin_cliente_operating_model: str = Form(default=""),
    tenant_portal_cliente_enabled: str = Form(default=""),
    tenant_portal_inspetor_enabled: str = Form(default=""),
    tenant_portal_revisor_enabled: str = Form(default=""),
    admin_cliente_mobile_web_inspector_enabled: str = Form(default=""),
    admin_cliente_mobile_web_review_enabled: str = Form(default=""),
    admin_cliente_operational_user_cross_portal_enabled: str = Form(default=""),
    admin_cliente_operational_user_admin_portal_enabled: str = Form(default=""),
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    if not _validar_csrf(request, csrf_token):
        return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")

    def _operacao() -> RedirectResponse:
        atualizar_politica_admin_cliente_por_superficie(
            banco,
            empresa_id=int(empresa_id),
            ator_usuario_id=usuario.id if usuario else None,
            form=AdminClienteSurfacePolicyForm(
                commercial_service_package=admin_cliente_commercial_service_package,
                case_visibility_mode=admin_cliente_case_visibility_mode,
                operating_model=admin_cliente_operating_model,
                tenant_portal_cliente_enabled=tenant_portal_cliente_enabled,
                tenant_portal_inspetor_enabled=tenant_portal_inspetor_enabled,
                tenant_portal_revisor_enabled=tenant_portal_revisor_enabled,
                mobile_web_inspector_enabled=admin_cliente_mobile_web_inspector_enabled,
                mobile_web_review_enabled=admin_cliente_mobile_web_review_enabled,
                operational_user_cross_portal_enabled=admin_cliente_operational_user_cross_portal_enabled,
                operational_user_admin_portal_enabled=admin_cliente_operational_user_admin_portal_enabled,
            ),
        )
        return _redirect_ok(
            f"{URL_CLIENTES}/{empresa_id}",
            "Configuracao de acesso da empresa atualizada.",
        )

    return _executar_acao_admin_redirect(
        url_erro=f"{URL_CLIENTES}/{empresa_id}",
        mensagem_log="Falha ao atualizar política operacional do admin-cliente",
        operacao=_operacao,
        empresa_id=empresa_id,
        admin_id=usuario.id if usuario else None,
    )


@roteador_admin_clientes.get("/clientes/{empresa_id}/diagnostico")
async def exportar_diagnostico_cliente_admin(
    request: Request,
    empresa_id: int,
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()
    step_up = _exigir_step_up_admin_ou_redirect(
        request,
        return_to=f"{URL_CLIENTES}/{empresa_id}/diagnostico",
        mensagem="Reautenticação necessária para exportar o diagnóstico administrativo.",
    )
    if step_up is not None:
        return step_up

    dados = buscar_detalhe_cliente(banco, empresa_id)
    if not dados:
        mensagem = (
            "Não foi possível carregar os detalhes da empresa."
            if _empresa_cliente_existe_no_banco(banco, empresa_id)
            else "Empresa não encontrada."
        )
        return _redirect_err(URL_CLIENTES, mensagem)

    empresa = dados["empresa"]
    usuarios = dados.get("usuarios") or []
    auditoria_admin = [
        serializar_registro_auditoria_admin(item)
        for item in listar_auditoria_admin_empresa(
            banco,
            empresa_id=empresa_id,
            limite=20,
        )
    ]
    auditoria_cliente = [
        serializar_registro_auditoria(item)
        for item in listar_auditoria_empresa(
            banco,
            empresa_id=empresa_id,
            limite=20,
        )
    ]
    suporte_excepcional = get_tenant_exceptional_support_state(banco, empresa_id=empresa_id)
    seguranca = _dict_payload(dados.get("seguranca"))
    payload = {
        "contract_name": "PlatformTenantOperationalDiagnosticV1",
        "generated_at": utc_now().isoformat(),
        "portal": "admin",
        "actor": {
            "usuario_id": int(usuario.id),
            "papel": "diretoria",
            "email": str(getattr(usuario, "email", "") or ""),
        },
        "tenant": {
            "id": int(empresa.id),
            "nome_fantasia": str(getattr(empresa, "nome_fantasia", "") or ""),
            "cnpj": str(getattr(empresa, "cnpj", "") or ""),
            "plano_ativo": str(getattr(empresa, "plano_ativo", "") or ""),
            "status_bloqueio": bool(getattr(empresa, "status_bloqueio", False)),
            "segmento": str(getattr(empresa, "segmento", "") or ""),
            "cidade_estado": str(getattr(empresa, "cidade_estado", "") or ""),
            "nome_responsavel": str(getattr(empresa, "nome_responsavel", "") or ""),
        },
        "resumo_operacional": {
            "total_usuarios": int((dados.get("resumo_operacional") or {}).get("usuarios_total", len(usuarios))),
            "admins_cliente": int((dados.get("resumo_operacional") or {}).get("admins_total", len(dados.get("admins_cliente") or []))),
            "inspetores": int((dados.get("resumo_operacional") or {}).get("inspetores_total", len(dados.get("inspetores") or []))),
            "revisores": int((dados.get("resumo_operacional") or {}).get("revisores_total", len(dados.get("revisores") or []))),
            "total_laudos": int(dados.get("total_laudos") or 0),
            "limite_plano": dados.get("limite_plano"),
            "uso_percentual": dados.get("uso_percentual"),
        },
        "status_operacional": {
            "status": (dados.get("status_admin") or {}).get("label"),
            "saude": (dados.get("saude_admin") or {}).get("label"),
            "saude_razao": (dados.get("saude_admin") or {}).get("razao"),
        },
        "seguranca": {
            "total_sessoes_ativas": int((dados.get("seguranca") or {}).get("total_sessoes_ativas", 0)),
            "usuarios_com_sessao_ativa": int((dados.get("seguranca") or {}).get("usuarios_com_sessao_ativa", 0)),
            "usuarios_bloqueados": int((dados.get("seguranca") or {}).get("usuarios_bloqueados", 0)),
            "usuarios_troca_senha_pendente": int((dados.get("seguranca") or {}).get("usuarios_troca_senha_pendente", 0)),
            "ultimo_acesso": (dados.get("seguranca") or {}).get("ultimo_acesso_label"),
        },
        "usuarios_administrativos": [
            {
                "id": int(item.get("id") or 0),
                "nome": str(item.get("nome_completo") or ""),
                "email": str(item.get("email") or ""),
                "perfil": str(item.get("role_label") or ""),
                "ativo": bool(item.get("ativo")),
                "senha_temporaria_ativa": bool(item.get("senha_temporaria_ativa")),
            }
            for item in (dados.get("admins_cliente") or [])
        ],
        "equipe_operacional_privada": {
            "inspetores_total": int((dados.get("resumo_operacional") or {}).get("inspetores_total", 0)),
            "mesa_avaliadora_total": int((dados.get("resumo_operacional") or {}).get("revisores_total", 0)),
            "gestao_direta_pelo_admin_ceo": False,
            "suporte_realizado_via_admin_cliente": True,
        },
        "sessoes_ativas": [
            {
                "usuario_id": int(item.get("usuario_id") or 0),
                "usuario_nome": str(item.get("usuario_nome") or ""),
                "role": str(item.get("role_label") or ""),
                "ultima_atividade": str(item.get("ultima_atividade_label") or ""),
                "expira_em": str(item.get("expira_em_label") or ""),
            }
            for item in seguranca.get("sessoes_ativas", [])
        ],
        "falhas_recentes": [
            {
                "acao": str(getattr(item, "acao", "") or ""),
                "resumo": str(getattr(item, "resumo", "") or ""),
                "criado_em": (
                    criado_em.isoformat()
                    if (criado_em := getattr(item, "criado_em", None)) is not None
                    else ""
                ),
            }
            for item in (dados.get("falhas_recentes") or [])
        ],
        "auditoria_admin": auditoria_admin,
        "auditoria_cliente": auditoria_cliente,
        "visibility_policy": _tenant_admin_visibility_policy_snapshot(banco),
        "support_exceptional": suporte_excepcional,
        "fronteiras": {
            "admin_scope": "cross_tenant_with_explicit_target",
            "tenant_scope": "company_scoped",
            "chat_scope": "company_scoped",
            "mesa_scope": "company_scoped",
        },
    }
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="tariel-admin-tenant-{int(empresa.id)}-diagnostico.json"'
        },
    )


@roteador_admin_clientes.post("/clientes/{empresa_id}/bloquear")
async def toggle_bloqueio(
    request: Request,
    empresa_id: int,
    csrf_token: str = Form(default=""),
    motivo: str = Form(default=""),
    confirmar_desbloqueio: str = Form(default=""),
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    if not _validar_csrf(request, csrf_token):
        return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")
    step_up = _exigir_step_up_admin_ou_redirect(
        request,
        return_to=f"{URL_CLIENTES}/{empresa_id}",
        mensagem="Reautenticação necessária para bloquear ou desbloquear empresa.",
    )
    if step_up is not None:
        return step_up

    def _operacao() -> RedirectResponse:
        resultado = alternar_bloqueio(
            banco,
            empresa_id,
            motivo=motivo,
            confirmar_desbloqueio=confirmar_desbloqueio == "1",
        )
        bloqueado = bool(resultado["blocked"])
        mensagem = "Acesso bloqueado com sucesso." if bloqueado else "Acesso restaurado com sucesso."
        registrar_auditoria_admin_empresa_segura(
            banco,
            empresa_id=empresa_id,
            ator_usuario_id=int(usuario.id),
            acao="tenant_block_toggled",
            resumo=f"Bloqueio da empresa #{empresa_id} {'ativado' if bloqueado else 'removido'}.",
            detalhe="Acao administrativa executada pelo portal Admin-CEO.",
            payload={
                "blocked": bool(bloqueado),
                "reason": str(resultado.get("reason") or ""),
                "sessions_invalidated": int(resultado.get("sessions_invalidated") or 0),
            },
        )

        logger.info(
            "Bloqueio de empresa alterado | empresa_id=%s | bloqueado=%s | sessoes_encerradas=%s | admin_id=%s",
            empresa_id,
            bloqueado,
            int(resultado.get("sessions_invalidated") or 0),
            usuario.id,
        )
        return _redirect_ok(
            f"{URL_CLIENTES}/{empresa_id}",
            (
                f"{mensagem} Sessões encerradas: {int(resultado.get('sessions_invalidated') or 0)}."
                if bloqueado
                else mensagem
            ),
        )

    return _executar_acao_admin_redirect(
        url_erro=f"{URL_CLIENTES}/{empresa_id}",
        mensagem_log="Falha ao alternar bloqueio",
        operacao=_operacao,
        empresa_id=empresa_id,
        admin_id=usuario.id if usuario else None,
    )


@roteador_admin_clientes.post("/clientes/{empresa_id}/trocar-plano")
async def trocar_plano(
    request: Request,
    empresa_id: int,
    csrf_token: str = Form(default=""),
    plano: str = Form(...),
    banco: Session = Depends(obter_banco),
    usuario: Optional[Usuario] = Depends(obter_usuario_html),
):
    if not _verificar_acesso_admin(usuario):
        return _redirect_login()

    if not _validar_csrf(request, csrf_token):
        return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")
    step_up = _exigir_step_up_admin_ou_redirect(
        request,
        return_to=f"{URL_CLIENTES}/{empresa_id}",
        mensagem="Reautenticacao necessaria para alterar o plano da empresa.",
    )
    if step_up is not None:
        return step_up

    plano_normalizado = _normalizar_plano(plano)

    def _operacao() -> RedirectResponse:
        preview = alterar_plano(banco, empresa_id, plano_normalizado)
        registrar_auditoria_admin_empresa_segura(
            banco,
            empresa_id=empresa_id,
            ator_usuario_id=int(usuario.id),
            acao="tenant_plan_changed",
            resumo=f"Plano da empresa #{empresa_id} alterado para {plano_normalizado}.",
            detalhe="Acao administrativa executada pelo portal Admin-CEO.",
            payload=preview,
        )

        logger.info(
            "Plano alterado | empresa_id=%s | plano=%s | admin_id=%s",
            empresa_id,
            plano_normalizado,
            usuario.id,
        )
        return _redirect_ok(
            f"{URL_CLIENTES}/{empresa_id}",
            f"Plano atualizado para {plano_normalizado}.",
        )

    return _executar_acao_admin_redirect(
        url_erro=f"{URL_CLIENTES}/{empresa_id}",
        mensagem_log="Falha ao trocar plano",
        operacao=_operacao,
        empresa_id=empresa_id,
        plano=plano_normalizado,
        admin_id=usuario.id if usuario else None,
    )


registrar_rotas_funcionarios_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect=_exigir_step_up_admin_ou_redirect,
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
registrar_rotas_suporte_excepcional_cliente(
    roteador_admin_clientes,
    executar_acao_admin_redirect=_executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect=_exigir_step_up_admin_ou_redirect,
)
