from __future__ import annotations

from typing import Any, Callable
from urllib.parse import urlencode


def serializar_usuario_admin(
    usuario: Any,
    *,
    sessoes_usuario: list[Any],
    max_datetime_admin: Callable[[Any], Any],
    normalizar_datetime_admin: Callable[[Any], Any],
    role_label: Callable[[int], str],
    formatar_data_admin: Callable[..., str],
) -> dict[str, Any]:
    ultimo_acesso_em = max_datetime_admin(
        normalizar_datetime_admin(getattr(sessao, "ultima_atividade_em", None))
        for sessao in sessoes_usuario
    )
    return {
        "id": int(usuario.id),
        "nome_completo": str(getattr(usuario, "nome_completo", "") or ""),
        "email": str(getattr(usuario, "email", "") or ""),
        "nivel_acesso": int(getattr(usuario, "nivel_acesso", 0) or 0),
        "role_label": role_label(int(getattr(usuario, "nivel_acesso", 0) or 0)),
        "ativo": bool(getattr(usuario, "ativo", False)),
        "status_bloqueio": bool(getattr(usuario, "status_bloqueio", False)),
        "senha_temporaria_ativa": bool(getattr(usuario, "senha_temporaria_ativa", False)),
        "crea": str(getattr(usuario, "crea", "") or ""),
        "session_count": len(sessoes_usuario),
        "ultimo_acesso_em": ultimo_acesso_em,
        "ultimo_acesso_label": formatar_data_admin(ultimo_acesso_em),
    }


def resumir_primeiro_acesso_empresa(
    *,
    empresa: Any,
    admins_cliente: list[dict[str, Any]],
) -> dict[str, Any]:
    admin_referencia = next(
        (item for item in admins_cliente if bool(item.get("senha_temporaria_ativa"))),
        admins_cliente[0] if admins_cliente else None,
    )
    login_base_url = "/cliente/login"
    if admin_referencia is None:
        return {
            "has_admin": False,
            "status_key": "missing_admin",
            "status_label": "Primeiro acesso ainda nao preparado",
            "login_base_url": login_base_url,
            "login_prefill_url": login_base_url,
            "copy_text": (
                f"Empresa: {str(getattr(empresa, 'nome_fantasia', '') or '').strip()}\n"
                "Portal da empresa: /cliente/login\n"
                "Nenhum acesso inicial foi configurado ainda."
            ),
        }

    email = str(admin_referencia.get("email") or "").strip().lower()
    prefill_query = urlencode({"email": email, "primeiro_acesso": "1"}) if email else "primeiro_acesso=1"
    status_key = (
        "password_reset_required"
        if bool(admin_referencia.get("senha_temporaria_ativa"))
        else "active"
    )
    status_label = (
        "Primeiro acesso pendente"
        if status_key == "password_reset_required"
        else "Acesso inicial ja concluido"
    )
    copy_lines = [
        f"Empresa: {str(getattr(empresa, 'nome_fantasia', '') or '').strip()}",
        "Portal da empresa: /cliente/login",
    ]
    if email:
        copy_lines.append(f"E-mail inicial: {email}")
    copy_lines.append(
        "No primeiro acesso o administrador deve definir uma nova senha."
        if status_key == "password_reset_required"
        else "O acesso inicial ja foi utilizado."
    )
    return {
        "has_admin": True,
        "status_key": status_key,
        "status_label": status_label,
        "login_base_url": login_base_url,
        "login_prefill_url": f"{login_base_url}?{prefill_query}",
        "copy_text": "\n".join(copy_lines),
    }
