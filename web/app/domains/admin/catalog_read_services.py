from __future__ import annotations

from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload


def listar_metodos_catalogo(
    db: Session,
    *,
    metodo_model: Any,
) -> list[Any]:
    stmt = select(metodo_model).order_by(
        metodo_model.categoria.asc(),
        metodo_model.nome_exibicao.asc(),
    )
    return list(db.scalars(stmt).all())


def resumir_catalogo_laudos_admin(
    db: Session,
    *,
    filtro_busca: str = "",
    filtro_macro_categoria: str = "",
    filtro_status_tecnico: str = "",
    filtro_prontidao: str = "",
    filtro_status_comercial: str = "",
    filtro_calibracao: str = "",
    filtro_liberacao: str = "",
    filtro_template_default: str = "",
    filtro_oferta_ativa: str = "",
    filtro_mode: str = "",
    listar_catalogo_familias: Callable[..., list[Any]],
    listar_ofertas_comerciais_catalogo: Callable[..., list[Any]],
    listar_metodos_catalogo_fn: Callable[[Session], list[Any]],
    listar_family_schemas_canonicos: Callable[[], list[dict[str, Any]]],
    serializar_familia_catalogo_row: Callable[[Any], dict[str, Any]],
    catalog_row_matches_filters: Callable[..., bool],
    enrich_catalog_rows_with_document_preview: Callable[..., list[dict[str, Any]]],
    offer_lifecycle_resolvido: Callable[[Any], str | None],
    build_template_library_rollup: Callable[[list[dict[str, Any]]], dict[str, Any]],
    build_material_real_rollup: Callable[[list[dict[str, Any]]], dict[str, Any]],
    build_commercial_scale_rollup: Callable[[list[dict[str, Any]]], dict[str, Any]],
    build_calibration_queue_rollup: Callable[[list[dict[str, Any]]], dict[str, Any]],
    catalog_macro_category_sort_key: Callable[[str], Any],
    build_catalog_governance_rollup: Callable[..., dict[str, Any]],
) -> dict[str, Any]:
    familias = listar_catalogo_familias(
        db,
        filtro_busca=filtro_busca,
        filtro_classificacao="family",
    )
    ofertas_comerciais = listar_ofertas_comerciais_catalogo(db)
    metodos_catalogo = listar_metodos_catalogo_fn(db)
    familias_canonicas = listar_family_schemas_canonicos()
    rows_all = [serializar_familia_catalogo_row(item) for item in familias]
    rows = [
        item
        for item in rows_all
        if catalog_row_matches_filters(
            item,
            filtro_macro_categoria=filtro_macro_categoria,
            filtro_status_tecnico=filtro_status_tecnico,
            filtro_prontidao=filtro_prontidao,
            filtro_status_comercial=filtro_status_comercial,
            filtro_calibracao=filtro_calibracao,
            filtro_liberacao=filtro_liberacao,
            filtro_template_default=filtro_template_default,
            filtro_oferta_ativa=filtro_oferta_ativa,
            filtro_mode=filtro_mode,
        )
    ]
    family_keys_no_recorte = {
        str(item["family_key"]).strip().lower()
        for item in rows
        if str(item.get("family_key") or "").strip()
    }
    familias_no_recorte = [
        item
        for item in familias
        if str(getattr(item, "family_key", "") or "").strip().lower()
        in family_keys_no_recorte
    ]
    rows = enrich_catalog_rows_with_document_preview(
        rows=rows,
        families=familias_no_recorte,
        metodos_catalogo=metodos_catalogo,
    )
    total_publicadas = sum(
        1 for item in rows_all if item["technical_status"]["key"] == "ready"
    )
    total_rascunho = sum(
        1 for item in rows_all if item["technical_status"]["key"] == "draft"
    )
    total_arquivadas = sum(
        1 for item in rows_all if item["technical_status"]["key"] == "deprecated"
    )
    total_ofertas_comerciais = len(ofertas_comerciais)
    total_ofertas_ativas = sum(
        1 for item in ofertas_comerciais if offer_lifecycle_resolvido(item) == "active"
    )
    total_familias_calibradas = sum(
        1 for item in rows_all if item["calibration_status"]["key"] == "real_calibrated"
    )
    total_variantes_comerciais = sum(int(item["variant_count"]) for item in rows_all)
    template_library_rollup = build_template_library_rollup(rows_all)
    material_real_rollup = build_material_real_rollup(rows_all)
    commercial_scale_rollup = build_commercial_scale_rollup(rows_all)
    calibration_queue_rollup = build_calibration_queue_rollup(rows_all)
    material_real_priority_rollup = {
        "priority_modes": material_real_rollup.get("priority_modes", []),
        "highlights": material_real_rollup.get("priority_highlights", []),
    }
    macro_categorias = sorted(
        {
            str(item["macro_category"] or "").strip()
            for item in rows_all
            if str(item["macro_category"] or "").strip()
        },
        key=catalog_macro_category_sort_key,
    )
    template_defaults = sorted(
        {
            str(item.get("template_default_code") or "").strip()
            for item in rows_all
            if str(item.get("template_default_code") or "").strip()
        }
    )
    return {
        "familias": familias,
        "catalog_rows": rows,
        "catalog_rows_total": len(rows_all),
        "ofertas_comerciais": ofertas_comerciais,
        "metodos_catalogo": metodos_catalogo,
        "familias_canonicas": familias_canonicas,
        "macro_categorias": macro_categorias,
        "template_default_options": template_defaults,
        "governance_rollup": build_catalog_governance_rollup(
            db,
            families=familias_no_recorte,
        ),
        "template_library_rollup": template_library_rollup,
        "material_real_rollup": material_real_rollup,
        "commercial_scale_rollup": commercial_scale_rollup,
        "material_real_priority_rollup": material_real_priority_rollup,
        "calibration_queue_rollup": calibration_queue_rollup,
        "total_familias": len(rows_all),
        "total_publicadas": int(total_publicadas),
        "total_rascunho": int(total_rascunho),
        "total_arquivadas": int(total_arquivadas),
        "total_ofertas_comerciais": int(total_ofertas_comerciais),
        "total_ofertas_ativas": int(total_ofertas_ativas),
        "total_familias_calibradas": int(total_familias_calibradas),
        "total_variantes_comerciais": int(total_variantes_comerciais),
        "total_familias_canonicas": len(familias_canonicas),
        "total_metodos_catalogados": len(metodos_catalogo),
        "filtros": {
            "busca": filtro_busca,
            "macro_categoria": filtro_macro_categoria,
            "status_tecnico": filtro_status_tecnico,
            "prontidao": filtro_prontidao,
            "status_comercial": filtro_status_comercial,
            "calibracao": filtro_calibracao,
            "liberacao": filtro_liberacao,
            "template_default": filtro_template_default,
            "oferta_ativa": filtro_oferta_ativa,
            "mode": filtro_mode,
        },
    }


