"""Observabilidade production-safe para fluxos críticos de produto."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from fastapi import Request

from app.core.settings import get_settings


@dataclass(frozen=True, slots=True)
class CriticalRouteFlow:
    key: str
    label: str


CRITICAL_ROUTE_FLOWS = (
    CriticalRouteFlow("cliente_bootstrap", "Bootstrap do portal cliente"),
    CriticalRouteFlow("cliente_chat", "Chat do portal cliente"),
    CriticalRouteFlow("cliente_mesa", "Mesa no portal cliente"),
    CriticalRouteFlow("inspetor_chat", "Chat do inspetor"),
    CriticalRouteFlow("revisor_mesa", "Mesa do revisor"),
    CriticalRouteFlow("documento_oficial", "Emissao e pacote documental"),
)


def classificar_fluxo_critico(path: str) -> CriticalRouteFlow | None:
    caminho = str(path or "").lower()
    if not caminho or caminho.startswith("/static/"):
        return None

    if caminho.startswith("/cliente/api/bootstrap"):
        return CRITICAL_ROUTE_FLOWS[0]
    if caminho.startswith("/cliente/api/chat"):
        return CRITICAL_ROUTE_FLOWS[1]
    if caminho.startswith(("/cliente/api/mesa", "/cliente/api/revisao")):
        return CRITICAL_ROUTE_FLOWS[2]
    if caminho.startswith(("/app/api/chat", "/app/api/mensagem", "/app/api/laudo")):
        return CRITICAL_ROUTE_FLOWS[3]
    if caminho.startswith(("/revisao/painel", "/revisao/api")):
        return CRITICAL_ROUTE_FLOWS[4]
    if any(token in caminho for token in ("/pdf", "pacote", "emitir", "emissao", "oficial")):
        return CRITICAL_ROUTE_FLOWS[5]
    return None


def registrar_observabilidade_rota_critica(
    *,
    logger: logging.Logger,
    request: Request,
    status_code: int,
    duration_ms: float,
    error: str | None = None,
) -> None:
    settings = get_settings()
    if not settings.route_observability_enabled:
        return

    path = request.url.path
    flow = classificar_fluxo_critico(path)
    if flow is None:
        return

    slow_threshold_ms = int(settings.route_observability_slow_ms)
    status = int(status_code)
    duration = round(max(float(duration_ms or 0.0), 0.0), 1)
    server_error = status >= 500
    slow = duration >= slow_threshold_ms
    if not server_error and not slow:
        return

    reason = "server_error" if server_error else "slow_request"
    payload: dict[str, Any] = {
        "observability_kind": "critical_route",
        "flow_key": flow.key,
        "flow_label": flow.label,
        "reason": reason,
        "path": path,
        "method": request.method,
        "status_code": status,
        "duration_ms": duration,
        "slow_threshold_ms": slow_threshold_ms,
        "correlation_id": getattr(request.state, "correlation_id", None),
        "client_request_id": getattr(request.state, "client_request_id", None),
    }
    if error:
        payload["error"] = str(error)[:120]

    logger.warning("Fluxo critico de produto lento ou falho", extra=payload)


__all__ = [
    "CRITICAL_ROUTE_FLOWS",
    "CriticalRouteFlow",
    "classificar_fluxo_critico",
    "registrar_observabilidade_rota_critica",
]
