from __future__ import annotations

from typing import Any, Iterable, Literal

from app.shared.database import NivelAcesso

TenantAdminCaseVisibilityMode = Literal["summary_only", "case_list"]
TenantAdminCaseActionMode = Literal["read_only", "case_actions"]
TenantAdminOperatingModel = Literal["standard", "mobile_single_operator"]
TenantAdminCommercialServicePackage = Literal[
    "inspector_chat",
    "inspector_chat_mesa",
    "inspector_chat_mesa_reviewer_services",
]
MobileChatFirstReviewGovernanceMode = Literal[
    "separate_mesa_required",
    "mesa_optional",
    "self_review_allowed",
    "self_review_unavailable",
    "review_not_configured",
]
MobileChatFirstApprovalActorScope = Literal[
    "separate_mesa",
    "inspector_self",
    "tenant_reviewer",
    "unassigned",
]
MobileChatFirstIssueGovernanceMode = Literal[
    "none",
    "official_issue_allowed",
    "signatory_required",
]

DEFAULT_TENANT_ADMIN_CASE_VISIBILITY_MODE: TenantAdminCaseVisibilityMode = "case_list"
DEFAULT_TENANT_ADMIN_CASE_ACTION_MODE: TenantAdminCaseActionMode = "case_actions"
DEFAULT_TENANT_ADMIN_OPERATING_MODEL: TenantAdminOperatingModel = "standard"
DEFAULT_TENANT_ADMIN_COMMERCIAL_SERVICE_PACKAGE: TenantAdminCommercialServicePackage = (
    "inspector_chat_mesa"
)

