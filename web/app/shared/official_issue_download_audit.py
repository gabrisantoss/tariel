"""Auditoria sanitizada de downloads de emissao oficial."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.shared.database import EmissaoOficialLaudo, Laudo, RegistroAuditoriaEmpresa, Usuario, agora_utc

logger = logging.getLogger("tariel.official_issue_download_audit")

OFFICIAL_ISSUE_DOWNLOAD_ACTION = "emissao_oficial_download"


def _int_or_none(value: Any) -> int | None:
    try:
        normalized = int(value or 0)
    except (TypeError, ValueError):
        return None
    return normalized or None


def _clean_text(value: object, *, limit: int = 240) -> str:
    return str(value or "").strip()[:limit]


def _clean_sha256(value: object) -> str | None:
    normalized = _clean_text(value, limit=64)
    return normalized if len(normalized) == 64 else None


def registrar_auditoria_download_emissao_oficial(
    banco: Session,
    *,
    usuario: Usuario,
    laudo: Laudo,
    record: EmissaoOficialLaudo | None,
    artifact_kind: str,
    surface: str,
    route_path: str,
    filename: str,
    media_type: str,
    primary_pdf_sha256: str | None = None,
) -> RegistroAuditoriaEmpresa | None:
    """Registra download oficial sem expor paths locais ou payload sensivel."""

    empresa_id = (
        _int_or_none(getattr(laudo, "empresa_id", None))
        or _int_or_none(getattr(record, "tenant_id", None))
        or _int_or_none(getattr(usuario, "empresa_id", None))
    )
    if empresa_id is None:
        logger.warning(
            "official_issue_download_audit_skipped_without_tenant | laudo_id=%s user_id=%s",
            getattr(laudo, "id", None),
            getattr(usuario, "id", None),
        )
        return None

    issue_number = _clean_text(getattr(record, "issue_number", None), limit=80)
    payload: dict[str, Any] = {
        "laudo_id": _int_or_none(getattr(laudo, "id", None)),
        "tenant_id": empresa_id,
        "issue_id": _int_or_none(getattr(record, "id", None)),
        "issue_number": issue_number or None,
        "issue_state": _clean_text(getattr(record, "issue_state", None), limit=30) or None,
        "artifact_kind": _clean_text(artifact_kind, limit=80),
        "surface": _clean_text(surface, limit=30),
        "route_path": _clean_text(route_path, limit=260),
        "filename": _clean_text(filename, limit=220),
        "media_type": _clean_text(media_type, limit=120),
        "package_sha256": _clean_sha256(getattr(record, "package_sha256", None)),
        "primary_pdf_sha256": _clean_sha256(primary_pdf_sha256),
        "approval_snapshot_id": _int_or_none(getattr(record, "approval_snapshot_id", None)),
    }
    payload = {key: value for key, value in payload.items() if value not in (None, "")}

    try:
        timestamp = agora_utc()
        registro = RegistroAuditoriaEmpresa(
            empresa_id=empresa_id,
            ator_usuario_id=_int_or_none(getattr(usuario, "id", None)),
            portal=_clean_text(surface, limit=30) or "cliente",
            acao=OFFICIAL_ISSUE_DOWNLOAD_ACTION,
            resumo=f"Download oficial do laudo #{payload.get('laudo_id') or ''}.".strip(),
            detalhe=(
                f"{payload.get('artifact_kind', 'artefato')} "
                f"{issue_number or payload.get('issue_id') or 'sem-numero'}"
            )[:400],
            payload_json=payload,
            criado_em=timestamp,
            atualizado_em=timestamp,
        )
        banco.add(registro)
        banco.flush()
        return registro
    except Exception:
        banco.rollback()
        logger.warning(
            "official_issue_download_audit_failed | laudo_id=%s issue_id=%s surface=%s artifact_kind=%s",
            getattr(laudo, "id", None),
            getattr(record, "id", None),
            surface,
            artifact_kind,
            exc_info=True,
        )
        return None


__all__ = [
    "OFFICIAL_ISSUE_DOWNLOAD_ACTION",
    "registrar_auditoria_download_emissao_oficial",
]
