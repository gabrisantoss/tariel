"""Suporte documental do pacote da Mesa Avaliadora."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.domains.mesa.contracts import (
    AnexoPackItemPacoteMesa,
    AnexoPackPacoteMesa,
    VerificacaoPublicaPacoteMesa,
)
from app.shared.database import Laudo
from app.shared.public_verification import build_public_verification_payload
from app.v2.acl.technical_case_core import build_case_status_visual_label


def _normalizar_data_utc(data: datetime | None) -> datetime | None:
    if data is None:
        return None
    if data.tzinfo is None:
        return data.replace(tzinfo=timezone.utc)
    return data.astimezone(timezone.utc)


def _texto_limpo_curto(valor: Any) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    return " ".join(texto.split())


def _resumir_texto_curto(valor: Any, *, limite: int = 180) -> str | None:
    texto = _texto_limpo_curto(valor)
    if texto is None:
        return None
    if len(texto) <= limite:
        return texto
    return f"{texto[: max(0, limite - 3)].rstrip()}..."


def _normalizar_lista_textos(valores: Any) -> list[str]:
    if isinstance(valores, str):
        valores_iteraveis = [valores]
    else:
        valores_iteraveis = list(valores or [])
    resultado: list[str] = []
    vistos: set[str] = set()
    for valor in valores_iteraveis:
        texto = _texto_limpo_curto(valor)
        if not texto:
            continue
        chave = texto.lower()
        if chave in vistos:
            continue
        vistos.add(chave)
        resultado.append(texto)
    return resultado


def build_verificacao_publica_pacote(
    laudo: Laudo,
    *,
    case_snapshot: Any | None = None,
) -> VerificacaoPublicaPacoteMesa:
    payload = build_public_verification_payload(laudo=laudo)
    status_visual_label = build_case_status_visual_label(
        lifecycle_status=getattr(case_snapshot, "case_lifecycle_status", None),
        active_owner_role=getattr(case_snapshot, "active_owner_role", None),
    )
    return VerificacaoPublicaPacoteMesa(
        codigo_hash=str(payload.get("codigo_hash") or ""),
        hash_short=str(payload.get("hash_short") or ""),
        verification_url=str(payload.get("verification_url") or ""),
        qr_payload=str(payload.get("qr_payload") or ""),
        qr_image_data_uri=_resumir_texto_curto(payload.get("qr_image_data_uri"), limite=12000),
        empresa_nome=_resumir_texto_curto(payload.get("empresa_nome"), limite=160),
        status_revisao=_resumir_texto_curto(payload.get("status_revisao"), limite=40),
        status_visual_label=_resumir_texto_curto(status_visual_label, limite=120),
        status_conformidade=_resumir_texto_curto(payload.get("status_conformidade"), limite=40),
        approved_at=_normalizar_data_utc(payload.get("approved_at")),
        approval_version=int(payload.get("approval_version") or 0) or None,
        document_outcome=_resumir_texto_curto(payload.get("document_outcome"), limite=80),
    )


def build_anexo_pack_pacote(payload: dict[str, Any] | None) -> AnexoPackPacoteMesa | None:
    if not isinstance(payload, dict):
        return None
    items = []
    for item in list(payload.get("items") or []):
        if not isinstance(item, dict):
            continue
        item_key = _texto_limpo_curto(item.get("item_key"))
        label = _texto_limpo_curto(item.get("label"))
        category = _texto_limpo_curto(item.get("category"))
        source = _texto_limpo_curto(item.get("source"))
        if not item_key or not label or not category or not source:
            continue
        items.append(
            AnexoPackItemPacoteMesa(
                item_key=item_key[:160],
                label=label[:180],
                category=category[:40],
                required=bool(item.get("required")),
                present=bool(item.get("present")),
                source=source[:40],
                summary=_resumir_texto_curto(item.get("summary"), limite=280),
                mime_type=_resumir_texto_curto(item.get("mime_type"), limite=120),
                size_bytes=int(item.get("size_bytes") or 0) if item.get("size_bytes") is not None else None,
                file_name=_resumir_texto_curto(item.get("file_name"), limite=220),
                archive_path=_resumir_texto_curto(item.get("archive_path"), limite=260),
            )
        )
    return AnexoPackPacoteMesa(
        total_items=int(payload.get("total_items") or 0),
        total_required=int(payload.get("total_required") or 0),
        total_present=int(payload.get("total_present") or 0),
        missing_required_count=int(payload.get("missing_required_count") or 0),
        document_count=int(payload.get("document_count") or 0),
        image_count=int(payload.get("image_count") or 0),
        virtual_count=int(payload.get("virtual_count") or 0),
        ready_for_issue=bool(payload.get("ready_for_issue")),
        missing_items=_normalizar_lista_textos(payload.get("missing_items")),
        items=items,
    )


__all__ = ["build_anexo_pack_pacote", "build_verificacao_publica_pacote"]
