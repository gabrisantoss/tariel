from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from app.domains.chat.nr35_linha_vida_validation import (
    NR35_REQUIRED_PHOTO_SLOTS,
    build_nr35_linha_vida_official_issue_blockers,
    is_nr35_linha_vida_context,
    validate_nr35_linha_vida_golden_path,
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _payload_exemplo() -> dict:
    path = (
        _repo_root()
        / "docs"
        / "family_schemas"
        / "nr35_inspecao_linha_de_vida.laudo_output_exemplo.json"
    )
    payload = json.loads(path.read_text(encoding="utf-8"))
    mesa_review = payload.setdefault("mesa_review", {})
    mesa_review.setdefault("aprovacao_origem", "mesa_humana")
    mesa_review.setdefault("ia_aprovou_mesa", False)
    mesa_review.setdefault("aprovado_por_id", 77)
    mesa_review.setdefault("aprovado_por_nome", "Mesa NR35")
    mesa_review.setdefault("aprovado_em", "2026-04-26T12:00:00+00:00")
    return payload


def _report_pack_com_quatro_fotos() -> dict:
    return {
        "template_key": "nr35_linha_vida",
        "family": "nr35_inspecao_linha_de_vida",
        "image_slots": [
            {
                "slot": slot,
                "title": slot.replace("_", " ").title(),
                "required": True,
                "status": "resolved",
                "resolved_message_id": index,
                "resolved_evidence_id": f"msg:{index}",
            }
            for index, slot in enumerate(NR35_REQUIRED_PHOTO_SLOTS, start=701)
        ],
        "quality_gates": {"final_validation_mode": "mesa_required"},
    }


def _issue_codes(result) -> set[str]:
    return {issue.code for issue in result.issues}


def test_nr35_validator_accepts_output_example_with_four_photos_and_mesa() -> None:
    result = validate_nr35_linha_vida_golden_path(
        payload=_payload_exemplo(),
        report_pack_draft=_report_pack_com_quatro_fotos(),
        template_key="nr35_linha_vida",
        level="official_pdf",
    )

    assert result.ok is True
    assert result.pending == ()


def test_nr35_validator_resolves_runtime_alias() -> None:
    assert is_nr35_linha_vida_context(template_key="nr35_linha_vida") is True
    assert is_nr35_linha_vida_context(template_key="nr35_inspecao_linha_de_vida") is True


def test_nr35_validator_reports_structured_pending_items() -> None:
    payload = _payload_exemplo()
    payload["conclusao"] = {}

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_conclusion_missing" in _issue_codes(result)
    assert result.pending[0]["code"]
    assert result.to_dict()["pending"][0]["blocking"] is True


def test_nr35_validator_rejects_three_photos_for_official_pdf() -> None:
    report_pack = _report_pack_com_quatro_fotos()
    report_pack["image_slots"] = report_pack["image_slots"][:3]

    result = validate_nr35_linha_vida_golden_path(
        payload=_payload_exemplo(),
        report_pack_draft=report_pack,
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_required_photo_slot_missing" in _issue_codes(result)


def test_nr35_validator_rejects_missing_critical_detail_photo() -> None:
    report_pack = _report_pack_com_quatro_fotos()
    report_pack["image_slots"] = [
        slot for slot in report_pack["image_slots"] if slot["slot"] != "foto_detalhe_critico"
    ]

    result = validate_nr35_linha_vida_golden_path(
        payload=_payload_exemplo(),
        report_pack_draft=report_pack,
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_required_photo_slot_missing" in _issue_codes(result)


def test_nr35_validator_rejects_duplicate_photo_without_human_justification() -> None:
    report_pack = _report_pack_com_quatro_fotos()
    report_pack["image_slots"][1]["resolved_evidence_id"] = report_pack["image_slots"][0][
        "resolved_evidence_id"
    ]

    result = validate_nr35_linha_vida_golden_path(
        payload=_payload_exemplo(),
        report_pack_draft=report_pack,
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_photo_duplicate_without_justification" in _issue_codes(result)


def test_nr35_validator_rejects_missing_conclusion() -> None:
    payload = _payload_exemplo()
    payload.pop("conclusao", None)

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_conclusion_missing" in _issue_codes(result)


def test_nr35_validator_rejects_invalid_conclusion_status() -> None:
    payload = _payload_exemplo()
    payload["conclusao"]["status"] = "Status Fantasia"

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_conclusion_status_invalid" in _issue_codes(result)


def test_nr35_validator_rejects_nonconformity_without_required_action() -> None:
    payload = _payload_exemplo()
    payload["conclusao"]["acao_requerida"] = ""

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_action_required_missing" in _issue_codes(result)


def test_nr35_validator_rejects_missing_mesa_approval_for_official_pdf() -> None:
    payload = _payload_exemplo()
    payload["mesa_review"]["status"] = ""

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_mesa_review_missing" in _issue_codes(result)


def test_nr35_validator_rejects_mesa_approval_from_ai_for_official_pdf() -> None:
    payload = _payload_exemplo()
    payload["mesa_review"]["status"] = "Aprovado"
    payload["mesa_review"]["aprovacao_origem"] = "ia"
    payload["mesa_review"]["ia_aprovou_mesa"] = True

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_mesa_review_origin_invalid" in _issue_codes(result)
    assert "nr35_mesa_review_ai_approved" in _issue_codes(result)


def test_nr35_validator_rejects_missing_template_schema_versions_for_official_pdf() -> None:
    payload = _payload_exemplo()
    payload.pop("template_version", None)
    payload.pop("schema_version", None)

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_template_version_missing" in _issue_codes(result)
    assert "nr35_schema_version_missing" in _issue_codes(result)


def test_nr35_validator_rejects_photo_without_persisted_reference_or_caption() -> None:
    payload = _payload_exemplo()
    first_slot = payload["registros_fotograficos"]["slots_obrigatorios"][0]
    first_slot["referencia_persistida"] = ""
    first_slot["legenda_tecnica"] = ""
    report_pack = _report_pack_com_quatro_fotos()
    report_pack["image_slots"][0]["resolved_evidence_id"] = ""
    report_pack["image_slots"][0]["resolved_message_id"] = ""
    report_pack["image_slots"][0]["title"] = ""

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=report_pack,
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_photo_reference_missing" in _issue_codes(result)
    assert "nr35_photo_caption_missing" in _issue_codes(result)


def test_nr35_validator_rejects_wrong_family() -> None:
    payload = deepcopy(_payload_exemplo())
    payload["family_key"] = "nr13_inspecao_caldeira"
    payload["template_code"] = "nr13_caldeira"

    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=_report_pack_com_quatro_fotos(),
        template_key="nr13_caldeira",
        level="official_pdf",
    )

    assert result.ok is False
    assert "nr35_family_mismatch" in _issue_codes(result)


def test_nr35_official_issue_blocker_blocks_failed_validation() -> None:
    report_pack = _report_pack_com_quatro_fotos()
    report_pack["image_slots"] = report_pack["image_slots"][:3]

    blockers = build_nr35_linha_vida_official_issue_blockers(
        payload=_payload_exemplo(),
        report_pack_draft=report_pack,
        template_key="nr35_linha_vida",
    )

    assert blockers
    assert blockers[0]["code"] == "nr35_golden_path_validation_failed"
    assert blockers[0]["blocking"] is True
    assert blockers[0]["validation"]["ok"] is False
