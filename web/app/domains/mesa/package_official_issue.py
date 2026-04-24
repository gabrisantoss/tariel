"""Pacote de emissao oficial da Mesa Avaliadora."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.domains.mesa.contracts import (
    EmissaoOficialAtualPacoteMesa,
    EmissaoOficialBlockerPacoteMesa,
    EmissaoOficialPacoteMesa,
    EmissaoOficialTrailEventoPacoteMesa,
    SignatarioGovernadoPacoteMesa,
)


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


def _normalizar_int_opcional(payload: dict[str, Any], chave: str) -> int | None:
    if payload.get(chave) is None:
        return None
    return int(payload.get(chave) or 0)


def _build_current_issue(payload: dict[str, Any]) -> EmissaoOficialAtualPacoteMesa | None:
    current_issue_payload = payload.get("current_issue")
    if not isinstance(current_issue_payload, dict):
        return None

    current_issue_id = int(current_issue_payload.get("id") or 0)
    current_issue_state = _texto_limpo_curto(current_issue_payload.get("issue_state"))
    current_issue_state_label = _texto_limpo_curto(current_issue_payload.get("issue_state_label"))
    if current_issue_id <= 0 or not current_issue_state or not current_issue_state_label:
        return None

    return EmissaoOficialAtualPacoteMesa(
        id=current_issue_id,
        issue_number=_resumir_texto_curto(current_issue_payload.get("issue_number"), limite=80),
        issue_state=current_issue_state[:24],
        issue_state_label=current_issue_state_label[:80],
        issued_at=_normalizar_data_utc(current_issue_payload.get("issued_at")),
        superseded_at=_normalizar_data_utc(current_issue_payload.get("superseded_at")),
        package_sha256=_resumir_texto_curto(current_issue_payload.get("package_sha256"), limite=64),
        package_filename=_resumir_texto_curto(current_issue_payload.get("package_filename"), limite=220),
        package_storage_ready=bool(current_issue_payload.get("package_storage_ready")),
        package_size_bytes=_normalizar_int_opcional(current_issue_payload, "package_size_bytes"),
        verification_hash=_resumir_texto_curto(current_issue_payload.get("verification_hash"), limite=64),
        verification_url=_resumir_texto_curto(current_issue_payload.get("verification_url"), limite=400),
        approval_snapshot_id=_normalizar_int_opcional(current_issue_payload, "approval_snapshot_id"),
        approval_version=_normalizar_int_opcional(current_issue_payload, "approval_version"),
        signatory_name=_resumir_texto_curto(current_issue_payload.get("signatory_name"), limite=160),
        signatory_function=_resumir_texto_curto(current_issue_payload.get("signatory_function"), limite=120),
        signatory_registration=_resumir_texto_curto(
            current_issue_payload.get("signatory_registration"),
            limite=80,
        ),
        issued_by_name=_resumir_texto_curto(current_issue_payload.get("issued_by_name"), limite=160),
        primary_pdf_sha256=_resumir_texto_curto(current_issue_payload.get("primary_pdf_sha256"), limite=64),
        primary_pdf_storage_version=_resumir_texto_curto(
            current_issue_payload.get("primary_pdf_storage_version"),
            limite=32,
        ),
        primary_pdf_storage_version_number=_normalizar_int_opcional(
            current_issue_payload,
            "primary_pdf_storage_version_number",
        ),
        current_primary_pdf_sha256=_resumir_texto_curto(
            current_issue_payload.get("current_primary_pdf_sha256"),
            limite=64,
        ),
        current_primary_pdf_storage_version=_resumir_texto_curto(
            current_issue_payload.get("current_primary_pdf_storage_version"),
            limite=32,
        ),
        current_primary_pdf_storage_version_number=_normalizar_int_opcional(
            current_issue_payload,
            "current_primary_pdf_storage_version_number",
        ),
        primary_pdf_diverged=bool(current_issue_payload.get("primary_pdf_diverged")),
        primary_pdf_comparison_status=_resumir_texto_curto(
            current_issue_payload.get("primary_pdf_comparison_status"),
            limite=32,
        ),
        reissue_of_issue_id=_normalizar_int_opcional(current_issue_payload, "reissue_of_issue_id"),
        reissue_of_issue_number=_resumir_texto_curto(
            current_issue_payload.get("reissue_of_issue_number"),
            limite=80,
        ),
        reissue_reason_codes=_normalizar_lista_textos(
            current_issue_payload.get("reissue_reason_codes"),
        ),
        reissue_reason_summary=_resumir_texto_curto(
            current_issue_payload.get("reissue_reason_summary"),
            limite=280,
        ),
        superseded_by_issue_id=_normalizar_int_opcional(
            current_issue_payload,
            "superseded_by_issue_id",
        ),
        superseded_by_issue_number=_resumir_texto_curto(
            current_issue_payload.get("superseded_by_issue_number"),
            limite=80,
        ),
    )


def _build_signatories(payload: dict[str, Any]) -> list[SignatarioGovernadoPacoteMesa]:
    signatories = []
    for item in list(payload.get("signatories") or []):
        if not isinstance(item, dict):
            continue
        signatory_id = int(item.get("id") or 0)
        nome = _texto_limpo_curto(item.get("nome"))
        funcao = _texto_limpo_curto(item.get("funcao"))
        status = _texto_limpo_curto(item.get("status"))
        status_label = _texto_limpo_curto(item.get("status_label"))
        if signatory_id <= 0 or not nome or not funcao or not status or not status_label:
            continue
        signatories.append(
            SignatarioGovernadoPacoteMesa(
                id=signatory_id,
                nome=nome[:160],
                funcao=funcao[:120],
                registro_profissional=_resumir_texto_curto(item.get("registro_profissional"), limite=80),
                valid_until=_normalizar_data_utc(item.get("valid_until")),
                status=status[:24],
                status_label=status_label[:80],
                ativo=bool(item.get("ativo")),
                allowed_family_keys=_normalizar_lista_textos(item.get("allowed_family_keys")),
                observacoes=_resumir_texto_curto(item.get("observacoes"), limite=280),
            )
        )
    return signatories


def _build_blockers(payload: dict[str, Any]) -> list[EmissaoOficialBlockerPacoteMesa]:
    blockers = []
    for item in list(payload.get("blockers") or []):
        if not isinstance(item, dict):
            continue
        code = _texto_limpo_curto(item.get("code"))
        title = _texto_limpo_curto(item.get("title"))
        message = _texto_limpo_curto(item.get("message"))
        if not code or not title or not message:
            continue
        blockers.append(
            EmissaoOficialBlockerPacoteMesa(
                code=code[:64],
                title=title[:120],
                message=message[:280],
                blocking=bool(item.get("blocking", True)),
            )
        )
    return blockers


def _build_audit_trail(payload: dict[str, Any]) -> list[EmissaoOficialTrailEventoPacoteMesa]:
    audit_trail = []
    for item in list(payload.get("audit_trail") or []):
        if not isinstance(item, dict):
            continue
        event_key = _texto_limpo_curto(item.get("event_key"))
        title = _texto_limpo_curto(item.get("title"))
        status = _texto_limpo_curto(item.get("status"))
        status_label = _texto_limpo_curto(item.get("status_label"))
        if not event_key or not title or not status or not status_label:
            continue
        audit_trail.append(
            EmissaoOficialTrailEventoPacoteMesa(
                event_key=event_key[:64],
                title=title[:120],
                status=status[:24],
                status_label=status_label[:80],
                summary=_resumir_texto_curto(item.get("summary"), limite=280),
                blocking=bool(item.get("blocking")),
                recorded_at=_normalizar_data_utc(item.get("recorded_at")),
            )
        )
    return audit_trail


def build_emissao_oficial_pacote(payload: dict[str, Any] | None) -> EmissaoOficialPacoteMesa | None:
    if not isinstance(payload, dict):
        return None

    issue_status = _texto_limpo_curto(payload.get("issue_status"))
    issue_status_label = _texto_limpo_curto(payload.get("issue_status_label"))
    if not issue_status or not issue_status_label:
        return None

    return EmissaoOficialPacoteMesa(
        issue_status=issue_status[:32],
        issue_status_label=issue_status_label[:120],
        document_visual_state=_resumir_texto_curto(payload.get("document_visual_state"), limite=32),
        document_visual_state_label=_resumir_texto_curto(payload.get("document_visual_state_label"), limite=120),
        ready_for_issue=bool(payload.get("ready_for_issue")),
        requires_human_signature=bool(payload.get("requires_human_signature", True)),
        compatible_signatory_count=int(payload.get("compatible_signatory_count") or 0),
        eligible_signatory_count=int(payload.get("eligible_signatory_count") or 0),
        blocker_count=int(payload.get("blocker_count") or 0),
        signature_status=_resumir_texto_curto(payload.get("signature_status"), limite=32),
        signature_status_label=_resumir_texto_curto(payload.get("signature_status_label"), limite=120),
        verification_url=_resumir_texto_curto(payload.get("verification_url"), limite=400),
        pdf_present=bool(payload.get("pdf_present")),
        public_verification_present=bool(payload.get("public_verification_present")),
        signatories=_build_signatories(payload),
        blockers=_build_blockers(payload),
        audit_trail=_build_audit_trail(payload),
        already_issued=bool(payload.get("already_issued")),
        reissue_recommended=bool(payload.get("reissue_recommended")),
        issue_action_label=_resumir_texto_curto(payload.get("issue_action_label"), limite=120),
        issue_action_enabled=bool(payload.get("issue_action_enabled")),
        delivery_manifest=(
            dict(payload.get("delivery_manifest") or {})
            if isinstance(payload.get("delivery_manifest"), dict)
            else {}
        ),
        current_issue=_build_current_issue(payload),
    )
