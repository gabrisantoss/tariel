# ==========================================
# TARIEL CONTROL TOWER — SERVICOS_SAAS.PY
# Responsabilidade:
# - onboarding de clientes SaaS
# - métricas do painel administrativo
# - gestão de empresas e usuários do ecossistema
# - regras comerciais de plano e limite
# ==========================================

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
import json
import logging
from pathlib import Path
import re
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.paths import canonical_docs_logical_path, resolve_master_templates_dir
from app.domains.admin import catalog_canonical_schema_services as _catalog_canonical_schema_services
from app.domains.admin import catalog_family_write_services as _catalog_family_write_services
from app.domains.admin import catalog_family_runtime_write_services as _catalog_family_runtime_write_services
from app.domains.admin import catalog_offer_write_services as _catalog_offer_write_services
from app.core.settings import env_str, get_settings
from app.domains.admin import admin_platform_identity_services as _admin_platform_identity_services
from app.domains.admin import tenant_client_cleanup_services as _tenant_client_cleanup_services
from app.domains.admin import tenant_client_read_services as _tenant_client_read_services
from app.domains.admin import tenant_client_write_services as _tenant_client_write_services
from app.domains.admin import tenant_plan_services as _tenant_plan_services
from app.domains.chat.catalog_document_contract import (
    MASTER_TEMPLATE_REGISTRY,
    resolve_master_template_id_for_family,
)
from app.domains.admin.platform_settings_services import (
    apply_platform_settings_update as _apply_platform_settings_update,
    build_admin_platform_settings_console as _build_admin_platform_settings_console,
)
from app.domains.admin import platform_settings_services as _platform_settings_services_module
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
from app.domains.admin.governance_policy_services import (
    merge_release_governance_policy as _governance_merge_release_policy,
    merge_review_policy_governance as _governance_merge_review_policy,
    resumir_governanca_release_policy as _governance_resumir_release_policy,
    resumir_governanca_review_policy as _governance_resumir_review_policy,
)
from app.domains.admin.governance_rollup_services import (
    build_catalog_governance_rollup as _governance_build_catalog_rollup,
    build_release_channel_counter_rows as _governance_build_release_channel_counter_rows,
    build_release_status_counter_rows as _governance_build_release_status_counter_rows,
    build_review_mode_counter_rows as _governance_build_review_mode_counter_rows,
    dominant_release_channel as _governance_dominant_release_channel,
    dominant_review_mode as _governance_dominant_review_mode,
    format_review_mode_breakdown as _governance_format_review_mode_breakdown,
    plan_allowed_for_governance_rollup as _governance_plan_allowed,
    resolve_governance_rollup_release_mode as _governance_resolve_release_mode,
    review_mode_display_order as _governance_review_mode_display_order,
    review_mode_with_cap as _governance_review_mode_with_cap,
    strictest_review_mode as _governance_strictest_review_mode,
)
from app.domains.admin.catalog_read_services import (
    buscar_catalogo_familia_admin as _catalog_read_buscar_catalogo_familia_admin,
    listar_metodos_catalogo as _catalog_read_listar_metodos_catalogo,
    resumir_catalogo_laudos_admin as _catalog_read_resumir_catalogo_laudos_admin,
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
from app.domains.admin.admin_presentation_services import (
    resumir_primeiro_acesso_empresa as _admin_presentation_first_access_summary,
    serializar_usuario_admin as _admin_presentation_user_serializer,
)
from app.domains.admin.tenant_onboarding_services import (
    registrar_novo_cliente as _tenant_onboarding_registrar_novo_cliente,
)
from app.domains.admin.admin_dashboard_services import (
    buscar_metricas_ia_painel as _admin_dashboard_buscar_metricas_ia_painel,
)
from app.domains.admin.admin_welcome_notification_services import (
    aviso_notificacao_boas_vindas as _admin_welcome_notice_message,
    disparar_email_boas_vindas as _admin_dispatch_welcome_notice,
)
from app.domains.admin.admin_client_detail_services import (
    buscar_detalhe_cliente as _admin_client_detail_buscar_detalhe_cliente,
)
from app.domains.admin.admin_signatory_services import (
    normalizar_family_keys_signatario as _admin_signatory_normalizar_family_keys,
    normalizar_validade_signatario as _admin_signatory_normalizar_validade,
    serializar_signatario_governado_admin as _admin_signatory_serializar,
    status_signatario_governado as _admin_signatory_status,
    upsert_signatario_governado_laudo as _admin_signatory_upsert,
)
from app.domains.admin.admin_catalog_summary_services import (
    calibracao_status_resolvido as _admin_catalog_summary_calibracao_status,
    catalog_plan_distribution_summary as _admin_catalog_summary_plan_distribution,
    catalog_row_matches_filters as _admin_catalog_summary_row_matches,
    derivar_prontidao_catalogo as _admin_catalog_summary_derivar_prontidao,
    offer_lifecycle_resolvido as _admin_catalog_summary_offer_lifecycle,
    total_releases_ativas_familia as _admin_catalog_summary_total_releases,
)
from app.domains.admin.admin_catalog_asset_registry_services import (
    build_template_library_rollup as _admin_catalog_assets_build_template_rollup,
    find_material_real_workspace as _admin_catalog_assets_find_material_workspace,
    load_template_library_registry as _admin_catalog_assets_load_template_registry,
    material_real_workspace_roots as _admin_catalog_assets_material_roots,
    read_json_if_exists as _admin_catalog_assets_read_json_if_exists,
    template_library_registry_index as _admin_catalog_assets_registry_index,
    template_library_registry_path as _admin_catalog_assets_registry_path,
)
from app.domains.admin.admin_catalog_material_real_services import (
    build_material_real_execution_track as _admin_catalog_material_execution_track,
    build_material_real_priority_summary as _admin_catalog_material_priority_summary,
    build_material_real_worklist as _admin_catalog_material_worklist,
    build_material_real_worklist_item as _admin_catalog_material_worklist_item,
    build_material_real_workspace_summary as _admin_catalog_material_workspace_summary,
    material_real_has_received_item as _admin_catalog_material_has_received_item,
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
    _buscar_empresa,
    _normalizar_email,
    _normalizar_texto_curto,
    _normalizar_texto_opcional,
    criar_usuario_empresa,
)
from app.shared.backend_hotspot_metrics import observe_backend_hotspot
from app.shared.catalog_commercial_governance import (
    RELEASE_CHANNEL_ORDER,
    merge_offer_commercial_flags as _merge_offer_commercial_flags,
    normalize_release_channel,
    release_channel_meta,
    sanitize_commercial_bundle,
    sanitize_contract_entitlements,
    summarize_offer_commercial_governance,
    summarize_release_contract_governance,
)
from app.shared.tenant_admin_policy import (
    tenant_admin_default_admin_cliente_portal_grants,
    summarize_tenant_admin_policy,
)
from app.shared.database import (
    CalibracaoFamiliaLaudo,
    Empresa,
    FamiliaLaudoCatalogo,
    Laudo,
    MetodoCatalogoInspecao,
    ModoTecnicoFamiliaLaudo,
    NivelAcesso,
    OfertaComercialFamiliaLaudo,
    PlanoEmpresa,
    SessaoAtiva,
    SignatarioGovernadoLaudo,
    TenantFamilyReleaseLaudo,
    Usuario,
    commit_ou_rollback_integridade,
    flush_ou_rollback_integridade,
)
from app.shared.tenant_report_catalog import (
    build_admin_tenant_catalog_snapshot,
    catalog_offer_variants,
    list_active_tenant_catalog_activations,
    sync_tenant_catalog_activations,
)
from app.shared.security import (
    criar_hash_senha,
    gerar_senha_fortificada,
)
logger = logging.getLogger("tariel.saas")
merge_offer_commercial_flags = _merge_offer_commercial_flags
build_platform_settings_console_overview = _build_platform_settings_console_overview_export
build_platform_settings_console_sections = _build_platform_settings_console_sections_export
build_access_setting_descriptors = _build_access_setting_descriptors_export
build_defaults_setting_descriptors = _build_defaults_setting_descriptors_export
build_rollout_setting_descriptors = _build_rollout_setting_descriptors_export
build_support_setting_descriptors = _build_support_setting_descriptors_export
build_access_runtime_descriptors = _build_access_runtime_descriptors_export
build_document_runtime_descriptors = _build_document_runtime_descriptors_export
build_observability_runtime_descriptors = _build_observability_runtime_descriptors_export

_MODO_DEV = not get_settings().em_producao
_BACKEND_NOTIFICACAO_BOAS_VINDAS = env_str(
    "ADMIN_WELCOME_NOTIFICATION_BACKEND",
    "log" if _MODO_DEV else "noop",
).strip().lower()


def apply_platform_settings_update(
    banco: Session,
    *,
    actor_user: Usuario,
    group_key: str,
    reason: str,
    updates: dict[str, Any],
) -> dict[str, Any]:
    return _apply_platform_settings_update(
        banco,
        actor_user=actor_user,
        group_key=group_key,
        reason=reason,
        updates=updates,
        logger_operacao=logger,
    )


def build_admin_platform_settings_console(banco: Session) -> dict[str, Any]:
    _platform_settings_services_module.build_platform_settings_console_overview = (
        build_platform_settings_console_overview
    )
    _platform_settings_services_module.build_platform_settings_console_sections = (
        build_platform_settings_console_sections
    )
    _platform_settings_services_module.build_access_setting_descriptors = (
        build_access_setting_descriptors
    )
    _platform_settings_services_module.build_support_setting_descriptors = (
        build_support_setting_descriptors
    )
    _platform_settings_services_module.build_rollout_setting_descriptors = (
        build_rollout_setting_descriptors
    )
    _platform_settings_services_module.build_defaults_setting_descriptors = (
        build_defaults_setting_descriptors
    )
    _platform_settings_services_module.build_access_runtime_descriptors = (
        build_access_runtime_descriptors
    )
    _platform_settings_services_module.build_document_runtime_descriptors = (
        build_document_runtime_descriptors
    )
    _platform_settings_services_module.build_observability_runtime_descriptors = (
        build_observability_runtime_descriptors
    )
    return _build_admin_platform_settings_console(banco)

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

_SHOWROOM_PLAN_LABELS = {
    PlanoEmpresa.INICIAL.value: {
        "label": "Starter",
        "short_label": "Starter",
        "support_label": "Inicial",
    },
    PlanoEmpresa.INTERMEDIARIO.value: {
        "label": "Pro",
        "short_label": "Pro",
        "support_label": "Intermediario",
    },
    PlanoEmpresa.ILIMITADO.value: {
        "label": "Enterprise",
        "short_label": "Enterprise",
        "support_label": "Ilimitado",
    },
}

def _catalog_showroom_plan_label(plan_name: str) -> dict[str, str]:
    normalized = PlanoEmpresa.normalizar(plan_name)
    return dict(
        _SHOWROOM_PLAN_LABELS.get(
            normalized,
            {
                "label": normalized,
                "short_label": normalized,
                "support_label": normalized,
            },
        )
    )


def _catalog_human_join(values: list[str]) -> str:
    labels = [str(item).strip() for item in values if str(item).strip()]
    if not labels:
        return "Sem assinatura liberada"
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} e {labels[1]}"
    return ", ".join(labels[:-1]) + f" e {labels[-1]}"


