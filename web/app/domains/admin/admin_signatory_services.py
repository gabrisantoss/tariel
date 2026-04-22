from __future__ import annotations

from datetime import datetime
from typing import Any


def normalizar_validade_signatario(valor: str | datetime | None, *, dependencies: dict[str, Any]) -> datetime | None:
    return dependencies["catalog_tenant_normalizar_validade_signatario"](
        valor,
        normalizar_texto_opcional=dependencies["normalizar_texto_opcional"],
    )


def normalizar_family_keys_signatario(
    family_keys: list[str] | tuple[str, ...] | str | None,
    *,
    dependencies: dict[str, Any],
) -> list[str]:
    return dependencies["catalog_tenant_normalizar_family_keys_signatario"](
        family_keys,
        normalizar_lista_json_canonica=dependencies["normalizar_lista_json_canonica"],
        normalizar_chave_catalogo=dependencies["normalizar_chave_catalogo"],
    )


def status_signatario_governado(
    *,
    ativo: bool,
    valid_until: datetime | None,
    dependencies: dict[str, Any],
) -> dict[str, str]:
    return dependencies["catalog_tenant_status_signatario"](
        ativo=ativo,
        valid_until=valid_until,
        normalizar_datetime_admin=dependencies["normalizar_datetime_admin"],
        agora_utc=dependencies["agora_utc"],
    )


def serializar_signatario_governado_admin(
    signatario,
    *,
    family_labels: dict[str, str],
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    return dependencies["catalog_tenant_serializar_signatario"](
        signatario,
        family_labels=family_labels,
        normalizar_family_keys_signatario_fn=dependencies["normalizar_family_keys_signatario_fn"],
        status_signatario_governado_fn=dependencies["status_signatario_governado_fn"],
        normalizar_datetime_admin=dependencies["normalizar_datetime_admin"],
        formatar_data_admin=dependencies["formatar_data_admin"],
        normalizar_texto_opcional=dependencies["normalizar_texto_opcional"],
    )


def upsert_signatario_governado_laudo(
    db,
    *,
    tenant_id: int,
    nome: str,
    funcao: str,
    registro_profissional: str = "",
    valid_until: str | datetime | None = None,
    allowed_family_keys: list[str] | tuple[str, ...] | str | None = None,
    observacoes: str = "",
    ativo: bool = True,
    signatario_id: int | None = None,
    criado_por_id: int | None = None,
    dependencies: dict[str, Any],
):
    return dependencies["catalog_tenant_upsert_signatario"](
        db,
        tenant_id=tenant_id,
        nome=nome,
        funcao=funcao,
        registro_profissional=registro_profissional,
        valid_until=valid_until,
        allowed_family_keys=allowed_family_keys,
        observacoes=observacoes,
        ativo=ativo,
        signatario_id=signatario_id,
        criado_por_id=criado_por_id,
        buscar_empresa=dependencies["buscar_empresa"],
        signatario_model=dependencies["signatario_model"],
        normalizar_texto_curto=dependencies["normalizar_texto_curto"],
        normalizar_texto_opcional=dependencies["normalizar_texto_opcional"],
        normalizar_validade_signatario_fn=dependencies["normalizar_validade_signatario_fn"],
        normalizar_family_keys_signatario_fn=dependencies["normalizar_family_keys_signatario_fn"],
        flush_ou_rollback_integridade=dependencies["flush_ou_rollback_integridade"],
        logger_operacao=dependencies["logger_operacao"],
    )
