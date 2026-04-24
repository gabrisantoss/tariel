"""Rotas Admin CEO para operacoes sensiveis do tenant."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import registrar_auditoria_admin_empresa_segura
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _normalizar_plano,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import alternar_bloqueio, alterar_plano
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")


def registrar_rotas_operacoes_sensiveis_tenant(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect,
) -> None:
    @roteador.post("/clientes/{empresa_id}/bloquear")
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
        step_up = exigir_step_up_admin_ou_redirect(
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

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao alternar bloqueio",
            operacao=_operacao,
            empresa_id=empresa_id,
            admin_id=usuario.id if usuario else None,
        )

    @roteador.post("/clientes/{empresa_id}/trocar-plano")
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
        step_up = exigir_step_up_admin_ou_redirect(
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

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao trocar plano",
            operacao=_operacao,
            empresa_id=empresa_id,
            plano=plano_normalizado,
            admin_id=usuario.id if usuario else None,
        )


__all__ = ["registrar_rotas_operacoes_sensiveis_tenant"]
