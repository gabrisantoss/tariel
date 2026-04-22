"""Bridge de chat/laudo do portal cliente."""

from __future__ import annotations

from fastapi import Request, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.domains.chat.chat import rota_chat
from app.domains.chat.chat_service import (
    obter_mensagens_laudo_payload,
    processar_upload_documento,
)
from app.domains.chat.core_helpers import resposta_json_ok
from app.domains.chat.laudo_decision_services import (
    finalizar_relatorio_resposta,
    reabrir_laudo_resposta,
)
from app.domains.chat.laudo_service import (
    RESPOSTA_GATE_QUALIDADE_REPROVADO,
    RESPOSTA_LAUDO_NAO_ENCONTRADO,
    iniciar_relatorio_resposta,
    obter_gate_qualidade_laudo_resposta,
    obter_status_relatorio_resposta,
)
from app.domains.chat.request_parsing_helpers import InteiroOpcionalNullish
from app.domains.chat.schemas import DadosChat
from app.shared.database import Usuario


async def api_status_relatorio_cliente(*, request: Request, usuario: Usuario, banco: Session) -> JSONResponse:
    payload, status_code = await obter_status_relatorio_resposta(
        request=request,
        usuario=usuario,
        banco=banco,
    )
    return resposta_json_ok(payload, status_code=status_code)


async def api_iniciar_relatorio_cliente(
    *,
    request: Request,
    tipo_template: str,
    entry_mode_preference: str | None,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    payload, status_code = await iniciar_relatorio_resposta(
        request=request,
        tipo_template=tipo_template,
        tipotemplate=None,
        cliente=None,
        unidade=None,
        local_inspecao=None,
        objetivo=None,
        nome_inspecao=None,
        entry_mode_preference=entry_mode_preference,
        usuario=usuario,
        banco=banco,
    )
    return resposta_json_ok(payload, status_code=status_code)


async def obter_mensagens_laudo_cliente(
    *,
    laudo_id: int,
    request: Request,
    cursor: InteiroOpcionalNullish,
    limite: int,
    usuario: Usuario,
    banco: Session,
) -> dict[str, object]:
    return await obter_mensagens_laudo_payload(
        laudo_id=laudo_id,
        request=request,
        cursor=int(cursor) if cursor is not None else None,
        limite=limite,
        usuario=usuario,
        banco=banco,
    )


async def rota_upload_doc_cliente(
    *,
    request: Request,
    arquivo: UploadFile,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    payload, status_code = await processar_upload_documento(
        arquivo=arquivo,
        usuario=usuario,
        banco=banco,
    )
    return resposta_json_ok(payload, status_code=status_code)


async def rota_chat_cliente(
    *,
    dados: DadosChat,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    return await rota_chat(
        dados=dados,
        request=request,
        usuario=usuario,
        banco=banco,
    )


async def api_obter_gate_qualidade_laudo_cliente(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    payload, status_code = obter_gate_qualidade_laudo_resposta(
        laudo_id=laudo_id,
        usuario=usuario,
        banco=banco,
    )
    return resposta_json_ok(payload, status_code=status_code)


async def api_finalizar_relatorio_cliente(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> JSONResponse:
    payload, status_code = await finalizar_relatorio_resposta(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    return resposta_json_ok(payload, status_code=status_code)


async def api_reabrir_laudo_cliente(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
    issued_document_policy: str | None = None,
) -> JSONResponse:
    payload, status_code = await reabrir_laudo_resposta(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
        issued_document_policy=issued_document_policy,
    )
    return resposta_json_ok(payload, status_code=status_code)


__all__ = [
    "DadosChat",
    "InteiroOpcionalNullish",
    "RESPOSTA_GATE_QUALIDADE_REPROVADO",
    "RESPOSTA_LAUDO_NAO_ENCONTRADO",
    "iniciar_relatorio_resposta",
    "api_finalizar_relatorio_cliente",
    "api_iniciar_relatorio_cliente",
    "api_obter_gate_qualidade_laudo_cliente",
    "api_reabrir_laudo_cliente",
    "api_status_relatorio_cliente",
    "obter_mensagens_laudo_cliente",
    "rota_chat_cliente",
    "rota_upload_doc_cliente",
]
