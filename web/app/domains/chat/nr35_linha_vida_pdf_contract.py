"""Contrato de template e PDF do golden path NR35 Linha de Vida."""

from __future__ import annotations

from typing import Any

NR35_REQUIRED_PDF_SECTIONS: tuple[str, ...] = (
    "capa_folha_rosto",
    "controle_documental_sumario",
    "identificacao_laudo",
    "objeto_escopo_base_normativa",
    "metodologia_instrumentos_equipe",
    "evidencias_registros_fotograficos",
    "checklist_tecnico",
    "achados_nao_conformidades",
    "conclusao",
    "revisao_mesa",
    "assinaturas_responsabilidade_tecnica",
    "auditoria_emissao",
)

NR35_REQUIRED_PHOTO_SLOT_CONTRACTS: tuple[dict[str, str], ...] = (
    {
        "slot": "foto_visao_geral",
        "label": "Visao geral da linha de vida",
        "json_field": "identificacao.referencia_principal",
        "finding_key": "contexto_do_sistema",
        "pdf_section": "evidencias_registros_fotograficos",
    },
    {
        "slot": "foto_ponto_superior",
        "label": "Ponto superior ou extremidade principal",
        "json_field": "execucao_servico.evidencia_execucao",
        "finding_key": "ancoragem_ou_extremidade_principal",
        "pdf_section": "evidencias_registros_fotograficos",
    },
    {
        "slot": "foto_ponto_inferior",
        "label": "Ponto inferior ou extremidade secundaria",
        "json_field": "evidencias_e_anexos.evidencia_complementar",
        "finding_key": "ancoragem_ou_extremidade_secundaria",
        "pdf_section": "evidencias_registros_fotograficos",
    },
    {
        "slot": "foto_detalhe_critico",
        "label": "Detalhe critico tecnico",
        "json_field": "nao_conformidades_ou_lacunas.evidencias",
        "finding_key": "achado_critico_ou_nao_conformidade",
        "pdf_section": "achados_nao_conformidades",
    },
)

NR35_REQUIRED_PHOTO_SLOTS: tuple[str, ...] = tuple(
    item["slot"] for item in NR35_REQUIRED_PHOTO_SLOT_CONTRACTS
)

NR35_TRACEABILITY_CHAIN = "foto -> achado -> campo JSON -> secao PDF -> decisao Mesa -> emissao oficial"


def nr35_required_pdf_sections_text() -> str:
    return "; ".join(NR35_REQUIRED_PDF_SECTIONS)


def nr35_required_photo_slots_text() -> str:
    return "; ".join(item["slot"] for item in NR35_REQUIRED_PHOTO_SLOT_CONTRACTS)


def nr35_photo_slot_contract_by_slot() -> dict[str, dict[str, str]]:
    return {item["slot"]: dict(item) for item in NR35_REQUIRED_PHOTO_SLOT_CONTRACTS}


def nr35_pdf_contract_payload(
    *,
    schema_version: Any,
    template_version: Any,
) -> dict[str, Any]:
    return {
        "family_key": "nr35_inspecao_linha_de_vida",
        "schema_version": schema_version,
        "template_version": template_version,
        "required_sections": list(NR35_REQUIRED_PDF_SECTIONS),
        "required_sections_texto": nr35_required_pdf_sections_text(),
        "required_photo_slots": [dict(item) for item in NR35_REQUIRED_PHOTO_SLOT_CONTRACTS],
        "required_photo_slots_texto": nr35_required_photo_slots_text(),
        "traceability_chain": NR35_TRACEABILITY_CHAIN,
        "mesa_required": True,
        "official_pdf_blocked_without_validation": True,
    }


__all__ = [
    "NR35_REQUIRED_PDF_SECTIONS",
    "NR35_REQUIRED_PHOTO_SLOT_CONTRACTS",
    "NR35_REQUIRED_PHOTO_SLOTS",
    "NR35_TRACEABILITY_CHAIN",
    "nr35_pdf_contract_payload",
    "nr35_photo_slot_contract_by_slot",
    "nr35_required_pdf_sections_text",
    "nr35_required_photo_slots_text",
]
