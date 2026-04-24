from __future__ import annotations

from datetime import datetime
from typing import Any, cast

from sqlalchemy.orm import Session

from app.domains.admin.admin_catalog_application_services import (
    buscar_catalogo_familia_admin as _catalog_app_buscar_catalogo_familia_admin,
    resumir_portfolio_catalogo_empresa as _catalog_app_resumir_portfolio_catalogo_empresa,
    sincronizar_portfolio_catalogo_empresa as _catalog_app_sincronizar_portfolio_catalogo_empresa,
    upsert_tenant_family_release as _catalog_app_upsert_tenant_family_release,
)
from app.domains.admin.admin_signatory_services import (
    normalizar_family_keys_signatario as _admin_signatory_normalizar_family_keys,
    normalizar_validade_signatario as _admin_signatory_normalizar_validade,
    serializar_signatario_governado_admin as _admin_signatory_serializar,
    status_signatario_governado as _admin_signatory_status,
    upsert_signatario_governado_laudo as _admin_signatory_upsert,
)
from app.domains.admin.catalog_read_services import (
    buscar_catalogo_familia_admin as _catalog_read_buscar_catalogo_familia_admin,
)
from app.domains.admin.catalog_tenant_management_services import (
    catalogo_actor_label as _catalog_tenant_actor_label,
    historico_catalogo_familia as _catalog_tenant_historico_familia,
    normalizar_family_keys_signatario as _catalog_tenant_normalizar_family_keys_signatario,
    normalizar_validade_signatario as _catalog_tenant_normalizar_validade_signatario,
    resumir_portfolio_catalogo_empresa as _catalog_tenant_resumir_portfolio,
    serializar_release_catalogo_familia as _catalog_tenant_serializar_release,
    serializar_signatario_governado_admin as _catalog_tenant_serializar_signatario,
    sincronizar_portfolio_catalogo_empresa as _catalog_tenant_sincronizar_portfolio,
    status_signatario_governado as _catalog_tenant_status_signatario,
    upsert_signatario_governado_laudo as _catalog_tenant_upsert_signatario,
    upsert_tenant_family_release as _catalog_tenant_upsert_release,
)
from app.domains.admin.tenant_user_services import _buscar_empresa
from app.shared.database import (
    CalibracaoFamiliaLaudo,
    Empresa,
    FamiliaLaudoCatalogo,
    ModoTecnicoFamiliaLaudo,
    OfertaComercialFamiliaLaudo,
    SignatarioGovernadoLaudo,
    TenantFamilyReleaseLaudo,
)
from app.shared.tenant_report_catalog import (
    build_admin_tenant_catalog_snapshot,
    list_active_tenant_catalog_activations,
    sync_tenant_catalog_activations,
)


def _catalogo_actor_label(actor, *, fallback: str = "Sistema Tariel") -> str:
    return _catalog_tenant_actor_label(actor, fallback=fallback)


