# ==========================================
# TARIEL CONTROL TOWER — SERVICOS_SAAS.PY
# Responsabilidade:
# - onboarding de clientes SaaS
# - métricas do painel administrativo
# - gestão de empresas e usuários do ecossistema
# - regras comerciais de plano e limite
# ==========================================

from __future__ import annotations

from collections.abc import Iterable
import logging
import re
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.settings import env_str, get_settings
from app.domains.admin import admin_platform_identity_services as _admin_platform_identity_services
from app.domains.admin import tenant_client_cleanup_services as _tenant_client_cleanup_services
from app.domains.admin import tenant_client_read_services as _tenant_client_read_services
from app.domains.admin import tenant_client_write_services as _tenant_client_write_services
from app.domains.admin import tenant_plan_services as _tenant_plan_services
from app.domains.chat.catalog_document_contract import (
    MASTER_TEMPLATE_REGISTRY,
    resolve_master_template_id_for_family as _resolve_master_template_id_for_family,
)
from app.domains.admin.platform_settings_console_overview import (
    build_platform_settings_console_overview as _build_platform_settings_console_overview_export,
)
from app.domains.admin.platform_settings_console_sections import (
    build_platform_settings_console_sections as _build_platform_settings_console_sections_export,
)
from app.domains.admin.platform_settings_setting_descriptors import (
    build_access_setting_descriptors as _build_access_setting_descriptors_export,
    build_defaults_setting_descriptors as _build_defaults_setting_descriptors_export,
    build_rollout_setting_descriptors as _build_rollout_setting_descriptors_export,
    build_support_setting_descriptors as _build_support_setting_descriptors_export,
)
from app.domains.admin.catalog_family_runtime_write_services import (
    upsert_calibracao_familia as _upsert_calibracao_familia,
    upsert_modo_tecnico_familia as _upsert_modo_tecnico_familia,
)
from app.domains.admin.catalog_family_write_services import (
    importar_familia_canonica_para_catalogo as _importar_familia_canonica_para_catalogo,
    importar_familias_canonicas_para_catalogo as _importar_familias_canonicas_para_catalogo,
    upsert_familia_catalogo as _upsert_familia_catalogo,
)
from app.domains.admin.catalog_offer_write_services import (
    upsert_oferta_comercial_familia as _upsert_oferta_comercial_familia,
)
from app.domains.admin import (
    admin_catalog_contract_normalization_services as _admin_catalog_contract_normalization_services,
)
from app.domains.admin.admin_catalog_summary_services import (
    calibracao_status_resolvido as _admin_catalog_summary_calibracao_status,
    catalog_plan_distribution_summary as _admin_catalog_summary_plan_distribution,
    derivar_prontidao_catalogo as _admin_catalog_summary_derivar_prontidao,
    offer_lifecycle_resolvido as _admin_catalog_summary_offer_lifecycle,
    total_releases_ativas_familia as _admin_catalog_summary_total_releases,
)
from app.domains.admin.admin_catalog_asset_registry_services import (
    catalog_model_label as _admin_catalog_assets_catalog_model_label,
)
from app.domains.admin.admin_catalog_governance_application_services import (
    listar_metodos_catalogo as _listar_metodos_catalogo,
    resumir_catalogo_laudos_admin as _resumir_catalogo_laudos_admin,
    upsert_governanca_review_familia as _upsert_governanca_review_familia,
)
from app.domains.admin.admin_catalog_foundation_services import (
    _buscar_familia_catalogo_por_chave as __buscar_familia_catalogo_por_chave,
    _family_artifact_file_path as __family_artifact_file_path,
    _family_schema_file_path as __family_schema_file_path,
    _family_schemas_dir as __family_schemas_dir,
    _ler_json_arquivo as __ler_json_arquivo,
    _metodos_sugeridos_para_familia as __metodos_sugeridos_para_familia,
    _repo_root_dir as __repo_root_dir,
    _upsert_metodos_catalogo_para_familia as __upsert_metodos_catalogo_para_familia,
    carregar_family_schema_canonico as _carregar_family_schema_canonico,
    listar_family_schemas_canonicos as _listar_family_schemas_canonicos,
)
from app.domains.admin.admin_catalog_presentation_services import (
    _build_document_preview_summary as __build_document_preview_summary,
    _build_material_real_priority_summary as __build_material_real_priority_summary,
    _build_material_real_workspace_summary as __build_material_real_workspace_summary,
    _build_template_library_rollup as __build_template_library_rollup,
    _build_template_refinement_target as __build_template_refinement_target,
    _build_variant_library_summary as __build_variant_library_summary,
    _catalog_family_artifact_snapshot as __catalog_family_artifact_snapshot,
    _enrich_catalog_rows_with_document_preview as __enrich_catalog_rows_with_document_preview,
    _serializar_familia_catalogo_row as __serializar_familia_catalogo_row,
    _template_library_registry_index as __template_library_registry_index,
)
from app.domains.admin.admin_catalog_tenant_application_services import (
    buscar_catalogo_familia_admin as _buscar_catalogo_familia_admin,
    resumir_portfolio_catalogo_empresa as _resumir_portfolio_catalogo_empresa,
    sincronizar_portfolio_catalogo_empresa as _sincronizar_portfolio_catalogo_empresa,
    upsert_signatario_governado_laudo as _upsert_signatario_governado_laudo,
    upsert_tenant_family_release as _upsert_tenant_family_release,
    _serializar_signatario_governado_admin as __serializar_signatario_governado_admin,
)
from app.domains.admin.admin_catalog_rollup_runtime_services import (
    _build_calibration_queue_rollup,  # noqa: F401
    _build_catalog_governance_rollup,  # noqa: F401
    _build_commercial_scale_rollup,  # noqa: F401
    _build_material_real_rollup,  # noqa: F401
    _build_release_channel_counter_rows,  # noqa: F401
    _build_release_status_counter_rows,  # noqa: F401
    _build_review_mode_counter_rows,  # noqa: F401
    _dominant_release_channel,  # noqa: F401
    _dominant_review_mode,  # noqa: F401
    _format_review_mode_breakdown,  # noqa: F401
    _merge_release_governance_policy,  # noqa: F401
    _merge_review_policy_governance,  # noqa: F401
    _plan_allowed_for_governance_rollup,  # noqa: F401
    _resolve_governance_rollup_release_mode,  # noqa: F401
    _resumir_governanca_release_policy,  # noqa: F401
    _resumir_governanca_review_policy,  # noqa: F401
    _review_mode_display_order,  # noqa: F401
    _review_mode_with_cap,  # noqa: F401
    _strictest_review_mode,  # noqa: F401
)
from app.domains.admin.admin_operations_application_services import (
    buscar_detalhe_cliente as _admin_operations_buscar_detalhe_cliente,
    buscar_metricas_ia_painel as _admin_operations_buscar_metricas_ia_painel,
    registrar_novo_cliente as _admin_operations_registrar_novo_cliente,
)
from app.domains.admin.admin_welcome_notification_services import (
    aviso_notificacao_boas_vindas as _admin_welcome_notice_message,
    disparar_email_boas_vindas as _admin_dispatch_welcome_notice,
)
from app.domains.admin.admin_platform_settings_application_services import (
    apply_platform_settings_update as _admin_platform_settings_apply_update,
    build_admin_platform_settings_console as _admin_platform_settings_build_console,
)
from app.domains.admin.platform_settings_state import (
    get_platform_default_new_tenant_plan,  # noqa: F401
    get_support_exceptional_policy_snapshot,  # noqa: F401
    get_tenant_exceptional_support_state,  # noqa: F401
)
from app.domains.admin.runtime_settings_descriptors import (
    build_access_runtime_descriptors as _build_access_runtime_descriptors_export,
    build_document_runtime_descriptors as _build_document_runtime_descriptors_export,
    build_observability_runtime_descriptors as _build_observability_runtime_descriptors_export,
)
from app.domains.admin import tenant_user_services as _tenant_user_services
from app.domains.admin.tenant_user_services import (
    _normalizar_texto_curto as __normalizar_texto_curto,
    _normalizar_texto_opcional as __normalizar_texto_opcional,
    criar_usuario_empresa as _criar_usuario_empresa,
)
from app.shared.catalog_commercial_governance import (
    merge_offer_commercial_flags as _merge_offer_commercial_flags,
    summarize_release_contract_governance as _summarize_release_contract_governance,
    summarize_offer_commercial_governance as _summarize_offer_commercial_governance,
)
from app.shared.backend_hotspot_metrics import (
    observe_backend_hotspot as _observe_backend_hotspot,
)
from app.shared.security import gerar_senha_fortificada as _gerar_senha_fortificada
from app.shared.database import (
    Empresa,
    FamiliaLaudoCatalogo,
    OfertaComercialFamiliaLaudo,
    PlanoEmpresa,
    TenantFamilyReleaseLaudo as _TenantFamilyReleaseLaudo,
    Usuario,
    commit_ou_rollback_integridade as _commit_ou_rollback_integridade,
    flush_ou_rollback_integridade as _flush_ou_rollback_integridade,
)
from app.shared.tenant_report_catalog import (
    catalog_offer_variants as _catalog_offer_variants,
)

