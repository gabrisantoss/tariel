"""Rotas Admin CEO para usuarios do cliente/admin-cliente."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import registrar_auditoria_admin_empresa_segura
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _flash_senha_temporaria,
    _normalizar_email,
    _normalizar_texto,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import (
    alternar_bloqueio_usuario_empresa,
    criar_usuario_empresa,
    forcar_troca_senha_usuario_empresa,
)
from app.shared.database import NivelAcesso, Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")


def _mensagem_privacidade_operacional() -> str:
    return (
        "Por privacidade, a equipe de campo e a equipe de analise sao geridas "
        "pelo administrador da empresa no portal dela."
    )


def _obter_admin_cliente_alvo(
    banco: Session,
    *,
    empresa_id: int,
    usuario_id: int,
) -> Usuario:
    usuario_alvo = banco.get(Usuario, int(usuario_id))
    if usuario_alvo is None or int(getattr(usuario_alvo, "empresa_id", 0) or 0) != int(empresa_id):
        raise ValueError("Usuário não encontrado para esta empresa.")
    if int(getattr(usuario_alvo, "nivel_acesso", 0) or 0) != int(NivelAcesso.ADMIN_CLIENTE):
        raise ValueError(_mensagem_privacidade_operacional())
    return usuario_alvo


def registrar_rotas_funcionarios_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
    exigir_step_up_admin_ou_redirect,
) -> None:
    @roteador.post("/clientes/{empresa_id}/resetar-senha/{usuario_id}")
    async def resetar_senha(
        request: Request,
        empresa_id: int,
        usuario_id: int,
        csrf_token: str = Form(default=""),
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
            mensagem="Reautenticação necessária para forçar troca de senha do usuário.",
        )
        if step_up is not None:
            return step_up

        def _operacao() -> RedirectResponse:
            usuario_alvo = _obter_admin_cliente_alvo(
                banco,
                empresa_id=empresa_id,
                usuario_id=usuario_id,
            )
            usuario_resetado = forcar_troca_senha_usuario_empresa(
                banco,
                empresa_id=empresa_id,
                usuario_id=usuario_id,
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=empresa_id,
                ator_usuario_id=int(usuario.id),
                alvo_usuario_id=usuario_id,
                acao="tenant_user_password_reset",
                resumo=(
                    f"Troca obrigatoria de senha forcada para o administrador da empresa "
                    f"{usuario_alvo.nome_completo} pelo Admin-CEO."
                ),
                detalhe="As sessões ativas foram encerradas e o próximo login exigirá troca de senha.",
                payload={"user_id": int(usuario_id), "force_password_change": True},
            )

            logger.info(
                "Troca obrigatoria de senha marcada | usuario_id=%s | empresa_id=%s | admin_id=%s",
                usuario_id,
                empresa_id,
                usuario.id,
            )
            return _redirect_ok(
                f"{URL_CLIENTES}/{empresa_id}",
                f"{usuario_resetado.nome_completo} deverá trocar a senha no próximo login.",
            )

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao resetar senha",
            operacao=_operacao,
            usuario_id=usuario_id,
            empresa_id=empresa_id,
            admin_id=usuario.id if usuario else None,
        )

    @roteador.post("/clientes/{empresa_id}/adicionar-inspetor")
    async def novo_inspetor(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        nome: str = Form(...),
        email: str = Form(...),
        perfil: str = Form(default="inspetor"),
        crea: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", _mensagem_privacidade_operacional())

    @roteador.post("/clientes/{empresa_id}/adicionar-admin-cliente")
    async def novo_admin_cliente(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        nome: str = Form(...),
        email: str = Form(...),
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
            mensagem="Reautenticação necessária para criar um administrador da empresa.",
        )
        if step_up is not None:
            return step_up

        nome = _normalizar_texto(nome, max_len=150)
        email_normalizado = _normalizar_email(email)

        if not nome or not email_normalizado:
            return _redirect_err(
                f"{URL_CLIENTES}/{empresa_id}",
                "Preencha nome e e-mail do administrador da empresa.",
            )

        def _operacao() -> RedirectResponse:
            usuario_criado, senha_inicial = criar_usuario_empresa(
                banco,
                empresa_id=empresa_id,
                nome=nome,
                email=email_normalizado,
                nivel_acesso="admin_cliente",
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=empresa_id,
                ator_usuario_id=int(usuario.id),
                alvo_usuario_id=int(usuario_criado.id),
                acao="tenant_admin_client_created",
                resumo=f"Administrador da empresa {nome} criado pelo Admin-CEO.",
                detalhe="A conta foi preparada para o portal da empresa.",
                payload={"email": email_normalizado, "role": "admin_cliente"},
            )

            logger.info(
                "Admin-cliente criado | empresa_id=%s | email=%s | admin_id=%s",
                empresa_id,
                email_normalizado,
                usuario.id,
            )
            _flash_senha_temporaria(
                request,
                referencia=f"{nome} ({email_normalizado})",
                senha=senha_inicial,
            )
            return _redirect_ok(
                f"{URL_CLIENTES}/{empresa_id}",
                f"Administrador da empresa {nome} adicionado com sucesso.",
            )

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao adicionar admin-cliente",
            operacao=_operacao,
            empresa_id=empresa_id,
            email=email_normalizado,
            admin_id=usuario.id if usuario else None,
        )

    @roteador.post("/clientes/{empresa_id}/usuarios/{usuario_id}/atualizar-crea")
    async def atualizar_crea_usuario_operacional(
        request: Request,
        empresa_id: int,
        usuario_id: int,
        csrf_token: str = Form(default=""),
        crea: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")
        return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", _mensagem_privacidade_operacional())

    @roteador.post("/clientes/{empresa_id}/usuarios/{usuario_id}/bloquear")
    async def alternar_bloqueio_usuario(
        request: Request,
        empresa_id: int,
        usuario_id: int,
        csrf_token: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            usuario_alvo = _obter_admin_cliente_alvo(
                banco,
                empresa_id=empresa_id,
                usuario_id=usuario_id,
            )
            usuario_atualizado = alternar_bloqueio_usuario_empresa(
                banco,
                empresa_id=empresa_id,
                usuario_id=usuario_id,
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=empresa_id,
                ator_usuario_id=int(usuario.id),
                alvo_usuario_id=int(usuario_atualizado.id),
                acao="tenant_user_block_toggled",
                resumo=f"Acesso do administrador da empresa {usuario_alvo.nome_completo} alterado pelo Admin-CEO.",
                detalhe="Sessoes ativas do usuario foram encerradas no portal da empresa.",
                payload={"user_id": int(usuario_atualizado.id), "active": bool(usuario_atualizado.ativo)},
            )
            return _redirect_ok(
                f"{URL_CLIENTES}/{empresa_id}",
                (
                    f"{usuario_atualizado.nome_completo} reativado com sucesso."
                    if bool(usuario_atualizado.ativo)
                    else f"{usuario_atualizado.nome_completo} bloqueado com sucesso."
                ),
            )

        return executar_acao_admin_redirect(
            url_erro=f"{URL_CLIENTES}/{empresa_id}",
            mensagem_log="Falha ao alternar bloqueio do usuário",
            operacao=_operacao,
            empresa_id=empresa_id,
            usuario_id=usuario_id,
            admin_id=usuario.id if usuario else None,
        )


__all__ = ["registrar_rotas_funcionarios_cliente"]
