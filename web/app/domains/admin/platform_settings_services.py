from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.domains.admin import admin_platform_identity_services as _admin_platform_identity_services
from app.domains.admin.observability_summary import build_admin_observability_operational_summary
from app.domains.admin.platform_settings_console_overview import (
    build_platform_settings_console_overview,
)
from app.domains.admin.platform_settings_console_sections import (
    build_platform_settings_console_sections,
)
from app.domains.admin.platform_settings_setting_descriptors import (
    build_access_setting_descriptors,
    build_defaults_setting_descriptors,
    build_rollout_setting_descriptors,
    build_support_setting_descriptors,
)
from app.domains.admin.platform_settings_state import (
    _PLATFORM_SETTING_DEFINITIONS,
    _SUPPORT_EXCEPTIONAL_MODE_LABELS,
    _SUPPORT_EXCEPTIONAL_SCOPE_LABELS,
    _build_runtime_items,
    _build_setting_items,
    _coerce_platform_setting_value,
    _platform_setting_row_map,
    _platform_setting_snapshot,
    _platform_settings_users,
    _setting_value_label,
    get_platform_setting_value,
)
from app.domains.admin.runtime_rollout_descriptors import build_rollout_runtime_descriptors
from app.domains.admin.runtime_settings_descriptors import (
    build_access_runtime_descriptors,
    build_document_runtime_descriptors,
    build_observability_runtime_descriptors,
)
from app.domains.admin.tenant_user_services import _normalizar_texto_curto
from app.shared.database import (
    ConfiguracaoPlataforma,
    PlanoEmpresa,
    RegistroAuditoriaEmpresa,
    Usuario,
    flush_ou_rollback_integridade,
)
from app.v2.document import document_hard_gate_observability_enabled
from app.v2.document.hard_gate_evidence import document_hard_gate_durable_evidence_enabled


listar_operadores_plataforma = _admin_platform_identity_services.listar_operadores_plataforma
_resolver_empresa_plataforma = _admin_platform_identity_services._resolver_empresa_plataforma


def build_admin_platform_settings_console(banco: Session) -> dict[str, Any]:
    rows = _platform_setting_row_map(banco)
    users = _platform_settings_users(rows, banco)
    observability = build_admin_observability_operational_summary()
    privacy = observability.get("privacy") or {}
    operators = listar_operadores_plataforma(banco)
    admin_reauth_max_age_minutes = int(
        get_platform_setting_value(banco, "admin_reauth_max_age_minutes")
    )
    support_exceptional_mode = str(
        get_platform_setting_value(banco, "support_exceptional_mode")
    )
    support_exceptional_approval_required = bool(
        get_platform_setting_value(banco, "support_exceptional_approval_required")
    )
    support_exceptional_justification_required = bool(
        get_platform_setting_value(banco, "support_exceptional_justification_required")
    )
    support_exceptional_max_duration_minutes = int(
        get_platform_setting_value(banco, "support_exceptional_max_duration_minutes")
    )
    support_exceptional_scope_level = str(
        get_platform_setting_value(banco, "support_exceptional_scope_level")
    )
    review_ui_canonical = str(get_platform_setting_value(banco, "review_ui_canonical"))
    default_new_tenant_plan = str(
        get_platform_setting_value(banco, "default_new_tenant_plan")
    )
    access_runtime_descriptors = build_access_runtime_descriptors(
        operator_count=len(operators)
    )

    access_items = [
        *_build_runtime_items(access_runtime_descriptors[:1]),
        *_build_setting_items(
            banco,
            rows,
            users,
            build_access_setting_descriptors(),
        ),
        *_build_runtime_items(access_runtime_descriptors[1:]),
    ]

    support_items = _build_setting_items(
        banco,
        rows,
        users,
        build_support_setting_descriptors(),
    )

    rollout_items = [
        *_build_setting_items(
            banco,
            rows,
            users,
            build_rollout_setting_descriptors(),
        ),
        *_build_runtime_items(build_rollout_runtime_descriptors()),
    ]

    document_items = _build_runtime_items(build_document_runtime_descriptors())

    observability_items = _build_runtime_items(
        build_observability_runtime_descriptors(privacy)
    )

    defaults_items = _build_setting_items(
        banco,
        rows,
        users,
        build_defaults_setting_descriptors(),
    )

    sections = build_platform_settings_console_sections(
        access_items=access_items,
        admin_reauth_max_age_minutes=admin_reauth_max_age_minutes,
        support_items=support_items,
        support_exceptional_mode=support_exceptional_mode,
        support_exceptional_mode_options=[
            {"value": key, "label": label}
            for key, label in _SUPPORT_EXCEPTIONAL_MODE_LABELS.items()
        ],
        support_exceptional_approval_required=support_exceptional_approval_required,
        support_exceptional_justification_required=support_exceptional_justification_required,
        support_exceptional_max_duration_minutes=support_exceptional_max_duration_minutes,
        support_exceptional_scope_level=support_exceptional_scope_level,
        support_exceptional_scope_options=[
            {"value": key, "label": label}
            for key, label in _SUPPORT_EXCEPTIONAL_SCOPE_LABELS.items()
        ],
        rollout_items=rollout_items,
        review_ui_canonical=review_ui_canonical,
        document_items=document_items,
        observability_items=observability_items,
        defaults_items=defaults_items,
        default_new_tenant_plan=default_new_tenant_plan,
        default_new_tenant_plan_options=[
            {"value": plano, "label": plano}
            for plano in PlanoEmpresa.valores()
        ],
    )

    return {
        "summary_cards": build_platform_settings_console_overview(
            rows=rows.values(),
            privacy=privacy,
            environment_label=str(
                observability.get("environment") or get_settings().ambiente
            ).upper(),
            review_ui_canonical_label=_setting_value_label(
                "review_ui_canonical",
                review_ui_canonical,
            ),
            support_exceptional_mode=support_exceptional_mode,
            document_hard_gate_enabled=document_hard_gate_observability_enabled(),
            durable_evidence_enabled=document_hard_gate_durable_evidence_enabled(),
        ),
        "sections": sections,
    }