_VISIBILITY_MODE_LABELS: dict[TenantAdminCaseVisibilityMode, str] = {
    "summary_only": "Somente resumos agregados",
    "case_list": "Lista caso a caso",
}
_ACTION_MODE_LABELS: dict[TenantAdminCaseActionMode, str] = {
    "read_only": "Somente acompanhamento",
    "case_actions": "Pode agir nos casos",
}
_OPERATING_MODEL_LABELS: dict[TenantAdminOperatingModel, str] = {
    "standard": "Operação padrão",
    "mobile_single_operator": "Aplicativo principal com uma pessoa responsável",
}
_COMMERCIAL_SERVICE_PACKAGE_LABELS: dict[TenantAdminCommercialServicePackage, str] = {
    "inspector_chat": "Inspeção IA",
    "inspector_chat_mesa": "Inspeção IA + Revisão Técnica",
    "inspector_chat_mesa_reviewer_services": "Inspeção IA + Revisão Técnica + Emissão",
}
_COMMERCIAL_SERVICE_PACKAGE_DESCRIPTIONS: dict[TenantAdminCommercialServicePackage, str] = {
    "inspector_chat": (
        "O inspetor conduz o caso no chat com IA e finaliza por aprovação interna."
    ),
    "inspector_chat_mesa": (
        "O operador de campo envia para a Revisão Técnica e a avaliação/emissão ficam na Revisão Técnica."
    ),
    "inspector_chat_mesa_reviewer_services": (
        "Mantém Revisão Técnica e permite que usuários operacionais acumulem campo e análise."
    ),
}
_COMMERCIAL_SERVICE_PACKAGE_PRESETS: dict[TenantAdminCommercialServicePackage, dict[str, Any]] = {
    "inspector_chat": {
        "tenant_portal_cliente_enabled": True,
        "tenant_portal_inspetor_enabled": True,
        "tenant_portal_revisor_enabled": False,
        "tenant_capability_admin_manage_team_enabled": True,
        "tenant_capability_inspector_case_create_enabled": True,
        "tenant_capability_inspector_case_finalize_enabled": True,
        "tenant_capability_inspector_send_to_mesa_enabled": False,
        "tenant_capability_mobile_case_approve_enabled": True,
        "tenant_capability_reviewer_decision_enabled": False,
        "tenant_capability_reviewer_issue_enabled": False,
        "operational_user_cross_portal_enabled": False,
    },
    "inspector_chat_mesa": {
        "tenant_portal_cliente_enabled": True,
        "tenant_portal_inspetor_enabled": True,
        "tenant_portal_revisor_enabled": True,
        "tenant_capability_admin_manage_team_enabled": True,
        "tenant_capability_inspector_case_create_enabled": True,
        "tenant_capability_inspector_case_finalize_enabled": True,
        "tenant_capability_inspector_send_to_mesa_enabled": True,
        "tenant_capability_mobile_case_approve_enabled": False,
        "tenant_capability_reviewer_decision_enabled": True,
        "tenant_capability_reviewer_issue_enabled": True,
        "operational_user_cross_portal_enabled": False,
    },
    "inspector_chat_mesa_reviewer_services": {
        "tenant_portal_cliente_enabled": True,
        "tenant_portal_inspetor_enabled": True,
        "tenant_portal_revisor_enabled": True,
        "tenant_capability_admin_manage_team_enabled": True,
        "tenant_capability_inspector_case_create_enabled": True,
        "tenant_capability_inspector_case_finalize_enabled": True,
        "tenant_capability_inspector_send_to_mesa_enabled": True,
        "tenant_capability_mobile_case_approve_enabled": False,
        "tenant_capability_reviewer_decision_enabled": True,
        "tenant_capability_reviewer_issue_enabled": True,
        "operational_user_cross_portal_enabled": True,
    },
}
_OPERATING_SURFACE_LABELS: dict[str, str] = {
    "mobile": "App mobile",
    "inspetor_web": "Inspeção IA",
    "mesa_web": "Revisão Técnica",
}
_USER_PORTAL_LABELS: dict[str, str] = {
    "cliente": "Portal Cliente",
    "inspetor": "Inspeção IA",
    "revisor": "Revisão Técnica",
}
_TENANT_PORTAL_DEFAULTS: dict[str, bool] = {
    "cliente": True,
    "inspetor": True,
    "revisor": True,
}
_TENANT_PORTAL_POLICY_KEYS: dict[str, str] = {
    "cliente": "tenant_portal_cliente_enabled",
    "inspetor": "tenant_portal_inspetor_enabled",
    "revisor": "tenant_portal_revisor_enabled",
}
_TENANT_PORTAL_INPUT_ALIASES: dict[str, tuple[str, ...]] = {
    "cliente": (
        "tenant_portal_cliente_enabled",
        "portal_cliente_enabled",
        "admin_cliente_enabled",
    ),
    "inspetor": (
        "tenant_portal_inspetor_enabled",
        "portal_inspetor_enabled",
        "inspetor_enabled",
        "tenant_portal_mobile_enabled",
        "mobile_enabled",
    ),
    "revisor": (
        "tenant_portal_revisor_enabled",
        "portal_revisor_enabled",
        "revisor_enabled",
        "mesa_enabled",
        "tenant_portal_mesa_enabled",
    ),
}
_TENANT_CAPABILITY_POLICY_KEYS: dict[str, str] = {
    "admin_manage_team": "tenant_capability_admin_manage_team_enabled",
    "inspector_case_create": "tenant_capability_inspector_case_create_enabled",
    "inspector_case_finalize": "tenant_capability_inspector_case_finalize_enabled",
    "inspector_send_to_mesa": "tenant_capability_inspector_send_to_mesa_enabled",
    "mobile_case_approve": "tenant_capability_mobile_case_approve_enabled",
    "reviewer_decision": "tenant_capability_reviewer_decision_enabled",
    "reviewer_issue": "tenant_capability_reviewer_issue_enabled",
}
_TENANT_CAPABILITY_INPUT_ALIASES: dict[str, tuple[str, ...]] = {
    "admin_manage_team": (
        "tenant_capability_admin_manage_team_enabled",
        "admin_cliente_manage_team_enabled",
        "admin_manage_team_enabled",
    ),
    "inspector_case_create": (
        "tenant_capability_inspector_case_create_enabled",
        "inspetor_case_create_enabled",
        "inspector_case_create_enabled",
    ),
    "inspector_case_finalize": (
        "tenant_capability_inspector_case_finalize_enabled",
        "inspetor_case_finalize_enabled",
        "inspector_case_finalize_enabled",
    ),
    "inspector_send_to_mesa": (
        "tenant_capability_inspector_send_to_mesa_enabled",
        "inspetor_send_to_mesa_enabled",
        "inspector_send_to_mesa_enabled",
    ),
    "mobile_case_approve": (
        "tenant_capability_mobile_case_approve_enabled",
        "mobile_case_approve_enabled",
        "mobile_approve_enabled",
    ),
    "reviewer_decision": (
        "tenant_capability_reviewer_decision_enabled",
        "reviewer_decision_enabled",
        "mesa_review_enabled",
    ),
    "reviewer_issue": (
        "tenant_capability_reviewer_issue_enabled",
        "reviewer_issue_enabled",
        "mesa_issue_enabled",
    ),
}
_TENANT_CAPABILITY_PORTAL_DEPENDENCIES: dict[str, tuple[str, ...]] = {
    "admin_manage_team": ("cliente",),
    "inspector_case_create": ("inspetor",),
    "inspector_case_finalize": ("inspetor",),
    "inspector_send_to_mesa": ("inspetor", "revisor"),
    "mobile_case_approve": ("inspetor",),
    "reviewer_decision": ("revisor",),
    "reviewer_issue": ("revisor",),
}
_MOBILE_CHAT_FIRST_CAPABILITY_ALIASES: dict[str, str] = {
    "case_create": "inspector_case_create",
    "case_collect": "inspector_case_create",
    "case_finalize_request": "inspector_case_finalize",
    "case_send_to_separate_review": "inspector_send_to_mesa",
    "case_self_review": "mobile_case_approve",
    "case_review_decide": "reviewer_decision",
    "structured_review_edit": "reviewer_decision",
    "official_issue_create": "reviewer_issue",
    "official_issue_download": "reviewer_issue",
    "governed_signatory_select": "reviewer_issue",
}
_SELF_REVIEW_MODE_ALIASES = {
    "mobile_autonomous",
    "mobile_review_allowed",
    "self_review_allowed",
    "inspector_governed_approval",
}
_SEPARATE_REVIEW_MODE_ALIASES = {
    "mesa_required",
    "separate_mesa_required",
    "separate_review_required",
}
_MESA_OPTIONAL_MODE_ALIASES = {
    "mesa_optional",
    "separate_mesa_optional",
    "review_optional",
}
_COMMERCIAL_CAPABILITY_AXES: tuple[str, ...] = (
    "mesa",
    "offline",
    "retention",
    "sla",
    "branding",
    "guided_flow_depth",
    "mobile_unified_operator",
)
_MANDATORY_AUDIT_FIELDS: tuple[str, ...] = (
    "actor_user_id",
    "actor_role",
    "tenant_id",
    "case_id",
    "case_lifecycle_status",
    "ai_assistance_present",
    "human_override_reason",
    "human_override_recorded_at",
    "final_signatory_name",
    "final_signatory_registration",
    "issued_document_version",
)


