from __future__ import annotations

from collections import Counter
from typing import Any


def build_material_real_rollup(
    rows_all: list[dict[str, Any]],
    *,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    workspace_by_family = {
        str(row["family_key"]): dependencies["build_material_real_workspace_summary"](str(row["family_key"]))
        for row in rows_all
    }
    summaries = [item for item in workspace_by_family.values() if item is not None]
    validated = [
        item
        for item in summaries
        if str((item["status"] or {}).get("key") or "") == "baseline_sintetica_externa_validada"
    ]
    packages_ready = [
        item
        for item in summaries
        if bool(item.get("has_reference_manifest")) and bool(item.get("has_reference_bundle"))
    ]
    priority_rows = [
        {
            "family_key": str(row["family_key"]),
            "display_name": str(row["display_name"]),
            "workspace_path": (workspace_by_family.get(str(row["family_key"])) or {}).get("workspace_path"),
            "priority": dependencies["build_material_real_priority_summary"](
                row,
                workspace_by_family.get(str(row["family_key"])),
            ),
        }
        for row in rows_all
    ]
    priority_rows.sort(
        key=lambda item: (
            -int(dependencies["dict_payload_admin"](item.get("priority")).get("priority_rank") or 0),
            str(item["display_name"]).lower(),
        )
    )
    priority_counter = Counter(
        str(
            dependencies["dict_payload_admin"](
                dependencies["dict_payload_admin"](item.get("priority")).get("status")
            ).get("key")
            or ""
        )
        for item in priority_rows
    )
    return {
        "workspace_count": len(summaries),
        "validated_workspace_count": len(validated),
        "reference_package_ready_count": len(packages_ready),
        "with_briefing_count": sum(1 for item in summaries if bool(item.get("has_briefing"))),
        "priority_modes": [
            {
                "status": dependencies["label_catalogo"](
                    dependencies["material_priority_labels"],
                    key,
                    dependencies["humanizar_slug"](key) or "Prioridade",
                ),
                "count": int(priority_counter.get(key, 0)),
            }
            for key in ("immediate", "active_queue", "waiting_material", "bootstrap", "resolved")
        ],
        "highlights": [
            {
                "family_key": str(row["family_key"]),
                "display_name": str(row["display_name"]),
                "status": (workspace_by_family.get(str(row["family_key"])) or {}).get("status"),
                "workspace_path": summary["workspace_path"],
            }
            for row in rows_all
            for summary in [workspace_by_family.get(str(row["family_key"]))]
            if summary is not None
        ][:6],
        "priority_highlights": [
            {
                "family_key": item["family_key"],
                "display_name": item["display_name"],
                "status": dependencies["dict_payload_admin"](item.get("priority")).get("status"),
                "workspace_path": item.get("workspace_path"),
                "next_action": (
                    dependencies["dict_payload_admin"](item.get("priority")).get("recommended_actions")
                    or [None]
                )[0],
            }
            for item in priority_rows[:6]
        ],
    }


def build_commercial_scale_rollup(
    rows_all: list[dict[str, Any]],
    *,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    bundle_counter: Counter[str] = Counter()
    bundle_meta: dict[str, dict[str, Any]] = {}
    channel_counter: Counter[str] = Counter()
    feature_counter: Counter[str] = Counter()

    for row in rows_all:
        commercial = row.get("contract_entitlements") or {}
        for feature in list(commercial.get("included_features") or []):
            key = str(feature.get("key") or "").strip()
            if key:
                feature_counter[key] += 1

        channel_key = str((row.get("release_channel") or {}).get("key") or "").strip()
        if channel_key:
            channel_counter[channel_key] += 1

        bundle = row.get("commercial_bundle")
        if isinstance(bundle, dict):
            bundle_key = str(bundle.get("bundle_key") or "").strip()
            if bundle_key:
                bundle_counter[bundle_key] += 1
                bundle_meta[bundle_key] = {
                    "bundle_key": bundle_key,
                    "bundle_label": str(bundle.get("bundle_label") or bundle_key).strip(),
                    "summary": str(bundle.get("summary") or "").strip() or None,
                    "audience": str(bundle.get("audience") or "").strip() or None,
                    "highlights": list(bundle.get("highlights") or []),
                }
                continue
        package_name = str(row.get("offer_package") or "").strip()
        if package_name:
            bundle_key = dependencies["normalizar_chave_catalogo"](
                package_name,
                campo="Pacote comercial",
                max_len=80,
            )
            if bundle_key:
                bundle_counter[bundle_key] += 1
                bundle_meta.setdefault(
                    bundle_key,
                    {
                        "bundle_key": bundle_key,
                        "bundle_label": package_name,
                        "summary": None,
                        "audience": None,
                        "highlights": [],
                    },
                )

    bundle_rows = sorted(
        (
            {
                **meta,
                "family_count": int(bundle_counter.get(bundle_key, 0)),
            }
            for bundle_key, meta in bundle_meta.items()
        ),
        key=lambda item: (-int(item["family_count"]), str(item["bundle_label"]).lower()),
    )
    total_channels = sum(int(item) for item in channel_counter.values())
    total_features = sum(int(item) for item in feature_counter.values())
    return {
        "bundle_count": len(bundle_rows),
        "bundle_highlights": bundle_rows[:6],
        "release_channels": [
            {
                "channel": dependencies["release_channel_meta"](channel),
                "count": int(channel_counter.get(channel, 0)),
                "share": round((int(channel_counter.get(channel, 0)) / total_channels) * 100, 1)
                if total_channels
                else 0.0,
            }
            for channel in ("pilot", "limited_release", "general_release")
        ],
        "feature_highlights": [
            {
                "feature": {
                    "key": key,
                    "label": next(
                        (
                            item.get("label")
                            for row in rows_all
                            for item in list(((row.get("contract_entitlements") or {}).get("included_features") or []))
                            if str(item.get("key") or "").strip() == key
                        ),
                        dependencies["humanizar_slug"](key),
                    ),
                },
                "count": int(feature_counter.get(key, 0)),
                "share": round((int(feature_counter.get(key, 0)) / total_features) * 100, 1)
                if total_features
                else 0.0,
            }
            for key, _count in feature_counter.most_common(6)
        ],
    }
