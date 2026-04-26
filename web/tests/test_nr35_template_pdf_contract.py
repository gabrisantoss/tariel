from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace

from app.domains.chat.catalog_pdf_templates import ResolvedPdfTemplateRef, build_catalog_pdf_payload
from app.domains.chat.nr35_linha_vida_pdf_contract import (
    NR35_REQUIRED_PDF_SECTIONS,
    NR35_REQUIRED_PHOTO_SLOTS,
)
from app.shared.database import StatusLaudo, StatusRevisao
from nucleo.template_editor_word import MODO_EDITOR_RICO, montar_html_documento_editor


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_fixture(name: str) -> dict:
    return json.loads(
        (_repo_root() / "docs" / "family_schemas" / name).read_text(encoding="utf-8")
    )


def _placeholder_keys(documento_editor_json: dict) -> set[str]:
    keys: set[str] = set()

    def walk(node) -> None:
        if isinstance(node, dict):
            if node.get("type") == "placeholder":
                attrs = node.get("attrs") if isinstance(node.get("attrs"), dict) else {}
                key = str(attrs.get("key") or "").strip()
                if key:
                    keys.add(key)
            for child in node.get("content") or []:
                walk(child)
            if "doc" in node:
                walk(node.get("doc"))
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(documento_editor_json)
    return keys


def _template_ref(template_seed: dict) -> ResolvedPdfTemplateRef:
    return ResolvedPdfTemplateRef(
        source_kind="catalog_canonical_seed",
        family_key="nr35_inspecao_linha_de_vida",
        template_id=None,
        codigo_template=str(template_seed["template_code"]),
        versao=1,
        modo_editor=MODO_EDITOR_RICO,
        arquivo_pdf_base="",
        documento_editor_json=template_seed["documento_editor_json"],
        estilo_json=template_seed["estilo_json"],
        assets_json=[],
    )


def _laudo_nr35(report_pack: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=3501,
        catalog_family_key="nr35_inspecao_linha_de_vida",
        catalog_family_label="NR35 Linha de Vida",
        catalog_variant_label="Piloto golden path",
        status_revisao=StatusRevisao.APROVADO.value,
        status_conformidade=StatusLaudo.NAO_CONFORME.value,
        setor_industrial="NR35 Linha de Vida",
        parecer_ia="Caso NR35 com quatro evidencias fotograficas obrigatorias.",
        primeira_mensagem="Inspecao NR35 da linha de vida vertical.",
        motivo_rejeicao=None,
        report_pack_draft_json=report_pack or {},
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
                "resolved_caption": f"Evidencia {slot}",
            }
            for index, slot in enumerate(NR35_REQUIRED_PHOTO_SLOTS, start=701)
        ],
        "quality_gates": {"final_validation_mode": "mesa_required"},
    }


def test_nr35_template_json_explicitly_declares_pdf_and_photo_contract() -> None:
    family_schema = _load_fixture("nr35_inspecao_linha_de_vida.json")
    output_seed = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_seed.json")
    output_example = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    template_seed = _load_fixture("nr35_inspecao_linha_de_vida.template_master_seed.json")
    placeholders = _placeholder_keys(template_seed["documento_editor_json"])

    assert output_seed["template_version"] == 1
    assert output_example["template_version"] == 1
    assert output_seed["pdf_contract"]["traceability_chain"] == (
        "foto -> achado -> campo JSON -> secao PDF -> decisao Mesa -> emissao oficial"
    )
    assert output_example["auditoria"]["schema_version"] == output_example["schema_version"]
    assert output_example["auditoria"]["template_version"] == output_example["template_version"]

    required_photo_slots = {
        slot["slot_id"] for slot in family_schema["evidence_policy"]["required_photo_slots"]
    }
    assert required_photo_slots == set(NR35_REQUIRED_PHOTO_SLOTS)
    assert family_schema["template_binding_hints"]["expected_photo_slots"] == list(
        NR35_REQUIRED_PHOTO_SLOTS
    )

    for payload in (output_seed, output_example):
        slots = payload["registros_fotograficos"]["slots_obrigatorios"]
        assert [item["slot"] for item in slots] == list(NR35_REQUIRED_PHOTO_SLOTS)
        for item in slots:
            assert item["campo_json"]
            assert item["achado_relacionado"]
            assert item["secao_pdf"] in NR35_REQUIRED_PDF_SECTIONS

    for item in output_example["registros_fotograficos"]["slots_obrigatorios"]:
        assert item["referencia_persistida"]
        assert item["legenda_tecnica"]

    assert {
        "pdf_contract.required_sections_texto",
        "registros_fotograficos.slots_obrigatorios_texto",
        "schema_version",
        "template_version",
        "mesa_review.status",
        "auditoria.rastreabilidade_texto",
    }.issubset(placeholders)


