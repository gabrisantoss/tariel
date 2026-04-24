"""Rotas Admin CEO para importação canônica do catálogo de laudos."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.portal_support import (
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import (
    importar_familia_canonica_para_catalogo,
    importar_familias_canonicas_para_catalogo,
)
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")

URL_CATALOGO_LAUDOS = "/admin/catalogo-laudos"


def registrar_rotas_importacao_catalogo_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
) -> None:
    @roteador.post("/catalogo-laudos/familias/importar-canonico")
    async def importar_familia_canonica_catalogo_admin(
        request: Request,
        csrf_token: str = Form(default=""),
        family_key: str = Form(...),
        status_catalogo: str = Form(default="publicado"),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(URL_CATALOGO_LAUDOS, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            familia = importar_familia_canonica_para_catalogo(
                banco,
                family_key=family_key,
                status_catalogo=status_catalogo,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Família canônica importada para catálogo | family_key=%s | admin_id=%s",
                familia.family_key,
                usuario.id if usuario else None,
            )
            return _redirect_ok(
                URL_CATALOGO_LAUDOS,
                f"Família canônica {familia.family_key} importada para o catálogo oficial.",
            )

        return executar_acao_admin_redirect(
            url_erro=URL_CATALOGO_LAUDOS,
            mensagem_log="Falha ao importar família canônica para o catálogo",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/familias/importar-canonico-lote")
    async def importar_familias_canonicas_lote_catalogo_admin(
        request: Request,
        csrf_token: str = Form(default=""),
        status_catalogo: str = Form(default="publicado"),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(URL_CATALOGO_LAUDOS, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            familias = importar_familias_canonicas_para_catalogo(
                banco,
                status_catalogo=status_catalogo,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Lote de famílias canônicas importado | total=%s | admin_id=%s",
                len(familias),
                usuario.id if usuario else None,
            )
            return _redirect_ok(
                URL_CATALOGO_LAUDOS,
                f"{len(familias)} famílias canônicas importadas para o catálogo oficial.",
            )

        return executar_acao_admin_redirect(
            url_erro=URL_CATALOGO_LAUDOS,
            mensagem_log="Falha ao importar lote de famílias canônicas para o catálogo",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
        )


__all__ = ["registrar_rotas_importacao_catalogo_cliente"]
