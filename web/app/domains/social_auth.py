"""OAuth/OIDC social login routes shared by web portals."""

from __future__ import annotations

from dataclasses import dataclass
import logging
import secrets
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.settings import env_bool, env_str
from app.shared.database import Usuario, commit_ou_rollback_operacional, obter_banco
from app.shared.security import (
    PORTAL_ADMIN,
    PORTAL_CLIENTE,
    PORTAL_INSPETOR,
    PORTAL_REVISOR,
    criar_sessao,
    definir_sessao_portal,
    encerrar_sessao,
    nivel_acesso_sessao_portal,
    obter_dados_sessao_portal,
    usuario_tem_acesso_portal,
    usuario_tem_bloqueio_ativo,
)

logger = logging.getLogger("tariel.social_auth")

roteador_social_auth = APIRouter(prefix="/auth/social")

_STATE_KEY = "social_login_state"
_PORTAL_KEY = "social_login_portal"
_PROVIDER_KEY = "social_login_provider"
_TIMEOUT_SECONDS = 12.0
_DEFAULT_SCOPES = "openid email profile"
_PROVIDER_SLUGS = {"google", "microsoft"}
_PORTAL_ALIASES = {
    "admin": PORTAL_ADMIN,
    "admin-ceo": PORTAL_ADMIN,
    "ceo": PORTAL_ADMIN,
    "cliente": PORTAL_CLIENTE,
    "admin-cliente": PORTAL_CLIENTE,
    "app": PORTAL_INSPETOR,
    "inspetor": PORTAL_INSPETOR,
    "chat": PORTAL_INSPETOR,
    "revisao": PORTAL_REVISOR,
    "revisor": PORTAL_REVISOR,
    "mesa": PORTAL_REVISOR,
}
_LOGIN_URLS = {
    PORTAL_ADMIN: "/admin/login",
    PORTAL_CLIENTE: "/cliente/login",
    PORTAL_INSPETOR: "/app/login",
    PORTAL_REVISOR: "/revisao/login",
}
_SUCCESS_URLS = {
    PORTAL_ADMIN: "/admin/painel",
    PORTAL_CLIENTE: "/cliente/painel",
    PORTAL_INSPETOR: "/app/",
    PORTAL_REVISOR: "/revisao/painel",
}


@dataclass(frozen=True, slots=True)
class SocialProviderConfig:
    provider: str
    label: str
    client_id: str
    client_secret: str
    scopes: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    enabled: bool


@dataclass(frozen=True, slots=True)
class SocialIdentity:
    provider: str
    subject: str
    email: str
    name: str
    raw: dict[str, Any]


def _env_primeiro_valor(*nomes: str) -> str:
    for nome in nomes:
        valor = env_str(nome, "")
        if valor:
            return valor
    return ""


def _env_bool_configuravel(nome: str, padrao: bool) -> bool:
    bruto = env_str(nome, "")
    if not bruto:
        return padrao
    return env_bool(nome, padrao)


def _normalizar_provider(provider: str | None) -> str:
    valor = str(provider or "").strip().lower()
    if valor in _PROVIDER_SLUGS:
        return valor
    if valor in {"ms", "azure", "entra"}:
        return "microsoft"
    return ""


def _normalizar_portal(portal: str | None) -> str:
    valor = str(portal or "").strip().lower()
    return _PORTAL_ALIASES.get(valor, "")


def _normalizar_email(valor: str | None) -> str:
    email = str(valor or "").strip().lower()
    if not email or "@" not in email or len(email) > 254:
        raise ValueError("E-mail invalido retornado pelo provedor.")
    return email


def _normalizar_subject(valor: str | None) -> str:
    subject = str(valor or "").strip()
    if not subject or len(subject) > 255:
        raise ValueError("Identificador invalido retornado pelo provedor.")
    return subject


def _microsoft_tenant() -> str:
    tenant = env_str("SOCIAL_LOGIN_MICROSOFT_TENANT", "common") or "common"
    tenant = tenant.strip().strip("/")
    if not tenant or "/" in tenant or "\\" in tenant:
        return "common"
    return tenant


