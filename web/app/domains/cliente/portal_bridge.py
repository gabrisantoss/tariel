"""Contrato explícito de integrações do portal cliente com outros domínios."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.domains.chat.chat import rota_chat  # noqa: F401
from app.domains.chat.chat_service import (  # noqa: F401
    obter_mensagens_laudo_payload,
    processar_upload_documento,
)
from app.domains.chat.core_helpers import resposta_json_ok
from app.domains.chat.laudo_service import (  # noqa: F401
    obter_gate_qualidade_laudo_resposta,
    obter_status_relatorio_resposta,
)
from app.domains.cliente.portal_bridge_chat import (
    DadosChat,
    InteiroOpcionalNullish,
    RESPOSTA_GATE_QUALIDADE_REPROVADO,
    RESPOSTA_LAUDO_NAO_ENCONTRADO,
    iniciar_relatorio_resposta,
    api_finalizar_relatorio_cliente,
    api_obter_gate_qualidade_laudo_cliente,
    api_reabrir_laudo_cliente,
    api_status_relatorio_cliente,
    obter_mensagens_laudo_cliente,
    rota_chat_cliente,
    rota_upload_doc_cliente,
)
from app.domains.cliente.portal_bridge_review import (
    DadosPendenciaMesa,
    DadosRespostaChat,
    RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR,
    atualizar_pendencia_mesa_cliente,
    avaliar_laudo_cliente,
    baixar_anexo_mesa_cliente,
    marcar_whispers_lidos_cliente,
    obter_historico_chat_revisor_cliente,
    obter_laudo_completo_cliente,
    obter_pacote_mesa_laudo_cliente,
    responder_chat_campo_cliente,
    responder_chat_campo_com_anexo_cliente,
)
from app.shared.database import Usuario


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

__all__ = [
    "DadosChat",
    "DadosPendenciaMesa",
    "DadosRespostaChat",
    "InteiroOpcionalNullish",
    "RESPOSTA_GATE_QUALIDADE_REPROVADO",
    "RESPOSTA_LAUDO_NAO_ENCONTRADO",
    "RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR",
    "iniciar_relatorio_resposta",
    "api_finalizar_relatorio_cliente",
    "api_iniciar_relatorio_cliente",
    "api_obter_gate_qualidade_laudo_cliente",
    "api_reabrir_laudo_cliente",
    "api_status_relatorio_cliente",
    "atualizar_pendencia_mesa_cliente",
    "avaliar_laudo_cliente",
    "baixar_anexo_mesa_cliente",
    "marcar_whispers_lidos_cliente",
    "obter_historico_chat_revisor_cliente",
    "obter_laudo_completo_cliente",
    "obter_mensagens_laudo_cliente",
    "obter_pacote_mesa_laudo_cliente",
    "responder_chat_campo_cliente",
    "responder_chat_campo_com_anexo_cliente",
    "rota_chat_cliente",
    "rota_upload_doc_cliente",
]
