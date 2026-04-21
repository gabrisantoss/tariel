from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session


def review_mode_display_order() -> tuple[str, str, str]:
    return ("mesa_required", "mobile_review_allowed", "mobile_autonomous")


def review_mode_with_cap(
    requested_mode: str,
    cap_mode: str | None,
    *,
    review_mode_order: dict[str, int],
) -> str:
    if not cap_mode:
        return requested_mode
    return sorted(
        (requested_mode, cap_mode),
        key=lambda item: review_mode_order[item],
        reverse=True,
    )[0]


def plan_allowed_for_governance_rollup(
    *,
    plan_name: str | None,
    allowed_plans: list[str],
    normalizar_plano_empresa: Callable[[str], str],
) -> bool:
    if not allowed_plans:
        return True
    try:
        normalized_plan = normalizar_plano_empresa(str(plan_name or "").strip())
    except ValueError:
        normalized_plan = str(plan_name or "").strip()
    return normalized_plan.lower() in {item.lower() for item in allowed_plans}


def strictest_review_mode(
    counter: Counter[str],
    *,
    review_mode_order: dict[str, int],
) -> str | None:
    modes = [mode for mode in review_mode_display_order() if int(counter.get(mode, 0)) > 0]
    if not modes:
        return None
    return sorted(modes, key=lambda item: review_mode_order[item], reverse=True)[0]


def dominant_review_mode(
    counter: Counter[str],
    *,
    review_mode_order: dict[str, int],
) -> str | None:
    modes = [mode for mode in review_mode_display_order() if int(counter.get(mode, 0)) > 0]
    if not modes:
        return None
    return sorted(
        modes,
        key=lambda item: (int(counter.get(item, 0)), review_mode_order[item]),
        reverse=True,
    )[0]


def format_review_mode_breakdown(
    counter: Counter[str],
    *,
    review_mode_label_meta: Callable[[str | None], dict[str, str]],
) -> str:
    partes = [
        f"{int(counter.get(mode, 0))} {str(review_mode_label_meta(mode)['label'])}"
        for mode in review_mode_display_order()
        if int(counter.get(mode, 0)) > 0
    ]
    return " • ".join(partes)


def release_channel_display_order() -> tuple[str, str, str]:
    return ("pilot", "limited_release", "general_release")


def dominant_release_channel(
    counter: Counter[str],
    *,
    release_channel_order: dict[str, int],
    fallback: str = "pilot",
) -> str:
    channels = [
        channel
        for channel in release_channel_display_order()
        if int(counter.get(channel, 0)) > 0
    ]
    if not channels:
        return fallback
    return sorted(
        channels,
        key=lambda item: (int(counter.get(item, 0)), release_channel_order.get(item, 0)),
        reverse=True,
    )[0]


