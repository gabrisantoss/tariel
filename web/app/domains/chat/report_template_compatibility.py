"""Compatibility checks for changing a free report into a guided template."""

from __future__ import annotations

from typing import Any

from app.domains.chat.normalization import (
    nome_template_humano,
    normalizar_tipo_template,
    resolver_familia_padrao_template,
)
from app.shared.database import Laudo


NR35_LINHA_VIDA_REQUIRED_CHECKLIST: tuple[dict[str, str], ...] = (
    {
        "id": "nr35_identificacao_documental",
        "title": "Identificação documental",
        "detail": "Unidade, local, laudo, ART, contratante, contratada, responsável, inspetor e data.",
    },
    {
        "id": "nr35_objeto_escopo",
        "title": "Objeto e escopo",
        "detail": "TAG ou referência, tipo da linha, escopo e limitações de acesso.",
    },
    {
        "id": "nr35_componentes_c_nc_na",
        "title": "Componentes C/NC/NA",
        "detail": "Fixação, cabo de aço, esticador, sapatilha, olhal e grampos.",
    },
    {
        "id": "nr35_fotos_minimas",
        "title": "Fotos mínimas",
        "detail": "Vista geral, ponto superior, ponto inferior, identificação e achado principal.",
    },
    {
        "id": "nr35_conclusao_tecnica",
        "title": "Conclusão técnica",
        "detail": "Aprovado, Reprovado ou Pendente com motivo, recomendações e próxima inspeção.",
    },
)


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _count_text_evidence(laudo: Laudo) -> int:
    total = 0
    for mensagem in _as_list(getattr(laudo, "mensagens", None)):
        metadata = getattr(mensagem, "metadata_json", None)
        report_context = metadata.get("report_context") if isinstance(metadata, dict) else None
        if isinstance(report_context, dict) and report_context.get("included") is False:
            continue
        texto = str(getattr(mensagem, "conteudo", "") or "").strip()
        if texto:
            total += 1
    return total


def _count_photo_evidence(draft: dict[str, Any]) -> int:
    analysis_basis = _as_dict(draft.get("analysis_basis"))
    photo_evidence = _as_list(analysis_basis.get("photo_evidence"))
    if photo_evidence:
        return len(photo_evidence)

    image_slots = _as_list(draft.get("image_slots"))
    ready_slots = [
        slot
        for slot in image_slots
        if isinstance(slot, dict)
        and str(slot.get("status") or "").strip().lower() in {"ready", "selected", "filled"}
    ]
    return len(ready_slots)


def _status_candidates(laudo: Laudo, draft: dict[str, Any]) -> str:
    candidatos = [
        _as_dict(draft.get("quality_gates")).get("final_status"),
        _as_dict(draft.get("pre_laudo_outline")).get("status"),
        _as_dict(draft.get("pre_laudo_document")).get("status"),
        getattr(laudo, "status_conformidade", None),
        getattr(laudo, "parecer_ia", None),
    ]
    return " ".join(str(item or "").strip().lower() for item in candidatos if str(item or "").strip())


def _missing_item(code: str, title: str, detail: str, *, severity: str = "required") -> dict[str, str]:
    return {
        "code": code,
        "title": title,
        "detail": detail,
        "severity": severity,
    }


def analisar_compatibilidade_template_laudo(
    laudo: Laudo,
    *,
    target_template: str,
) -> dict[str, Any]:
    """Return a conservative, non-mutating migration analysis for a report template."""

    target = normalizar_tipo_template(target_template)
    current = normalizar_tipo_template(str(getattr(laudo, "tipo_template", None) or "padrao"))
    draft = _as_dict(getattr(laudo, "report_pack_draft_json", None))
    binding = resolver_familia_padrao_template(target)
    missing: list[dict[str, str]] = []

    text_count = _count_text_evidence(laudo)
    photo_count = _count_photo_evidence(draft)
    score = 30

    if text_count > 0 or str(getattr(laudo, "parecer_ia", "") or "").strip():
        score += 20
    else:
        missing.append(
            _missing_item(
                "context_text_missing",
                "Contexto técnico",
                "Informe equipamento, local, condição observada e objetivo da inspeção.",
            )
        )

    if target == "nr35_linha_vida":
        required_checklist = [dict(item) for item in NR35_LINHA_VIDA_REQUIRED_CHECKLIST]
        if photo_count >= 2:
            score += 25
        elif photo_count == 1:
            score += 12
            missing.append(
                _missing_item(
                    "nr35_photo_pair_incomplete",
                    "Fotos de início e fim da linha",
                    "A NR35 linha de vida normalmente precisa mostrar começo e fim da linha.",
                )
            )
        else:
            missing.append(
                _missing_item(
                    "nr35_photo_pair_missing",
                    "Fotos de início e fim da linha",
                    "Envie ao menos duas fotos para sustentar a migração para NR35 linha de vida.",
                )
            )

        status_text = _status_candidates(laudo, draft)
        if any(item in status_text for item in ("aprov", "pendente", "reprov", "conforme", "nao conforme", "não conforme")):
            score += 15
        else:
            missing.append(
                _missing_item(
                    "nr35_status_reason_missing",
                    "Status e motivo",
                    "Declare se a linha está aprovada, pendente ou reprovada e o motivo técnico.",
                    severity="recommended",
                )
            )
    else:
        required_checklist = []
        if photo_count > 0:
            score += 10

    compatible = not any(item["severity"] == "required" for item in missing)
    return {
        "ok": True,
        "compatible": compatible,
        "can_migrate": compatible,
        "score": min(score, 100),
        "current_template": current,
        "current_template_label": nome_template_humano(current),
        "target_template": target,
        "target_template_label": nome_template_humano(target),
        "target_family_key": binding.get("family_key"),
        "target_family_label": binding.get("family_label"),
        "evidence_summary": {
            "text_items": text_count,
            "photo_items": photo_count,
            "has_report_pack_draft": bool(draft),
        },
        "required_checklist": required_checklist,
        "missing_evidence": missing,
        "next_step": (
            "Compatível para continuar como laudo guiado desta família."
            if compatible
            else "Complete os itens obrigatórios antes de migrar o laudo livre para esta família."
        ),
    }


__all__ = ["NR35_LINHA_VIDA_REQUIRED_CHECKLIST", "analisar_compatibilidade_template_laudo"]
