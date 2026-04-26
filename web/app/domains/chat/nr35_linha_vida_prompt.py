"""Prompt e normalizacao pos-IA do golden path NR35 Linha de Vida."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import json
from typing import Any

from app.domains.chat.nr35_linha_vida_pdf_contract import (
    NR35_REQUIRED_PHOTO_SLOTS,
    NR35_TRACEABILITY_CHAIN,
    nr35_pdf_contract_payload,
    nr35_photo_slot_contract_by_slot,
    nr35_required_pdf_sections_text,
    nr35_required_photo_slots_text,
)
from app.domains.chat.nr35_linha_vida_validation import (
    NR35_FAMILY_KEY,
    NR35_TEMPLATE_KEY,
    is_nr35_linha_vida_context,
)

NR35_AI_PROMPT_CONTRACT_VERSION = "nr35_linha_vida_prompt_v1"

NR35_AI_REQUIRED_OUTPUT_BLOCKS: tuple[str, ...] = (
    "family_key",
    "template_code",
    "schema_version",
    "template_version",
    "case_context",
    "identificacao",
    "objeto_inspecao",
    "escopo_servico",
    "execucao_servico",
    "metodologia_e_recursos",
    "registros_fotograficos",
    "evidencias_e_anexos",
    "checklist_componentes",
    "achados",
    "nao_conformidades_ou_lacunas",
    "recomendacoes",
    "conclusao",
    "mesa_review",
    "pdf_contract",
    "auditoria",
    "ia_assessment",
)

NR35_AI_FORBIDDEN_INVENTIONS: tuple[str, ...] = (
    "numero de ART",
    "CREA",
    "codigo interno",
    "data",
    "responsavel tecnico",
    "numero de laudo",
    "aprovacao Mesa",
    "liberacao de PDF oficial",
)

NR35_AI_IMAGE_RULES: tuple[str, ...] = (
    "Use somente fotos com referencia persistida.",
    "Se a foto nao estiver clara, marque o slot como pendente.",
    "Se a foto nao mostrar claramente o componente, nao use como prova forte.",
    "Cada foto obrigatoria precisa de legenda tecnica.",
    "A foto_detalhe_critico deve apontar para componente, risco, nao conformidade ou identificacao relevante.",
    "Uma mesma imagem nao deve preencher multiplos slots sem justificativa humana.",
)


@dataclass(frozen=True)
class NR35LinhaVidaPromptContract:
    system_instruction: str
    user_instruction: str
    required_output_blocks: tuple[str, ...]
    required_photo_slots: tuple[str, ...]
    pending_photo_slots: tuple[str, ...]
    evidence_summary: tuple[dict[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "contract_version": NR35_AI_PROMPT_CONTRACT_VERSION,
            "system_instruction": self.system_instruction,
            "user_instruction": self.user_instruction,
            "required_output_blocks": list(self.required_output_blocks),
            "required_photo_slots": list(self.required_photo_slots),
            "pending_photo_slots": list(self.pending_photo_slots),
            "evidence_summary": [dict(item) for item in self.evidence_summary],
        }


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _pick_first_text(*values: Any) -> str:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return ""


def _compact_json(value: Any, *, limit: int = 5000) -> str:
    try:
        text = json.dumps(value, ensure_ascii=False, sort_keys=True)
    except (TypeError, ValueError):
        text = str(value or "")
    return text[:limit]


def _slot_reference(slot: dict[str, Any]) -> str:
    for key in (
        "referencia_persistida",
        "resolved_evidence_id",
        "resolved_message_id",
        "evidence_id",
        "message_id",
        "attachment_id",
        "file_id",
        "url",
        "path",
        "storage_path",
        "referencia_anexo",
        "reference",
    ):
        value = _pick_first_text(slot.get(key))
        if value:
            return value
    return ""


def _photo_slot_records_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    registros = payload.get("registros_fotograficos")
    if isinstance(registros, dict):
        raw_records = registros.get("slots_obrigatorios") or registros.get("required_slots")
        return [item for item in _as_list(raw_records) if isinstance(item, dict)]
    if isinstance(registros, list):
        return [item for item in registros if isinstance(item, dict)]
    return []


def _photo_slot_records_from_report_pack(report_pack_draft: dict[str, Any] | None) -> list[dict[str, Any]]:
    report_pack_draft = _as_dict(report_pack_draft)
    return [
        item
        for item in _as_list(report_pack_draft.get("image_slots"))
        if isinstance(item, dict)
    ]


def _normalize_photo_slot_record(slot_key: str, source: dict[str, Any] | None) -> dict[str, Any]:
    contracts = nr35_photo_slot_contract_by_slot()
    contract = contracts.get(slot_key, {})
    source = _as_dict(source)
    reference = _slot_reference(source)
    status = _pick_first_text(source.get("status"))
    is_pending = not reference or status.lower() == "pending"
    record: dict[str, Any] = {
        "slot": slot_key,
        "titulo": _pick_first_text(
            source.get("titulo"),
            source.get("title"),
            source.get("label"),
            contract.get("label"),
        ),
        "referencia_persistida": reference,
        "legenda_tecnica": _pick_first_text(
            source.get("legenda_tecnica"),
            source.get("legenda"),
            source.get("caption"),
            source.get("resolved_caption"),
            source.get("descricao"),
            source.get("description"),
        ),
        "campo_json": _pick_first_text(source.get("campo_json"), source.get("json_field"), contract.get("json_field")),
        "achado_relacionado": _pick_first_text(
            source.get("achado_relacionado"),
            source.get("finding_key"),
            contract.get("finding_key"),
        ),
        "secao_pdf": _pick_first_text(source.get("secao_pdf"), source.get("pdf_section"), contract.get("pdf_section")),
        "confidence": _pick_first_text(source.get("confidence"), source.get("confidence_ia")) or ("baixa" if is_pending else "media"),
    }
    if is_pending:
        record["pendencia"] = _pick_first_text(
            source.get("pendencia"),
            source.get("missing_reason"),
            "foto_obrigatoria_ausente_ou_nao_clara",
        )
    return record


def _photo_records_by_required_slot(
    *,
    payload: dict[str, Any],
    report_pack_draft: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    records_by_slot: dict[str, dict[str, Any]] = {}
    payload_records = _photo_slot_records_from_payload(payload)
    for index, item in enumerate(payload_records):
        slot_key = _pick_first_text(item.get("slot"), item.get("slot_id"))
        if not slot_key and index < len(NR35_REQUIRED_PHOTO_SLOTS):
            slot_key = NR35_REQUIRED_PHOTO_SLOTS[index]
        if slot_key in NR35_REQUIRED_PHOTO_SLOTS:
            records_by_slot[slot_key] = item

    for item in _photo_slot_records_from_report_pack(report_pack_draft):
        slot_key = _pick_first_text(item.get("slot"), item.get("slot_id"))
        if slot_key not in NR35_REQUIRED_PHOTO_SLOTS:
            continue
        current = records_by_slot.get(slot_key)
        if current is None or not _slot_reference(current):
            records_by_slot[slot_key] = item
    return records_by_slot


def _photo_slots_summary(report_pack_draft: dict[str, Any] | None) -> tuple[tuple[dict[str, Any], ...], tuple[str, ...]]:
    records_by_slot = _photo_records_by_required_slot(payload={}, report_pack_draft=report_pack_draft)
    summary: list[dict[str, Any]] = []
    pending: list[str] = []
    for slot_key in NR35_REQUIRED_PHOTO_SLOTS:
        normalized = _normalize_photo_slot_record(slot_key, records_by_slot.get(slot_key))
        if not normalized.get("referencia_persistida"):
            pending.append(slot_key)
        summary.append(normalized)
    return tuple(summary), tuple(pending)


def build_nr35_linha_vida_system_instruction() -> str:
    output_blocks = ", ".join(NR35_AI_REQUIRED_OUTPUT_BLOCKS)
    forbidden = "; ".join(NR35_AI_FORBIDDEN_INVENTIONS)
    image_rules = "\n".join(f"- {rule}" for rule in NR35_AI_IMAGE_RULES)
    pdf_sections = nr35_required_pdf_sections_text()
    photo_slots = nr35_required_photo_slots_text()
    return f"""
