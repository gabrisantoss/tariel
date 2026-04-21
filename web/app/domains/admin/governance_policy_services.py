from __future__ import annotations

import json
from typing import Any, Callable

from app.shared.catalog_commercial_governance import (
    merge_release_contract_policy,
    summarize_release_contract_governance,
)


def merge_review_policy_governance(
    base_policy: dict[str, Any] | None,
    *,
    default_review_mode: str | None,
    max_review_mode: str | None,
    requires_family_lock: bool,
    block_on_scope_mismatch: bool,
    block_on_missing_required_evidence: bool,
    block_on_critical_field_absent: bool,
    blocking_conditions: list[str] | None,
    non_blocking_conditions: list[str] | None,
    red_flags: list[dict[str, Any]] | None,
    requires_release_active: bool,
    requires_upload_doc_for_mobile_autonomous: bool,
    mobile_review_allowed_plans: list[str] | None,
    mobile_autonomous_allowed_plans: list[str] | None,
) -> dict[str, Any]:
    review_policy = dict(base_policy or {})
    tenant_entitlements = (
        dict(review_policy.get("tenant_entitlements") or {})
        if isinstance(review_policy.get("tenant_entitlements"), dict)
        else {}
    )

    managed_keys = {
        "default_review_mode",
        "max_review_mode",
        "requires_family_lock",
        "block_on_scope_mismatch",
        "block_on_missing_required_evidence",
        "block_on_critical_field_absent",
        "blocking_conditions",
        "non_blocking_conditions",
        "red_flags",
        "tenant_entitlements",
    }
    review_policy = {
        key: value
        for key, value in review_policy.items()
        if key not in managed_keys
    }

    if default_review_mode:
        review_policy["default_review_mode"] = default_review_mode
    if max_review_mode:
        review_policy["max_review_mode"] = max_review_mode
    review_policy["requires_family_lock"] = bool(requires_family_lock)
    review_policy["block_on_scope_mismatch"] = bool(block_on_scope_mismatch)
    review_policy["block_on_missing_required_evidence"] = bool(
        block_on_missing_required_evidence
    )
    review_policy["block_on_critical_field_absent"] = bool(
        block_on_critical_field_absent
    )
    if blocking_conditions:
        review_policy["blocking_conditions"] = blocking_conditions
    if non_blocking_conditions:
        review_policy["non_blocking_conditions"] = non_blocking_conditions
    if red_flags:
        review_policy["red_flags"] = red_flags

    tenant_entitlements = {
        key: value
        for key, value in tenant_entitlements.items()
        if key
        not in {
            "requires_release_active",
            "requires_upload_doc_for_mobile_autonomous",
            "mobile_review_allowed_plans",
            "mobile_review_plans",
            "mobile_autonomous_allowed_plans",
            "mobile_autonomous_plans",
        }
    }
    tenant_entitlements["requires_release_active"] = bool(requires_release_active)
    tenant_entitlements["requires_upload_doc_for_mobile_autonomous"] = bool(
        requires_upload_doc_for_mobile_autonomous
    )
    if mobile_review_allowed_plans:
        tenant_entitlements["mobile_review_allowed_plans"] = mobile_review_allowed_plans
    if mobile_autonomous_allowed_plans:
        tenant_entitlements["mobile_autonomous_allowed_plans"] = (
            mobile_autonomous_allowed_plans
        )
    review_policy["tenant_entitlements"] = tenant_entitlements
    return review_policy


def merge_release_governance_policy(
    base_policy: dict[str, Any] | None,
    *,
    force_review_mode: str | None,
    max_review_mode: str | None,
    mobile_review_override: bool | None,
    mobile_autonomous_override: bool | None,
    release_channel_override: str | None,
    contract_entitlements: dict[str, Any] | None,
) -> dict[str, Any] | None:
    governance_policy = dict(base_policy or {})
    managed_keys = {
        "force_review_mode",
        "max_review_mode",
        "mobile_review_override",
        "mobile_autonomous_override",
        "release_channel_override",
        "contract_entitlements",
    }
    governance_policy = {
        key: value
        for key, value in governance_policy.items()
        if key not in managed_keys
    }
    if force_review_mode:
        governance_policy["force_review_mode"] = force_review_mode
    if max_review_mode:
        governance_policy["max_review_mode"] = max_review_mode
    if mobile_review_override is not None:
        governance_policy["mobile_review_override"] = mobile_review_override
    if mobile_autonomous_override is not None:
        governance_policy["mobile_autonomous_override"] = mobile_autonomous_override
    governance_policy = merge_release_contract_policy(
        governance_policy,
        release_channel_override=release_channel_override,
        contract_entitlements=contract_entitlements,
    ) or {}
    return governance_policy or None