def _catalog_macro_category_sort_key(value: str) -> tuple[int, int, str]:
    label = str(value or "").strip()
    normalized = label.casefold()
    nr_match = re.search(r"\bnr\D*(\d{1,3})\b", normalized)
    if nr_match:
        return (0, int(nr_match.group(1)), normalized)
    return (1, 9999, normalized)

_CATALOGO_TECHNICAL_STATUS_LABELS = {
    "draft": ("Em preparo", "draft"),
    "review": ("Em ajuste", "review"),
    "ready": ("Pronta", "ready"),
    "deprecated": ("Arquivada", "archived"),
}
_CATALOGO_LIFECYCLE_STATUS_LABELS = {
    "draft": ("Em preparo", "draft"),
    "testing": ("Em validacao", "testing"),
    "active": ("Ativa", "active"),
    "paused": ("Pausada", "paused"),
    "archived": ("Arquivada", "archived"),
}
_CATALOGO_CALIBRATION_STATUS_LABELS = {
    "none": ("Sem validacao", "idle"),
    "synthetic_only": ("Base inicial", "draft"),
    "partial_real": ("Em validacao", "testing"),
    "real_calibrated": ("Validada", "active"),
}
_CATALOGO_RELEASE_STATUS_LABELS = {
    "draft": ("Em preparo", "draft"),
    "active": ("Liberada", "active"),
    "paused": ("Pausado", "paused"),
    "expired": ("Encerrada", "archived"),
}
_CATALOGO_REVIEW_MODE_LABELS = {
    "mesa_required": ("Analise interna", "review"),
    "mobile_review_allowed": ("Aplicativo com apoio da analise", "testing"),
    "mobile_autonomous": ("Aplicativo com autonomia", "active"),
}
_CATALOGO_REVIEW_OVERRIDE_LABELS = {
    "inherit": "Usar configuracao padrao",
    "allow": "Permitir",
    "deny": "Bloquear",
}
_CATALOGO_RED_FLAG_SEVERITY_LABELS = {
    "low": ("Baixa", "idle"),
    "medium": ("Média", "testing"),
    "high": ("Alta", "review"),
    "critical": ("Crítica", "active"),
}
_CATALOGO_READINESS_LABELS = {
    "technical_only": ("Base pronta", "idle"),
    "partial": ("Quase pronta", "testing"),
    "sellable": ("Pronta para venda", "active"),
    "calibrated": ("Validada", "active"),
}
_CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS = {
    "aguardando_material_real": ("Aguardando material", "testing"),
    "baseline_sintetica_externa_validada": ("Base validada", "active"),
    "material_real_calibrado": ("Validada com material real", "active"),
    "workspace_bootstrapped": ("Pasta inicial criada", "draft"),
}
_CATALOGO_MATERIAL_PRIORITY_LABELS = {
    "resolved": ("Resolvido", "active"),
    "immediate": ("Prioridade alta", "review"),
    "active_queue": ("Na fila", "testing"),
    "waiting_material": ("Aguardando material", "draft"),
    "bootstrap": ("Preparar base", "idle"),
}
_CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS = {
    "bootstrap": ("Inicio da base", "draft"),
    "foundation": ("Base pronta", "testing"),
    "reference_ready": ("Com referencia", "review"),
    "premium_ready": ("Pronto para uso", "active"),
}
_CATALOGO_SHOWCASE_STATUS_LABELS = {
    "building": ("Em montagem", "draft"),
    "demonstration_ready": ("Modelo demonstrativo pronto", "active"),
}
_CATALOGO_MATERIAL_PREVIEW_STATUS_LABELS = {
    "none": ("Sem material real", "idle"),
    "reference_ready": ("Com base de referencia", "testing"),
    "real_calibrated": ("Calibrado com material real", "active"),
}
_CATALOGO_VARIANT_LIBRARY_STATUS_LABELS = {
    "operational": ("Pronta", "active"),
    "template_mapped": ("Modelo ligado", "testing"),
    "needs_template": ("Falta modelo", "draft"),
}
_CATALOGO_TEMPLATE_REFINEMENT_STATUS_LABELS = {
    "continuous": ("Ajuste continuo", "active"),
    "refinement_due": ("Precisa de ajuste", "review"),
    "mapped": ("Modelo ligado", "testing"),
    "registry_gap": ("Falta registro", "draft"),
}
_CATALOGO_MATERIAL_WORKLIST_STATUS_LABELS = {
    "done": ("Concluído", "active"),
    "pending": ("Pendente", "draft"),
    "blocking": ("Bloqueio", "review"),
    "in_progress": ("Em andamento", "testing"),
}
_CATALOGO_MATERIAL_WORKLIST_PHASE_LABELS = {
    "intake_pending": ("Coleta prioritária", "review"),
    "packaging_reference": ("Consolidação do pacote", "testing"),
    "template_refinement": ("Refino de template", "review"),
    "continuous": ("Refino contínuo", "active"),
}
_MATERIAL_REAL_EXECUTION_TRACK_PRESETS: dict[str, dict[str, Any]] = {
    "nr13_inspecao_tubulacao": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Fechar a trilha premium de tubulação usando material real e harmonizar a linguagem com a baseline de NR13 já validada.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-17",
        "lane": "wave1_critical_finish",
        "sort_order": 10,
    },
    "nr13_integridade_caldeira": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Subir a família de integridade para o mesmo nível premium já alcançado por caldeira e vaso de pressão.",
        "recommended_owner": "Curadoria Tariel + responsável técnico do cliente",
        "next_checkpoint": "2026-04-17",
        "lane": "wave1_critical_finish",
        "sort_order": 11,
    },
    "nr13_teste_hidrostatico": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Consolidar a variante de teste com anexos, memória e conclusão vendável de NR13.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-19",
        "lane": "wave1_critical_finish",
        "sort_order": 12,
    },
    "nr13_teste_estanqueidade_tubulacao_gas": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Fechar a família de estanqueidade com material real e amarração forte de evidência, anexo e conclusão.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-19",
        "lane": "wave1_critical_finish",
        "sort_order": 13,
    },
    "nr12_inspecao_maquina_equipamento": {
        "track_id": "wave1_expand_nr12",
        "track_label": "Expansão premium NR12",
        "focus_label": "Abrir a baseline real inaugural de inspeção de máquinas com casca premium de inspeção vendável.",
        "recommended_owner": "Curadoria Tariel + SST do cliente",
        "next_checkpoint": "2026-04-24",
        "lane": "wave1_critical_expand",
        "sort_order": 30,
    },
    "nr12_apreciacao_risco_maquina": {
        "track_id": "wave1_expand_nr12",
        "track_label": "Expansão premium NR12",
        "focus_label": "Pressionar o template mestre técnico com material real de apreciação de risco e anexos de engenharia.",
        "recommended_owner": "Curadoria Tariel + engenharia do cliente",
        "next_checkpoint": "2026-04-24",
        "lane": "wave1_critical_expand",
        "sort_order": 31,
    },
    "nr20_inspecao_instalacoes_inflamaveis": {
        "track_id": "wave1_expand_nr20",
        "track_label": "Expansão premium NR20",
        "focus_label": "Abrir acervo real de inspeção de inflamáveis para consolidar linguagem, evidência e anexo pack.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-26",
        "lane": "wave1_critical_expand",
        "sort_order": 40,
    },
    "nr20_prontuario_instalacoes_inflamaveis": {
        "track_id": "wave1_expand_nr20",
        "track_label": "Expansão premium NR20",
        "focus_label": "Consolidar documentação controlada e prontuário com material real e governança mais rígida.",
        "recommended_owner": "Curadoria Tariel + documentação técnica do cliente",
        "next_checkpoint": "2026-04-26",
        "lane": "wave1_critical_expand",
        "sort_order": 41,
    },
    "nr33_avaliacao_espaco_confinado": {
        "track_id": "wave1_expand_nr33",
        "track_label": "Expansão premium NR33",
        "focus_label": "Subir a baseline real de avaliação de espaço confinado e alinhar red flags, bloqueios e evidência forte.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-28",
        "lane": "wave1_critical_expand",
        "sort_order": 50,
    },
    "nr33_permissao_entrada_trabalho": {
        "track_id": "wave1_expand_nr33",
        "track_label": "Expansão premium NR33",
        "focus_label": "Consolidar a PET com material real, governança documental e postura de emissão controlada.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-28",
        "lane": "wave1_critical_expand",
        "sort_order": 51,
    },
}
_CATALOGO_METHOD_HINTS: tuple[tuple[str, str, str], ...] = (
    ("ultrassom", "ultrassom", "inspection_method"),
    ("liquido_penetrante", "liquido_penetrante", "inspection_method"),
    ("particula_magnetica", "particula_magnetica", "inspection_method"),
    ("visual", "visual", "inspection_method"),
    ("estanqueidade", "estanqueidade", "inspection_method"),
    ("hidrostatic", "hidrostatico", "inspection_method"),
)
_REVIEW_MODE_ORDER = {
    "mobile_autonomous": 0,
    "mobile_review_allowed": 1,
    "mesa_required": 2,
}


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


