from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.paths import canonical_docs_logical_path, resolve_master_templates_dir
from app.domains.admin.admin_catalog_asset_registry_services import (
    build_template_library_rollup as _admin_catalog_assets_build_template_rollup,
    find_material_real_workspace as _admin_catalog_assets_find_material_workspace,
    load_template_library_registry as _admin_catalog_assets_load_template_registry,
    material_real_workspace_roots as _admin_catalog_assets_material_roots,
    read_json_if_exists as _admin_catalog_assets_read_json_if_exists,
    template_library_registry_index as _admin_catalog_assets_registry_index,
    template_library_registry_path as _admin_catalog_assets_registry_path,
)
from app.domains.admin.admin_catalog_document_preview_services import (
    build_catalog_home_document_preview as _admin_catalog_build_home_document_preview,
    build_document_preview_summary as _admin_catalog_build_document_preview_summary,
    document_preview_objective as _admin_catalog_document_preview_objective,
    enrich_catalog_rows_with_document_preview as _admin_catalog_enrich_rows_with_document_preview,
    material_preview_status as _admin_catalog_material_preview_status,
    preview_section_status as _admin_catalog_preview_section_status,
    showcase_preview_status as _admin_catalog_showcase_preview_status,
)
from app.domains.admin.admin_catalog_material_real_services import (
    build_material_real_execution_track as _admin_catalog_material_execution_track,
    build_material_real_priority_summary as _admin_catalog_material_priority_summary,
    build_material_real_worklist as _admin_catalog_material_worklist,
    build_material_real_worklist_item as _admin_catalog_material_worklist_item,
    build_material_real_workspace_summary as _admin_catalog_material_workspace_summary,
    material_real_has_received_item as _admin_catalog_material_has_received_item,
)
from app.domains.admin.admin_catalog_variant_services import (
    build_template_refinement_target as _admin_catalog_build_template_refinement_target,
    build_variant_library_summary as _admin_catalog_build_variant_library_summary,
)
from app.shared.database import FamiliaLaudoCatalogo


def _catalog_family_artifact_snapshot(family_key: str) -> dict[str, bool]:
    from app.domains.admin import services as admin_services

    family_key_norm = admin_services._normalizar_chave_catalogo(
        family_key,
        campo="Family key",
        max_len=120,
    )
    return {
        "has_family_schema": admin_services._family_schema_file_path(family_key_norm).exists(),
        "has_template_seed": admin_services._family_artifact_file_path(
            family_key_norm, ".template_master_seed.json"
        ).exists(),
        "has_laudo_output_seed": admin_services._family_artifact_file_path(
            family_key_norm, ".laudo_output_seed.json"
        ).exists(),
        "has_laudo_output_exemplo": admin_services._family_artifact_file_path(
            family_key_norm, ".laudo_output_exemplo.json"
        ).exists(),
    }