def build_review_mode_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    review_mode_label_meta: Callable[[str | None], dict[str, str]],
    tenant_sets: dict[str, set[int]] | None = None,
    family_sets: dict[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for mode in review_mode_display_order():
        count = int(counter.get(mode, 0))
        rows.append(
            {
                "mode": review_mode_label_meta(mode),
                "count": count,
                "share": round((count / total) * 100, 1) if total else 0.0,
                "tenant_count": len((tenant_sets or {}).get(mode, set())),
                "family_count": len((family_sets or {}).get(mode, set())),
            }
        )
    return rows


def build_release_channel_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    release_channel_meta: Callable[[str], dict[str, Any]],
    tenant_sets: dict[str, set[int]] | None = None,
    family_sets: dict[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for channel in release_channel_display_order():
        count = int(counter.get(channel, 0))
        rows.append(
            {
                "channel": release_channel_meta(channel),
                "count": count,
                "share": round((count / total) * 100, 1) if total else 0.0,
                "tenant_count": len((tenant_sets or {}).get(channel, set())),
                "family_count": len((family_sets or {}).get(channel, set())),
            }
        )
    return rows


def build_release_status_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    label_catalogo: Callable[[dict[str, str], str, str], str],
    release_status_labels: dict[str, str],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for status in ("active", "draft", "paused", "expired"):
        count = int(counter.get(status, 0))
        rows.append(
            {
                "status": label_catalogo(
                    release_status_labels,
                    status,
                    status or "draft",
                ),
                "count": count,
                "share": round((count / total) * 100, 1) if total else 0.0,
            }
        )
    return rows


def resolve_governance_rollup_release_mode(
    *,
    family: Any,
    release: Any,
    tenant: Any,
    normalizar_review_mode: Callable[..., str | None],
    effective_review_mode_cap: Callable[..., str | None],
    normalizar_planos: Callable[..., list[str] | None],
    summarize_release_contract_governance: Callable[..., dict[str, Any]],
    offer_lifecycle_resolvido: Callable[[Any], Any],
    normalizar_red_flags: Callable[[list[Any]], list[dict[str, Any]] | None],
    normalizar_plano_empresa: Callable[[str], str],
    review_mode_order: dict[str, int],
) -> dict[str, Any]:
    oferta = getattr(family, "oferta_comercial", None)
    review_policy = (
        dict(getattr(family, "review_policy_json", None) or {})
        if isinstance(getattr(family, "review_policy_json", None), dict)
        else {}
    )
    tenant_entitlements = (
        dict(review_policy.get("tenant_entitlements") or {})
        if isinstance(review_policy.get("tenant_entitlements"), dict)
        else {}
    )
    release_policy = (
        dict(getattr(release, "governance_policy_json", None) or {})
        if isinstance(getattr(release, "governance_policy_json", None), dict)
        else {}
    )

    default_review_mode = (
        normalizar_review_mode(
            review_policy.get("default_review_mode"),
            campo="Default review mode",
        )
        or "mesa_required"
    )
    family_max_review_mode = (
        normalizar_review_mode(
            review_policy.get("max_review_mode"),
            campo="Max review mode",
        )
        or "mobile_autonomous"
    )
    release_force_review_mode = normalizar_review_mode(
        release_policy.get("force_review_mode"),
        campo="Force review mode",
    )
    release_max_review_mode = normalizar_review_mode(
        release_policy.get("max_review_mode"),
        campo="Release max review mode",
    )
    effective_cap = (
        effective_review_mode_cap(family_max_review_mode, release_max_review_mode)
        or family_max_review_mode
    )
    requested_review_mode = release_force_review_mode or default_review_mode
    capped_review_mode = review_mode_with_cap(
        requested_mode=requested_review_mode,
        cap_mode=effective_cap,
        review_mode_order=review_mode_order,
    )

    review_allowed_plans = normalizar_planos(
        list(
            tenant_entitlements.get("mobile_review_allowed_plans")
            or tenant_entitlements.get("mobile_review_plans")
            or []
        ),
        campo="Planos com revisão mobile",
    ) or []
    autonomy_allowed_plans = normalizar_planos(
        list(
            tenant_entitlements.get("mobile_autonomous_allowed_plans")
            or tenant_entitlements.get("mobile_autonomous_plans")
            or []
        ),
        campo="Planos com autonomia mobile",
    ) or []

    review_override = release_policy.get("mobile_review_override")
    if not isinstance(review_override, bool):
        review_override = None
    autonomy_override = release_policy.get("mobile_autonomous_override")
    if not isinstance(autonomy_override, bool):
        autonomy_override = None

    tenant_plan = str(getattr(tenant, "plano_ativo", "") or "").strip() or None
    tenant_blocked = bool(getattr(tenant, "status_bloqueio", False))
    mobile_review_allowed = plan_allowed_for_governance_rollup(
        plan_name=tenant_plan,
        allowed_plans=review_allowed_plans,
        normalizar_plano_empresa=normalizar_plano_empresa,
    )
    mobile_autonomous_allowed = plan_allowed_for_governance_rollup(
        plan_name=tenant_plan,
        allowed_plans=autonomy_allowed_plans,
        normalizar_plano_empresa=normalizar_plano_empresa,
    )
    if review_override is not None:
        mobile_review_allowed = review_override
    if autonomy_override is not None:
        mobile_autonomous_allowed = autonomy_override
    if tenant_blocked:
        mobile_review_allowed = False
        mobile_autonomous_allowed = False
    if not mobile_review_allowed:
        mobile_autonomous_allowed = False

    effective_review_mode = capped_review_mode
    if effective_review_mode == "mobile_autonomous" and not mobile_autonomous_allowed:
        effective_review_mode = (
            "mobile_review_allowed" if mobile_review_allowed else "mesa_required"
        )
    elif effective_review_mode == "mobile_review_allowed" and not mobile_review_allowed:
        effective_review_mode = "mesa_required"

    commercial = summarize_release_contract_governance(
        getattr(release, "governance_policy_json", None),
        offer_flags_payload=getattr(oferta, "flags_json", None) if oferta is not None else None,
        offer_lifecycle_status=offer_lifecycle_resolvido(oferta),
    )

    return {
        "effective_review_mode": effective_review_mode,
        "requested_review_mode": requested_review_mode,
        "effective_cap": effective_cap,
        "default_review_mode": default_review_mode,
        "mobile_review_allowed": bool(mobile_review_allowed),
        "mobile_autonomous_allowed": bool(mobile_autonomous_allowed),
        "tenant_plan": tenant_plan,
        "tenant_blocked": tenant_blocked,
        "effective_release_channel": commercial["effective_release_channel"]["key"],
        "red_flags_count": len(
            normalizar_red_flags(list(review_policy.get("red_flags") or [])) or []
        ),
    }


def build_catalog_governance_rollup(
    db: Session,
    *,
    families: list[Any],
    empresa_model: Any,
    tenant_cliente_clause: Callable[[], Any],
    normalizar_review_mode: Callable[..., str | None],
    normalizar_red_flags: Callable[[list[Any]], list[dict[str, Any]] | None],
    review_mode_label_meta: Callable[[str | None], dict[str, str]],
    normalizar_planos: Callable[..., list[str] | None],
    effective_review_mode_cap: Callable[..., str | None],
    summarize_release_contract_governance: Callable[..., dict[str, Any]],
    offer_lifecycle_resolvido: Callable[[Any], Any],
    normalizar_plano_empresa: Callable[[str], str],
    release_channel_meta: Callable[[str], dict[str, Any]],
    review_mode_order: dict[str, int],
    release_channel_order: dict[str, int],
    label_catalogo: Callable[[dict[str, str], str, str], str],
    release_status_labels: dict[str, str],
) -> dict[str, Any]:
    tenant_ids = {
        int(getattr(release, "tenant_id", 0) or 0)
        for family in families
        for release in list(getattr(family, "tenant_releases", None) or [])
        if int(getattr(release, "tenant_id", 0) or 0) > 0
    }
    tenant_lookup = {
        int(item.id): item
        for item in list(
            db.scalars(
                select(empresa_model).where(
                    empresa_model.id.in_(tenant_ids) if tenant_ids else False,
                    tenant_cliente_clause(),
                )
            ).all()
        )
    } if tenant_ids else {}

    family_default_counter: Counter[str] = Counter()
    release_status_counter: Counter[str] = Counter()
    active_release_counter: Counter[str] = Counter()
    active_channel_counter: Counter[str] = Counter()
    release_channel_tenants: dict[str, set[int]] = defaultdict(set)
    release_channel_families: dict[str, set[str]] = defaultdict(set)
    release_mode_tenants: dict[str, set[int]] = defaultdict(set)
    release_mode_families: dict[str, set[str]] = defaultdict(set)
    tenant_mode_counters: dict[int, Counter[str]] = defaultdict(Counter)
    tenant_meta: dict[int, dict[str, Any]] = {}
    family_highlights: list[dict[str, Any]] = []
    family_red_flags_total = 0
    families_with_red_flags = 0

    for family in families:
        family_key = str(getattr(family, "family_key", "") or "").strip()
        family_label = str(getattr(family, "nome_exibicao", "") or family_key)
        review_policy = (
            dict(getattr(family, "review_policy_json", None) or {})
            if isinstance(getattr(family, "review_policy_json", None), dict)
            else {}
        )
        family_default_mode = (
            normalizar_review_mode(
                review_policy.get("default_review_mode"),
                campo="Default review mode",
            )
            or "mesa_required"
        )
        family_default_counter[family_default_mode] += 1
        red_flags_count = len(
            normalizar_red_flags(list(review_policy.get("red_flags") or [])) or []
        )
        family_red_flags_total += red_flags_count
        if red_flags_count > 0:
            families_with_red_flags += 1

        family_release_counter: Counter[str] = Counter()
        family_release_channel_counter: Counter[str] = Counter()
        family_release_tenants: set[int] = set()

        for release in list(getattr(family, "tenant_releases", None) or []):
            tenant_id = int(getattr(release, "tenant_id", 0) or 0)
            tenant = tenant_lookup.get(tenant_id)
            if tenant is None:
                continue

            release_status = (
                str(getattr(release, "release_status", "") or "draft").strip().lower()
                or "draft"
            )
            release_status_counter[release_status] += 1
            if release_status != "active":
                continue

            resolved = resolve_governance_rollup_release_mode(
                family=family,
                release=release,
                tenant=tenant,
                normalizar_review_mode=normalizar_review_mode,
                effective_review_mode_cap=effective_review_mode_cap,
                normalizar_planos=normalizar_planos,
                summarize_release_contract_governance=summarize_release_contract_governance,
                offer_lifecycle_resolvido=offer_lifecycle_resolvido,
                normalizar_red_flags=normalizar_red_flags,
                normalizar_plano_empresa=normalizar_plano_empresa,
                review_mode_order=review_mode_order,
            )
            effective_mode = str(resolved["effective_review_mode"])
            effective_channel = str(resolved.get("effective_release_channel") or "pilot")
            active_release_counter[effective_mode] += 1
            active_channel_counter[effective_channel] += 1
            release_mode_tenants[effective_mode].add(tenant_id)
            release_mode_families[effective_mode].add(family_key)
            release_channel_tenants[effective_channel].add(tenant_id)
            release_channel_families[effective_channel].add(family_key)
            family_release_counter[effective_mode] += 1
            family_release_channel_counter[effective_channel] += 1
            family_release_tenants.add(tenant_id)
            tenant_mode_counters[tenant_id][effective_mode] += 1
            tenant_meta[tenant_id] = {
                "tenant_id": tenant_id,
                "tenant_label": str(
                    getattr(tenant, "nome_fantasia", "") or f"Tenant {tenant_id}"
                ),
                "plan_label": str(getattr(tenant, "plano_ativo", "") or "Sem plano"),
                "blocked": bool(getattr(tenant, "status_bloqueio", False)),
            }

        if sum(int(item) for item in family_release_counter.values()) <= 0:
            continue

        dominant_mode = dominant_review_mode(
            family_release_counter,
            review_mode_order=review_mode_order,
        ) or family_default_mode
        family_highlights.append(
            {
                "family_key": family_key,
                "family_label": family_label,
                "active_release_count": sum(
                    int(item) for item in family_release_counter.values()
                ),
                "tenant_count": len(family_release_tenants),
                "red_flags_count": red_flags_count,
                "default_review_mode": review_mode_label_meta(family_default_mode),
                "dominant_mode": review_mode_label_meta(dominant_mode),
                "release_channel": release_channel_meta(
                    dominant_release_channel(
                        family_release_channel_counter,
                        release_channel_order=release_channel_order,
                        fallback="pilot",
                    )
                ),
                "mode_breakdown": build_review_mode_counter_rows(
                    family_release_counter,
                    total=sum(int(item) for item in family_release_counter.values()),
                    review_mode_label_meta=review_mode_label_meta,
                ),
                "mode_breakdown_label": format_review_mode_breakdown(
                    family_release_counter,
                    review_mode_label_meta=review_mode_label_meta,
                ),
            }
        )

    tenant_highlights: list[dict[str, Any]] = []
    tenant_strictest_counter: Counter[str] = Counter()
    for tenant_id, counter in tenant_mode_counters.items():
        strictest_mode = strictest_review_mode(
            counter,
            review_mode_order=review_mode_order,
        )
        if strictest_mode is None:
            continue
        tenant_strictest_counter[strictest_mode] += 1
        meta = tenant_meta.get(tenant_id, {})
        tenant_highlights.append(
            {
                "tenant_id": tenant_id,
                "tenant_label": str(meta.get("tenant_label") or f"Tenant {tenant_id}"),
                "plan_label": str(meta.get("plan_label") or "Sem plano"),
                "blocked": bool(meta.get("blocked")),
                "active_release_count": sum(int(item) for item in counter.values()),
                "strictest_mode": review_mode_label_meta(strictest_mode),
                "mode_breakdown": build_review_mode_counter_rows(
                    counter,
                    total=sum(int(item) for item in counter.values()),
                    review_mode_label_meta=review_mode_label_meta,
                ),
                "mode_breakdown_label": format_review_mode_breakdown(
                    counter,
                    review_mode_label_meta=review_mode_label_meta,
                ),
            }
        )

    tenant_highlights.sort(
        key=lambda item: (
            -review_mode_order[
                str((item["strictest_mode"] or {}).get("key") or "mesa_required")
            ],
            -int(item["active_release_count"]),
            str(item["tenant_label"]).lower(),
        )
    )
    family_highlights.sort(
        key=lambda item: (
            -int(item["active_release_count"]),
            -review_mode_order[
                str((item["dominant_mode"] or {}).get("key") or "mesa_required")
            ],
            str(item["family_label"]).lower(),
        )
    )

    total_active_releases = sum(int(item) for item in active_release_counter.values())
    total_releases = sum(int(item) for item in release_status_counter.values())
    return {
        "scope_family_count": len(families),
        "families_with_active_release_count": len(family_highlights),
        "families_with_red_flags_count": int(families_with_red_flags),
        "family_red_flags_total": int(family_red_flags_total),
        "tenant_count": len(tenant_highlights),
        "active_release_count": int(total_active_releases),
        "inactive_release_count": int(total_releases - total_active_releases),
        "family_default_modes": build_review_mode_counter_rows(
            family_default_counter,
            total=len(families),
            review_mode_label_meta=review_mode_label_meta,
        ),
        "effective_release_modes": build_review_mode_counter_rows(
            active_release_counter,
            total=total_active_releases,
            review_mode_label_meta=review_mode_label_meta,
            tenant_sets=release_mode_tenants,
            family_sets=release_mode_families,
        ),
        "effective_release_channels": build_release_channel_counter_rows(
            active_channel_counter,
            total=total_active_releases,
            release_channel_meta=release_channel_meta,
            tenant_sets=release_channel_tenants,
            family_sets=release_channel_families,
        ),
        "tenant_strictest_modes": build_review_mode_counter_rows(
            tenant_strictest_counter,
            total=len(tenant_highlights),
            review_mode_label_meta=review_mode_label_meta,
        ),
        "release_status_counts": build_release_status_counter_rows(
            release_status_counter,
            total=total_releases,
            label_catalogo=label_catalogo,
            release_status_labels=release_status_labels,
        ),
        "tenant_highlights": tenant_highlights[:6],
        "family_highlights": family_highlights[:6],
    }