def _normalizar_chave_catalogo(valor: str, *, campo: str, max_len: int) -> str:
    texto = str(valor or "").strip().lower()
    texto = (
        texto.replace("á", "a")
        .replace("à", "a")
        .replace("ã", "a")
        .replace("â", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )
    texto = re.sub(r"[^a-z0-9]+", "_", texto).strip("_")
    if not texto:
        raise ValueError(f"{campo} é obrigatório.")
    return texto[:max_len]


def _normalizar_json_opcional(valor: str, *, campo: str) -> Any | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    try:
        return json.loads(texto)
    except json.JSONDecodeError as erro:
        raise ValueError(f"{campo} precisa ser JSON válido.") from erro


def _normalizar_lista_textual(valor: str, *, campo: str, max_len_item: int = 240) -> list[str] | None:
    texto = str(valor or "").strip()
    if not texto:
        return None

    if texto.startswith("["):
        payload = _normalizar_json_opcional(texto, campo=campo)
        if not isinstance(payload, list):
            raise ValueError(f"{campo} precisa ser uma lista JSON ou linhas de texto.")
        itens_brutos = payload
    else:
        itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        linha = re.sub(r"^[\-\*\u2022]+\s*", "", str(bruto or "").strip())
        if not linha:
            continue
        linha = linha[:max_len_item]
        chave = linha.casefold()
        if chave in vistos:
            continue
        vistos.add(chave)
        itens.append(linha)
    return itens or None


def _normalizar_status_catalogo_familia(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "rascunho",
        "rascunho": "rascunho",
        "draft": "rascunho",
        "publicado": "publicado",
        "published": "publicado",
        "arquivado": "arquivado",
        "archived": "arquivado",
        "archive": "arquivado",
    }
    if texto not in aliases:
        raise ValueError("Status do catálogo inválido.")
    return aliases[texto]


def _normalizar_status_material_real_oferta(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "sintetico",
        "sintetico": "sintetico",
        "sintetica": "sintetico",
        "base_sintetica": "sintetico",
        "parcial": "parcial",
        "misto": "parcial",
        "hibrido": "parcial",
        "material_real_parcial": "parcial",
        "calibrado": "calibrado",
        "real": "calibrado",
        "material_real": "calibrado",
    }
    if texto not in aliases:
        raise ValueError("Status de material real inválido.")
    return aliases[texto]


def _normalizar_variantes_comerciais(valor: str | list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
    itens: list[Any]
    if isinstance(valor, list):
        itens = valor
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo="Variantes comerciais")
            if not isinstance(payload, list):
                raise ValueError("Variantes comerciais precisam ser uma lista JSON.")
            itens = payload
        else:
            itens = [linha for linha in texto.splitlines() if linha.strip()]

    variantes: list[dict[str, Any]] = []
    vistos: set[str] = set()
    for indice, bruto in enumerate(itens, start=1):
        if isinstance(bruto, dict):
            variant_key_raw = (
                bruto.get("variant_key")
                or bruto.get("codigo")
                or bruto.get("slug")
                or bruto.get("chave")
                or bruto.get("nome_exibicao")
                or bruto.get("nome")
                or ""
            )
            nome_raw = bruto.get("nome_exibicao") or bruto.get("nome") or variant_key_raw
            template_code_raw = bruto.get("template_code") or bruto.get("codigo_template") or ""
            uso_raw = bruto.get("uso_recomendado") or bruto.get("descricao") or ""
        else:
            linha = re.sub(r"^[\-\*\u2022]+\s*", "", str(bruto or "").strip())
            if not linha:
                continue
            partes = [parte.strip() for parte in linha.split("|")]
            variant_key_raw = partes[0] if partes else ""
            nome_raw = partes[1] if len(partes) > 1 else variant_key_raw
            template_code_raw = partes[2] if len(partes) > 2 else ""
            uso_raw = partes[3] if len(partes) > 3 else ""

        variant_key = _normalizar_chave_catalogo(variant_key_raw, campo="Código da variante", max_len=80)
        if variant_key in vistos:
            continue
        vistos.add(variant_key)
        variantes.append(
            {
                "variant_key": variant_key,
                "nome_exibicao": _normalizar_texto_curto(
                    str(nome_raw or variant_key_raw),
                    campo="Nome da variante",
                    max_len=120,
                ),
                "template_code": (
                    _normalizar_chave_catalogo(str(template_code_raw), campo="Template code", max_len=80)
                    if str(template_code_raw or "").strip()
                    else None
                ),
                "uso_recomendado": _normalizar_texto_opcional(str(uso_raw or ""), 240),
                "ordem": indice,
            }
        )
    return variantes or None


def _normalizar_status_tecnico_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "draft",
        "draft": "draft",
        "rascunho": "draft",
        "review": "review",
        "revisao": "review",
        "ready": "ready",
        "publicado": "ready",
        "deprecated": "deprecated",
        "arquivado": "deprecated",
        "archived": "deprecated",
    }
    if texto not in aliases:
        raise ValueError("Status técnico inválido.")
    return aliases[texto]


def _normalizar_classificacao_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "family",
        "family": "family",
        "familia": "family",
        "inspection_method": "inspection_method",
        "metodo_inspecao": "inspection_method",
        "evidence_method": "evidence_method",
        "metodo_evidencia": "evidence_method",
    }
    if texto not in aliases:
        raise ValueError("Classificação do catálogo inválida.")
    return aliases[texto]


def _normalizar_lifecycle_status_oferta(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "draft",
        "draft": "draft",
        "rascunho": "draft",
        "testing": "testing",
        "teste": "testing",
        "active": "active",
        "ativo": "active",
        "paused": "paused",
        "pausado": "paused",
        "archived": "archived",
        "arquivado": "archived",
    }
    if texto not in aliases:
        raise ValueError("Lifecycle da oferta inválido.")
    return aliases[texto]


def _normalizar_material_level_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "synthetic",
        "synthetic": "synthetic",
        "sintetico": "synthetic",
        "partial": "partial",
        "parcial": "partial",
        "real_calibrated": "real_calibrated",
        "calibrado": "real_calibrated",
        "real": "real_calibrated",
    }
    if texto not in aliases:
        raise ValueError("Material level inválido.")
    return aliases[texto]


def _normalizar_status_calibracao_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "none",
        "none": "none",
        "nenhum": "none",
        "synthetic_only": "synthetic_only",
        "sintetico": "synthetic_only",
        "partial_real": "partial_real",
        "parcial": "partial_real",
        "real_calibrated": "real_calibrated",
        "calibrado": "real_calibrated",
    }
    if texto not in aliases:
        raise ValueError("Status de calibração inválido.")
    return aliases[texto]


def _normalizar_status_release_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "draft",
        "draft": "draft",
        "rascunho": "draft",
        "active": "active",
        "ativo": "active",
        "paused": "paused",
        "pausado": "paused",
        "expired": "expired",
        "expirado": "expired",
    }
    if texto not in aliases:
        raise ValueError("Status de liberação inválido.")
    return aliases[texto]


def _normalizar_release_channel_catalogo(
    valor: str | None,
    *,
    campo: str,
    allow_empty: bool = True,
) -> str | None:
    try:
        return normalize_release_channel(valor, allow_empty=allow_empty)
    except ValueError as exc:
        raise ValueError(f"{campo} inválido.") from exc


def _normalizar_limite_contractual(
    valor: int | str | None,
    *,
    campo: str,
) -> int | None:
    if valor is None or valor == "":
        return None
    try:
        parsed = int(valor)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{campo} precisa ser inteiro.") from exc
    if parsed < 0:
        raise ValueError(f"{campo} precisa ser zero ou positivo.")
    return parsed


def _normalizar_lista_json_canonica(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
    max_len_item: int = 120,
) -> list[str] | None:
    if valor is None:
        return None
    if isinstance(valor, (list, tuple)):
        itens_brutos = list(valor)
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo=campo)
            if not isinstance(payload, list):
                raise ValueError(f"{campo} precisa ser uma lista JSON.")
            itens_brutos = payload
        else:
            itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        item = _normalizar_chave_catalogo(bruto, campo=campo, max_len=max_len_item)
        if not item or item in vistos:
            continue
        vistos.add(item)
        itens.append(item)
    return itens or None


def _normalizar_nr_key(valor: str, *, family_key: str = "") -> str | None:
    bruto = str(valor or "").strip().lower()
    if not bruto and str(family_key or "").startswith("nr"):
        match = re.match(r"^(nr\d+)", str(family_key or "").strip().lower())
        bruto = match.group(1) if match else ""
    if not bruto:
        return None
    bruto = bruto.replace(" ", "").replace("/", "").replace("-", "")
    match = re.search(r"(nr\d+[a-z]*)", bruto)
    if match:
        return match.group(1)[:40]
    return _normalizar_chave_catalogo(bruto, campo="NR key", max_len=40) or None


def _inferir_classificacao_catalogo(*, family_key: str, nome_exibicao: str = "", macro_categoria: str = "") -> str:
    family_norm = str(family_key or "").strip().lower()
    nome_norm = str(nome_exibicao or "").strip().lower()
    macro_norm = str(macro_categoria or "").strip().lower()
    if family_norm.startswith("end_"):
        return "inspection_method"
    texto = " ".join((family_norm, nome_norm, macro_norm))
    if any(chave in texto for chave, _metodo, _categoria in _CATALOGO_METHOD_HINTS):
        return "inspection_method"
    return "family"


def _metodos_sugeridos_para_familia(*, family_key: str, nome_exibicao: str = "") -> list[dict[str, str]]:
    texto = " ".join((str(family_key or "").strip().lower(), str(nome_exibicao or "").strip().lower()))
    sugestoes: list[dict[str, str]] = []
    vistos: set[str] = set()
    for pista, method_key, categoria in _CATALOGO_METHOD_HINTS:
        if pista not in texto or method_key in vistos:
            continue
        vistos.add(method_key)
        sugestoes.append(
            {
                "method_key": method_key,
                "categoria": categoria,
                "nome_exibicao": method_key.replace("_", " ").title(),
            }
        )
    return sugestoes


def _label_catalogo(mapa: dict[str, tuple[str, str]], chave: str, fallback: str) -> dict[str, str]:
    label, tone = mapa.get(chave, (fallback, "draft"))
    return {"key": chave, "label": label, "tone": tone}


def _humanizar_slug(valor: str) -> str:
    texto = str(valor or "").strip().replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", texto).strip().title()


def _catalogo_modelo_label(codigo: str | None, *, fallback: str | None = None) -> str | None:
    codigo_norm = str(codigo or "").strip()
    if not codigo_norm:
        return fallback
    contract = dict(MASTER_TEMPLATE_REGISTRY.get(codigo_norm) or {})
    if not contract:
        contract = dict(_template_library_registry_index().get(codigo_norm) or {})
    label = str(contract.get("label") or "").strip()
    if label:
        return label
    if re.fullmatch(r"[a-z]{2,4}", codigo_norm.lower()):
        return codigo_norm.upper()
    return _humanizar_slug(codigo_norm) or fallback or codigo_norm


def _catalogo_texto_leitura(valor: str | None, *, fallback: str | None = None) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return fallback
    if re.search(r"[_-]", texto):
        return _humanizar_slug(texto)
    return texto


def _catalogo_scope_summary_label(
    *,
    allowed_modes: list[str] | None,
    allowed_templates: list[str] | None,
    allowed_variants: list[str] | None,
) -> str:
    modos = len(list(allowed_modes or []))
    modelos = len(list(allowed_templates or []))
    opcoes = len(list(allowed_variants or []))
    if modos == 0 and modelos == 0 and opcoes == 0:
        return "Sem recortes extras. A empresa segue a família completa."
    partes: list[str] = []
    if modos:
        partes.append(f"{modos} forma(s) de uso")
    if modelos:
        partes.append(f"{modelos} modelo(s) específico(s)")
    if opcoes:
        partes.append(f"{opcoes} opção(ões) liberada(s)")
    return " • ".join(partes)


def _normalizar_selection_tokens_catalogo(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
) -> list[str] | None:
    if valor is None:
        return None
    if isinstance(valor, (list, tuple)):
        itens_brutos = list(valor)
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo=campo)
            if not isinstance(payload, list):
                raise ValueError(f"{campo} precisa ser uma lista JSON.")
            itens_brutos = payload
        else:
            itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        token = str(bruto or "").strip().lower()
        if not token or token in vistos:
            continue
        vistos.add(token)
        itens.append(token)
    return itens or None


def _normalizar_review_mode_governanca(
    valor: str | None,
    *,
    campo: str,
    allow_empty: bool = True,
) -> str | None:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": None if allow_empty else "mesa_required",
        "inherit": None if allow_empty else "mesa_required",
        "none": None if allow_empty else "mesa_required",
        "mesa_required": "mesa_required",
        "mesa": "mesa_required",
        "mobile_review_allowed": "mobile_review_allowed",
        "mobile_review": "mobile_review_allowed",
        "mobile_review_governed": "mobile_review_allowed",
        "mobile_autonomous": "mobile_autonomous",
        "autonomous": "mobile_autonomous",
        "autonomo": "mobile_autonomous",
    }
    if texto not in aliases:
        raise ValueError(f"{campo} inválido.")
    return aliases[texto]


def _normalizar_override_tristate(
    valor: str | None,
    *,
    campo: str,
) -> bool | None:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": None,
        "inherit": None,
        "padrao": None,
        "allow": True,
        "permitir": True,
        "enabled": True,
        "on": True,
        "deny": False,
        "bloquear": False,
        "disabled": False,
        "off": False,
    }
    if texto not in aliases:
        raise ValueError(f"{campo} inválido.")
    return aliases[texto]


