"""Revisao humana estruturada do JSON NR35 Linha de Vida."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.domains.chat.nr35_linha_vida_prompt import normalize_nr35_linha_vida_ai_output
from app.domains.chat.nr35_linha_vida_validation import (
    NR35_FAMILY_KEY,
    NR35_TEMPLATE_KEY,
    is_nr35_linha_vida_context,
    validate_nr35_linha_vida_golden_path,
)
from app.domains.chat.revisao_helpers import _registrar_revisao_laudo
from app.shared.database import Laudo, StatusRevisao, Usuario

NR35_STRUCTURED_REVIEW_VERSION = "nr35_structured_review_v1"

_BLOCK_LABELS: dict[str, str] = {
    "identificacao": "Identificacao",
    "objeto_inspecao": "Objeto da inspecao",
    "evidencias_fotos": "Evidencias e fotos",
    "checklist_componentes": "Checklist de componentes",
    "achados": "Achados",
    "nao_conformidades": "Nao conformidades",
    "conclusao": "Conclusao",
    "mesa": "Mesa",
    "pdf_auditoria": "PDF e auditoria",
}

_PATH_BLOCK_PREFIXES: tuple[tuple[str, str], ...] = (
    ("identificacao", "identificacao"),
    ("case_context", "identificacao"),
    ("objeto_inspecao", "objeto_inspecao"),
    ("escopo_servico", "objeto_inspecao"),
    ("execucao_servico.evidencia_execucao", "evidencias_fotos"),
    ("registros_fotograficos", "evidencias_fotos"),
    ("evidencias_e_anexos", "evidencias_fotos"),
    ("report_pack.image_slots", "evidencias_fotos"),
    ("checklist_componentes", "checklist_componentes"),
    ("achados", "achados"),
    ("nao_conformidades", "nao_conformidades"),
    ("conclusao", "conclusao"),
    ("mesa_review", "mesa"),
    ("pdf_contract", "pdf_auditoria"),
    ("auditoria", "pdf_auditoria"),
    ("document_projection", "pdf_auditoria"),
)

_CODE_BLOCK_HINTS: tuple[tuple[str, str], ...] = (
    ("photo", "evidencias_fotos"),
    ("evidence", "evidencias_fotos"),
    ("component", "checklist_componentes"),
    ("checklist", "checklist_componentes"),
    ("nonconformity", "nao_conformidades"),
    ("action_required", "conclusao"),
    ("conclusion", "conclusao"),
    ("mesa", "mesa"),
    ("family", "pdf_auditoria"),
    ("template", "pdf_auditoria"),
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _clean_text(value: Any, *, limit: int = 500) -> str:
    return " ".join(str(value or "").strip().split())[:limit]


def _json_snapshot(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, default=str)


def _path_parts(path: str) -> list[str]:
    return [part for part in str(path or "").strip().split(".") if part]


def _get_path(root: Any, path: str) -> Any:
    current = root
    for part in _path_parts(path):
        if isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def _set_path(root: dict[str, Any], path: str, value: Any) -> None:
    parts = _path_parts(path)
    if not parts:
        raise ValueError("Caminho de campo obrigatorio.")

    current: Any = root
    for index, part in enumerate(parts[:-1]):
        next_part = parts[index + 1]
        if isinstance(current, list):
            try:
                list_index = int(part)
            except ValueError as exc:
                raise ValueError(f"Indice invalido no caminho: {part}.") from exc
            while len(current) <= list_index:
                current.append({} if not next_part.isdigit() else [])
            if current[list_index] in (None, ""):
                current[list_index] = {} if not next_part.isdigit() else []
            current = current[list_index]
            continue

        if not isinstance(current, dict):
            raise ValueError(f"Caminho nao editavel: {'.'.join(parts[: index + 1])}.")
        if part not in current or current[part] is None:
            current[part] = [] if next_part.isdigit() else {}
        current = current[part]

    leaf = parts[-1]
    if isinstance(current, list):
        try:
            list_index = int(leaf)
        except ValueError as exc:
            raise ValueError(f"Indice invalido no caminho: {leaf}.") from exc
        while len(current) <= list_index:
            current.append(None)
        current[list_index] = value
        return
    if not isinstance(current, dict):
        raise ValueError(f"Caminho nao editavel: {path}.")
    current[leaf] = value


def _block_for_issue(issue: dict[str, Any]) -> str:
    path = str(issue.get("path") or "")
    code = str(issue.get("code") or "")
    for prefix, block in _PATH_BLOCK_PREFIXES:
        if path == prefix or path.startswith(f"{prefix}."):
            return block
    for token, block in _CODE_BLOCK_HINTS:
        if token in code:
            return block
    return "pdf_auditoria"


def _group_issues_by_block(issues: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {
        key: {"block": key, "label": label, "count": 0, "issues": []}
        for key, label in _BLOCK_LABELS.items()
    }
    for issue in issues:
        block = _block_for_issue(issue)
        bucket = grouped.setdefault(
            block,
            {"block": block, "label": block.replace("_", " ").title(), "count": 0, "issues": []},
        )
        bucket["issues"].append(issue)
        bucket["count"] = len(bucket["issues"])
    return grouped


def _validation_dict(
    *,
    payload: dict[str, Any],
    report_pack_draft: dict[str, Any],
    level: str,
) -> dict[str, Any]:
    result = validate_nr35_linha_vida_golden_path(
        payload=payload,
        report_pack_draft=report_pack_draft,
        template_key=NR35_TEMPLATE_KEY,
        catalog_family_key=NR35_FAMILY_KEY,
        level=level,  # type: ignore[arg-type]
    )
    return result.to_dict()


def _build_review_state_from_payloads(
    *,
    payload: dict[str, Any],
    report_pack_draft: dict[str, Any],
) -> dict[str, Any]:
    mesa_validation = _validation_dict(
        payload=payload,
        report_pack_draft=report_pack_draft,
        level="mesa",
    )
    official_validation = _validation_dict(
        payload=payload,
        report_pack_draft=report_pack_draft,
        level="official_pdf",
    )
    mesa_issues = list(mesa_validation.get("issues") or [])
    official_issues = list(official_validation.get("issues") or [])
    review_meta = _as_dict(payload.get("nr35_structured_review"))
    return {
        "contract_version": NR35_STRUCTURED_REVIEW_VERSION,
        "family_key": NR35_FAMILY_KEY,
        "template_key": NR35_TEMPLATE_KEY,
        "candidate_payload": deepcopy(payload),
        "validation": {
            "mesa": mesa_validation,
            "official_pdf": official_validation,
        },
        "pending_by_block": _group_issues_by_block(mesa_issues),
        "official_pending_by_block": _group_issues_by_block(official_issues),
        "change_log": list(review_meta.get("change_log") or []),
        "last_human_review": _as_dict(review_meta.get("last_human_review")),
        "ready_for_mesa": bool(mesa_validation.get("ok")),
        "ready_for_official_pdf": bool(official_validation.get("ok")),
    }


def build_nr35_structured_review_state_for_laudo(laudo: Laudo) -> dict[str, Any]:
    payload = deepcopy(laudo.dados_formulario) if isinstance(laudo.dados_formulario, dict) else {}
    report_pack_draft = (
        deepcopy(laudo.report_pack_draft_json)
        if isinstance(laudo.report_pack_draft_json, dict)
        else {}
    )
    if not is_nr35_linha_vida_context(
        payload=payload,
        template_key=getattr(laudo, "tipo_template", None),
        catalog_family_key=getattr(laudo, "catalog_family_key", None),
    ):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "nr35_structured_review_not_applicable",
                "message": "Revisao estruturada NR35 disponivel apenas para NR35 Linha de Vida.",
            },
        )
    mesa_review_original = _as_dict(payload.get("mesa_review"))
    mesa_status_original = _clean_text(mesa_review_original.get("status"), limit=80).lower()
    human_mesa_approved = bool(
        mesa_status_original.startswith("aprov")
        and _clean_text(mesa_review_original.get("aprovacao_origem"), limit=80) == "mesa_humana"
    )
    normalized_payload = normalize_nr35_linha_vida_ai_output(
        payload,
        report_pack_draft=report_pack_draft,
    )
    if human_mesa_approved:
        normalized_payload["mesa_review"] = mesa_review_original
        auditoria = _as_dict(normalized_payload.get("auditoria"))
        auditoria["mesa_status"] = mesa_review_original.get("status")
        normalized_payload["auditoria"] = auditoria
    return _build_review_state_from_payloads(
        payload=normalized_payload,
        report_pack_draft=report_pack_draft,
    )


def _issue_codes_by_block(state: dict[str, Any]) -> dict[str, set[str]]:
    result: dict[str, set[str]] = {}
    for block_key, block in _as_dict(state.get("pending_by_block")).items():
        codes = {
            str(issue.get("code") or "").strip()
            for issue in _as_list(_as_dict(block).get("issues"))
            if str(issue.get("code") or "").strip()
        }
        result[str(block_key)] = codes
    return result


def _resolved_issue_codes(before: dict[str, Any], after: dict[str, Any]) -> list[str]:
    before_codes = {
        str(issue.get("code") or "").strip()
        for issue in _as_list(_as_dict(before.get("validation")).get("mesa", {}).get("issues"))
        if str(issue.get("code") or "").strip()
    }
    after_codes = {
        str(issue.get("code") or "").strip()
        for issue in _as_list(_as_dict(after.get("validation")).get("mesa", {}).get("issues"))
        if str(issue.get("code") or "").strip()
    }
    return sorted(before_codes - after_codes)


def _actor_payload(actor_user: Usuario | None, *, actor_user_id: int | None = None, actor_name: str | None = None) -> dict[str, Any]:
    user_id = int(getattr(actor_user, "id", 0) or actor_user_id or 0) or None
    name = _clean_text(
        getattr(actor_user, "nome", None)
        or getattr(actor_user, "nome_completo", None)
        or actor_name
        or (f"Usuario #{user_id}" if user_id else ""),
        limit=120,
    )
    return {"user_id": user_id, "name": name}


def _validate_edit(edit: dict[str, Any], *, batch_justification: str) -> tuple[str, str, Any, str]:
    target = str(edit.get("target") or "payload").strip().lower() or "payload"
    if target not in {"payload", "report_pack"}:
        raise HTTPException(status_code=400, detail="Alvo de edicao invalido.")
    path = _clean_text(edit.get("path"), limit=240)
    if path.startswith("report_pack."):
        target = "report_pack"
        path = path.removeprefix("report_pack.")
    elif path.startswith("payload."):
        target = "payload"
        path = path.removeprefix("payload.")
    if not path:
        raise HTTPException(status_code=400, detail="Caminho de edicao obrigatorio.")
    justification = _clean_text(edit.get("justification") or batch_justification, limit=800)
    if len(justification) < 8:
        raise HTTPException(
            status_code=400,
            detail="Justificativa humana obrigatoria para editar o JSON NR35.",
        )
    return target, path, deepcopy(edit.get("value")), justification


def apply_nr35_structured_review_edits_to_laudo(
    banco: Session | None,
    *,
    laudo: Laudo,
    edits: list[dict[str, Any]],
    actor_user: Usuario | None = None,
    actor_user_id: int | None = None,
    actor_name: str | None = None,
    batch_justification: str = "",
) -> dict[str, Any]:
    if not edits:
        raise HTTPException(status_code=400, detail="Nenhuma edicao informada.")

    before_state = build_nr35_structured_review_state_for_laudo(laudo)
    payload = deepcopy(laudo.dados_formulario) if isinstance(laudo.dados_formulario, dict) else {}
    report_pack_draft = (
        deepcopy(laudo.report_pack_draft_json)
        if isinstance(laudo.report_pack_draft_json, dict)
        else {}
    )

    now = _now_iso()
    actor = _actor_payload(actor_user, actor_user_id=actor_user_id, actor_name=actor_name)
    changes: list[dict[str, Any]] = []

    for raw_edit in edits:
        if not isinstance(raw_edit, dict):
            raise HTTPException(status_code=400, detail="Edicao invalida.")
        target, path, new_value, justification = _validate_edit(
            raw_edit,
            batch_justification=batch_justification,
        )
        root = payload if target == "payload" else report_pack_draft
        previous_value = deepcopy(_get_path(root, path))
        if previous_value == new_value:
            continue
        _set_path(root, path, new_value)
        changes.append(
            {
                "path": path,
                "target": target,
                "previous_value": previous_value,
                "new_value": deepcopy(new_value),
                "actor_user_id": actor["user_id"],
                "actor_name": actor["name"],
                "justification": justification,
                "changed_at": now,
                "resolved_issue_codes": list(raw_edit.get("resolves_issue_codes") or []),
            }
        )

    if not changes:
        return before_state | {"applied_changes": []}

    payload = normalize_nr35_linha_vida_ai_output(
        payload,
        report_pack_draft=report_pack_draft,
    )
    review_meta = _as_dict(payload.get("nr35_structured_review"))
    history = list(review_meta.get("change_log") or [])
    review_meta.update(
        {
            "contract_version": NR35_STRUCTURED_REVIEW_VERSION,
            "status": "in_review",
            "last_reviewed_at": now,
            "last_reviewed_by": actor,
        }
    )
    review_meta["change_log"] = (history + changes)[-80:]
    payload["nr35_structured_review"] = review_meta

    after_state = _build_review_state_from_payloads(
        payload=payload,
        report_pack_draft=report_pack_draft,
    )
    resolved_codes = _resolved_issue_codes(before_state, after_state)
    if resolved_codes:
        for change in changes:
            merged = set(change.get("resolved_issue_codes") or [])
            merged.update(resolved_codes)
            change["resolved_issue_codes"] = sorted(merged)
        review_meta["change_log"] = (history + changes)[-80:]
        payload["nr35_structured_review"] = review_meta
        after_state = _build_review_state_from_payloads(
            payload=payload,
            report_pack_draft=report_pack_draft,
        )

    review_meta["last_validation"] = {
        "mesa_ok": bool(after_state["validation"]["mesa"]["ok"]),
        "official_pdf_ok": bool(after_state["validation"]["official_pdf"]["ok"]),
        "pending_by_block": {
            key: int(block.get("count") or 0)
            for key, block in _as_dict(after_state.get("pending_by_block")).items()
        },
    }
    payload["nr35_structured_review"] = review_meta

    laudo.dados_formulario = payload
    laudo.report_pack_draft_json = report_pack_draft
    try:
        flag_modified(laudo, "dados_formulario")
        flag_modified(laudo, "report_pack_draft_json")
    except Exception:
        pass

    if banco is not None:
        _registrar_revisao_laudo(
            banco,
            laudo,
            conteudo=_json_snapshot(payload),
            origem="humano_nr35",
            confianca={
                "geral": "alta" if after_state["validation"]["mesa"]["ok"] else "media",
                "details": {
                    "contract_version": NR35_STRUCTURED_REVIEW_VERSION,
                    "change_count": len(changes),
                    "resolved_issue_codes": resolved_codes,
                },
            },
        )

    final_state = _build_review_state_from_payloads(
        payload=payload,
        report_pack_draft=report_pack_draft,
    )
    final_state["applied_changes"] = changes
    final_state["resolved_issue_codes"] = resolved_codes
    return final_state


def ensure_nr35_structured_review_ready_for_mesa_approval(laudo: Laudo) -> dict[str, Any] | None:
    if not is_nr35_linha_vida_context(
        payload=getattr(laudo, "dados_formulario", None),
        template_key=getattr(laudo, "tipo_template", None),
        catalog_family_key=getattr(laudo, "catalog_family_key", None),
    ):
        return None
    state = build_nr35_structured_review_state_for_laudo(laudo)
    if state["ready_for_mesa"]:
        return state
    raise HTTPException(
        status_code=422,
        detail={
            "code": "nr35_structured_review_pending",
            "message": "A revisao estruturada NR35 ainda possui pendencias antes da aprovacao Mesa.",
            "pending_by_block": state["pending_by_block"],
            "validation": state["validation"]["mesa"],
        },
    )


def mark_nr35_structured_review_mesa_approved(
    laudo: Laudo,
    *,
    actor_user_id: int | None,
    actor_name: str | None = None,
) -> dict[str, Any] | None:
    if not is_nr35_linha_vida_context(
        payload=getattr(laudo, "dados_formulario", None),
        template_key=getattr(laudo, "tipo_template", None),
        catalog_family_key=getattr(laudo, "catalog_family_key", None),
    ):
        return None

    payload = deepcopy(laudo.dados_formulario) if isinstance(laudo.dados_formulario, dict) else {}
    mesa_review = _as_dict(payload.get("mesa_review"))
    mesa_review.update(
        {
            "status": StatusRevisao.APROVADO.value,
            "aprovado_por_id": int(actor_user_id or 0) or None,
            "aprovado_por_nome": _clean_text(actor_name, limit=120),
            "aprovado_em": _now_iso(),
            "aprovacao_origem": "mesa_humana",
            "ia_aprovou_mesa": False,
        }
    )
    payload["mesa_review"] = mesa_review
    review_meta = _as_dict(payload.get("nr35_structured_review"))
    review_meta.update(
        {
            "contract_version": NR35_STRUCTURED_REVIEW_VERSION,
            "status": "mesa_approved",
            "mesa_approved_at": mesa_review["aprovado_em"],
            "mesa_approved_by": {
                "user_id": int(actor_user_id or 0) or None,
                "name": _clean_text(actor_name, limit=120),
            },
        }
    )
    payload["nr35_structured_review"] = review_meta
    auditoria = _as_dict(payload.get("auditoria"))
    auditoria["mesa_status"] = mesa_review["status"]
    payload["auditoria"] = auditoria

    laudo.dados_formulario = payload
    try:
        flag_modified(laudo, "dados_formulario")
    except Exception:
        pass
    return build_nr35_structured_review_state_for_laudo(laudo)


__all__ = [
    "NR35_STRUCTURED_REVIEW_VERSION",
    "apply_nr35_structured_review_edits_to_laudo",
    "build_nr35_structured_review_state_for_laudo",
    "ensure_nr35_structured_review_ready_for_mesa_approval",
    "mark_nr35_structured_review_mesa_approved",
]
