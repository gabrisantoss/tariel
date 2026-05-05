"""Guardrails centrais para familias que exigem revisao separada."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import re

from app.domains.chat.normalization import (
    normalizar_tipo_template,
    resolver_familia_padrao_template,
)
from app.domains.chat.nr35_linha_vida_validation import (
    NR35_FAMILY_KEY,
    is_nr35_linha_vida_context,
)


_HIGH_RISK_FAMILY_LABELS: dict[str, str] = {
    NR35_FAMILY_KEY: "NR35 Linha de Vida",
    "nr35_inspecao_ponto_ancoragem": "NR35 Ponto de Ancoragem",
    "nr13_inspecao_caldeira": "NR13 Caldeira",
    "nr13_inspecao_vaso_pressao": "NR13 Vaso de Pressao",
    "nr20_prontuario_instalacoes_inflamaveis": "NR20 Prontuario de Inflamaveis",
    "nr10_prontuario_instalacoes_eletricas": "NR10 Prontuario de Instalacoes Eletricas",
}

_HIGH_RISK_TEMPLATE_TO_FAMILY: dict[str, str] = {
    "nr35_linha_vida": NR35_FAMILY_KEY,
    "nr35": NR35_FAMILY_KEY,
    "linha_vida_nr35": NR35_FAMILY_KEY,
    "nr35_ponto_ancoragem": "nr35_inspecao_ponto_ancoragem",
    "nr13": "nr13_inspecao_caldeira",
    "nr13_caldeira": "nr13_inspecao_caldeira",
    "nr13_vaso_pressao": "nr13_inspecao_vaso_pressao",
    "nr20_prontuario": "nr20_prontuario_instalacoes_inflamaveis",
    "nr10_prontuario": "nr10_prontuario_instalacoes_eletricas",
    "pie": "nr10_prontuario_instalacoes_eletricas",
}


@dataclass(frozen=True)
class HighRiskFamilyGuardrail:
    family_key: str
    family_label: str
    code: str
    message: str
    required_capability: str = "inspector_send_to_mesa"
    fallback_surface: str = "mesa"
    requires_separate_mesa_review: bool = True

    def unavailable_detail(self, *, requested_review_mode: str | None = None) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "review_mode_requested": str(requested_review_mode or "mesa_required").strip()
            or "mesa_required",
            "required_capability": self.required_capability,
            "fallback_surface": self.fallback_surface,
            "family_key": self.family_key,
            "family_label": self.family_label,
            "guardrail": "separate_mesa_required",
        }


def _normalize_key(value: Any) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return ""
    return re.sub(r"[^a-z0-9:_-]+", "_", text).strip("_-")


def _candidate_variants(value: Any) -> list[str]:
    normalized = _normalize_key(value)
    if not normalized:
        return []
    variants = [normalized]
    if normalized.startswith("catalog:"):
        parts = [part for part in normalized.split(":") if part]
        if len(parts) >= 2:
            variants.append(parts[1])
    if ":" in normalized:
        variants.extend(part for part in normalized.split(":") if part)
    return list(dict.fromkeys(variants))


def _resolve_high_risk_family_key_from_candidate(candidate: Any) -> str | None:
    for variant in _candidate_variants(candidate):
        if variant in _HIGH_RISK_FAMILY_LABELS:
            return variant
        mapped_family = _HIGH_RISK_TEMPLATE_TO_FAMILY.get(variant)
        if mapped_family in _HIGH_RISK_FAMILY_LABELS:
            return mapped_family
        template_key = normalizar_tipo_template(variant)
        mapped_template_family = _HIGH_RISK_TEMPLATE_TO_FAMILY.get(template_key)
        if mapped_template_family in _HIGH_RISK_FAMILY_LABELS:
            return mapped_template_family
        default_family = resolver_familia_padrao_template(template_key).get("family_key")
        if default_family in _HIGH_RISK_FAMILY_LABELS:
            return str(default_family)
    return None


def _iter_context_candidates(
    *,
    payload: dict[str, Any] | None,
    template_key: str | None,
    catalog_family_key: str | None,
    report_pack_family: str | None,
) -> list[Any]:
    payload = payload if isinstance(payload, dict) else {}
    candidates: list[Any] = [
        report_pack_family,
        catalog_family_key,
        template_key,
        payload.get("family"),
        payload.get("family_key"),
        payload.get("catalog_family_key"),
        payload.get("template_code"),
        payload.get("template_key"),
    ]
    return [candidate for candidate in candidates if str(candidate or "").strip()]


def resolve_high_risk_family_guardrail(
    *,
    payload: dict[str, Any] | None = None,
    template_key: str | None = None,
    catalog_family_key: str | None = None,
    report_pack_family: str | None = None,
) -> HighRiskFamilyGuardrail | None:
    """Return the strict review guardrail for modeled high-risk families."""

    if is_nr35_linha_vida_context(
        payload=payload,
        template_key=template_key,
        catalog_family_key=report_pack_family or catalog_family_key,
    ):
        return HighRiskFamilyGuardrail(
            family_key=NR35_FAMILY_KEY,
            family_label=_HIGH_RISK_FAMILY_LABELS[NR35_FAMILY_KEY],
            code="nr35_mesa_required_unavailable",
            message=(
                "O piloto NR35 Linha de Vida exige Revisão Técnica antes de "
                "emissao oficial."
            ),
        )

    family_key: str | None = None
    for candidate in _iter_context_candidates(
        payload=payload,
        template_key=template_key,
        catalog_family_key=catalog_family_key,
        report_pack_family=report_pack_family,
    ):
        family_key = _resolve_high_risk_family_key_from_candidate(candidate)
        if family_key:
            break
    if not family_key:
        return None

    family_label = _HIGH_RISK_FAMILY_LABELS[family_key]
    return HighRiskFamilyGuardrail(
        family_key=family_key,
        family_label=family_label,
        code="high_risk_mesa_required_unavailable",
        message=(
            f"{family_label} exige Revisão Técnica antes de aprovacao final "
            "ou emissao oficial."
        ),
    )


def family_requires_separate_mesa_review(
    *,
    payload: dict[str, Any] | None = None,
    template_key: str | None = None,
    catalog_family_key: str | None = None,
    report_pack_family: str | None = None,
) -> bool:
    return (
        resolve_high_risk_family_guardrail(
            payload=payload,
            template_key=template_key,
            catalog_family_key=catalog_family_key,
            report_pack_family=report_pack_family,
        )
        is not None
    )


__all__ = [
    "HighRiskFamilyGuardrail",
    "family_requires_separate_mesa_review",
    "resolve_high_risk_family_guardrail",
]
