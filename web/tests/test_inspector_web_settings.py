from __future__ import annotations

import app.domains.chat.routes as rotas_inspetor
from tests.regras_rotas_criticas_support import SENHA_PADRAO, _login_app_inspetor


def _login_mobile_inspetor(client, email: str) -> dict[str, str]:
    resposta = client.post(
        "/app/api/mobile/auth/login",
        json={
            "email": email,
            "senha": SENHA_PADRAO,
            "lembrar": True,
        },
    )
    assert resposta.status_code == 200
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}


def _payload_configuracoes_web(
    *,
    estilo_resposta: str = "objetiva",
    densidade_interface: str = "compacta",
    notifica_respostas: bool = False,
) -> dict[str, object]:
    return {
        "notificacoes": {
            "notifica_respostas": notifica_respostas,
            "notifica_push": True,
            "som_notificacao": "Ping",
            "vibracao_ativa": True,
            "emails_ativos": True,
            "notifica_revisao": False,
            "alertas_criticos": True,
        },
        "privacidade": {
            "mostrar_conteudo_notificacao": False,
            "ocultar_conteudo_bloqueado": True,
            "mostrar_somente_nova_mensagem": True,
            "salvar_historico_conversas": True,
            "compartilhar_melhoria_ia": False,
            "retencao_dados": "90 dias",
        },
        "permissoes": {
            "microfone_permitido": True,
            "camera_permitida": True,
            "arquivos_permitidos": True,
            "notificacoes_permitidas": True,
            "biometria_permitida": True,
        },
        "experiencia_ia": {
            "modelo_ia": "equilibrado",
            "entry_mode_preference": "auto_recommended",
            "remember_last_case_mode": False,
            "estilo_resposta": estilo_resposta,
            "densidade_interface": densidade_interface,
            "animacoes_ativas": False,
            "economia_dados": True,
        },
    }


def test_web_configuracoes_persistem_e_sincronizam_com_mobile(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")

    resposta_padrao = client.get("/app/api/configuracoes")
    assert resposta_padrao.status_code == 200
    assert resposta_padrao.json()["web_settings"]["resposta"] == "detalhada"
    assert resposta_padrao.json()["web_settings"]["densidade"] == "confortavel"

    resposta_salva = client.put(
        "/app/api/configuracoes",
        headers={"X-CSRF-Token": csrf},
        json=_payload_configuracoes_web(),
    )

    assert resposta_salva.status_code == 200
    corpo_salvo = resposta_salva.json()
    assert corpo_salvo["web_settings"]["resposta"] == "objetiva"
    assert corpo_salvo["web_settings"]["densidade"] == "compacta"
    assert corpo_salvo["web_settings"]["notificaIa"] is False
    assert corpo_salvo["web_settings"]["emailResumo"] is True

    resposta_lida = client.get("/app/api/configuracoes")
    assert resposta_lida.status_code == 200
    assert resposta_lida.json()["settings"]["experiencia_ia"]["estilo_resposta"] == "objetiva"
    assert resposta_lida.json()["settings"]["notificacoes"]["notifica_revisao"] is False

    headers_mobile = _login_mobile_inspetor(client, "inspetor@empresa-a.test")
    resposta_mobile = client.get("/app/api/mobile/account/settings", headers=headers_mobile)
    assert resposta_mobile.status_code == 200
    assert resposta_mobile.json()["settings"]["experiencia_ia"]["estilo_resposta"] == "objetiva"
    assert resposta_mobile.json()["settings"]["experiencia_ia"]["densidade_interface"] == "compacta"


def test_chat_inclui_estilo_de_resposta_persistido_no_prompt(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")

    resposta_salva = client.put(
        "/app/api/configuracoes",
        headers={"X-CSRF-Token": csrf},
        json=_payload_configuracoes_web(estilo_resposta="tecnica", densidade_interface="ampla"),
    )
    assert resposta_salva.status_code == 200

    chamada_ia: dict[str, str] = {}

    class ClienteIAStub:
        def gerar_resposta_stream(self, mensagem: str, *_args, **_kwargs):
            chamada_ia["mensagem"] = mensagem
            yield "Resposta técnica inicial."

    cliente_original = rotas_inspetor.cliente_ia
    rotas_inspetor.cliente_ia = ClienteIAStub()
    try:
        resposta_chat = client.post(
            "/app/api/chat",
            headers={"X-CSRF-Token": csrf},
            json={
                "mensagem": "Avalie o risco principal.",
                "historico": [],
            },
        )
    finally:
        rotas_inspetor.cliente_ia = cliente_original

    assert resposta_chat.status_code == 200
    assert "[preferencias_ia_mobile]" in chamada_ia["mensagem"]
    assert "Estilo de resposta: tecnica" in chamada_ia["mensagem"]
    assert "Use linguagem técnica" in chamada_ia["mensagem"]
    assert "Avalie o risco principal." in chamada_ia["mensagem"]
