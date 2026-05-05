"""Read models internos do pacote da Revisão Técnica."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, selectinload

from app.domains.mesa.attachments import serializar_anexos_mesa, texto_mensagem_mesa_visivel
from app.domains.mesa.contracts import MensagemPacoteMesa, RevisaoPacoteMesa
from app.domains.mesa.semantics import build_mesa_message_semantics
from app.shared.database import Laudo, LaudoRevisao, MensagemLaudo
from nucleo.inspetor.referencias_mensagem import extrair_referencia_do_texto


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalizar_data_utc(data: datetime | None) -> datetime | None:
    if data is None:
        return None
    if data.tzinfo is None:
        return data.replace(tzinfo=timezone.utc)
    return data.astimezone(timezone.utc)


def listar_mensagens_mesa_pacote(
    banco: Session,
    *,
    laudo: Laudo,
) -> list[MensagemLaudo]:
    return (
        banco.query(MensagemLaudo)
        .options(selectinload(MensagemLaudo.anexos_mesa))
        .filter(MensagemLaudo.laudo_id == laudo.id)
        .order_by(MensagemLaudo.id.asc())
        .all()
    )


def listar_revisoes_mesa_pacote(
    banco: Session,
    *,
    laudo: Laudo,
    limite_revisoes: int,
) -> list[LaudoRevisao]:
    return (
        banco.query(LaudoRevisao)
        .filter(LaudoRevisao.laudo_id == laudo.id)
        .order_by(LaudoRevisao.numero_versao.desc())
        .limit(limite_revisoes)
        .all()
    )


def build_revisoes_pacote(revisoes: list[LaudoRevisao]) -> list[RevisaoPacoteMesa]:
    return [
        RevisaoPacoteMesa(
            numero_versao=int(revisao.numero_versao),
            origem=str(revisao.origem or "ia"),
            resumo=(revisao.resumo or None),
            confianca_geral=(revisao.confianca_geral or None),
            criado_em=_normalizar_data_utc(revisao.criado_em) or _agora_utc(),
        )
        for revisao in revisoes
    ]


def _nome_resolvedor_pacote(msg: MensagemLaudo) -> str:
    if not getattr(msg, "resolvida_por_id", None):
        return ""

    resolvedor = getattr(msg, "resolvida_por", None)
    if resolvedor is not None:
        return getattr(resolvedor, "nome", None) or getattr(resolvedor, "nome_completo", None) or f"Usuario #{msg.resolvida_por_id}"

    return f"Usuario #{msg.resolvida_por_id}"


def serializar_mensagem_pacote(msg: MensagemLaudo) -> MensagemPacoteMesa:
    referencia_mensagem_id, texto_limpo = extrair_referencia_do_texto(msg.conteudo)
    anexos_payload = serializar_anexos_mesa(getattr(msg, "anexos_mesa", None))
    semantics = build_mesa_message_semantics(
        legacy_message_type=msg.tipo,
        resolved_at=msg.resolvida_em,
        is_whisper=bool(getattr(msg, "is_whisper", False)),
    )
    return MensagemPacoteMesa(
        id=int(msg.id),
        tipo=str(msg.tipo or ""),
        item_kind=semantics.item_kind,
        message_kind=semantics.message_kind,
        pendency_state=semantics.pendency_state,
        texto=texto_mensagem_mesa_visivel(texto_limpo, anexos=getattr(msg, "anexos_mesa", None)),
        criado_em=_normalizar_data_utc(msg.criado_em) or _agora_utc(),
        remetente_id=int(msg.remetente_id) if msg.remetente_id else None,
        lida=bool(msg.lida),
        referencia_mensagem_id=referencia_mensagem_id,
        resolvida_em=_normalizar_data_utc(msg.resolvida_em),
        resolvida_por_id=int(msg.resolvida_por_id) if msg.resolvida_por_id else None,
        resolvida_por_nome=_nome_resolvedor_pacote(msg) or None,
        anexos=anexos_payload,
    )
