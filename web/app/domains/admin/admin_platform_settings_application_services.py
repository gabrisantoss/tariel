from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.domains.admin import platform_settings_services as _platform_settings_services_module
from app.domains.admin.platform_settings_services import (
    apply_platform_settings_update as _apply_platform_settings_update,
    build_admin_platform_settings_console as _build_admin_platform_settings_console,
)
from app.shared.database import Usuario


def apply_platform_settings_update(
    banco: Session,
    *,
    actor_user: Usuario,
    group_key: str,
    reason: str,
    updates: dict[str, Any],
    logger_operacao,
) -> dict[str, Any]:
    return _apply_platform_settings_update(
        banco,
        actor_user=actor_user,
        group_key=group_key,
        reason=reason,
        updates=updates,
        logger_operacao=logger_operacao,
    )


def build_admin_platform_settings_console(
    banco: Session,
    *,
    build_platform_settings_console_overview,
    build_platform_settings_console_sections,
    build_access_setting_descriptors,
    build_support_setting_descriptors,
    build_rollout_setting_descriptors,
    build_defaults_setting_descriptors,
    build_access_runtime_descriptors,
    build_document_runtime_descriptors,
    build_observability_runtime_descriptors,
) -> dict[str, Any]:
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
