from app.domains.cliente.route_contracts import (
    build_cliente_route_governance_summary,
    cliente_route_governance_contracts,
)
from app.shared.database import NivelAcesso
from app.shared.tenant_admin_policy import build_tenant_access_policy_payload


def test_cliente_route_governance_define_admin_cliente_como_autoridade_operacional() -> None:
    contracts = cliente_route_governance_contracts()

    assert contracts
    assert {
        (item["method"], item["route_pattern"])
        for item in contracts
    } >= {
        ("POST", "/cliente/api/chat/laudos"),
        ("POST", "/cliente/api/chat/laudos/{laudo_id}/finalizar"),
        ("POST", "/cliente/api/mesa/laudos/{laudo_id}/responder"),
        ("POST", "/cliente/api/mesa/laudos/{laudo_id}/avaliar"),
    }
    assert {item["contract_authority"] for item in contracts} == {"admin_ceo"}
    assert {item["operational_authority"] for item in contracts} == {"admin_cliente"}
    assert all(item["tenant_boundary"] == "empresa_id" for item in contracts)


def test_cliente_route_governance_summary_separa_contrato_de_operacao() -> None:
    summary = build_cliente_route_governance_summary()

    assert summary["contract_name"] == "ClientePortalRouteGovernanceV1"
    assert "surface_availability" in summary["admin_ceo_contract_scope"]
    assert "commercial_package" in summary["admin_ceo_contract_scope"]
    assert "case_finalization" in summary["admin_cliente_operational_scope"]
    assert "mesa_decision_inside_tenant" in summary["admin_cliente_operational_scope"]
    assert "Admin CEO governa clientes/admin-cliente" in summary["authority_rule"]
    assert "inspetores e avaliadores" in summary["authority_rule"]


def test_admin_cliente_capacidades_operacionais_derivam_da_superficie_contratada() -> None:
    policy = {
        "case_visibility_mode": "case_list",
        "case_action_mode": "read_only",
        "tenant_portal_cliente_enabled": True,
        "tenant_portal_inspetor_enabled": True,
        "tenant_portal_revisor_enabled": True,
        "tenant_capability_admin_manage_team_enabled": False,
        "tenant_capability_inspector_case_create_enabled": False,
        "tenant_capability_inspector_case_finalize_enabled": False,
        "tenant_capability_inspector_send_to_mesa_enabled": False,
        "tenant_capability_reviewer_decision_enabled": False,
        "tenant_capability_reviewer_issue_enabled": False,
    }

    access_policy = build_tenant_access_policy_payload(
        policy,
        access_level=int(NivelAcesso.ADMIN_CLIENTE),
        stored_portals=["cliente"],
    )
    capabilities = access_policy["user_capability_entitlements"]

    assert capabilities["admin_manage_team"] is True
    assert capabilities["inspector_case_create"] is True
    assert capabilities["inspector_case_finalize"] is True
    assert capabilities["inspector_send_to_mesa"] is True
    assert capabilities["reviewer_decision"] is True
    assert capabilities["reviewer_issue"] is True
    assert capabilities["mobile_case_approve"] is False
