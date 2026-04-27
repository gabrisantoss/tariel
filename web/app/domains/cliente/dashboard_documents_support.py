"""Helpers documentais do bootstrap do portal admin-cliente."""

from __future__ import annotations

from typing import Any


DOCUMENT_PACKAGE_SECTION_LABELS = {
    "documento_oficial": "Emissão oficial",
    "historico_emissoes": "Histórico de emissões",
    "anexos_mesa": "Anexos da mesa",
    "evidencias_selecionadas": "Evidências selecionadas",
    "trilha_interna": "Trilha interna",
}

_DOCUMENT_VISUAL_STATE_LABELS = {
    "official": "Emissão oficial",
    "draft": "PDF operacional",
    "in_review": "Em revisão",
    "historical": "Histórico",
    "internal": "Interno",
}

_ISSUE_STATE_UI_LABELS = {
    "issued": "Emitido",
    "superseded": "Substituído",
    "revoked": "Revogado",
}

_DOCUMENT_STATUS_UI_LABELS = {
    "collecting": "Em coleta",
    "pending": "Pendente",
    "internal_review": "Em revisão interna",
    "mesa": "Na Mesa",
    "approved": "Aprovado",
    "issued": "Emitido",
    "reissue": "Reemissão recomendada",
    "superseded": "Substituído",
    "package_blocked": "Bloqueado por pacote",
    "family_blocked": "Bloqueado por família",
}


def _texto_curto(value: Any, *, fallback: str | None = None) -> str | None:
    texto = " ".join(str(value or "").strip().split())
    if texto:
        return texto
    return fallback


def _isoformat_or_none(value: Any) -> str | None:
    return value.isoformat() if hasattr(value, "isoformat") else None


def canonical_issue_state_label(value: Any, *, fallback: str | None = None) -> str | None:
    key = str(value or "").strip().lower()
    return _ISSUE_STATE_UI_LABELS.get(key) or _texto_curto(fallback)


def _resolve_document_status_key(
    *,
    emissao_oficial: dict[str, Any],
    payload_laudo: dict[str, Any],
    current_issue: dict[str, Any],
) -> str:
    issue_state = str(current_issue.get("issue_state") or "").strip().lower()
    blockers = list(emissao_oficial.get("blockers") or [])
    lifecycle = str(payload_laudo.get("case_lifecycle_status") or "").strip().lower()
    review_phase = str(emissao_oficial.get("review_phase") or "").strip().lower()

    if issue_state == "superseded":
        return "superseded"
    if bool(emissao_oficial.get("reissue_recommended")):
        return "reissue"
    if issue_state == "issued" or bool(emissao_oficial.get("already_issued")):
        return "issued"
    if lifecycle in {"aprovado", "emitido"}:
        return "approved"
    if review_phase == "mesa_context":
        return "mesa"
    if review_phase in {"awaiting_field", "review_in_progress"} or lifecycle in {"aguardando", "em_revisao"}:
        return "internal_review"
    blocker_codes = {str((item or {}).get("code") or "").strip().lower() for item in blockers}
    if any("mesa_required" in code or "family" in code for code in blocker_codes):
        return "family_blocked"
    if blockers:
        return "package_blocked"
    if bool(emissao_oficial.get("ready_for_issue")):
        return "pending"
    return "collecting"