def _provider_config(provider: str) -> SocialProviderConfig | None:
    provider_norm = _normalizar_provider(provider)
    if provider_norm == "google":
        client_id = _env_primeiro_valor(
            "SOCIAL_LOGIN_GOOGLE_CLIENT_ID",
            "GOOGLE_OAUTH_CLIENT_ID",
        )
        client_secret = _env_primeiro_valor(
            "SOCIAL_LOGIN_GOOGLE_CLIENT_SECRET",
            "GOOGLE_OAUTH_CLIENT_SECRET",
        )
        configured = bool(client_id and client_secret)
        return SocialProviderConfig(
            provider="google",
            label="Google",
            client_id=client_id,
            client_secret=client_secret,
            scopes=env_str("SOCIAL_LOGIN_GOOGLE_SCOPES", _DEFAULT_SCOPES) or _DEFAULT_SCOPES,
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            enabled=configured and _env_bool_configuravel("SOCIAL_LOGIN_GOOGLE_ENABLED", True),
        )

    if provider_norm == "microsoft":
        tenant = _microsoft_tenant()
        client_id = _env_primeiro_valor(
            "SOCIAL_LOGIN_MICROSOFT_CLIENT_ID",
            "MICROSOFT_OAUTH_CLIENT_ID",
            "AZURE_CLIENT_ID",
        )
        client_secret = _env_primeiro_valor(
            "SOCIAL_LOGIN_MICROSOFT_CLIENT_SECRET",
            "MICROSOFT_OAUTH_CLIENT_SECRET",
            "AZURE_CLIENT_SECRET",
        )
        configured = bool(client_id and client_secret)
        return SocialProviderConfig(
            provider="microsoft",
            label="Microsoft",
            client_id=client_id,
            client_secret=client_secret,
            scopes=env_str("SOCIAL_LOGIN_MICROSOFT_SCOPES", _DEFAULT_SCOPES) or _DEFAULT_SCOPES,
            authorize_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
            token_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            userinfo_url="https://graph.microsoft.com/oidc/userinfo",
            enabled=configured and _env_bool_configuravel("SOCIAL_LOGIN_MICROSOFT_ENABLED", True),
        )

    return None


def _redirect_uri(request: Request, provider: str) -> str:
    base_url = env_str("SOCIAL_LOGIN_REDIRECT_BASE_URL", "").rstrip("/")
    if base_url:
        return f"{base_url}/auth/social/{provider}/callback"
    return str(request.url_for("callback_login_social", provider=provider))


def _salvar_fluxo_social(request: Request, *, portal: str, provider: str) -> str:
    state = secrets.token_urlsafe(32)
    request.session[_STATE_KEY] = state
    request.session[_PORTAL_KEY] = portal
    request.session[_PROVIDER_KEY] = provider
    return state


def _limpar_fluxo_social(request: Request) -> None:
    request.session.pop(_STATE_KEY, None)
    request.session.pop(_PORTAL_KEY, None)
    request.session.pop(_PROVIDER_KEY, None)


def _estado_social_valido(request: Request, *, provider: str, state: str) -> bool:
    state_sessao = str(request.session.get(_STATE_KEY, "") or "").strip()
    provider_sessao = _normalizar_provider(request.session.get(_PROVIDER_KEY))
    state_candidato = str(state or "").strip()
    return bool(
        state_sessao
        and state_candidato
        and provider_sessao == provider
        and secrets.compare_digest(state_sessao, state_candidato)
    )


def _portal_fluxo_social(request: Request) -> str:
    return _normalizar_portal(request.session.get(_PORTAL_KEY))


def _render_erro_portal(
    request: Request,
    *,
    portal: str,
    mensagem: str,
    status_code: int,
) -> HTMLResponse | RedirectResponse:
    if portal == PORTAL_ADMIN:
        from app.domains.admin.portal_support import _render_login

        return _render_login(request, erro=mensagem, status_code=status_code)

    if portal == PORTAL_CLIENTE:
        from app.domains.cliente.route_support import _render_login_cliente

        return _render_login_cliente(request, erro=mensagem, status_code=status_code)

    if portal == PORTAL_INSPETOR:
        from app.domains.chat.app_context import templates
        from app.domains.chat.session_helpers import contexto_base

        return templates.TemplateResponse(
            request,
            "login_app.html",
            {**contexto_base(request), "erro": mensagem},
            status_code=status_code,
        )

    if portal == PORTAL_REVISOR:
        from app.domains.revisor.base import _render_login_revisor

        return _render_login_revisor(request, erro=mensagem, status_code=status_code)

    return RedirectResponse(url="/entrar", status_code=status.HTTP_303_SEE_OTHER)