def _normalizar_planos_governanca(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
) -> list[str] | None:
    if valor is None:
        return None
    if isinstance(valor, (list, tuple)):
        itens_brutos = list(valor)
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo=campo)
            if not isinstance(payload, list):
                raise ValueError(f"{campo} precisa ser uma lista JSON.")
            itens_brutos = payload
        else:
            itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        texto = str(bruto or "").strip()
        if not texto:
            continue
        plano = PlanoEmpresa.normalizar(texto)
        if plano in vistos:
            continue
        vistos.add(plano)
        itens.append(plano)
    return itens or None


def _normalizar_red_flags_governanca(
    valor: str | list[dict[str, Any]] | None,
) -> list[dict[str, Any]] | None:
    if valor is None:
        return None
    if isinstance(valor, list):
        itens_brutos = valor
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        payload = _normalizar_json_opcional(texto, campo="Red flags")
        if payload is None:
            return None
        if not isinstance(payload, list):
            raise ValueError("Red flags precisam ser uma lista JSON.")
        itens_brutos = payload

    itens: list[dict[str, Any]] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        if not isinstance(bruto, dict):
            raise ValueError("Cada red flag precisa ser um objeto JSON.")
        title = _normalizar_texto_curto(
            str(bruto.get("title") or bruto.get("titulo") or ""),
            campo="Título da red flag",
            max_len=140,
        )
        message = _normalizar_texto_curto(
            str(bruto.get("message") or bruto.get("mensagem") or ""),
            campo="Mensagem da red flag",
            max_len=400,
        )
        code_raw = str(bruto.get("code") or bruto.get("codigo") or title)
        code = _normalizar_chave_catalogo(code_raw, campo="Código da red flag", max_len=80)
        if code in vistos:
            continue
        vistos.add(code)
        severity_key = str(bruto.get("severity") or "high").strip().lower()
        if severity_key not in _CATALOGO_RED_FLAG_SEVERITY_LABELS:
            raise ValueError("Severidade da red flag inválida.")
        source = _normalizar_texto_opcional(str(bruto.get("source") or "family_policy"), 80) or "family_policy"
        itens.append(
            {
                "code": code,
                "title": title,
                "message": message,
                "severity": severity_key,
                "blocking": bool(bruto.get("blocking", True)),
                "when_missing_required_evidence": bool(
                    bruto.get("when_missing_required_evidence", False)
                ),
                "source": source,
            }
        )
    return itens or None


def _normalizar_features_contractuais(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
) -> list[str] | None:
    itens = _normalizar_lista_json_canonica(valor, campo=campo, max_len_item=80)
    payload = sanitize_contract_entitlements({"included_features": itens or []})
    if payload is None:
        return None
    return list(payload.get("included_features") or []) or None


def _normalizar_bundle_comercial_payload(
    *,
    bundle_key: str = "",
    bundle_label: str = "",
    bundle_summary: str = "",
    bundle_audience: str = "",
    bundle_highlights_text: str = "",
) -> dict[str, Any] | None:
    highlights = _normalizar_lista_textual(
        bundle_highlights_text,
        campo="Destaques do bundle",
        max_len_item=120,
    )
    return sanitize_commercial_bundle(
        {
            "bundle_key": _normalizar_chave_catalogo(bundle_key, campo="Bundle key", max_len=80)
            if str(bundle_key or "").strip()
            else "",
            "bundle_label": _normalizar_texto_opcional(bundle_label, 120),
            "summary": _normalizar_texto_opcional(bundle_summary, 240),
            "audience": _normalizar_texto_opcional(bundle_audience, 120),
            "highlights": highlights or [],
        }
    )


def _normalizar_contract_entitlements_payload(
    *,
    included_features_text: str = "",
    monthly_issues: int | str | None = None,
    max_admin_clients: int | str | None = None,
    max_inspectors: int | str | None = None,
    max_reviewers: int | str | None = None,
    max_active_variants: int | str | None = None,
    max_integrations: int | str | None = None,
) -> dict[str, Any] | None:
    return sanitize_contract_entitlements(
        {
            "included_features": _normalizar_features_contractuais(
                included_features_text,
                campo="Features contratuais",
            )
            or [],
            "limits": {
                "monthly_issues": _normalizar_limite_contractual(
                    monthly_issues,
                    campo="Limite mensal de emissões",
                ),
                "max_admin_clients": _normalizar_limite_contractual(
                    max_admin_clients,
                    campo="Limite de admins-cliente",
                ),
                "max_inspectors": _normalizar_limite_contractual(
                    max_inspectors,
                    campo="Limite de inspetores",
                ),
                "max_reviewers": _normalizar_limite_contractual(
                    max_reviewers,
                    campo="Limite de revisores",
                ),
                "max_active_variants": _normalizar_limite_contractual(
                    max_active_variants,
                    campo="Limite de variantes ativas",
                ),
                "max_integrations": _normalizar_limite_contractual(
                    max_integrations,
                    campo="Limite de integrações",
                ),
            },
        }
    )


def _review_mode_label_meta(review_mode: str | None) -> dict[str, str]:
    resolved = (
        _normalizar_review_mode_governanca(review_mode, campo="Review mode")
        if review_mode
        else None
    )
    if resolved is None:
        return {"key": "inherit", "label": "Herdado", "tone": "idle"}
    return _label_catalogo(
        _CATALOGO_REVIEW_MODE_LABELS,
        resolved,
        resolved.replace("_", " "),
    )


def _override_choice_label(value: bool | None) -> dict[str, str]:
    key = "inherit" if value is None else "allow" if value else "deny"
    tone = "idle" if value is None else "active" if value else "review"
    return {
        "key": key,
        "label": _CATALOGO_REVIEW_OVERRIDE_LABELS[key],
        "tone": tone,
    }


def _red_flag_severity_meta(severity: str | None) -> dict[str, str]:
    key = str(severity or "high").strip().lower()
    return _label_catalogo(
        _CATALOGO_RED_FLAG_SEVERITY_LABELS,
        key,
        key or "high",
    )


def _effective_review_mode_cap(*review_modes: str | None) -> str | None:
    normalized = [
        mode
        for mode in (
            _normalizar_review_mode_governanca(item, campo="Review mode")
            if item is not None
            else None
            for item in review_modes
        )
        if mode is not None
    ]
    if not normalized:
        return None
    return sorted(normalized, key=lambda item: _REVIEW_MODE_ORDER[item], reverse=True)[0]


def _merge_review_policy_governance(
    base_policy: dict[str, Any] | None,
    *,
    default_review_mode: str | None,
    max_review_mode: str | None,
    requires_family_lock: bool,
    block_on_scope_mismatch: bool,
    block_on_missing_required_evidence: bool,
    block_on_critical_field_absent: bool,
    blocking_conditions: list[str] | None,
    non_blocking_conditions: list[str] | None,
    red_flags: list[dict[str, Any]] | None,
    requires_release_active: bool,
    requires_upload_doc_for_mobile_autonomous: bool,
    mobile_review_allowed_plans: list[str] | None,
    mobile_autonomous_allowed_plans: list[str] | None,
) -> dict[str, Any]:
    return _governance_merge_review_policy(
        base_policy,
        default_review_mode=default_review_mode,
        max_review_mode=max_review_mode,
        requires_family_lock=requires_family_lock,
        block_on_scope_mismatch=block_on_scope_mismatch,
        block_on_missing_required_evidence=block_on_missing_required_evidence,
        block_on_critical_field_absent=block_on_critical_field_absent,
        blocking_conditions=blocking_conditions,
        non_blocking_conditions=non_blocking_conditions,
        red_flags=red_flags,
        requires_release_active=requires_release_active,
        requires_upload_doc_for_mobile_autonomous=requires_upload_doc_for_mobile_autonomous,
        mobile_review_allowed_plans=mobile_review_allowed_plans,
        mobile_autonomous_allowed_plans=mobile_autonomous_allowed_plans,
    )


def _merge_release_governance_policy(
    base_policy: dict[str, Any] | None,
    *,
    force_review_mode: str | None,
    max_review_mode: str | None,
    mobile_review_override: bool | None,
    mobile_autonomous_override: bool | None,
    release_channel_override: str | None,
    contract_entitlements: dict[str, Any] | None,
) -> dict[str, Any] | None:
    return _governance_merge_release_policy(
        base_policy,
        force_review_mode=force_review_mode,
        max_review_mode=max_review_mode,
        mobile_review_override=mobile_review_override,
        mobile_autonomous_override=mobile_autonomous_override,
        release_channel_override=release_channel_override,
        contract_entitlements=contract_entitlements,
    )


def _resumir_governanca_review_policy(review_policy: Any) -> dict[str, Any]:
    return _governance_resumir_review_policy(
        review_policy,
        normalizar_red_flags=_normalizar_red_flags_governanca,
        normalizar_lista_textual=_normalizar_lista_textual,
        normalizar_planos=_normalizar_planos_governanca,
        review_mode_label_meta=_review_mode_label_meta,
        red_flag_severity_meta=_red_flag_severity_meta,
    )


def _resumir_governanca_release_policy(governance_policy: Any) -> dict[str, Any]:
    return _governance_resumir_release_policy(
        governance_policy,
        normalizar_review_mode=_normalizar_review_mode_governanca,
        effective_review_mode_cap=_effective_review_mode_cap,
        review_mode_label_meta=_review_mode_label_meta,
        override_choice_label=_override_choice_label,
    )


def _review_mode_display_order() -> tuple[str, str, str]:
    return _governance_review_mode_display_order()


def _review_mode_with_cap(requested_mode: str, cap_mode: str | None) -> str:
    return _governance_review_mode_with_cap(
        requested_mode,
        cap_mode,
        review_mode_order=_REVIEW_MODE_ORDER,
    )


def _plan_allowed_for_governance_rollup(
    *,
    plan_name: str | None,
    allowed_plans: list[str],
) -> bool:
    return _governance_plan_allowed(
        plan_name=plan_name,
        allowed_plans=allowed_plans,
        normalizar_plano_empresa=PlanoEmpresa.normalizar,
    )


def _strictest_review_mode(counter: Counter[str]) -> str | None:
    return _governance_strictest_review_mode(
        counter,
        review_mode_order=_REVIEW_MODE_ORDER,
    )


def _dominant_review_mode(counter: Counter[str]) -> str | None:
    return _governance_dominant_review_mode(
        counter,
        review_mode_order=_REVIEW_MODE_ORDER,
    )


def _format_review_mode_breakdown(counter: Counter[str]) -> str:
    return _governance_format_review_mode_breakdown(
        counter,
        review_mode_label_meta=_review_mode_label_meta,
    )


def _release_channel_display_order() -> tuple[str, str, str]:
    return ("pilot", "limited_release", "general_release")


def _dominant_release_channel(counter: Counter[str], *, fallback: str = "pilot") -> str:
    return _governance_dominant_release_channel(
        counter,
        release_channel_order=RELEASE_CHANNEL_ORDER,
        fallback=fallback,
    )


