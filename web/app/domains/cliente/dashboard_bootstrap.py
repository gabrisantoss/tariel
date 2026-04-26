"""Shell do bootstrap do portal admin-cliente."""

from __future__ import annotations

import logging

from starlette.requests import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.admin.services import (
    filtro_usuarios_gerenciaveis_cliente,
    filtro_usuarios_operacionais_cliente,
)
from app.domains.cliente.auditoria import (
    listar_auditoria_empresa,
    resumir_auditoria_serializada,
    serializar_registro_auditoria,
)
from app.domains.cliente.dashboard_analytics import resumo_empresa_cliente
from app.domains.cliente.dashboard_bootstrap_shadow import (
    build_tenant_admin_projection_for_bootstrap,
    registrar_shadow_tenant_admin_bootstrap,
)
from app.domains.cliente.dashboard_overview_support import (
    build_operational_observability_cliente,
    build_tenant_commercial_overview_cliente,
)
from app.domains.cliente.diagnostics import build_cliente_portal_context
from app.domains.cliente.dashboard_bootstrap_support import (
    ROLE_LABELS,
    build_guided_onboarding_cliente,
    listar_ativos_empresa,
    listar_documentos_empresa,
    listar_laudos_chat_usuario,
    listar_laudos_mesa_empresa,
    listar_recorrencia_empresa,
    listar_servicos_empresa,
    resumir_ativos_empresa,
    resumir_documentos_empresa,
    resumir_recorrencia_empresa,
    resumir_servicos_empresa,
    serializar_usuario_cliente,
)
from app.shared.backend_hotspot_metrics import observe_backend_hotspot
from app.shared.database import Empresa, Usuario
from app.shared.tenant_entitlement_guard import tenant_access_policy_for_user
from app.shared.tenant_admin_policy import summarize_tenant_admin_policy, tenant_admin_surface_availability
from app.shared.tenant_report_catalog import build_tenant_template_option_snapshot

logger = logging.getLogger("tariel.cliente.bootstrap")


def _normalizar_superficie_bootstrap(surface: str | None) -> str | None:
    valor = str(surface or "").strip().lower()
    if valor in {"admin", "servicos", "recorrencia", "ativos", "chat", "mesa", "documentos"}:
        return valor
    return None