upsert_familia_catalogo = _upsert_familia_catalogo
importar_familia_canonica_para_catalogo = _importar_familia_canonica_para_catalogo
importar_familias_canonicas_para_catalogo = _importar_familias_canonicas_para_catalogo
upsert_oferta_comercial_familia = _upsert_oferta_comercial_familia
upsert_modo_tecnico_familia = _upsert_modo_tecnico_familia
upsert_calibracao_familia = _upsert_calibracao_familia
upsert_governanca_review_familia = _upsert_governanca_review_familia
commit_ou_rollback_integridade = _commit_ou_rollback_integridade
flush_ou_rollback_integridade = _flush_ou_rollback_integridade
buscar_catalogo_familia_admin = _buscar_catalogo_familia_admin
upsert_tenant_family_release = _upsert_tenant_family_release
upsert_signatario_governado_laudo = _upsert_signatario_governado_laudo
listar_metodos_catalogo = _listar_metodos_catalogo
resumir_catalogo_laudos_admin = _resumir_catalogo_laudos_admin
resumir_portfolio_catalogo_empresa = _resumir_portfolio_catalogo_empresa
sincronizar_portfolio_catalogo_empresa = _sincronizar_portfolio_catalogo_empresa
listar_family_schemas_canonicos = _listar_family_schemas_canonicos
carregar_family_schema_canonico = _carregar_family_schema_canonico
TenantFamilyReleaseLaudo = _TenantFamilyReleaseLaudo
_catalog_family_artifact_snapshot = __catalog_family_artifact_snapshot
_build_template_library_rollup = __build_template_library_rollup
_build_material_real_workspace_summary = __build_material_real_workspace_summary
_build_material_real_priority_summary = __build_material_real_priority_summary
_build_document_preview_summary = __build_document_preview_summary
_enrich_catalog_rows_with_document_preview = __enrich_catalog_rows_with_document_preview
_build_variant_library_summary = __build_variant_library_summary
_build_template_refinement_target = __build_template_refinement_target
_serializar_familia_catalogo_row = __serializar_familia_catalogo_row
_template_library_registry_index = __template_library_registry_index
_serializar_signatario_governado_admin = __serializar_signatario_governado_admin
_repo_root_dir = __repo_root_dir
_family_schemas_dir = __family_schemas_dir
_family_schema_file_path = __family_schema_file_path
_family_artifact_file_path = __family_artifact_file_path
_ler_json_arquivo = __ler_json_arquivo
_buscar_familia_catalogo_por_chave = __buscar_familia_catalogo_por_chave
_metodos_sugeridos_para_familia = __metodos_sugeridos_para_familia
_upsert_metodos_catalogo_para_familia = __upsert_metodos_catalogo_para_familia
_SHOWROOM_PLAN_LABELS = _admin_catalog_contract_normalization_services._SHOWROOM_PLAN_LABELS
_CATALOGO_TECHNICAL_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_TECHNICAL_STATUS_LABELS
)
_CATALOGO_LIFECYCLE_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_LIFECYCLE_STATUS_LABELS
)
_CATALOGO_CALIBRATION_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_CALIBRATION_STATUS_LABELS
)
_CATALOGO_RELEASE_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_RELEASE_STATUS_LABELS
)
_CATALOGO_REVIEW_MODE_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_REVIEW_MODE_LABELS
)
_CATALOGO_REVIEW_OVERRIDE_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_REVIEW_OVERRIDE_LABELS
)
_CATALOGO_RED_FLAG_SEVERITY_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_RED_FLAG_SEVERITY_LABELS
)
_CATALOGO_READINESS_LABELS = _admin_catalog_contract_normalization_services._CATALOGO_READINESS_LABELS
_CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS
)
_CATALOGO_MATERIAL_PRIORITY_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_MATERIAL_PRIORITY_LABELS
)
_CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS
)
_CATALOGO_SHOWCASE_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_SHOWCASE_STATUS_LABELS
)
_CATALOGO_MATERIAL_PREVIEW_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_MATERIAL_PREVIEW_STATUS_LABELS
)
_CATALOGO_VARIANT_LIBRARY_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_VARIANT_LIBRARY_STATUS_LABELS
)
_CATALOGO_TEMPLATE_REFINEMENT_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_TEMPLATE_REFINEMENT_STATUS_LABELS
)
_CATALOGO_MATERIAL_WORKLIST_STATUS_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_MATERIAL_WORKLIST_STATUS_LABELS
)
_CATALOGO_MATERIAL_WORKLIST_PHASE_LABELS = (
    _admin_catalog_contract_normalization_services._CATALOGO_MATERIAL_WORKLIST_PHASE_LABELS
)
_MATERIAL_REAL_EXECUTION_TRACK_PRESETS = (
    _admin_catalog_contract_normalization_services._MATERIAL_REAL_EXECUTION_TRACK_PRESETS
)
_CATALOGO_METHOD_HINTS = _admin_catalog_contract_normalization_services._CATALOGO_METHOD_HINTS
_REVIEW_MODE_ORDER = _admin_catalog_contract_normalization_services._REVIEW_MODE_ORDER
_catalog_showroom_plan_label = (
    _admin_catalog_contract_normalization_services._catalog_showroom_plan_label
)
_catalog_human_join = _admin_catalog_contract_normalization_services._catalog_human_join
_catalog_macro_category_sort_key = (
    _admin_catalog_contract_normalization_services._catalog_macro_category_sort_key
)
_normalizar_chave_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_chave_catalogo
)
_normalizar_json_opcional = (
    _admin_catalog_contract_normalization_services._normalizar_json_opcional
)
_normalizar_lista_textual = (
    _admin_catalog_contract_normalization_services._normalizar_lista_textual
)
_normalizar_status_catalogo_familia = (
    _admin_catalog_contract_normalization_services._normalizar_status_catalogo_familia
)
_normalizar_status_material_real_oferta = (
    _admin_catalog_contract_normalization_services._normalizar_status_material_real_oferta
)
_normalizar_variantes_comerciais = (
    _admin_catalog_contract_normalization_services._normalizar_variantes_comerciais
)
_normalizar_status_tecnico_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_status_tecnico_catalogo
)
_normalizar_classificacao_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_classificacao_catalogo
)
_normalizar_lifecycle_status_oferta = (
    _admin_catalog_contract_normalization_services._normalizar_lifecycle_status_oferta
)
_normalizar_material_level_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_material_level_catalogo
)
_normalizar_status_calibracao_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_status_calibracao_catalogo
)
_normalizar_status_release_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_status_release_catalogo
)
_normalizar_release_channel_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_release_channel_catalogo
)
_normalizar_limite_contractual = (
    _admin_catalog_contract_normalization_services._normalizar_limite_contractual
)
_normalizar_lista_json_canonica = (
    _admin_catalog_contract_normalization_services._normalizar_lista_json_canonica
)
_normalizar_nr_key = _admin_catalog_contract_normalization_services._normalizar_nr_key
_inferir_classificacao_catalogo = (
    _admin_catalog_contract_normalization_services._inferir_classificacao_catalogo
)
_label_catalogo = _admin_catalog_contract_normalization_services._label_catalogo
_humanizar_slug = _admin_catalog_contract_normalization_services._humanizar_slug
_catalogo_texto_leitura = (
    _admin_catalog_contract_normalization_services._catalogo_texto_leitura
)
_catalogo_scope_summary_label = (
    _admin_catalog_contract_normalization_services._catalogo_scope_summary_label
)
_normalizar_selection_tokens_catalogo = (
    _admin_catalog_contract_normalization_services._normalizar_selection_tokens_catalogo
)
_normalizar_review_mode_governanca = (
    _admin_catalog_contract_normalization_services._normalizar_review_mode_governanca
)
_normalizar_override_tristate = (
    _admin_catalog_contract_normalization_services._normalizar_override_tristate
)
_normalizar_planos_governanca = (
    _admin_catalog_contract_normalization_services._normalizar_planos_governanca
)
_normalizar_red_flags_governanca = (
    _admin_catalog_contract_normalization_services._normalizar_red_flags_governanca
)
_normalizar_features_contractuais = (
    _admin_catalog_contract_normalization_services._normalizar_features_contractuais
)
_normalizar_bundle_comercial_payload = (
    _admin_catalog_contract_normalization_services._normalizar_bundle_comercial_payload
)
_normalizar_contract_entitlements_payload = (
    _admin_catalog_contract_normalization_services._normalizar_contract_entitlements_payload
)
_review_mode_label_meta = (
    _admin_catalog_contract_normalization_services._review_mode_label_meta
)
_override_choice_label = _admin_catalog_contract_normalization_services._override_choice_label
_red_flag_severity_meta = (
    _admin_catalog_contract_normalization_services._red_flag_severity_meta
)
_effective_review_mode_cap = (
    _admin_catalog_contract_normalization_services._effective_review_mode_cap
)
_release_channel_display_order = (
    _admin_catalog_contract_normalization_services._release_channel_display_order
)
_normalizar_texto_curto = __normalizar_texto_curto
_normalizar_texto_opcional = __normalizar_texto_opcional