Voce e um assistente tecnico para preencher JSON estruturado do piloto NR35 Linha de Vida.

Contrato obrigatorio:
- A familia e sempre {NR35_FAMILY_KEY}; o alias runtime e {NR35_TEMPLATE_KEY}.
- Nao troque a familia e nao adapte para outro tipo de laudo.
- Preencha somente o que estiver sustentado por historico, fotos, documentos ou dados do caso.
- Quando faltar fonte, deixe pendente e explique a lacuna; nao invente.
- Nao crie sem fonte: {forbidden}.
- Mesa e obrigatoria: mesa_review.status deve permanecer pendente ate revisao humana real.
- Nunca declare PDF oficial liberado, emitido ou aprovado.
- O PDF oficial depende de validacao estrita e aprovacao Mesa humana.

Blocos esperados no JSON: {output_blocks}.

Fotos obrigatorias: {photo_slots}.
Regras de imagem:
{image_rules}

Rastreabilidade obrigatoria: {NR35_TRACEABILITY_CHAIN}.
Secoes minimas do PDF: {pdf_sections}.

Separe claramente observacao, achado, nao conformidade, recomendacao e conclusao.
Inclua confidence por achado quando possivel e recomende revisao humana quando houver ambiguidade.
Se houver pendencia ou nao conformidade, conclusao.acao_requerida e obrigatoria.
""".strip()


def build_nr35_linha_vida_user_instruction(
    *,
    report_pack_draft: dict[str, Any] | None = None,
    case_payload_context: dict[str, Any] | None = None,
) -> str:
    evidence_summary, pending_slots = _photo_slots_summary(report_pack_draft)
    lines = [
        "Gere apenas JSON para nr35_inspecao_linha_de_vida.",
        "Use o historico da conversa, documentos anexos e o resumo de evidencias abaixo.",
        "Se qualquer slot fotografico estiver pendente, registre pendencia bloqueante; nao substitua foto por texto.",
        "Mesa deve ficar pendente e PDF oficial deve ficar bloqueado ate revisao humana.",
        "",
        "[Contrato fotografico NR35]",
        _compact_json(list(evidence_summary)),
    ]
    if pending_slots:
        lines.extend(
            [
                "",
                "[Slots fotograficos pendentes]",
                ", ".join(pending_slots),
            ]
        )
    if case_payload_context:
        lines.extend(
            [
                "",
                "[Contexto estruturado existente do caso]",
                _compact_json(case_payload_context),
            ]
        )
    lines.extend(
        [
            "",
            "[Saida esperada]",
            "Retorne JSON coerente com o schema/template NR35 atual, incluindo pdf_contract, auditoria, "
            "registros_fotograficos.slots_obrigatorios, mesa_review.status='pendente' e ia_assessment.",
        ]
    )
    return "\n".join(lines)


def build_nr35_linha_vida_prompt_contract(
    *,
    template_key: str | None = None,
    catalog_family_key: str | None = None,
    report_pack_draft: dict[str, Any] | None = None,
    case_payload_context: dict[str, Any] | None = None,
) -> NR35LinhaVidaPromptContract | None:
    if not is_nr35_linha_vida_context(
        template_key=template_key,
        catalog_family_key=catalog_family_key,
    ):
        return None
    evidence_summary, pending_slots = _photo_slots_summary(report_pack_draft)
    return NR35LinhaVidaPromptContract(
        system_instruction=build_nr35_linha_vida_system_instruction(),
        user_instruction=build_nr35_linha_vida_user_instruction(
            report_pack_draft=report_pack_draft,
            case_payload_context=case_payload_context,
        ),
        required_output_blocks=NR35_AI_REQUIRED_OUTPUT_BLOCKS,
        required_photo_slots=NR35_REQUIRED_PHOTO_SLOTS,
        pending_photo_slots=pending_slots,
        evidence_summary=evidence_summary,
    )


def _status_requires_action(value: Any) -> bool:
    text = str(value or "").strip().lower()
    return any(token in text for token in ("pend", "reprov", "bloque", "nao conforme", "ajuste"))


def _payload_has_nonconformity(payload: dict[str, Any]) -> bool:
    lacunas = _as_dict(payload.get("nao_conformidades_ou_lacunas"))
    if lacunas.get("ha_pontos_de_atencao") is True:
        return True
    if _pick_first_text(
        lacunas.get("descricao"),
        lacunas.get("descricao_pontos_de_atencao"),
        lacunas.get("limitacoes_de_inspecao"),
    ):
        return True
    checklist = _as_dict(payload.get("checklist_componentes"))
    for item in checklist.values():
        condition = str(_as_dict(item).get("condicao") or "").strip().lower()
        if condition in {"nc", "nao conforme", "reprovado", "bloqueio"}:
            return True
    return False


def _photo_slot_summary_text(records: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for record in records:
        slot = _pick_first_text(record.get("slot"))
        reference = _pick_first_text(record.get("referencia_persistida"))
        field = _pick_first_text(record.get("campo_json"))
        section = _pick_first_text(record.get("secao_pdf"))
        if not slot:
            continue
        parts.append(
            " | ".join(
                item
                for item in (
                    f"slot={slot}",
                    f"referencia={reference}" if reference else "",
                    f"campo_json={field}" if field else "",
                    f"secao_pdf={section}" if section else "",
                )
                if item
            )
        )
    return "; ".join(parts)


def normalize_nr35_linha_vida_ai_output(
    raw_payload: dict[str, Any] | None,
    *,
    report_pack_draft: dict[str, Any] | None = None,
    schema_version: Any = 1,
    template_version: Any = 1,
) -> dict[str, Any]:
    """Preserva o contrato NR35 sem converter lacunas em fatos inventados."""

    payload = deepcopy(raw_payload) if isinstance(raw_payload, dict) else {}
    if not payload.get("family_key"):
        payload["family_key"] = NR35_FAMILY_KEY
    if not payload.get("template_code") and not payload.get("template_key"):
        payload["template_code"] = NR35_TEMPLATE_KEY
    payload.setdefault("schema_version", schema_version or 1)
    payload.setdefault("template_version", template_version or 1)

    records_by_slot = _photo_records_by_required_slot(
        payload=payload,
        report_pack_draft=report_pack_draft,
    )
    normalized_photo_slots = [
        _normalize_photo_slot_record(slot_key, records_by_slot.get(slot_key))
        for slot_key in NR35_REQUIRED_PHOTO_SLOTS
    ]
    pending_slots = [
        record["slot"]
        for record in normalized_photo_slots
        if not _pick_first_text(record.get("referencia_persistida"))
    ]

    registros = payload.get("registros_fotograficos")
    if not isinstance(registros, dict):
        registros = {}
        payload["registros_fotograficos"] = registros
    registros["slots_obrigatorios"] = normalized_photo_slots
    registros["slots_obrigatorios_texto"] = _photo_slot_summary_text(normalized_photo_slots)

    contract = nr35_pdf_contract_payload(
        schema_version=payload.get("schema_version"),
        template_version=payload.get("template_version"),
    )
    pdf_contract = payload.setdefault("pdf_contract", {})
    if not isinstance(pdf_contract, dict):
        pdf_contract = {}
        payload["pdf_contract"] = pdf_contract
    for key, value in contract.items():
        pdf_contract.setdefault(key, value)

    mesa_review = payload.setdefault("mesa_review", {})
    if not isinstance(mesa_review, dict):
        mesa_review = {}
        payload["mesa_review"] = mesa_review
    returned_mesa_status = _pick_first_text(mesa_review.get("status"))
    if returned_mesa_status and returned_mesa_status.lower() not in {"pendente", "em_revisao", "aguardando_mesa"}:
        mesa_review["ia_returned_status_ignored"] = returned_mesa_status
    mesa_review["status"] = "pendente"
    mesa_review.setdefault(
        "observacoes_mesa",
        "A IA nao aprova Mesa; aguardando revisao humana obrigatoria.",
    )

    conclusion = payload.get("conclusao")
    if not isinstance(conclusion, dict):
        conclusion = {}
        payload["conclusao"] = conclusion
    if not _pick_first_text(conclusion.get("status")) and pending_slots:
        conclusion["status"] = "Pendente"
    if (
        _status_requires_action(conclusion.get("status"))
        or _payload_has_nonconformity(payload)
    ) and not _pick_first_text(conclusion.get("acao_requerida")):
        conclusion["acao_requerida"] = "pendente_revisao_humana"

    auditoria = payload.setdefault("auditoria", {})
    if not isinstance(auditoria, dict):
        auditoria = {}
        payload["auditoria"] = auditoria
    auditoria.setdefault("family_key", payload.get("family_key"))
    auditoria.setdefault("template_code", payload.get("template_code") or payload.get("template_key"))
    auditoria.setdefault("schema_version", payload.get("schema_version"))
    auditoria.setdefault("template_version", payload.get("template_version"))
    auditoria["mesa_status"] = mesa_review.get("status")
    auditoria.setdefault("rastreabilidade_texto", NR35_TRACEABILITY_CHAIN)
    auditoria.setdefault("emissao_oficial_status", "bloqueada_ate_validacao_mesa_pdf")

    assessment = payload.setdefault("ia_assessment", {})
    if not isinstance(assessment, dict):
        assessment = {}
        payload["ia_assessment"] = assessment
    assessment["prompt_contract_version"] = NR35_AI_PROMPT_CONTRACT_VERSION
    assessment["pdf_oficial_liberado"] = False
    assessment["mesa_substituida"] = False
    assessment["revisao_humana_recomendada"] = True
    assessment["confidence_geral"] = assessment.get("confidence_geral") or (
        "baixa" if pending_slots else "media"
    )
    assessment["pendencias"] = [
        {
            "code": "nr35_required_photo_slot_pending",
            "slot": slot,
            "message": f"Foto obrigatoria pendente ou sem referencia persistida: {slot}.",
        }
        for slot in pending_slots
    ]
    explicit_family = _pick_first_text(payload.get("family_key"))
    explicit_template = _pick_first_text(payload.get("template_code"), payload.get("template_key"))
    if explicit_family and explicit_family != NR35_FAMILY_KEY:
        assessment["family_mismatch_detected"] = True
    if explicit_template and explicit_template not in {NR35_TEMPLATE_KEY, NR35_FAMILY_KEY}:
        assessment["family_mismatch_detected"] = True

    return payload


__all__ = [
    "NR35_AI_FORBIDDEN_INVENTIONS",
    "NR35_AI_IMAGE_RULES",
    "NR35_AI_PROMPT_CONTRACT_VERSION",
    "NR35_AI_REQUIRED_OUTPUT_BLOCKS",
    "NR35LinhaVidaPromptContract",
    "build_nr35_linha_vida_prompt_contract",
    "build_nr35_linha_vida_system_instruction",
    "build_nr35_linha_vida_user_instruction",
    "normalize_nr35_linha_vida_ai_output",
]
