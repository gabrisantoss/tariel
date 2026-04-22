from __future__ import annotations

from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from app.domains.admin.admin_catalog_calibration_queue_services import (
    build_calibration_queue_rollup as _admin_catalog_build_calibration_queue_rollup,
)
from app.domains.admin.admin_catalog_rollup_services import (
    build_commercial_scale_rollup as _admin_catalog_build_commercial_scale_rollup,
    build_material_real_rollup as _admin_catalog_build_material_real_rollup,
)
from app.domains.admin.governance_policy_services import (
    merge_release_governance_policy as _governance_merge_release_policy,
    merge_review_policy_governance as _governance_merge_review_policy,
    resumir_governanca_release_policy as _governance_resumir_release_policy,
    resumir_governanca_review_policy as _governance_resumir_review_policy,
)
from app.domains.admin.governance_rollup_services import (
    build_catalog_governance_rollup as _governance_build_catalog_rollup,
    build_release_channel_counter_rows as _governance_build_release_channel_counter_rows,
    build_release_status_counter_rows as _governance_build_release_status_counter_rows,
    build_review_mode_counter_rows as _governance_build_review_mode_counter_rows,
    dominant_release_channel as _governance_dominant_release_channel,
    dominant_review_mode as _governance_dominant_review_mode,
    format_review_mode_breakdown as _governance_format_review_mode_breakdown,
    plan_allowed_for_governance_rollup as _governance_plan_allowed,
    resolve_governance_rollup_release_mode as _governance_resolve_release_mode,
    review_mode_display_order as _governance_review_mode_display_order,
    review_mode_with_cap as _governance_review_mode_with_cap,
    strictest_review_mode as _governance_strictest_review_mode,
)
from app.shared.catalog_commercial_governance import RELEASE_CHANNEL_ORDER, release_channel_meta, summarize_release_contract_governance
from app.shared.database import Empresa, FamiliaLaudoCatalogo, PlanoEmpresa, TenantFamilyReleaseLaudo


def _admin_services():
    from app.domains.admin import services as admin_services

    return admin_services


