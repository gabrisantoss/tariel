"""Pacote de historico e memoria operacional da Mesa Avaliadora."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domains.mesa.contracts import (
    HistoricoInspecaoDiffBlocoPacoteMesa,
    HistoricoInspecaoDiffItemPacoteMesa,
    HistoricoInspecaoDiffPacoteMesa,
    HistoricoInspecaoPacoteMesa,
    HistoricoRefazerInspetorItemPacoteMesa,
    MemoriaOperacionalFamiliaPacoteMesa,
    MemoriaOperacionalFrequenciaPacoteMesa,
)
from app.shared.database import Laudo, OperationalIrregularity
from app.shared.inspection_history import build_inspection_history_summary
from app.shared.operational_memory import build_family_operational_memory_summary

RETURN_TO_INSPECTOR_TYPES = {"field_reopened", "block_returned_to_inspector"}


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalizar_data_utc(data: datetime | None) -> datetime | None:
    if data is None:
        return None
    if data.tzinfo is None:
        return data.replace(tzinfo=timezone.utc)
    return data.astimezone(timezone.utc)


def _texto_limpo_curto(valor: Any) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    return " ".join(texto.split())


def _dict_payload(valor: Any) -> dict[str, Any]:
    return dict(valor) if isinstance(valor, dict) else {}


def _list_payload(valor: Any) -> list[Any]:
    return list(valor) if isinstance(valor, list) else []


def _resumir_texto_curto(valor: Any, *, limite: int = 180) -> str | None:
    texto = _texto_limpo_curto(valor)
    if texto is None:
        return None
    if len(texto) <= limite:
        return texto
    return f"{texto[: max(0, limite - 3)].rstrip()}..."


def _humanizar_slug(valor: Any) -> str:
    texto = str(valor or "").strip().replace("_", " ")
    if not texto:
        return ""
    return " ".join(parte.capitalize() for parte in texto.split())


def _primeiro_texto(*valores: Any) -> str | None:
    for valor in valores:
        texto = _texto_limpo_curto(valor)
        if texto:
            return texto
    return None


def _resumo_irregularidade_operacional(registro: OperationalIrregularity) -> str | None:
    detalhes = registro.details_json if isinstance(registro.details_json, dict) else {}
    return _primeiro_texto(
        detalhes.get("required_action"),
        detalhes.get("message"),
        detalhes.get("reason"),
        detalhes.get("motivo"),
        detalhes.get("summary"),
        _humanizar_slug(registro.block_key) if registro.block_key else None,
    )


def _nome_usuario_relacionado(usuario: Any, fallback_id: int | None) -> str | None:
    if usuario is not None:
        return _texto_limpo_curto(getattr(usuario, "nome", None) or getattr(usuario, "nome_completo", None))
    if fallback_id:
        return f"Usuario #{fallback_id}"
    return None


def build_historico_refazer_inspetor_pacote(
    banco: Session,
    *,
    laudo_id: int,
    limite: int = 10,
) -> list[HistoricoRefazerInspetorItemPacoteMesa]:
    registros = (
        banco.execute(
            select(OperationalIrregularity)
            .options(
                selectinload(OperationalIrregularity.detected_by_user),
                selectinload(OperationalIrregularity.resolved_by),
            )
            .where(
                OperationalIrregularity.laudo_id == int(laudo_id),
                OperationalIrregularity.irregularity_type.in_(tuple(sorted(RETURN_TO_INSPECTOR_TYPES))),
            )
            .order_by(OperationalIrregularity.criado_em.desc(), OperationalIrregularity.id.desc())
            .limit(max(1, limite))
        )
        .scalars()
        .all()
    )
    return [
        HistoricoRefazerInspetorItemPacoteMesa(
            id=int(registro.id),
            irregularity_type=str(registro.irregularity_type or ""),
            severity=str(registro.severity or ""),
            status=str(registro.status or ""),
            detected_by=str(registro.detected_by or ""),
            block_key=_texto_limpo_curto(registro.block_key),
            evidence_key=_texto_limpo_curto(registro.evidence_key),
            summary=_resumir_texto_curto(_resumo_irregularidade_operacional(registro), limite=280),
            resolution_notes=_resumir_texto_curto(registro.resolution_notes, limite=400),
            resolution_mode=_texto_limpo_curto(registro.resolution_mode),
            detected_at=_normalizar_data_utc(registro.criado_em) or _agora_utc(),
            resolved_at=_normalizar_data_utc(registro.resolved_at),
            detected_by_user_name=_nome_usuario_relacionado(registro.detected_by_user, registro.detected_by_user_id),
            resolved_by_user_name=_nome_usuario_relacionado(registro.resolved_by, registro.resolved_by_id),
        )
        for registro in registros
    ]


def build_memoria_operacional_familia_pacote(
    banco: Session,
    *,
    laudo: Laudo,
) -> MemoriaOperacionalFamiliaPacoteMesa | None:
    family_key = _texto_limpo_curto(getattr(laudo, "catalog_family_key", None) or getattr(laudo, "tipo_template", None))
    if not family_key:
        return None

    resumo = build_family_operational_memory_summary(
        banco,
        empresa_id=int(laudo.empresa_id),
        family_key=family_key,
    )
    return MemoriaOperacionalFamiliaPacoteMesa(
        family_key=resumo.family_key,
        approved_snapshot_count=resumo.approved_snapshot_count,
        operational_event_count=resumo.operational_event_count,
        validated_evidence_count=resumo.validated_evidence_count,
        open_irregularity_count=resumo.open_irregularity_count,
        latest_approved_at=resumo.latest_approved_at,
        latest_event_at=resumo.latest_event_at,
        top_event_types=[
            MemoriaOperacionalFrequenciaPacoteMesa(item_key=item.item_key, count=item.count)
            for item in resumo.top_event_types
        ],
        top_open_irregularities=[
            MemoriaOperacionalFrequenciaPacoteMesa(item_key=item.item_key, count=item.count)
            for item in resumo.top_open_irregularities
        ],
    )


def build_historico_inspecao_pacote(
    banco: Session,
    *,
    laudo: Laudo,
) -> HistoricoInspecaoPacoteMesa | None:
    historico = build_inspection_history_summary(
        banco,
        laudo=laudo,
    )
    if not isinstance(historico, dict):
        return None

    diff_payload = _dict_payload(historico.get("diff"))
    highlights = []
    identity_highlights = []
    block_highlights = []
    for item in _list_payload(diff_payload.get("highlights")):
        if not isinstance(item, dict):
            continue
        path = _texto_limpo_curto(item.get("path"))  # type: ignore[misc]
        label = _texto_limpo_curto(item.get("label"))  # type: ignore[misc]
        change_type = _texto_limpo_curto(item.get("change_type"))  # type: ignore[misc]
        if not path or not label or not change_type:
            continue
        highlights.append(
            HistoricoInspecaoDiffItemPacoteMesa(
                path=path[:240],
                label=label[:240],
                change_type=change_type[:24],
                previous_value=_resumir_texto_curto(item.get("previous_value"), limite=120),
                current_value=_resumir_texto_curto(item.get("current_value"), limite=120),
            )
        )
    for item in _list_payload(diff_payload.get("identity_highlights")):
        if not isinstance(item, dict):
            continue
        path = _texto_limpo_curto(item.get("path"))  # type: ignore[misc]
        label = _texto_limpo_curto(item.get("label"))  # type: ignore[misc]
        change_type = _texto_limpo_curto(item.get("change_type"))  # type: ignore[misc]
        if not path or not label or not change_type:
            continue
        identity_highlights.append(
            HistoricoInspecaoDiffItemPacoteMesa(
                path=path[:240],
                label=label[:240],
                change_type=change_type[:24],
                previous_value=_resumir_texto_curto(item.get("previous_value"), limite=120),
                current_value=_resumir_texto_curto(item.get("current_value"), limite=120),
            )
        )
    for item in _list_payload(diff_payload.get("block_highlights")):
        if not isinstance(item, dict):
            continue
        block_key = _texto_limpo_curto(item.get("block_key"))
        title = _texto_limpo_curto(item.get("title"))
        if not block_key or not title:
            continue
        fields = []
        for field in list(item.get("fields") or []):
            if not isinstance(field, dict):
                continue
            path = _texto_limpo_curto(field.get("path"))  # type: ignore[misc]
            label = _texto_limpo_curto(field.get("label"))  # type: ignore[misc]
            change_type = _texto_limpo_curto(field.get("change_type"))  # type: ignore[misc]
            if not path or not label or not change_type:
                continue
            fields.append(
                HistoricoInspecaoDiffItemPacoteMesa(
                    path=path[:240],
                    label=label[:240],
                    change_type=change_type[:24],
                    previous_value=_resumir_texto_curto(field.get("previous_value"), limite=120),
                    current_value=_resumir_texto_curto(field.get("current_value"), limite=120),
                )
            )
        block_highlights.append(
            HistoricoInspecaoDiffBlocoPacoteMesa(
                block_key=block_key[:120],
                title=title[:160],
                changed_count=int(item.get("changed_count") or 0),
                added_count=int(item.get("added_count") or 0),
                removed_count=int(item.get("removed_count") or 0),
                total_changes=int(item.get("total_changes") or 0),
                identity_change_count=int(item.get("identity_change_count") or 0),
                summary=_resumir_texto_curto(item.get("summary"), limite=240),
                fields=fields,
            )
        )

    snapshot_id = int(historico.get("snapshot_id") or 0)
    source_laudo_id = int(historico.get("source_laudo_id") or 0)
    if snapshot_id <= 0 or source_laudo_id <= 0:
        return None

    return HistoricoInspecaoPacoteMesa(
        snapshot_id=snapshot_id,
        source_laudo_id=source_laudo_id,
        source_codigo_hash=_texto_limpo_curto(historico.get("source_codigo_hash")),
        approved_at=_normalizar_data_utc(historico.get("approved_at")),
        approval_version=int(historico.get("approval_version") or 0) or None,
        document_outcome=_resumir_texto_curto(historico.get("document_outcome"), limite=80),
        matched_by=_resumir_texto_curto(historico.get("matched_by"), limite=40),
        match_score=int(historico.get("match_score") or 0),
        prefilled_field_count=int(historico.get("prefilled_field_count") or 0),
        diff=HistoricoInspecaoDiffPacoteMesa(
            changed_count=int(diff_payload.get("changed_count") or 0),
            added_count=int(diff_payload.get("added_count") or 0),
            removed_count=int(diff_payload.get("removed_count") or 0),
            total_changes=int(diff_payload.get("total_changes") or 0),
            identity_change_count=int(diff_payload.get("identity_change_count") or 0),
            current_fields_count=int(diff_payload.get("current_fields_count") or 0),
            reference_fields_count=int(diff_payload.get("reference_fields_count") or 0),
            summary=_resumir_texto_curto(diff_payload.get("summary"), limite=240),
            highlights=highlights,
            identity_highlights=identity_highlights,
            block_highlights=block_highlights,
        ),
    )