def build_document_ui_language(
    *,
    emissao_oficial: dict[str, Any],
    payload_laudo: dict[str, Any],
    visual_state: str,
    visual_state_label: str,
    visual_state_detail: str,
) -> dict[str, Any]:
    current_issue = dict(emissao_oficial.get("current_issue") or {})
    issue_state = str(current_issue.get("issue_state") or "").strip().lower()
    issue_state_label = canonical_issue_state_label(
        issue_state,
        fallback=str(current_issue.get("issue_state_label") or "").strip() or None,
    )
    pdf_present = bool(emissao_oficial.get("pdf_present"))
    has_official_issue = bool(current_issue) or bool(emissao_oficial.get("already_issued"))
    reissue_recommended = bool(emissao_oficial.get("reissue_recommended"))
    status_key = _resolve_document_status_key(
        emissao_oficial=emissao_oficial,
        payload_laudo=payload_laudo,
        current_issue=current_issue,
    )

    if reissue_recommended:
        document_kind_label = "Reemissão recomendada"
        document_kind_detail = "O caso técnico mudou depois da emissão ativa e precisa de nova aprovação/emissão."
    elif issue_state == "superseded":
        document_kind_label = "Documento substituído"
        document_kind_detail = "A emissão permanece no histórico, mas não é a versão principal."
    elif has_official_issue:
        document_kind_label = "Emissão oficial"
        document_kind_detail = "Documento emitido pelo motor oficial com pacote, hash e auditoria."
    elif pdf_present:
        document_kind_label = "PDF operacional"
        document_kind_detail = "Arquivo de trabalho do caso; não substitui emissão oficial."
    else:
        document_kind_label = "Documento técnico"
        document_kind_detail = "Registro técnico ainda sem emissão oficial."

    return {
        "document_kind_label": document_kind_label,
        "document_kind_detail": document_kind_detail,
        "status_label": _DOCUMENT_STATUS_UI_LABELS.get(status_key, visual_state_label or "Documento"),
        "status_key": status_key,
        "visual_state_label": visual_state_label,
        "visual_state_detail": visual_state_detail,
        "official_issue_label": "Emissão oficial",
        "official_package_label": "Pacote oficial",
        "issued_document_label": "Documento emitido",
        "operational_pdf_label": "PDF operacional",
        "history_label": "Histórico de emissões",
        "reissue_label": "Reemissão recomendada",
        "superseded_label": "Documento substituído",
        "internal_review_label": "Revisão interna governada",
        "mesa_label": "Mesa Avaliadora",
        "case_pending_label": "Pendências do caso",
        "package_not_included_label": "Não incluído no pacote",
        "family_dependent_label": "Depende da família/template",
        "family_requires_mesa_label": "Família exige Mesa",
        "audit_label": "Auditoria",
        "package_resources_label": "Recursos do pacote",
        "issue_state_label": issue_state_label,
        "issue_number_label": _texto_curto(current_issue.get("issue_number")),
    }


def document_visual_state(
    *,
    emissao_oficial: dict[str, Any],
    payload_laudo: dict[str, Any],
) -> tuple[str, str, str]:
    current_issue = dict(emissao_oficial.get("current_issue") or {})
    issue_state = str(current_issue.get("issue_state") or "").strip().lower()
    already_issued = bool(emissao_oficial.get("already_issued"))
    reissue_recommended = bool(emissao_oficial.get("reissue_recommended"))
    ready_for_issue = bool(emissao_oficial.get("ready_for_issue"))
    blockers = list(emissao_oficial.get("blockers") or [])
    lifecycle = str(payload_laudo.get("case_lifecycle_status") or "").strip().lower()
    review_phase = str(emissao_oficial.get("review_phase") or "").strip().lower()
    pdf_present = bool(emissao_oficial.get("pdf_present"))

    if issue_state in {"superseded", "revoked"}:
        state = "historical"
        detail = "Há emissão anterior congelada fora da trilha ativa."
    elif already_issued and not reissue_recommended:
        state = "official"
        detail = "Documento oficial alinhado ao caso técnico atual."
    elif already_issued and reissue_recommended:
        state = "historical"
        detail = "Existe emissão ativa, mas o caso atual pede reemissão oficial."
    elif review_phase in {"awaiting_field", "mesa_context", "review_in_progress"} or lifecycle in {"aguardando", "em_revisao"}:
        state = "in_review"
        detail = "O documento depende de aprovação, complemento ou decisão humana."
    elif ready_for_issue or pdf_present:
        state = "draft"
        detail = "O documento já tem material técnico, mas ainda não fechou o ciclo oficial."
    else:
        state = "internal"
        detail = (
            _texto_curto((blockers[0] or {}).get("message"))
            if blockers
            else "A trilha documental ainda está só no contexto interno do caso."
        ) or "A trilha documental ainda está só no contexto interno do caso."
    return state, _DOCUMENT_VISUAL_STATE_LABELS.get(state, "Documento"), detail


