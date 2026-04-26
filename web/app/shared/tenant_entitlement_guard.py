from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.shared.database import Usuario
from app.shared.tenant_admin_policy import (
    build_tenant_access_policy_payload,
    tenant_admin_user_capability_enabled,
)

_CAPABILITY_DENIAL_DETAILS: dict[str, str] = {
    "admin_manage_team": "A gestão de equipe está desabilitada para esta empresa pelo Admin-CEO.",
    "inspector_case_create": "A criação de laudos está desabilitada para esta empresa pelo Admin-CEO.",
    "inspector_case_finalize": "A finalização de laudos está desabilitada para esta empresa pelo Admin-CEO.",
    "inspector_send_to_mesa": "O envio para a Mesa Avaliadora está desabilitado para esta empresa pelo Admin-CEO.",
    "mobile_case_approve": "A aprovação final no mobile está desabilitada para esta empresa pelo Admin-CEO.",
    "reviewer_decision": "A revisão da Mesa Avaliadora está desabilitada para esta empresa pelo Admin-CEO.",
    "reviewer_issue": "A emissão oficial está desabilitada para esta empresa pelo Admin-CEO.",
    "case_create": "A criação de casos está desabilitada para esta empresa pelo Admin-CEO.",
    "case_collect": "A coleta técnica está desabilitada para esta empresa pelo Admin-CEO.",
    "case_finalize_request": "A finalização de casos está desabilitada para esta empresa pelo Admin-CEO.",
    "case_send_to_separate_review": "O envio para revisão separada está desabilitado para esta empresa pelo Admin-CEO.",
    "case_self_review": "A aprovação interna do caso está desabilitada para esta empresa pelo Admin-CEO.",
    "case_review_decide": "A decisão de revisão do caso está desabilitada para esta empresa pelo Admin-CEO.",
    "structured_review_edit": "A revisão estruturada está desabilitada para esta empresa pelo Admin-CEO.",
    "official_issue_create": "A emissão oficial está desabilitada para esta empresa pelo Admin-CEO.",
    "official_issue_download": "O download de emissão oficial está desabilitado para esta empresa pelo Admin-CEO.",
    "governed_signatory_select": "O uso de signatário governado está desabilitado para esta empresa pelo Admin-CEO.",
}


def tenant_access_policy_for_user(usuario: Usuario | None) -> dict[str, Any]:
    if usuario is None:
        return {
            "governed_by_admin_ceo": True,
            "portal_entitlements": {},
            "capability_entitlements": {},
            "capability_aliases": {},
            "allowed_portals": [],
            "allowed_portal_labels": [],
            "user_capability_entitlements": {},
            "user_capability_aliases": {},
        }

    policy = getattr(getattr(usuario, "empresa", None), "admin_cliente_policy_json", None)
    return build_tenant_access_policy_payload(
        policy,
        access_level=getattr(usuario, "nivel_acesso", None),
        stored_portals=getattr(usuario, "allowed_portals", ()),
    )


def tenant_capability_enabled_for_user(
    usuario: Usuario | None,
    *,
    capability: str,
) -> bool:
    if usuario is None:
        return False

    policy = getattr(getattr(usuario, "empresa", None), "admin_cliente_policy_json", None)
    return bool(
        tenant_admin_user_capability_enabled(
            policy,
            capability=capability,
            access_level=getattr(usuario, "nivel_acesso", None),
            stored_portals=getattr(usuario, "allowed_portals", ()),
        )
    )


def ensure_tenant_capability_for_user(
    usuario: Usuario | None,
    *,
    capability: str,
    detail: str | None = None,
) -> None:
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada. Faça login novamente.",
        )

    if tenant_capability_enabled_for_user(usuario, capability=capability):
        return

    capability_key = str(capability or "").strip().lower()
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail or _CAPABILITY_DENIAL_DETAILS.get(capability_key, "A capacidade solicitada está desabilitada para esta empresa pelo Admin-CEO."),
    )


__all__ = [
    "ensure_tenant_capability_for_user",
    "tenant_capability_enabled_for_user",
    "tenant_access_policy_for_user",
]
