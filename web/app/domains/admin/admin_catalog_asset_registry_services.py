from __future__ import annotations

import json
from pathlib import Path
import re
from typing import Any


def template_library_registry_path(*, dependencies: dict[str, Any]) -> Path:
    candidate = (dependencies["repo_root_dir"]() / "docs" / "master_templates" / "library_registry.json").resolve()
    if candidate.exists():
        return candidate
    return (dependencies["resolve_master_templates_dir"]() / "library_registry.json").resolve()


def load_template_library_registry(*, dependencies: dict[str, Any]) -> dict[str, Any]:
    path = dependencies["template_library_registry_path"]()
    if not path.exists():
        return {"version": 0, "templates": []}
    payload = dependencies["ler_json_arquivo"](path, campo="Library registry")
    templates = payload.get("templates")
    if not isinstance(templates, list):
        payload["templates"] = []
    return payload


def build_template_library_rollup(rows_all: list[dict[str, Any]], *, dependencies: dict[str, Any]) -> dict[str, Any]:
    registry = dependencies["load_template_library_registry"]()
    templates = [
        item
        for item in list(registry.get("templates") or [])
        if isinstance(item, dict)
    ]
    ready_templates = [
        item for item in templates if str(item.get("status") or "").strip().lower() == "ready"
    ]
    families_with_full_artifacts = sum(
        1
        for item in rows_all
        if all(bool(item["artifact_snapshot"].get(key)) for key in (
            "has_family_schema",
            "has_template_seed",
            "has_laudo_output_seed",
            "has_laudo_output_exemplo",
        ))
    )
    families_with_template_default = sum(
        1 for item in rows_all if str(item.get("template_default_code") or "").strip()
    )
    return {
        "registry_path": dependencies["repo_relative_path_label"](dependencies["template_library_registry_path"]()),
        "registry_version": int(registry.get("version") or 0),
        "template_count": len(templates),
        "ready_template_count": len(ready_templates),
        "demonstration_ready_count": int(families_with_full_artifacts),
        "families_with_full_artifacts": int(families_with_full_artifacts),
        "families_with_template_default": int(families_with_template_default),
        "sellable_family_count": sum(
            1 for item in rows_all if str((item["readiness"] or {}).get("key") or "") in {"sellable", "calibrated"}
        ),
        "templates": [
            {
                "master_template_id": str(item.get("master_template_id") or "").strip() or None,
                "label": str(item.get("label") or "").strip() or "Template premium",
                "documental_type": str(item.get("documental_type") or "").strip() or None,
                "status": dependencies["label_catalogo"](
                    {"ready": ("Pronto", "active"), "draft": ("Rascunho", "draft")},
                    str(item.get("status") or "").strip().lower() or "draft",
                    "Rascunho",
                ),
                "artifact_path": str(item.get("artifact_path") or "").strip() or None,
                "usage": str(item.get("usage") or "").strip() or None,
            }
            for item in templates[:6]
        ],
    }


def template_library_registry_index(*, dependencies: dict[str, Any]) -> dict[str, dict[str, Any]]:
    registry = dependencies["load_template_library_registry"]()
    index: dict[str, dict[str, Any]] = {}
    for item in list(registry.get("templates") or []):
        if not isinstance(item, dict):
            continue
        master_template_id = str(item.get("master_template_id") or "").strip()
        if not master_template_id:
            continue
        index[master_template_id] = item
    return index


def catalog_model_label(
    codigo: str | None,
    *,
    fallback: str | None = None,
    dependencies: dict[str, Any],
) -> str | None:
    codigo_norm = str(codigo or "").strip()
    if not codigo_norm:
        return fallback
    contract = dict(dependencies["master_template_registry"].get(codigo_norm) or {})
    if not contract:
        contract = dict(dependencies["template_library_registry_index"]().get(codigo_norm) or {})
    label = str(contract.get("label") or "").strip()
    if label:
        return label
    if re.fullmatch(r"[a-z]{2,4}", codigo_norm.lower()):
        return codigo_norm.upper()
    return dependencies["humanizar_slug"](codigo_norm) or fallback or codigo_norm


def material_real_workspace_roots(*, dependencies: dict[str, Any]) -> list[Path]:
    docs_dir = (dependencies["repo_root_dir"]() / "docs").resolve()
    return sorted(path for path in docs_dir.glob("portfolio_empresa_*_material_real") if path.is_dir())


def find_material_real_workspace(family_key: str, *, dependencies: dict[str, Any]) -> Path | None:
    family_key_norm = dependencies["normalizar_chave_catalogo"](family_key, campo="Family key", max_len=120)
    for root in dependencies["material_real_workspace_roots"]():
        candidate = (root / family_key_norm).resolve()
        if candidate.exists() and candidate.is_dir():
            return candidate
    return None


def read_json_if_exists(path: Path) -> dict[str, Any] | None:
    if not path.exists() or not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None
