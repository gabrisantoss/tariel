from __future__ import annotations

from collections import Counter
from typing import Any


def build_calibration_queue_rollup(
    rows_all: list[dict[str, Any]],
    *,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    actionable_items: list[dict[str, Any]] = []
    template_pressure_counter: dict[str, dict[str, Any]] = {}
    for row in rows_all:
        family_key = str(row.get("family_key") or "")
        workspace = dependencies["build_material_real_workspace_summary"](family_key)
        priority = dependencies["build_material_real_priority_summary"](row, workspace)
        execution_track = dict((workspace or {}).get("execution_track") or {})
        worklist = dict((workspace or {}).get("worklist") or {})
        priority_key = str((priority.get("status") or {}).get("key") or "")
        if priority_key == "resolved":
            continue
        variant_library = {
            "variant_count": int(row.get("variant_count") or 0),
        }
        target = dependencies["build_template_refinement_target"](
            family_key=family_key,
            display_name=str(row.get("display_name") or family_key),
            material_real_priority=priority,
            variant_library=variant_library,
            template_default_code=str(row.get("template_default_code") or "").strip() or None,
            active_release_count=int(row.get("active_release_count") or 0),
        )
        pressure_score = (
            int(priority.get("priority_rank") or 0) * 100
            + int(row.get("active_release_count") or 0) * 10
            + int(row.get("variant_count") or 0)
        )
        queue_reason = {
            "immediate": "Pacote validado já permite calibrar template, PDF final e anexo pack.",
            "active_queue": "Workspace real aberto, com sinais suficientes para refino, mas ainda com lacunas.",
            "waiting_material": "Família comercialmente pronta, porém aguardando acervo real do cliente.",
            "bootstrap": "Família vendável sem trilha de material real aberta.",
        }.get(priority_key, "Família com necessidade de calibração operacional.")
        if str(execution_track.get("focus_label") or "").strip():
            queue_reason = str(execution_track.get("focus_label") or "").strip()
        actionable_items.append(
            {
                "family_key": family_key,
                "display_name": str(row.get("display_name") or family_key),
                "priority": priority,
                "execution_track": execution_track,
                "worklist": worklist,
                "workspace_status": priority.get("workspace_status"),
                "readiness": row.get("readiness"),
                "active_release_count": int(row.get("active_release_count") or 0),
                "variant_count": int(row.get("variant_count") or 0),
                "template_refinement_target": target,
                "queue_reason": queue_reason,
                "workspace_path": (workspace or {}).get("workspace_path"),
                "next_action": str(
                    worklist.get("next_blocking_task")
                    or (priority.get("recommended_actions") or [None])[0]
                    or ""
                ).strip()
                or None,
                "next_checkpoint": str(execution_track.get("next_checkpoint") or "").strip() or None,
                "worklist_pending_count": int(worklist.get("pending_count") or 0),
                "execution_sort_order": int(execution_track.get("sort_order") or 999),
                "pressure_score": pressure_score,
            }
        )
        entry = template_pressure_counter.setdefault(
            target["master_template_id"],
            {
                "master_template_id": target["master_template_id"],
                "label": target["label"],
                "status": target["status"],
                "artifact_path": target.get("artifact_path"),
                "family_count": 0,
                "active_release_count": 0,
                "variant_count": 0,
                "families": [],
            },
        )
        entry["family_count"] += 1
        entry["active_release_count"] += int(row.get("active_release_count") or 0)
        entry["variant_count"] += int(row.get("variant_count") or 0)
        if len(entry["families"]) < 3:
            entry["families"].append(str(row.get("display_name") or family_key))

    actionable_items.sort(
        key=lambda item: (
            int(item.get("execution_sort_order") or 999),
            -int(item.get("pressure_score") or 0),
            str(item.get("display_name") or "").lower(),
        )
    )
    template_targets = sorted(
        template_pressure_counter.values(),
        key=lambda item: (
            -int(item.get("family_count") or 0),
            -int(item.get("active_release_count") or 0),
            -int(item.get("variant_count") or 0),
            str(item.get("label") or "").lower(),
        ),
    )
    priority_counter = Counter(
        str((item.get("priority") or {}).get("status", {}).get("key") or "")
        for item in actionable_items
    )
    return {
        "queue_count": len(actionable_items),
        "priority_modes": [
            {
                "status": dependencies["label_catalogo"](
                    dependencies["material_priority_labels"],
                    key,
                    dependencies["humanizar_slug"](key) or "Prioridade",
                ),
                "count": int(priority_counter.get(key, 0)),
            }
            for key in ("immediate", "active_queue", "waiting_material", "bootstrap")
        ],
        "highlights": actionable_items[:6],
        "template_targets": template_targets[:6],
    }
