"""Manifesto auditavel de emissao oficial NR35 Linha de Vida."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from typing import Any

from app.domains.chat.nr35_linha_vida_pdf_contract import (
    NR35_REQUIRED_PDF_SECTIONS,
    NR35_REQUIRED_PHOTO_SLOT_CONTRACTS,
    NR35_TRACEABILITY_CHAIN,
)
from app.domains.chat.nr35_linha_vida_validation import (
    NR35_FAMILY_KEY,
    NR35_TEMPLATE_KEY,
    is_nr35_linha_vida_context,
    validate_nr35_linha_vida_golden_path,
)
from app.shared.database import ApprovedCaseSnapshot, Laudo

NR35_OFFICIAL_PDF_MANIFEST_VERSION = "nr35_official_pdf_manifest_v1"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _clean_text(value: Any, *, limit: int | None = None) -> str | None:
    text = " ".join(str(value or "").strip().split())
    if not text:
        return None
    if limit is not None and len(text) > limit:
        return text[:limit].rstrip()
    return text


def _json_sha256(value: Any) -> str | None:
    if value is None:
        return None
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _dt_iso(value: Any) -> str | None:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _value_by_path(payload: dict[str, Any], path: str) -> Any:
    current: Any = payload
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def is_nr35_linha_vida_laudo(laudo: Laudo) -> bool:
    return is_nr35_linha_vida_context(
        payload=getattr(laudo, "dados_formulario", None),
        template_key=getattr(laudo, "tipo_template", None),
        catalog_family_key=getattr(laudo, "catalog_family_key", None),
    )


def extract_nr35_approved_laudo_output_snapshot(
    latest_snapshot: ApprovedCaseSnapshot | None,
) -> dict[str, Any]:
    if latest_snapshot is None:
        return {}
    payload = getattr(latest_snapshot, "laudo_output_snapshot", None)
    return deepcopy(payload) if isinstance(payload, dict) else {}


def extract_nr35_approved_payload(
    latest_snapshot: ApprovedCaseSnapshot | None,
) -> dict[str, Any]:
    snapshot = extract_nr35_approved_laudo_output_snapshot(latest_snapshot)
    payload = snapshot.get("dados_formulario")
    return deepcopy(payload) if isinstance(payload, dict) else {}


def extract_nr35_approved_report_pack(
    latest_snapshot: ApprovedCaseSnapshot | None,
) -> dict[str, Any]:
    snapshot = extract_nr35_approved_laudo_output_snapshot(latest_snapshot)
    report_pack = snapshot.get("report_pack_draft")
    return deepcopy(report_pack) if isinstance(report_pack, dict) else {}


def _reference_from_record(record: dict[str, Any]) -> str | None:
    for key in (
        "referencia_persistida",
        "referencia_anexo",
        "referencia",
        "reference",
        "resolved_evidence_id",
        "resolved_message_id",
        "message_id",
        "attachment_id",
        "file_id",
        "url",
        "path",
        "storage_path",
    ):
        value = _clean_text(record.get(key), limit=260)
        if value:
            return value
    return None


def _caption_from_record(record: dict[str, Any]) -> str | None:
    for key in (
        "legenda_tecnica",
        "legenda",
        "caption",
        "resolved_caption",
        "descricao",
        "description",
        "title",
    ):
        value = _clean_text(record.get(key), limit=400)
        if value:
            return value
    return None


def _approved_photo_slots(
    *,
    approved_payload: dict[str, Any],
    approved_report_pack: dict[str, Any],
) -> list[dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {
        str(contract["slot"]): dict(contract)
        for contract in NR35_REQUIRED_PHOTO_SLOT_CONTRACTS
    }

    payload_slots = _as_list(_as_dict(approved_payload.get("registros_fotograficos")).get("slots_obrigatorios"))
    for item in payload_slots:
        if not isinstance(item, dict):
            continue
        slot = str(item.get("slot") or item.get("slot_id") or "").strip()
        if slot in records:
            records[slot].update(item)

    for item in _as_list(approved_report_pack.get("image_slots")):
        if not isinstance(item, dict):
            continue
        slot = str(item.get("slot") or "").strip()
        if slot not in records:
            continue
        record = records[slot]
        fallback_fields = {
            "referencia_persistida": (
                "referencia_persistida",
                "referencia_anexo",
                "resolved_evidence_id",
                "resolved_message_id",
                "message_id",
                "attachment_id",
            ),
            "legenda_tecnica": ("legenda_tecnica", "resolved_caption", "caption", "title"),
            "campo_json": ("campo_json", "json_field"),
            "achado_relacionado": ("achado_relacionado", "finding_key"),
            "secao_pdf": ("secao_pdf", "pdf_section"),
        }
        for target_key, source_keys in fallback_fields.items():
            if _clean_text(record.get(target_key)):
                continue
            for source_key in source_keys:
                if _clean_text(item.get(source_key)):
                    record[target_key] = item.get(source_key)
                    break

    result: list[dict[str, Any]] = []
    for contract in NR35_REQUIRED_PHOTO_SLOT_CONTRACTS:
        slot = str(contract["slot"])
        record = records.get(slot) or {}
        result.append(
            {
                "slot": slot,
                "label": _clean_text(record.get("label") or record.get("titulo") or record.get("title"), limit=160)
                or contract["label"],
                "referencia_persistida": _reference_from_record(record),
                "legenda_tecnica": _caption_from_record(record),
                "campo_json": _clean_text(record.get("campo_json") or record.get("json_field"), limit=180)
                or contract["json_field"],
                "achado_relacionado": _clean_text(record.get("achado_relacionado") or record.get("finding_key"), limit=180)
                or contract["finding_key"],
                "secao_pdf": _clean_text(record.get("secao_pdf") or record.get("pdf_section"), limit=120)
                or contract["pdf_section"],
            }
        )
    return result


def _human_review_summary(approved_payload: dict[str, Any]) -> dict[str, Any]:
    review_meta = _as_dict(approved_payload.get("nr35_structured_review"))
    change_log = [
        {
            "path": _clean_text(item.get("path"), limit=240),
            "target": _clean_text(item.get("target"), limit=40) or "payload",
            "actor_user_id": int(item.get("actor_user_id") or 0) or None,
            "actor_name": _clean_text(item.get("actor_name"), limit=120),
            "justification": _clean_text(item.get("justification"), limit=800),
            "changed_at": _clean_text(item.get("changed_at"), limit=80),
            "resolved_issue_codes": [
                str(code).strip()
                for code in _as_list(item.get("resolved_issue_codes"))
                if str(code).strip()
            ],
        }
        for item in _as_list(review_meta.get("change_log"))
        if isinstance(item, dict)
    ]
    return {
        "contract_version": _clean_text(review_meta.get("contract_version"), limit=80),
        "status": _clean_text(review_meta.get("status"), limit=80),
        "change_count": len(change_log),
        "last_reviewed_at": _clean_text(review_meta.get("last_reviewed_at"), limit=80),
        "last_reviewed_by": _as_dict(review_meta.get("last_reviewed_by")),
        "mesa_approved_at": _clean_text(review_meta.get("mesa_approved_at"), limit=80),
        "mesa_approved_by": _as_dict(review_meta.get("mesa_approved_by")),
        "change_log": change_log,
    }


def build_nr35_linha_vida_official_pdf_manifest(
    *,
    laudo: Laudo,
    latest_snapshot: ApprovedCaseSnapshot | None,
    generated_at: str | None = None,
    primary_pdf_artifact: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not is_nr35_linha_vida_laudo(laudo):
        return None

    approved_payload = extract_nr35_approved_payload(latest_snapshot)
    approved_report_pack = extract_nr35_approved_report_pack(latest_snapshot)
    validation = validate_nr35_linha_vida_golden_path(
        payload=approved_payload,
        report_pack_draft=approved_report_pack,
        template_key=str(_value_by_path(approved_payload, "template_code") or getattr(laudo, "tipo_template", "") or NR35_TEMPLATE_KEY),
        catalog_family_key=str(_value_by_path(approved_payload, "family_key") or getattr(laudo, "catalog_family_key", "") or NR35_FAMILY_KEY),
        level="official_pdf",
    ).to_dict()
    mesa_review = _as_dict(approved_payload.get("mesa_review"))
    return {
        "manifest_version": NR35_OFFICIAL_PDF_MANIFEST_VERSION,
        "generated_at": generated_at or _now_iso(),
        "family_key": _clean_text(approved_payload.get("family_key") or getattr(laudo, "catalog_family_key", None), limit=120),
        "template_code": _clean_text(
            approved_payload.get("template_code") or approved_payload.get("template_key") or getattr(laudo, "tipo_template", None),
            limit=120,
        ),
        "schema_version": approved_payload.get("schema_version"),
        "template_version": approved_payload.get("template_version"),
        "required_pdf_sections": list(NR35_REQUIRED_PDF_SECTIONS),
        "photo_slots": _approved_photo_slots(
            approved_payload=approved_payload,
            approved_report_pack=approved_report_pack,
        ),
        "traceability_chain": NR35_TRACEABILITY_CHAIN,
        "approved_snapshot": {
            "snapshot_id": int(getattr(latest_snapshot, "id", 0) or 0) or None,
            "approval_version": int(getattr(latest_snapshot, "approval_version", 0) or 0) or None,
            "approved_at": _dt_iso(getattr(latest_snapshot, "approved_at", None)),
            "approved_by_id": int(getattr(latest_snapshot, "approved_by_id", 0) or 0) or None,
            "snapshot_hash": _clean_text(getattr(latest_snapshot, "snapshot_hash", None), limit=64),
            "approved_payload_sha256": _json_sha256(approved_payload),
            "approved_report_pack_sha256": _json_sha256(approved_report_pack),
        },
        "mesa_review": {
            "status": _clean_text(mesa_review.get("status"), limit=80),
            "aprovacao_origem": _clean_text(mesa_review.get("aprovacao_origem"), limit=80),
            "ia_aprovou_mesa": bool(mesa_review.get("ia_aprovou_mesa")),
            "aprovado_por_id": int(mesa_review.get("aprovado_por_id") or 0) or None,
            "aprovado_por_nome": _clean_text(mesa_review.get("aprovado_por_nome"), limit=120),
            "aprovado_em": _clean_text(mesa_review.get("aprovado_em"), limit=80),
        },
        "human_review": _human_review_summary(approved_payload),
        "official_pdf_validation": validation,
        "primary_pdf_artifact": dict(primary_pdf_artifact or {}),
        "final_status": _clean_text(_value_by_path(approved_payload, "conclusao.status"), limit=80),
    }


def build_nr35_linha_vida_official_pdf_blockers(
    *,
    laudo: Laudo,
    latest_snapshot: ApprovedCaseSnapshot | None,
) -> list[dict[str, Any]]:
    if not is_nr35_linha_vida_laudo(laudo):
        return []

    if latest_snapshot is None:
        return [
            {
                "code": "nr35_approved_snapshot_missing",
                "title": "Snapshot aprovado NR35 ausente",
                "message": "A emissao oficial NR35 exige snapshot do JSON aprovado pela Mesa.",
                "blocking": True,
            }
        ]

    approved_payload = extract_nr35_approved_payload(latest_snapshot)
    approved_report_pack = extract_nr35_approved_report_pack(latest_snapshot)
    blockers: list[dict[str, Any]] = []
    if not approved_payload:
        blockers.append(
            {
                "code": "nr35_approved_payload_missing",
                "title": "JSON aprovado NR35 ausente",
                "message": "O snapshot aprovado nao contem dados_formulario NR35.",
                "blocking": True,
            }
        )

    current_payload = deepcopy(getattr(laudo, "dados_formulario", None)) if isinstance(getattr(laudo, "dados_formulario", None), dict) else {}
    current_report_pack = (
        deepcopy(getattr(laudo, "report_pack_draft_json", None))
        if isinstance(getattr(laudo, "report_pack_draft_json", None), dict)
        else {}
    )
    if approved_payload and _json_sha256(current_payload) != _json_sha256(approved_payload):
        blockers.append(
            {
                "code": "nr35_approved_payload_diverged",
                "title": "JSON aprovado diverge do payload atual",
                "message": "A emissao oficial NR35 exige que o payload atual corresponda ao snapshot aprovado pela Mesa.",
                "blocking": True,
                "approved_payload_sha256": _json_sha256(approved_payload),
                "current_payload_sha256": _json_sha256(current_payload),
            }
        )
    if approved_report_pack and _json_sha256(current_report_pack) != _json_sha256(approved_report_pack):
        blockers.append(
            {
                "code": "nr35_approved_report_pack_diverged",
                "title": "Report pack aprovado diverge do atual",
                "message": "A emissao oficial NR35 exige que fotos/evidencias correspondam ao snapshot aprovado pela Mesa.",
                "blocking": True,
                "approved_report_pack_sha256": _json_sha256(approved_report_pack),
                "current_report_pack_sha256": _json_sha256(current_report_pack),
            }
        )

    validation = validate_nr35_linha_vida_golden_path(
        payload=approved_payload,
        report_pack_draft=approved_report_pack,
        template_key=str(getattr(laudo, "tipo_template", "") or "").strip() or None,
        catalog_family_key=str(getattr(laudo, "catalog_family_key", "") or "").strip() or None,
        level="official_pdf",
    )
    if not validation.ok:
        first_issue = next((issue for issue in validation.issues if issue.blocking), validation.issues[0])
        blockers.append(
            {
                "code": "nr35_approved_snapshot_validation_failed",
                "title": "Snapshot aprovado NR35 invalido",
                "message": f"Emissao oficial bloqueada pelo snapshot aprovado NR35: {first_issue.message}",
                "blocking": True,
                "validation": validation.to_dict(),
            }
        )
    return blockers


__all__ = [
    "NR35_OFFICIAL_PDF_MANIFEST_VERSION",
    "build_nr35_linha_vida_official_pdf_blockers",
    "build_nr35_linha_vida_official_pdf_manifest",
    "extract_nr35_approved_payload",
    "extract_nr35_approved_report_pack",
    "is_nr35_linha_vida_laudo",
]
