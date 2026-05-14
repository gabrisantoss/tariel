"""Prompt context for guided mobile inspections.

This module keeps the selected mobile template visible to the AI prompt. The
mobile UI already has per-template checklists; this context turns that same
selection into an explicit instruction for the chat model.
"""

from __future__ import annotations

from typing import Any

from app.domains.chat.normalization import (
    nome_template_humano,
    normalizar_tipo_template,
    resolver_familia_padrao_template,
)


_FOCUS_BY_TEMPLATE: dict[str, str] = {
    "avcb": (
        "AVCB/projeto de bombeiro, ocupacao, riscos de incendio, sistemas preventivos, "
        "documentacao, evidencias e pendencias para regularizacao."
    ),
    "cbmgo": (
        "vistoria CBM-GO, seguranca estrutural, CMAR, verificacao documental, "
        "recomendacoes e evidencias exigidas pelo checklist de bombeiro."
    ),
    "loto": (
        "NR10/LOTO, energias perigosas, pontos de bloqueio, sinalizacao, procedimento, "
        "responsaveis, riscos residuais e plano de implantacao."
    ),
    "nr11_movimentacao": (
        "NR11, movimentacao e armazenagem, equipamentos de icamento, operacao segura, "
        "acessos, sinalizacao, documentos, treinamento e riscos da atividade."
    ),
    "nr12maquinas": (
        "NR12, maquinas e equipamentos, zonas de risco, protecoes fisicas, sensores, "
        "intertravamentos, parada de emergencia, seguranca eletrica e documentacao tecnica."
    ),
    "nr13": (
        "NR13, caldeiras, vasos de pressao e tubulacoes, identificacao do equipamento, "
        "tipo de inspecao, prontuario, dispositivos de seguranca, certificados, medicoes e ensaios."
    ),
    "nr13_calibracao": (
        "NR13, calibracao de valvulas e manometros, set points, desvios, ajustes, "
        "certificados, rastreabilidade metrologica e liberacao para operacao."
    ),
    "nr13_teste_hidrostatico": (
        "NR13, teste hidrostatico/estanqueidade, preparo, bloqueios, instrumentacao, "
        "patamar de pressao, tempo, vazamentos, criterios de aceite e liberacao."
    ),
    "nr13_ultrassom": (
        "NR13, medicao por ultrassom, malha de pontos, calibracao do aparelho, "
        "leituras de espessura, perda por corrosao, integridade e calculos complementares."
    ),
    "nr20_instalacoes": (
        "NR20, instalacoes com inflamaveis/combustiveis, classificacao, documentacao, "
        "analise de riscos, controles preventivos, planos, manutencao e resposta a emergencias."
    ),
    "nr33_espaco_confinado": (
        "NR33, espaco confinado, identificacao e classificacao do espaco, riscos atmosfericos "
        "e fisicos, PET, isolamento, ventilacao, monitoramento, equipe e resgate."
    ),
    "nr35_linha_vida": (
        "NR35, linha de vida, pontos de ancoragem, cabo, esticador, grampos, olhais, "
        "estrutura de fixacao, registros fotograficos e conclusao de uso seguro."
    ),
    "nr35_montagem": (
        "NR35, montagem/fabricacao de linha de vida, materiais, processo executivo, "
        "fixacoes, componentes, rastreabilidade, controle de qualidade e liberacao."
    ),
    "nr35_ponto_ancoragem": (
        "NR35, ponto de ancoragem, estrutura base, fixacao, capacidade, corrosao, "
        "deformacoes, acesso, registro fotografico e criterio de uso."
    ),
    "nr35_projeto": (
        "NR35, projeto de protecao contra queda, riscos de queda, solucao proposta, "
        "linha de vida/ancoragens, memoria tecnica, restricoes de uso e documentos."
    ),
    "pie": (
        "NR10/PIE, prontuario das instalacoes eletricas, documentos obrigatorios, "
        "responsaveis, lacunas, plano de regularizacao e evidencias de controle."
    ),
    "rti": (
        "NR10/RTI, instalacoes eletricas, escopo, evidencias, nao conformidades, "
        "riscos eletricos, medidas corretivas e recomendacoes tecnicas."
    ),
    "spda": (
        "SPDA/NR10, sistema de protecao contra descargas atmosfericas, projeto/croqui, "
        "medicoes, captores, descidas, aterramento, conexoes e nao conformidades."
    ),
}


def _read_value(source: Any, field_name: str) -> Any:
    if isinstance(source, dict):
        return source.get(field_name)
    return getattr(source, field_name, None)


