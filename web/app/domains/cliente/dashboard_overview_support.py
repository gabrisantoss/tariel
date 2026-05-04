"""Helpers de overview executivo e comercial do portal admin-cliente."""

from __future__ import annotations

from typing import Any

from app.shared.tenant_admin_policy import tenant_admin_user_portal_label


def _texto_curto(value: Any, *, fallback: str | None = None) -> str | None:
    texto = " ".join(str(value or "").strip().split())
    if texto:
        return texto
    return fallback


def _bool_dict(value: Any) -> dict[str, bool]:
    if not isinstance(value, dict):
        return {}
    return {str(key): bool(item) for key, item in value.items()}


def _plain_dict(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _resource_status(*, available: bool, depends_on_family: bool = False) -> tuple[str, str, str]:
    if available and depends_on_family:
        return "Disponível por família", "aprovado", "Depende da família/template"
    if available:
        return "Disponível", "aprovado", "Incluído no pacote"
    return "Não incluído", "aguardando", "Não incluído no pacote"


def _resource_item(
    *,
    key: str,
    label: str,
    available: bool,
    detail_available: str,
    detail_unavailable: str,
    depends_on_family: bool = False,
    action_kind: str | None = None,
    action_target: str | None = None,
    action_label: str | None = None,
    chips: list[str] | None = None,
) -> dict[str, Any]:
    status_label, tone, meta = _resource_status(
        available=available,
        depends_on_family=depends_on_family,
    )
    item: dict[str, Any] = {
        "key": key,
        "label": label,
        "available": available,
        "status_label": status_label,
        "tone": tone,
        "meta": meta,
        "detail": detail_available if available else detail_unavailable,
        "depends_on_family": depends_on_family,
        "contractual_blocked": not available,
        "chips": list(chips or []),
    }
    if available and action_kind and action_target:
        item["action"] = {
            "label": action_label or "Abrir",
            "kind": action_kind,
            "target": action_target,
        }
    return item


def build_tenant_commercial_overview_cliente(
    *,
    empresa_summary: dict[str, Any],
    tenant_policy_summary: dict[str, Any],
    surface_availability: dict[str, bool],
    usuarios: list[dict[str, Any]],
) -> dict[str, Any]:
    users = list(usuarios or [])
    portals = [
        {"key": "cliente", "label": "Portal Cliente", "enabled": True},
        {"key": "inspetor", "label": "Chat de campo", "enabled": bool(surface_availability.get("chat", True))},
        {"key": "revisor", "label": "Mesa avaliadora", "enabled": bool(surface_availability.get("mesa", True))},
    ]
    capability_entitlements = _bool_dict(tenant_policy_summary.get("tenant_capability_entitlements"))
    capability_aliases = _bool_dict(tenant_policy_summary.get("tenant_capability_aliases"))
    mobile_chat_first_governance = _plain_dict(tenant_policy_summary.get("mobile_chat_first_governance"))
    mesa_contracted = bool(surface_availability.get("mesa", True))
    chat_enabled = bool(surface_availability.get("chat", True)) and bool(
        capability_aliases.get("case_collect") or capability_entitlements.get("inspector_case_create")
    )
    mobile_enabled = bool(
        capability_aliases.get("case_collect") or capability_entitlements.get("inspector_case_create")
    )
    separate_mesa_available = mesa_contracted and bool(
        capability_aliases.get("case_send_to_separate_review")
        or capability_aliases.get("case_review_decide")
        or capability_entitlements.get("inspector_send_to_mesa")
        or capability_entitlements.get("reviewer_decision")
    )
    separate_mesa_required = bool(mobile_chat_first_governance.get("separate_mesa_required"))
    self_review_allowed = bool(
        mobile_chat_first_governance.get("self_review_allowed")
        or capability_aliases.get("case_self_review")
    ) and not separate_mesa_required
    official_issue_allowed = bool(
        mobile_chat_first_governance.get("official_issue_allowed")
        or capability_aliases.get("official_issue_create")
        or capability_entitlements.get("reviewer_issue")
    )
    official_issue_download_allowed = bool(
        capability_aliases.get("official_issue_download")
        or capability_entitlements.get("reviewer_issue")
    )
    signatory_required = bool(mobile_chat_first_governance.get("signatory_required"))
    documents_enabled = bool(surface_availability.get("documentos", True))
    resource_summary = {
        "mobile_enabled": mobile_enabled,
        "chat_enabled": chat_enabled,
        "self_review_allowed": self_review_allowed,
        "separate_mesa_available": separate_mesa_available,
        "official_issue_allowed": official_issue_allowed,
        "official_issue_download_allowed": official_issue_download_allowed,
        "signatory_required": signatory_required,
        "documents_enabled": documents_enabled,
    }
    resources = [
        _resource_item(
            key="mobile",
            label="Mobile",
            available=mobile_enabled,
            detail_available="App mobile pode operar coleta, fotos, chat e finalização conforme a família liberar.",
            detail_unavailable="Mobile não está incluído no pacote atual.",
            chips=["Cockpit técnico", "Fotos"],
        ),
        _resource_item(
            key="chat",
            label="Chat de campo",
            available=chat_enabled,
            detail_available="Chat de campo disponível para os usuários operacionais liberados nesta conta.",
            detail_unavailable="Chat de campo não está incluído no pacote atual.",
            action_kind="admin-section",
            action_target="lista-usuarios",
            action_label="Abrir equipe",
            chips=["IA", "Casos"],
        ),
        _resource_item(
            key="self_review",
            label="Revisão interna",
            available=self_review_allowed,
            detail_available="Revisão interna governada disponível para famílias que permitem aprovação sem Mesa separada.",
            detail_unavailable="Revisão interna não está liberada neste pacote ou a família exige revisão separada.",
            depends_on_family=True,
            chips=["Self-review", "Governança"],
        ),
        _resource_item(
            key="mesa",
            label="Mesa avaliadora",
            available=separate_mesa_available,
            detail_available="Mesa avaliadora disponível para os usuários liberados quando a revisão separada estiver contratada ou exigida.",
            detail_unavailable="Mesa avaliadora não incluída neste pacote; isso não é erro quando a família permite revisão interna.",
            depends_on_family=True,
            action_kind="admin-section",
            action_target="lista-usuarios",
            action_label="Abrir equipe",
            chips=["Revisão separada", "Aprovação"],
        ),
        _resource_item(
            key="official_issue",
            label="Emissão oficial",
            available=official_issue_allowed,
            detail_available="Emissão oficial disponível pelo motor governado, com pacote congelado, hash e requisitos de aprovação.",
            detail_unavailable="PDF operacional pode existir, mas não vira emissão oficial sem esta capacidade contratada.",
            depends_on_family=True,
            action_kind="documentos-section",
            action_target="documentos-overview",
            action_label="Ver documentos",
            chips=["Hash", "Manifest"],
        ),
        _resource_item(
            key="documents",
            label="Documentos oficiais",
            available=documents_enabled,
            detail_available="Aba Documentos disponível para histórico, status e downloads da conta.",
            detail_unavailable="Documentos não estão liberados para esta conta.",
            action_kind="documentos-section",
            action_target="documentos-overview",
            action_label="Abrir Documentos",
            chips=["Histórico", "Downloads"],
        ),
        _resource_item(
            key="governed_signatory",
            label="Signatário governado",
            available=official_issue_allowed and signatory_required,
            detail_available="Signatário governado é exigido pelo fluxo de emissão oficial quando a família/pacote pedir.",
            detail_unavailable="Signatário governado não está ativo enquanto emissão oficial não estiver contratada ou exigida.",
            depends_on_family=True,
            action_kind="documentos-section",
            action_target="documentos-overview",
            action_label="Ver emissão",
            chips=["Assinatura", "Responsável técnico"],
        ),
    ]
    assignable_portals = [
        tenant_admin_user_portal_label(item)
        for item in list(tenant_policy_summary.get("tenant_assignable_portal_set") or [])
        if str(item).strip()
    ]
    onboarding_pending = []
    if not users:
        onboarding_pending.append("Equipe operacional não criada")
    return {
        "commercial_service_package": str(tenant_policy_summary.get("commercial_service_package_effective") or ""),
        "package_label": _texto_curto(tenant_policy_summary.get("commercial_service_package_label"), fallback="Pacote contratado"),
        "package_description": _texto_curto(tenant_policy_summary.get("commercial_service_package_description")),
        "operating_model": str(tenant_policy_summary.get("operating_model") or "standard"),
        "operating_model_label": _texto_curto(tenant_policy_summary.get("operating_model_label"), fallback="Operação padrão"),
        "capability_aliases": capability_aliases,
        "mobile_chat_first_governance": mobile_chat_first_governance,
        "resource_summary": resource_summary,
        "resources": resources,
        "operators_in_use": len(users),
        "operators_limit": empresa_summary.get("usuarios_max"),
        "mesa_contracted": mesa_contracted,
        "official_issue_included": official_issue_allowed,
        "available_surfaces": [item for item in portals if item["enabled"]],
        "assignable_portal_labels": assignable_portals,
        "active_summary": [
            f"{len([item for item in portals if item['enabled']])} portais liberados",
            f"{len(users)} operadores cadastrados",
            "Mesa contratada" if mesa_contracted else "Sem Mesa contratada",
            "Emissão oficial incluída" if official_issue_allowed else "Sem emissão oficial contratada",
        ],
        "pending_configuration": onboarding_pending,
    }


def build_operational_observability_cliente(
    *,
    empresa_summary: dict[str, Any],
    tenant_admin_projection_payload: dict[str, Any] | None,
    laudos_mesa: list[dict[str, Any]],
    documentos_summary: dict[str, Any],
    recorrencia_summary: dict[str, Any],
) -> dict[str, Any]:
    tenant_payload = dict(tenant_admin_projection_payload or {})
    case_counts = dict(tenant_payload.get("case_counts") or {})
    review_counts = dict(tenant_payload.get("review_counts") or {})
    document_counts = dict(tenant_payload.get("document_counts") or {})
    pending_center: list[dict[str, Any]] = []
    for item in list(laudos_mesa or []):
        pendencias = int(item.get("pendencias_abertas") or 0)
        if pendencias <= 0:
            continue
        pending_center.append(
            {
                "kind": "mesa",
                "title": _texto_curto(item.get("titulo"), fallback=f"Laudo #{item.get('id')}") or "Laudo",
                "detail": f"{pendencias} pendência(s) aberta(s) na mesa.",
                "count": pendencias,
            }
        )
    overdue = int(recorrencia_summary.get("overdue") or 0)
    if overdue > 0:
        pending_center.append(
            {
                "kind": "recorrencia",
                "title": "Vencimentos atrasados",
                "detail": f"{overdue} inspeção(ões) com prazo vencido pedem ação imediata.",
                "count": overdue,
            }
        )
    pending_issue = int(documentos_summary.get("pending_issue_documents") or 0)
    if pending_issue > 0:
        pending_center.append(
            {
                "kind": "documento",
                "title": "Documentos aguardando emissão",
                "detail": f"{pending_issue} documento(s) prontos para fechar o ciclo oficial.",
                "count": pending_issue,
            }
        )
    reissue = int(documentos_summary.get("reissue_recommended") or 0)
    if reissue > 0:
        pending_center.append(
            {
                "kind": "documento",
                "title": "Reemissão recomendada",
                "detail": f"{reissue} emissão(ões) pedem nova congelagem documental.",
                "count": reissue,
            }
        )
    if bool(empresa_summary.get("status_bloqueio")):
        blocking_reason = "Empresa bloqueada no nível contratual."
    elif overdue > 0:
        blocking_reason = "Existem vencimentos atrasados na agenda preventiva."
    elif pending_center:
        blocking_reason = str(pending_center[0].get("detail") or "")
    else:
        blocking_reason = "Nenhum bloqueio operacional dominante foi detectado."
    timeline = [
        {"key": "criado", "label": "Criado", "count": int(case_counts.get("total_cases") or 0)},
        {"key": "enviado", "label": "Enviado", "count": int(review_counts.get("pending_review") or 0)},
        {"key": "comentado", "label": "Comentado", "count": int(review_counts.get("in_review") or 0)},
        {"key": "devolvido", "label": "Devolvido", "count": int(review_counts.get("sent_back_for_adjustment") or 0)},
        {"key": "aprovado", "label": "Aprovado", "count": int(review_counts.get("approved") or 0)},
        {"key": "emitido", "label": "Emitido", "count": int(document_counts.get("issued_documents") or documentos_summary.get("issued_documents") or 0)},
        {"key": "reaberto", "label": "Reaberto", "count": int(review_counts.get("reopened_after_issue") or 0)},
    ]
    return {
        "executive_metrics": {
            "open_cases": int(case_counts.get("open_cases") or 0),
            "awaiting_mesa": int(review_counts.get("pending_review") or 0),
            "sent_back": int(review_counts.get("sent_back_for_adjustment") or 0),
            "approved": int(review_counts.get("approved") or 0),
            "issued": int(document_counts.get("issued_documents") or documentos_summary.get("issued_documents") or 0),
            "due_next_30": int(recorrencia_summary.get("next_30_days") or 0),
        },
        "blocking_reason": blocking_reason,
        "pending_center": sorted(pending_center, key=lambda item: int(item.get("count") or 0), reverse=True)[:8],
        "operational_timeline": timeline,
    }


__all__ = [
    "build_operational_observability_cliente",
    "build_tenant_commercial_overview_cliente",
]