logger = logging.getLogger("tariel.saas")
merge_offer_commercial_flags = _merge_offer_commercial_flags
summarize_offer_commercial_governance = _summarize_offer_commercial_governance
summarize_release_contract_governance = _summarize_release_contract_governance
catalog_offer_variants = _catalog_offer_variants
resolve_master_template_id_for_family = _resolve_master_template_id_for_family
criar_usuario_empresa = _criar_usuario_empresa
build_platform_settings_console_overview = _build_platform_settings_console_overview_export
build_platform_settings_console_sections = _build_platform_settings_console_sections_export
build_access_setting_descriptors = _build_access_setting_descriptors_export
build_defaults_setting_descriptors = _build_defaults_setting_descriptors_export
build_rollout_setting_descriptors = _build_rollout_setting_descriptors_export
build_support_setting_descriptors = _build_support_setting_descriptors_export
build_access_runtime_descriptors = _build_access_runtime_descriptors_export
build_document_runtime_descriptors = _build_document_runtime_descriptors_export
build_observability_runtime_descriptors = _build_observability_runtime_descriptors_export
gerar_senha_fortificada = _gerar_senha_fortificada
observe_backend_hotspot = _observe_backend_hotspot

_MODO_DEV = not get_settings().em_producao
_BACKEND_NOTIFICACAO_BOAS_VINDAS = env_str(
    "ADMIN_WELCOME_NOTIFICATION_BACKEND",
    "log" if _MODO_DEV else "noop",
).strip().lower()


