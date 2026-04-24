"""Contratos de governanca das rotas do portal admin-cliente."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

ClienteRouteSurface = Literal["chat", "mesa", "admin"]
ClienteRouteAuthority = Literal["admin_ceo", "admin_cliente", "system"]

_ADMIN_CEO_CONTRACT_SCOPE = (
    "client_account_contract",
    "commercial_package",
    "surface_availability",
    "tenant_identity_limits",
    "tenant_suspension",
)
_ADMIN_CLIENTE_OPERATIONAL_SCOPE = (
    "employee_role_grants",
    "inspector_employee_authority",
    "evaluator_employee_authority",
    "case_creation",
    "case_messaging",
    "case_finalization",
    "case_reopen",
    "mesa_contextual_reply",
    "mesa_pendency_resolution",
    "mesa_decision_inside_tenant",
    "team_operations_inside_contract",
)


@dataclass(frozen=True, slots=True)
class ClienteRouteGovernanceContract:
    method: str
    route_pattern: str
    surface: ClienteRouteSurface
    route_kind: str
    contract_authority: ClienteRouteAuthority
    operational_authority: ClienteRouteAuthority
    required_contract_surface: str
    tenant_boundary: str = "empresa_id"
    csrf_required: bool = True
    admin_ceo_scope: tuple[str, ...] = _ADMIN_CEO_CONTRACT_SCOPE
    admin_cliente_scope: tuple[str, ...] = _ADMIN_CLIENTE_OPERATIONAL_SCOPE
    note: str = (
        "Admin CEO governa o contrato do cliente; Admin Cliente governa seus "
        "funcionarios, que neste produto sao inspetores e avaliadores."
    )

    def to_payload(self) -> dict[str, object]:
        return asdict(self)


_CLIENTE_ROUTE_GOVERNANCE_CONTRACTS: tuple[ClienteRouteGovernanceContract, ...] = (
    ClienteRouteGovernanceContract(
        method="GET",
        route_pattern="/cliente/api/chat/laudos",
        surface="chat",
        route_kind="case_list",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="chat",
        csrf_required=False,
    ),
    ClienteRouteGovernanceContract(
        method="POST",
        route_pattern="/cliente/api/chat/laudos",
        surface="chat",
        route_kind="case_create",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="chat",
    ),
    ClienteRouteGovernanceContract(
        method="POST",
        route_pattern="/cliente/api/chat/mensagem",
        surface="chat",
        route_kind="case_message",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="chat",
    ),
    ClienteRouteGovernanceContract(
        method="POST",
        route_pattern="/cliente/api/chat/laudos/{laudo_id}/finalizar",
        surface="chat",
        route_kind="case_finalize",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="chat",
    ),
    ClienteRouteGovernanceContract(
        method="POST",
        route_pattern="/cliente/api/chat/laudos/{laudo_id}/reabrir",
        surface="chat",
        route_kind="case_reopen",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="chat",
    ),
    ClienteRouteGovernanceContract(
        method="GET",
        route_pattern="/cliente/api/mesa/laudos",
        surface="mesa",
        route_kind="mesa_case_list",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="mesa",
        csrf_required=False,
    ),
    ClienteRouteGovernanceContract(
        method="POST",
        route_pattern="/cliente/api/mesa/laudos/{laudo_id}/responder",
        surface="mesa",
        route_kind="mesa_contextual_reply",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="mesa",
    ),
    ClienteRouteGovernanceContract(
        method="PATCH",
        route_pattern="/cliente/api/mesa/laudos/{laudo_id}/pendencias/{mensagem_id}",
        surface="mesa",
        route_kind="mesa_pendency_resolution",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="mesa",
    ),
    ClienteRouteGovernanceContract(
        method="POST",
        route_pattern="/cliente/api/mesa/laudos/{laudo_id}/avaliar",
        surface="mesa",
        route_kind="mesa_decision_inside_tenant",
        contract_authority="admin_ceo",
        operational_authority="admin_cliente",
        required_contract_surface="mesa",
    ),
)


def cliente_route_governance_contracts() -> list[dict[str, object]]:
    return [contract.to_payload() for contract in _CLIENTE_ROUTE_GOVERNANCE_CONTRACTS]


def build_cliente_route_governance_summary() -> dict[str, object]:
    contracts = cliente_route_governance_contracts()
    return {
        "contract_name": "ClientePortalRouteGovernanceV1",
        "contract_version": "v1",
        "admin_ceo_contract_scope": list(_ADMIN_CEO_CONTRACT_SCOPE),
        "admin_cliente_operational_scope": list(_ADMIN_CLIENTE_OPERATIONAL_SCOPE),
        "authority_rule": (
            "Admin CEO governa clientes/admin-cliente no nivel de contrato, superficies "
            "e limites; Admin Cliente governa seus funcionarios, que neste produto sao "
            "inspetores e avaliadores."
        ),
        "route_contracts": contracts,
    }


__all__ = [
    "ClienteRouteAuthority",
    "ClienteRouteGovernanceContract",
    "ClienteRouteSurface",
    "build_cliente_route_governance_summary",
    "cliente_route_governance_contracts",
]
