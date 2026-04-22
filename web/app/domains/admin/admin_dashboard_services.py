from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any


def buscar_metricas_ia_painel(db, *, dependencies: dict[str, Any]) -> dict[str, Any]:
    select = dependencies["select"]
    func = dependencies["func"]
    Empresa = dependencies["Empresa"]
    Laudo = dependencies["Laudo"]
    tenant_cliente_clause = dependencies["tenant_cliente_clause"]
    case_prioridade_plano = dependencies["case_prioridade_plano"]
    listar_catalogo_familias = dependencies["listar_catalogo_familias"]
    serializar_familia_catalogo_row = dependencies["serializar_familia_catalogo_row"]
    build_catalog_governance_rollup = dependencies["build_catalog_governance_rollup"]
    build_commercial_scale_rollup = dependencies["build_commercial_scale_rollup"]
    build_calibration_queue_rollup = dependencies["build_calibration_queue_rollup"]
    agora_utc = dependencies["agora_utc"]

    qtd_clientes = db.scalar(select(func.count(Empresa.id)).where(tenant_cliente_clause())) or 0
    total_inspecoes = db.scalar(select(func.count(Laudo.id))) or 0
    faturamento_ia = db.scalar(select(func.coalesce(func.sum(Laudo.custo_api_reais), 0))) or Decimal("0")
    familias_catalogadas = listar_catalogo_familias(db, filtro_classificacao="family")
    family_rows = [serializar_familia_catalogo_row(item) for item in familias_catalogadas]

    stmt_ranking = select(Empresa).where(tenant_cliente_clause()).order_by(case_prioridade_plano(), Empresa.id.desc())
    ranking = list(db.scalars(stmt_ranking).all())

    hoje = agora_utc().date()
    labels: list[str] = []
    valores: list[int] = []

    for i in range(6, -1, -1):
        dia = hoje - timedelta(days=i)
        inicio = datetime(dia.year, dia.month, dia.day, tzinfo=timezone.utc)
        fim = inicio + timedelta(days=1)

        qtd = (
            db.scalar(
                select(func.count(Laudo.id)).where(
                    Laudo.criado_em >= inicio,
                    Laudo.criado_em < fim,
                )
            )
            or 0
        )

        labels.append(dia.strftime("%a %d/%m"))
        valores.append(int(qtd))

    return {
        "qtd_clientes": int(qtd_clientes),
        "total_inspecoes": int(total_inspecoes),
        "receita_ia_total": faturamento_ia,
        "clientes": ranking,
        "governance_rollup": build_catalog_governance_rollup(
            db,
            families=familias_catalogadas,
        ),
        "commercial_scale_rollup": build_commercial_scale_rollup(family_rows),
        "calibration_queue_rollup": build_calibration_queue_rollup(family_rows),
        "labels_grafico": labels,
        "valores_grafico": valores,
    }
