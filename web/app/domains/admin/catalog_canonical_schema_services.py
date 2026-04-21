"""Leitura dos family schemas canônicos do catálogo."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.paths import resolve_family_schemas_dir


def _repo_root_dir() -> Path:
    return Path(__file__).resolve().parents[4]


def family_schemas_dir() -> Path:
    candidate = (_repo_root_dir() / "docs" / "family_schemas").resolve()
    if candidate.is_dir():
        return candidate
    return resolve_family_schemas_dir()


def _read_json_file(path: Path, *, field_name: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as erro:
        raise ValueError(f"{field_name} não encontrado em {path.name}.") from erro
    except json.JSONDecodeError as erro:
        raise ValueError(f"{field_name} inválido em {path.name}.") from erro
    if not isinstance(payload, dict):
        raise ValueError(f"{field_name} em {path.name} precisa ser um objeto JSON.")
    return payload


def family_schema_file_path(
    family_key: str,
    *,
    directory: Path | None = None,
    normalize_family_key,
) -> Path:
    family_key_norm = normalize_family_key(family_key, campo="Family key", max_len=120)
    base_dir = directory.resolve() if directory is not None else family_schemas_dir()
    return (base_dir / f"{family_key_norm}.json").resolve()


def family_artifact_file_path(
    family_key: str,
    artifact_suffix: str,
    *,
    directory: Path | None = None,
    normalize_family_key,
) -> Path:
    family_key_norm = normalize_family_key(family_key, campo="Family key", max_len=120)
    base_dir = directory.resolve() if directory is not None else family_schemas_dir()
    return (base_dir / f"{family_key_norm}{artifact_suffix}").resolve()


def list_canonical_family_schemas(
    *,
    directory: Path | None = None,
    normalize_family_key,
    infer_catalog_classification,
) -> list[dict[str, Any]]:
    resolved_directory = directory.resolve() if directory is not None else family_schemas_dir()
    if not resolved_directory.exists():
        return []

    items: list[dict[str, Any]] = []
    for path in sorted(resolved_directory.glob("*.json")):
        name = path.name
        if (
            name.endswith(".laudo_output_seed.json")
            or name.endswith(".laudo_output_exemplo.json")
            or name.endswith(".template_master_seed.json")
        ):
            continue
        payload = _read_json_file(path, field_name="Family schema canônico")
        family_key = normalize_family_key(payload.get("family_key") or path.stem, campo="Family key", max_len=120)
        display_name = str(payload.get("nome_exibicao") or family_key)
        macro_category = str(payload.get("macro_categoria") or "")
        items.append(
            {
                "family_key": family_key,
                "nome_exibicao": display_name,
                "macro_categoria": macro_category,
                "catalog_classification": infer_catalog_classification(
                    family_key=family_key,
                    nome_exibicao=display_name,
                    macro_categoria=macro_category,
                ),
                "schema_version": int(payload.get("schema_version") or 1),
                "has_template_seed": family_artifact_file_path(
                    family_key,
                    ".template_master_seed.json",
                    directory=resolved_directory,
                    normalize_family_key=normalize_family_key,
                ).exists(),
                "has_laudo_output_seed": family_artifact_file_path(
                    family_key,
                    ".laudo_output_seed.json",
                    directory=resolved_directory,
                    normalize_family_key=normalize_family_key,
                ).exists(),
                "has_laudo_output_exemplo": family_artifact_file_path(
                    family_key,
                    ".laudo_output_exemplo.json",
                    directory=resolved_directory,
                    normalize_family_key=normalize_family_key,
                ).exists(),
                "path": str(path),
            }
        )
    return items


def load_canonical_family_schema(
    family_key: str,
    *,
    directory: Path | None = None,
    normalize_family_key,
) -> dict[str, Any]:
    path = family_schema_file_path(
        family_key,
        directory=directory,
        normalize_family_key=normalize_family_key,
    )
    payload = _read_json_file(path, field_name="Family schema canônico")
    family_key_payload = normalize_family_key(
        payload.get("family_key") or path.stem,
        campo="Family key",
        max_len=120,
    )
    if family_key_payload != normalize_family_key(family_key, campo="Family key", max_len=120):
        raise ValueError("Family schema canônico com chave divergente do arquivo.")
    return payload


__all__ = [
    "family_artifact_file_path",
    "family_schema_file_path",
    "family_schemas_dir",
    "list_canonical_family_schemas",
    "load_canonical_family_schema",
]