def _aviso_notificacao_boas_vindas() -> str:
    return _admin_welcome_notice_message()


def _disparar_email_boas_vindas(email: str, empresa: str, senha: str) -> str | None:
    return _admin_dispatch_welcome_notice(
        email,
        empresa,
        senha,
        backend=_BACKEND_NOTIFICACAO_BOAS_VINDAS,
        logger=logger,
    )


def apply_platform_settings_update(
    banco: Session,
    *,
    actor_user: Usuario,
    group_key: str,
    reason: str,
    updates: dict[str, Any],
) -> dict[str, Any]:
    return _admin_platform_settings_apply_update(
        banco,
        actor_user=actor_user,
        group_key=group_key,
        reason=reason,
        updates=updates,
        logger_operacao=logger,
    )


def build_admin_platform_settings_console(banco: Session) -> dict[str, Any]:
    return _admin_platform_settings_build_console(
        banco,
        build_platform_settings_console_overview=build_platform_settings_console_overview,
        build_platform_settings_console_sections=build_platform_settings_console_sections,
        build_access_setting_descriptors=build_access_setting_descriptors,
        build_support_setting_descriptors=build_support_setting_descriptors,
        build_rollout_setting_descriptors=build_rollout_setting_descriptors,
        build_defaults_setting_descriptors=build_defaults_setting_descriptors,
        build_access_runtime_descriptors=build_access_runtime_descriptors,
        build_document_runtime_descriptors=build_document_runtime_descriptors,
        build_observability_runtime_descriptors=build_observability_runtime_descriptors,
    )