async def _trocar_code_por_token(
    *,
    config: SocialProviderConfig,
    code: str,
    redirect_uri: str,
) -> dict[str, Any]:
    payload = {
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        resposta = await client.post(config.token_url, data=payload)
        resposta.raise_for_status()
        dados = resposta.json()
    if not isinstance(dados, dict) or not dados.get("access_token"):
        raise ValueError("Token ausente na resposta do provedor.")
    return dados


async def _buscar_userinfo(*, config: SocialProviderConfig, access_token: str) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        resposta = await client.get(config.userinfo_url, headers=headers)
        resposta.raise_for_status()
        dados = resposta.json()
    if not isinstance(dados, dict):
        raise ValueError("Perfil invalido retornado pelo provedor.")
    return dados


def _resolver_email_userinfo(provider: str, userinfo: dict[str, Any]) -> str:
    candidatos = [
        userinfo.get("email"),
        userinfo.get("preferred_username") if provider == "microsoft" else None,
        userinfo.get("upn") if provider == "microsoft" else None,
    ]
    for candidato in candidatos:
        if candidato:
            return _normalizar_email(str(candidato))
    raise ValueError("O provedor não retornou um e-mail para esta conta.")


async def _resolver_identidade_social(
    *,
    config: SocialProviderConfig,
    code: str,
    redirect_uri: str,
) -> SocialIdentity:
    token = await _trocar_code_por_token(config=config, code=code, redirect_uri=redirect_uri)
    userinfo = await _buscar_userinfo(config=config, access_token=str(token["access_token"]))

    if config.provider == "google" and userinfo.get("email_verified") is False:
        raise ValueError("O Google não marcou este e-mail como verificado.")

    subject = _normalizar_subject(userinfo.get("sub"))
    email = _resolver_email_userinfo(config.provider, userinfo)
    nome = str(userinfo.get("name") or userinfo.get("given_name") or "").strip()
    return SocialIdentity(
        provider=config.provider,
        subject=subject,
        email=email,
        name=nome,
        raw=userinfo,
    )


def _usuario_permite_provider_tenant(usuario: Usuario, provider: str) -> bool:
    if not _env_bool_configuravel("SOCIAL_LOGIN_REQUIRE_PROVIDER_FLAG", False):
        return True
    if provider == "google":
        return bool(getattr(usuario, "can_google_login", False))
    if provider == "microsoft":
        return bool(getattr(usuario, "can_microsoft_login", False))
    return False


def _buscar_usuario_por_email(banco: Session, email: str) -> Usuario | None:
    email_norm = _normalizar_email(email)
    return banco.scalar(select(Usuario).where(func.lower(Usuario.email) == email_norm))


def _registrar_login_sucesso(request: Request, banco: Session, usuario: Usuario) -> None:
    if hasattr(usuario, "registrar_login_sucesso"):
        try:
            usuario.registrar_login_sucesso(ip=request.client.host if request.client else None)
        except Exception:
            logger.warning(
                "Falha ao registrar sucesso de login social | usuario_id=%s",
                getattr(usuario, "id", None),
                exc_info=True,
            )
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao confirmar login social.",
    )


def _nome_usuario(usuario: Usuario, fallback: str) -> str:
    return (
        str(getattr(usuario, "nome", "") or "").strip()
        or str(getattr(usuario, "nome_completo", "") or "").strip()
        or f"{fallback} #{usuario.id}"
    )


def _finalizar_cliente(request: Request, banco: Session, usuario: Usuario) -> RedirectResponse:
    from app.domains.cliente.route_support import URL_DASHBOARD, _registrar_sessao_cliente

    _registrar_login_sucesso(request, banco, usuario)
    _registrar_sessao_cliente(request, usuario, lembrar=False)
    return RedirectResponse(url=URL_DASHBOARD, status_code=status.HTTP_303_SEE_OTHER)


def _finalizar_inspetor(request: Request, banco: Session, usuario: Usuario) -> RedirectResponse:
    from app.domains.chat.session_helpers import CHAVE_CSRF_INSPETOR

    token_anterior = obter_dados_sessao_portal(request.session, portal=PORTAL_INSPETOR).get("token")
    if token_anterior:
        encerrar_sessao(token_anterior)

    _registrar_login_sucesso(request, banco, usuario)
    token = criar_sessao(int(usuario.id), lembrar=False)
    definir_sessao_portal(
        request.session,
        portal=PORTAL_INSPETOR,
        token=token,
        usuario_id=int(usuario.id),
        empresa_id=int(usuario.empresa_id),
        nivel_acesso=nivel_acesso_sessao_portal(PORTAL_INSPETOR) or int(usuario.nivel_acesso),
        nome=_nome_usuario(usuario, "Inspetor"),
    )
    request.session[CHAVE_CSRF_INSPETOR] = secrets.token_urlsafe(32)
    return RedirectResponse(url=_SUCCESS_URLS[PORTAL_INSPETOR], status_code=status.HTTP_303_SEE_OTHER)