def test_nr35_pdf_projection_exposes_required_sections_versions_mesa_and_photo_traceability() -> None:
    template_seed = _load_fixture("nr35_inspecao_linha_de_vida.template_master_seed.json")
    output_example = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")

    payload = build_catalog_pdf_payload(
        laudo=_laudo_nr35(report_pack=_report_pack_quatro_slots()),
        template_ref=_template_ref(template_seed),
        source_payload=output_example,
        diagnostico="Resumo NR35 com quatro fotos obrigatorias.",
        inspetor="Gabriel Santos",
        empresa="Caramuru Alimentos S/A",
        data="2026-04-08",
    )

    section_order = payload["document_projection"]["section_order"]
    for section in NR35_REQUIRED_PDF_SECTIONS:
        assert section in section_order

    assert payload["schema_version"] == 1
    assert payload["template_version"] == 1
    assert payload["pdf_contract"]["template_version"] == 1
    assert payload["pdf_contract"]["schema_version"] == 1
    assert payload["mesa_review"]["status"] == "aprovado_com_ressalva"
    assert payload["auditoria"]["mesa_status"] == "aprovado_com_ressalva"

    photo_slots = payload["registros_fotograficos"]["slots_obrigatorios"]
    assert [item["slot"] for item in photo_slots] == list(NR35_REQUIRED_PHOTO_SLOTS)
    assert {item["referencia_persistida"] for item in photo_slots} == {
        "IMG_701",
        "IMG_702",
        "IMG_703",
        "IMG_704",
    }
    for item in photo_slots:
        assert item["campo_json"]
        assert item["achado_relacionado"]
        assert item["secao_pdf"]

    projection_contract = payload["document_projection"]["nr35_pdf_contract"]
    assert projection_contract["required_photo_slots_texto"] == (
        "foto_visao_geral; foto_ponto_superior; foto_ponto_inferior; foto_detalhe_critico"
    )
    assert projection_contract["traceability_chain"] == payload["auditoria"]["rastreabilidade_texto"]


def test_nr35_pdf_projection_can_fill_photo_contract_from_report_pack_slots() -> None:
    template_seed = _load_fixture("nr35_inspecao_linha_de_vida.template_master_seed.json")
    source_payload = deepcopy(_load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json"))
    source_payload["registros_fotograficos"].pop("slots_obrigatorios", None)
    source_payload["registros_fotograficos"].pop("slots_obrigatorios_texto", None)

    payload = build_catalog_pdf_payload(
        laudo=_laudo_nr35(report_pack=_report_pack_quatro_slots()),
        template_ref=_template_ref(template_seed),
        source_payload=source_payload,
        diagnostico="Resumo NR35 com slots vindos do report pack.",
        inspetor="Gabriel Santos",
        empresa="Caramuru Alimentos S/A",
        data="2026-04-08",
    )

    photo_slots = payload["registros_fotograficos"]["slots_obrigatorios"]
    assert [item["slot"] for item in photo_slots] == list(NR35_REQUIRED_PHOTO_SLOTS)
    assert {item["referencia_persistida"] for item in photo_slots} == {
        "IMG_701",
        "IMG_702",
        "IMG_703",
        "IMG_704",
    }
    assert "foto_detalhe_critico" in payload["registros_fotograficos"][
        "slots_obrigatorios_texto"
    ]


def test_nr35_template_render_includes_pdf_contract_and_audit_terms() -> None:
    template_seed = _load_fixture("nr35_inspecao_linha_de_vida.template_master_seed.json")
    output_example = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")

    html = montar_html_documento_editor(
        documento_editor_json=template_seed["documento_editor_json"],
        estilo_json=template_seed["estilo_json"],
        assets_json=[],
        dados_formulario=output_example,
    )

    assert "Contrato PDF minimo" in html
    assert "foto_detalhe_critico" in html
    assert "schema_version" in html
    assert "template_version" in html
    assert "aprovado_com_ressalva" in html
