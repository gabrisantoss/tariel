from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.domains.admin.admin_catalog_application_services import (
    resumir_catalogo_laudos_admin as _catalog_app_resumir_catalogo_laudos_admin,
)
from app.domains.admin.admin_catalog_summary_services import (
    catalog_row_matches_filters as _admin_catalog_summary_row_matches,
)
from app.domains.admin.catalog_read_services import (
    listar_metodos_catalogo as _catalog_read_listar_metodos_catalogo,
    resumir_catalogo_laudos_admin as _catalog_read_resumir_catalogo_laudos_admin,
)
from app.shared.database import FamiliaLaudoCatalogo, MetodoCatalogoInspecao


def upsert_governanca_review_familia(
    db: Session,
    *,
    family_key: str,
    default_review_mode: str = "",
    max_review_mode: str = "",
    requires_family_lock: bool = False,
    block_on_scope_mismatch: bool = False,
    block_on_missing_required_evidence: bool = False,
    block_on_critical_field_absent: bool = False,
    blocking_conditions_text: str = "",
    non_blocking_conditions_text: str = "",
    red_flags_json_text: str = "",
    requires_release_active: bool = False,
    requires_upload_doc_for_mobile_autonomous: bool = False,
    mobile_review_allowed_plans_text: str = "",
    mobile_autonomous_allowed_plans_text: str = "",
    criado_por_id: int | None = None,
) -> FamiliaLaudoCatalogo:
    from app.domains.admin import services as admin_services

    familia = admin_services._buscar_familia_catalogo_por_chave(db, family_key)
    review_policy = admin_services._merge_review_policy_governance(
        dict(getattr(familia, "review_policy_json", None) or {})
        if isinstance(getattr(familia, "review_policy_json", None), dict)
        else {},
        default_review_mode=admin_services._normalizar_review_mode_governanca(
            default_review_mode,
            campo="Modo padrão de revisão",
        ),
        max_review_mode=admin_services._normalizar_review_mode_governanca(
            max_review_mode,
            campo="Modo máximo de revisão",
        ),
        requires_family_lock=bool(requires_family_lock),
        block_on_scope_mismatch=bool(block_on_scope_mismatch),
        block_on_missing_required_evidence=bool(block_on_missing_required_evidence),
        block_on_critical_field_absent=bool(block_on_critical_field_absent),
        blocking_conditions=admin_services._normalizar_lista_textual(
            blocking_conditions_text,
            campo="Condições bloqueantes",
        ),
        non_blocking_conditions=admin_services._normalizar_lista_textual(
            non_blocking_conditions_text,
            campo="Condições não bloqueantes",
        ),
        red_flags=admin_services._normalizar_red_flags_governanca(red_flags_json_text),
        requires_release_active=bool(requires_release_active),
        requires_upload_doc_for_mobile_autonomous=bool(
            requires_upload_doc_for_mobile_autonomous
        ),
        mobile_review_allowed_plans=admin_services._normalizar_planos_governanca(
            mobile_review_allowed_plans_text,
            campo="Planos com revisão mobile",
        ),
        mobile_autonomous_allowed_plans=admin_services._normalizar_planos_governanca(
            mobile_autonomous_allowed_plans_text,
            campo="Planos com autonomia mobile",
        ),
    )
    familia.review_policy_json = review_policy
    if criado_por_id and not familia.criado_por_id:
        familia.criado_por_id = criado_por_id

    admin_services.flush_ou_rollback_integridade(
        db,
        logger_operacao=admin_services.logger,
        mensagem_erro="Não foi possível salvar a governança de revisão da família.",
    )
    return familia


def _catalog_row_matches_filters(
    row: dict[str, Any],
    *,
    filtro_macro_categoria: str = "",
    filtro_status_tecnico: str = "",
    filtro_prontidao: str = "",
    filtro_status_comercial: str = "",
    filtro_calibracao: str = "",
    filtro_liberacao: str = "",
    filtro_template_default: str = "",
    filtro_oferta_ativa: str = "",
    filtro_mode: str = "",
) -> bool:
    from app.domains.admin import services as admin_services

    return _admin_catalog_summary_row_matches(
        row,
        filtro_macro_categoria=filtro_macro_categoria,
        filtro_status_tecnico=filtro_status_tecnico,
        filtro_prontidao=filtro_prontidao,
        filtro_status_comercial=filtro_status_comercial,
        filtro_calibracao=filtro_calibracao,
        filtro_liberacao=filtro_liberacao,
        filtro_template_default=filtro_template_default,
        filtro_oferta_ativa=filtro_oferta_ativa,
        filtro_mode=filtro_mode,
        dependencies={
            "normalizar_status_tecnico_catalogo": admin_services._normalizar_status_tecnico_catalogo,
            "normalizar_lifecycle_status_oferta": admin_services._normalizar_lifecycle_status_oferta,
            "normalizar_status_calibracao_catalogo": admin_services._normalizar_status_calibracao_catalogo,
        },
    )


def listar_metodos_catalogo(db: Session) -> list[MetodoCatalogoInspecao]:
    return _catalog_read_listar_metodos_catalogo(
        db,
        metodo_model=MetodoCatalogoInspecao,
    )


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
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _catalog_app_resumir_catalogo_laudos_admin(
        db,
        filtro_busca=filtro_busca,
        filtro_macro_categoria=filtro_macro_categoria,
        filtro_status_tecnico=filtro_status_tecnico,
        filtro_prontidao=filtro_prontidao,
        filtro_status_comercial=filtro_status_comercial,
        filtro_calibracao=filtro_calibracao,
        filtro_liberacao=filtro_liberacao,
        filtro_template_default=filtro_template_default,
        filtro_oferta_ativa=filtro_oferta_ativa,
        filtro_mode=filtro_mode,
        dependencies={
            "catalog_read_resumir_catalogo_laudos_admin": _catalog_read_resumir_catalogo_laudos_admin,
            "listar_catalogo_familias": admin_services.listar_catalogo_familias,
            "listar_ofertas_comerciais_catalogo": admin_services.listar_ofertas_comerciais_catalogo,
            "listar_metodos_catalogo_fn": listar_metodos_catalogo,
            "listar_family_schemas_canonicos": admin_services.listar_family_schemas_canonicos,
            "serializar_familia_catalogo_row": admin_services._serializar_familia_catalogo_row,
            "catalog_row_matches_filters": _catalog_row_matches_filters,
            "enrich_catalog_rows_with_document_preview": admin_services._enrich_catalog_rows_with_document_preview,
            "offer_lifecycle_resolvido": admin_services._offer_lifecycle_resolvido,
            "build_template_library_rollup": admin_services._build_template_library_rollup,
            "build_material_real_rollup": admin_services._build_material_real_rollup,
            "build_commercial_scale_rollup": admin_services._build_commercial_scale_rollup,
            "build_calibration_queue_rollup": admin_services._build_calibration_queue_rollup,
            "catalog_macro_category_sort_key": admin_services._catalog_macro_category_sort_key,
            "build_catalog_governance_rollup": admin_services._build_catalog_governance_rollup,
        },
    )


__all__ = [
    "listar_metodos_catalogo",
    "resumir_catalogo_laudos_admin",
    "upsert_governanca_review_familia",
]