def _truncate(text: Any, *, limit: int) -> str:
    value = str(text or "").strip()
    if len(value) <= limit:
        return value
    return f"{value[: max(0, limit - 1)].rstrip()}..."


def _read_report_pack_value(report_pack_draft: Any, field_name: str) -> str:
    if not isinstance(report_pack_draft, dict):
        return ""
    return str(report_pack_draft.get(field_name) or "").strip()


def _guided_checklist_lines(guided_draft: Any, *, limit: int = 8) -> list[str]:
    raw_checklist = _read_value(guided_draft, "checklist")
    if not isinstance(raw_checklist, list):
        return []

    lines: list[str] = []
    for item in raw_checklist:
        title = _truncate(_read_value(item, "title"), limit=90)
        prompt = _truncate(_read_value(item, "prompt"), limit=160)
        evidence_hint = _truncate(_read_value(item, "evidence_hint"), limit=120)
        if not title and not prompt and not evidence_hint:
            continue
        details = []
        if prompt:
            details.append(prompt)
        if evidence_hint:
            details.append(f"evidencia esperada: {evidence_hint}")
        line = f"- {title or 'Etapa guiada'}"
        if details:
            line = f"{line}: {'; '.join(details)}"
        lines.append(line)
        if len(lines) >= limit:
            break
    return lines


def build_guided_template_prompt_context(
    *,
    laudo: Any,
    guided_draft: Any = None,
    guided_context: Any = None,
    report_pack_draft: dict[str, Any] | None = None,
) -> str:
    """Build a compact prompt block that anchors the AI to the selected NR."""

    template_key = normalizar_tipo_template(
        _read_value(guided_draft, "template_key")
        or _read_report_pack_value(report_pack_draft, "template_key")
        or getattr(laudo, "tipo_template", None)
        or ""
    )
    if not template_key or template_key == "padrao":
        return ""

    family_binding = resolver_familia_padrao_template(template_key)
    template_label = (
        _truncate(_read_value(guided_draft, "template_label"), limit=120)
        or _read_report_pack_value(report_pack_draft, "template_label")
        or getattr(laudo, "catalog_variant_label", None)
        or nome_template_humano(template_key)
    )
    family_key = (
        _read_report_pack_value(report_pack_draft, "family")
        or str(getattr(laudo, "catalog_family_key", "") or "").strip()
        or str(family_binding.get("family_key") or "").strip()
    )
    family_label = (
        str(getattr(laudo, "catalog_family_label", "") or "").strip()
        or str(family_binding.get("family_label") or "").strip()
    )
    focus = _FOCUS_BY_TEMPLATE.get(template_key, "")
    step_title = _truncate(_read_value(guided_context, "step_title"), limit=120)
    step_id = _truncate(_read_value(guided_context, "step_id"), limit=80)
    attachment_kind = _truncate(_read_value(guided_context, "attachment_kind"), limit=40)
    checklist_lines = _guided_checklist_lines(
        guided_draft or getattr(laudo, "guided_inspection_draft_json", None),
    )

    lines = [
        "[foco_template_guiado]",
        "Esta conversa veio de uma inspecao guiada. O template selecionado e a fonte de verdade do escopo tecnico.",
        f"- Template selecionado: {template_label} ({template_key})",
    ]
    if family_key or family_label:
        family_display = family_label or family_key
        family_suffix = f" ({family_key})" if family_key and family_key != family_display else ""
        lines.append(f"- Familia tecnica: {family_display}{family_suffix}")
    if focus:
        lines.append(f"- Foco normativo obrigatorio: {focus}")
    if step_title:
        step_line = f"- Etapa guiada atual: {step_title}"
        if step_id:
            step_line = f"{step_line} ({step_id})"
        if attachment_kind:
            step_line = f"{step_line}; evidencia nova: {attachment_kind}"
        lines.append(step_line)

    lines.extend(
        [
            "- Responda como especialista dessa NR/familia, nao como inspecao generica.",
            "- Priorize perguntas, criterios, evidencias, riscos e recomendacoes conectados a esse escopo.",
            "- Se o usuario trouxer outro tema, sinalize a mudanca de escopo antes de abandonar a NR selecionada.",
            "- Nao invente medicoes, certificados, fotos, ART, responsaveis ou conformidades nao informados.",
            "- Quando faltar dado, faca no maximo 1 ou 2 perguntas objetivas para a proxima lacuna relevante.",
        ]
    )
    if checklist_lines:
        lines.append("- Checklist mobile de referencia:")
        lines.extend(checklist_lines)
    lines.append("[/foco_template_guiado]")
    return "\n".join(lines)


__all__ = ["build_guided_template_prompt_context"]