def buscar_catalogo_familia_admin(
    db: Session,
    family_key: str,
    *,
    familia_model: Any,
    oferta_model: Any,
    modo_tecnico_model: Any,
    calibracao_model: Any,
    tenant_release_model: Any,
    empresa_model: Any,
    normalizar_chave_catalogo: Callable[..., str],
    offer_lifecycle_resolvido: Callable[[Any], str | None],
    dict_payload_admin: Callable[[Any], dict[str, Any]],
    summarize_offer_commercial_governance: Callable[..., dict[str, Any]],
    carregar_family_schema_canonico: Callable[[str], dict[str, Any]],
    catalog_family_artifact_snapshot: Callable[[str], dict[str, bool]],
    serializar_familia_catalogo_row: Callable[..., dict[str, Any]],
    build_template_library_rollup: Callable[[list[dict[str, Any]]], dict[str, Any]],
    build_material_real_workspace_summary: Callable[[str], dict[str, Any]],
    catalog_offer_variants: Callable[[Any, Any], list[dict[str, Any]]],
    listar_metodos_catalogo_fn: Callable[[Session], list[Any]],
    build_document_preview_summary: Callable[..., dict[str, Any]],
    build_variant_library_summary: Callable[..., dict[str, Any]],
    build_material_real_priority_summary: Callable[..., dict[str, Any]],
    build_template_refinement_target: Callable[..., dict[str, Any]],
    serializar_release_catalogo_familia: Callable[..., dict[str, Any]],
    historico_catalogo_familia: Callable[..., list[dict[str, Any]]],
    resumir_governanca_review_policy: Callable[[Any], dict[str, Any]],
    label_catalogo: Callable[[dict[str, str], str, str], str],
    lifecycle_status_labels: dict[str, str],
    calibration_status_labels: dict[str, str],
    calibracao_status_resolvido: Callable[[Any, Any], str],
    catalogo_texto_leitura: Callable[..., str],
    catalogo_actor_label: Callable[..., str],
    catalogo_modelo_label: Callable[..., str],
    formatar_data_admin: Callable[..., str],
    normalizar_datetime_admin: Callable[[Any], Any],
) -> dict[str, Any] | None:
    family_key_norm = normalizar_chave_catalogo(family_key, campo="Family key", max_len=120)
    familia = db.scalar(
        select(familia_model)
        .options(
            selectinload(familia_model.criado_por),
            selectinload(familia_model.oferta_comercial).selectinload(oferta_model.criado_por),
            selectinload(familia_model.modos_tecnicos).selectinload(modo_tecnico_model.criado_por),
            selectinload(familia_model.calibracao).selectinload(calibracao_model.criado_por),
            selectinload(familia_model.tenant_releases).selectinload(tenant_release_model.criado_por),
        )
        .where(familia_model.family_key == family_key_norm)
    )
    if familia is None:
        return None

    oferta = getattr(familia, "oferta_comercial", None)
    offer_governance = (
        dict_payload_admin(
            summarize_offer_commercial_governance(
                getattr(oferta, "flags_json", None),
                offer_lifecycle_status=offer_lifecycle_resolvido(oferta),
            )
        )
        if oferta is not None
        else {}
    )
    releases = list(
        db.scalars(
            select(tenant_release_model)
            .options(selectinload(tenant_release_model.criado_por))
            .where(tenant_release_model.family_id == familia.id)
            .order_by(tenant_release_model.tenant_id.asc())
        ).all()
    )
    empresas = list(
        db.scalars(
            select(empresa_model)
            .where(empresa_model.escopo_plataforma.is_(False))
            .order_by(empresa_model.nome_fantasia.asc())
        ).all()
    )
    empresa_lookup = {int(item.id): item for item in empresas}
    artifact_snapshot = catalog_family_artifact_snapshot(str(familia.family_key))
    row = serializar_familia_catalogo_row(familia, artifact_snapshot=artifact_snapshot)
    template_library_rollup = build_template_library_rollup([row])
    material_real_workspace = build_material_real_workspace_summary(str(familia.family_key))
    try:
        family_schema = carregar_family_schema_canonico(str(familia.family_key))
    except ValueError:
        family_schema = None

    variantes = catalog_offer_variants(familia, oferta)
    available_variant_tokens = [
        f"catalog:{str(familia.family_key).strip().lower()}:{str(item.get('variant_key') or '').strip().lower()}"
        for item in variantes
        if str(item.get("variant_key") or "").strip()
    ]
    family_methods = [
        {
            "method_key": str(item.method_key),
            "display_name": str(item.nome_exibicao),
            "categoria": str(item.categoria),
        }
        for item in listar_metodos_catalogo_fn(db)
        if str(getattr(item, "method_key", "") or "").strip() in str(familia.family_key)
    ]
    calibration_payload = {
        "status": label_catalogo(
            calibration_status_labels,
            calibracao_status_resolvido(familia, oferta),
            "Sem calibração",
        ),
        "reference_source": str(getattr(getattr(familia, "calibracao", None), "reference_source", "") or "").strip() or None,
        "reference_source_label": catalogo_texto_leitura(
            str(getattr(getattr(familia, "calibracao", None), "reference_source", "") or "").strip() or None,
            fallback="Sem fonte de referência",
        ),
        "summary": str(getattr(getattr(familia, "calibracao", None), "summary_of_adjustments", "") or "").strip() or None,
        "changed_language_notes": str(getattr(getattr(familia, "calibracao", None), "changed_language_notes", "") or "").strip() or None,
        "changed_fields": list(getattr(getattr(familia, "calibracao", None), "changed_fields_json", None) or []),
        "attachments": [
            {
                "label": str(item.get("label") or item.get("name") or item.get("path") or "Anexo de calibração").strip(),
                "path": str(item.get("path") or "").strip() or None,
            }
            for item in list(getattr(getattr(familia, "calibracao", None), "attachments_json", None) or [])
            if isinstance(item, dict)
        ],
        "last_calibrated_at_label": formatar_data_admin(
            normalizar_datetime_admin(getattr(getattr(familia, "calibracao", None), "last_calibrated_at", None))
        ),
        "actor_label": catalogo_actor_label(getattr(getattr(familia, "calibracao", None), "criado_por", None)),
    }
    document_preview = build_document_preview_summary(
        row=row,
        artifact_snapshot=artifact_snapshot,
        family_schema=family_schema,
        offer=(
            {
                "offer_name": str(getattr(oferta, "nome_oferta", "") or "").strip() or str(familia.nome_exibicao),
                "description": str(getattr(oferta, "descricao_comercial", "") or "").strip() or None,
                "template_default_code": str(getattr(oferta, "template_default_code", "") or "").strip() or None,
            }
            if oferta is not None
            else None
        ),
        calibration=calibration_payload,
        material_real_workspace=material_real_workspace,
        family_methods=family_methods,
    )
    variant_library = build_variant_library_summary(
        family_key=str(familia.family_key),
        offer={
            "variants": variantes,
            "offer_name": str(getattr(oferta, "nome_oferta", "") or "").strip() or None,
        }
        if oferta is not None
        else None,
        artifact_snapshot=artifact_snapshot,
        active_release_count=int(row.get("active_release_count") or 0),
    )
    material_real_priority = build_material_real_priority_summary(row, material_real_workspace)
    template_refinement_target = build_template_refinement_target(
        family_key=str(familia.family_key),
        display_name=str(row.get("display_name") or familia.family_key),
        material_real_priority=material_real_priority,
        variant_library=variant_library,
        template_default_code=str(row.get("template_default_code") or "").strip() or None,
        active_release_count=int(row.get("active_release_count") or 0),
    )
    return {
        "family": row,
        "family_entity": familia,
        "review_governance": resumir_governanca_review_policy(
            getattr(familia, "review_policy_json", None)
        ),
        "family_schema": family_schema,
        "artifact_snapshot": artifact_snapshot,
        "template_library": {
            "registry_path": template_library_rollup.get("registry_path"),
            "registry_templates": template_library_rollup.get("templates", []),
            "has_full_canonical_artifact_chain": all(
                bool(artifact_snapshot.get(key))
                for key in (
                    "has_family_schema",
                    "has_template_seed",
                    "has_laudo_output_seed",
                    "has_laudo_output_exemplo",
                )
            ),
            "missing_artifacts": [
                label
                for key, label in (
                    ("has_family_schema", "Estrutura da família"),
                    ("has_template_seed", "Modelo base"),
                    ("has_laudo_output_seed", "Documento base"),
                    ("has_laudo_output_exemplo", "Exemplo do documento"),
                )
                if not bool(artifact_snapshot.get(key))
            ],
            "template_default_code": row.get("template_default_code"),
            "template_default_label": catalogo_modelo_label(
                str(row.get("template_default_code") or "").strip() or None
            ),
        },
        "material_real_workspace": material_real_workspace,
        "technical_modes": [
            {
                "id": int(item.id),
                "mode_key": str(item.mode_key),
                "display_name": str(item.nome_exibicao),
                "description": str(getattr(item, "descricao", "") or "").strip() or None,
                "active": bool(item.ativo),
                "actor_label": catalogo_actor_label(getattr(item, "criado_por", None)),
                "updated_at_label": formatar_data_admin(
                    normalizar_datetime_admin(
                        getattr(item, "atualizado_em", None) or getattr(item, "criado_em", None)
                    )
                ),
            }
            for item in list(getattr(familia, "modos_tecnicos", None) or [])
        ],
        "offer": (
            {
                "id": int(oferta.id),
                "offer_key": str(getattr(oferta, "offer_key", "") or "").strip() or str(familia.family_key),
                "offer_name": str(getattr(oferta, "nome_oferta", "") or "").strip() or str(familia.nome_exibicao),
                "package_name": str(getattr(oferta, "pacote_comercial", "") or "").strip() or None,
                "description": str(getattr(oferta, "descricao_comercial", "") or "").strip() or None,
                "release_channel": offer_governance["release_channel"],
                "commercial_bundle": offer_governance["commercial_bundle"],
                "contract_entitlements": offer_governance["contract_entitlements"],
                "lifecycle_status": label_catalogo(
                    lifecycle_status_labels,
                    offer_lifecycle_resolvido(oferta) or "draft",
                    "Draft",
                ),
                "material_level": label_catalogo(
                    calibration_status_labels,
                    calibracao_status_resolvido(familia, oferta),
                    "Sem calibração",
                ),
                "showcase_enabled": bool(getattr(oferta, "showcase_enabled", False)),
                "template_default_code": str(getattr(oferta, "template_default_code", "") or "").strip() or None,
                "template_display_name": catalogo_modelo_label(
                    str(getattr(oferta, "template_default_code", "") or "").strip() or None,
                    fallback="Modelo principal em definição",
                ),
                "scope_items": list(getattr(oferta, "escopo_json", None) or []),
                "exclusion_items": list(getattr(oferta, "exclusoes_json", None) or []),
                "minimum_inputs": list(getattr(oferta, "insumos_minimos_json", None) or []),
                "variants": variantes,
                "actor_label": catalogo_actor_label(getattr(oferta, "criado_por", None)),
                "updated_at_label": formatar_data_admin(
                    normalizar_datetime_admin(
                        getattr(oferta, "atualizado_em", None) or getattr(oferta, "criado_em", None)
                    )
                ),
            }
            if oferta is not None
            else None
        ),
        "calibration": calibration_payload,
        "material_real_priority": material_real_priority,
        "document_preview": document_preview,
        "variant_library": variant_library,
        "template_refinement_target": template_refinement_target,
        "tenant_releases": [
            serializar_release_catalogo_familia(
                item,
                empresa_lookup=empresa_lookup,
                oferta=oferta,
            )
            for item in releases
        ],
        "tenants": [
            {
                "id": int(item.id),
                "label": str(item.nome_fantasia),
            }
            for item in empresas
        ],
        "available_variant_tokens": available_variant_tokens,
        "family_methods": family_methods,
        "available_methods": [
            {
                "method_key": str(item.method_key),
                "display_name": str(item.nome_exibicao),
                "categoria": str(item.categoria),
            }
            for item in listar_metodos_catalogo_fn(db)
        ],
        "history": historico_catalogo_familia(familia, tenant_releases=releases),
    }