def _repo_relative_path_label(path: Path | None) -> str | None:
    from app.domains.admin import services as admin_services

    if path is None:
        return None
    canonical_label = canonical_docs_logical_path(path)
    if canonical_label is not None:
        return canonical_label
    try:
        return str(path.resolve().relative_to(admin_services._repo_root_dir())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def _template_library_registry_path() -> Path:
    from app.domains.admin import services as admin_services

    return _admin_catalog_assets_registry_path(
        dependencies={
            "repo_root_dir": admin_services._repo_root_dir,
            "resolve_master_templates_dir": resolve_master_templates_dir,
        },
    )


def _load_template_library_registry() -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_assets_load_template_registry(
        dependencies={
            "template_library_registry_path": _template_library_registry_path,
            "ler_json_arquivo": admin_services._ler_json_arquivo,
        },
    )


def _build_template_library_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_assets_build_template_rollup(
        rows_all,
        dependencies={
            "load_template_library_registry": _load_template_library_registry,
            "repo_relative_path_label": _repo_relative_path_label,
            "template_library_registry_path": _template_library_registry_path,
            "label_catalogo": admin_services._label_catalogo,
        },
    )


def _template_library_registry_index() -> dict[str, dict[str, Any]]:
    return _admin_catalog_assets_registry_index(
        dependencies={
            "load_template_library_registry": _load_template_library_registry,
        },
    )


def _material_real_workspace_roots() -> list[Path]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_assets_material_roots(
        dependencies={
            "repo_root_dir": admin_services._repo_root_dir,
        },
    )


def _find_material_real_workspace(family_key: str) -> Path | None:
    from app.domains.admin import services as admin_services

    return _admin_catalog_assets_find_material_workspace(
        family_key,
        dependencies={
            "normalizar_chave_catalogo": admin_services._normalizar_chave_catalogo,
            "material_real_workspace_roots": _material_real_workspace_roots,
        },
    )


def _read_json_if_exists(path: Path) -> dict[str, Any] | None:
    return _admin_catalog_assets_read_json_if_exists(path)


def _build_material_real_workspace_summary(family_key: str) -> dict[str, Any] | None:
    from app.domains.admin import services as admin_services

    return _admin_catalog_material_workspace_summary(
        family_key,
        dependencies={
            "find_material_real_workspace": _find_material_real_workspace,
            "read_json_if_exists": _read_json_if_exists,
            "label_catalogo": admin_services._label_catalogo,
            "material_workspace_status_labels": admin_services._CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
            "build_material_real_execution_track": _build_material_real_execution_track,
            "build_material_real_worklist": _build_material_real_worklist,
            "repo_relative_path_label": _repo_relative_path_label,
        },
    )


def _build_material_real_priority_summary(
    row: dict[str, Any],
    material_real_workspace: dict[str, Any] | None,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_material_priority_summary(
        row,
        material_real_workspace,
        dependencies={
            "label_catalogo": admin_services._label_catalogo,
            "material_priority_labels": admin_services._CATALOGO_MATERIAL_PRIORITY_LABELS,
            "material_workspace_status_labels": admin_services._CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _material_real_has_received_item(
    material_recebido: list[str],
    *,
    item_id: str,
    drop_folder: str | None = None,
) -> bool:
    return _admin_catalog_material_has_received_item(
        material_recebido,
        item_id=item_id,
        drop_folder=drop_folder,
    )


def _build_material_real_worklist_item(
    *,
    task_id: str,
    title: str,
    done: bool,
    blocking: bool,
    deliverable: str,
    owner: str,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_material_worklist_item(
        task_id=task_id,
        title=title,
        done=done,
        blocking=blocking,
        deliverable=deliverable,
        owner=owner,
        dependencies={
            "label_catalogo": admin_services._label_catalogo,
            "material_worklist_status_labels": admin_services._CATALOGO_MATERIAL_WORKLIST_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _build_material_real_execution_track(
    *,
    family_key: str,
    display_name: str,
    status_key: str,
    manifest_payload: dict[str, Any],
    material_recebido: list[str],
    has_reference_pack: bool,
    validations_count: int,
    material_real_workspace: dict[str, Any],
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_material_execution_track(
        family_key=family_key,
        display_name=display_name,
        status_key=status_key,
        manifest_payload=manifest_payload,
        material_recebido=material_recebido,
        has_reference_pack=has_reference_pack,
        validations_count=validations_count,
        material_real_workspace=material_real_workspace,
        dependencies={
            "material_execution_track_presets": admin_services._MATERIAL_REAL_EXECUTION_TRACK_PRESETS,
            "label_catalogo": admin_services._label_catalogo,
            "material_worklist_phase_labels": admin_services._CATALOGO_MATERIAL_WORKLIST_PHASE_LABELS,
            "material_workspace_status_labels": admin_services._CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
            "catalogo_modelo_label": admin_services._catalogo_modelo_label,
            "resolve_master_template_id_for_family": admin_services.resolve_master_template_id_for_family,
        },
    )


def _build_material_real_worklist(
    *,
    family_key: str,
    manifest_payload: dict[str, Any],
    material_recebido: list[str],
    has_reference_pack: bool,
    validations_count: int,
    status_key: str,
) -> dict[str, Any]:
    return _admin_catalog_material_worklist(
        family_key=family_key,
        manifest_payload=manifest_payload,
        material_recebido=material_recebido,
        has_reference_pack=has_reference_pack,
        validations_count=validations_count,
        status_key=status_key,
        dependencies={
            "material_real_has_received_item": _material_real_has_received_item,
            "build_material_real_worklist_item": _build_material_real_worklist_item,
        },
    )


def _preview_section_status(
    *,
    chain_complete: bool,
    has_reference_pack: bool,
    calibration_key: str,
) -> dict[str, str]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_preview_section_status(
        chain_complete=chain_complete,
        has_reference_pack=has_reference_pack,
        calibration_key=calibration_key,
        dependencies={
            "label_catalogo": admin_services._label_catalogo,
            "document_preview_status_labels": admin_services._CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _showcase_preview_status(*, chain_complete: bool) -> dict[str, str]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_showcase_preview_status(
        chain_complete=chain_complete,
        dependencies={
            "label_catalogo": admin_services._label_catalogo,
            "showcase_status_labels": admin_services._CATALOGO_SHOWCASE_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _material_preview_status(*, has_reference_pack: bool, calibration_key: str) -> dict[str, str]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_material_preview_status(
        has_reference_pack=has_reference_pack,
        calibration_key=calibration_key,
        dependencies={
            "label_catalogo": admin_services._label_catalogo,
            "material_preview_status_labels": admin_services._CATALOGO_MATERIAL_PREVIEW_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _document_preview_objective(
    *,
    row: dict[str, Any],
    family_schema: dict[str, Any] | None,
) -> dict[str, str]:
    return _admin_catalog_document_preview_objective(
        row=row,
        family_schema=family_schema,
    )


def _build_document_preview_summary(
    *,
    row: dict[str, Any],
    artifact_snapshot: dict[str, bool],
    family_schema: dict[str, Any] | None,
    offer: dict[str, Any] | None,
    calibration: dict[str, Any],
    material_real_workspace: dict[str, Any] | None,
    family_methods: list[dict[str, Any]],
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_build_document_preview_summary(
        row=row,
        artifact_snapshot=artifact_snapshot,
        family_schema=family_schema,
        offer=offer,
        calibration=calibration,
        material_real_workspace=material_real_workspace,
        family_methods=family_methods,
        dependencies={
            "preview_section_status": _preview_section_status,
            "showcase_preview_status": _showcase_preview_status,
            "material_preview_status": _material_preview_status,
            "document_preview_objective": _document_preview_objective,
            "label_catalogo": admin_services._label_catalogo,
            "document_preview_status_labels": admin_services._CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS,
            "catalogo_modelo_label": admin_services._catalogo_modelo_label,
        },
    )


def _build_catalog_home_document_preview(
    *,
    family: FamiliaLaudoCatalogo,
    row: dict[str, Any],
    metodos_catalogo: list[Any],
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_build_home_document_preview(
        family=family,
        row=row,
        metodos_catalogo=metodos_catalogo,
        dependencies={
            "catalog_family_artifact_snapshot": _catalog_family_artifact_snapshot,
            "build_material_real_workspace_summary": _build_material_real_workspace_summary,
            "carregar_family_schema_canonico": admin_services.carregar_family_schema_canonico,
            "label_catalogo": admin_services._label_catalogo,
            "calibration_status_labels": admin_services._CATALOGO_CALIBRATION_STATUS_LABELS,
            "calibracao_status_resolvido": admin_services._calibracao_status_resolvido,
            "build_document_preview_summary": _build_document_preview_summary,
        },
    )


def _enrich_catalog_rows_with_document_preview(
    *,
    rows: list[dict[str, Any]],
    families: list[FamiliaLaudoCatalogo],
    metodos_catalogo: list[Any],
) -> list[dict[str, Any]]:
    return _admin_catalog_enrich_rows_with_document_preview(
        rows=rows,
        families=families,
        metodos_catalogo=metodos_catalogo,
        dependencies={
            "build_catalog_home_document_preview": _build_catalog_home_document_preview,
        },
    )


def _build_variant_library_summary(
    *,
    family_key: str,
    offer: dict[str, Any] | None,
    artifact_snapshot: dict[str, bool],
    active_release_count: int,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_build_variant_library_summary(
        family_key=family_key,
        offer=offer,
        artifact_snapshot=artifact_snapshot,
        active_release_count=active_release_count,
        dependencies={
            "catalogo_modelo_label": admin_services._catalogo_modelo_label,
            "label_catalogo": admin_services._label_catalogo,
            "variant_library_status_labels": admin_services._CATALOGO_VARIANT_LIBRARY_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _build_template_refinement_target(
    *,
    family_key: str,
    display_name: str,
    material_real_priority: dict[str, Any],
    variant_library: dict[str, Any],
    template_default_code: str | None,
    active_release_count: int,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_catalog_build_template_refinement_target(
        family_key=family_key,
        display_name=display_name,
        material_real_priority=material_real_priority,
        variant_library=variant_library,
        template_default_code=template_default_code,
        active_release_count=active_release_count,
        dependencies={
            "resolve_master_template_id_for_family": admin_services.resolve_master_template_id_for_family,
            "master_template_registry": admin_services.MASTER_TEMPLATE_REGISTRY,
            "template_library_registry_index": _template_library_registry_index,
            "catalogo_modelo_label": admin_services._catalogo_modelo_label,
            "label_catalogo": admin_services._label_catalogo,
            "template_refinement_status_labels": admin_services._CATALOGO_TEMPLATE_REFINEMENT_STATUS_LABELS,
            "humanizar_slug": admin_services._humanizar_slug,
        },
    )


def _serializar_familia_catalogo_row(
    familia: FamiliaLaudoCatalogo,
    *,
    artifact_snapshot: dict[str, bool] | None = None,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    oferta = getattr(familia, "oferta_comercial", None)
    commercial_governance = admin_services.summarize_offer_commercial_governance(
        getattr(oferta, "flags_json", None) if oferta is not None else None,
        offer_lifecycle_status=admin_services._offer_lifecycle_resolvido(oferta),
    )
    technical_status = (
        str(getattr(familia, "technical_status", "") or "").strip().lower()
        or admin_services._normalizar_status_tecnico_catalogo(
            str(getattr(familia, "status_catalogo", "") or "")
        )
    )
    lifecycle_status = admin_services._offer_lifecycle_resolvido(oferta)
    calibration_status = admin_services._calibracao_status_resolvido(familia, oferta)
    snapshots = artifact_snapshot or _catalog_family_artifact_snapshot(str(familia.family_key))
    active_release_count = admin_services._total_releases_ativas_familia(familia)
    readiness = admin_services.derivar_prontidao_catalogo(
        technical_status=technical_status,
        has_template_seed=bool(snapshots["has_template_seed"]),
        has_laudo_output_seed=bool(snapshots["has_laudo_output_seed"]),
        offer_lifecycle_status=lifecycle_status,
        calibration_status=calibration_status,
        active_release_count=active_release_count,
    )
    technical = admin_services._label_catalogo(
        admin_services._CATALOGO_TECHNICAL_STATUS_LABELS,
        technical_status,
        technical_status or "N/D",
    )
    commercial = (
        admin_services._label_catalogo(
            admin_services._CATALOGO_LIFECYCLE_STATUS_LABELS,
            lifecycle_status,
            lifecycle_status or "Sem oferta",
        )
        if lifecycle_status
        else {"key": "none", "label": "Sem oferta", "tone": "idle"}
    )
    calibration = admin_services._label_catalogo(
        admin_services._CATALOGO_CALIBRATION_STATUS_LABELS,
        calibration_status,
        calibration_status or "Sem leitura",
    )
    readiness_meta = admin_services._label_catalogo(
        admin_services._CATALOGO_READINESS_LABELS,
        readiness,
        readiness,
    )
    modes = list(getattr(familia, "modos_tecnicos", None) or [])
    variants = admin_services.catalog_offer_variants(familia, oferta)
    classification = str(getattr(familia, "catalog_classification", "") or "").strip().lower() or "family"
    return {
        "family_id": int(familia.id),
        "family_key": str(familia.family_key),
        "display_name": str(familia.nome_exibicao),
        "macro_category": str(getattr(familia, "macro_categoria", "") or "").strip() or "Sem macro categoria",
        "nr_key": str(getattr(familia, "nr_key", "") or "").strip() or None,
        "catalog_classification": classification,
        "classification_label": {
            "family": "Família",
            "inspection_method": "Método de inspeção",
            "evidence_method": "Método de evidência",
        }.get(classification, "Família"),
        "technical_status": technical,
        "commercial_status": commercial,
        "calibration_status": calibration,
        "readiness": readiness_meta,
        "offer_name": str(getattr(oferta, "nome_oferta", "") or "").strip() or None,
        "offer_key": str(getattr(oferta, "offer_key", "") or "").strip() or None,
        "offer_package": str(getattr(oferta, "pacote_comercial", "") or "").strip() or None,
        "release_channel": commercial_governance["release_channel"],
        "commercial_bundle": commercial_governance["commercial_bundle"],
        "contract_entitlements": commercial_governance["contract_entitlements"],
        "plan_distribution": admin_services._catalog_plan_distribution_summary(familia),
        "template_default_code": str(getattr(oferta, "template_default_code", "") or "").strip() or None,
        "offer_showcase_enabled": bool(getattr(oferta, "showcase_enabled", False))
        if oferta is not None
        else False,
        "active_release_count": int(active_release_count),
        "mode_count": len(modes),
        "variant_count": len(variants),
        "modes": [
            {
                "mode_key": str(item.mode_key),
                "display_name": str(item.nome_exibicao),
                "active": bool(item.ativo),
            }
            for item in modes
        ],
        "artifact_snapshot": snapshots,
    }


__all__ = [
    "_build_document_preview_summary",
    "_build_material_real_priority_summary",
    "_build_material_real_workspace_summary",
    "_build_template_library_rollup",
    "_build_template_refinement_target",
    "_build_variant_library_summary",
    "_catalog_family_artifact_snapshot",
    "_enrich_catalog_rows_with_document_preview",
    "_serializar_familia_catalogo_row",
    "_template_library_registry_index",
]