def _finalizar_revisor(request: Request, banco: Session, usuario: Usuario) -> RedirectResponse:
    from app.domains.revisor.common import CHAVE_CSRF_REVISOR

    token_anterior = obter_dados_sessao_portal(request.session, portal=PORTAL_REVISOR).get("token")
    if token_anterior:
        encerrar_sessao(token_anterior)

    _registrar_login_sucesso(request, banco, usuario)
    token = criar_sessao(int(usuario.id), lembrar=False)
    definir_sessao_portal(
        request.session,
        portal=PORTAL_REVISOR,
        token=token,
        usuario_id=int(usuario.id),
        empresa_id=int(usuario.empresa_id),
        nivel_acesso=nivel_acesso_sessao_portal(PORTAL_REVISOR) or int(usuario.nivel_acesso),
        nome=_nome_usuario(usuario, "Revisor"),
    )
    request.session[CHAVE_CSRF_REVISOR] = secrets.token_urlsafe(32)
    return RedirectResponse(url=_SUCCESS_URLS[PORTAL_REVISOR], status_code=status.HTTP_303_SEE_OTHER)


def _finalizar_admin(
    request: Request,
    banco: Session,
    identidade: SocialIdentity,
) -> RedirectResponse | HTMLResponse:
    from app.domains.admin.routes import _admin_mfa_obrigatorio, _finalizar_login_admin
    from app.domains.admin.portal_support import _registrar_fluxo_mfa_pendente
    from app.domains.admin.services import (
        autenticar_identidade_admin,
        registrar_auditoria_identidade_admin,
    )

    try:
        resultado = autenticar_identidade_admin(
            banco,
            provider=identidade.provider,
            email=identidade.email,
            subject=identidade.subject,
        )
    except ValueError:
        return _render_erro_portal(
            request,
            portal=PORTAL_ADMIN,
            mensagem="A resposta do provedor de identidade veio incompleta. Refaça o login corporativo.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not resultado.authorized or resultado.user is None:
        registrar_auditoria_identidade_admin(
            banco,
            acao="admin_identity_denied",
            resumo=f"Login {identidade.provider} negado no Admin-CEO",
            detalhe=resultado.message,
            provider=identidade.provider,
            email=identidade.email or "desconhecido",
            reason=resultado.reason,
            usuario=resultado.user,
            subject=identidade.subject,
        )
        commit_ou_rollback_operacional(
            banco,
            logger_operacao=logger,
            mensagem_erro="Falha ao registrar auditoria de negação no login social admin.",
        )
        return _render_erro_portal(
            request,
            portal=PORTAL_ADMIN,
            mensagem=resultado.message,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    usuario = resultado.user
    registrar_auditoria_identidade_admin(
        banco,
        acao="admin_identity_authenticated",
        resumo=f"Login {identidade.provider} autorizado no Admin-CEO",
        detalhe="Identidade corporativa validada pelo OAuth/OIDC local sem autoprovisionamento.",
        provider=identidade.provider,
        email=identidade.email,
        reason=resultado.reason,
        usuario=usuario,
        actor_user_id=usuario.id,
        subject=identidade.subject,
    )
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao concluir login social admin.",
    )

    if not _admin_mfa_obrigatorio(usuario):
        return _finalizar_login_admin(
            request=request,
            banco=banco,
            usuario=usuario,
            provider=identidade.provider,
            lembrar=False,
            subject=identidade.subject,
        )

    _registrar_fluxo_mfa_pendente(
        request,
        usuario_id=usuario.id,
        provider=identidade.provider,
        lembrar=False,
    )
    if bool(getattr(usuario, "mfa_enrolled_at", None)) and bool(getattr(usuario, "mfa_secret_b32", None)):
        return RedirectResponse(url="/admin/mfa/challenge", status_code=status.HTTP_303_SEE_OTHER)
    return RedirectResponse(url="/admin/mfa/setup", status_code=status.HTTP_303_SEE_OTHER)


def _finalizar_portal(
    request: Request,
    banco: Session,
    *,
    portal: str,
    identidade: SocialIdentity,
) -> RedirectResponse | HTMLResponse:
    if portal == PORTAL_ADMIN:
        return _finalizar_admin(request, banco, identidade)

    usuario = _buscar_usuario_por_email(banco, identidade.email)
    if usuario is None:
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="Conta confirmada, mas este e-mail ainda não existe na Tariel. Peça liberação ao administrador.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if not usuario_tem_acesso_portal(usuario, portal):
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="Conta confirmada, mas este e-mail não está liberado para este portal.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if not _usuario_permite_provider_tenant(usuario, identidade.provider):
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="Conta confirmada, mas este método de login ainda não está liberado para seu usuário.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if usuario_tem_bloqueio_ativo(usuario):
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="Acesso bloqueado. Contate o administrador da empresa.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if portal == PORTAL_CLIENTE:
        return _finalizar_cliente(request, banco, usuario)
    if portal == PORTAL_INSPETOR:
        return _finalizar_inspetor(request, banco, usuario)
    if portal == PORTAL_REVISOR:
        return _finalizar_revisor(request, banco, usuario)

    return RedirectResponse(url="/entrar", status_code=status.HTTP_303_SEE_OTHER)


@roteador_social_auth.get("/{portal}/{provider}/start")
async def iniciar_login_social(
    request: Request,
    portal: str,
    provider: str,
):
    portal_norm = _normalizar_portal(portal)
    provider_norm = _normalizar_provider(provider)
    if not portal_norm or not provider_norm:
        return RedirectResponse(url="/entrar", status_code=status.HTTP_303_SEE_OTHER)

    config = _provider_config(provider_norm)
    if not config or not config.enabled:
        return _render_erro_portal(
            request,
            portal=portal_norm,
            mensagem=(
                f"Login com {provider_norm.title()} ainda não está configurado. "
                "Informe Client ID e Client Secret no ambiente local."
            ),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    state = _salvar_fluxo_social(request, portal=portal_norm, provider=provider_norm)
    redirect_uri = _redirect_uri(request, provider_norm)
    params = {
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": config.scopes,
        "state": state,
        "prompt": "select_account",
    }
    query = httpx.QueryParams(params)
    return RedirectResponse(url=f"{config.authorize_url}?{query}", status_code=status.HTTP_303_SEE_OTHER)


@roteador_social_auth.get("/{provider}/callback", name="callback_login_social")
async def callback_login_social(
    request: Request,
    provider: str,
    state: str = "",
    code: str = "",
    error: str = "",
    error_description: str = "",
    banco: Session = Depends(obter_banco),
):
    provider_norm = _normalizar_provider(provider)
    portal = _portal_fluxo_social(request)
    if not portal:
        _limpar_fluxo_social(request)
        return RedirectResponse(url="/entrar", status_code=status.HTTP_303_SEE_OTHER)

    if not provider_norm or not _estado_social_valido(request, provider=provider_norm, state=state):
        _limpar_fluxo_social(request)
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="Fluxo de login expirado ou inválido. Inicie o acesso novamente.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if error:
        _limpar_fluxo_social(request)
        detalhe = str(error_description or error or "").strip()
        logger.info("Provedor social retornou erro | provider=%s | error=%s", provider_norm, detalhe)
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="O provedor cancelou ou recusou o login. Tente novamente.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if not code:
        _limpar_fluxo_social(request)
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="O provedor não retornou o código de autorização. Refaça o login.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    config = _provider_config(provider_norm)
    if not config or not config.enabled:
        _limpar_fluxo_social(request)
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem=f"Login com {provider_norm.title()} ainda não está configurado neste ambiente.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        identidade = await _resolver_identidade_social(
            config=config,
            code=code,
            redirect_uri=_redirect_uri(request, provider_norm),
        )
    except (ValueError, httpx.HTTPError) as erro:
        _limpar_fluxo_social(request)
        logger.warning(
            "Falha ao confirmar identidade social | provider=%s | erro=%s",
            provider_norm,
            erro,
            exc_info=True,
        )
        return _render_erro_portal(
            request,
            portal=portal,
            mensagem="Não foi possível confirmar sua identidade no provedor. Tente novamente.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    try:
        resposta = _finalizar_portal(request, banco, portal=portal, identidade=identidade)
    finally:
        _limpar_fluxo_social(request)
    return resposta


__all__ = ["roteador_social_auth"]