UI_AUDIT_TENANT_PREFIX = _tenant_client_cleanup_services.UI_AUDIT_TENANT_PREFIX
AdminIdentityAuthorizationResult = _admin_platform_identity_services.AdminIdentityAuthorizationResult
_resolver_empresa_plataforma = _admin_platform_identity_services._resolver_empresa_plataforma
_tenant_cliente_clause = _admin_platform_identity_services._tenant_cliente_clause
autenticar_identidade_admin = _admin_platform_identity_services.autenticar_identidade_admin
listar_operadores_plataforma = _admin_platform_identity_services.listar_operadores_plataforma
registrar_auditoria_identidade_admin = _admin_platform_identity_services.registrar_auditoria_identidade_admin
_PRIORIDADE_PLANO = _tenant_plan_services._PRIORIDADE_PLANO
_case_prioridade_plano = _tenant_plan_services._case_prioridade_plano
_label_limite = _tenant_plan_services._label_limite
_normalizar_plano = _tenant_plan_services._normalizar_plano
_obter_limite_laudos_empresa = _tenant_plan_services._obter_limite_laudos_empresa
_obter_limite_usuarios_empresa = _tenant_plan_services._obter_limite_usuarios_empresa
construir_preview_troca_plano = _tenant_plan_services.construir_preview_troca_plano
_atividade_recente_compat = _tenant_client_read_services._atividade_recente_compat
_classificar_saude_empresa = _tenant_client_read_services._classificar_saude_empresa
_classificar_status_empresa = _tenant_client_read_services._classificar_status_empresa
_coletar_contexto_empresas = _tenant_client_read_services._coletar_contexto_empresas
_formatar_data_admin = _tenant_client_read_services._formatar_data_admin
_max_datetime_admin = _tenant_client_read_services._max_datetime_admin
_normalizar_datetime_admin = _tenant_client_read_services._normalizar_datetime_admin
_normalizar_direcao_ordenacao = _tenant_client_read_services._normalizar_direcao_ordenacao
_normalizar_filtro_atividade = _tenant_client_read_services._normalizar_filtro_atividade
_normalizar_filtro_saude = _tenant_client_read_services._normalizar_filtro_saude
_normalizar_filtro_status = _tenant_client_read_services._normalizar_filtro_status
_normalizar_ordenacao_clientes = _tenant_client_read_services._normalizar_ordenacao_clientes
_normalizar_paginacao = _tenant_client_read_services._normalizar_paginacao
_role_label = _tenant_client_read_services._role_label
buscar_todos_clientes = _tenant_client_read_services.buscar_todos_clientes
_listar_ids_usuarios_operacionais_empresa = _tenant_client_write_services._listar_ids_usuarios_operacionais_empresa
_normalizar_politica_admin_cliente_empresa = _tenant_client_write_services._normalizar_politica_admin_cliente_empresa
alternar_bloqueio = _tenant_client_write_services.alternar_bloqueio
alterar_plano = _tenant_client_write_services.alterar_plano
atualizar_politica_admin_cliente_empresa = _tenant_client_write_services.atualizar_politica_admin_cliente_empresa
remover_empresas_cliente_por_ids = _tenant_client_cleanup_services.remover_empresas_cliente_por_ids
remover_empresas_temporarias_auditoria_ui = _tenant_client_cleanup_services.remover_empresas_temporarias_auditoria_ui

