"""Bridge de mesa/revisão do portal cliente."""

from __future__ import annotations

from fastapi import Request, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.domains.chat.request_parsing_helpers import InteiroOpcionalNullish
from app.domains.revisor.base import (
    DadosPendenciaMesa,
    DadosRespostaChat,
    RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR,
)
from app.domains.revisor.mesa_api import (
    atualizar_pendencia_mesa_revisor,
    avaliar_laudo,
    baixar_anexo_mesa_revisor,
    marcar_whispers_lidos,
    obter_historico_chat_revisor,
    obter_laudo_completo,
    obter_pacote_mesa_laudo,
    responder_chat_campo,
    responder_chat_campo_com_anexo,
)
from app.shared.database import Usuario


async def obter_historico_chat_revisor_cliente(
    *,
    laudo_id: int,
    cursor: InteiroOpcionalNullish,
    limite: int,
    usuario: Usuario,
    banco: Session,
) -> dict[str, object]:
    return await obter_historico_chat_revisor(
        laudo_id=laudo_id,
        cursor=cursor,
        limite=limite,
        usuario=usuario,
        banco=banco,
    )


async def obter_laudo_completo_cliente(
    *,
    laudo_id: int,
    request: Request,
    incluir_historico: bool,
    cursor: InteiroOpcionalNullish,
    limite: int,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await obter_laudo_completo(
        laudo_id=laudo_id,
        request=request,
        incluir_historico=incluir_historico,
        cursor=cursor,
        limite=limite,
        usuario=usuario,
        banco=banco,
    )


async def obter_pacote_mesa_laudo_cliente(
    *,
    laudo_id: int,
    request: Request,
    limite_whispers: int,
    limite_pendencias: int,
    limite_revisoes: int,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await obter_pacote_mesa_laudo(
        laudo_id=laudo_id,
        request=request,
        limite_whispers=limite_whispers,
        limite_pendencias=limite_pendencias,
        limite_revisoes=limite_revisoes,
        usuario=usuario,
        banco=banco,
    )


async def responder_chat_campo_cliente(
    *,
    laudo_id: int,
    dados: DadosRespostaChat,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await responder_chat_campo(
        laudo_id=laudo_id,
        dados=dados,
        request=request,
        usuario=usuario,
        banco=banco,
    )


async def responder_chat_campo_com_anexo_cliente(
    *,
    laudo_id: int,
    request: Request,
    arquivo: UploadFile,
    texto: str,
    referencia_mensagem_id: InteiroOpcionalNullish,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await responder_chat_campo_com_anexo(
        laudo_id=laudo_id,
        request=request,
        arquivo=arquivo,
        texto=texto,
        referencia_mensagem_id=referencia_mensagem_id,
        usuario=usuario,
        banco=banco,
    )


async def atualizar_pendencia_mesa_cliente(
    *,
    laudo_id: int,
    mensagem_id: int,
    dados: DadosPendenciaMesa,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await atualizar_pendencia_mesa_revisor(
        laudo_id=laudo_id,
        mensagem_id=mensagem_id,
        dados=dados,
        request=request,
        usuario=usuario,
        banco=banco,
    )


async def avaliar_laudo_cliente(
    *,
    laudo_id: int,
    request: Request,
    acao: str,
    motivo: str,
    csrf_token: str,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await avaliar_laudo(
        laudo_id=laudo_id,
        request=request,
        acao=acao,
        motivo=motivo,
        csrf_token=csrf_token,
        usuario=usuario,
        banco=banco,
    )


async def marcar_whispers_lidos_cliente(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await marcar_whispers_lidos(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )


async def baixar_anexo_mesa_cliente(
    *,
    laudo_id: int,
    anexo_id: int,
    usuario: Usuario,
    banco: Session,
):
    return await baixar_anexo_mesa_revisor(
        laudo_id=laudo_id,
        anexo_id=anexo_id,
        usuario=usuario,
        banco=banco,
    )


__all__ = [
    "DadosPendenciaMesa",
    "DadosRespostaChat",
    "InteiroOpcionalNullish",
    "RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR",
    "atualizar_pendencia_mesa_cliente",
    "avaliar_laudo_cliente",
    "baixar_anexo_mesa_cliente",
    "marcar_whispers_lidos_cliente",
    "obter_historico_chat_revisor_cliente",
    "obter_laudo_completo_cliente",
    "obter_pacote_mesa_laudo_cliente",
    "responder_chat_campo_cliente",
    "responder_chat_campo_com_anexo_cliente",
]
