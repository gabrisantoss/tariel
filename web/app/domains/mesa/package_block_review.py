"""Revisao por bloco do pacote da Revisão Técnica."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.mesa.contracts import (
    CoverageMapItemPacoteMesa,
    CoverageMapPacoteMesa,
    DocumentoEstruturadoPacoteMesa,
    RevisaoPorBlocoItemPacoteMesa,
    RevisaoPorBlocoPacoteMesa,
)
from app.domains.mesa.operational_tasks import extract_operational_context
from app.shared.database import MensagemLaudo, OperationalIrregularity

SECTION_ORDER = (
    "identificacao",
    "caracterizacao_do_equipamento",
    "inspecao_visual",
    "dispositivos_e_acessorios",
    "dispositivos_e_controles",
    "documentacao_e_registros",
    "nao_conformidades",
    "recomendacoes",
    "conclusao",
)
RETURN_TO_INSPECTOR_TYPES = {"field_reopened", "block_returned_to_inspector"}
BLOCK_REVIEW_STATUS_PRIORITY = {
    "returned": 0,
    "attention": 1,
    "partial": 2,
    "ready": 3,
    "empty": 4,
}


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
        texto = _resumir_texto_curto(valor)
        if texto:
            return texto
    return None


def _inferir_secao_revisao_por_tokens(
    *,
    available_keys: set[str],
    tokens: list[str],
) -> str | None:
    texto = " ".join(token for token in tokens if token).lower()
    if not texto:
        return None

    for section_key in SECTION_ORDER:
        if section_key in available_keys and section_key in texto:
            return section_key

    if "identificacao" in available_keys and any(
        token in texto for token in ("placa", "identificacao", "tag", "patrimonial", "serial")
    ):
        return "identificacao"

    if "caracterizacao_do_equipamento" in available_keys and any(
        token in texto for token in ("vista_geral", "equipamento", "caracterizacao", "descricao_sumaria", "ativo")
    ):
        return "caracterizacao_do_equipamento"

    if "inspecao_visual" in available_keys and any(
        token in texto
        for token in (
            "inspecao",
            "visual",
            "corros",
            "vazamento",
            "fuligem",
            "isolamento",
            "chamine",
            "exaust",
            "integridade",
            "foto_",
            "imagem",
            "angulo",
        )
    ):
        return "inspecao_visual"

    if "dispositivos_e_controles" in available_keys and any(
        token in texto for token in ("controle", "painel", "intertrav", "chave", "botao")
    ):
        return "dispositivos_e_controles"

    if "dispositivos_e_acessorios" in available_keys and any(
        token in texto
        for token in ("dispositivo", "acessorio", "valvula", "manometro", "pressostato", "sensor", "seguranca")
    ):
        return "dispositivos_e_acessorios"

    if "documentacao_e_registros" in available_keys and any(
        token in texto for token in ("document", "prontuario", "certificado", "registro", "art", "rrt", "pdf")
    ):
        return "documentacao_e_registros"

    if "nao_conformidades" in available_keys and any(
        token in texto for token in ("nao_conform", "desvio", "anomalia", "irregularidade")
    ):
        return "nao_conformidades"

    if "recomendacoes" in available_keys and any(token in texto for token in ("recomend", "acao_corretiva", "prazo")):
        return "recomendacoes"

    if "conclusao" in available_keys and any(token in texto for token in ("conclus", "parecer", "status_final")):
        return "conclusao"

    return None


def _inferir_secao_revisao_item_cobertura(
    item: CoverageMapItemPacoteMesa,
    *,
    available_keys: set[str],
) -> str | None:
    return _inferir_secao_revisao_por_tokens(
        available_keys=available_keys,
        tokens=[
            str(item.evidence_key or ""),
            str(item.title or ""),
            str(item.kind or ""),
            str(item.component_type or ""),
            str(item.view_angle or ""),
            str(item.summary or ""),
            *[str(reason or "") for reason in list(item.failure_reasons or [])],
        ],
    )


def _inferir_secao_revisao_contexto_operacional(
    contexto: dict[str, Any],
    *,
    available_keys: set[str],
) -> str | None:
    return _inferir_secao_revisao_por_tokens(
        available_keys=available_keys,
        tokens=[
            str(contexto.get("block_key") or ""),
            str(contexto.get("evidence_key") or ""),
            str(contexto.get("title") or ""),
            str(contexto.get("kind") or ""),
            str(contexto.get("component_type") or ""),
            str(contexto.get("view_angle") or ""),
            str(contexto.get("summary") or ""),
            str(contexto.get("required_action") or ""),
            *[str(reason or "") for reason in list(contexto.get("failure_reasons") or [])],
        ],
    )


def _inferir_secao_revisao_irregularidade(
    registro: OperationalIrregularity,
    *,
    available_keys: set[str],
) -> str | None:
    detalhes = registro.details_json if isinstance(registro.details_json, dict) else {}
    return _inferir_secao_revisao_por_tokens(
        available_keys=available_keys,
        tokens=[
            str(registro.block_key or ""),
            str(registro.evidence_key or ""),
            str(registro.irregularity_type or ""),
            str(detalhes.get("title") or ""),
            str(detalhes.get("summary") or ""),
            str(detalhes.get("required_action") or ""),
            str(detalhes.get("reason") or ""),
            *[str(reason or "") for reason in list(detalhes.get("failure_reasons") or [])],
        ],
    )


def _status_revisao_bloco(
    *,
    document_status: str,
    coverage_alert_count: int,
    open_return_count: int,
    open_pendency_count: int,
) -> str:
    if open_return_count > 0 or open_pendency_count > 0:
        return "returned"
    if document_status == "attention" or coverage_alert_count > 0:
        return "attention"
    if document_status == "partial":
        return "partial"
    if document_status == "filled":
        return "ready"
    return "empty"


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


def build_revisao_por_bloco_pacote(
    banco: Session,
    *,
    laudo_id: int,
    documento: DocumentoEstruturadoPacoteMesa | None,
    coverage_map: CoverageMapPacoteMesa | None,
    mensagens: list[MensagemLaudo],
) -> RevisaoPorBlocoPacoteMesa | None:
    if documento is None or not documento.sections:
        return None

    available_keys = {str(secao.key) for secao in documento.sections}
    por_bloco: dict[str, dict[str, Any]] = {
        str(secao.key): {
            "section": secao,
            "coverage_total": 0,
            "coverage_alert_count": 0,
            "open_return_count": 0,
            "open_pendency_count": 0,
            "latest_return_at": None,
            "recommended_action": None,
        }
        for secao in documento.sections
    }

    if coverage_map is not None:
        for item in coverage_map.items:
            section_key = _inferir_secao_revisao_item_cobertura(item, available_keys=available_keys)
            if not section_key:
                continue
            bloco = por_bloco.get(section_key)
            if bloco is None:
                continue
            bloco["coverage_total"] += 1
            if str(item.status or "").strip().lower() in {"missing", "irregular"}:
                bloco["coverage_alert_count"] += 1
                if bloco["recommended_action"] is None:
                    bloco["recommended_action"] = _primeiro_texto(
                        item.summary,
                        ", ".join(list(item.failure_reasons or [])) if item.failure_reasons else None,
                    )

    for mensagem in mensagens:
        contexto = extract_operational_context(mensagem)
        if contexto is None:
            continue
        section_key = _inferir_secao_revisao_contexto_operacional(contexto, available_keys=available_keys)
        if not section_key:
            continue
        bloco = por_bloco.get(section_key)
        if bloco is None:
            continue
        if not bool(mensagem.lida):
            bloco["open_pendency_count"] += 1
        data_retorno = _normalizar_data_utc(mensagem.criado_em)
        if data_retorno and (bloco["latest_return_at"] is None or data_retorno > bloco["latest_return_at"]):
            bloco["latest_return_at"] = data_retorno
        bloco["recommended_action"] = bloco["recommended_action"] or _primeiro_texto(
            contexto.get("required_action"),
            contexto.get("summary"),
        )

    irregularidades = (
        banco.execute(
            select(OperationalIrregularity)
            .where(
                OperationalIrregularity.laudo_id == int(laudo_id),
                OperationalIrregularity.irregularity_type.in_(tuple(sorted(RETURN_TO_INSPECTOR_TYPES))),
            )
            .order_by(OperationalIrregularity.criado_em.desc(), OperationalIrregularity.id.desc())
        )
        .scalars()
        .all()
    )

    for registro in irregularidades:
        section_key = _inferir_secao_revisao_irregularidade(registro, available_keys=available_keys)
        if not section_key:
            continue
        bloco = por_bloco.get(section_key)
        if bloco is None:
            continue
        if str(registro.status or "").strip().lower() == "open":
            bloco["open_return_count"] += 1
        data_retorno = _normalizar_data_utc(registro.criado_em)
        if data_retorno and (bloco["latest_return_at"] is None or data_retorno > bloco["latest_return_at"]):
            bloco["latest_return_at"] = data_retorno
        bloco["recommended_action"] = bloco["recommended_action"] or _primeiro_texto(
            _resumo_irregularidade_operacional(registro),
            registro.resolution_notes,
        )

    items: list[RevisaoPorBlocoItemPacoteMesa] = []
    ready_blocks = 0
    attention_blocks = 0
    returned_blocks = 0

    for secao in documento.sections:
        bloco = por_bloco[str(secao.key)]
        review_status = _status_revisao_bloco(
            document_status=str(secao.status or ""),
            coverage_alert_count=int(bloco["coverage_alert_count"]),
            open_return_count=int(bloco["open_return_count"]),
            open_pendency_count=int(bloco["open_pendency_count"]),
        )
        if review_status == "returned":
            returned_blocks += 1
        elif review_status == "attention":
            attention_blocks += 1
        elif review_status == "ready":
            ready_blocks += 1

        items.append(
            RevisaoPorBlocoItemPacoteMesa(
                block_key=str(secao.key),
                title=str(secao.title),
                document_status=str(secao.status),
                review_status=review_status,
                summary=secao.summary,
                diff_short=secao.diff_short,
                filled_fields=int(secao.filled_fields),
                total_fields=int(secao.total_fields),
                coverage_total=int(bloco["coverage_total"]),
                coverage_alert_count=int(bloco["coverage_alert_count"]),
                open_return_count=int(bloco["open_return_count"]),
                open_pendency_count=int(bloco["open_pendency_count"]),
                latest_return_at=bloco["latest_return_at"],
                recommended_action=_resumir_texto_curto(bloco["recommended_action"], limite=280),
            )
        )

    items.sort(
        key=lambda item: (
            BLOCK_REVIEW_STATUS_PRIORITY.get(str(item.review_status), 99),
            SECTION_ORDER.index(item.block_key) if item.block_key in SECTION_ORDER else 99,
            item.title.lower(),
        )
    )

    return RevisaoPorBlocoPacoteMesa(
        total_blocks=len(items),
        ready_blocks=ready_blocks,
        attention_blocks=attention_blocks,
        returned_blocks=returned_blocks,
        items=items,
    )
