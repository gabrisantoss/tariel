from __future__ import annotations

from app.shared.database import NivelAcesso
from app.shared.tenant_admin_policy import (
    build_mobile_chat_first_governance_read_model,
    build_tenant_access_policy_payload,
    summarize_tenant_admin_policy,
    tenant_admin_user_capability_enabled,
)


def test_inspector_chat_expoe_self_review_neutro_sem_emissao_oficial() -> None:
    resumo = summarize_tenant_admin_policy(
        {"commercial_service_package": "inspector_chat"}
    )

    aliases = resumo["tenant_capability_aliases"]
    governance = resumo["mobile_chat_first_governance"]

    assert resumo["tenant_capability_entitlements"]["mobile_case_approve"] is True
    assert aliases["case_self_review"] is True
    assert aliases["official_issue_create"] is False
    assert governance["review_governance_mode"] == "self_review_allowed"
    assert governance["self_review_allowed"] is True
    assert governance["official_issue_allowed"] is False
    assert "case_self_review" in governance["available_case_actions"]
    assert "official_issue_create" not in governance["available_case_actions"]


def test_pacote_com_mesa_expoe_aliases_de_revisao_e_emissao() -> None:
    resumo = summarize_tenant_admin_policy(
        {"commercial_service_package": "inspector_chat_mesa"}
    )

    aliases = resumo["tenant_capability_aliases"]
    governance = resumo["mobile_chat_first_governance"]

    assert resumo["tenant_capability_entitlements"]["inspector_send_to_mesa"] is True
    assert resumo["tenant_capability_entitlements"]["reviewer_decision"] is True
    assert resumo["tenant_capability_entitlements"]["reviewer_issue"] is True
    assert aliases["case_send_to_separate_review"] is True
    assert aliases["case_review_decide"] is True
    assert aliases["official_issue_create"] is True
    assert aliases["official_issue_download"] is True
    assert aliases["governed_signatory_select"] is True
    assert governance["review_governance_mode"] == "separate_mesa_required"
    assert governance["separate_mesa_required"] is True
    assert governance["issue_governance_mode"] == "signatory_required"
    assert "case_send_to_separate_review" in governance["available_case_actions"]
    assert "official_issue_create" in governance["available_case_actions"]


def test_mobile_autonomous_legado_vira_self_review_no_read_model() -> None:
    governance = build_mobile_chat_first_governance_read_model(
        {"commercial_service_package": "inspector_chat"},
        review_mode="mobile_autonomous",
    )

    assert governance["review_mode_legacy"] == "mobile_autonomous"
    assert governance["review_governance_mode"] == "self_review_allowed"
    assert governance["approval_actor_scope"] == "inspector_self"
    assert governance["self_review_allowed"] is True


def test_familia_alto_risco_pode_forcar_mesa_separada_sem_mudar_capabilities() -> None:
    governance = build_mobile_chat_first_governance_read_model(
        {"commercial_service_package": "inspector_chat"},
        review_mode="mobile_autonomous",
        high_risk_family_requires_separate_review=True,
    )

    assert governance["review_governance_mode"] == "separate_mesa_required"
    assert governance["separate_mesa_required"] is True
    assert governance["self_review_allowed"] is False
    assert "case_self_review" not in governance["available_case_actions"]


def test_access_policy_publica_aliases_neutros_por_usuario_sem_remover_legados() -> None:
    policy = {"commercial_service_package": "inspector_chat_mesa_reviewer_services"}

    access_policy = build_tenant_access_policy_payload(
        policy,
        access_level=int(NivelAcesso.INSPETOR),
        stored_portals=["inspetor", "revisor"],
    )

    assert access_policy["user_capability_entitlements"]["reviewer_decision"] is True
    assert access_policy["user_capability_entitlements"]["reviewer_issue"] is True
    assert access_policy["user_capability_aliases"]["case_review_decide"] is True
    assert access_policy["user_capability_aliases"]["official_issue_create"] is True
    assert (
        access_policy["user_mobile_chat_first_governance"]["official_issue_allowed"]
        is True
    )
    assert (
        tenant_admin_user_capability_enabled(
            policy,
            capability="official_issue_create",
            access_level=int(NivelAcesso.INSPETOR),
            stored_portals=["inspetor", "revisor"],
        )
        is True
    )
