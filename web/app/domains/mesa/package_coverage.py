"""Mapa de cobertura do pacote da Revisão Técnica."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.mesa.contracts import (
    CoverageMapItemPacoteMesa,
    CoverageMapPacoteMesa,
)
from app.shared.database import EvidenceValidation, Laudo

COVERAGE_STATUS_PRIORITY = {
    "missing": 0,
    "irregular": 1,
    "collected": 2,
    "accepted": 3,
    "pending": 4,
}


def _texto_limpo_curto(valor: Any) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    return " ".join(texto.split())


def _dict_payload(valor: Any) -> dict[str, Any]:
    return dict(valor) if isinstance(valor, dict) else {}


def _list_payload(valor: Any) -> list[Any]:
    return list(valor) if isinstance(valor, list) else []


def _resumir_texto_curto(valor: Any, *, limite: int = 180) -> str | None:
    texto = _texto_limpo_curto(valor)
    if texto is None:
        return None
    if len(texto) <= limite:
        return texto
    return f"{texto[: max(0, limite - 3)].rstrip()}..."


def _humanizar_slug(valor: Any) -> str:
    texto = str(valor or "").strip().replace("_", " ")
    if not texto:
        return ""
    return " ".join(parte.capitalize() for parte in texto.split())


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


def _coverage_item_base(
    *,
    evidence_key: str,
    title: str,
    kind: str,
    required: bool,
    source_status: str | None = None,
    summary: str | None = None,
    failure_reasons: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "evidence_key": evidence_key,
        "title": title,
        "kind": kind,
        "required": required,
        "source_status": source_status,
        "summary": summary,
        "failure_reasons": list(failure_reasons or []),
        "operational_status": None,
        "mesa_status": None,
        "component_type": None,
        "view_angle": None,
        "quality_score": None,
        "coherence_score": None,
        "replacement_evidence_key": None,
        "status": "pending",
    }


def _coverage_item_title_from_evidence_key(evidence_key: str) -> str:
    if evidence_key.startswith("slot:"):
        return _humanizar_slug(evidence_key.split(":", 1)[1])
    if evidence_key.startswith("gate:"):
        parts = evidence_key.split(":", 2)
        if len(parts) >= 3:
            return _humanizar_slug(parts[2])
    return _humanizar_slug(evidence_key)


def _coverage_item_status(item: dict[str, Any]) -> tuple[str, bool]:
    source_status = str(item.get("source_status") or "").strip().lower()
    operational_status = str(item.get("operational_status") or "").strip().lower()
    mesa_status = str(item.get("mesa_status") or "").strip().lower()
    required = bool(item.get("required"))
    failure_reasons = list(item.get("failure_reasons") or [])
    collected = (
        source_status == "resolved"
        or bool(item.get("replacement_evidence_key"))
        or operational_status in {"ok", "irregular", "replaced"}
        or item.get("quality_score") is not None
        or item.get("coherence_score") is not None
    )

    if operational_status == "ok" or mesa_status == "accepted":
        return "accepted", collected
    if operational_status == "irregular":
        return "irregular", collected
    if required and (source_status in {"missing", "pending"} or (failure_reasons and not collected) or not collected):
        return "missing", collected
    if collected:
        return "collected", True
    return "pending", False


def build_coverage_map_pacote(
    banco: Session,
    *,
    laudo: Laudo,
) -> CoverageMapPacoteMesa | None:
    report_pack = getattr(laudo, "report_pack_draft_json", None)
    draft = report_pack if isinstance(report_pack, dict) else {}
    quality_gates = _dict_payload(draft.get("quality_gates"))
    final_validation_mode = _texto_limpo_curto(quality_gates.get("final_validation_mode"))
    validations = (
        banco.execute(
            select(EvidenceValidation)
            .where(EvidenceValidation.laudo_id == int(laudo.id))
            .order_by(EvidenceValidation.id.asc())
        )
        .scalars()
        .all()
    )

    items_by_key: dict[str, dict[str, Any]] = {}
    for slot in list(draft.get("image_slots") or []):
        if not isinstance(slot, dict):
            continue
        slot_code = _texto_limpo_curto(slot.get("slot"))
        if not slot_code:
            continue
        evidence_key = f"slot:{slot_code}"
        items_by_key[evidence_key] = _coverage_item_base(
            evidence_key=evidence_key,
            title=_texto_limpo_curto(slot.get("title")) or _humanizar_slug(slot_code),
            kind="image_slot",
            required=bool(slot.get("required")),
            source_status=_texto_limpo_curto(slot.get("status")),
            summary=_resumir_texto_curto(slot.get("resolved_caption")),
            failure_reasons=_normalizar_lista_textos(slot.get("missing_evidence")),
        )

    for index, item in enumerate(_list_payload(quality_gates.get("missing_evidence")), start=1):
        if not isinstance(item, dict):
            continue
        kind = _texto_limpo_curto(item.get("kind")) or "gate"
        code = _texto_limpo_curto(item.get("code")) or f"missing_{index}"
        evidence_key = f"gate:{kind}:{code}"
        items_by_key.setdefault(
            evidence_key,
            _coverage_item_base(
                evidence_key=evidence_key,
                title=_resumir_texto_curto(item.get("message"), limite=180) or _humanizar_slug(code),
                kind=kind,
                required=True,
                source_status="missing",
                summary=_resumir_texto_curto(item.get("message"), limite=280),
                failure_reasons=_normalizar_lista_textos([item.get("code")]),
            ),
        )

    for validation in validations:
        validation_evidence_key = _texto_limpo_curto(validation.evidence_key)
        if not validation_evidence_key or not (
            validation_evidence_key.startswith("slot:")
            or validation_evidence_key.startswith("gate:")
        ):
            continue
        base = items_by_key.get(validation_evidence_key)
        if base is None:
            base = _coverage_item_base(
                evidence_key=validation_evidence_key,
                title=_coverage_item_title_from_evidence_key(validation_evidence_key),
                kind=(
                    "image_slot"
                    if validation_evidence_key.startswith("slot:")
                    else "gate_requirement"
                ),
                required=validation_evidence_key.startswith("gate:"),
            )
            items_by_key[validation_evidence_key] = base

        failure_reasons = _normalizar_lista_textos(
            [*(base.get("failure_reasons") or []), *(validation.failure_reasons_json or [])]
        )
        evidence_metadata = validation.evidence_metadata_json if isinstance(validation.evidence_metadata_json, dict) else {}
        base.update(
            {
                "operational_status": _texto_limpo_curto(validation.operational_status),
                "mesa_status": _texto_limpo_curto(validation.mesa_status),
                "component_type": _texto_limpo_curto(validation.component_type),
                "view_angle": _texto_limpo_curto(validation.view_angle),
                "quality_score": validation.quality_score,
                "coherence_score": validation.coherence_score,
                "replacement_evidence_key": _texto_limpo_curto(validation.replacement_evidence_key),
                "summary": base.get("summary")
                or _resumir_texto_curto(
                    evidence_metadata.get("message") or evidence_metadata.get("reason") or evidence_metadata.get("title"),
                    limite=280,
                ),
                "failure_reasons": failure_reasons,
            }
        )
        if not base.get("source_status") and validation_evidence_key.startswith("gate:"):
            base["source_status"] = "resolved" if str(validation.operational_status or "").strip().lower() == "ok" else "pending"

    if not items_by_key and not final_validation_mode:
        return None

    total_required = 0
    total_collected = 0
    total_accepted = 0
    total_missing = 0
    total_irregular = 0
    items_payload: list[CoverageMapItemPacoteMesa] = []

    for item in items_by_key.values():
        status, collected = _coverage_item_status(item)
        item["status"] = status
        if item.get("required"):
            total_required += 1
        if collected:
            total_collected += 1
        if status == "accepted":
            total_accepted += 1
        elif status == "missing":
            total_missing += 1
        elif status == "irregular":
            total_irregular += 1
        items_payload.append(
            CoverageMapItemPacoteMesa(
                evidence_key=str(item["evidence_key"]),
                title=str(item["title"]),
                kind=str(item["kind"]),
                status=status,
                required=bool(item.get("required")),
                source_status=_texto_limpo_curto(item.get("source_status")),
                operational_status=_texto_limpo_curto(item.get("operational_status")),
                mesa_status=_texto_limpo_curto(item.get("mesa_status")),
                component_type=_texto_limpo_curto(item.get("component_type")),
                view_angle=_texto_limpo_curto(item.get("view_angle")),
                quality_score=item.get("quality_score"),
                coherence_score=item.get("coherence_score"),
                replacement_evidence_key=_texto_limpo_curto(item.get("replacement_evidence_key")),
                summary=_resumir_texto_curto(item.get("summary"), limite=280),
                failure_reasons=_normalizar_lista_textos(item.get("failure_reasons")),
            )
        )

    items_payload.sort(
        key=lambda item: (
            COVERAGE_STATUS_PRIORITY.get(str(item.status), 99),
            0 if item.required else 1,
            item.title.lower(),
        )
    )

    return CoverageMapPacoteMesa(
        total_required=total_required,
        total_collected=total_collected,
        total_accepted=total_accepted,
        total_missing=total_missing,
        total_irregular=total_irregular,
        final_validation_mode=final_validation_mode,
        items=items_payload,
    )


__all__ = ["build_coverage_map_pacote"]
