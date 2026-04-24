"""Rotas Admin CEO para suporte excepcional do cliente."""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import registrar_auditoria_admin_empresa_segura
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _normalizar_texto,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import get_tenant_exceptional_support_state
from app.shared.database import Empresa, Usuario, obter_banco
from app.shared.security import obter_usuario_html
from app.v2.contracts.envelopes import utc_now

logger = logging.getLogger("tariel.admin")


def _resolver_empresa_admin(banco: Session, *, empresa_id: int) -> Empresa:
    empresa = banco.get(Empresa, int(empresa_id))
    if empresa is None or bool(getattr(empresa, "escopo_plataforma", False)):
        raise ValueError("Empresa não encontrada.")
    return empresa


def _montar_payload_abertura_suporte_excepcional(
    banco: Session,
    *,
    empresa_id: int,
    usuario_admin: Usuario,
    justificativa: str,
    referencia_aprovacao: str,
) -> dict[str, Any]:
    _resolver_empresa_admin(banco, empresa_id=empresa_id)
    estado = get_tenant_exceptional_support_state(banco, empresa_id=int(empresa_id))
    policy = estado["policy"]
    if not bool(policy["can_open"]):
        raise ValueError("A política da plataforma mantém o suporte excepcional desabilitado.")
    if bool(estado["active"]):
        raise ValueError("Ja existe uma janela de suporte excepcional ativa para esta empresa.")

    justificativa_norm = _normalizar_texto(justificativa, max_len=500)
    referencia_norm = _normalizar_texto(referencia_aprovacao, max_len=120)
    if bool(policy["justification_required"]) and not justificativa_norm:
        raise ValueError("Informe a justificativa auditável para abrir suporte excepcional.")
    if bool(policy["approval_required"]) and not referencia_norm:
        raise ValueError("Informe a referência de aprovação antes de abrir suporte excepcional.")

    opened_at = utc_now()
    expires_at = opened_at + timedelta(minutes=max(1, int(policy["max_duration_minutes"])))
    return {
        "opened_at": opened_at,
        "expires_at": expires_at,
        "payload": {
            "mode": str(policy["mode"]),
            "scope_level": str(policy["scope_level"]),
            "approval_required": bool(policy["approval_required"]),
            "approval_reference": referencia_norm,
            "justification_required": bool(policy["justification_required"]),
            "justification": justificativa_norm,
            "step_up_required": bool(policy["step_up_required"]),
            "max_duration_minutes": int(policy["max_duration_minutes"]),
            "opened_at": opened_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "opened_via": "admin_client_detail",
            "actor_email": str(getattr(usuario_admin, "email", "") or ""),
        },
    }


def registrar_rotas_suporte_excepcional_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect,
) -> None:
    @roteador.post("/clientes/{empresa_id}/suporte-excepcional/abrir")
    async def abrir_suporte_excepcional_cliente_admin(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        justificativa: str = Form(default=""),
        referencia_aprovacao: str = Form(default=""),
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
            mensagem="Reautenticacao necessaria para abrir suporte excepcional da empresa.",
        )
        if step_up is not None:
            return step_up

        def _operacao() -> RedirectResponse:
            abertura = _montar_payload_abertura_suporte_excepcional(
                banco,
                empresa_id=empresa_id,
                usuario_admin=usuario,
                justificativa=justificativa,
                referencia_aprovacao=referencia_aprovacao,
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=empresa_id,
                ator_usuario_id=int(usuario.id),
                acao="tenant_exceptional_support_opened",
                resumo=f"Suporte excepcional aberto para a empresa #{empresa_id}.",
                detalhe=(
                    "Janela controlada de suporte administrativo aberta pelo Admin-CEO "
                    f"até {abertura['expires_at'].strftime('%d/%m/%Y %H:%M UTC')}."
                ),
                payload=abertura["payload"],
            )
            logger.info(
                "Suporte excepcional aberto | empresa_id=%s | admin_id=%s | scope=%s | expires_at=%s",
                empresa_id,
                usuario.id,
                abertura["payload"]["scope_level"],
                abertura["expires_at"].isoformat(),
            )
            return _redirect_ok(
                f"{URL_CLIENTES}/{empresa_id}",
                "Janela de suporte excepcional aberta com trilha auditável.",
            )

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao abrir suporte excepcional do tenant",
            operacao=_operacao,
            empresa_id=empresa_id,
            admin_id=usuario.id if usuario else None,
        )

    @roteador.post("/clientes/{empresa_id}/suporte-excepcional/encerrar")
    async def encerrar_suporte_excepcional_cliente_admin(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        motivo_encerramento: str = Form(default=""),
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
            mensagem="Reautenticacao necessaria para encerrar suporte excepcional da empresa.",
        )
        if step_up is not None:
            return step_up

        def _operacao() -> RedirectResponse:
            _resolver_empresa_admin(banco, empresa_id=empresa_id)
            estado = get_tenant_exceptional_support_state(banco, empresa_id=empresa_id)
            if not bool(estado["active"]):
                raise ValueError("Nao existe uma janela de suporte excepcional ativa para esta empresa.")
            motivo = _normalizar_texto(motivo_encerramento, max_len=300)
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=empresa_id,
                ator_usuario_id=int(usuario.id),
                acao="tenant_exceptional_support_closed",
                resumo=f"Suporte excepcional encerrado para a empresa #{empresa_id}.",
                detalhe=motivo or "Janela excepcional encerrada manualmente pelo Admin-CEO.",
                payload={
                    "opened_record_id": int(estado["opened_record_id"]),
                    "closed_at": utc_now().isoformat(),
                    "closed_reason": motivo,
                    "expired": False,
                    "scope_level": str(estado["scope_level"]),
                },
            )
            logger.info(
                "Suporte excepcional encerrado | empresa_id=%s | admin_id=%s | opened_record_id=%s",
                empresa_id,
                usuario.id,
                estado["opened_record_id"],
            )
            return _redirect_ok(
                f"{URL_CLIENTES}/{empresa_id}",
                "Janela de suporte excepcional encerrada.",
            )

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao encerrar suporte excepcional do tenant",
            operacao=_operacao,
            empresa_id=empresa_id,
            admin_id=usuario.id if usuario else None,
        )


__all__ = ["registrar_rotas_suporte_excepcional_cliente"]
