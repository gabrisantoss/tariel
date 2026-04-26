from __future__ import annotations

import json
import re
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def test_nr35_golden_path_contract_doc_records_pilot_decisions() -> None:
    doc_path = _repo_root() / "docs" / "golden-paths" / "NR35_LINHA_DE_VIDA_GOLDEN_PATH.md"
    texto = doc_path.read_text(encoding="utf-8")

    assert "nr35_inspecao_linha_de_vida" in texto
    assert "nr35_linha_vida" in texto
    assert "4 fotos obrigatorias" in texto
    assert "foto_detalhe_critico" in texto
    assert "`mesa_required`" in texto
    assert "bloquear PDF oficial" in texto
    assert "foto -> achado -> campo JSON -> secao PDF -> decisao Mesa -> emissao oficial" in texto


def test_nr35_schema_declares_four_required_photos_for_pilot_contract() -> None:
    schema_path = _repo_root() / "docs" / "family_schemas" / "nr35_inspecao_linha_de_vida.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))

    assert schema["family_key"] == "nr35_inspecao_linha_de_vida"
    assert schema["evidence_policy"]["minimum_evidence"]["fotos"] == 4
    assert len(schema["evidence_policy"]["required_slots"]) == 4


def test_nr35_contract_confirms_report_pack_four_slot_alignment() -> None:
    builder_path = (
        _repo_root()
        / "web"
        / "app"
        / "domains"
        / "chat"
        / "report_pack_semantic_builders.py"
    )
    builder_text = builder_path.read_text(encoding="utf-8")
    section = builder_text.split("_NR35_IMAGE_SLOTS = (", 1)[1].split("_NR35_ANCHOR_IMAGE_SLOTS", 1)[0]
    current_slots = re.findall(r'\("([^"]+)",', section)

    assert current_slots == [
        "foto_visao_geral",
        "foto_ponto_superior",
        "foto_ponto_inferior",
        "foto_detalhe_critico",
    ]

    doc_path = _repo_root() / "docs" / "golden-paths" / "NR35_LINHA_DE_VIDA_GOLDEN_PATH.md"
    texto = doc_path.read_text(encoding="utf-8")

    assert "Alinhamento PR 2" in texto
    assert "foto_detalhe_critico" in texto
