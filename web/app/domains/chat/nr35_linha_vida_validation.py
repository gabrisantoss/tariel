"""Validacao estrita do golden path NR35 Linha de Vida."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
import unicodedata

from app.domains.chat.normalization import normalizar_tipo_template, resolver_familia_padrao_template
from app.domains.chat.nr35_linha_vida_pdf_contract import (
    NR35_REQUIRED_PDF_SECTIONS,
    NR35_REQUIRED_PHOTO_SLOTS,
    nr35_photo_slot_contract_by_slot,
)

NR35_FAMILY_KEY = "nr35_inspecao_linha_de_vida"
NR35_TEMPLATE_KEY = "nr35_linha_vida"
NR35_REQUIRED_COMPONENT_KEYS = (
    "fixacao_dos_pontos",
    "condicao_cabo_aco",
    "condicao_esticador",
    "condicao_sapatilha",
    "condicao_olhal",
    "condicao_grampos",
)

_ABSENT_TEXTS = {
    "",
    "n/a",
    "na",
    "nao informado",
    "não informado",
    "nao informada",
    "não informada",
    "indefinido",
    "indefinida",
    "pendente",
    "null",
    "none",
}
_STATUS_ALIASES = {
    "aprovado": "Aprovado",
    "aprovada": "Aprovado",
    "conforme": "Aprovado",
    "liberado": "Aprovado",
    "liberada": "Aprovado",
    "ok": "Aprovado",
    "pendente": "Pendente",
    "em pendencia": "Pendente",
    "avaliacao complementar": "Pendente",
    "aguardando reinspecao": "Pendente",
    "reprovado": "Reprovado",
    "reprovada": "Reprovado",
    "nao conforme": "Reprovado",
    "bloqueio": "Reprovado",
    "bloqueado": "Reprovado",
    "bloqueada": "Reprovado",
    "ajuste": "Reprovado",
    "ajustes": "Reprovado",
}
_APPROVED_MESA_STATUSES = {
    "aprovado",
    "aprovada",
    "aprovado com ressalva",
    "aprovada com ressalva",
    "aprovado_com_ressalva",
    "aprovada_com_ressalva",
}

ValidationLevel = Literal["collection", "mesa", "official_pdf"]


@dataclass(frozen=True)
class NR35LinhaVidaValidationIssue:
    code: str
    message: str
    path: str = ""
    severity: str = "error"
    blocking: bool = True
    context: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
            "path": self.path,
            "severity": self.severity,
            "blocking": self.blocking,
        }
        if self.context:
            payload["context"] = dict(self.context)
        return payload


@dataclass(frozen=True)
class NR35LinhaVidaValidationResult:
    family_key: str
    level: str
    ok: bool
    issues: tuple[NR35LinhaVidaValidationIssue, ...]

    @property
    def pending(self) -> tuple[dict[str, Any], ...]:
        return tuple(issue.to_dict() for issue in self.issues)

    def to_dict(self) -> dict[str, Any]:
        return {
            "family_key": self.family_key,
            "level": self.level,
            "ok": self.ok,
            "issues": [issue.to_dict() for issue in self.issues],
            "pending": list(self.pending),
        }


def _normalize_text(value: Any) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _value_by_path(payload: dict[str, Any], path: str) -> Any:
    current: Any = payload
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _has_required_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return _normalize_text(value) not in _ABSENT_TEXTS
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, list):
        return any(_has_required_value(item) for item in value)
    if isinstance(value, dict):
        if value.get("disponivel") is False:
            return False
        return any(_has_required_value(item) for item in value.values())
    return bool(value)


def _has_any_path(payload: dict[str, Any], paths: tuple[str, ...]) -> bool:
    return any(_has_required_value(_value_by_path(payload, path)) for path in paths)


def _issue(
    code: str,
    message: str,
    *,
    path: str = "",
    context: dict[str, Any] | None = None,
) -> NR35LinhaVidaValidationIssue:
    return NR35LinhaVidaValidationIssue(
        code=code,
        message=message,
        path=path,
        context=context,
    )


def _is_nr35_family(value: Any) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    if text == NR35_FAMILY_KEY:
        return True
    template_key = normalizar_tipo_template(text)
    if template_key == NR35_TEMPLATE_KEY:
        return True
    binding = resolver_familia_padrao_template(template_key)
    return str(binding.get("family_key") or "").strip() == NR35_FAMILY_KEY


def is_nr35_linha_vida_context(
    *,
    payload: dict[str, Any] | None = None,
    template_key: str | None = None,
    catalog_family_key: str | None = None,
) -> bool:
    payload = _as_dict(payload)
    candidates = (
        catalog_family_key,
        template_key,
        payload.get("family_key"),
        payload.get("catalog_family_key"),
        payload.get("template_code"),
        payload.get("template_key"),
    )
    return any(_is_nr35_family(candidate) for candidate in candidates)


def _normalize_conclusion_status(value: Any) -> str | None:
    normalized = _normalize_text(value)
    if not normalized:
        return None
    if normalized in _STATUS_ALIASES:
        return _STATUS_ALIASES[normalized]
    if "reprov" in normalized or "bloque" in normalized or "nao conforme" in normalized:
        return "Reprovado"
    if "pend" in normalized or "reinspec" in normalized or "avaliacao" in normalized:
        return "Pendente"
    if "aprov" in normalized or "conforme" in normalized or "liberad" in normalized:
        return "Aprovado"
    return None


def _normalize_mesa_status(value: Any) -> str:
    return _normalize_text(value).replace("-", "_")


def _payload_has_nonconformity(payload: dict[str, Any]) -> bool:
    lacunas = _as_dict(payload.get("nao_conformidades_ou_lacunas"))
    if lacunas.get("ha_pontos_de_atencao") is True:
        return True
    if _has_required_value(lacunas.get("descricao_pontos_de_atencao")):
        return True
    for component_key in NR35_REQUIRED_COMPONENT_KEYS:
        component = _as_dict(_value_by_path(payload, f"checklist_componentes.{component_key}"))
        condition = _normalize_text(component.get("condicao"))
        if condition in {"nc", "nao conforme", "reprovado", "bloqueio", "bloqueado"}:
            return True
    return False


def _required_field_groups() -> tuple[tuple[tuple[str, ...], str], ...]:
    return (
        (("family_key",), "familia NR35"),
        (("template_code", "template_key"), "template NR35"),
        (("case_context.laudo_id",), "id do laudo"),
        (("case_context.empresa_nome",), "empresa"),
        (("case_context.tipo_inspecao",), "tipo de inspecao"),
        (("case_context.data_execucao", "identificacao.data_vistoria"), "data de execucao/vistoria"),
        (("case_context.data_emissao",), "data de emissao"),
        (("identificacao.objeto_principal",), "objeto principal"),
        (("identificacao.localizacao",), "localizacao"),
        (("identificacao.referencia_principal",), "referencia principal"),
        (("identificacao.codigo_interno",), "codigo interno"),
        (("identificacao.tipo_sistema",), "tipo de sistema"),
        (("objeto_inspecao.descricao_escopo",), "descricao do escopo"),
        (("objeto_inspecao.tipo_linha_de_vida",), "tipo da linha de vida"),
        (("objeto_inspecao.resumo_componentes_avaliados",), "componentes avaliados"),
        (("escopo_servico.tipo_entrega",), "tipo de entrega"),
        (("escopo_servico.modo_execucao",), "modo de execucao"),
        (("execucao_servico.metodo_aplicado",), "metodo aplicado"),
        (("execucao_servico.condicoes_observadas",), "condicoes observadas"),
        (("execucao_servico.evidencia_execucao",), "evidencia de execucao"),
        (("metodologia_e_recursos.metodologia",), "metodologia"),
        (("registros_fotograficos",), "registros fotograficos"),
        (("evidencias_e_anexos.evidencia_principal",), "evidencia principal"),
        (("nao_conformidades_ou_lacunas.ha_pontos_de_atencao",), "indicador de pontos de atencao"),
        (("conclusao.status_operacional",), "status operacional"),
        (("conclusao.justificativa",), "justificativa da conclusao"),
        (("conclusao.liberado_para_uso",), "liberacao para uso"),
        (("conclusao.proxima_inspecao_periodica",), "proxima inspecao"),
    )


def _validate_family_binding(
    *,
    payload: dict[str, Any],
    template_key: str | None,
    catalog_family_key: str | None,
) -> list[NR35LinhaVidaValidationIssue]:
    issues: list[NR35LinhaVidaValidationIssue] = []
    if not is_nr35_linha_vida_context(
        payload=payload,
        template_key=template_key,
        catalog_family_key=catalog_family_key,
    ):
        issues.append(
            _issue(
                "nr35_family_mismatch",
                "O payload nao esta vinculado a familia/template NR35 Linha de Vida.",
                path="family_key",
                context={
                    "expected_family_key": NR35_FAMILY_KEY,
                    "expected_template_key": NR35_TEMPLATE_KEY,
                    "received_family_key": payload.get("family_key"),
                    "received_template_code": payload.get("template_code") or payload.get("template_key"),
                    "template_key": template_key,
                    "catalog_family_key": catalog_family_key,
                },
            )
        )
        return issues

    explicit_family = payload.get("family_key") or catalog_family_key
    if explicit_family and not _is_nr35_family(explicit_family):
        issues.append(
            _issue(
                "nr35_family_swapped",
                "A familia declarada no payload diverge do contrato NR35.",
                path="family_key",
                context={"expected": NR35_FAMILY_KEY, "received": explicit_family},
            )
        )
    explicit_template = payload.get("template_code") or payload.get("template_key") or template_key
    if explicit_template and not _is_nr35_family(explicit_template):
        issues.append(
            _issue(
                "nr35_template_swapped",
                "O template declarado no payload diverge do contrato NR35.",
                path="template_code",
                context={"expected": NR35_TEMPLATE_KEY, "received": explicit_template},
            )
        )
    return issues


def _validate_required_fields(payload: dict[str, Any]) -> list[NR35LinhaVidaValidationIssue]:
    issues: list[NR35LinhaVidaValidationIssue] = []
    for paths, label in _required_field_groups():
        if _has_any_path(payload, paths):
            continue
        issues.append(
            _issue(
                "nr35_required_field_missing",
                f"Campo obrigatorio ausente ou sem justificativa: {label}.",
                path=paths[0],
                context={"accepted_paths": list(paths)},
            )
        )
    for component_key in NR35_REQUIRED_COMPONENT_KEYS:
        path = f"checklist_componentes.{component_key}.condicao"
        if _has_required_value(_value_by_path(payload, path)):
            continue
        issues.append(
            _issue(
                "nr35_component_condition_missing",
                f"Componente critico sem condicao registrada: {component_key}.",
                path=path,
            )
        )
    return issues


def _slot_reference(slot: dict[str, Any]) -> str:
    for key in (
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
        value = slot.get(key)
        if _has_required_value(value):
            return str(value)
    return ""


def _slot_has_human_duplicate_justification(slot: dict[str, Any]) -> bool:
    return any(
        _has_required_value(slot.get(key))
        for key in (
            "duplicate_override_reason",
            "human_override_reason",
            "override_reason",
            "justificativa",
            "justificativa_humana",
        )
    )


def _validate_photo_slots(report_pack_draft: dict[str, Any] | None) -> list[NR35LinhaVidaValidationIssue]:
    issues: list[NR35LinhaVidaValidationIssue] = []
    report_pack_draft = _as_dict(report_pack_draft)
    slots = [slot for slot in _as_list(report_pack_draft.get("image_slots")) if isinstance(slot, dict)]
    slots_by_key = {str(slot.get("slot") or "").strip(): slot for slot in slots}
    refs_by_id: dict[str, list[str]] = {}

    for slot_key in NR35_REQUIRED_PHOTO_SLOTS:
        slot = slots_by_key.get(slot_key)
        if slot is None:
            issues.append(
                _issue(
                    "nr35_required_photo_slot_missing",
                    f"Slot fotografico obrigatorio ausente: {slot_key}.",
                    path=f"report_pack.image_slots.{slot_key}",
                    context={"required_slots": list(NR35_REQUIRED_PHOTO_SLOTS)},
                )
            )
            continue
        status = str(slot.get("status") or "").strip().lower()
        if status != "resolved":
            issues.append(
                _issue(
                    "nr35_required_photo_slot_unresolved",
                    f"Foto obrigatoria ainda nao resolvida: {slot_key}.",
                    path=f"report_pack.image_slots.{slot_key}",
                )
            )
            continue
        reference = _slot_reference(slot)
        if not reference:
            issues.append(
                _issue(
                    "nr35_photo_reference_missing",
                    f"Foto obrigatoria sem referencia persistida: {slot_key}.",
                    path=f"report_pack.image_slots.{slot_key}",
                )
            )
            continue
        refs_by_id.setdefault(reference, []).append(slot_key)

    for reference, slot_keys in refs_by_id.items():
        if len(slot_keys) <= 1:
            continue
        if all(_slot_has_human_duplicate_justification(slots_by_key.get(slot_key, {})) for slot_key in slot_keys):
            continue
        issues.append(
            _issue(
                "nr35_photo_duplicate_without_justification",
                "A mesma imagem nao pode satisfazer multiplos slots obrigatorios sem justificativa humana.",
                path="report_pack.image_slots",
                context={"reference": reference, "slots": slot_keys},
            )
        )
    return issues


def _validate_conclusion(payload: dict[str, Any]) -> list[NR35LinhaVidaValidationIssue]:
    issues: list[NR35LinhaVidaValidationIssue] = []
    conclusion = _as_dict(payload.get("conclusao"))
    if not conclusion:
        return [
            _issue(
                "nr35_conclusion_missing",
                "Conclusao NR35 ausente.",
                path="conclusao",
            )
        ]

    normalized_status = _normalize_conclusion_status(conclusion.get("status"))
    if normalized_status is None:
        issues.append(
            _issue(
                "nr35_conclusion_status_invalid",
                "Conclusao NR35 sem status aceito para o piloto.",
                path="conclusao.status",
                context={"accepted_statuses": ["Aprovado", "Pendente", "Reprovado"]},
            )
        )
    if not _has_required_value(conclusion.get("conclusao_tecnica")):
        issues.append(
            _issue(
                "nr35_conclusion_technical_text_missing",
                "Conclusao tecnica obrigatoria ausente.",
                path="conclusao.conclusao_tecnica",
            )
        )
    if (
        normalized_status in {"Pendente", "Reprovado"}
        or _payload_has_nonconformity(payload)
    ) and not _has_required_value(conclusion.get("acao_requerida")):
        issues.append(
            _issue(
                "nr35_action_required_missing",
                "Acao requerida obrigatoria quando ha pendencia ou nao conformidade.",
                path="conclusao.acao_requerida",
            )
        )
    return issues


def _validate_mesa(payload: dict[str, Any]) -> list[NR35LinhaVidaValidationIssue]:
    mesa_review = _as_dict(payload.get("mesa_review"))
    status = _normalize_mesa_status(mesa_review.get("status"))
    if not status:
        return [
            _issue(
                "nr35_mesa_review_missing",
                "Aprovacao da Mesa e obrigatoria antes da emissao oficial NR35.",
                path="mesa_review.status",
            )
        ]
    if status not in _APPROVED_MESA_STATUSES:
        return [
            _issue(
                "nr35_mesa_review_not_approved",
                "Status da Mesa ainda nao aprova emissao oficial NR35.",
                path="mesa_review.status",
                context={"received": mesa_review.get("status")},
            )
        ]
    return []


def _validate_mesa_human_origin(payload: dict[str, Any]) -> list[NR35LinhaVidaValidationIssue]:
    mesa_review = _as_dict(payload.get("mesa_review"))
    status = _normalize_mesa_status(mesa_review.get("status"))
    if status not in _APPROVED_MESA_STATUSES:
        return []

    issues: list[NR35LinhaVidaValidationIssue] = []
    origin = _normalize_text(mesa_review.get("aprovacao_origem"))
    if origin != "mesa_humana":
        issues.append(
            _issue(
                "nr35_mesa_review_origin_invalid",
                "A emissao oficial NR35 exige aprovacao originada pela Mesa humana.",
                path="mesa_review.aprovacao_origem",
                context={"received": mesa_review.get("aprovacao_origem"), "expected": "mesa_humana"},
            )
        )
    if mesa_review.get("ia_aprovou_mesa") is True:
        issues.append(
            _issue(
                "nr35_mesa_review_ai_approved",
                "A IA nao pode substituir a aprovacao humana da Mesa no piloto NR35.",
                path="mesa_review.ia_aprovou_mesa",
            )
        )
    return issues


def _validate_pdf_versions_and_sections(payload: dict[str, Any]) -> list[NR35LinhaVidaValidationIssue]:
    issues: list[NR35LinhaVidaValidationIssue] = []
    if not _has_required_value(payload.get("template_version")):
        issues.append(
            _issue(
                "nr35_template_version_missing",
                "Versao do template obrigatoria para emissao oficial NR35.",
                path="template_version",
            )
        )
    if not _has_required_value(payload.get("schema_version")):
        issues.append(
            _issue(
                "nr35_schema_version_missing",
                "Versao do schema obrigatoria para emissao oficial NR35.",
                path="schema_version",
            )
        )

    pdf_contract = _as_dict(payload.get("pdf_contract"))
    declared_sections = {
        str(item or "").strip()
        for item in _as_list(pdf_contract.get("required_sections"))
        if str(item or "").strip()
    }
    missing_sections = [
        section
        for section in NR35_REQUIRED_PDF_SECTIONS
        if section not in declared_sections
    ]
    if missing_sections:
        issues.append(
            _issue(
                "nr35_pdf_required_sections_missing",
                "Contrato PDF NR35 sem todas as secoes obrigatorias.",
                path="pdf_contract.required_sections",
                context={"missing_sections": missing_sections, "required_sections": list(NR35_REQUIRED_PDF_SECTIONS)},
            )
        )
    return issues


def _slot_payload_reference(slot: dict[str, Any]) -> str:
    for key in (
        "referencia_persistida",
        "referencia_anexo",
        "referencia",
        "reference",
        "resolved_evidence_id",
        "resolved_message_id",
        "message_id",
        "attachment_id",
        "file_id",
        "url",
        "path",
        "storage_path",
    ):
        value = slot.get(key)
        if _has_required_value(value):
            return str(value)
    return ""


def _slot_payload_caption(slot: dict[str, Any]) -> str:
    for key in (
        "legenda_tecnica",
        "legenda",
        "caption",
        "resolved_caption",
        "descricao",
        "description",
    ):
        value = slot.get(key)
        if _has_required_value(value):
            return str(value)
    return ""


def _photo_traceability_records(
    *,
    payload: dict[str, Any],
    report_pack_draft: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    contracts = nr35_photo_slot_contract_by_slot()
    records: dict[str, dict[str, Any]] = {slot: {"slot": slot, **contracts.get(slot, {})} for slot in NR35_REQUIRED_PHOTO_SLOTS}

    raw_payload_slots = _as_list(_as_dict(payload.get("registros_fotograficos")).get("slots_obrigatorios"))
    for item in raw_payload_slots:
        if not isinstance(item, dict):
            continue
        slot = str(item.get("slot") or item.get("slot_id") or "").strip()
        if slot in records:
            records[slot].update(item)

    report_pack_draft = _as_dict(report_pack_draft)
    for item in _as_list(report_pack_draft.get("image_slots")):
        if not isinstance(item, dict):
            continue
        slot = str(item.get("slot") or "").strip()
        if slot not in records:
            continue
        current = records[slot]
        for target_key, source_keys in {
            "referencia_persistida": (
                "referencia_persistida",
                "referencia_anexo",
                "resolved_evidence_id",
                "resolved_message_id",
                "message_id",
                "attachment_id",
            ),
            "legenda_tecnica": ("legenda_tecnica", "resolved_caption", "caption", "title"),
            "campo_json": ("campo_json", "json_field"),
            "achado_relacionado": ("achado_relacionado", "finding_key"),
            "secao_pdf": ("secao_pdf", "pdf_section"),
        }.items():
            if _has_required_value(current.get(target_key)):
                continue
            for source_key in source_keys:
                if _has_required_value(item.get(source_key)):
                    current[target_key] = item.get(source_key)
                    break
    return records


def _validate_photo_traceability(
    *,
    payload: dict[str, Any],
    report_pack_draft: dict[str, Any] | None,
) -> list[NR35LinhaVidaValidationIssue]:
    issues: list[NR35LinhaVidaValidationIssue] = []
    records = _photo_traceability_records(payload=payload, report_pack_draft=report_pack_draft)
    for slot_key in NR35_REQUIRED_PHOTO_SLOTS:
        record = records.get(slot_key) or {}
        if not _slot_payload_reference(record):
            issues.append(
                _issue(
                    "nr35_photo_reference_missing",
                    f"Foto obrigatoria sem referencia persistida: {slot_key}.",
                    path=f"registros_fotograficos.slots_obrigatorios.{slot_key}.referencia_persistida",
                )
            )
        if not _slot_payload_caption(record):
            issues.append(
                _issue(
                    "nr35_photo_caption_missing",
                    f"Foto obrigatoria sem legenda tecnica: {slot_key}.",
                    path=f"registros_fotograficos.slots_obrigatorios.{slot_key}.legenda_tecnica",
                )
            )
        missing_trace_fields = [
            field
            for field in ("campo_json", "achado_relacionado", "secao_pdf")
            if not _has_required_value(record.get(field))
        ]
        if missing_trace_fields:
            issues.append(
                _issue(
                    "nr35_photo_traceability_missing",
                    f"Foto obrigatoria sem rastreabilidade completa: {slot_key}.",
                    path=f"registros_fotograficos.slots_obrigatorios.{slot_key}",
                    context={"missing_fields": missing_trace_fields},
                )
            )
    return issues


def validate_nr35_linha_vida_golden_path(
    *,
    payload: dict[str, Any] | None,
    report_pack_draft: dict[str, Any] | None = None,
    template_key: str | None = None,
    catalog_family_key: str | None = None,
    level: ValidationLevel = "official_pdf",
) -> NR35LinhaVidaValidationResult:
    payload = _as_dict(payload)
    issues: list[NR35LinhaVidaValidationIssue] = []

    issues.extend(
        _validate_family_binding(
            payload=payload,
            template_key=template_key,
            catalog_family_key=catalog_family_key,
        )
    )
    issues.extend(_validate_required_fields(payload))
    issues.extend(_validate_photo_slots(report_pack_draft))
    issues.extend(_validate_conclusion(payload))
    if level == "official_pdf":
        issues.extend(_validate_pdf_versions_and_sections(payload))
        issues.extend(_validate_photo_traceability(payload=payload, report_pack_draft=report_pack_draft))
        issues.extend(_validate_mesa(payload))
        issues.extend(_validate_mesa_human_origin(payload))

    blocking_issues = tuple(issue for issue in issues if issue.blocking)
    return NR35LinhaVidaValidationResult(
        family_key=NR35_FAMILY_KEY,
        level=level,
        ok=not blocking_issues,
        issues=tuple(issues),
    )


def build_nr35_linha_vida_official_issue_blockers(
    *,
    payload: dict[str, Any] | None,
    report_pack_draft: dict[str, Any] | None = None,
    template_key: str | None = None,
    catalog_family_key: str | None = None,
) -> list[dict[str, Any]]:
    if not is_nr35_linha_vida_context(
        payload=payload,
        template_key=template_key,
        catalog_family_key=catalog_family_key,
    ):
        return []
    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=report_pack_draft,
        template_key=template_key,
        catalog_family_key=catalog_family_key,
        level="official_pdf",
    )
    if result.ok:
        return []
    first_issue = next((issue for issue in result.issues if issue.blocking), result.issues[0])
    return [
        {
            "code": "nr35_golden_path_validation_failed",
            "title": "Validacao NR35 pendente",
            "message": f"Emissao oficial bloqueada pelo contrato NR35: {first_issue.message}",
            "blocking": True,
            "validation": result.to_dict(),
        }
    ]


__all__ = [
    "NR35_FAMILY_KEY",
    "NR35_TEMPLATE_KEY",
    "NR35_REQUIRED_PHOTO_SLOTS",
    "NR35LinhaVidaValidationIssue",
    "NR35LinhaVidaValidationResult",
    "build_nr35_linha_vida_official_issue_blockers",
    "is_nr35_linha_vida_context",
    "validate_nr35_linha_vida_golden_path",
]