def bootstrap_cliente(
    banco: Session,
    usuario: Usuario,
    *,
    request: Request | None = None,
    surface: str | None = None,
) -> dict[str, object]:
    with observe_backend_hotspot(
        "cliente_bootstrap",
        request=request,
        surface="admin_cliente",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        route_path="/cliente/api/bootstrap" if request is not None else "service:bootstrap_cliente",
        method="GET" if request is not None else "SERVICE",
        detail={"requested_surface": _normalizar_superficie_bootstrap(surface) or "full"},
    ) as hotspot:
        surface_resolvida = _normalizar_superficie_bootstrap(surface)
        usuarios_tenant_admin = list(
            banco.scalars(
                select(Usuario)
                .where(
                    Usuario.empresa_id == usuario.empresa_id,
                    filtro_usuarios_gerenciaveis_cliente(),
                )
                .order_by(Usuario.nivel_acesso.desc(), Usuario.nome_completo.asc())
            ).all()
        )
        empresa_summary = resumo_empresa_cliente(banco, usuario)
        tenant_admin_projection, _case_snapshots = build_tenant_admin_projection_for_bootstrap(
            banco=banco,
            usuario=usuario,
            empresa_summary=empresa_summary,
            usuarios=usuarios_tenant_admin,
        )
        empresa = getattr(usuario, "empresa", None) or banco.get(Empresa, int(usuario.empresa_id))
        tenant_commercial_package = summarize_tenant_admin_policy(
            getattr(empresa, "admin_cliente_policy_json", None)
        )
        usuarios_operacionais = [
            serializar_usuario_cliente(item)
            for item in banco.scalars(
                select(Usuario)
                .where(
                    Usuario.empresa_id == usuario.empresa_id,
                    filtro_usuarios_operacionais_cliente(),
                )
                .order_by(Usuario.nivel_acesso.desc(), Usuario.nome_completo.asc())
            ).all()
        ]
        surface_availability = {
            "servicos": True,
            "recorrencia": True,
            "ativos": True,
            "documentos": True,
            **tenant_admin_surface_availability(getattr(empresa, "admin_cliente_policy_json", None)),
        }
        if surface_resolvida in {"chat", "mesa"} and not surface_availability.get(surface_resolvida, False):
            surface_resolvida = "admin"

        incluir_admin = surface_resolvida in {None, "admin"}
        incluir_servicos = surface_resolvida in {None, "servicos"}
        incluir_recorrencia = surface_resolvida in {None, "recorrencia"}
        incluir_ativos = surface_resolvida in {None, "ativos"}
        incluir_chat = surface_resolvida in {None, "chat"} and bool(surface_availability.get("chat"))
        incluir_mesa = surface_resolvida in {None, "mesa"} and bool(surface_availability.get("mesa"))
        incluir_documentos = surface_resolvida in {None, "documentos"}
        servicos: list[dict[str, object]] = []
        recorrencia: list[dict[str, object]] = []
        ativos: list[dict[str, object]] = []
        laudos_chat: list[dict[str, object]] = []
        laudos_mesa: list[dict[str, object]] = []
        documentos: list[dict[str, object]] = []
        payload = {
            "portal": build_cliente_portal_context(),
            "empresa": empresa_summary,
            "tenant_admin_projection": tenant_admin_projection.model_dump(mode="json"),
            "tenant_access_policy": tenant_access_policy_for_user(usuario),
            "tenant_commercial_package": {
                "key": tenant_commercial_package["commercial_service_package_effective"],
                "label": tenant_commercial_package["commercial_service_package_label"],
                "description": tenant_commercial_package["commercial_service_package_description"],
                "operating_model": tenant_commercial_package["operating_model"],
                "operating_model_label": tenant_commercial_package["operating_model_label"],
                "surface_availability": surface_availability,
                "capability_entitlements": tenant_commercial_package["tenant_capability_entitlements"],
                "capability_aliases": tenant_commercial_package["tenant_capability_aliases"],
                "mobile_chat_first_governance": tenant_commercial_package["mobile_chat_first_governance"],
            },
            "tenant_commercial_overview": build_tenant_commercial_overview_cliente(
                empresa_summary=empresa_summary,
                tenant_policy_summary=tenant_commercial_package,
                surface_availability=surface_availability,
                usuarios=usuarios_operacionais,
            ),
        }

        if incluir_admin:
            auditoria_itens = [
                serializar_registro_auditoria(item)
                for item in listar_auditoria_empresa(banco, empresa_id=int(usuario.empresa_id))
            ]
            payload["usuarios"] = usuarios_operacionais
            payload["auditoria"] = {
                "itens": auditoria_itens,
                "resumo": resumir_auditoria_serializada(auditoria_itens),
            }

        if incluir_servicos:
            servicos = listar_servicos_empresa(banco, usuario)
            payload["servicos"] = {
                "items": servicos,
                "summary": resumir_servicos_empresa(servicos),
            }

        if incluir_recorrencia:
            recorrencia = listar_recorrencia_empresa(banco, usuario)
            payload["recorrencia"] = {
                "items": recorrencia,
                "summary": resumir_recorrencia_empresa(recorrencia),
            }

        if incluir_ativos:
            ativos = listar_ativos_empresa(banco, usuario)
            payload["ativos"] = {
                "items": ativos,
                "summary": resumir_ativos_empresa(ativos),
            }

        if incluir_chat:
            template_snapshot = build_tenant_template_option_snapshot(banco, empresa_id=int(usuario.empresa_id))
            laudos_chat = listar_laudos_chat_usuario(banco, usuario)
            payload["chat"] = {
                "tipos_template": {
                    str(item["value"]): str(item["label"])
                    for item in list(template_snapshot.get("options") or [])
                },
                "tipo_template_options": list(template_snapshot.get("options") or []),
                "catalog_governed_mode": bool(template_snapshot.get("governed_mode")),
                "catalog_state": str(template_snapshot.get("catalog_state") or "legacy_open"),
                "catalog_permissions": dict(template_snapshot.get("permissions") or {}),
                "laudos": laudos_chat,
            }

        if incluir_mesa:
            laudos_mesa = listar_laudos_mesa_empresa(banco, usuario)
            payload["mesa"] = {
                "laudos": laudos_mesa,
            }

        if incluir_documentos:
            documentos = listar_documentos_empresa(banco, usuario)
            payload["documentos"] = {
                "items": documentos,
                "summary": resumir_documentos_empresa(documentos),
            }

        if not laudos_chat:
            laudos_chat = listar_laudos_chat_usuario(banco, usuario)
        if not laudos_mesa and bool(surface_availability.get("mesa")):
            laudos_mesa = listar_laudos_mesa_empresa(banco, usuario)
        if not servicos:
            servicos = listar_servicos_empresa(banco, usuario)
        if not recorrencia:
            recorrencia = listar_recorrencia_empresa(banco, usuario)
        if not ativos:
            ativos = listar_ativos_empresa(banco, usuario)
        if not documentos:
            documentos = listar_documentos_empresa(banco, usuario)
        documentos_summary = resumir_documentos_empresa(documentos)
        payload["guided_onboarding"] = build_guided_onboarding_cliente(
            usuarios=usuarios_operacionais,
            laudos_chat=laudos_chat,
            laudos_mesa=laudos_mesa,
            servicos_summary=resumir_servicos_empresa(servicos),
            ativos_summary=resumir_ativos_empresa(ativos),
            documentos_summary=documentos_summary,
            recorrencia_summary=resumir_recorrencia_empresa(recorrencia),
            surface_availability=surface_availability,
        )
        payload["operational_observability"] = build_operational_observability_cliente(
            empresa_summary=empresa_summary,
            tenant_admin_projection_payload=payload["tenant_admin_projection"].get("payload"),
            laudos_mesa=laudos_mesa,
            documentos_summary=documentos_summary,
            recorrencia_summary=resumir_recorrencia_empresa(recorrencia),
        )

        if request is not None and surface_resolvida is None:
            try:
                registrar_shadow_tenant_admin_bootstrap(
                    request=request,
                    banco=banco,
                    usuario=usuario,
                    empresa_summary=empresa_summary,
                    usuarios=usuarios_tenant_admin,
                    payload_publico=payload,
                )
            except Exception:
                logger.debug("Falha ao registrar tenant admin view em shadow mode.", exc_info=True)
                request.state.v2_tenant_admin_projection_error = "tenant_admin_projection_failed"

        hotspot.outcome = surface_resolvida or "full"
        hotspot.response_status_code = 200
        hotspot.detail.update(
            {
                "sections": [
                    section
                    for section, enabled in (
                        ("admin", incluir_admin),
                        ("servicos", incluir_servicos),
                        ("recorrencia", incluir_recorrencia),
                        ("ativos", incluir_ativos),
                        ("chat", incluir_chat),
                        ("mesa", incluir_mesa),
                        ("documentos", incluir_documentos),
                    )
                    if enabled
                ],
                "tenant_admin_users": len(usuarios_tenant_admin),
            }
        )
        return payload


__all__ = [
    "ROLE_LABELS",
    "bootstrap_cliente",
    "listar_ativos_empresa",
    "listar_documentos_empresa",
    "listar_laudos_chat_usuario",
    "listar_laudos_mesa_empresa",
    "listar_recorrencia_empresa",
    "listar_servicos_empresa",
    "resumir_ativos_empresa",
    "serializar_usuario_cliente",
    "resumir_recorrencia_empresa",
    "resumir_servicos_empresa",
]