def resumir_governanca_review_policy(
    review_policy: Any,
    *,
    normalizar_red_flags: Callable[[list[Any]], list[dict[str, Any]] | None],
    normalizar_lista_textual: Callable[..., list[str] | None],
    normalizar_planos: Callable[..., list[str] | None],
    review_mode_label_meta: Callable[[str | None], dict[str, str]],
    red_flag_severity_meta: Callable[[str | None], dict[str, str]],
) -> dict[str, Any]:
    payload = dict(review_policy or {}) if isinstance(review_policy, dict) else {}
    tenant_entitlements = (
        dict(payload.get("tenant_entitlements") or {})
        if isinstance(payload.get("tenant_entitlements"), dict)
        else {}
    )
    red_flags = normalizar_red_flags(list(payload.get("red_flags") or [])) or []
    blocking_conditions = normalizar_lista_textual(
        json.dumps(list(payload.get("blocking_conditions") or []), ensure_ascii=False),
        campo="Blocking conditions",
    ) or []
    non_blocking_conditions = normalizar_lista_textual(
        json.dumps(list(payload.get("non_blocking_conditions") or []), ensure_ascii=False),
        campo="Non-blocking conditions",
    ) or []
    review_plans = normalizar_planos(
        list(
            tenant_entitlements.get("mobile_review_allowed_plans")
            or tenant_entitlements.get("mobile_review_plans")
            or []
        ),
        campo="Planos com revisão mobile",
    ) or []
    autonomy_plans = normalizar_planos(
        list(
            tenant_entitlements.get("mobile_autonomous_allowed_plans")
            or tenant_entitlements.get("mobile_autonomous_plans")
            or []
        ),
        campo="Planos com autonomia mobile",
    ) or []
    return {
        "default_review_mode": review_mode_label_meta(payload.get("default_review_mode")),
        "max_review_mode": review_mode_label_meta(payload.get("max_review_mode")),
        "requires_family_lock": bool(payload.get("requires_family_lock")),
        "block_on_scope_mismatch": bool(payload.get("block_on_scope_mismatch")),
        "block_on_missing_required_evidence": bool(
            payload.get("block_on_missing_required_evidence")
        ),
        "block_on_critical_field_absent": bool(
            payload.get("block_on_critical_field_absent")
        ),
        "blocking_conditions": blocking_conditions,
        "non_blocking_conditions": non_blocking_conditions,
        "red_flags": [
            {
                **item,
                "severity_meta": red_flag_severity_meta(item.get("severity")),
            }
            for item in red_flags
        ],
        "red_flags_count": len(red_flags),
        "tenant_entitlements": {
            "requires_release_active": bool(
                tenant_entitlements.get("requires_release_active")
            ),
            "requires_upload_doc_for_mobile_autonomous": bool(
                tenant_entitlements.get("requires_upload_doc_for_mobile_autonomous")
            ),
            "mobile_review_allowed_plans": review_plans,
            "mobile_autonomous_allowed_plans": autonomy_plans,
        },
    }


def resumir_governanca_release_policy(
    governance_policy: Any,
    *,
    normalizar_review_mode: Callable[..., str | None],
    effective_review_mode_cap: Callable[..., str | None],
    review_mode_label_meta: Callable[[str | None], dict[str, str]],
    override_choice_label: Callable[[bool | None], dict[str, str]],
) -> dict[str, Any]:
    payload = dict(governance_policy or {}) if isinstance(governance_policy, dict) else {}
    review_override = payload.get("mobile_review_override")
    autonomy_override = payload.get("mobile_autonomous_override")
    if not isinstance(review_override, bool):
        review_override = None
    if not isinstance(autonomy_override, bool):
        autonomy_override = None
    force_review_mode = normalizar_review_mode(
        payload.get("force_review_mode"),
        campo="Force review mode",
    )
    max_review_mode = normalizar_review_mode(
        payload.get("max_review_mode"),
        campo="Max review mode",
    )
    effective_cap = effective_review_mode_cap(force_review_mode, max_review_mode)
    commercial = summarize_release_contract_governance(governance_policy)
    return {
        "force_review_mode": review_mode_label_meta(force_review_mode),
        "max_review_mode": review_mode_label_meta(max_review_mode),
        "mobile_review_override": override_choice_label(review_override),
        "mobile_autonomous_override": override_choice_label(autonomy_override),
        "effective_cap": review_mode_label_meta(effective_cap),
        "release_channel_override": commercial["release_channel_override"],
        "effective_release_channel": commercial["effective_release_channel"],
        "contract_entitlements_override": commercial["contract_entitlements_override"],
        "effective_contract_entitlements": commercial["effective_contract_entitlements"],
        "has_overrides": any(
            (
                force_review_mode is not None,
                max_review_mode is not None,
                review_override is not None,
                autonomy_override is not None,
                commercial["release_channel_override"]["key"] != "inherit",
                commercial["contract_entitlements_override"]["has_data"],
            )
        ),
    }
