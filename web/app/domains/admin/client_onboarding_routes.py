"""Rotas Admin CEO para onboarding e cadastro inicial de clientes."""

from __future__ import annotations

import logging
import sys
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

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
    _render_template,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import get_platform_default_new_tenant_plan, registrar_novo_cliente
from app.shared.backend_hotspot_metrics import observe_backend_hotspot
from app.shared.database import Empresa, Usuario, obter_banco
from app.shared.security import obter_usuario_html
from app.shared.tenant_admin_policy import tenant_admin_user_portal_label

logger = logging.getLogger("tariel.admin")

URL_LOGIN_CLIENTE_PORTAL = "/cliente/login"
URL_LOGIN_INSPETOR_PORTAL = "/app/login"
URL_LOGIN_REVISOR_PORTAL = "/revisao/login"
_CHAVE_ONBOARDING_EMPRESA = "_admin_company_onboarding_bundle"
_PORTAL_LOGIN_URLS = {
    "cliente": URL_LOGIN_CLIENTE_PORTAL,
    "inspetor": URL_LOGIN_INSPETOR_PORTAL,
    "revisor": URL_LOGIN_REVISOR_PORTAL,
}


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


def _resolver_compat_admin(nome: str, fallback):
    modulo_rotas = sys.modules.get("app.domains.admin.routes")
    if modulo_rotas is None:
        return fallback
    candidato = getattr(modulo_rotas, nome, fallback)
    return candidato if callable(candidato) else fallback


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
                        "login_url": str(credencial.get("portal_login_url", ""))
                        or URL_LOGIN_CLIENTE_PORTAL,
                    }
                ],
            }
        )
        if credencial_legada is not None:
            credenciais.append(credencial_legada)
    return credenciais


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
    executar_acao_admin_redirect: Callable[..., RedirectResponse],
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

    return executar_acao_admin_redirect(
        url_erro=url_erro,
        mensagem_log="Falha inesperada ao cadastrar cliente",
        operacao=_operacao,
        admin_id=usuario_admin.id,
        email=email,
    )


def registrar_rotas_onboarding_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect: Callable[..., RedirectResponse],
) -> None:
    @roteador.get("/novo-cliente", response_class=HTMLResponse)
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

    @roteador.post("/novo-cliente")
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
            executar_acao_admin_redirect=executar_acao_admin_redirect,
        )

    @roteador.post("/cadastrar-empresa")
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
            executar_acao_admin_redirect=executar_acao_admin_redirect,
        )

    @roteador.get("/clientes/{empresa_id}/acesso-inicial", response_class=HTMLResponse)
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


__all__ = ["registrar_rotas_onboarding_cliente"]
