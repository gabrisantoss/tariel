"""Sumários de mensagens usados no pacote da Mesa."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone

from app.domains.mesa.contracts import (
    ResumoEvidenciasMesa,
    ResumoMensagensMesa,
    ResumoPendenciasMesa,
)
from app.shared.database import MensagemLaudo, TipoMensagem
from nucleo.inspetor.referencias_mensagem import extrair_referencia_do_texto

REGEX_ARQUIVO_DOCUMENTO = re.compile(r"\.(?:pdf|docx?)\b", flags=re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class MesaMessagePackageSummary:
    resumo_mensagens: ResumoMensagensMesa
    resumo_evidencias: ResumoEvidenciasMesa
    resumo_pendencias: ResumoPendenciasMesa
    pendencias_abertas: list[MensagemLaudo]
    pendencias_resolvidas: list[MensagemLaudo]
    whispers_recentes: list[MensagemLaudo]
    ultima_interacao_em: datetime | None


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalizar_data_utc(data: datetime | None) -> datetime | None:
    if data is None:
        return None
    if data.tzinfo is None:
        return data.replace(tzinfo=timezone.utc)
    return data.astimezone(timezone.utc)


def _texto_eh_foto(conteudo: str) -> bool:
    texto = (conteudo or "").strip().lower()
    return texto in {"[imagem]", "imagem enviada", "[foto]"}


def _texto_representa_documento(conteudo: str) -> bool:
    texto = (conteudo or "").strip()
    if not texto:
        return False
    if texto.lower().startswith("documento:"):
        return True
    return bool(REGEX_ARQUIVO_DOCUMENTO.search(texto))


def _texto_eh_evidencia_textual(conteudo: str) -> bool:
    texto = (conteudo or "").strip()
    if not texto:
        return False
    if _texto_eh_foto(texto):
        return False
    if _texto_representa_documento(texto):
        return False
    return len(texto) >= 8


def build_mesa_message_package_summary(
    mensagens: list[MensagemLaudo],
    *,
    laudo_criado_em: datetime | None,
    laudo_atualizado_em: datetime | None,
    limite_whispers: int,
) -> MesaMessagePackageSummary:
    total_inspetor = 0
    total_ia = 0
    total_mesa = 0
    total_outros = 0
    evidencias_textuais = 0
    evidencias_fotos = 0
    evidencias_documentos = 0

    for msg in mensagens:
        tipo = str(msg.tipo or "")
        _, texto_limpo = extrair_referencia_do_texto(msg.conteudo)

        if tipo in {TipoMensagem.USER.value, TipoMensagem.HUMANO_INSP.value}:
            total_inspetor += 1
            if tipo != TipoMensagem.USER.value:
                continue
            if _texto_eh_foto(texto_limpo):
                evidencias_fotos += 1
            elif _texto_representa_documento(texto_limpo):
                evidencias_documentos += 1
            elif _texto_eh_evidencia_textual(texto_limpo):
                evidencias_textuais += 1
            continue

        if tipo == TipoMensagem.IA.value:
            total_ia += 1
            continue

        if tipo == TipoMensagem.HUMANO_ENG.value:
            total_mesa += 1
            continue

        total_outros += 1

    mensagens_mesa = [msg for msg in mensagens if msg.tipo == TipoMensagem.HUMANO_ENG.value]
    pendencias_abertas = [msg for msg in mensagens_mesa if msg.resolvida_em is None]
    pendencias_resolvidas = [msg for msg in mensagens_mesa if msg.resolvida_em is not None]
    pendencias_resolvidas.sort(
        key=lambda msg: (
            _normalizar_data_utc(msg.resolvida_em)
            or _normalizar_data_utc(msg.criado_em)
            or _agora_utc()
        ),
        reverse=True,
    )

    limite_whispers_seguro = max(10, min(int(limite_whispers), 400))
    whispers = [msg for msg in mensagens if msg.is_whisper]
    whispers_recentes = list(reversed(whispers[-limite_whispers_seguro:]))

    ultima_interacao = None
    if mensagens:
        ultima_interacao = _normalizar_data_utc(mensagens[-1].criado_em)
    if ultima_interacao is None:
        ultima_interacao = _normalizar_data_utc(laudo_atualizado_em) or _normalizar_data_utc(laudo_criado_em)

    return MesaMessagePackageSummary(
        resumo_mensagens=ResumoMensagensMesa(
            total=len(mensagens),
            inspetor=total_inspetor,
            ia=total_ia,
            mesa=total_mesa,
            sistema_outros=total_outros,
        ),
        resumo_evidencias=ResumoEvidenciasMesa(
            total=evidencias_textuais + evidencias_fotos + evidencias_documentos,
            textuais=evidencias_textuais,
            fotos=evidencias_fotos,
            documentos=evidencias_documentos,
        ),
        resumo_pendencias=ResumoPendenciasMesa(
            total=len(mensagens_mesa),
            abertas=len(pendencias_abertas),
            resolvidas=len(pendencias_resolvidas),
        ),
        pendencias_abertas=pendencias_abertas,
        pendencias_resolvidas=pendencias_resolvidas,
        whispers_recentes=whispers_recentes,
        ultima_interacao_em=ultima_interacao,
    )


__all__ = [
    "MesaMessagePackageSummary",
    "build_mesa_message_package_summary",
]
