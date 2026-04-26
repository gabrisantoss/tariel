from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.domains.chat.nr35_linha_vida_pdf_contract import NR35_REQUIRED_PHOTO_SLOTS
from app.domains.chat.nr35_linha_vida_structured_review import (
    NR35_STRUCTURED_REVIEW_VERSION,
    apply_nr35_structured_review_edits_to_laudo,
    build_nr35_structured_review_state_for_laudo,
    ensure_nr35_structured_review_ready_for_mesa_approval,
    mark_nr35_structured_review_mesa_approved,
)
from app.shared.database import StatusRevisao


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_fixture(name: str) -> dict:
    return json.loads(
        (_repo_root() / "docs" / "family_schemas" / name).read_text(encoding="utf-8")
    )


def _report_pack_quatro_slots() -> dict:
    return {
        "family": "nr35_inspecao_linha_de_vida",
        "template_key": "nr35_linha_vida",
        "image_slots": [
            {
                "slot": slot,
                "title": slot.replace("_", " "),
                "status": "resolved",
                "resolved_evidence_id": f"IMG_{index}",
                "resolved_caption": f"Evidencia tecnica {slot}",
            }
            for index, slot in enumerate(NR35_REQUIRED_PHOTO_SLOTS, start=701)
        ],
        "quality_gates": {"final_validation_mode": "mesa_required"},
    }


def _report_pack_tres_slots_sem_detalhe() -> dict:
    report_pack = deepcopy(_report_pack_quatro_slots())
    report_pack["image_slots"] = [
        slot
        for slot in report_pack["image_slots"]
        if slot["slot"] != "foto_detalhe_critico"
    ]
    return report_pack


def _laudo(payload: dict | None = None, report_pack: dict | None = None):
    return SimpleNamespace(
        id=3501,
        tipo_template="nr35_linha_vida",
        catalog_family_key="nr35_inspecao_linha_de_vida",
        status_revisao=StatusRevisao.AGUARDANDO.value,
        dados_formulario=deepcopy(
            payload
            if payload is not None
            else _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
        ),
        report_pack_draft_json=deepcopy(report_pack or _report_pack_quatro_slots()),
    )


def _issue_codes(state: dict, block: str) -> set[str]:
    return {
        item["code"]
        for item in state["pending_by_block"][block]["issues"]
    }


def test_nr35_revisao_estrutura_pendencias_por_bloco() -> None:
    payload = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    payload["registros_fotograficos"]["slots_obrigatorios"] = [
        item
        for item in payload["registros_fotograficos"]["slots_obrigatorios"]
        if item["slot"] != "foto_detalhe_critico"
    ]
    laudo = _laudo(payload=payload, report_pack=_report_pack_tres_slots_sem_detalhe())

    state = build_nr35_structured_review_state_for_laudo(laudo)

    assert state["contract_version"] == NR35_STRUCTURED_REVIEW_VERSION
    assert state["ready_for_mesa"] is False
    assert state["pending_by_block"]["evidencias_fotos"]["count"] >= 1
    assert "nr35_required_photo_slot_missing" in _issue_codes(state, "evidencias_fotos")


def test_humano_corrige_campo_obrigatorio_e_pendencia_desaparece() -> None:
    payload = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    payload["identificacao"]["codigo_interno"] = ""
    laudo = _laudo(payload=payload)

    before = build_nr35_structured_review_state_for_laudo(laudo)
    assert "nr35_required_field_missing" in _issue_codes(before, "identificacao")

    after = apply_nr35_structured_review_edits_to_laudo(
        None,
        laudo=laudo,
        edits=[
            {
                "path": "identificacao.codigo_interno",
                "value": "AT-IN-OZ-001-01-26",
                "justification": "Codigo confirmado pelo revisor no material do caso.",
            }
        ],
        actor_user_id=77,
        actor_name="Revisor NR35",
    )

    assert after["ready_for_mesa"] is True
    assert "nr35_required_field_missing" not in _issue_codes(after, "identificacao")
    assert laudo.dados_formulario["identificacao"]["codigo_interno"] == "AT-IN-OZ-001-01-26"
    assert after["applied_changes"][0]["resolved_issue_codes"]


def test_humano_altera_conclusao_e_diff_fica_registrado() -> None:
    laudo = _laudo()

    state = apply_nr35_structured_review_edits_to_laudo(
        None,
        laudo=laudo,
        edits=[
            {
                "path": "conclusao.status",
                "value": "Pendente",
                "justification": "Mesa classificou como pendente ate receber evidencia complementar.",
            },
            {
                "path": "conclusao.acao_requerida",
                "value": "complementar_inspecao",
                "justification": "Acao definida pela Mesa apos revisar a evidencia critica.",
            },
        ],
        actor_user_id=88,
        actor_name="Engenharia",
    )

    changes = state["applied_changes"]
    assert [item["path"] for item in changes] == [
        "conclusao.status",
        "conclusao.acao_requerida",
    ]
    assert changes[0]["previous_value"] == "Reprovado"
    assert changes[0]["new_value"] == "Pendente"
    assert changes[0]["actor_user_id"] == 88
    assert laudo.dados_formulario["nr35_structured_review"]["change_log"][-1][
        "justification"
    ]


def test_edicao_humana_sem_justificativa_falha() -> None:
    laudo = _laudo()

    with pytest.raises(HTTPException) as exc:
        apply_nr35_structured_review_edits_to_laudo(
            None,
            laudo=laudo,
            edits=[{"path": "identificacao.codigo_interno", "value": ""}],
            actor_user_id=99,
        )

    assert exc.value.status_code == 400
    assert "Justificativa humana obrigatoria" in str(exc.value.detail)


def test_humano_tenta_aprovar_sem_quatro_fotos_e_falha() -> None:
    payload = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    payload["registros_fotograficos"]["slots_obrigatorios"] = [
        item
        for item in payload["registros_fotograficos"]["slots_obrigatorios"]
        if item["slot"] != "foto_detalhe_critico"
    ]
    laudo = _laudo(payload=payload, report_pack=_report_pack_tres_slots_sem_detalhe())

    with pytest.raises(HTTPException) as exc:
        ensure_nr35_structured_review_ready_for_mesa_approval(laudo)

    assert exc.value.status_code == 422
    assert exc.value.detail["code"] == "nr35_structured_review_pending"
    assert exc.value.detail["pending_by_block"]["evidencias_fotos"]["count"] >= 1


def test_revalidacao_passa_para_nivel_mesa_quando_completo() -> None:
    laudo = _laudo()

    state = ensure_nr35_structured_review_ready_for_mesa_approval(laudo)

    assert state is not None
    assert state["ready_for_mesa"] is True
    assert state["ready_for_official_pdf"] is False
    assert state["validation"]["official_pdf"]["issues"][0]["code"] in {
        "nr35_mesa_review_missing",
        "nr35_mesa_review_not_approved",
    }


def test_official_pdf_continua_bloqueado_ate_mesa_aprovar() -> None:
    laudo = _laudo()

    before = build_nr35_structured_review_state_for_laudo(laudo)
    assert before["ready_for_mesa"] is True
    assert before["ready_for_official_pdf"] is False

    after = mark_nr35_structured_review_mesa_approved(
        laudo,
        actor_user_id=42,
        actor_name="Mesa NR35",
    )

    assert after is not None
    assert laudo.dados_formulario["mesa_review"]["status"] == StatusRevisao.APROVADO.value
    assert laudo.dados_formulario["mesa_review"]["ia_aprovou_mesa"] is False
    assert after["ready_for_official_pdf"] is True