_normalizar_email = _tenant_user_services._normalizar_email
alternar_bloqueio_usuario_empresa = _tenant_user_services.alternar_bloqueio_usuario_empresa
atualizar_usuario_empresa = _tenant_user_services.atualizar_usuario_empresa
excluir_usuario_empresa = _tenant_user_services.excluir_usuario_empresa
filtro_usuarios_operacionais_cliente = _tenant_user_services.filtro_usuarios_operacionais_cliente
filtro_usuarios_gerenciaveis_cliente = _tenant_user_services.filtro_usuarios_gerenciaveis_cliente
forcar_troca_senha_usuario_empresa = _tenant_user_services.forcar_troca_senha_usuario_empresa
resetar_senha_inspetor = _tenant_user_services.resetar_senha_inspetor
resetar_senha_usuario_empresa = _tenant_user_services.resetar_senha_usuario_empresa

# =========================================================
# NORMALIZAÇÃO / CONTRATO COMERCIAL
# =========================================================


# =========================================================
# HELPERS
# =========================================================


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalizar_datetime_admin(valor: datetime | None) -> datetime | None:
    if not isinstance(valor, datetime):
        return None
    if valor.tzinfo is None:
        return valor.replace(tzinfo=timezone.utc)
    return valor.astimezone(timezone.utc)