def _merge_review_policy_governance(
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
    return _governance_merge_review_policy(
        base_policy,
        default_review_mode=default_review_mode,
        max_review_mode=max_review_mode,
        requires_family_lock=requires_family_lock,
        block_on_scope_mismatch=block_on_scope_mismatch,
        block_on_missing_required_evidence=block_on_missing_required_evidence,
        block_on_critical_field_absent=block_on_critical_field_absent,
        blocking_conditions=blocking_conditions,
        non_blocking_conditions=non_blocking_conditions,
        red_flags=red_flags,
        requires_release_active=requires_release_active,
        requires_upload_doc_for_mobile_autonomous=requires_upload_doc_for_mobile_autonomous,
        mobile_review_allowed_plans=mobile_review_allowed_plans,
        mobile_autonomous_allowed_plans=mobile_autonomous_allowed_plans,
    )


def _merge_release_governance_policy(
    base_policy: dict[str, Any] | None,
    *,
    force_review_mode: str | None,
    max_review_mode: str | None,
    mobile_review_override: bool | None,
    mobile_autonomous_override: bool | None,
    release_channel_override: str | None,
    contract_entitlements: dict[str, Any] | None,
) -> dict[str, Any] | None:
    return _governance_merge_release_policy(
        base_policy,
        force_review_mode=force_review_mode,
        max_review_mode=max_review_mode,
        mobile_review_override=mobile_review_override,
        mobile_autonomous_override=mobile_autonomous_override,
        release_channel_override=release_channel_override,
        contract_entitlements=contract_entitlements,
    )


def _resumir_governanca_review_policy(review_policy: Any) -> dict[str, Any]:
    admin_services = _admin_services()
    return _governance_resumir_review_policy(
        review_policy,
        normalizar_red_flags=admin_services._normalizar_red_flags_governanca,
        normalizar_lista_textual=admin_services._normalizar_lista_textual,
        normalizar_planos=admin_services._normalizar_planos_governanca,
        review_mode_label_meta=admin_services._review_mode_label_meta,
        red_flag_severity_meta=admin_services._red_flag_severity_meta,
    )


def _resumir_governanca_release_policy(governance_policy: Any) -> dict[str, Any]:
    admin_services = _admin_services()
    return _governance_resumir_release_policy(
        governance_policy,
        normalizar_review_mode=admin_services._normalizar_review_mode_governanca,
        effective_review_mode_cap=admin_services._effective_review_mode_cap,
        review_mode_label_meta=admin_services._review_mode_label_meta,
        override_choice_label=admin_services._override_choice_label,
    )


def _review_mode_display_order() -> tuple[str, str, str]:
    return _governance_review_mode_display_order()


def _review_mode_with_cap(requested_mode: str, cap_mode: str | None) -> str:
    admin_services = _admin_services()
    return _governance_review_mode_with_cap(
        requested_mode,
        cap_mode,
        review_mode_order=admin_services._REVIEW_MODE_ORDER,
    )


def _plan_allowed_for_governance_rollup(
    *,
    plan_name: str | None,
    allowed_plans: list[str],
) -> bool:
    return _governance_plan_allowed(
        plan_name=plan_name,
        allowed_plans=allowed_plans,
        normalizar_plano_empresa=PlanoEmpresa.normalizar,
    )


def _strictest_review_mode(counter: Counter[str]) -> str | None:
    admin_services = _admin_services()
    return _governance_strictest_review_mode(
        counter,
        review_mode_order=admin_services._REVIEW_MODE_ORDER,
    )


def _dominant_review_mode(counter: Counter[str]) -> str | None:
    admin_services = _admin_services()
    return _governance_dominant_review_mode(
        counter,
        review_mode_order=admin_services._REVIEW_MODE_ORDER,
    )


def _format_review_mode_breakdown(counter: Counter[str]) -> str:
    admin_services = _admin_services()
    return _governance_format_review_mode_breakdown(
        counter,
        review_mode_label_meta=admin_services._review_mode_label_meta,
    )


def _dominant_release_channel(counter: Counter[str], *, fallback: str = "pilot") -> str:
    return _governance_dominant_release_channel(
        counter,
        release_channel_order=RELEASE_CHANNEL_ORDER,
        fallback=fallback,
    )


def _build_review_mode_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    tenant_sets: dict[str, set[int]] | None = None,
    family_sets: dict[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    admin_services = _admin_services()
    return _governance_build_review_mode_counter_rows(
        counter,
        total=total,
        review_mode_label_meta=admin_services._review_mode_label_meta,
        tenant_sets=tenant_sets,
        family_sets=family_sets,
    )


def _build_release_channel_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    tenant_sets: dict[str, set[int]] | None = None,
    family_sets: dict[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    return _governance_build_release_channel_counter_rows(
        counter,
        total=total,
        release_channel_meta=release_channel_meta,
        tenant_sets=tenant_sets,
        family_sets=family_sets,
    )


def _build_release_status_counter_rows(counter: Counter[str], *, total: int) -> list[dict[str, Any]]:
    admin_services = _admin_services()
    return _governance_build_release_status_counter_rows(
        counter,
        total=total,
        label_catalogo=admin_services._label_catalogo,
        release_status_labels=admin_services._CATALOGO_RELEASE_STATUS_LABELS,
    )


def _resolve_governance_rollup_release_mode(
    *,
    family: FamiliaLaudoCatalogo,
    release: TenantFamilyReleaseLaudo,
    tenant: Empresa | None,
) -> dict[str, Any]:
    admin_services = _admin_services()
    return _governance_resolve_release_mode(
        family=family,
        release=release,
        tenant=tenant,
        normalizar_review_mode=admin_services._normalizar_review_mode_governanca,
        effective_review_mode_cap=admin_services._effective_review_mode_cap,
        normalizar_planos=admin_services._normalizar_planos_governanca,
        summarize_release_contract_governance=summarize_release_contract_governance,
        offer_lifecycle_resolvido=admin_services._offer_lifecycle_resolvido,
        normalizar_red_flags=admin_services._normalizar_red_flags_governanca,
        normalizar_plano_empresa=PlanoEmpresa.normalizar,
        review_mode_order=admin_services._REVIEW_MODE_ORDER,
    )


def _build_catalog_governance_rollup(
    db: Session,
    *,
    families: list[FamiliaLaudoCatalogo],
) -> dict[str, Any]:
    admin_services = _admin_services()
    return _governance_build_catalog_rollup(
        db,
        families=families,
        empresa_model=Empresa,
        tenant_cliente_clause=admin_services._tenant_cliente_clause,
        normalizar_review_mode=admin_services._normalizar_review_mode_governanca,
        normalizar_red_flags=admin_services._normalizar_red_flags_governanca,
        review_mode_label_meta=admin_services._review_mode_label_meta,
        normalizar_planos=admin_services._normalizar_planos_governanca,
        effective_review_mode_cap=admin_services._effective_review_mode_cap,
        summarize_release_contract_governance=summarize_release_contract_governance,
        offer_lifecycle_resolvido=admin_services._offer_lifecycle_resolvido,
        normalizar_plano_empresa=PlanoEmpresa.normalizar,
        release_channel_meta=release_channel_meta,
        review_mode_order=admin_services._REVIEW_MODE_ORDER,
        release_channel_order=RELEASE_CHANNEL_ORDER,
        label_catalogo=admin_services._label_catalogo,
        release_status_labels=admin_services._CATALOGO_RELEASE_STATUS_LABELS,
    )


def _build_calibration_queue_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    admin_services = _admin_services()
    return _admin_catalog_build_calibration_queue_rollup(
        rows_all,
        dependencies={
            "build_material_real_workspace_summary": admin_services._build_material_real_workspace_summary,
            "build_material_real_priority_summary": admin_services._build_material_real_priority_summary,
            "build_template_refinement_target": admin_services._build_template_refinement_target,
            "label_catalogo": admin_services._label_catalogo,
            "material_priority_labels": admin_services._CATALOGO_MATERIAL_PRIORITY_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _build_material_real_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    admin_services = _admin_services()
    return _admin_catalog_build_material_real_rollup(
        rows_all,
        dependencies={
            "build_material_real_workspace_summary": admin_services._build_material_real_workspace_summary,
            "build_material_real_priority_summary": admin_services._build_material_real_priority_summary,
            "dict_payload_admin": admin_services._dict_payload_admin,
            "label_catalogo": admin_services._label_catalogo,
            "material_priority_labels": admin_services._CATALOGO_MATERIAL_PRIORITY_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _build_commercial_scale_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    admin_services = _admin_services()
    return _admin_catalog_build_commercial_scale_rollup(
        rows_all,
        dependencies={
            "normalizar_chave_catalogo": admin_services._normalizar_chave_catalogo,
            "release_channel_meta": release_channel_meta,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


__all__ = [
    "_build_calibration_queue_rollup",
    "_build_catalog_governance_rollup",
    "_build_commercial_scale_rollup",
    "_build_material_real_rollup",
    "_build_release_channel_counter_rows",
    "_build_release_status_counter_rows",
    "_build_review_mode_counter_rows",
    "_dominant_release_channel",
    "_dominant_review_mode",
    "_format_review_mode_breakdown",
    "_merge_release_governance_policy",
    "_merge_review_policy_governance",
    "_plan_allowed_for_governance_rollup",
    "_resolve_governance_rollup_release_mode",
    "_resumir_governanca_release_policy",
    "_resumir_governanca_review_policy",
    "_review_mode_display_order",
    "_review_mode_with_cap",
    "_strictest_review_mode",
]
