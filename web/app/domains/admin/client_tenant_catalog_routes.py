"""Rotas Admin CEO para catalogo contratual do tenant."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import registrar_auditoria_admin_empresa_segura
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import (
    sincronizar_portfolio_catalogo_empresa,
    upsert_signatario_governado_laudo,
)
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")


def registrar_rotas_catalogo_tenant_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
) -> None:
    @roteador.post("/clientes/{empresa_id}/catalogo-laudos")
    async def sincronizar_catalogo_laudos_empresa_admin(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        catalog_variant: list[str] | None = Form(default=None),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")

        url_retorno = f"{URL_CLIENTES}/{empresa_id}"

        def _operacao() -> RedirectResponse:
            resultado = sincronizar_portfolio_catalogo_empresa(
                banco,
                empresa_id=int(empresa_id),
                selection_tokens=list(catalog_variant or []),
                admin_id=usuario.id if usuario else None,
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=int(empresa_id),
                ator_usuario_id=usuario.id if usuario else None,
                acao="tenant_report_catalog_synced",
                resumo="Portfolio comercial de laudos sincronizado para a empresa.",
                detalhe=(
                    f"{int(resultado['selected_count'])} variantes ativas no catálogo operacional do cliente."
                ),
                payload={
                    "selected_count": int(resultado["selected_count"]),
                    "governed_mode": bool(resultado["governed_mode"]),
                    "activated": list(resultado["activated"]),
                    "reactivated": list(resultado["reactivated"]),
                    "deactivated": list(resultado["deactivated"]),
                },
            )
            return _redirect_ok(
                url_retorno,
                (
                    "Portfólio de laudos sincronizado."
                    if int(resultado["selected_count"]) > 0
                    else (
                        "Portfolio limpo. A empresa permanece governada pelo Admin-CEO, sem modelos liberados."
                        if bool(resultado.get("governed_mode"))
                        else "Portfolio limpo. A empresa voltou ao modo antigo, sem catalogo ativo."
                    )
                ),
            )

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao sincronizar portfólio de laudos do tenant",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            empresa_id=empresa_id,
        )

    @roteador.post("/clientes/{empresa_id}/signatarios-governados")
    async def salvar_signatario_governado_admin(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        signatario_id: int | None = Form(default=None),
        nome: str = Form(...),
        funcao: str = Form(...),
        registro_profissional: str = Form(default=""),
        valid_until: str = Form(default=""),
        allowed_family_keys: list[str] | None = Form(default=None),
        observacoes: str = Form(default=""),
        ativo: str | None = Form(default=None),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        url_retorno = f"{URL_CLIENTES}/{empresa_id}"
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            registro = upsert_signatario_governado_laudo(
                banco,
                tenant_id=int(empresa_id),
                signatario_id=signatario_id,
                nome=nome,
                funcao=funcao,
                registro_profissional=registro_profissional,
                valid_until=valid_until,
                allowed_family_keys=list(allowed_family_keys or []),
                observacoes=observacoes,
                ativo=ativo is not None,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Signatário governado salvo | tenant_id=%s | signatario_id=%s | admin_id=%s",
                empresa_id,
                registro.id,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, "Responsavel pela assinatura salvo para a empresa.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao salvar signatário governado do tenant",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            empresa_id=empresa_id,
            signatario_id=signatario_id,
        )


__all__ = ["registrar_rotas_catalogo_tenant_cliente"]
