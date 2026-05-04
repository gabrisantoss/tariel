"""Filtro de periodo do dashboard do cliente."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domains.chat.laudo_state_helpers import serializar_card_laudo
from app.domains.chat.normalization import TIPOS_TEMPLATE_VALIDOS
from app.shared.database import EmissaoOficialLaudo, Laudo, StatusRevisao, Usuario

_TZ_DASHBOARD = ZoneInfo("America/Sao_Paulo")

_PERIOD_OPTIONS = (
    ("today", "Hoje"),
    ("7d", "7 dias"),
    ("30d", "30 dias"),
    ("month", "Este mês"),
)


def normalizar_periodo_dashboard(valor: Any) -> str:
    chave = str(valor or "").strip().lower()
    validos = {key for key, _label in _PERIOD_OPTIONS}
    return chave if chave in validos else "30d"


def _periodo_intervalo(periodo: str) -> tuple[datetime, datetime]:
    agora_local = datetime.now(_TZ_DASHBOARD)
    if periodo == "today":
        inicio_local = agora_local.replace(hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "7d":
        inicio_local = agora_local - timedelta(days=7)
    elif periodo == "month":
        inicio_local = agora_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        inicio_local = agora_local - timedelta(days=30)
    return inicio_local.astimezone(timezone.utc), agora_local.astimezone(timezone.utc)


def _status_revisao(valor: Any) -> str:
    valor_base = getattr(valor, "value", valor)
    try:
        return StatusRevisao.normalizar(valor_base)
    except ValueError:
        return str(valor_base or "").strip()


def _serializar_caso_periodo(banco: Session, laudo: Laudo) -> dict[str, Any]:
    payload = serializar_card_laudo(banco, laudo)
    payload["tipo_template_label"] = TIPOS_TEMPLATE_VALIDOS.get(
        str(getattr(laudo, "tipo_template", None) or "padrao"),
        "Inspeção",
    )
    atualizado_em = getattr(laudo, "atualizado_em", None) or getattr(laudo, "criado_em", None)
    payload["atualizado_em"] = atualizado_em.isoformat() if atualizado_em is not None else ""
    return payload


def build_dashboard_period_payload(
    banco: Session,
    usuario: Usuario,
    *,
    periodo: str,
) -> dict[str, Any]:
    periodo_normalizado = normalizar_periodo_dashboard(periodo)
    inicio_utc, fim_utc = _periodo_intervalo(periodo_normalizado)
    atividade_em = func.coalesce(Laudo.atualizado_em, Laudo.criado_em)

    laudos = list(
        banco.scalars(
            select(Laudo)
            .where(
                Laudo.empresa_id == int(usuario.empresa_id),
                atividade_em >= inicio_utc,
                atividade_em <= fim_utc,
            )
            .order_by(atividade_em.desc(), Laudo.id.desc())
            .limit(80)
        ).all()
    )

    status_por_laudo = [_status_revisao(getattr(laudo, "status_revisao", None)) for laudo in laudos]
    total_cases = len(laudos)
    approved_cases = sum(1 for status in status_por_laudo if status == StatusRevisao.APROVADO.value)
    awaiting_mesa = sum(1 for status in status_por_laudo if status == StatusRevisao.AGUARDANDO.value)
    adjustment_cases = sum(1 for status in status_por_laudo if status == StatusRevisao.REJEITADO.value)
    open_cases = sum(1 for status in status_por_laudo if status != StatusRevisao.APROVADO.value)
    issued_documents = int(
        banco.scalar(
            select(func.count(EmissaoOficialLaudo.id)).where(
                EmissaoOficialLaudo.tenant_id == int(usuario.empresa_id),
                EmissaoOficialLaudo.issue_state == "issued",
                EmissaoOficialLaudo.issued_at >= inicio_utc,
                EmissaoOficialLaudo.issued_at <= fim_utc,
            )
        )
        or 0
    )

    return {
        "key": periodo_normalizado,
        "label": dict(_PERIOD_OPTIONS)[periodo_normalizado],
        "start_iso": inicio_utc.isoformat(),
        "end_iso": fim_utc.isoformat(),
        "options": [
            {
                "key": key,
                "label": label,
                "active": key == periodo_normalizado,
                "href": f"/cliente/dashboard?period={key}",
            }
            for key, label in _PERIOD_OPTIONS
        ],
        "laudos_count": total_cases,
        "total_cases": total_cases,
        "open_cases": open_cases,
        "awaiting_mesa": awaiting_mesa,
        "in_review": adjustment_cases,
        "approved_cases": approved_cases,
        "issued_documents": issued_documents,
        "recent_cases": [_serializar_caso_periodo(banco, laudo) for laudo in laudos[:10]],
    }


__all__ = [
    "build_dashboard_period_payload",
    "normalizar_periodo_dashboard",
]
