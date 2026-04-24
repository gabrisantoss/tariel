"""Aplicacao da politica contratual por superficie do Admin Cliente."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.domains.admin.auditoria import registrar_auditoria_admin_empresa_segura
from app.domains.admin.services import atualizar_politica_admin_cliente_empresa


@dataclass(frozen=True, slots=True)
class AdminClienteSurfacePolicyForm:
    commercial_service_package: str = ""
    case_visibility_mode: str = ""
    operating_model: str = ""
    tenant_portal_cliente_enabled: str = ""
    tenant_portal_inspetor_enabled: str = ""
    tenant_portal_revisor_enabled: str = ""
    mobile_web_inspector_enabled: str = ""
    mobile_web_review_enabled: str = ""
    operational_user_cross_portal_enabled: str = ""
    operational_user_admin_portal_enabled: str = ""


def atualizar_politica_admin_cliente_por_superficie(
    banco: Session,
    *,
    empresa_id: int,
    ator_usuario_id: int | None,
    form: AdminClienteSurfacePolicyForm,
) -> dict[str, Any]:
    """Atualiza apenas contrato/superficies/limites governados pelo Admin CEO."""

    politica = atualizar_politica_admin_cliente_empresa(
        banco,
        empresa_id=int(empresa_id),
        commercial_service_package=form.commercial_service_package,
        case_visibility_mode=form.case_visibility_mode,
        operating_model=form.operating_model,
        tenant_portal_cliente_enabled=form.tenant_portal_cliente_enabled,
        tenant_portal_inspetor_enabled=form.tenant_portal_inspetor_enabled,
        tenant_portal_revisor_enabled=form.tenant_portal_revisor_enabled,
        mobile_web_inspector_enabled=form.mobile_web_inspector_enabled,
        mobile_web_review_enabled=form.mobile_web_review_enabled,
        operational_user_cross_portal_enabled=form.operational_user_cross_portal_enabled,
        operational_user_admin_portal_enabled=form.operational_user_admin_portal_enabled,
    )
    registrar_auditoria_admin_empresa_segura(
        banco,
        empresa_id=int(empresa_id),
        ator_usuario_id=ator_usuario_id,
        acao="tenant_admin_client_policy_updated",
        resumo="Configuracao de acesso da empresa atualizada.",
        detalhe=(
            f"Pacote: {str(politica['commercial_service_package_label'])}. "
            f"Modelo: {str(politica['operating_model_label'])}. "
            f"Visibilidade: {str(politica['case_visibility_mode_label'])}."
        ),
        payload=politica,
    )
    return politica


__all__ = [
    "AdminClienteSurfacePolicyForm",
    "atualizar_politica_admin_cliente_por_superficie",
]