def _max_datetime_admin(valores: Iterable[datetime | None]) -> datetime | None:
    candidatos = [valor for valor in valores if isinstance(valor, datetime)]
    return max(candidatos) if candidatos else None


def _dict_payload_admin(valor: Any) -> dict[str, Any]:
    return dict(valor) if isinstance(valor, dict) else {}

def _normalizar_cnpj(cnpj: str) -> str:
    valor = re.sub(r"\D+", "", str(cnpj or ""))
    if len(valor) != 14:
        raise ValueError("CNPJ inválido. Informe 14 dígitos.")
    return valor


def _catalogo_modelo_label(codigo: str | None, *, fallback: str | None = None) -> str | None:
    return _admin_catalog_assets_catalog_model_label(
        codigo,
        fallback=fallback,
        dependencies={
            "master_template_registry": MASTER_TEMPLATE_REGISTRY,
            "template_library_registry_index": _template_library_registry_index,
            "humanizar_slug": _humanizar_slug,
        },
    )


def listar_catalogo_familias(
    db: Session,
    *,
    filtro_status: str = "",
    filtro_busca: str = "",
    filtro_classificacao: str = "family",
) -> list[FamiliaLaudoCatalogo]:
    stmt = select(FamiliaLaudoCatalogo).options(
        selectinload(FamiliaLaudoCatalogo.oferta_comercial),
        selectinload(FamiliaLaudoCatalogo.modos_tecnicos),
        selectinload(FamiliaLaudoCatalogo.calibracao),
        selectinload(FamiliaLaudoCatalogo.tenant_releases),
    )

    status = str(filtro_status or "").strip()
    if status:
        status_norm = _normalizar_status_catalogo_familia(status)
        technical_norm = _normalizar_status_tecnico_catalogo(status)
        stmt = stmt.where(
            (FamiliaLaudoCatalogo.status_catalogo == status_norm)
            | (FamiliaLaudoCatalogo.technical_status == technical_norm)
        )

    classificacao = str(filtro_classificacao or "").strip()
    if classificacao:
        stmt = stmt.where(
            FamiliaLaudoCatalogo.catalog_classification == _normalizar_classificacao_catalogo(classificacao)
        )

    busca = str(filtro_busca or "").strip()
    if busca:
        termo = f"%{busca}%"
        stmt = stmt.where(
            FamiliaLaudoCatalogo.family_key.ilike(termo)
            | FamiliaLaudoCatalogo.nome_exibicao.ilike(termo)
            | FamiliaLaudoCatalogo.macro_categoria.ilike(termo)
        )

    stmt = stmt.order_by(
        FamiliaLaudoCatalogo.technical_status.asc(),
        FamiliaLaudoCatalogo.macro_categoria.asc(),
        FamiliaLaudoCatalogo.nome_exibicao.asc(),
    )
    return list(db.scalars(stmt).all())


def listar_ofertas_comerciais_catalogo(
    db: Session,
    *,
    filtro_lifecycle: str = "",
) -> list[OfertaComercialFamiliaLaudo]:
    stmt = (
        select(OfertaComercialFamiliaLaudo)
        .options(selectinload(OfertaComercialFamiliaLaudo.familia))
        .join(FamiliaLaudoCatalogo, OfertaComercialFamiliaLaudo.family_id == FamiliaLaudoCatalogo.id)
    )
    lifecycle = str(filtro_lifecycle or "").strip()
    if lifecycle:
        stmt = stmt.where(OfertaComercialFamiliaLaudo.lifecycle_status == _normalizar_lifecycle_status_oferta(lifecycle))
    stmt = stmt.order_by(
        OfertaComercialFamiliaLaudo.lifecycle_status.asc(),
        OfertaComercialFamiliaLaudo.material_level.desc(),
        FamiliaLaudoCatalogo.macro_categoria.asc(),
        OfertaComercialFamiliaLaudo.nome_oferta.asc(),
    )
    return list(db.scalars(stmt).all())


def _calibracao_status_resolvido(
    familia: FamiliaLaudoCatalogo,
    oferta: OfertaComercialFamiliaLaudo | None,
) -> str:
    return _admin_catalog_summary_calibracao_status(
        familia,
        oferta,
        dependencies={},
    )


def _offer_lifecycle_resolvido(oferta: OfertaComercialFamiliaLaudo | None) -> str | None:
    return _admin_catalog_summary_offer_lifecycle(oferta)


