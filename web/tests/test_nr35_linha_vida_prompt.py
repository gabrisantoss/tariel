from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace

from app.domains.chat.nr35_linha_vida_pdf_contract import NR35_REQUIRED_PHOTO_SLOTS
from app.domains.chat.nr35_linha_vida_prompt import (
    NR35_AI_PROMPT_CONTRACT_VERSION,
    build_nr35_linha_vida_prompt_contract,
    normalize_nr35_linha_vida_ai_output,
)
from app.domains.chat.nr35_linha_vida_validation import (
    validate_nr35_linha_vida_golden_path,
)
from app.domains.chat.templates_ai import RelatorioNR35LinhaVida
from nucleo.cliente_ia import ClienteIA


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


class _FakeGeminiModels:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.config = None
        self.contents = None

    def generate_content(self, **kwargs):
        self.config = kwargs.get("config")
        self.contents = kwargs.get("contents")
        return SimpleNamespace(text=json.dumps(self.payload, ensure_ascii=False))


def test_prompt_nr35_declara_regras_de_familia_fotos_mesa_e_pdf() -> None:
    contract = build_nr35_linha_vida_prompt_contract(
        template_key="nr35_linha_vida",
        report_pack_draft=_report_pack_tres_slots_sem_detalhe(),
    )

    assert contract is not None
    prompt = f"{contract.system_instruction}\n{contract.user_instruction}"
    assert "nr35_inspecao_linha_de_vida" in prompt
    assert "Nao troque a familia" in prompt
    assert "nao invente" in prompt.lower()
    assert "foto_detalhe_critico" in prompt
    assert "mesa_review.status deve permanecer pendente" in prompt
    assert "Nunca declare PDF oficial liberado" in prompt
    assert contract.pending_photo_slots == ("foto_detalhe_critico",)


def test_cliente_ia_mockado_usa_prompt_nr35_e_normaliza_mesa_pendente() -> None:
    raw_output = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    fake_models = _FakeGeminiModels(raw_output)
    cliente = ClienteIA.__new__(ClienteIA)
    cliente.cliente = SimpleNamespace(models=fake_models)
    cliente._ocr_disponivel = False
    cliente.motor_visao = None

    result = asyncio.run(
        cliente.gerar_json_estruturado(
            schema_pydantic=RelatorioNR35LinhaVida,
            historico=[
                {
                    "papel": "usuario",
                    "texto": "Caso NR35 Linha de Vida com quatro fotos e inspecao visual completa.",
                }
            ],
            template_key="nr35_linha_vida",
            catalog_family_key="nr35_inspecao_linha_de_vida",
            report_pack_draft=_report_pack_quatro_slots(),
        )
    )

    assert "nr35_inspecao_linha_de_vida" in str(getattr(fake_models.config, "system_instruction", ""))
    assert result["family_key"] == "nr35_inspecao_linha_de_vida"
    assert result["template_code"] == "nr35_inspecao_linha_de_vida"
    assert result["mesa_review"]["status"] == "pendente"
    assert [item["slot"] for item in result["pdf_contract"]["required_photo_slots"]] == list(
        NR35_REQUIRED_PHOTO_SLOTS
    )
    assert result["auditoria"]["emissao_oficial_status"] == "bloqueada_ate_validacao_mesa_pdf"
    assert result["ia_assessment"]["prompt_contract_version"] == NR35_AI_PROMPT_CONTRACT_VERSION

    mesa_level = validate_nr35_linha_vida_golden_path(
        payload=result,
        report_pack_draft=_report_pack_quatro_slots(),
        template_key="nr35_linha_vida",
        level="mesa",
    )
    official_level = validate_nr35_linha_vida_golden_path(
        payload=result,
        report_pack_draft=_report_pack_quatro_slots(),
        template_key="nr35_linha_vida",
        level="official_pdf",
    )

    assert mesa_level.ok is True
    assert official_level.ok is False
    assert "nr35_mesa_review_not_approved" in {issue.code for issue in official_level.issues}