def _serializar_release_catalogo_familia(
    item: TenantFamilyReleaseLaudo,
    *,
    empresa_lookup: dict[int, Any],
    oferta=None,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _catalog_tenant_serializar_release(
        item,
        empresa_lookup=empresa_lookup,
        oferta=oferta,
        summarize_release_contract_governance=admin_services.summarize_release_contract_governance,
        offer_lifecycle_resolvido=admin_services._offer_lifecycle_resolvido,
        label_catalogo=cast(Any, admin_services._label_catalogo),
        release_status_labels=cast(Any, admin_services._CATALOGO_RELEASE_STATUS_LABELS),
        catalogo_modelo_label=cast(Any, admin_services._catalogo_modelo_label),
        normalizar_datetime_admin=admin_services._normalizar_datetime_admin,
        formatar_data_admin=admin_services._formatar_data_admin,
        resumir_governanca_release_policy=admin_services._resumir_governanca_release_policy,
        catalogo_scope_summary_label=admin_services._catalogo_scope_summary_label,
    )


def _historico_catalogo_familia(
    familia: FamiliaLaudoCatalogo,
    *,
    tenant_releases: list[TenantFamilyReleaseLaudo],
) -> list[dict[str, Any]]:
    from app.domains.admin import services as admin_services

    return _catalog_tenant_historico_familia(
        familia,
        tenant_releases=tenant_releases,
        normalizar_datetime_admin=admin_services._normalizar_datetime_admin,
        formatar_data_admin=admin_services._formatar_data_admin,
        catalog_offer_variants=admin_services.catalog_offer_variants,
        offer_lifecycle_resolvido=admin_services._offer_lifecycle_resolvido,
        catalogo_modelo_label=cast(Any, admin_services._catalogo_modelo_label),
        catalogo_texto_leitura=cast(Any, admin_services._catalogo_texto_leitura),
    )


def buscar_catalogo_familia_admin(db: Session, family_key: str) -> dict[str, Any] | None:
    from app.domains.admin import services as admin_services

    return _catalog_app_buscar_catalogo_familia_admin(
        db,
        family_key,
        dependencies={
            "catalog_read_buscar_catalogo_familia_admin": _catalog_read_buscar_catalogo_familia_admin,
            "familia_model": FamiliaLaudoCatalogo,
            "oferta_model": OfertaComercialFamiliaLaudo,
            "modo_tecnico_model": ModoTecnicoFamiliaLaudo,
            "calibracao_model": CalibracaoFamiliaLaudo,
            "tenant_release_model": TenantFamilyReleaseLaudo,
            "empresa_model": Empresa,
            "normalizar_chave_catalogo": admin_services._normalizar_chave_catalogo,
            "offer_lifecycle_resolvido": admin_services._offer_lifecycle_resolvido,
            "dict_payload_admin": admin_services._dict_payload_admin,
            "summarize_offer_commercial_governance": admin_services.summarize_offer_commercial_governance,
            "carregar_family_schema_canonico": admin_services.carregar_family_schema_canonico,
            "catalog_family_artifact_snapshot": admin_services._catalog_family_artifact_snapshot,
            "serializar_familia_catalogo_row": admin_services._serializar_familia_catalogo_row,
            "build_template_library_rollup": admin_services._build_template_library_rollup,
            "build_material_real_workspace_summary": admin_services._build_material_real_workspace_summary,
            "catalog_offer_variants": admin_services.catalog_offer_variants,
            "listar_metodos_catalogo_fn": admin_services.listar_metodos_catalogo,
            "build_document_preview_summary": admin_services._build_document_preview_summary,
            "build_variant_library_summary": admin_services._build_variant_library_summary,
            "build_material_real_priority_summary": admin_services._build_material_real_priority_summary,
            "build_template_refinement_target": admin_services._build_template_refinement_target,
            "serializar_release_catalogo_familia": _serializar_release_catalogo_familia,
            "historico_catalogo_familia": _historico_catalogo_familia,
            "resumir_governanca_review_policy": admin_services._resumir_governanca_review_policy,
            "label_catalogo": admin_services._label_catalogo,
            "lifecycle_status_labels": admin_services._CATALOGO_LIFECYCLE_STATUS_LABELS,
            "calibration_status_labels": admin_services._CATALOGO_CALIBRATION_STATUS_LABELS,
            "calibracao_status_resolvido": admin_services._calibracao_status_resolvido,
            "catalogo_texto_leitura": admin_services._catalogo_texto_leitura,
            "catalogo_actor_label": _catalogo_actor_label,
            "catalogo_modelo_label": admin_services._catalogo_modelo_label,
            "formatar_data_admin": admin_services._formatar_data_admin,
            "normalizar_datetime_admin": admin_services._normalizar_datetime_admin,
        },
    )


def upsert_tenant_family_release(
    db: Session,
    *,
    tenant_id: int,
    family_key: str,
    release_status: str,
    allowed_modes: list[str] | tuple[str, ...] | str | None = None,
    allowed_offers: list[str] | tuple[str, ...] | str | None = None,
    allowed_templates: list[str] | tuple[str, ...] | str | None = None,
    allowed_variants: list[str] | tuple[str, ...] | str | None = None,
    force_review_mode: str = "",
    max_review_mode: str = "",
    mobile_review_override: str = "",
    mobile_autonomous_override: str = "",
    release_channel_override: str = "",
    included_features_text: str = "",
    entitlement_monthly_issues: int | str | None = None,
    entitlement_max_admin_clients: int | str | None = None,
    entitlement_max_inspectors: int | str | None = None,
    entitlement_max_reviewers: int | str | None = None,
    entitlement_max_active_variants: int | str | None = None,
    entitlement_max_integrations: int | str | None = None,
    default_template_code: str = "",
    observacoes: str = "",
    criado_por_id: int | None = None,
) -> TenantFamilyReleaseLaudo:
    from app.domains.admin import services as admin_services

    return _catalog_app_upsert_tenant_family_release(
        db,
        tenant_id=tenant_id,
        family_key=family_key,
        release_status=release_status,
        allowed_modes=allowed_modes,
        allowed_offers=allowed_offers,
        allowed_templates=allowed_templates,
        allowed_variants=allowed_variants,
        force_review_mode=force_review_mode,
        max_review_mode=max_review_mode,
        mobile_review_override=mobile_review_override,
        mobile_autonomous_override=mobile_autonomous_override,
        release_channel_override=release_channel_override,
        included_features_text=included_features_text,
        entitlement_monthly_issues=entitlement_monthly_issues,
        entitlement_max_admin_clients=entitlement_max_admin_clients,
        entitlement_max_inspectors=entitlement_max_inspectors,
        entitlement_max_reviewers=entitlement_max_reviewers,
        entitlement_max_active_variants=entitlement_max_active_variants,
        entitlement_max_integrations=entitlement_max_integrations,
        default_template_code=default_template_code,
        observacoes=observacoes,
        criado_por_id=criado_por_id,
        dependencies={
            "catalog_tenant_upsert_release": _catalog_tenant_upsert_release,
            "buscar_empresa": _buscar_empresa,
            "buscar_familia_catalogo_por_chave": admin_services._buscar_familia_catalogo_por_chave,
            "tenant_release_model": admin_services.TenantFamilyReleaseLaudo,
            "normalizar_status_release_catalogo": admin_services._normalizar_status_release_catalogo,
            "normalizar_lista_json_canonica": admin_services._normalizar_lista_json_canonica,
            "normalizar_selection_tokens_catalogo": admin_services._normalizar_selection_tokens_catalogo,
            "merge_release_governance_policy": admin_services._merge_release_governance_policy,
            "normalizar_review_mode_governanca": admin_services._normalizar_review_mode_governanca,
            "normalizar_override_tristate": admin_services._normalizar_override_tristate,
            "normalizar_release_channel_catalogo": admin_services._normalizar_release_channel_catalogo,
            "normalizar_contract_entitlements_payload": admin_services._normalizar_contract_entitlements_payload,
            "normalizar_chave_catalogo": admin_services._normalizar_chave_catalogo,
            "agora_utc": admin_services._agora_utc,
            "normalizar_texto_opcional": admin_services._normalizar_texto_opcional,
            "list_active_tenant_catalog_activations": list_active_tenant_catalog_activations,
            "sync_tenant_catalog_activations": sync_tenant_catalog_activations,
            "flush_ou_rollback_integridade": admin_services.flush_ou_rollback_integridade,
            "logger_operacao": admin_services.logger,
        },
    )


def _normalizar_validade_signatario(valor: str | datetime | None) -> datetime | None:
    from app.domains.admin import services as admin_services

    return _admin_signatory_normalizar_validade(
        valor,
        dependencies={
            "catalog_tenant_normalizar_validade_signatario": _catalog_tenant_normalizar_validade_signatario,
            "normalizar_texto_opcional": admin_services._normalizar_texto_opcional,
        },
    )


def _normalizar_family_keys_signatario(
    family_keys: list[str] | tuple[str, ...] | str | None,
) -> list[str]:
    from app.domains.admin import services as admin_services

    return _admin_signatory_normalizar_family_keys(
        family_keys,
        dependencies={
            "catalog_tenant_normalizar_family_keys_signatario": _catalog_tenant_normalizar_family_keys_signatario,
            "normalizar_lista_json_canonica": admin_services._normalizar_lista_json_canonica,
            "normalizar_chave_catalogo": admin_services._normalizar_chave_catalogo,
        },
    )


def _status_signatario_governado(
    *,
    ativo: bool,
    valid_until: datetime | None,
) -> dict[str, str]:
    from app.domains.admin import services as admin_services

    return _admin_signatory_status(
        ativo=ativo,
        valid_until=valid_until,
        dependencies={
            "catalog_tenant_status_signatario": _catalog_tenant_status_signatario,
            "normalizar_datetime_admin": admin_services._normalizar_datetime_admin,
            "agora_utc": admin_services._agora_utc,
        },
    )


def _serializar_signatario_governado_admin(
    signatario: SignatarioGovernadoLaudo,
    *,
    family_labels: dict[str, str],
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _admin_signatory_serializar(
        signatario,
        family_labels=family_labels,
        dependencies={
            "catalog_tenant_serializar_signatario": _catalog_tenant_serializar_signatario,
            "normalizar_family_keys_signatario_fn": _normalizar_family_keys_signatario,
            "status_signatario_governado_fn": _status_signatario_governado,
            "normalizar_datetime_admin": admin_services._normalizar_datetime_admin,
            "formatar_data_admin": admin_services._formatar_data_admin,
            "normalizar_texto_opcional": admin_services._normalizar_texto_opcional,
        },
    )


def upsert_signatario_governado_laudo(
    db: Session,
    *,
    tenant_id: int,
    nome: str,
    funcao: str,
    registro_profissional: str = "",
    valid_until: str | datetime | None = None,
    allowed_family_keys: list[str] | tuple[str, ...] | str | None = None,
    observacoes: str = "",
    ativo: bool = True,
    signatario_id: int | None = None,
    criado_por_id: int | None = None,
) -> SignatarioGovernadoLaudo:
    from app.domains.admin import services as admin_services

    return _admin_signatory_upsert(
        db,
        tenant_id=tenant_id,
        nome=nome,
        funcao=funcao,
        registro_profissional=registro_profissional,
        valid_until=valid_until,
        allowed_family_keys=allowed_family_keys,
        observacoes=observacoes,
        ativo=ativo,
        signatario_id=signatario_id,
        criado_por_id=criado_por_id,
        dependencies={
            "catalog_tenant_upsert_signatario": _catalog_tenant_upsert_signatario,
            "buscar_empresa": _buscar_empresa,
            "signatario_model": SignatarioGovernadoLaudo,
            "normalizar_texto_curto": admin_services._normalizar_texto_curto,
            "normalizar_texto_opcional": admin_services._normalizar_texto_opcional,
            "normalizar_validade_signatario_fn": _normalizar_validade_signatario,
            "normalizar_family_keys_signatario_fn": _normalizar_family_keys_signatario,
            "flush_ou_rollback_integridade": admin_services.flush_ou_rollback_integridade,
            "logger_operacao": admin_services.logger,
        },
    )


def resumir_portfolio_catalogo_empresa(db: Session, *, empresa_id: int) -> dict[str, Any]:
    return _catalog_app_resumir_portfolio_catalogo_empresa(
        db,
        empresa_id=empresa_id,
        dependencies={
            "catalog_tenant_resumir_portfolio": _catalog_tenant_resumir_portfolio,
            "build_admin_tenant_catalog_snapshot": build_admin_tenant_catalog_snapshot,
        },
    )


def sincronizar_portfolio_catalogo_empresa(
    db: Session,
    *,
    empresa_id: int,
    selection_tokens: list[str] | tuple[str, ...],
    admin_id: int | None = None,
) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _catalog_app_sincronizar_portfolio_catalogo_empresa(
        db,
        empresa_id=empresa_id,
        selection_tokens=selection_tokens,
        admin_id=admin_id,
        dependencies={
            "catalog_tenant_sincronizar_portfolio": _catalog_tenant_sincronizar_portfolio,
            "buscar_empresa": _buscar_empresa,
            "sync_tenant_catalog_activations": sync_tenant_catalog_activations,
            "flush_ou_rollback_integridade": admin_services.flush_ou_rollback_integridade,
            "logger_operacao": admin_services.logger,
        },
    )


__all__ = [
    "buscar_catalogo_familia_admin",
    "resumir_portfolio_catalogo_empresa",
    "sincronizar_portfolio_catalogo_empresa",
    "upsert_signatario_governado_laudo",
    "upsert_tenant_family_release",
]