def build_document_package_sections(
    *,
    emissao_oficial: dict[str, Any],
    document_signals: dict[str, Any],
) -> dict[str, Any]:
    delivery_manifest = dict(emissao_oficial.get("delivery_manifest") or {})
    present_paths = [
        str(item).strip()
        for item in list(delivery_manifest.get("present_archive_paths") or [])
        if str(item).strip()
    ]
    current_issue = dict(emissao_oficial.get("current_issue") or {})
    sections: dict[str, dict[str, Any]] = {}
    mapped_paths: set[str] = set()

    def _append(section_key: str, path: str, label: str) -> None:
        normalized_path = str(path or "").strip()
        if not normalized_path:
            return
        bucket = sections.setdefault(
            section_key,
            {
                "key": section_key,
                "label": DOCUMENT_PACKAGE_SECTION_LABELS[section_key],
                "count": 0,
                "items": [],
            },
        )
        bucket["items"].append({"archive_path": normalized_path, "label": label})
        bucket["count"] += 1
        mapped_paths.add(normalized_path)

    for path in present_paths:
        lowered = path.lower()
        if "anexos_mesa/" in lowered:
            _append("anexos_mesa", path, "Anexo da mesa")
        elif "documentos/" in lowered or "metadados/verificacao_publica" in lowered:
            _append("documento_oficial", path, "Emissão oficial")

    if current_issue:
        issue_number = _texto_curto(current_issue.get("issue_number"), fallback="Emissão ativa") or "Emissão ativa"
        _append("historico_emissoes", f"historico_emissoes/{issue_number}.json", issue_number)
        reissue_origin = _texto_curto(current_issue.get("reissue_of_issue_number"))
        if reissue_origin:
            _append("historico_emissoes", f"historico_emissoes/{reissue_origin}.json", f"Substitui {reissue_origin}")

    for label in list(document_signals.get("present_labels") or []):
        signal_slug = str(label).strip().lower().replace(" ", "_")
        _append("evidencias_selecionadas", f"evidencias_selecionadas/{signal_slug}.txt", str(label))

    for path in present_paths:
        if path in mapped_paths:
            continue
        _append("trilha_interna", path, "Trilha interna")

    for section_key in DOCUMENT_PACKAGE_SECTION_LABELS:
        sections.setdefault(
            section_key,
            {
                "key": section_key,
                "label": DOCUMENT_PACKAGE_SECTION_LABELS[section_key],
                "count": 0,
                "items": [],
            },
        )

    ordered = [sections[key] for key in DOCUMENT_PACKAGE_SECTION_LABELS]
    return {
        "items": ordered,
        "counts": {item["key"]: int(item["count"]) for item in ordered},
    }


def build_document_summary_card(
    *,
    emissao_oficial: dict[str, Any],
    verificacao_publica: dict[str, Any],
    payload_laudo: dict[str, Any],
) -> dict[str, Any]:
    current_issue = dict(emissao_oficial.get("current_issue") or {})
    return {
        "current_version": _texto_curto(current_issue.get("issue_number"), fallback="v0000"),
        "issued_by": _texto_curto(((current_issue.get("issued_by_snapshot") or {}) or {}).get("nome"))
        or _texto_curto(current_issue.get("signatory_name")),
        "issued_at": _isoformat_or_none(current_issue.get("issued_at")),
        "replaces_issue": _texto_curto(current_issue.get("reissue_of_issue_number")),
        "hash": _texto_curto(verificacao_publica.get("hash_short")),
        "case_status": _texto_curto(payload_laudo.get("status_visual_label")),
    }


def build_document_timeline(
    *,
    emissao_oficial: dict[str, Any],
) -> list[dict[str, Any]]:
    audit_trail = list(emissao_oficial.get("audit_trail") or [])
    current_issue = dict(emissao_oficial.get("current_issue") or {})
    item_by_key = {
        str(item.get("event_key") or "").strip(): item
        for item in audit_trail
        if isinstance(item, dict)
    }
    timeline = []

    def _push(key: str, label: str, summary: str | None, done: bool) -> None:
        timeline.append(
            {
                "key": key,
                "label": label,
                "done": bool(done),
                "summary": _texto_curto(summary),
            }
        )

    _push(
        "aprovado",
        "Aprovado",
        _texto_curto((item_by_key.get("review_approval") or {}).get("summary")),
        str(emissao_oficial.get("case_lifecycle_status") or "") in {"aprovado", "emitido"},
    )
    _push(
        "emitido",
        "Emitido",
        _texto_curto((item_by_key.get("official_issue_record") or {}).get("summary")),
        bool(current_issue),
    )
    _push(
        "reaberto",
        "Reaberto",
        _texto_curto(emissao_oficial.get("next_action_summary")),
        str(emissao_oficial.get("case_operational_phase") or "") == "reopened_after_issue",
    )
    _push(
        "reemitido",
        "Reemitido",
        _texto_curto(current_issue.get("reissue_reason_summary")),
        bool(_texto_curto(current_issue.get("reissue_of_issue_number"))),
    )
    _push(
        "supersedido",
        "Supersedido",
        _texto_curto(current_issue.get("superseded_by_issue_number")),
        bool(_texto_curto(current_issue.get("superseded_by_issue_number"))),
    )
    return timeline


__all__ = [
    "DOCUMENT_PACKAGE_SECTION_LABELS",
    "build_document_ui_language",
    "build_document_package_sections",
    "build_document_summary_card",
    "build_document_timeline",
    "canonical_issue_state_label",
    "document_visual_state",
]
