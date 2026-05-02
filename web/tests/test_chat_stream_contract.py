from app.domains.chat.chat_stream_contract import classificar_chat_stream_route
from app.domains.chat.schemas import DadosChat


def test_chat_stream_contract_classifica_chat_livre_sem_laudo() -> None:
    contrato = classificar_chat_stream_route(DadosChat(mensagem="Explique o fluxo de inspeção."))

    assert contrato.intent == "chat_livre_sem_laudo"
    assert contrato.action == "preparar_chat_livre"
    assert contrato.response_kind == "free_assistant_stream"
    assert contrato.eh_chat_livre_sem_laudo is True


def test_chat_stream_contract_classifica_fluxo_com_laudo() -> None:
    contrato = classificar_chat_stream_route(DadosChat(mensagem="Registrar evidência", laudo_id=42))

    assert contrato.intent == "fluxo_laudo_ou_comando"
    assert contrato.action == "preparar_fluxo_laudo"
    assert contrato.response_kind == "case_stream_dispatch"
    assert contrato.eh_chat_livre_sem_laudo is False


def test_chat_stream_contract_classifica_novo_chat_mobile_como_novo_laudo() -> None:
    contrato = classificar_chat_stream_route(
        DadosChat(mensagem="Começar conversa limpa", iniciar_laudo=True)
    )

    assert contrato.intent == "fluxo_laudo_ou_comando"
    assert contrato.action == "preparar_fluxo_laudo"
    assert contrato.response_kind == "case_stream_dispatch"
    assert contrato.eh_chat_livre_sem_laudo is False


def test_chat_stream_contract_classifica_comando_rapido() -> None:
    contrato = classificar_chat_stream_route(DadosChat(mensagem="/pendencias abertas"))

    assert contrato.intent == "fluxo_laudo_ou_comando"
    assert contrato.comando_rapido == "pendencias"
    assert contrato.eh_chat_livre_sem_laudo is False


def test_chat_stream_contract_classifica_comando_finalizacao() -> None:
    contrato = classificar_chat_stream_route(
        DadosChat(mensagem="COMANDO_SISTEMA FINALIZARLAUDOAGORA TIPO nr12")
    )

    assert contrato.intent == "fluxo_laudo_ou_comando"
    assert contrato.eh_comando_finalizacao is True
    assert contrato.tipo_template_finalizacao == "nr12maquinas"


def test_chat_stream_contract_classifica_mensagem_para_mesa() -> None:
    contrato = classificar_chat_stream_route(
        DadosChat(mensagem="Mesa: revisar a conclusão antes da emissão.")
    )

    assert contrato.intent == "fluxo_laudo_ou_comando"
    assert contrato.eh_mensagem_para_mesa is True
    assert contrato.response_kind == "case_stream_dispatch"
