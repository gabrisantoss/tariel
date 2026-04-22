from __future__ import annotations

import json
from pathlib import Path

from nucleo.template_editor_word import montar_html_documento_editor


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_fixture(name: str) -> dict:
    return json.loads((_repo_root() / "docs" / "family_schemas" / name).read_text(encoding="utf-8"))


def test_nr35_overlay_artifacts_include_family_specific_fields() -> None:
    family_schema = _load_fixture("nr35_inspecao_linha_de_vida.json")
    output_seed = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_seed.json")
    output_example = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")
    template_seed = _load_fixture("nr35_inspecao_linha_de_vida.template_master_seed.json")

    optional_slots = {
        slot["slot_id"]: slot
        for slot in family_schema["evidence_policy"]["optional_slots"]
    }

    assert output_seed["identificacao"]["numero_laudo_inspecao"] is None
    assert output_seed["identificacao"]["numero_laudo_fabricante"] is None
    assert output_seed["identificacao"]["documento_codigo"] is None
    assert output_seed["identificacao"]["tipo_sistema"] is None
    assert output_seed["identificacao"]["art_numero"] is None
    assert output_seed["metodologia_e_recursos"]["instrumentos_utilizados"] is None
    assert output_seed["registros_fotograficos"]["referencias_texto"] is None
    assert output_seed["checklist_componentes"]["condicao_cabo_aco"]["condicao"] is None
    assert output_seed["conclusao"]["proxima_inspecao_periodica"] is None
    assert output_seed["conclusao"]["status_operacional"] is None
    assert output_seed["nao_conformidades_ou_lacunas"]["limitacoes_de_inspecao"] is None
    assert output_seed["conclusao"]["motivo_status"] is None
    assert output_seed["conclusao"]["liberado_para_uso"] is None
    assert output_seed["conclusao"]["acao_requerida"] is None
    assert output_seed["conclusao"]["condicao_para_reinspecao"] is None

    assert output_example["identificacao"]["numero_laudo_inspecao"] == "AT-IN-OZ-001-01-26"
    assert output_example["identificacao"]["numero_laudo_fabricante"] == "MC-CRMR-0032"
    assert output_example["identificacao"]["documento_codigo"] == "AT-IN-OZ-001-01-26"
    assert output_example["identificacao"]["tipo_sistema"] == "Linha de vida vertical"
    assert "Dinamometro" in output_example["metodologia_e_recursos"]["instrumentos_utilizados"]
    assert "Vista geral" in output_example["registros_fotograficos"]["referencias_texto"]
    assert output_example["checklist_componentes"]["condicao_cabo_aco"]["condicao"] == "NC"
    assert output_example["conclusao"]["status"] == "Reprovado"
    assert output_example["conclusao"]["status_operacional"] == "bloqueio"
    assert "avaliacao foi limitada" in output_example["nao_conformidades_ou_lacunas"]["limitacoes_de_inspecao"]
    assert output_example["conclusao"]["motivo_status"] == "Nao conformidade confirmada no cabo de aco com necessidade de bloqueio imediato."
    assert output_example["conclusao"]["liberado_para_uso"] == "nao"
    assert output_example["conclusao"]["acao_requerida"] == "corrigir_e_revalidar"
    assert "Substituir o trecho comprometido" in output_example["conclusao"]["condicao_para_reinspecao"]
    assert output_example["conclusao"]["proxima_inspecao_periodica"] == "2026-07"
    assert optional_slots["foto_panoramica_contexto"]["binding_path"] == "registros_fotograficos"
    assert optional_slots["foto_tag_identificacao"]["binding_path"] == "registros_fotograficos"
    assert optional_slots["foto_contexto_restricao_acesso"]["binding_path"] == "registros_fotograficos"
    assert optional_slots["foto_detalhe_achado_principal"]["binding_path"] == "nao_conformidades_ou_lacunas.evidencias"

    headings = []
    for node in template_seed["documento_editor_json"]["doc"]["content"]:
        if node.get("type") != "heading":
            continue
        headings.append(
            "".join(part.get("text", "") for part in node.get("content", []) if part.get("type") == "text")
        )

    assert "1. Capa / Folha de Rosto" in headings
    assert "6. Checklist Tecnico dos Componentes" in headings
    assert "7. Registros Fotograficos e Evidencias" in headings
    assert "4. Metodologia, Instrumentos Utilizados e Aviso Importante" in headings
    assert "9. Conclusao, Proxima Inspecao Periodica e Observacoes" in headings
    assert "11. Assinaturas e Responsabilidade Tecnica" in headings


def test_nr35_operational_coverage_matrix_declares_three_core_statuses() -> None:
    matrix_path = (
        _repo_root()
        / "docs"
        / "portfolio_empresa_nr35_material_real"
        / "nr35_inspecao_linha_de_vida"
        / "matriz_cobertura_operacional.json"
    )
    coverage = json.loads(matrix_path.read_text(encoding="utf-8"))

    scenarios = {item["status"]: item for item in coverage["cenarios"]}

    assert coverage["family_key"] == "nr35_inspecao_linha_de_vida"
    assert coverage["conclusao"]["todos_os_tres_estados_operacionais_estao_cobertos"] is True
    assert scenarios["Aprovado"]["semantica_esperada"]["liberado_para_uso"] == "sim"
    assert scenarios["Pendente"]["semantica_esperada"]["acao_requerida"] == "complementar_inspecao"
    assert scenarios["Reprovado"]["semantica_esperada"]["status_operacional"] == "bloqueio"


def test_nr35_overlay_renders_professional_sections_from_example() -> None:
    template_seed = _load_fixture("nr35_inspecao_linha_de_vida.template_master_seed.json")
    output_example = _load_fixture("nr35_inspecao_linha_de_vida.laudo_output_exemplo.json")

    html = montar_html_documento_editor(
        documento_editor_json=template_seed["documento_editor_json"],
        estilo_json=template_seed["estilo_json"],
        assets_json=[],
        dados_formulario=output_example,
    )

    assert "NR35 - Inspecao linha de vida" in html
    assert "Laudo tecnico da familia NR35 para linha de vida" in html
    assert "MC-CRMR-0032" in html
    assert "Cabo de aco" in html
    assert "Inspecao Periodica" in html
    assert "Dinamometro" in html
    assert "bloqueio" in html
    assert "nao" in html
    assert "corrigir_e_revalidar" in html
    assert "2026-07" in html
    assert 'class="doc-cover doc-compact"' in html
    assert 'class="doc-matrix"' in html
