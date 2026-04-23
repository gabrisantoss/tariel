from __future__ import annotations

import os
import re
import uuid

import pytest
from playwright.sync_api import Browser, expect

from tests.e2e.test_portais_playwright import (
    _api_fetch,
    _fazer_login,
    _login_cliente_primeiro_acesso,
    _provisionar_cliente_via_admin,
)

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_E2E", "0") != "1",
    reason="Defina RUN_E2E=1 para executar os testes Playwright.",
)


def _env_obrigatoria(nome: str) -> str:
    valor = os.getenv(nome, "").strip()
    if not valor:
        raise pytest.SkipTest(f"Defina {nome} para executar o fluxo remoto no Render.")
    return valor


@pytest.fixture(scope="session")
def credenciais_render_admin() -> dict[str, str]:
    return {
        "email": _env_obrigatoria("E2E_RENDER_ADMIN_EMAIL"),
        "senha": _env_obrigatoria("E2E_RENDER_ADMIN_PASSWORD"),
    }


def test_e2e_render_admin_ceo_cria_empresa_e_admin_cliente_cria_inspetor(
    browser: Browser,
    live_server_url: str,
    credenciais_render_admin: dict[str, str],
) -> None:
    if "onrender.com" not in live_server_url:
        raise pytest.SkipTest("Este teste é destinado ao ambiente remoto publicado no Render.")

    contexto_admin = browser.new_context()
    contexto_cliente = browser.new_context()

    try:
        page_admin = contexto_admin.new_page()
        _fazer_login(
            page_admin,
            base_url=live_server_url,
            portal="admin",
            email=credenciais_render_admin["email"],
            senha=credenciais_render_admin["senha"],
            rota_sucesso_regex=rf"{re.escape(live_server_url)}/admin/painel/?$",
        )

        sufixo = uuid.uuid4().hex[:8]
        nome_empresa = f"Render Cliente {sufixo}"
        email_cliente = f"cliente.render.{sufixo}@empresa.test"
        email_inspetor = f"inspetor.render.{sufixo}@empresa.test"
        senha_temporaria = _provisionar_cliente_via_admin(
            page_admin,
            base_url=live_server_url,
            nome=nome_empresa,
            email=email_cliente,
            cnpj=f"{uuid.uuid4().int % 10**14:014d}",
            segmento="Industrial Render",
            cidade_estado="Goiania/GO",
            nome_responsavel="Responsavel Render",
            observacoes="Provisionamento Playwright remoto via Render para validar Admin-Cliente.",
            plano="Intermediario",
        )
        assert senha_temporaria, "O cadastro da empresa não retornou senha temporária do admin-cliente."

        page_cliente = contexto_cliente.new_page()
        nova_senha_cliente = f"Cliente@{sufixo}12345"
        _login_cliente_primeiro_acesso(
            page_cliente,
            base_url=live_server_url,
            email=email_cliente,
            senha_temporaria=senha_temporaria,
            nova_senha=nova_senha_cliente,
        )

        expect(page_cliente.locator("#tab-admin")).to_be_visible(timeout=10000)
        page_cliente.locator("#admin-section-tab-team").click()
        expect(page_cliente.locator("#usuarios-busca")).to_be_visible(timeout=10000)

        resposta_inspetor = _api_fetch(
            page_cliente,
            path="/cliente/api/usuarios",
            method="POST",
            json_body={
                "nome": "Inspetor Render",
                "email": email_inspetor,
                "nivel_acesso": "inspetor",
                "telefone": "62999990000",
                "crea": "",
                "allowed_portals": ["inspetor"],
            },
        )
        assert resposta_inspetor["status"] == 201, resposta_inspetor["raw"]
        assert resposta_inspetor["body"]["senha_temporaria"]
        assert resposta_inspetor["body"]["usuario"]["email"] == email_inspetor

        page_cliente.reload(wait_until="domcontentloaded")
        page_cliente.locator("#admin-section-tab-team").click()
        expect(page_cliente.locator("#lista-usuarios")).to_contain_text(email_inspetor, timeout=10000)
        expect(page_cliente.locator("#admin-onboarding-resumo")).to_be_visible(timeout=10000)

        auditoria = _api_fetch(page_cliente, path="/cliente/api/auditoria")
        assert auditoria["status"] == 200, auditoria["raw"]
        assert any(item["acao"] == "usuario_criado" for item in auditoria["body"]["itens"])
    finally:
        contexto_admin.close()
        contexto_cliente.close()
