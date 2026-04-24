"""Helpers de overview executivo e comercial do portal admin-cliente."""

from __future__ import annotations

from typing import Any

from app.shared.tenant_admin_policy import tenant_admin_user_portal_label


def _texto_curto(value: Any, *, fallback: str | None = None) -> str | None:
    texto = " ".join(str(value or "").strip().split())
    if texto:
        return texto
    return fallback


def build_tenant_commercial_overview_cliente(
    *,
    empresa_summary: dict[str, Any],
    tenant_policy_summary: dict[str, Any],
    surface_availability: dict[str, bool],
    usuarios: list[dict[str, Any]],
) -> dict[str, Any]:
    users = list(usuarios or [])
    portals = [
        {"key": "cliente", "label": "Admin-Cliente", "enabled": True},
        {"key": "inspetor", "label": "Inspetor", "enabled": bool(surface_availability.get("chat", True))},
        {"key": "revisor", "label": "Mesa Avaliadora", "enabled": bool(surface_availability.get("mesa", True))},
    ]
    capability_entitlements = dict(tenant_policy_summary.get("tenant_capability_entitlements") or {})
    assignable_portals = [
        tenant_admin_user_portal_label(item)
        for item in list(tenant_policy_summary.get("tenant_assignable_portal_set") or [])
        if str(item).strip()
    ]
    onboarding_pending = []
    if not users:
        onboarding_pending.append("Equipe operacional não criada")
    if not bool(surface_availability.get("mesa", True)):
        onboarding_pending.append("Mesa contratada não liberada")
    if not bool(capability_entitlements.get("reviewer_issue")):
        onboarding_pending.append("Emissão oficial ainda não coberta pelo pacote")
    return {
        "package_label": _texto_curto(tenant_policy_summary.get("commercial_service_package_label"), fallback="Pacote contratado"),
        "package_description": _texto_curto(tenant_policy_summary.get("commercial_service_package_description")),
        "operating_model_label": _texto_curto(tenant_policy_summary.get("operating_model_label"), fallback="Operação padrão"),
        "operators_in_use": len(users),
        "operators_limit": empresa_summary.get("usuarios_max"),
        "mesa_contracted": bool(surface_availability.get("mesa", True)),
        "official_issue_included": bool(capability_entitlements.get("reviewer_issue")),
        "available_surfaces": [item for item in portals if item["enabled"]],
        "assignable_portal_labels": assignable_portals,
        "active_summary": [
            f"{len([item for item in portals if item['enabled']])} portais liberados",
            f"{len(users)} operadores cadastrados",
            "Mesa contratada" if bool(surface_availability.get("mesa", True)) else "Sem mesa contratada",
            "Emissão oficial incluída" if bool(capability_entitlements.get("reviewer_issue")) else "Sem emissão oficial",
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
    pending_center = []
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
        blocking_reason = pending_center[0]["detail"]
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
