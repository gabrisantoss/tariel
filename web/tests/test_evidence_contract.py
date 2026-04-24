from __future__ import annotations

from app.domains.chat.evidence_contract import (
    EVIDENCE_KIND_DOCUMENT,
    EVIDENCE_KIND_PHOTO,
    EVIDENCE_KIND_TEXT,
    EVIDENCE_SOURCE_MESA_ATTACHMENT,
    EVIDENCE_SOURCE_MESSAGE,
    EVIDENCE_SOURCE_VISUAL_LEARNING,
    classificar_anexo_mesa_evidencia,
    classificar_evidencia_mensagem,
)


def test_classificar_evidencia_textual_relevante() -> None:
    resultado = classificar_evidencia_mensagem(
        message_id=10,
        conteudo="Medicao de campo com desvio visivel no equipamento.",
    )

    assert resultado.message_id == 10
    assert resultado.kinds == (EVIDENCE_KIND_TEXT,)
    assert resultado.sources == (EVIDENCE_SOURCE_MESSAGE,)
    assert resultado.evidence_units == 1
    assert resultado.counts_as_text is True
    assert resultado.counts_as_photo is False
    assert resultado.counts_as_document is False


def test_classificar_evidencia_foto_por_placeholder_ou_aprendizado_visual() -> None:
    placeholder = classificar_evidencia_mensagem(
        message_id=11,
        conteudo="[imagem]",
    )
    aprendizado_visual = classificar_evidencia_mensagem(
        message_id=12,
        conteudo="Imagem enviada pelo inspetor.",
        possui_evidencia_visual=True,
    )

    assert placeholder.kinds == (EVIDENCE_KIND_PHOTO,)
    assert placeholder.sources == (EVIDENCE_SOURCE_MESSAGE,)
    assert aprendizado_visual.kinds == (EVIDENCE_KIND_TEXT, EVIDENCE_KIND_PHOTO)
    assert aprendizado_visual.sources == (
        EVIDENCE_SOURCE_MESSAGE,
        EVIDENCE_SOURCE_VISUAL_LEARNING,
    )


def test_classificar_evidencia_documental_nao_conta_como_texto() -> None:
    resultado = classificar_evidencia_mensagem(
        message_id=13,
        conteudo="documento: prontuario_eletrico.pdf",
    )

    assert resultado.kinds == (EVIDENCE_KIND_DOCUMENT,)
    assert resultado.counts_as_text is False
    assert resultado.counts_as_document is True


def test_classificar_comando_sistema_nao_gera_evidencia() -> None:
    resultado = classificar_evidencia_mensagem(
        message_id=14,
        conteudo="[COMANDO_SISTEMA] finalizarLaudoAgora",
    )

    assert resultado.kinds == ()
    assert resultado.evidence_units == 0


def test_classificar_anexo_mesa_carrega_tipo_mime_e_vinculo() -> None:
    foto = classificar_anexo_mesa_evidencia(
        attachment_id=20,
        message_id=15,
        categoria="imagem",
        mime_type="image/png",
    )
    documento = classificar_anexo_mesa_evidencia(
        attachment_id=21,
        message_id=15,
        categoria="documento",
        mime_type="application/pdf",
    )

    assert foto.kinds == (EVIDENCE_KIND_PHOTO,)
    assert foto.sources == (EVIDENCE_SOURCE_MESA_ATTACHMENT,)
    assert foto.attachment_id == 20
    assert foto.message_id == 15
    assert foto.mime_type == "image/png"
    assert foto.eligible_for_gate is True

    assert documento.kinds == (EVIDENCE_KIND_DOCUMENT,)
    assert documento.attachment_id == 21
    assert documento.mime_type == "application/pdf"
