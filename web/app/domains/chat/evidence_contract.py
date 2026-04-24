"""Typed evidence classification used by Chat quality gates."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.domains.chat.media_helpers import mensagem_representa_documento

EVIDENCE_KIND_TEXT = "text"
EVIDENCE_KIND_PHOTO = "photo"
EVIDENCE_KIND_DOCUMENT = "document"
EVIDENCE_SOURCE_MESSAGE = "message"
EVIDENCE_SOURCE_VISUAL_LEARNING = "visual_learning"


@dataclass(frozen=True)
class EvidenceClassification:
    message_id: int | None
    kinds: tuple[str, ...]
    sources: tuple[str, ...]

    @property
    def counts_as_text(self) -> bool:
        return EVIDENCE_KIND_TEXT in self.kinds

    @property
    def counts_as_photo(self) -> bool:
        return EVIDENCE_KIND_PHOTO in self.kinds

    @property
    def counts_as_document(self) -> bool:
        return EVIDENCE_KIND_DOCUMENT in self.kinds

    @property
    def evidence_units(self) -> int:
        return len(self.kinds)


def mensagem_eh_comando_sistema(conteudo: str) -> bool:
    texto = (conteudo or "").strip()
    if not texto:
        return False

    texto_lower = texto.lower()
    return (
        "[comando_sistema]" in texto_lower
        or "[comando_rapido]" in texto_lower
        or "comando_sistema finalizarlaudoagora" in texto_lower
        or "solicitou encerramento e geracao do laudo" in texto_lower
        or "solicitou encerramento e geracao do laudo" in texto_lower
    )


def mensagem_representa_foto_placeholder(conteudo: str) -> bool:
    texto = (conteudo or "").strip().lower()
    return texto in {"[imagem]", "imagem enviada", "[foto]"}


def mensagem_textual_relevante(conteudo: str) -> bool:
    texto = (conteudo or "").strip()
    if not texto:
        return False
    if mensagem_eh_comando_sistema(texto):
        return False
    if mensagem_representa_foto_placeholder(texto):
        return False
    if mensagem_representa_documento(texto):
        return False

    texto_util = re.sub(r"[\W_]+", "", texto, flags=re.UNICODE)
    return len(texto_util) >= 8


def classificar_evidencia_mensagem(
    *,
    message_id: int | None,
    conteudo: str,
    possui_evidencia_visual: bool = False,
) -> EvidenceClassification:
    kinds: list[str] = []
    sources = [EVIDENCE_SOURCE_MESSAGE]
    texto = (conteudo or "").strip()

    if mensagem_textual_relevante(texto):
        kinds.append(EVIDENCE_KIND_TEXT)
    if mensagem_representa_foto_placeholder(texto) or possui_evidencia_visual:
        kinds.append(EVIDENCE_KIND_PHOTO)
        if possui_evidencia_visual:
            sources.append(EVIDENCE_SOURCE_VISUAL_LEARNING)
    if mensagem_representa_documento(texto):
        kinds.append(EVIDENCE_KIND_DOCUMENT)

    return EvidenceClassification(
        message_id=message_id,
        kinds=tuple(kinds),
        sources=tuple(dict.fromkeys(sources)),
    )


__all__ = [
    "EVIDENCE_KIND_DOCUMENT",
    "EVIDENCE_KIND_PHOTO",
    "EVIDENCE_KIND_TEXT",
    "EVIDENCE_SOURCE_MESSAGE",
    "EVIDENCE_SOURCE_VISUAL_LEARNING",
    "EvidenceClassification",
    "classificar_evidencia_mensagem",
    "mensagem_eh_comando_sistema",
    "mensagem_representa_foto_placeholder",
    "mensagem_textual_relevante",
]