def _build_review_mode_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    tenant_sets: dict[str, set[int]] | None = None,
    family_sets: dict[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    return _governance_build_review_mode_counter_rows(
        counter,
        total=total,
        review_mode_label_meta=_review_mode_label_meta,
        tenant_sets=tenant_sets,
        family_sets=family_sets,
    )


def _build_release_channel_counter_rows(
    counter: Counter[str],
    *,
    total: int,
    tenant_sets: dict[str, set[int]] | None = None,
    family_sets: dict[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    return _governance_build_release_channel_counter_rows(
        counter,
        total=total,
        release_channel_meta=release_channel_meta,
        tenant_sets=tenant_sets,
        family_sets=family_sets,
    )


def _build_release_status_counter_rows(counter: Counter[str], *, total: int) -> list[dict[str, Any]]:
    return _governance_build_release_status_counter_rows(
        counter,
        total=total,
        label_catalogo=_label_catalogo,
        release_status_labels=_CATALOGO_RELEASE_STATUS_LABELS,
    )


def _resolve_governance_rollup_release_mode(
    *,
    family: FamiliaLaudoCatalogo,
    release: TenantFamilyReleaseLaudo,
    tenant: Empresa | None,
) -> dict[str, Any]:
    return _governance_resolve_release_mode(
        family=family,
        release=release,
        tenant=tenant,
        normalizar_review_mode=_normalizar_review_mode_governanca,
        effective_review_mode_cap=_effective_review_mode_cap,
        normalizar_planos=_normalizar_planos_governanca,
        summarize_release_contract_governance=summarize_release_contract_governance,
        offer_lifecycle_resolvido=_offer_lifecycle_resolvido,
        normalizar_red_flags=_normalizar_red_flags_governanca,
        normalizar_plano_empresa=PlanoEmpresa.normalizar,
        review_mode_order=_REVIEW_MODE_ORDER,
    )


def _build_catalog_governance_rollup(
    db: Session,
    *,
    families: list[FamiliaLaudoCatalogo],
) -> dict[str, Any]:
    return _governance_build_catalog_rollup(
        db,
        families=families,
        empresa_model=Empresa,
        tenant_cliente_clause=_tenant_cliente_clause,
        normalizar_review_mode=_normalizar_review_mode_governanca,
        normalizar_red_flags=_normalizar_red_flags_governanca,
        review_mode_label_meta=_review_mode_label_meta,
        normalizar_planos=_normalizar_planos_governanca,
        effective_review_mode_cap=_effective_review_mode_cap,
        summarize_release_contract_governance=summarize_release_contract_governance,
        offer_lifecycle_resolvido=_offer_lifecycle_resolvido,
        normalizar_plano_empresa=PlanoEmpresa.normalizar,
        release_channel_meta=release_channel_meta,
        review_mode_order=_REVIEW_MODE_ORDER,
        release_channel_order=RELEASE_CHANNEL_ORDER,
        label_catalogo=_label_catalogo,
        release_status_labels=_CATALOGO_RELEASE_STATUS_LABELS,
    )


def _repo_root_dir() -> Path:
    return _catalog_canonical_schema_services._repo_root_dir()


def _family_schemas_dir() -> Path:
    candidate = (_repo_root_dir() / "docs" / "family_schemas").resolve()
    if candidate.is_dir():
        return candidate
    return _catalog_canonical_schema_services.family_schemas_dir()


def _family_schema_file_path(family_key: str) -> Path:
    return _catalog_canonical_schema_services.family_schema_file_path(
        family_key,
        directory=_family_schemas_dir(),
        normalize_family_key=_normalizar_chave_catalogo,
    )


def _family_artifact_file_path(family_key: str, artifact_suffix: str) -> Path:
    return _catalog_canonical_schema_services.family_artifact_file_path(
        family_key,
        artifact_suffix,
        directory=_family_schemas_dir(),
        normalize_family_key=_normalizar_chave_catalogo,
    )


def _ler_json_arquivo(path: Path, *, campo: str) -> dict[str, Any]:
    return _catalog_canonical_schema_services._read_json_file(path, field_name=campo)


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


def listar_family_schemas_canonicos() -> list[dict[str, Any]]:
    return _catalog_canonical_schema_services.list_canonical_family_schemas(
        directory=_family_schemas_dir(),
        normalize_family_key=_normalizar_chave_catalogo,
        infer_catalog_classification=_inferir_classificacao_catalogo,
    )


def carregar_family_schema_canonico(family_key: str) -> dict[str, Any]:
    return _catalog_canonical_schema_services.load_canonical_family_schema(
        family_key,
        directory=_family_schemas_dir(),
        normalize_family_key=_normalizar_chave_catalogo,
    )


def _buscar_familia_catalogo_por_chave(db: Session, family_key: str) -> FamiliaLaudoCatalogo:
    family_key_norm = _normalizar_chave_catalogo(family_key, campo="Família", max_len=120)
    familia = db.scalar(select(FamiliaLaudoCatalogo).where(FamiliaLaudoCatalogo.family_key == family_key_norm))
    if familia is None:
        raise ValueError("Família do catálogo não encontrada.")
    return familia


def _catalog_family_artifact_snapshot(family_key: str) -> dict[str, bool]:
    family_key_norm = _normalizar_chave_catalogo(family_key, campo="Family key", max_len=120)
    return {
        "has_family_schema": _family_schema_file_path(family_key_norm).exists(),
        "has_template_seed": _family_artifact_file_path(family_key_norm, ".template_master_seed.json").exists(),
        "has_laudo_output_seed": _family_artifact_file_path(family_key_norm, ".laudo_output_seed.json").exists(),
        "has_laudo_output_exemplo": _family_artifact_file_path(family_key_norm, ".laudo_output_exemplo.json").exists(),
    }


def _repo_relative_path_label(path: Path | None) -> str | None:
    if path is None:
        return None
    canonical_label = canonical_docs_logical_path(path)
    if canonical_label is not None:
        return canonical_label
    try:
        return str(path.resolve().relative_to(_repo_root_dir())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def _template_library_registry_path() -> Path:
    return _admin_catalog_assets_registry_path(
        dependencies={
            "repo_root_dir": _repo_root_dir,
            "resolve_master_templates_dir": resolve_master_templates_dir,
        },
    )


def _load_template_library_registry() -> dict[str, Any]:
    return _admin_catalog_assets_load_template_registry(
        dependencies={
            "template_library_registry_path": _template_library_registry_path,
            "ler_json_arquivo": _ler_json_arquivo,
        },
    )


def _build_template_library_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    return _admin_catalog_assets_build_template_rollup(
        rows_all,
        dependencies={
            "load_template_library_registry": _load_template_library_registry,
            "repo_relative_path_label": _repo_relative_path_label,
            "template_library_registry_path": _template_library_registry_path,
            "label_catalogo": _label_catalogo,
        },
    )


def _template_library_registry_index() -> dict[str, dict[str, Any]]:
    return _admin_catalog_assets_registry_index(
        dependencies={
            "load_template_library_registry": _load_template_library_registry,
        },
    )


def _material_real_workspace_roots() -> list[Path]:
    return _admin_catalog_assets_material_roots(
        dependencies={
            "repo_root_dir": _repo_root_dir,
        },
    )


def _find_material_real_workspace(family_key: str) -> Path | None:
    return _admin_catalog_assets_find_material_workspace(
        family_key,
        dependencies={
            "normalizar_chave_catalogo": _normalizar_chave_catalogo,
            "material_real_workspace_roots": _material_real_workspace_roots,
        },
    )


def _read_json_if_exists(path: Path) -> dict[str, Any] | None:
    return _admin_catalog_assets_read_json_if_exists(path)


def _build_material_real_workspace_summary(family_key: str) -> dict[str, Any] | None:
    return _admin_catalog_material_workspace_summary(
        family_key,
        dependencies={
            "find_material_real_workspace": _find_material_real_workspace,
            "read_json_if_exists": _read_json_if_exists,
            "label_catalogo": _label_catalogo,
            "material_workspace_status_labels": _CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
            "build_material_real_execution_track": _build_material_real_execution_track,
            "build_material_real_worklist": _build_material_real_worklist,
            "repo_relative_path_label": _repo_relative_path_label,
        },
    )


def _build_material_real_priority_summary(
    row: dict[str, Any],
    material_real_workspace: dict[str, Any] | None,
) -> dict[str, Any]:
    return _admin_catalog_material_priority_summary(
        row,
        material_real_workspace,
        dependencies={
            "label_catalogo": _label_catalogo,
            "material_priority_labels": _CATALOGO_MATERIAL_PRIORITY_LABELS,
            "material_workspace_status_labels": _CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
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
    return _admin_catalog_material_worklist_item(
        task_id=task_id,
        title=title,
        done=done,
        blocking=blocking,
        deliverable=deliverable,
        owner=owner,
        dependencies={
            "label_catalogo": _label_catalogo,
            "material_worklist_status_labels": _CATALOGO_MATERIAL_WORKLIST_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
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
            "material_execution_track_presets": _MATERIAL_REAL_EXECUTION_TRACK_PRESETS,
            "label_catalogo": _label_catalogo,
            "material_worklist_phase_labels": _CATALOGO_MATERIAL_WORKLIST_PHASE_LABELS,
            "material_workspace_status_labels": _CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
            "catalogo_modelo_label": _catalogo_modelo_label,
            "resolve_master_template_id_for_family": resolve_master_template_id_for_family,
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
    return _admin_catalog_preview_section_status(
        chain_complete=chain_complete,
        has_reference_pack=has_reference_pack,
        calibration_key=calibration_key,
        dependencies={
            "label_catalogo": _label_catalogo,
            "document_preview_status_labels": _CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
        },
    )


def _showcase_preview_status(*, chain_complete: bool) -> dict[str, str]:
    return _admin_catalog_showcase_preview_status(
        chain_complete=chain_complete,
        dependencies={
            "label_catalogo": _label_catalogo,
            "showcase_status_labels": _CATALOGO_SHOWCASE_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
        },
    )


def _material_preview_status(*, has_reference_pack: bool, calibration_key: str) -> dict[str, str]:
    return _admin_catalog_material_preview_status(
        has_reference_pack=has_reference_pack,
        calibration_key=calibration_key,
        dependencies={
            "label_catalogo": _label_catalogo,
            "material_preview_status_labels": _CATALOGO_MATERIAL_PREVIEW_STATUS_LABELS,
            "humanizar_slug": _humanizar_slug,
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
            "label_catalogo": _label_catalogo,
            "document_preview_status_labels": _CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS,
            "catalogo_modelo_label": _catalogo_modelo_label,
        },
    )


def _build_catalog_home_document_preview(
    *,
    family: FamiliaLaudoCatalogo,
    row: dict[str, Any],
    metodos_catalogo: list[Any],
) -> dict[str, Any]:
    return _admin_catalog_build_home_document_preview(
        family=family,
        row=row,
        metodos_catalogo=metodos_catalogo,
        dependencies={
            "catalog_family_artifact_snapshot": _catalog_family_artifact_snapshot,
            "build_material_real_workspace_summary": _build_material_real_workspace_summary,
            "carregar_family_schema_canonico": carregar_family_schema_canonico,
            "label_catalogo": _label_catalogo,
            "calibration_status_labels": _CATALOGO_CALIBRATION_STATUS_LABELS,
            "calibracao_status_resolvido": _calibracao_status_resolvido,
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
    variants = list((offer or {}).get("variants") or [])
    operational_runtime_ready = bool(
        artifact_snapshot.get("has_template_seed") and artifact_snapshot.get("has_laudo_output_seed")
    )
    cards: list[dict[str, Any]] = []
    template_codes: set[str] = set()
    template_usage_counter: Counter[str] = Counter()
    for item in variants:
        template_code = str(item.get("template_code") or "").strip() or None
        if template_code:
            template_codes.add(template_code)
            template_usage_counter[template_code] += 1
        if template_code and operational_runtime_ready:
            status_key = "operational"
        elif template_code:
            status_key = "template_mapped"
        else:
            status_key = "needs_template"
        variant_key = str(item.get("variant_key") or "").strip() or "variant_sem_chave"
        cards.append(
            {
                "variant_key": variant_key,
                "label": str(item.get("nome_exibicao") or variant_key).strip() or variant_key,
                "template_code": template_code,
                "template_label": _catalogo_modelo_label(template_code, fallback="Modelo em definição"),
                "usage": str(item.get("uso_recomendado") or "").strip() or None,
                "selection_token": f"catalog:{str(family_key).strip().lower()}:{variant_key.lower()}",
                "status": _label_catalogo(
                    _CATALOGO_VARIANT_LIBRARY_STATUS_LABELS,
                    status_key,
                    _humanizar_slug(status_key) or "Variante",
                ),
            }
        )
    ambiguous_template_count = sum(1 for count in template_usage_counter.values() if count > 1)
    return {
        "variant_count": len(cards),
        "template_mapped_count": sum(1 for item in cards if item["template_code"]),
        "operational_count": sum(1 for item in cards if item["status"]["key"] == "operational"),
        "unique_template_count": len(template_codes),
        "ambiguous_template_count": ambiguous_template_count,
        "selection_guidance": (
            "Escolha a opção de uso explicitamente quando duas opções compartilham a mesma apresentação do documento."
            if ambiguous_template_count
            else "Cada opção pode ter narrativa e uso recomendado próprios sem misturar a apresentação do documento."
        ),
        "variants": cards,
        "release_signal": (
            f"{active_release_count} empresa(s) já usam esta família."
            if active_release_count > 0
            else "Ainda sem empresas liberadas para esta família."
        ),
    }


def _build_template_refinement_target(
    *,
    family_key: str,
    display_name: str,
    material_real_priority: dict[str, Any],
    variant_library: dict[str, Any],
    template_default_code: str | None,
    active_release_count: int,
) -> dict[str, Any]:
    master_template_id = resolve_master_template_id_for_family(family_key)
    contract = dict(MASTER_TEMPLATE_REGISTRY.get(master_template_id) or {})
    registry_entry = _template_library_registry_index().get(master_template_id)
    priority_key = str((material_real_priority.get("status") or {}).get("key") or "")
    if registry_entry is None:
        status_key = "registry_gap"
    elif priority_key in {"immediate", "active_queue"}:
        status_key = "refinement_due"
    elif priority_key == "resolved":
        status_key = "continuous"
    else:
        status_key = "mapped"

    recommended_actions: list[str] = []
    if status_key == "registry_gap":
        recommended_actions.extend(
            [
                "Registrar o modelo oficial desta família na biblioteca documental.",
                "Preparar a estrutura do documento e a saída base para abrir a vitrine comercial.",
            ]
        )
    else:
        recommended_actions.append(
            "Refinar o modelo oficial com os aprendizados do material real e da Mesa."
        )
        if int(variant_library.get("variant_count") or 0) > 0:
            recommended_actions.append(
                "Garantir que as opções comerciais herdem a mesma apresentação premium do documento."
            )
        if active_release_count > 0:
            recommended_actions.append(
                "Priorizar este ajuste porque já existe empresa operando a família."
            )
    template_default_label = _catalogo_modelo_label(template_default_code)
    signals = [
        item
        for item in (
            f"{active_release_count} empresa(s) ativa(s)" if active_release_count > 0 else "",
            f"{int(variant_library.get('variant_count') or 0)} opção(ões) comercial(is)"
            if int(variant_library.get("variant_count") or 0) > 0
            else "",
            f"Modelo principal: {template_default_label}" if template_default_label else "",
        )
        if item
    ]
    resolved_label = str(contract.get("label") or "").strip() or (
        str(registry_entry.get("label") or "").strip() if registry_entry is not None else master_template_id
    )
    resolved_summary = str(contract.get("summary") or "").strip() or (
        str(registry_entry.get("usage") or "").strip() if registry_entry is not None else ""
    )
    resolved_documental_type = str(contract.get("documental_type") or "").strip() or (
        str(registry_entry.get("documental_type") or "").strip() if registry_entry is not None else ""
    )
    return {
        "master_template_id": master_template_id,
        "label": resolved_label,
        "summary": resolved_summary or None,
        "documental_type": resolved_documental_type or None,
        "artifact_path": str(
            ((registry_entry or {}).get("artifact_path") or contract.get("seed_path") or "")
        ).strip()
        or None,
        "registry_registered": registry_entry is not None,
        "registry_label": str(registry_entry.get("label") or "").strip() or None if registry_entry else None,
        "template_default_code": template_default_code,
        "template_default_label": template_default_label,
        "family_label": display_name,
        "signals": signals[:3],
        "recommended_actions": recommended_actions[:3],
        "status": _label_catalogo(
            _CATALOGO_TEMPLATE_REFINEMENT_STATUS_LABELS,
            status_key,
            _humanizar_slug(status_key) or "Template",
        ),
    }


def _build_calibration_queue_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    actionable_items: list[dict[str, Any]] = []
    template_pressure_counter: dict[str, dict[str, Any]] = {}
    for row in rows_all:
        family_key = str(row.get("family_key") or "")
        workspace = _build_material_real_workspace_summary(family_key)
        priority = _build_material_real_priority_summary(row, workspace)
        execution_track = dict((workspace or {}).get("execution_track") or {})
        worklist = dict((workspace or {}).get("worklist") or {})
        priority_key = str((priority.get("status") or {}).get("key") or "")
        if priority_key == "resolved":
            continue
        variant_library = {
            "variant_count": int(row.get("variant_count") or 0),
        }
        target = _build_template_refinement_target(
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
                "status": _label_catalogo(
                    _CATALOGO_MATERIAL_PRIORITY_LABELS,
                    key,
                    _humanizar_slug(key) or "Prioridade",
                ),
                "count": int(priority_counter.get(key, 0)),
            }
            for key in ("immediate", "active_queue", "waiting_material", "bootstrap")
        ],
        "highlights": actionable_items[:6],
        "template_targets": template_targets[:6],
    }


def _build_material_real_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
    workspace_by_family = {
        str(row["family_key"]): _build_material_real_workspace_summary(str(row["family_key"]))
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
            "priority": _build_material_real_priority_summary(
                row,
                workspace_by_family.get(str(row["family_key"])),
            ),
        }
        for row in rows_all
    ]
    priority_rows.sort(
        key=lambda item: (
            -int(_dict_payload_admin(item.get("priority")).get("priority_rank") or 0),
            str(item["display_name"]).lower(),
        )
    )
    priority_counter = Counter(
        str(
            _dict_payload_admin(
                _dict_payload_admin(item.get("priority")).get("status")
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
                "status": _label_catalogo(
                    _CATALOGO_MATERIAL_PRIORITY_LABELS,
                    key,
                    _humanizar_slug(key) or "Prioridade",
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
                "status": _dict_payload_admin(item.get("priority")).get("status"),
                "workspace_path": item.get("workspace_path"),
                "next_action": (
                    _dict_payload_admin(item.get("priority")).get("recommended_actions")
                    or [None]
                )[0],
            }
            for item in priority_rows[:6]
        ],
    }


def _build_commercial_scale_rollup(rows_all: list[dict[str, Any]]) -> dict[str, Any]:
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
            bundle_key = _normalizar_chave_catalogo(
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
                "channel": release_channel_meta(channel),
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
                        _humanizar_slug(key),
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


def _upsert_metodos_catalogo_para_familia(
    db: Session,
    *,
    familia: FamiliaLaudoCatalogo,
    criado_por_id: int | None = None,
) -> list[MetodoCatalogoInspecao]:
    itens = _metodos_sugeridos_para_familia(
        family_key=str(getattr(familia, "family_key", "") or ""),
        nome_exibicao=str(getattr(familia, "nome_exibicao", "") or ""),
    )
    registros: list[MetodoCatalogoInspecao] = []
    for item in itens:
        method_key = _normalizar_chave_catalogo(item["method_key"], campo="Method key", max_len=80)
        registro = db.scalar(select(MetodoCatalogoInspecao).where(MetodoCatalogoInspecao.method_key == method_key))
        if registro is None:
            registro = MetodoCatalogoInspecao(
                method_key=method_key,
                nome_exibicao=_normalizar_texto_curto(item["nome_exibicao"], campo="Método", max_len=120),
                categoria=item["categoria"],
                criado_por_id=criado_por_id,
                ativo=True,
            )
            db.add(registro)
        registros.append(registro)
    return registros


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


def _serializar_familia_catalogo_row(
    familia: FamiliaLaudoCatalogo,
    *,
    artifact_snapshot: dict[str, bool] | None = None,
) -> dict[str, Any]:
    oferta = getattr(familia, "oferta_comercial", None)
    commercial_governance = summarize_offer_commercial_governance(
        getattr(oferta, "flags_json", None) if oferta is not None else None,
        offer_lifecycle_status=_offer_lifecycle_resolvido(oferta),
    )
    technical_status = str(getattr(familia, "technical_status", "") or "").strip().lower() or _normalizar_status_tecnico_catalogo(
        str(getattr(familia, "status_catalogo", "") or "")
    )
    lifecycle_status = _offer_lifecycle_resolvido(oferta)
    calibration_status = _calibracao_status_resolvido(familia, oferta)
    snapshots = artifact_snapshot or _catalog_family_artifact_snapshot(str(familia.family_key))
    active_release_count = _total_releases_ativas_familia(familia)
    readiness = derivar_prontidao_catalogo(
        technical_status=technical_status,
        has_template_seed=bool(snapshots["has_template_seed"]),
        has_laudo_output_seed=bool(snapshots["has_laudo_output_seed"]),
        offer_lifecycle_status=lifecycle_status,
        calibration_status=calibration_status,
        active_release_count=active_release_count,
    )
    technical = _label_catalogo(_CATALOGO_TECHNICAL_STATUS_LABELS, technical_status, technical_status or "N/D")
    commercial = (
        _label_catalogo(_CATALOGO_LIFECYCLE_STATUS_LABELS, lifecycle_status, lifecycle_status or "Sem oferta")
        if lifecycle_status
        else {"key": "none", "label": "Sem oferta", "tone": "idle"}
    )
    calibration = _label_catalogo(
        _CATALOGO_CALIBRATION_STATUS_LABELS,
        calibration_status,
        calibration_status or "Sem leitura",
    )
    readiness_meta = _label_catalogo(_CATALOGO_READINESS_LABELS, readiness, readiness)
    modes = list(getattr(familia, "modos_tecnicos", None) or [])
    variants = catalog_offer_variants(familia, oferta)
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
        "plan_distribution": _catalog_plan_distribution_summary(familia),
        "template_default_code": str(getattr(oferta, "template_default_code", "") or "").strip() or None,
        "offer_showcase_enabled": bool(getattr(oferta, "showcase_enabled", False)) if oferta is not None else False,
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


def upsert_familia_catalogo(
    db: Session,
    *,
    family_key: str,
    nome_exibicao: str,
    macro_categoria: str = "",
    nr_key: str = "",
    descricao: str = "",
    status_catalogo: str = "rascunho",
    technical_status: str = "",
    catalog_classification: str = "",
    schema_version: int = 1,
    evidence_policy_json_text: str = "",
    review_policy_json_text: str = "",
    output_schema_seed_json_text: str = "",
    governance_metadata_json_text: str = "",
    criado_por_id: int | None = None,
) -> FamiliaLaudoCatalogo:
    return _catalog_family_write_services.upsert_familia_catalogo(
        db,
        family_key=family_key,
        nome_exibicao=nome_exibicao,
        macro_categoria=macro_categoria,
        nr_key=nr_key,
        descricao=descricao,
        status_catalogo=status_catalogo,
        technical_status=technical_status,
        catalog_classification=catalog_classification,
        schema_version=schema_version,
        evidence_policy_json_text=evidence_policy_json_text,
        review_policy_json_text=review_policy_json_text,
        output_schema_seed_json_text=output_schema_seed_json_text,
        governance_metadata_json_text=governance_metadata_json_text,
        criado_por_id=criado_por_id,
    )


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
    familia = _buscar_familia_catalogo_por_chave(db, family_key)
    review_policy = _merge_review_policy_governance(
        dict(getattr(familia, "review_policy_json", None) or {})
        if isinstance(getattr(familia, "review_policy_json", None), dict)
        else {},
        default_review_mode=_normalizar_review_mode_governanca(
            default_review_mode,
            campo="Modo padrão de revisão",
        ),
        max_review_mode=_normalizar_review_mode_governanca(
            max_review_mode,
            campo="Modo máximo de revisão",
        ),
        requires_family_lock=bool(requires_family_lock),
        block_on_scope_mismatch=bool(block_on_scope_mismatch),
        block_on_missing_required_evidence=bool(block_on_missing_required_evidence),
        block_on_critical_field_absent=bool(block_on_critical_field_absent),
        blocking_conditions=_normalizar_lista_textual(
            blocking_conditions_text,
            campo="Condições bloqueantes",
        ),
        non_blocking_conditions=_normalizar_lista_textual(
            non_blocking_conditions_text,
            campo="Condições não bloqueantes",
        ),
        red_flags=_normalizar_red_flags_governanca(red_flags_json_text),
        requires_release_active=bool(requires_release_active),
        requires_upload_doc_for_mobile_autonomous=bool(
            requires_upload_doc_for_mobile_autonomous
        ),
        mobile_review_allowed_plans=_normalizar_planos_governanca(
            mobile_review_allowed_plans_text,
            campo="Planos com revisão mobile",
        ),
        mobile_autonomous_allowed_plans=_normalizar_planos_governanca(
            mobile_autonomous_allowed_plans_text,
            campo="Planos com autonomia mobile",
        ),
    )
    familia.review_policy_json = review_policy
    if criado_por_id and not familia.criado_por_id:
        familia.criado_por_id = criado_por_id

    flush_ou_rollback_integridade(
        db,
        logger_operacao=logger,
        mensagem_erro="Não foi possível salvar a governança de revisão da família.",
    )
    return familia


def upsert_oferta_comercial_familia(
    db: Session,
    *,
    family_key: str,
    offer_key: str = "",
    family_mode_key: str = "",
    nome_oferta: str = "",
    descricao_comercial: str = "",
    pacote_comercial: str = "",
    prazo_padrao_dias: int | str | None = None,
    ativo_comercial: bool = False,
    lifecycle_status: str = "",
    showcase_enabled: bool | None = None,
    versao_oferta: int = 1,
    material_real_status: str = "sintetico",
    material_level: str = "",
    escopo_comercial_text: str = "",
    exclusoes_text: str = "",
    insumos_minimos_text: str = "",
    variantes_comerciais_text: str = "",
    release_channel: str = "",
    bundle_key: str = "",
    bundle_label: str = "",
    bundle_summary: str = "",
    bundle_audience: str = "",
    bundle_highlights_text: str = "",
    included_features_text: str = "",
    entitlement_monthly_issues: int | str | None = None,
    entitlement_max_admin_clients: int | str | None = None,
    entitlement_max_inspectors: int | str | None = None,
    entitlement_max_reviewers: int | str | None = None,
    entitlement_max_active_variants: int | str | None = None,
    entitlement_max_integrations: int | str | None = None,
    template_default_code: str = "",
    flags_json_text: str = "",
    criado_por_id: int | None = None,
) -> OfertaComercialFamiliaLaudo:
    return _catalog_offer_write_services.upsert_oferta_comercial_familia(
        db,
        family_key=family_key,
        offer_key=offer_key,
        family_mode_key=family_mode_key,
        nome_oferta=nome_oferta,
        descricao_comercial=descricao_comercial,
        pacote_comercial=pacote_comercial,
        prazo_padrao_dias=prazo_padrao_dias,
        ativo_comercial=ativo_comercial,
        lifecycle_status=lifecycle_status,
        showcase_enabled=showcase_enabled,
        versao_oferta=versao_oferta,
        material_real_status=material_real_status,
        material_level=material_level,
        escopo_comercial_text=escopo_comercial_text,
        exclusoes_text=exclusoes_text,
        insumos_minimos_text=insumos_minimos_text,
        variantes_comerciais_text=variantes_comerciais_text,
        release_channel=release_channel,
        bundle_key=bundle_key,
        bundle_label=bundle_label,
        bundle_summary=bundle_summary,
        bundle_audience=bundle_audience,
        bundle_highlights_text=bundle_highlights_text,
        included_features_text=included_features_text,
        entitlement_monthly_issues=entitlement_monthly_issues,
        entitlement_max_admin_clients=entitlement_max_admin_clients,
        entitlement_max_inspectors=entitlement_max_inspectors,
        entitlement_max_reviewers=entitlement_max_reviewers,
        entitlement_max_active_variants=entitlement_max_active_variants,
        entitlement_max_integrations=entitlement_max_integrations,
        template_default_code=template_default_code,
        flags_json_text=flags_json_text,
        criado_por_id=criado_por_id,
    )


def upsert_modo_tecnico_familia(
    db: Session,
    *,
    family_key: str,
    mode_key: str,
    nome_exibicao: str,
    descricao: str = "",
    regras_adicionais_json_text: str = "",
    compatibilidade_template_json_text: str = "",
    compatibilidade_oferta_json_text: str = "",
    ativo: bool = True,
    criado_por_id: int | None = None,
) -> ModoTecnicoFamiliaLaudo:
    return _catalog_family_runtime_write_services.upsert_modo_tecnico_familia(
        db,
        family_key=family_key,
        mode_key=mode_key,
        nome_exibicao=nome_exibicao,
        descricao=descricao,
        regras_adicionais_json_text=regras_adicionais_json_text,
        compatibilidade_template_json_text=compatibilidade_template_json_text,
        compatibilidade_oferta_json_text=compatibilidade_oferta_json_text,
        ativo=ativo,
        criado_por_id=criado_por_id,
    )


def upsert_calibracao_familia(
    db: Session,
    *,
    family_key: str,
    calibration_status: str,
    reference_source: str = "",
    last_calibrated_at: datetime | None = None,
    summary_of_adjustments: str = "",
    changed_fields_json_text: str = "",
    changed_language_notes: str = "",
    attachments_json_text: str = "",
    criado_por_id: int | None = None,
) -> CalibracaoFamiliaLaudo:
    return _catalog_family_runtime_write_services.upsert_calibracao_familia(
        db,
        family_key=family_key,
        calibration_status=calibration_status,
        reference_source=reference_source,
        last_calibrated_at=last_calibrated_at,
        summary_of_adjustments=summary_of_adjustments,
        changed_fields_json_text=changed_fields_json_text,
        changed_language_notes=changed_language_notes,
        attachments_json_text=attachments_json_text,
        criado_por_id=criado_por_id,
    )


def importar_familia_canonica_para_catalogo(
    db: Session,
    *,
    family_key: str,
    status_catalogo: str = "publicado",
    criado_por_id: int | None = None,
) -> FamiliaLaudoCatalogo:
    return _catalog_family_write_services.importar_familia_canonica_para_catalogo(
        db,
        family_key=family_key,
        status_catalogo=status_catalogo,
        criado_por_id=criado_por_id,
    )


def importar_familias_canonicas_para_catalogo(
    db: Session,
    *,
    family_keys: list[str] | tuple[str, ...] | None = None,
    status_catalogo: str = "publicado",
    criado_por_id: int | None = None,
) -> list[FamiliaLaudoCatalogo]:
    return _catalog_family_write_services.importar_familias_canonicas_para_catalogo(
        db,
        family_keys=family_keys,
        status_catalogo=status_catalogo,
        criado_por_id=criado_por_id,
    )


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
            "normalizar_status_tecnico_catalogo": _normalizar_status_tecnico_catalogo,
            "normalizar_lifecycle_status_oferta": _normalizar_lifecycle_status_oferta,
            "normalizar_status_calibracao_catalogo": _normalizar_status_calibracao_catalogo,
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
    return _catalog_read_resumir_catalogo_laudos_admin(
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
        listar_catalogo_familias=listar_catalogo_familias,
        listar_ofertas_comerciais_catalogo=listar_ofertas_comerciais_catalogo,
        listar_metodos_catalogo_fn=listar_metodos_catalogo,
        listar_family_schemas_canonicos=listar_family_schemas_canonicos,
        serializar_familia_catalogo_row=_serializar_familia_catalogo_row,
        catalog_row_matches_filters=_catalog_row_matches_filters,
        enrich_catalog_rows_with_document_preview=_enrich_catalog_rows_with_document_preview,
        offer_lifecycle_resolvido=_offer_lifecycle_resolvido,
        build_template_library_rollup=_build_template_library_rollup,
        build_material_real_rollup=_build_material_real_rollup,
        build_commercial_scale_rollup=_build_commercial_scale_rollup,
        build_calibration_queue_rollup=_build_calibration_queue_rollup,
        catalog_macro_category_sort_key=_catalog_macro_category_sort_key,
        build_catalog_governance_rollup=_build_catalog_governance_rollup,
    )


def _catalogo_actor_label(actor: Usuario | None, *, fallback: str = "Sistema Tariel") -> str:
    return _catalog_tenant_actor_label(actor, fallback=fallback)


def _serializar_release_catalogo_familia(
    item: TenantFamilyReleaseLaudo,
    *,
    empresa_lookup: dict[int, Empresa],
    oferta: OfertaComercialFamiliaLaudo | None = None,
) -> dict[str, Any]:
    return _catalog_tenant_serializar_release(
        item,
        empresa_lookup=empresa_lookup,
        oferta=oferta,
        summarize_release_contract_governance=summarize_release_contract_governance,
        offer_lifecycle_resolvido=_offer_lifecycle_resolvido,
        label_catalogo=_label_catalogo,
        release_status_labels=_CATALOGO_RELEASE_STATUS_LABELS,
        catalogo_modelo_label=_catalogo_modelo_label,
        normalizar_datetime_admin=_normalizar_datetime_admin,
        formatar_data_admin=_formatar_data_admin,
        resumir_governanca_release_policy=_resumir_governanca_release_policy,
        catalogo_scope_summary_label=_catalogo_scope_summary_label,
    )


def _historico_catalogo_familia(
    familia: FamiliaLaudoCatalogo,
    *,
    tenant_releases: list[TenantFamilyReleaseLaudo],
) -> list[dict[str, Any]]:
    return _catalog_tenant_historico_familia(
        familia,
        tenant_releases=tenant_releases,
        normalizar_datetime_admin=_normalizar_datetime_admin,
        formatar_data_admin=_formatar_data_admin,
        catalog_offer_variants=catalog_offer_variants,
        offer_lifecycle_resolvido=_offer_lifecycle_resolvido,
        catalogo_modelo_label=_catalogo_modelo_label,
        catalogo_texto_leitura=_catalogo_texto_leitura,
    )


def buscar_catalogo_familia_admin(db: Session, family_key: str) -> dict[str, Any] | None:
    return _catalog_read_buscar_catalogo_familia_admin(
        db,
        family_key,
        familia_model=FamiliaLaudoCatalogo,
        oferta_model=OfertaComercialFamiliaLaudo,
        modo_tecnico_model=ModoTecnicoFamiliaLaudo,
        calibracao_model=CalibracaoFamiliaLaudo,
        tenant_release_model=TenantFamilyReleaseLaudo,
        empresa_model=Empresa,
        normalizar_chave_catalogo=_normalizar_chave_catalogo,
        offer_lifecycle_resolvido=_offer_lifecycle_resolvido,
        dict_payload_admin=_dict_payload_admin,
        summarize_offer_commercial_governance=summarize_offer_commercial_governance,
        carregar_family_schema_canonico=carregar_family_schema_canonico,
        catalog_family_artifact_snapshot=_catalog_family_artifact_snapshot,
        serializar_familia_catalogo_row=_serializar_familia_catalogo_row,
        build_template_library_rollup=_build_template_library_rollup,
        build_material_real_workspace_summary=_build_material_real_workspace_summary,
        catalog_offer_variants=catalog_offer_variants,
        listar_metodos_catalogo_fn=listar_metodos_catalogo,
        build_document_preview_summary=_build_document_preview_summary,
        build_variant_library_summary=_build_variant_library_summary,
        build_material_real_priority_summary=_build_material_real_priority_summary,
        build_template_refinement_target=_build_template_refinement_target,
        serializar_release_catalogo_familia=_serializar_release_catalogo_familia,
        historico_catalogo_familia=_historico_catalogo_familia,
        resumir_governanca_review_policy=_resumir_governanca_review_policy,
        label_catalogo=_label_catalogo,
        lifecycle_status_labels=_CATALOGO_LIFECYCLE_STATUS_LABELS,
        calibration_status_labels=_CATALOGO_CALIBRATION_STATUS_LABELS,
        calibracao_status_resolvido=_calibracao_status_resolvido,
        catalogo_texto_leitura=_catalogo_texto_leitura,
        catalogo_actor_label=_catalogo_actor_label,
        catalogo_modelo_label=_catalogo_modelo_label,
        formatar_data_admin=_formatar_data_admin,
        normalizar_datetime_admin=_normalizar_datetime_admin,
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
    return _catalog_tenant_upsert_release(
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
        buscar_empresa=_buscar_empresa,
        buscar_familia_catalogo_por_chave=_buscar_familia_catalogo_por_chave,
        tenant_release_model=TenantFamilyReleaseLaudo,
        normalizar_status_release_catalogo=_normalizar_status_release_catalogo,
        normalizar_lista_json_canonica=_normalizar_lista_json_canonica,
        normalizar_selection_tokens_catalogo=_normalizar_selection_tokens_catalogo,
        merge_release_governance_policy=_merge_release_governance_policy,
        normalizar_review_mode_governanca=_normalizar_review_mode_governanca,
        normalizar_override_tristate=_normalizar_override_tristate,
        normalizar_release_channel_catalogo=_normalizar_release_channel_catalogo,
        normalizar_contract_entitlements_payload=_normalizar_contract_entitlements_payload,
        normalizar_chave_catalogo=_normalizar_chave_catalogo,
        agora_utc=_agora_utc,
        normalizar_texto_opcional=_normalizar_texto_opcional,
        list_active_tenant_catalog_activations=list_active_tenant_catalog_activations,
        sync_tenant_catalog_activations=sync_tenant_catalog_activations,
        flush_ou_rollback_integridade=flush_ou_rollback_integridade,
        logger_operacao=logger,
    )


def _normalizar_validade_signatario(valor: str | datetime | None) -> datetime | None:
    return _admin_signatory_normalizar_validade(
        valor,
        dependencies={
            "catalog_tenant_normalizar_validade_signatario": _catalog_tenant_normalizar_validade_signatario,
            "normalizar_texto_opcional": _normalizar_texto_opcional,
        },
    )


def _normalizar_family_keys_signatario(
    family_keys: list[str] | tuple[str, ...] | str | None,
) -> list[str]:
    return _admin_signatory_normalizar_family_keys(
        family_keys,
        dependencies={
            "catalog_tenant_normalizar_family_keys_signatario": _catalog_tenant_normalizar_family_keys_signatario,
            "normalizar_lista_json_canonica": _normalizar_lista_json_canonica,
            "normalizar_chave_catalogo": _normalizar_chave_catalogo,
        },
    )


def _status_signatario_governado(
    *,
    ativo: bool,
    valid_until: datetime | None,
) -> dict[str, str]:
    return _admin_signatory_status(
        ativo=ativo,
        valid_until=valid_until,
        dependencies={
            "catalog_tenant_status_signatario": _catalog_tenant_status_signatario,
            "normalizar_datetime_admin": _normalizar_datetime_admin,
            "agora_utc": _agora_utc,
        },
    )


def _serializar_signatario_governado_admin(
    signatario: SignatarioGovernadoLaudo,
    *,
    family_labels: dict[str, str],
) -> dict[str, Any]:
    return _admin_signatory_serializar(
        signatario,
        family_labels=family_labels,
        dependencies={
            "catalog_tenant_serializar_signatario": _catalog_tenant_serializar_signatario,
            "normalizar_family_keys_signatario_fn": _normalizar_family_keys_signatario,
            "status_signatario_governado_fn": _status_signatario_governado,
            "normalizar_datetime_admin": _normalizar_datetime_admin,
            "formatar_data_admin": _formatar_data_admin,
            "normalizar_texto_opcional": _normalizar_texto_opcional,
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
            "normalizar_texto_curto": _normalizar_texto_curto,
            "normalizar_texto_opcional": _normalizar_texto_opcional,
            "normalizar_validade_signatario_fn": _normalizar_validade_signatario,
            "normalizar_family_keys_signatario_fn": _normalizar_family_keys_signatario,
            "flush_ou_rollback_integridade": flush_ou_rollback_integridade,
            "logger_operacao": logger,
        },
    )


def resumir_portfolio_catalogo_empresa(db: Session, *, empresa_id: int) -> dict[str, Any]:
    return _catalog_tenant_resumir_portfolio(
        db,
        empresa_id=empresa_id,
        build_admin_tenant_catalog_snapshot=build_admin_tenant_catalog_snapshot,
    )


def sincronizar_portfolio_catalogo_empresa(
    db: Session,
    *,
    empresa_id: int,
    selection_tokens: list[str] | tuple[str, ...],
    admin_id: int | None = None,
) -> dict[str, Any]:
    return _catalog_tenant_sincronizar_portfolio(
        db,
        empresa_id=empresa_id,
        selection_tokens=selection_tokens,
        admin_id=admin_id,
        buscar_empresa=_buscar_empresa,
        sync_tenant_catalog_activations=sync_tenant_catalog_activations,
        flush_ou_rollback_integridade=flush_ou_rollback_integridade,
        logger_operacao=logger,
    )


def _serializar_usuario_admin(
    usuario: Usuario,
    *,
    sessoes_usuario: list[SessaoAtiva],
) -> dict[str, Any]:
    return _admin_presentation_user_serializer(
        usuario,
        sessoes_usuario=sessoes_usuario,
        max_datetime_admin=_max_datetime_admin,
        normalizar_datetime_admin=_normalizar_datetime_admin,
        role_label=_role_label,
        formatar_data_admin=_formatar_data_admin,
    )


def _resumir_primeiro_acesso_empresa(
    *,
    empresa: Empresa,
    admins_cliente: list[dict[str, Any]],
) -> dict[str, Any]:
    return _admin_presentation_first_access_summary(
        empresa=empresa,
        admins_cliente=admins_cliente,
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
    return _tenant_onboarding_registrar_novo_cliente(
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
        dependencies={
            "observe_backend_hotspot": observe_backend_hotspot,
            "logger": logger,
            "select": select,
            "IntegrityError": IntegrityError,
            "Empresa": Empresa,
            "Usuario": Usuario,
            "NivelAcesso": NivelAcesso,
            "normalizar_texto_curto": _normalizar_texto_curto,
            "normalizar_cnpj": _normalizar_cnpj,
            "normalizar_email": _normalizar_email,
            "normalizar_plano": _normalizar_plano,
            "normalizar_texto_opcional": _normalizar_texto_opcional,
            "normalizar_politica_admin_cliente_empresa": _normalizar_politica_admin_cliente_empresa,
            "gerar_senha_fortificada": gerar_senha_fortificada,
            "criar_hash_senha": criar_hash_senha,
            "tenant_admin_default_admin_cliente_portal_grants": tenant_admin_default_admin_cliente_portal_grants,
            "criar_usuario_empresa": criar_usuario_empresa,
            "commit_ou_rollback_integridade": commit_ou_rollback_integridade,
            "disparar_email_boas_vindas": _disparar_email_boas_vindas,
        },
    )


# =========================================================
# PAINEL ADMINISTRATIVO
# =========================================================


def buscar_metricas_ia_painel(db: Session) -> dict[str, Any]:
    return _admin_dashboard_buscar_metricas_ia_painel(
        db,
        dependencies={
            "select": select,
            "func": func,
            "Empresa": Empresa,
            "Laudo": Laudo,
            "tenant_cliente_clause": _tenant_cliente_clause,
            "case_prioridade_plano": _case_prioridade_plano,
            "listar_catalogo_familias": listar_catalogo_familias,
            "serializar_familia_catalogo_row": _serializar_familia_catalogo_row,
            "build_catalog_governance_rollup": _build_catalog_governance_rollup,
            "build_commercial_scale_rollup": _build_commercial_scale_rollup,
            "build_calibration_queue_rollup": _build_calibration_queue_rollup,
            "agora_utc": _agora_utc,
        },
    )


# =========================================================
# GESTÃO DE CLIENTES SAAS
# =========================================================


def buscar_detalhe_cliente(db: Session, empresa_id: int) -> dict[str, Any] | None:
    return _admin_client_detail_buscar_detalhe_cliente(
        db,
        empresa_id,
        dependencies={
            "tenant_client_read_services": _tenant_client_read_services,
            "portfolio_summary_fn": resumir_portfolio_catalogo_empresa,
            "tenant_admin_policy_summary_fn": summarize_tenant_admin_policy,
            "user_serializer": _serializar_usuario_admin,
            "first_access_summary_fn": _resumir_primeiro_acesso_empresa,
            "signatory_serializer": _serializar_signatario_governado_admin,
        },
    )


# =========================================================
# STUB DE COMUNICAÇÃO
# =========================================================


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