def _coalesce_policy_value(source: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in source:
            return source.get(key)
    return None


def _normalize_policy_flag(value: Any, *, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value or "").strip().lower()
    if not text:
        return default
    return text in {"1", "true", "on", "yes", "sim", "enabled", "enable", "ativo"}


def _normalize_optional_policy_flag(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return bool(value)
    text = str(value or "").strip()
    if not text:
        return None
    return _normalize_policy_flag(value)


def _default_capability_entitlements(
    *,
    portal_entitlements: dict[str, bool],
) -> dict[str, bool]:
    return {
        "admin_manage_team": bool(portal_entitlements.get("cliente")),
        "inspector_case_create": bool(portal_entitlements.get("inspetor")),
        "inspector_case_finalize": bool(portal_entitlements.get("inspetor")),
        "inspector_send_to_mesa": bool(
            portal_entitlements.get("inspetor") and portal_entitlements.get("revisor")
        ),
        "mobile_case_approve": bool(portal_entitlements.get("inspetor")),
        "reviewer_decision": bool(portal_entitlements.get("revisor")),
        "reviewer_issue": bool(portal_entitlements.get("revisor")),
    }


def _resolve_tenant_portal_entitlements(source: dict[str, Any]) -> dict[str, bool]:
    entitlements = dict(_TENANT_PORTAL_DEFAULTS)
    for portal, aliases in _TENANT_PORTAL_INPUT_ALIASES.items():
        explicit = _normalize_optional_policy_flag(_coalesce_policy_value(source, *aliases))
        if explicit is not None:
            entitlements[portal] = bool(explicit)
    return entitlements


def _resolve_tenant_capability_entitlements(
    source: dict[str, Any],
    *,
    portal_entitlements: dict[str, bool],
) -> dict[str, bool]:
    entitlements = _default_capability_entitlements(
        portal_entitlements=portal_entitlements,
    )
    for capability, aliases in _TENANT_CAPABILITY_INPUT_ALIASES.items():
        explicit = _normalize_optional_policy_flag(_coalesce_policy_value(source, *aliases))
        if explicit is not None:
            entitlements[capability] = bool(explicit)
    for capability, required_portals in _TENANT_CAPABILITY_PORTAL_DEPENDENCIES.items():
        if not all(bool(portal_entitlements.get(portal)) for portal in required_portals):
            entitlements[capability] = False
    return entitlements


def _contract_surface_capability_entitlements(
    *,
    portal_entitlements: dict[str, bool],
    commercial_service_package: TenantAdminCommercialServicePackage,
) -> dict[str, bool]:
    chat_surface_enabled = bool(portal_entitlements.get("inspetor"))
    mesa_surface_enabled = bool(portal_entitlements.get("revisor"))
    return {
        "admin_manage_team": bool(portal_entitlements.get("cliente")),
        "inspector_case_create": chat_surface_enabled,
        "inspector_case_finalize": chat_surface_enabled,
        "inspector_send_to_mesa": chat_surface_enabled and mesa_surface_enabled,
        "mobile_case_approve": chat_surface_enabled,
        "reviewer_decision": mesa_surface_enabled,
        "reviewer_issue": mesa_surface_enabled,
    }


def _mobile_chat_first_capability_aliases_from_legacy(
    capability_entitlements: dict[str, Any],
) -> dict[str, bool]:
    return {
        alias: bool(capability_entitlements.get(legacy))
        for alias, legacy in _MOBILE_CHAT_FIRST_CAPABILITY_ALIASES.items()
    }


def _normalize_review_mode_alias(value: Any) -> str:
    return str(value or "").strip().lower()


def _resolve_mobile_chat_first_review_governance_mode(
    *,
    capability_aliases: dict[str, bool],
    review_mode: Any = None,
    high_risk_family_requires_separate_review: bool = False,
) -> MobileChatFirstReviewGovernanceMode:
    normalized = _normalize_review_mode_alias(review_mode)
    if high_risk_family_requires_separate_review:
        return "separate_mesa_required"
    if normalized in _SEPARATE_REVIEW_MODE_ALIASES:
        return "separate_mesa_required"
    if normalized in _MESA_OPTIONAL_MODE_ALIASES:
        return "mesa_optional"
    if normalized in _SELF_REVIEW_MODE_ALIASES:
        return (
            "self_review_allowed"
            if bool(capability_aliases.get("case_self_review"))
            else "self_review_unavailable"
        )
    if bool(capability_aliases.get("case_send_to_separate_review")):
        return "separate_mesa_required"
    if bool(capability_aliases.get("case_self_review")):
        return "self_review_allowed"
    return "review_not_configured"


def _approval_actor_scope_for_review_mode(
    *,
    review_governance_mode: str,
    capability_aliases: dict[str, bool],
) -> MobileChatFirstApprovalActorScope:
    if review_governance_mode == "separate_mesa_required":
        return "separate_mesa"
    if review_governance_mode == "self_review_allowed":
        return "inspector_self"
    if bool(capability_aliases.get("case_review_decide")):
        return "tenant_reviewer"
    return "unassigned"


def _available_case_actions_for_governance(
    *,
    capability_aliases: dict[str, bool],
    separate_mesa_required: bool,
) -> list[str]:
    actions: list[str] = []
    for action, enabled in capability_aliases.items():
        if not bool(enabled):
            continue
        if action == "case_self_review" and separate_mesa_required:
            continue
        actions.append(action)
    return actions


def build_mobile_chat_first_governance_read_model(
    payload: Any,
    *,
    review_mode: Any = None,
    high_risk_family_requires_separate_review: bool = False,
    signatory_required: bool | None = None,
    capability_entitlements: dict[str, bool] | None = None,
) -> dict[str, Any]:
    """Return neutral governance aliases without changing legacy capabilities."""

    legacy_capabilities = (
        dict(capability_entitlements)
        if capability_entitlements is not None
        else tenant_admin_capability_entitlements(payload)
    )
    capability_aliases = _mobile_chat_first_capability_aliases_from_legacy(
        legacy_capabilities
    )
    review_governance_mode = _resolve_mobile_chat_first_review_governance_mode(
        capability_aliases=capability_aliases,
        review_mode=review_mode,
        high_risk_family_requires_separate_review=high_risk_family_requires_separate_review,
    )
    separate_mesa_required = review_governance_mode == "separate_mesa_required"
    self_review_allowed = (
        review_governance_mode == "self_review_allowed"
        and bool(capability_aliases.get("case_self_review"))
        and not separate_mesa_required
    )
    official_issue_allowed = bool(capability_aliases.get("official_issue_create"))
    effective_signatory_required = (
        bool(signatory_required)
        if signatory_required is not None
        else official_issue_allowed
    )
    issue_governance_mode: MobileChatFirstIssueGovernanceMode
    if not official_issue_allowed:
        issue_governance_mode = "none"
    elif effective_signatory_required:
        issue_governance_mode = "signatory_required"
    else:
        issue_governance_mode = "official_issue_allowed"

    return {
        "review_governance_mode": review_governance_mode,
        "review_mode_legacy": _normalize_review_mode_alias(review_mode) or None,
        "approval_actor_scope": _approval_actor_scope_for_review_mode(
            review_governance_mode=review_governance_mode,
            capability_aliases=capability_aliases,
        ),
        "issue_governance_mode": issue_governance_mode,
        "separate_mesa_required": separate_mesa_required,
        "self_review_allowed": self_review_allowed,
        "official_issue_allowed": official_issue_allowed,
        "signatory_required": bool(effective_signatory_required),
        "available_case_actions": _available_case_actions_for_governance(
            capability_aliases=capability_aliases,
            separate_mesa_required=separate_mesa_required,
        ),
        "capability_alias_source": dict(_MOBILE_CHAT_FIRST_CAPABILITY_ALIASES),
    }


def _normalize_case_visibility_mode(value: Any) -> TenantAdminCaseVisibilityMode:
    text = str(value or "").strip().lower()
    aliases = {
        "": DEFAULT_TENANT_ADMIN_CASE_VISIBILITY_MODE,
        "summary_only": "summary_only",
        "summary": "summary_only",
        "resumo": "summary_only",
        "resumos": "summary_only",
        "aggregate_only": "summary_only",
        "case_list": "case_list",
        "case-by-case": "case_list",
        "case_by_case": "case_list",
        "lista": "case_list",
        "lista_casos": "case_list",
        "cases": "case_list",
    }
    return aliases.get(text, DEFAULT_TENANT_ADMIN_CASE_VISIBILITY_MODE)


def _normalize_case_action_mode(value: Any) -> TenantAdminCaseActionMode:
    text = str(value or "").strip().lower()
    aliases = {
        "": DEFAULT_TENANT_ADMIN_CASE_ACTION_MODE,
        "read_only": "read_only",
        "readonly": "read_only",
        "read-only": "read_only",
        "acompanhar": "read_only",
        "somente_acompanhamento": "read_only",
        "case_actions": "case_actions",
        "actions": "case_actions",
        "agir": "case_actions",
        "acoes": "case_actions",
        "acoes_caso": "case_actions",
    }
    return aliases.get(text, DEFAULT_TENANT_ADMIN_CASE_ACTION_MODE)


def _normalize_operating_model(value: Any) -> TenantAdminOperatingModel:
    text = str(value or "").strip().lower()
    aliases = {
        "": DEFAULT_TENANT_ADMIN_OPERATING_MODEL,
        "standard": "standard",
        "default": "standard",
        "padrao": "standard",
        "padrão": "standard",
        "standard_web": "standard",
        "mobile_single_operator": "mobile_single_operator",
        "mobile-single-operator": "mobile_single_operator",
        "mobile_only": "mobile_single_operator",
        "mobile-only": "mobile_single_operator",
        "somente_mobile": "mobile_single_operator",
        "mobile": "mobile_single_operator",
        "app_mobile": "mobile_single_operator",
    }
    return aliases.get(text, DEFAULT_TENANT_ADMIN_OPERATING_MODEL)


def _normalize_commercial_service_package(value: Any) -> TenantAdminCommercialServicePackage | None:
    text = str(value or "").strip().lower()
    aliases: dict[str, TenantAdminCommercialServicePackage | None] = {
        "": None,
        "custom": None,
        "manual": None,
        "inspector_chat": "inspector_chat",
        "chat_inspetor": "inspector_chat",
        "chat_sem_mesa": "inspector_chat",
        "inspector_chat_mesa": "inspector_chat_mesa",
        "chat_com_mesa": "inspector_chat_mesa",
        "mesa": "inspector_chat_mesa",
        "inspector_chat_mesa_reviewer_services": "inspector_chat_mesa_reviewer_services",
        "chat_mesa_servicos": "inspector_chat_mesa_reviewer_services",
        "mesa_servicos_inspetor": "inspector_chat_mesa_reviewer_services",
    }
    return aliases.get(text, DEFAULT_TENANT_ADMIN_COMMERCIAL_SERVICE_PACKAGE)


def tenant_admin_commercial_service_package_options() -> list[dict[str, str]]:
    return [
        {
            "key": key,
            "label": _COMMERCIAL_SERVICE_PACKAGE_LABELS[key],
            "description": _COMMERCIAL_SERVICE_PACKAGE_DESCRIPTIONS[key],
        }
        for key in _COMMERCIAL_SERVICE_PACKAGE_LABELS
    ]


def sanitize_tenant_admin_policy(payload: Any) -> dict[str, Any]:
    source = dict(payload or {}) if isinstance(payload, dict) else {}
    commercial_service_package = _normalize_commercial_service_package(
        _coalesce_policy_value(
            source,
            "commercial_service_package",
            "admin_cliente_commercial_service_package",
            "tenant_commercial_service_package",
        )
    )
    if commercial_service_package is not None:
        source = {
            **source,
            **_COMMERCIAL_SERVICE_PACKAGE_PRESETS[commercial_service_package],
            "commercial_service_package": commercial_service_package,
        }
    visibility_mode = _normalize_case_visibility_mode(
        _coalesce_policy_value(
            source,
            "case_visibility_mode",
            "admin_client_case_visibility_mode",
            "admin_cliente_case_visibility_mode",
        )
    )
    action_mode = _normalize_case_action_mode(
        _coalesce_policy_value(
            source,
            "case_action_mode",
            "admin_client_case_action_mode",
            "admin_cliente_case_action_mode",
        )
    )
    operating_model = _normalize_operating_model(
        _coalesce_policy_value(
            source,
            "operating_model",
            "commercial_operating_model",
            "tenant_operating_model",
            "admin_client_operating_model",
            "admin_cliente_operating_model",
        )
    )
    mobile_web_inspector_enabled = _normalize_policy_flag(
        _coalesce_policy_value(
            source,
            "shared_mobile_operator_web_inspector_enabled",
            "mobile_single_operator_web_inspector_enabled",
            "admin_cliente_mobile_web_inspector_enabled",
        ),
        default=operating_model == "mobile_single_operator",
    )
    mobile_web_review_enabled = _normalize_policy_flag(
        _coalesce_policy_value(
            source,
            "shared_mobile_operator_web_review_enabled",
            "mobile_single_operator_web_review_enabled",
            "admin_cliente_mobile_web_review_enabled",
        ),
        default=operating_model == "mobile_single_operator",
    )
    operational_user_cross_portal_enabled = _normalize_policy_flag(
        _coalesce_policy_value(
            source,
            "operational_user_cross_portal_enabled",
            "admin_cliente_operational_user_cross_portal_enabled",
            "tenant_operational_user_cross_portal_enabled",
        ),
        default=operating_model == "mobile_single_operator",
    )
    operational_user_admin_portal_enabled = _normalize_policy_flag(
        _coalesce_policy_value(
            source,
            "operational_user_admin_portal_enabled",
            "admin_cliente_operational_user_admin_portal_enabled",
            "tenant_operational_user_admin_portal_enabled",
        ),
        default=operating_model == "mobile_single_operator",
    )
    if visibility_mode == "summary_only":
        action_mode = "read_only"
    implicit_cross_portal_enabled = operating_model == "mobile_single_operator"
    implicit_admin_portal_enabled = operating_model == "mobile_single_operator"
    sanitized: dict[str, Any] = {
        "case_visibility_mode": visibility_mode,
        "case_action_mode": action_mode,
    }
    if commercial_service_package is not None:
        sanitized["commercial_service_package"] = commercial_service_package
    portal_entitlements = _resolve_tenant_portal_entitlements(source)
    capability_entitlements = _resolve_tenant_capability_entitlements(
        source,
        portal_entitlements=portal_entitlements,
    )
    if bool(operational_user_cross_portal_enabled) != bool(
        implicit_cross_portal_enabled
    ):
        sanitized["operational_user_cross_portal_enabled"] = bool(
            operational_user_cross_portal_enabled
        )
    if bool(operational_user_admin_portal_enabled) != bool(
        implicit_admin_portal_enabled
    ):
        sanitized["operational_user_admin_portal_enabled"] = bool(
            operational_user_admin_portal_enabled
        )
    if operating_model != DEFAULT_TENANT_ADMIN_OPERATING_MODEL:
        sanitized["operating_model"] = operating_model
        sanitized["shared_mobile_operator_web_inspector_enabled"] = bool(
            mobile_web_inspector_enabled
        )
        sanitized["shared_mobile_operator_web_review_enabled"] = bool(
            mobile_web_review_enabled
        )
    for portal, default_enabled in _TENANT_PORTAL_DEFAULTS.items():
        enabled = bool(portal_entitlements.get(portal))
        if enabled != bool(default_enabled):
            sanitized[_TENANT_PORTAL_POLICY_KEYS[portal]] = enabled
    default_capabilities = _default_capability_entitlements(
        portal_entitlements=portal_entitlements,
    )
    for capability, default_enabled in default_capabilities.items():
        enabled = bool(capability_entitlements.get(capability))
        if enabled != bool(default_enabled):
            sanitized[_TENANT_CAPABILITY_POLICY_KEYS[capability]] = enabled
    return sanitized


def summarize_tenant_admin_policy(payload: Any) -> dict[str, Any]:
    sanitized = sanitize_tenant_admin_policy(payload)
    case_list_visible = sanitized["case_visibility_mode"] == "case_list"
    # O Admin CEO governa contrato/superficies; o Admin Cliente governa seus
    # funcionarios (inspetores e avaliadores) nas superficies contratadas.
    case_actions_enabled = case_list_visible
    operating_model = _normalize_operating_model(sanitized.get("operating_model"))
    mobile_single_operator = operating_model == "mobile_single_operator"
    commercial_service_package_explicit = "commercial_service_package" in sanitized
    commercial_service_package = _normalize_commercial_service_package(
        sanitized.get("commercial_service_package")
    ) or DEFAULT_TENANT_ADMIN_COMMERCIAL_SERVICE_PACKAGE
    shared_mobile_operator_web_inspector_enabled = bool(
        mobile_single_operator
        and sanitized.get("shared_mobile_operator_web_inspector_enabled", True)
    )
    shared_mobile_operator_web_review_enabled = bool(
        mobile_single_operator
        and sanitized.get("shared_mobile_operator_web_review_enabled", True)
    )
    shared_mobile_operator_surface_set = ["mobile"] if mobile_single_operator else []
    if shared_mobile_operator_web_inspector_enabled:
        shared_mobile_operator_surface_set.append("inspetor_web")
    if shared_mobile_operator_web_review_enabled:
        shared_mobile_operator_surface_set.append("mesa_web")
    tenant_assignable_portal_set = ["inspetor", "revisor"]
    if bool(sanitized.get("operational_user_admin_portal_enabled", False)):
        tenant_assignable_portal_set.append("cliente")
    portal_entitlements = _resolve_tenant_portal_entitlements(sanitized)
    capability_entitlements = _contract_surface_capability_entitlements(
        portal_entitlements=portal_entitlements,
        commercial_service_package=commercial_service_package,
    )
    capability_aliases = _mobile_chat_first_capability_aliases_from_legacy(
        capability_entitlements
    )
    mobile_chat_first_governance = build_mobile_chat_first_governance_read_model(
        sanitized,
        capability_entitlements=capability_entitlements,
    )
    return {
        **sanitized,
        "operating_model": operating_model,
        "operating_model_label": _OPERATING_MODEL_LABELS[operating_model],
        "commercial_service_package": (
            commercial_service_package if commercial_service_package_explicit else ""
        ),
        "commercial_service_package_effective": commercial_service_package,
        "commercial_service_package_label": _COMMERCIAL_SERVICE_PACKAGE_LABELS[
            commercial_service_package
        ],
        "commercial_service_package_description": _COMMERCIAL_SERVICE_PACKAGE_DESCRIPTIONS[
            commercial_service_package
        ],
        "commercial_service_package_options": tenant_admin_commercial_service_package_options(),
        "case_visibility_mode_label": _VISIBILITY_MODE_LABELS[
            sanitized["case_visibility_mode"]  # type: ignore[index]
        ],
        "case_action_mode_label": _ACTION_MODE_LABELS[
            sanitized["case_action_mode"]  # type: ignore[index]
        ],
        "case_action_mode_deprecated": sanitized["case_action_mode"] == "read_only",
        "case_action_mode_semantics": "legacy_display_only",
        "case_list_visible": case_list_visible,
        "case_actions_enabled": case_actions_enabled,
        "mobile_primary": mobile_single_operator,
        "contract_operational_user_limit": 1 if mobile_single_operator else None,
        "shared_mobile_operator_enabled": mobile_single_operator,
        "shared_mobile_operator_web_inspector_enabled": shared_mobile_operator_web_inspector_enabled,
        "shared_mobile_operator_web_review_enabled": shared_mobile_operator_web_review_enabled,
        "shared_mobile_operator_surface_set": shared_mobile_operator_surface_set,
        "operational_user_cross_portal_enabled": bool(
            sanitized.get("operational_user_cross_portal_enabled", mobile_single_operator)
        ),
        "operational_user_admin_portal_enabled": bool(
            sanitized.get("operational_user_admin_portal_enabled", mobile_single_operator)
        ),
        "tenant_portal_entitlements": portal_entitlements,
        "tenant_capability_entitlements": capability_entitlements,
        "tenant_capability_aliases": capability_aliases,
        "mobile_chat_first_governance": mobile_chat_first_governance,
        "tenant_assignable_portal_set": tenant_assignable_portal_set,
        "admin_ceo_governance_scope": "client_contract_surface_limits",
        "admin_cliente_governance_scope": "client_employee_operations",
        "admin_cliente_governs_operational_profile": True,
        "admin_cliente_governs_staff_roles": True,
        "tenant_capability_flag_semantics": "derived_from_contract_surface",
        "commercial_package_scope": "tenant_isolated_contract",
        "commercial_capability_axes": list(_COMMERCIAL_CAPABILITY_AXES),
        "cross_surface_session_strategy": "governed_links_and_grants",
        "cross_surface_session_unified": False,
        "cross_surface_session_note": (
            "A continuidade entre mobile, inspetor web e mesa web segue grants e links governados "
            "pelo tenant; sessao unica real continua como evolucao futura opcional."
        ),
        "support_exceptional_protocol": "approval_scoped_temporary_audited",
        "tenant_retention_policy_owner": "admin_ceo_contract_setup",
        "technical_case_retention_min_days": 365,
        "issued_document_retention_min_days": 1825,
        "audit_retention_min_days": 1825,
        "human_signoff_required": True,
        "ai_assistance_audit_required": True,
        "human_override_justification_required": True,
        "consent_collection_mode": "tenant_terms_and_user_notice",
        "mandatory_audit_fields": list(_MANDATORY_AUDIT_FIELDS),
    }


def tenant_admin_can_view_cases(payload: Any) -> bool:
    return bool(summarize_tenant_admin_policy(payload)["case_list_visible"])


def tenant_admin_can_take_case_actions(payload: Any) -> bool:
    return bool(summarize_tenant_admin_policy(payload)["case_actions_enabled"])


def tenant_admin_surface_availability(payload: Any) -> dict[str, bool]:
    summary = summarize_tenant_admin_policy(payload)
    case_list_visible = bool(summary["case_list_visible"])
    portal_entitlements = dict(summary.get("tenant_portal_entitlements") or {})
    return {
        "admin": True,
        "chat": case_list_visible and bool(portal_entitlements.get("inspetor", True)),
        "mesa": case_list_visible and bool(portal_entitlements.get("revisor", True)),
    }


def tenant_admin_operational_user_limit(payload: Any) -> int | None:
    summary = summarize_tenant_admin_policy(payload)
    value = summary.get("contract_operational_user_limit")
    return int(value) if isinstance(value, int) and value > 0 else None


def tenant_admin_enforces_single_operational_user(payload: Any) -> bool:
    return tenant_admin_operational_user_limit(payload) == 1


def _normalize_user_portal(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    aliases = {
        "cliente": "cliente",
        "admin_cliente": "cliente",
        "admin-cliente": "cliente",
        "admincliente": "cliente",
        "inspetor": "inspetor",
        "inspetor_web": "inspetor",
        "inspetor-web": "inspetor",
        "app": "inspetor",
        "mobile": "inspetor",
        "mobile_inspetor": "inspetor",
        "revisor": "revisor",
        "mesa": "revisor",
        "mesa_avaliadora": "revisor",
        "mesa-avaliadora": "revisor",
        "mesa_web": "revisor",
        "mesa-mobile": "revisor",
    }
    return aliases.get(text)


def _normalize_user_portal_list(value: Any) -> list[str]:
    if isinstance(value, str):
        raw_values: Iterable[Any] = [item.strip() for item in value.split(",")]
    elif isinstance(value, (list, tuple, set, frozenset)):
        raw_values = value
    else:
        raw_values = []
    normalized: list[str] = []
    for item in raw_values:
        portal = _normalize_user_portal(item)
        if portal and portal not in normalized:
            normalized.append(portal)
    return normalized


def _base_portals_for_access_level(access_level: Any) -> list[str]:
    try:
        level = int(access_level)
    except (TypeError, ValueError):
        return []
    if level == int(NivelAcesso.INSPETOR):
        return ["inspetor"]
    if level == int(NivelAcesso.REVISOR):
        return ["revisor"]
    if level == int(NivelAcesso.ADMIN_CLIENTE):
        return ["cliente"]
    return []


def tenant_admin_allowed_user_portal_set(
    payload: Any,
    *,
    access_level: Any,
) -> list[str]:
    summary = summarize_tenant_admin_policy(payload)
    base_portals = _base_portals_for_access_level(access_level)
    portal_entitlements = dict(summary.get("tenant_portal_entitlements") or {})
    if any(not bool(portal_entitlements.get(portal, False)) for portal in base_portals):
        return []
    allowed = list(base_portals)
    base_is_operational = bool({"inspetor", "revisor"} & set(base_portals))
    if bool(summary.get("operational_user_cross_portal_enabled")):
        for portal in ("inspetor", "revisor"):
            if bool(portal_entitlements.get(portal, False)) and portal not in allowed:
                allowed.append(portal)
    if (
        base_is_operational
        and bool(summary.get("operational_user_admin_portal_enabled"))
        and bool(portal_entitlements.get("cliente", False))
    ):
        if "cliente" not in allowed:
            allowed.append("cliente")
    return allowed


def tenant_admin_normalize_user_portal_grants(
    payload: Any,
    *,
    access_level: Any,
    requested_portals: Any = None,
) -> list[str]:
    requested = _normalize_user_portal_list(requested_portals)
    allowed = tenant_admin_allowed_user_portal_set(payload, access_level=access_level)
    granted = [
        portal
        for portal in _base_portals_for_access_level(access_level)
        if portal in allowed
    ]
    for portal in requested:
        if portal in allowed and portal not in granted:
            granted.append(portal)
    return granted


def tenant_admin_effective_user_portal_grants(
    payload: Any,
    *,
    access_level: Any,
    stored_portals: Any = None,
) -> list[str]:
    effective = tenant_admin_normalize_user_portal_grants(
        payload,
        access_level=access_level,
        requested_portals=stored_portals,
    )
    summary = summarize_tenant_admin_policy(payload)
    base_portals = set(_base_portals_for_access_level(access_level))
    if bool(summary.get("operational_user_cross_portal_enabled")) and (
        {"inspetor", "revisor"} & base_portals
    ):
        allowed = tenant_admin_allowed_user_portal_set(payload, access_level=access_level)
        for portal in ("inspetor", "revisor"):
            if portal in allowed and portal not in effective:
                effective.append(portal)
    return effective


def tenant_admin_forbidden_user_portal_grants(
    payload: Any,
    *,
    access_level: Any,
    requested_portals: Any = None,
) -> list[str]:
    requested = _normalize_user_portal_list(requested_portals)
    allowed = set(tenant_admin_allowed_user_portal_set(payload, access_level=access_level))
    return [portal for portal in requested if portal not in allowed]


def tenant_admin_user_portal_label(portal: str) -> str:
    normalized = _normalize_user_portal(portal)
    if not normalized:
        return str(portal or "").strip()
    return _USER_PORTAL_LABELS.get(normalized, normalized)


def tenant_admin_portal_entitlements(payload: Any) -> dict[str, bool]:
    summary = summarize_tenant_admin_policy(payload)
    return {
        portal: bool(enabled)
        for portal, enabled in dict(summary.get("tenant_portal_entitlements") or {}).items()
    }


def tenant_admin_capability_entitlements(payload: Any) -> dict[str, bool]:
    summary = summarize_tenant_admin_policy(payload)
    return {
        capability: bool(enabled)
        for capability, enabled in dict(summary.get("tenant_capability_entitlements") or {}).items()
    }


def tenant_admin_capability_aliases(payload: Any) -> dict[str, bool]:
    summary = summarize_tenant_admin_policy(payload)
    aliases = summary.get("tenant_capability_aliases")
    if isinstance(aliases, dict):
        return {
            str(capability): bool(enabled)
            for capability, enabled in aliases.items()
        }
    return _mobile_chat_first_capability_aliases_from_legacy(
        tenant_admin_capability_entitlements(summary)
    )


def tenant_admin_portal_enabled(payload: Any, *, portal: str) -> bool:
    normalized = _normalize_user_portal(portal)
    if normalized is None:
        return False
    return bool(tenant_admin_portal_entitlements(payload).get(normalized, False))


def tenant_admin_capability_enabled(payload: Any, *, capability: str) -> bool:
    capability_key = str(capability or "").strip().lower()
    legacy_capabilities = tenant_admin_capability_entitlements(payload)
    if capability_key in legacy_capabilities:
        return bool(legacy_capabilities.get(capability_key, False))
    return bool(tenant_admin_capability_aliases(payload).get(capability_key, False))


def tenant_admin_user_capability_entitlements(
    payload: Any,
    *,
    access_level: Any,
    stored_portals: Any = None,
) -> dict[str, bool]:
    summary = summarize_tenant_admin_policy(payload)
    entitlements = tenant_admin_capability_entitlements(payload)
    allowed_portals = set(
        tenant_admin_effective_user_portal_grants(
            payload,
            access_level=access_level,
            stored_portals=stored_portals,
        )
    )
    try:
        access_level_int = int(access_level)
    except (TypeError, ValueError):
        access_level_int = None

    if access_level_int == int(NivelAcesso.ADMIN_CLIENTE):
        if "cliente" not in allowed_portals:
            return {
                capability: False for capability in entitlements
            }

        portal_entitlements = dict(summary.get("tenant_portal_entitlements") or {})
        chat_surface_enabled = bool(portal_entitlements.get("inspetor"))
        mesa_surface_enabled = bool(portal_entitlements.get("revisor"))
        entitlements["admin_manage_team"] = bool(portal_entitlements.get("cliente"))
        entitlements["inspector_case_create"] = chat_surface_enabled
        entitlements["inspector_case_finalize"] = chat_surface_enabled
        entitlements["inspector_send_to_mesa"] = chat_surface_enabled and mesa_surface_enabled
        entitlements["reviewer_decision"] = mesa_surface_enabled
        entitlements["reviewer_issue"] = mesa_surface_enabled
        entitlements["mobile_case_approve"] = False
        return entitlements

    if "cliente" not in allowed_portals:
        entitlements["admin_manage_team"] = False
    if "inspetor" not in allowed_portals:
        for capability in (
            "inspector_case_create",
            "inspector_case_finalize",
            "inspector_send_to_mesa",
            "mobile_case_approve",
        ):
            entitlements[capability] = False
    if "revisor" not in allowed_portals:
        for capability in ("reviewer_decision", "reviewer_issue"):
            entitlements[capability] = False
    return entitlements


def tenant_admin_user_capability_aliases(
    payload: Any,
    *,
    access_level: Any,
    stored_portals: Any = None,
) -> dict[str, bool]:
    return _mobile_chat_first_capability_aliases_from_legacy(
        tenant_admin_user_capability_entitlements(
            payload,
            access_level=access_level,
            stored_portals=stored_portals,
        )
    )


def tenant_admin_user_capability_enabled(
    payload: Any,
    *,
    capability: str,
    access_level: Any,
    stored_portals: Any = None,
) -> bool:
    capability_key = str(capability or "").strip().lower()
    legacy_capabilities = tenant_admin_user_capability_entitlements(
        payload,
        access_level=access_level,
        stored_portals=stored_portals,
    )
    if capability_key in legacy_capabilities:
        return bool(legacy_capabilities.get(capability_key, False))
    return bool(
        tenant_admin_user_capability_aliases(
            payload,
            access_level=access_level,
            stored_portals=stored_portals,
        ).get(capability_key, False)
    )


def build_tenant_access_policy_payload(
    payload: Any,
    *,
    access_level: Any | None = None,
    stored_portals: Any = None,
) -> dict[str, Any]:
    summary = summarize_tenant_admin_policy(payload)
    public_payload: dict[str, Any] = {
        "governed_by_admin_ceo": True,
        "commercial_service_package": summary.get("commercial_service_package") or "",
        "commercial_service_package_effective": summary.get("commercial_service_package_effective") or "",
        "commercial_service_package_label": summary.get("commercial_service_package_label") or "",
        "commercial_service_package_description": summary.get("commercial_service_package_description") or "",
        "portal_entitlements": tenant_admin_portal_entitlements(summary),
        "capability_entitlements": tenant_admin_capability_entitlements(summary),
        "capability_aliases": tenant_admin_capability_aliases(summary),
        "mobile_chat_first_governance": build_mobile_chat_first_governance_read_model(
            summary,
            capability_entitlements=tenant_admin_capability_entitlements(summary),
        ),
    }
    if access_level is not None:
        allowed_portals = tenant_admin_effective_user_portal_grants(
            summary,
            access_level=access_level,
            stored_portals=stored_portals,
        )
        public_payload["allowed_portals"] = allowed_portals
        public_payload["allowed_portal_labels"] = [
            tenant_admin_user_portal_label(item) for item in allowed_portals
        ]
        user_capabilities = tenant_admin_user_capability_entitlements(
            summary,
            access_level=access_level,
            stored_portals=stored_portals,
        )
        public_payload["user_capability_entitlements"] = user_capabilities
        public_payload["user_capability_aliases"] = (
            _mobile_chat_first_capability_aliases_from_legacy(user_capabilities)
        )
        public_payload["user_mobile_chat_first_governance"] = (
            build_mobile_chat_first_governance_read_model(
                summary,
                capability_entitlements=user_capabilities,
            )
        )
    return public_payload


def tenant_admin_default_admin_cliente_portal_grants(payload: Any) -> list[str]:
    summary = summarize_tenant_admin_policy(payload)
    if str(summary.get("operating_model") or "").strip().lower() != "mobile_single_operator":
        return ["cliente"]

    requested = ["inspetor"]
    if bool(summary.get("shared_mobile_operator_web_review_enabled")):
        requested.append("revisor")
    return tenant_admin_normalize_user_portal_grants(
        summary,
        access_level=int(NivelAcesso.ADMIN_CLIENTE),
        requested_portals=requested,
    )


def tenant_admin_user_occupies_operational_slot(
    payload: Any,
    *,
    access_level: Any,
    stored_portals: Any = None,
) -> bool:
    effective_portals = tenant_admin_effective_user_portal_grants(
        payload,
        access_level=access_level,
        stored_portals=stored_portals,
    )
    return bool({"inspetor", "revisor"} & set(effective_portals))


def summarize_tenant_admin_operational_package(
    payload: Any,
    *,
    operational_users_in_use: int | None = None,
) -> dict[str, Any]:
    summary = summarize_tenant_admin_policy(payload)
    operational_limit = tenant_admin_operational_user_limit(summary)
    current_users = None
    if operational_users_in_use is not None:
        try:
            current_users = max(0, int(operational_users_in_use))
        except (TypeError, ValueError):
            current_users = 0
    remaining_slots = (
        max(int(operational_limit) - int(current_users), 0)
        if operational_limit is not None and current_users is not None
        else None
    )
    excess_users = (
        max(int(current_users) - int(operational_limit), 0)
        if operational_limit is not None and current_users is not None
        else 0
    )
    surface_set = list(summary.get("shared_mobile_operator_surface_set") or [])
    surface_labels = [
        _OPERATING_SURFACE_LABELS.get(str(item), str(item).replace("_", " "))
        for item in surface_set
    ]
    mobile_single_operator = bool(summary.get("shared_mobile_operator_enabled"))
    return {
        "operating_model": str(summary.get("operating_model") or DEFAULT_TENANT_ADMIN_OPERATING_MODEL),
        "operating_model_label": str(
            summary.get("operating_model_label")
            or _OPERATING_MODEL_LABELS[DEFAULT_TENANT_ADMIN_OPERATING_MODEL]
        ),
        "mobile_single_operator_enabled": mobile_single_operator,
        "contract_operational_user_limit": operational_limit,
        "operational_users_in_use": current_users,
        "operational_users_remaining": remaining_slots,
        "operational_users_excess": excess_users,
        "operational_users_at_limit": bool(
            operational_limit is not None and current_users is not None and current_users >= operational_limit
        ),
        "shared_mobile_operator_surface_set": surface_set,
        "shared_mobile_operator_surface_labels": surface_labels,
        "shared_mobile_operator_web_inspector_enabled": bool(
            summary.get("shared_mobile_operator_web_inspector_enabled")
        ),
        "shared_mobile_operator_web_review_enabled": bool(
            summary.get("shared_mobile_operator_web_review_enabled")
        ),
        "identity_runtime_mode": (
            "tenant_scoped_portal_grants" if mobile_single_operator else "standard_role_accounts"
        ),
        "identity_runtime_note": (
            "A conta principal do tenant pode receber multiplas superficies conforme o cadastro definido no Admin-CEO."
            if mobile_single_operator
            else "Perfis operam por portal conforme o modelo atual."
        ),
    }


__all__ = [
    "DEFAULT_TENANT_ADMIN_CASE_ACTION_MODE",
    "DEFAULT_TENANT_ADMIN_CASE_VISIBILITY_MODE",
    "DEFAULT_TENANT_ADMIN_OPERATING_MODEL",
    "MobileChatFirstApprovalActorScope",
    "MobileChatFirstIssueGovernanceMode",
    "MobileChatFirstReviewGovernanceMode",
    "TenantAdminCaseActionMode",
    "TenantAdminCaseVisibilityMode",
    "TenantAdminOperatingModel",
    "build_mobile_chat_first_governance_read_model",
    "build_tenant_access_policy_payload",
    "tenant_admin_allowed_user_portal_set",
    "tenant_admin_capability_aliases",
    "tenant_admin_capability_enabled",
    "tenant_admin_capability_entitlements",
    "tenant_admin_default_admin_cliente_portal_grants",
    "tenant_admin_effective_user_portal_grants",
    "tenant_admin_enforces_single_operational_user",
    "tenant_admin_forbidden_user_portal_grants",
    "tenant_admin_normalize_user_portal_grants",
    "tenant_admin_operational_user_limit",
    "tenant_admin_portal_enabled",
    "tenant_admin_portal_entitlements",
    "tenant_admin_user_capability_aliases",
    "tenant_admin_user_capability_enabled",
    "tenant_admin_user_capability_entitlements",
    "tenant_admin_user_portal_label",
    "tenant_admin_user_occupies_operational_slot",
    "summarize_tenant_admin_operational_package",
    "sanitize_tenant_admin_policy",
    "summarize_tenant_admin_policy",
    "tenant_admin_can_take_case_actions",
    "tenant_admin_can_view_cases",
    "tenant_admin_surface_availability",
]
