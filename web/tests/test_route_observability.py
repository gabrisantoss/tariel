from __future__ import annotations

import logging
from types import SimpleNamespace

from app.core.route_observability import (
    classificar_fluxo_critico,
    registrar_observabilidade_rota_critica,
)
from app.core.settings import get_settings


def _flow_key(path: str) -> str:
    flow = classificar_fluxo_critico(path)
    assert flow is not None
    return flow.key


def test_classificar_fluxo_critico_cobre_superficies_principais() -> None:
    assert _flow_key("/cliente/api/bootstrap") == "cliente_bootstrap"
    assert _flow_key("/cliente/api/chat/laudos") == "cliente_chat"
    assert _flow_key("/cliente/api/mesa/42") == "cliente_mesa"
    assert _flow_key("/app/api/chat") == "inspetor_chat"
    assert _flow_key("/revisao/painel") == "revisor_mesa"
    assert _flow_key("/app/laudo/42/preparar-emissao") == "documento_oficial"
    assert classificar_fluxo_critico("/static/js/app.js") is None


def test_observabilidade_rota_critica_loga_apenas_lento_ou_erro(monkeypatch, caplog) -> None:
    monkeypatch.setenv("AMBIENTE", "production")
    monkeypatch.setenv("TARIEL_ROUTE_OBSERVABILITY_ENABLED", "1")
    monkeypatch.setenv("TARIEL_ROUTE_OBSERVABILITY_SLOW_MS", "100")
    get_settings.cache_clear()
    logger = logging.getLogger("tests.route_observability")
    request = SimpleNamespace(
        url=SimpleNamespace(path="/cliente/api/bootstrap"),
        method="GET",
        state=SimpleNamespace(correlation_id="cid-123", client_request_id="client-123"),
    )

    try:
        with caplog.at_level(logging.WARNING, logger="tests.route_observability"):
            registrar_observabilidade_rota_critica(
                logger=logger,
                request=request,  # type: ignore[arg-type]
                status_code=200,
                duration_ms=20,
            )
            registrar_observabilidade_rota_critica(
                logger=logger,
                request=request,  # type: ignore[arg-type]
                status_code=200,
                duration_ms=150,
            )
            registrar_observabilidade_rota_critica(
                logger=logger,
                request=request,  # type: ignore[arg-type]
                status_code=500,
                duration_ms=10,
                error="RuntimeError",
            )
    finally:
        get_settings.cache_clear()

    records = [record for record in caplog.records if record.name == "tests.route_observability"]
    assert len(records) == 2
    assert records[0].flow_key == "cliente_bootstrap"
    assert records[0].reason == "slow_request"
    assert records[1].reason == "server_error"