def _platform_setting_changes_payload(
    banco: Session,
    updates: dict[str, Any],
    *,
    rows: dict[str, ConfiguracaoPlataforma],
) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    for key, raw_value in updates.items():
        if key not in _PLATFORM_SETTING_DEFINITIONS:
            raise ValueError("Configuração de plataforma inválida.")
        before = _platform_setting_snapshot(banco, key, rows=rows)
        after_value = _coerce_platform_setting_value(key, raw_value)
        if before["value"] == after_value:
            continue
        row = rows.get(key)
        if row is not None:
            row.valor_json = after_value
        else:
            row = ConfiguracaoPlataforma(
                chave=key,
                categoria=str(_PLATFORM_SETTING_DEFINITIONS[key]["category"]),
                valor_json=after_value,
            )
            banco.add(row)
            rows[key] = row
        changes.append(
            {
                "key": key,
                "before": before["value"],
                "before_source": before["source"],
                "after": after_value,
            }
        )
    return changes


def apply_platform_settings_update(
    banco: Session,
    *,
    actor_user: Usuario,
    group_key: str,
    reason: str,
    updates: dict[str, Any],
    logger_operacao,
) -> dict[str, Any]:
    justification = _normalizar_texto_curto(reason, campo="Justificativa", max_len=300)
    rows = _platform_setting_row_map(banco)
    changes = _platform_setting_changes_payload(banco, updates, rows=rows)
    if not changes:
        raise ValueError("Nenhuma alteração efetiva foi detectada.")

    for change in changes:
        row = rows[change["key"]]
        row.categoria = str(_PLATFORM_SETTING_DEFINITIONS[change["key"]]["category"])
        row.motivo_ultima_alteracao = justification
        row.atualizada_por_usuario_id = int(actor_user.id)

    empresa_plataforma = _resolver_empresa_plataforma(banco, usuario=actor_user)
    if empresa_plataforma is None:
        raise ValueError("Tenant de plataforma não encontrado para auditar a alteração.")

    resumo = {
        "access": "Política de acesso da plataforma atualizada.",
        "support": "Política de suporte excepcional atualizada.",
        "rollout": "Política de rollout operacional atualizada.",
        "defaults": "Defaults globais da plataforma atualizados.",
    }.get(group_key, "Configuração de plataforma atualizada.")

    detalhe = {
        "access": "Mudança de segurança aplicada ao Admin-CEO.",
        "support": "Mudança de suporte excepcional aplicada à governança da plataforma.",
        "rollout": "Mudança de superfície canônica aplicada à revisão.",
        "defaults": "Mudança aplicada ao onboarding padrão de novos tenants.",
    }.get(group_key, "Mudança administrativa aplicada à plataforma.")

    banco.add(
        RegistroAuditoriaEmpresa(
            empresa_id=int(empresa_plataforma.id),
            ator_usuario_id=int(actor_user.id),
            portal="admin",
            acao="platform_setting_updated",
            resumo=resumo,
            detalhe=detalhe,
            payload_json={
                "group": group_key,
                "reason": justification,
                "changes": changes,
            },
        )
    )
    flush_ou_rollback_integridade(
        banco,
        logger_operacao=logger_operacao,
        mensagem_erro="Falha ao persistir configuração de plataforma.",
    )
    return {
        "group": group_key,
        "reason": justification,
        "changes": changes,
    }
