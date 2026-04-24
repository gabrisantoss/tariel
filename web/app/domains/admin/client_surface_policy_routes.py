"""Rotas Admin CEO para politica operacional por superficie do cliente."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.client_surface_policy import (
    AdminClienteSurfacePolicyForm,
    atualizar_politica_admin_cliente_por_superficie,
)
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html


def registrar_rotas_politica_superficies_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
) -> None:
    @roteador.post("/clientes/{empresa_id}/politica-admin-cliente")
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

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao atualizar política operacional do admin-cliente",
            operacao=_operacao,
            empresa_id=empresa_id,
            admin_id=usuario.id if usuario else None,
        )


__all__ = ["registrar_rotas_politica_superficies_cliente"]
