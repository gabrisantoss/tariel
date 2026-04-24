"""Contrato de roteamento da entrada principal do chat do inspetor."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.domains.chat.normalization import normalizar_tipo_template
from app.domains.chat.schemas import DadosChat
from nucleo.inspetor.comandos_chat import (
    analisar_comando_finalizacao,
    analisar_comando_rapido_chat,
    mensagem_para_mesa,
)

ChatStreamIntent = Literal[
    "chat_livre_sem_laudo",
    "fluxo_laudo_ou_comando",
]
ChatStreamAction = Literal[
    "preparar_chat_livre",
    "preparar_fluxo_laudo",
]
ChatStreamResponseKind = Literal[
    "free_assistant_stream",
    "case_stream_dispatch",
]


@dataclass(frozen=True, slots=True)
class ChatStreamRouteContract:
    """Resultado canônico de intenção -> ação -> resposta para `/app/api/chat`."""

    mensagem_limpa: str
    intent: ChatStreamIntent
    action: ChatStreamAction
    response_kind: ChatStreamResponseKind
    comando_rapido: str
    eh_comando_finalizacao: bool
    tipo_template_finalizacao: str
    eh_mensagem_para_mesa: bool

    @property
    def eh_chat_livre_sem_laudo(self) -> bool:
        return self.intent == "chat_livre_sem_laudo"


def classificar_chat_stream_route(dados: DadosChat) -> ChatStreamRouteContract:
    mensagem_limpa = str(getattr(dados, "mensagem", "") or "").strip()
    comando_rapido, _ = analisar_comando_rapido_chat(mensagem_limpa)
    eh_comando_finalizacao, tipo_template_finalizacao = analisar_comando_finalizacao(
        mensagem_limpa,
        normalizar_tipo_template=normalizar_tipo_template,
    )
    eh_mensagem_para_mesa = mensagem_para_mesa(mensagem_limpa)

    eh_chat_livre_sem_laudo = (
        not getattr(dados, "laudo_id", None)
        and not getattr(dados, "iniciar_laudo", False)
        and getattr(dados, "guided_inspection_draft", None) is None
        and getattr(dados, "guided_inspection_context", None) is None
        and not comando_rapido
        and not eh_comando_finalizacao
        and not eh_mensagem_para_mesa
    )
    if eh_chat_livre_sem_laudo:
        return ChatStreamRouteContract(
            mensagem_limpa=mensagem_limpa,
            intent="chat_livre_sem_laudo",
            action="preparar_chat_livre",
            response_kind="free_assistant_stream",
            comando_rapido="",
            eh_comando_finalizacao=False,
            tipo_template_finalizacao=tipo_template_finalizacao,
            eh_mensagem_para_mesa=False,
        )

    return ChatStreamRouteContract(
        mensagem_limpa=mensagem_limpa,
        intent="fluxo_laudo_ou_comando",
        action="preparar_fluxo_laudo",
        response_kind="case_stream_dispatch",
        comando_rapido=comando_rapido,
        eh_comando_finalizacao=eh_comando_finalizacao,
        tipo_template_finalizacao=tipo_template_finalizacao,
        eh_mensagem_para_mesa=eh_mensagem_para_mesa,
    )


__all__ = [
    "ChatStreamAction",
    "ChatStreamIntent",
    "ChatStreamResponseKind",
    "ChatStreamRouteContract",
    "classificar_chat_stream_route",
]