def test_normalizacao_com_tres_fotos_marca_pendencia_e_bloqueia_pdf() -> None:
    raw_output = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    raw_output["registros_fotograficos"]["slots_obrigatorios"] = [
        item
        for item in raw_output["registros_fotograficos"]["slots_obrigatorios"]
        if item["slot"] != "foto_detalhe_critico"
    ]

    result = normalize_nr35_linha_vida_ai_output(
        raw_output,
        report_pack_draft=_report_pack_tres_slots_sem_detalhe(),
    )
    validation = validate_nr35_linha_vida_golden_path(
        payload=result,
        report_pack_draft=_report_pack_tres_slots_sem_detalhe(),
        template_key="nr35_linha_vida",
        level="official_pdf",
    )

    detalhe = next(
        item
        for item in result["registros_fotograficos"]["slots_obrigatorios"]
        if item["slot"] == "foto_detalhe_critico"
    )
    assert detalhe["referencia_persistida"] == ""
    assert detalhe["pendencia"] == "foto_obrigatoria_ausente_ou_nao_clara"
    assert result["ia_assessment"]["pendencias"] == [
        {
            "code": "nr35_required_photo_slot_pending",
            "slot": "foto_detalhe_critico",
            "message": "Foto obrigatoria pendente ou sem referencia persistida: foto_detalhe_critico.",
        }
    ]
    assert validation.ok is False
    assert "nr35_required_photo_slot_missing" in {issue.code for issue in validation.issues}


def test_nao_conformidade_sem_acao_requerida_recebe_pendencia_humana() -> None:
    raw_output = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    raw_output["conclusao"]["status"] = "Reprovado"
    raw_output["conclusao"]["acao_requerida"] = ""
    raw_output["nao_conformidades_ou_lacunas"]["ha_pontos_de_atencao"] = True

    result = normalize_nr35_linha_vida_ai_output(
        raw_output,
        report_pack_draft=_report_pack_quatro_slots(),
    )
    validation = validate_nr35_linha_vida_golden_path(
        payload=result,
        report_pack_draft=_report_pack_quatro_slots(),
        template_key="nr35_linha_vida",
        level="mesa",
    )

    assert result["conclusao"]["acao_requerida"] == "pendente_revisao_humana"
    assert validation.ok is True


def test_dado_ausente_nao_e_inventado_pela_normalizacao_nr35() -> None:
    raw_output = {
        "family_key": "nr35_inspecao_linha_de_vida",
        "template_code": "nr35_linha_vida",
        "identificacao": {"codigo_interno": ""},
        "conclusao": {
            "status": "Pendente",
            "conclusao_tecnica": "Inspecao ainda depende de complemento de evidencias.",
        },
    }

    result = normalize_nr35_linha_vida_ai_output(
        raw_output,
        report_pack_draft=_report_pack_tres_slots_sem_detalhe(),
    )

    assert result["identificacao"]["codigo_interno"] == ""
    assert "art_numero" not in result["identificacao"]
    assert "crea" not in json.dumps(result, ensure_ascii=False).lower()
    assert result["conclusao"]["acao_requerida"] == "pendente_revisao_humana"
    assert result["mesa_review"]["status"] == "pendente"
    assert result["ia_assessment"]["pdf_oficial_liberado"] is False


def test_familia_errada_nao_e_trocada_silenciosamente() -> None:
    raw_output = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    raw_output["family_key"] = "nr13_inspecao_vaso_pressao"

    result = normalize_nr35_linha_vida_ai_output(
        raw_output,
        report_pack_draft=_report_pack_quatro_slots(),
    )
    validation = validate_nr35_linha_vida_golden_path(
        payload=result,
        report_pack_draft=_report_pack_quatro_slots(),
        template_key="nr35_linha_vida",
        level="mesa",
    )

    assert result["family_key"] == "nr13_inspecao_vaso_pressao"
    assert result["ia_assessment"]["family_mismatch_detected"] is True
    assert validation.ok is False
    assert "nr35_family_swapped" in {issue.code for issue in validation.issues}