def _total_releases_ativas_familia(familia: FamiliaLaudoCatalogo) -> int:
    return _admin_catalog_summary_total_releases(familia)


def derivar_prontidao_catalogo(
    *,
    technical_status: str,
    has_template_seed: bool,
    has_laudo_output_seed: bool,
    offer_lifecycle_status: str | None,
    calibration_status: str,
    active_release_count: int,
) -> str:
    return _admin_catalog_summary_derivar_prontidao(
        technical_status=technical_status,
        has_template_seed=has_template_seed,
        has_laudo_output_seed=has_laudo_output_seed,
        offer_lifecycle_status=offer_lifecycle_status,
        calibration_status=calibration_status,
        active_release_count=active_release_count,
    )


def _catalog_plan_distribution_summary(familia: FamiliaLaudoCatalogo) -> dict[str, Any]:
    return _admin_catalog_summary_plan_distribution(
        familia,
        dependencies={
            "resumir_governanca_review_policy": _resumir_governanca_review_policy,
            "plano_empresa": PlanoEmpresa,
            "catalog_showroom_plan_label": _catalog_showroom_plan_label,
            "normalizar_chave_catalogo": _normalizar_chave_catalogo,
            "catalog_human_join": _catalog_human_join,
        },
    )


# =========================================================
# ONBOARDING
# =========================================================


def registrar_novo_cliente(
    db: Session,
    nome: str,
    cnpj: str,
    email_admin: str,
    plano: str,
    segmento: str = "",
    cidade_estado: str = "",
    nome_responsavel: str = "",
    observacoes: str = "",
    admin_cliente_case_visibility_mode: str = "",
    admin_cliente_case_action_mode: str = "",
    admin_cliente_operating_model: str = "",
    admin_cliente_mobile_web_inspector_enabled: str | bool = "",
    admin_cliente_mobile_web_review_enabled: str | bool = "",
    admin_cliente_operational_user_cross_portal_enabled: str | bool = "",
    admin_cliente_operational_user_admin_portal_enabled: str | bool = "",
    provisionar_inspetor_inicial: str | bool = "",
    inspetor_nome: str = "",
    inspetor_email: str = "",
    inspetor_telefone: str = "",
    provisionar_revisor_inicial: str | bool = "",
    revisor_nome: str = "",
    revisor_email: str = "",
    revisor_telefone: str = "",
    revisor_crea: str = "",
) -> tuple[Empresa, str, str | None]:
    return _admin_operations_registrar_novo_cliente(
        db,
        nome=nome,
        cnpj=cnpj,
        email_admin=email_admin,
        plano=plano,
        segmento=segmento,
        cidade_estado=cidade_estado,
        nome_responsavel=nome_responsavel,
        observacoes=observacoes,
        admin_cliente_case_visibility_mode=admin_cliente_case_visibility_mode,
        admin_cliente_case_action_mode=admin_cliente_case_action_mode,
        admin_cliente_operating_model=admin_cliente_operating_model,
        admin_cliente_mobile_web_inspector_enabled=admin_cliente_mobile_web_inspector_enabled,
        admin_cliente_mobile_web_review_enabled=admin_cliente_mobile_web_review_enabled,
        admin_cliente_operational_user_cross_portal_enabled=admin_cliente_operational_user_cross_portal_enabled,
        admin_cliente_operational_user_admin_portal_enabled=admin_cliente_operational_user_admin_portal_enabled,
        provisionar_inspetor_inicial=provisionar_inspetor_inicial,
        inspetor_nome=inspetor_nome,
        inspetor_email=inspetor_email,
        inspetor_telefone=inspetor_telefone,
        provisionar_revisor_inicial=provisionar_revisor_inicial,
        revisor_nome=revisor_nome,
        revisor_email=revisor_email,
        revisor_telefone=revisor_telefone,
        revisor_crea=revisor_crea,
    )


# =========================================================
# PAINEL ADMINISTRATIVO
# =========================================================


def buscar_metricas_ia_painel(db: Session) -> dict[str, Any]:
    return _admin_operations_buscar_metricas_ia_painel(db)


# =========================================================
# GESTÃO DE CLIENTES SAAS
# =========================================================


def buscar_detalhe_cliente(db: Session, empresa_id: int) -> dict[str, Any] | None:
    return _admin_operations_buscar_detalhe_cliente(db, empresa_id)


# =========================================================
# STUB DE COMUNICAÇÃO
# =========================================================
