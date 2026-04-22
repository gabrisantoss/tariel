from __future__ import annotations

from typing import Any


def buscar_detalhe_cliente(db, empresa_id: int, *, dependencies: dict[str, Any]) -> dict[str, Any] | None:
    tenant_client_read_services = dependencies["tenant_client_read_services"]
    return tenant_client_read_services.buscar_detalhe_cliente(
        db,
        empresa_id,
        portfolio_summary_fn=dependencies["portfolio_summary_fn"],
        tenant_admin_policy_summary_fn=dependencies["tenant_admin_policy_summary_fn"],
        user_serializer=dependencies["user_serializer"],
        first_access_summary_fn=dependencies["first_access_summary_fn"],
        signatory_serializer=dependencies["signatory_serializer"],
    )
