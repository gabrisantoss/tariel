from __future__ import annotations

import hashlib
import io
import json
import os
import tempfile
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import app.domains.admin.services as admin_services
import app.domains.cliente.portal_bridge as portal_bridge
import pypdf
import pytest
from fpdf import FPDF
from sqlalchemy import select

from app.domains.chat.nr35_linha_vida_official_pdf import build_nr35_linha_vida_official_pdf_manifest
from app.domains.chat.nr35_linha_vida_pdf_contract import NR35_REQUIRED_PHOTO_SLOTS
from app.domains.chat.nr35_linha_vida_structured_review import NR35_STRUCTURED_REVIEW_VERSION
from app.shared.pdf_officiality import NON_OFFICIAL_PDF_NOTICE_TITLE
from app.shared.database import (
    AnexoMesa,
    ApprovedCaseSnapshot,
    EmissaoOficialLaudo,
    Empresa,
    Laudo,
    MensagemLaudo,
    NivelAcesso,
    PlanoEmpresa,
    RegistroAuditoriaEmpresa,
    SignatarioGovernadoLaudo,
    StatusLaudo,
    StatusRevisao,
    TipoMensagem,
    Usuario,
)
from tests.regras_rotas_criticas_support import (
    SENHA_HASH_PADRAO,
    _criar_laudo,
    _csrf_pagina,
    _docx_bytes_teste,
    _extrair_csrf,
    _imagem_png_bytes_teste,
    _login_admin,
    _login_cliente,
)
from app.domains.cliente.route_support import URL_DASHBOARD


def _pdf_bytes_teste(texto: str = "PDF oficial NR35 cliente") -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)
    pdf.cell(0, 10, texto)
    raw = pdf.output()
    if isinstance(raw, bytes):
        return raw
    if isinstance(raw, bytearray):
        return bytes(raw)
    return str(raw).encode("latin-1", errors="replace")


def _texto_pdf(conteudo: bytes) -> str:
    leitor = pypdf.PdfReader(io.BytesIO(conteudo))
    return "\n".join(page.extract_text() or "" for page in leitor.pages)


def _concluir_primeiro_login_cliente(
    client,
    *,
    email: str,
    senha_temporaria: str,
    nova_senha: str,
) -> str:
    tela_login = client.get("/cliente/login")
    csrf_login = _extrair_csrf(tela_login.text)
    resposta_login = client.post(
        "/cliente/login",
        data={
            "email": email,
            "senha": senha_temporaria,
            "csrf_token": csrf_login,
        },
        follow_redirects=False,
    )
    assert resposta_login.status_code == 303
    assert resposta_login.headers["location"] == "/cliente/trocar-senha"

    tela_troca = client.get("/cliente/trocar-senha")
    assert tela_troca.status_code == 200
    csrf_troca = _extrair_csrf(tela_troca.text)
    resposta_troca = client.post(
        "/cliente/trocar-senha",
        data={
            "senha_atual": senha_temporaria,
            "nova_senha": nova_senha,
            "confirmar_senha": nova_senha,
            "csrf_token": csrf_troca,
        },
        follow_redirects=False,
    )
    assert resposta_troca.status_code == 303
    assert resposta_troca.headers["location"] == URL_DASHBOARD
    return _csrf_pagina(client, "/cliente/equipe")


def _concluir_primeiro_login_operacional(
    client,
    *,
    login_path: str,
    trocar_path: str,
    destino_final: str,
    email: str,
    senha_temporaria: str,
    nova_senha: str,
) -> None:
    tela_login = client.get(login_path)
    csrf_login = _extrair_csrf(tela_login.text)
    resposta_login = client.post(
        login_path,
        data={
            "email": email,
            "senha": senha_temporaria,
            "csrf_token": csrf_login,
        },
        follow_redirects=False,
    )
    assert resposta_login.status_code == 303
    assert resposta_login.headers["location"] == trocar_path

    tela_troca = client.get(trocar_path)
    assert tela_troca.status_code == 200
    csrf_troca = _extrair_csrf(tela_troca.text)
    resposta_troca = client.post(
        trocar_path,
        data={
            "senha_atual": senha_temporaria,
            "nova_senha": nova_senha,
            "confirmar_senha": nova_senha,
            "csrf_token": csrf_troca,
        },
        follow_redirects=False,
    )
    assert resposta_troca.status_code == 303
    assert resposta_troca.headers["location"] == destino_final
    resposta_final = client.get(destino_final, follow_redirects=False)
    assert resposta_final.status_code == 200


def _payload_nr35_cliente_aprovado() -> dict:
    payload_path = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "family_schemas"
        / "nr35_inspecao_linha_de_vida.laudo_output_exemplo.json"
    )
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    payload["mesa_review"] = {
        "status": StatusRevisao.APROVADO.value,
        "aprovacao_origem": "mesa_humana",
        "ia_aprovou_mesa": False,
        "aprovado_por_id": 42,
        "aprovado_por_nome": "Mesa NR35",
        "aprovado_em": "2026-04-26T12:00:00+00:00",
    }
    payload["nr35_structured_review"] = {
        "contract_version": NR35_STRUCTURED_REVIEW_VERSION,
        "status": "mesa_approved",
        "last_reviewed_at": "2026-04-26T11:45:00+00:00",
        "last_reviewed_by": {"user_id": 42, "name": "Mesa NR35"},
        "mesa_approved_at": "2026-04-26T12:00:00+00:00",
        "mesa_approved_by": {"user_id": 42, "name": "Mesa NR35"},
        "change_log": [
            {
                "path": "conclusao.justificativa",
                "target": "payload",
                "previous_value": "Texto preliminar",
                "new_value": payload["conclusao"]["justificativa"],
                "actor_user_id": 42,
                "actor_name": "Mesa NR35",
                "justification": "Ajuste humano para emissao oficial.",
                "changed_at": "2026-04-26T11:50:00+00:00",
                "resolved_issue_codes": ["nr35_required_field_missing"],
            }
        ],
    }
    payload["auditoria"]["mesa_status"] = StatusRevisao.APROVADO.value
    return payload


def _report_pack_nr35_cliente_quatro_fotos() -> dict:
    return {
        "family": "nr35_inspecao_linha_de_vida",
        "template_key": "nr35_linha_vida",
        "image_slots": [
            {
                "slot": slot,
                "title": slot.replace("_", " "),
                "required": True,
                "status": "resolved",
                "resolved_evidence_id": f"IMG_{index}",
                "resolved_message_id": index,
                "resolved_caption": f"Legenda tecnica {slot}",
            }
            for index, slot in enumerate(NR35_REQUIRED_PHOTO_SLOTS, start=701)
        ],
        "quality_gates": {"final_validation_mode": "mesa_required", "missing_evidence": []},
    }


def _criar_entrega_oficial_nr35_cliente(banco, ids: dict, tmp_path: Path) -> tuple[int, bytes, bytes]:
    payload = _payload_nr35_cliente_aprovado()
    report_pack = _report_pack_nr35_cliente_quatro_fotos()
    laudo = Laudo(
        empresa_id=ids["empresa_a"],
        usuario_id=ids["inspetor_a"],
        setor_industrial="NR35 Linha de Vida",
        tipo_template="nr35_linha_vida",
        catalog_family_key="nr35_inspecao_linha_de_vida",
        catalog_family_label="NR35 · Linha de Vida",
        status_revisao=StatusRevisao.APROVADO.value,
        status_conformidade=StatusLaudo.NAO_CONFORME.value,
        codigo_hash=f"nr35cliente{datetime.now(timezone.utc).timestamp()}".replace(".", "")[:32],
        nome_arquivo_pdf="laudo_nr35_cliente.pdf",
        dados_formulario=payload,
        report_pack_draft_json=report_pack,
    )
    banco.add(laudo)
    banco.flush()

    snapshot_payload = {
        "laudo_id": int(laudo.id),
        "codigo_hash": laudo.codigo_hash,
        "tipo_template": "nr35_linha_vida",
        "family_key": "nr35_inspecao_linha_de_vida",
        "status_revisao": laudo.status_revisao,
        "status_conformidade": laudo.status_conformidade,
        "dados_formulario": payload,
        "report_pack_draft": report_pack,
    }
    snapshot = ApprovedCaseSnapshot(
        laudo_id=int(laudo.id),
        empresa_id=ids["empresa_a"],
        family_key="nr35_inspecao_linha_de_vida",
        approval_version=1,
        approved_by_id=ids["revisor_a"],
        source_status_revisao=StatusRevisao.APROVADO.value,
        source_status_conformidade=StatusLaudo.NAO_CONFORME.value,
        document_outcome="approved_by_mesa",
        laudo_output_snapshot=snapshot_payload,
        snapshot_hash=hashlib.sha256(
            json.dumps(snapshot_payload, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest(),
    )
    banco.add(snapshot)
    signatario = SignatarioGovernadoLaudo(
        tenant_id=ids["empresa_a"],
        nome="Eng. Cliente NR35",
        funcao="Responsável técnico",
        registro_profissional="CREA 3535",
        valid_until=datetime.now(timezone.utc) + timedelta(days=120),
        allowed_family_keys_json=["nr35_inspecao_linha_de_vida"],
        ativo=True,
        criado_por_id=ids["admin_a"],
    )
    banco.add(signatario)
    banco.flush()

    pdf_bytes = _pdf_bytes_teste("PDF oficial NR35 cliente")
    package_bytes = b"nr35 official package cliente"
    pdf_path = tmp_path / "laudo_nr35_cliente.pdf"
    package_path = tmp_path / "TAR-NR35-CLIENTE.zip"
    pdf_path.write_bytes(pdf_bytes)
    package_path.write_bytes(package_bytes)
    primary_pdf_artifact = {
        "file_name": "laudo_nr35_cliente.pdf",
        "archive_path": "documentos/laudo_nr35_cliente.pdf",
        "storage_file_name": "laudo_nr35_cliente.pdf",
        "storage_path": str(pdf_path),
        "storage_version": "v0001",
        "storage_version_number": 1,
        "storage_ready": True,
        "present_on_disk": True,
        "sha256": hashlib.sha256(pdf_bytes).hexdigest(),
        "source": "issue_context",
    }
    nr35_manifest = build_nr35_linha_vida_official_pdf_manifest(
        laudo=laudo,
        latest_snapshot=snapshot,
        primary_pdf_artifact=primary_pdf_artifact,
    )
    assert nr35_manifest is not None
    assert nr35_manifest["official_pdf_validation"]["ok"] is True
    banco.add(
        EmissaoOficialLaudo(
            laudo_id=int(laudo.id),
            tenant_id=ids["empresa_a"],
            approval_snapshot_id=int(snapshot.id),
            signatory_id=int(signatario.id),
            issued_by_user_id=ids["revisor_a"],
            issue_number="TAR-20260426-0001-000001",
            issue_state="issued",
            issued_at=datetime.now(timezone.utc),
            verification_hash=laudo.codigo_hash,
            public_verification_url=f"/app/public/laudo/verificar/{laudo.codigo_hash}",
            package_sha256=hashlib.sha256(package_bytes).hexdigest(),
            package_fingerprint_sha256="f" * 64,
            package_filename="TAR-NR35-CLIENTE.zip",
            package_storage_path=str(package_path),
            package_size_bytes=len(package_bytes),
            manifest_json={"bundle_kind": "tariel_official_issue_package", "nr35_official_pdf": nr35_manifest},
            issue_context_json={
                "approval_version": 1,
                "primary_pdf_artifact": primary_pdf_artifact,
                "nr35_official_pdf": nr35_manifest,
                "signatory_snapshot": {"nome": signatario.nome, "funcao": signatario.funcao},
                "issued_by_snapshot": {"nome": "Revisor A"},
            },
        )
    )
    banco.commit()
    return int(laudo.id), pdf_bytes, package_bytes


def test_admin_cliente_chat_obedece_portfolio_governado_por_variante(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        admin_services.upsert_familia_catalogo(
            banco,
            family_key="nr13_inspecao_caldeira",
            nome_exibicao="NR13 · Caldeira",
            macro_categoria="NR13",
            status_catalogo="publicado",
            criado_por_id=ids["admin_a"],
        )
        admin_services.upsert_oferta_comercial_familia(
            banco,
            family_key="nr13_inspecao_caldeira",
            nome_oferta="NR13 Premium · Caldeira",
            pacote_comercial="Premium",
            ativo_comercial=True,
            variantes_comerciais_text="premium_campo | Premium campo | nr13_premium | Campo crítico",
            criado_por_id=ids["admin_a"],
        )
        admin_services.upsert_familia_catalogo(
            banco,
            family_key="nr13_inspecao_vaso_pressao",
            nome_exibicao="NR13 · Vaso de Pressão",
            macro_categoria="NR13",
            status_catalogo="publicado",
            criado_por_id=ids["admin_a"],
        )
        admin_services.upsert_oferta_comercial_familia(
            banco,
            family_key="nr13_inspecao_vaso_pressao",
            nome_oferta="NR13 Premium · Vaso de Pressão",
            pacote_comercial="Premium",
            ativo_comercial=True,
            variantes_comerciais_text="premium_campo | Premium campo | nr13_premium | Vaso crítico",
            criado_por_id=ids["admin_a"],
        )
        admin_services.sincronizar_portfolio_catalogo_empresa(
            banco,
            empresa_id=ids["empresa_a"],
            selection_tokens=[
                "catalog:nr13_inspecao_caldeira:premium_campo",
                "catalog:nr13_inspecao_vaso_pressao:premium_campo",
            ],
            admin_id=ids["admin_a"],
        )
        banco.commit()

    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_ambigua = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "nr13"},
    )
    assert resposta_ambigua.status_code == 403
    assert "variante comercial" in resposta_ambigua.json()["detail"].lower()

    resposta_ok = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "catalog:nr13_inspecao_caldeira:premium_campo"},
    )
    assert resposta_ok.status_code == 200
    laudo_id = int(resposta_ok.json()["laudo_id"])

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.tipo_template == "nr13"
        assert laudo.catalog_family_key == "nr13_inspecao_caldeira"
        assert laudo.catalog_variant_key == "premium_campo"


def test_admin_cliente_chat_cria_laudo_com_payload_serializavel_por_jsonable_encoder(
    ambiente_critico,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ambiente_critico["client"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    async def _fake_iniciar_relatorio_resposta(**_: object) -> tuple[dict[str, object], int]:
        return (
            {
                "success": True,
                "laudo_id": 321,
                "gerado_em": datetime(2026, 4, 10, 19, 14, tzinfo=timezone.utc),
            },
            200,
        )

    monkeypatch.setattr(
        portal_bridge,
        "iniciar_relatorio_resposta",
        _fake_iniciar_relatorio_resposta,
    )

    resposta = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "padrao"},
    )

    assert resposta.status_code == 200
    assert resposta.json()["laudo_id"] == 321
    assert resposta.json()["gerado_em"] == "2026-04-10T19:14:00+00:00"


def test_admin_cliente_chat_bloqueia_fallback_legado_quando_catalogo_governado_fica_vazio(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        admin_services.upsert_familia_catalogo(
            banco,
            family_key="nr13_inspecao_caldeira",
            nome_exibicao="NR13 · Caldeira",
            macro_categoria="NR13",
            status_catalogo="publicado",
            criado_por_id=ids["admin_a"],
        )
        admin_services.upsert_oferta_comercial_familia(
            banco,
            family_key="nr13_inspecao_caldeira",
            nome_oferta="NR13 Premium · Caldeira",
            pacote_comercial="Premium",
            ativo_comercial=True,
            variantes_comerciais_text="premium_campo | Premium campo | nr13_premium | Campo crítico",
            criado_por_id=ids["admin_a"],
        )
        admin_services.upsert_tenant_family_release(
            banco,
            tenant_id=ids["empresa_a"],
            family_key="nr13_inspecao_caldeira",
            release_status="active",
            allowed_variants=["catalog:nr13_inspecao_caldeira:premium_campo"],
            criado_por_id=ids["admin_a"],
        )
        admin_services.sincronizar_portfolio_catalogo_empresa(
            banco,
            empresa_id=ids["empresa_a"],
            selection_tokens=["catalog:nr13_inspecao_caldeira:premium_campo"],
            admin_id=ids["admin_a"],
        )
        admin_services.upsert_tenant_family_release(
            banco,
            tenant_id=ids["empresa_a"],
            family_key="nr13_inspecao_caldeira",
            release_status="paused",
            allowed_variants=["catalog:nr13_inspecao_caldeira:premium_campo"],
            criado_por_id=ids["admin_a"],
        )
        banco.commit()

    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "nr13"},
    )

    assert resposta.status_code == 403
    assert "admin-ceo" in resposta.json()["detail"].lower()


def test_admin_cliente_respeita_governanca_de_casos_do_tenant(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "summary_only",
            "case_action_mode": "read_only",
        }
        banco.commit()

    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_lista_resumo = client.get("/cliente/api/chat/laudos", headers={"X-CSRF-Token": csrf})
    resposta_mesa_resumo = client.get("/cliente/api/mesa/laudos", headers={"X-CSRF-Token": csrf})
    resposta_criar_resumo = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "padrao"},
    )

    assert resposta_lista_resumo.status_code == 403
    assert "resumos agregados" in resposta_lista_resumo.json()["detail"]
    assert resposta_mesa_resumo.status_code == 403
    assert resposta_criar_resumo.status_code == 403

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "read_only",
        }
        banco.commit()

    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_lista_read_only = client.get("/cliente/api/chat/laudos", headers={"X-CSRF-Token": csrf})
    resposta_mesa_read_only = client.get("/cliente/api/mesa/laudos", headers={"X-CSRF-Token": csrf})
    resposta_criar_read_only = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "padrao"},
    )
    resposta_responder_read_only = client.post(
        "/cliente/api/mesa/laudos/999/responder",
        headers={"X-CSRF-Token": csrf},
        json={"texto": "teste", "referencia_mensagem_id": None},
    )

    assert resposta_lista_read_only.status_code == 200
    assert resposta_mesa_read_only.status_code == 200
    assert resposta_criar_read_only.status_code == 200
    assert int(resposta_criar_read_only.json()["laudo_id"]) > 0
    assert resposta_responder_read_only.status_code == 404


@pytest.mark.parametrize("rota_superficie", ["/cliente/chat", "/cliente/mesa"])
def test_rotas_html_do_portal_cliente_recuam_para_admin_quando_superficie_esta_bloqueada(
    ambiente_critico,
    rota_superficie: str,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "summary_only",
            "case_action_mode": "read_only",
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.get(rota_superficie)

    assert resposta.status_code == 200
    assert 'data-cliente-tab-inicial="admin"' in resposta.text
    assert 'data-cliente-tab-inicial="chat"' not in resposta.text
    assert 'data-cliente-tab-inicial="mesa"' not in resposta.text


def test_admin_cliente_nao_altera_plano_diretamente_e_preserva_outra_empresa(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.patch(
        "/cliente/api/empresa/plano",
        headers={"X-CSRF-Token": csrf},
        json={"plano": "Intermediario"},
    )

    assert resposta.status_code == 403
    corpo = resposta.json()
    assert corpo["success"] is False
    assert corpo["empresa"]["plano_ativo"] == PlanoEmpresa.ILIMITADO.value
    assert corpo["plano"]["plano"] == "Intermediario"
    assert "Registre interesse" in corpo["detail"]

    with SessionLocal() as banco:
        empresa_a = banco.get(Empresa, ids["empresa_a"])
        empresa_b = banco.get(Empresa, ids["empresa_b"])
        assert empresa_a is not None
        assert empresa_b is not None
        assert empresa_a.plano_ativo == PlanoEmpresa.ILIMITADO.value
        assert empresa_b.plano_ativo == PlanoEmpresa.ILIMITADO.value


def test_admin_cliente_cria_e_gerencia_usuarios_restritos_a_empresa(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_admin_cliente = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Par Administrativo",
            "email": "par-admin@empresa-a.test",
            "nivel_acesso": "admin_cliente",
            "telefone": "62998887766",
            "crea": "",
        },
    )

    assert resposta_admin_cliente.status_code == 403
    assert "Admin-Cliente" in resposta_admin_cliente.json()["detail"]

    resposta_inspetor = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Inspetor Operacional A2",
            "email": "inspetor2@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62999990000",
            "crea": "",
        },
    )

    assert resposta_inspetor.status_code == 201
    corpo_inspetor = resposta_inspetor.json()
    usuario_inspetor_id = int(corpo_inspetor["usuario"]["id"])
    assert corpo_inspetor["usuario"]["papel"] == "Operador de campo"
    assert corpo_inspetor["senha_temporaria"]
    credencial_inspetor = corpo_inspetor["credencial_onboarding"]
    assert credencial_inspetor["usuario_id"] == usuario_inspetor_id
    assert credencial_inspetor["login"] == "inspetor2@empresa-a.test"
    assert credencial_inspetor["acesso_inicial_url"] == f"/cliente/usuarios/{usuario_inspetor_id}/acesso-inicial"
    assert credencial_inspetor["portais"] == [
        {
            "portal": "inspetor",
            "label": "Inspeção IA",
            "login_url": "/app/login",
        }
    ]

    resposta_acesso_inicial_inspetor = client.get(credencial_inspetor["acesso_inicial_url"])
    assert resposta_acesso_inicial_inspetor.status_code == 200
    assert "inspetor2@empresa-a.test" in resposta_acesso_inicial_inspetor.text
    assert corpo_inspetor["senha_temporaria"] in resposta_acesso_inicial_inspetor.text
    assert "/app/login" in resposta_acesso_inicial_inspetor.text

    resposta_acesso_inicial_consumido = client.get(credencial_inspetor["acesso_inicial_url"])
    assert resposta_acesso_inicial_consumido.status_code == 410
    assert "não está mais disponível" in resposta_acesso_inicial_consumido.text

    resposta_revisor = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Mesa Operacional A2",
            "email": "mesa2@empresa-a.test",
            "nivel_acesso": "revisor",
            "telefone": "62999991111",
            "crea": "123456/GO",
        },
    )

    assert resposta_revisor.status_code == 201
    corpo_revisor = resposta_revisor.json()
    usuario_revisor_id = int(corpo_revisor["usuario"]["id"])
    assert corpo_revisor["usuario"]["papel"] == "Avaliador"
    assert corpo_revisor["usuario"]["crea"] == "123456/GO"

    resposta_toggle_outra_empresa = client.patch(
        f"/cliente/api/usuarios/{ids['inspetor_b']}/bloqueio",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_toggle_outra_empresa.status_code == 404

    resposta_toggle_admin = client.patch(
        f"/cliente/api/usuarios/{ids['admin_cliente_a']}/bloqueio",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_toggle_admin.status_code == 404

    resposta_reset = client.post(
        f"/cliente/api/usuarios/{usuario_revisor_id}/resetar-senha",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_reset.status_code == 200
    corpo_reset = resposta_reset.json()
    assert corpo_reset["senha_temporaria"]
    assert corpo_reset["credencial_onboarding"]["usuario_id"] == usuario_revisor_id
    assert corpo_reset["credencial_onboarding"]["portais"] == [
        {
            "portal": "revisor",
            "label": "Revisão Técnica",
            "login_url": "/revisao/login",
        }
    ]

    resposta_lista = client.get("/cliente/api/usuarios")
    assert resposta_lista.status_code == 200
    papeis = {item["papel"] for item in resposta_lista.json()["itens"]}
    emails = {item["email"] for item in resposta_lista.json()["itens"]}
    assert papeis <= {"Operador de campo", "Avaliador"}
    assert "cliente@empresa-a.test" not in emails
    assert "par-admin@empresa-a.test" not in emails

    with SessionLocal() as banco:
        novo_inspetor = banco.scalar(select(Usuario).where(Usuario.email == "inspetor2@empresa-a.test"))
        novo_revisor = banco.scalar(select(Usuario).where(Usuario.email == "mesa2@empresa-a.test"))
        par_admin = banco.scalar(select(Usuario).where(Usuario.email == "par-admin@empresa-a.test"))
        assert novo_inspetor is not None
        assert novo_revisor is not None
        assert par_admin is None
        assert int(novo_inspetor.empresa_id) == ids["empresa_a"]
        assert int(novo_revisor.empresa_id) == ids["empresa_a"]
        assert int(novo_inspetor.nivel_acesso) == int(NivelAcesso.INSPETOR)
        assert int(novo_revisor.nivel_acesso) == int(NivelAcesso.REVISOR)


def test_admin_cliente_solicita_habilitacao_profissional_para_analise_da_tariel(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.post(
        "/cliente/api/habilitacao-profissional",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Engenheira Responsável NR",
            "tipo_profissional": "engenheiro_seguranca",
            "registro_profissional": "CREA GO 123456",
            "email": "rt@empresa-a.test",
            "telefone": "62999990000",
            "observacoes": "Atua em NR10 e NR35.",
        },
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["success"] is True
    habilitacao = corpo["habilitacao"]
    assert habilitacao["status_key"] == "in_review"
    assert habilitacao["counts"]["in_review"] == 1
    assert habilitacao["counts"]["eligible"] == 0
    assert habilitacao["items"][0]["approval_status"] == "in_review"
    assert habilitacao["items"][0]["eligible"] is False
    signatario_id = int(corpo["signatario_id"])

    comprovacao_bytes = b"%PDF-1.4\n% comprovacao profissional\n"
    resposta_upload = client.post(
        f"/cliente/api/habilitacao-profissional/{signatario_id}/evidencias",
        headers={"X-CSRF-Token": csrf},
        files={"arquivo": ("crea.pdf", comprovacao_bytes, "application/pdf")},
    )
    assert resposta_upload.status_code == 201
    corpo_upload = resposta_upload.json()
    assert corpo_upload["success"] is True
    assert corpo_upload["documento"]["nome"] == "crea.pdf"
    assert corpo_upload["documento"]["mime_type"] == "application/pdf"
    assert corpo_upload["documento"]["sha256"] == hashlib.sha256(comprovacao_bytes).hexdigest()

    resposta_duplicada = client.post(
        "/cliente/api/habilitacao-profissional",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Outra Responsável",
            "tipo_profissional": "profissional_habilitado",
            "registro_profissional": " CREA GO 123456 ",
        },
    )
    assert resposta_duplicada.status_code == 409

    resposta_bootstrap = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap.status_code == 200
    assert resposta_bootstrap.json()["professional_habilitation"]["counts"]["in_review"] == 1

    with SessionLocal() as banco:
        signatario = banco.scalar(
            select(SignatarioGovernadoLaudo).where(
                SignatarioGovernadoLaudo.tenant_id == ids["empresa_a"],
                SignatarioGovernadoLaudo.registro_profissional == "CREA GO 123456",
            )
        )
        assert signatario is not None
        assert signatario.funcao == "Engenheiro de Segurança do Trabalho"
        assert signatario.allowed_family_keys_json == []
        assert bool(signatario.ativo) is True
        assert int(signatario.criado_por_id) == ids["admin_cliente_a"]
        metadata = signatario.governance_metadata_json
        assert metadata["professional_approval_status"] == "in_review"
        assert metadata["professional_approval_source"] == "cliente_portal"
        assert metadata["professional_type"] == "engenheiro_seguranca"
        assert metadata["professional_email"] == "rt@empresa-a.test"
        assert metadata["professional_documents_status"] == "uploaded"
        assert metadata["professional_documents_count"] == 1
        assert len(metadata["professional_documents"]) == 1
        documento = metadata["professional_documents"][0]
        assert documento["nome"] == "crea.pdf"
        assert documento["sha256"] == hashlib.sha256(comprovacao_bytes).hexdigest()
        assert Path(documento["storage_path"]).is_file()

        auditoria = list(
            banco.scalars(
                select(RegistroAuditoriaEmpresa)
                .where(RegistroAuditoriaEmpresa.empresa_id == ids["empresa_a"])
                .order_by(RegistroAuditoriaEmpresa.id.desc())
            ).all()
        )
        assert any(item.acao == "habilitacao_profissional_solicitada" for item in auditoria)
        assert any(item.acao == "habilitacao_profissional_evidencia_enviada" for item in auditoria)


def test_fluxo_fixo_empresa_admin_cliente_equipe_e_logins_operacionais_funciona(
    ambiente_critico,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]

    senhas_temporarias = iter(
        [
            "AdminClienteTemp@123",
            "InspetorTemp@123",
            "MesaTemp@123",
        ]
    )
    monkeypatch.setattr(admin_services, "gerar_senha_fortificada", lambda: next(senhas_temporarias))

    _login_admin(client, "admin@empresa-a.test")
    csrf_admin = _csrf_pagina(client, "/admin/novo-cliente")

    resposta_empresa = client.post(
        "/admin/novo-cliente",
        data={
            "csrf_token": csrf_admin,
            "nome": "Fluxo Fixo Empresa",
            "cnpj": "88999888000991",
            "email": "admincliente@fluxo-fixo.test",
            "plano": "Ilimitado",
        },
        follow_redirects=False,
    )

    assert resposta_empresa.status_code == 303
    assert resposta_empresa.headers["location"].startswith("/admin/clientes/")

    pagina_onboarding_empresa = client.get(resposta_empresa.headers["location"])
    assert pagina_onboarding_empresa.status_code == 200
    assert "admincliente@fluxo-fixo.test" in pagina_onboarding_empresa.text
    assert "AdminClienteTemp@123" in pagina_onboarding_empresa.text
    assert "/cliente/login" in pagina_onboarding_empresa.text

    with SessionLocal() as banco:
        empresa = banco.scalar(select(Empresa).where(Empresa.cnpj == "88999888000991"))
        usuario_admin_cliente = banco.scalar(
            select(Usuario).where(Usuario.email == "admincliente@fluxo-fixo.test")
        )
        assert empresa is not None
        assert usuario_admin_cliente is not None
        assert int(usuario_admin_cliente.empresa_id) == int(empresa.id)
        assert int(usuario_admin_cliente.nivel_acesso) == int(NivelAcesso.ADMIN_CLIENTE)
        assert bool(usuario_admin_cliente.senha_temporaria_ativa) is True

    csrf_cliente = _concluir_primeiro_login_cliente(
        client,
        email="admincliente@fluxo-fixo.test",
        senha_temporaria="AdminClienteTemp@123",
        nova_senha="AdminClienteNova@123",
    )

    pagina_equipe = client.get("/cliente/equipe")
    assert pagina_equipe.status_code == 200
    assert 'data-cliente-admin-section-inicial="team"' in pagina_equipe.text
    assert "Gerenciar usuários" in pagina_equipe.text
    assert "Novo usuário" in pagina_equipe.text

    resposta_inspetor = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf_cliente},
        json={
            "nome": "Inspetor Fluxo Fixo",
            "email": "inspetor@fluxo-fixo.test",
            "nivel_acesso": "inspetor",
            "telefone": "62991111111",
            "crea": "",
        },
    )
    assert resposta_inspetor.status_code == 201
    corpo_inspetor = resposta_inspetor.json()
    assert corpo_inspetor["credencial_onboarding"]["acesso_inicial_url"].startswith("/cliente/usuarios/")
    assert corpo_inspetor["senha_temporaria"] == "InspetorTemp@123"

    resposta_revisor = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf_cliente},
        json={
            "nome": "Mesa Fluxo Fixo",
            "email": "mesa@fluxo-fixo.test",
            "nivel_acesso": "revisor",
            "telefone": "62992222222",
            "crea": "123456/GO",
        },
    )
    assert resposta_revisor.status_code == 201
    corpo_revisor = resposta_revisor.json()
    assert corpo_revisor["credencial_onboarding"]["acesso_inicial_url"].startswith("/cliente/usuarios/")
    assert corpo_revisor["senha_temporaria"] == "MesaTemp@123"

    with SessionLocal() as banco:
        inspetor = banco.scalar(select(Usuario).where(Usuario.email == "inspetor@fluxo-fixo.test"))
        revisor = banco.scalar(select(Usuario).where(Usuario.email == "mesa@fluxo-fixo.test"))
        assert inspetor is not None
        assert revisor is not None
        assert bool(inspetor.senha_temporaria_ativa) is True
        assert bool(revisor.senha_temporaria_ativa) is True
        assert int(inspetor.nivel_acesso) == int(NivelAcesso.INSPETOR)
        assert int(revisor.nivel_acesso) == int(NivelAcesso.REVISOR)

    client.cookies.clear()
    _concluir_primeiro_login_operacional(
        client,
        login_path="/app/login",
        trocar_path="/app/trocar-senha",
        destino_final="/app/",
        email="inspetor@fluxo-fixo.test",
        senha_temporaria="InspetorTemp@123",
        nova_senha="InspetorNova@123",
    )

    client.cookies.clear()
    _concluir_primeiro_login_operacional(
        client,
        login_path="/revisao/login",
        trocar_path="/revisao/trocar-senha",
        destino_final="/revisao/painel",
        email="mesa@fluxo-fixo.test",
        senha_temporaria="MesaTemp@123",
        nova_senha="MesaNova@123",
    )

    with SessionLocal() as banco:
        inspetor = banco.scalar(select(Usuario).where(Usuario.email == "inspetor@fluxo-fixo.test"))
        revisor = banco.scalar(select(Usuario).where(Usuario.email == "mesa@fluxo-fixo.test"))
        assert inspetor is not None
        assert revisor is not None
        assert bool(inspetor.senha_temporaria_ativa) is False
        assert bool(revisor.senha_temporaria_ativa) is False


def test_admin_cliente_concede_superficies_adicionais_dentro_da_regra_do_tenant(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "operational_user_cross_portal_enabled": True,
            "operational_user_admin_portal_enabled": True,
        }
        banco.commit()

    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Operador Full Surface",
            "email": "operador-full-surface@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62999990001",
            "crea": "",
            "allowed_portals": ["revisor", "cliente"],
        },
    )

    assert resposta.status_code == 201
    usuario = resposta.json()["usuario"]
    credencial = resposta.json()["credencial_onboarding"]
    assert usuario["allowed_portals"] == ["inspetor", "revisor", "cliente"]
    assert credencial["portais"] == [
        {
            "portal": "inspetor",
            "label": "Inspeção IA",
            "login_url": "/app/login",
        },
        {
            "portal": "revisor",
            "label": "Revisão Técnica",
            "login_url": "/revisao/login",
        },
        {
            "portal": "cliente",
            "label": "Portal Cliente",
            "login_url": "/cliente/login",
        },
    ]

    with SessionLocal() as banco:
        criado = banco.scalar(
            select(Usuario).where(Usuario.email == "operador-full-surface@empresa-a.test")
        )
        assert criado is not None
        assert criado.allowed_portals == ("inspetor", "revisor", "cliente")


def test_admin_cliente_respeita_limite_operacional_do_pacote_mobile_single_operator(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]

    with SessionLocal() as banco:
        empresa = Empresa(
            nome_fantasia="Empresa Mobile Single Operator",
            cnpj="11222333000186",
            plano_ativo=PlanoEmpresa.ILIMITADO.value,
        )
        banco.add(empresa)
        banco.flush()
        empresa.admin_cliente_policy_json = {
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "operating_model": "mobile_single_operator",
            "shared_mobile_operator_web_inspector_enabled": True,
            "shared_mobile_operator_web_review_enabled": True,
        }
        banco.add(
            Usuario(
                empresa_id=int(empresa.id),
                nome_completo="Admin Cliente Mobile Único",
                email="cliente-mobile-single@empresa.test",
                senha_hash=SENHA_HASH_PADRAO,
                nivel_acesso=NivelAcesso.ADMIN_CLIENTE.value,
            )
        )
        banco.commit()

    csrf = _login_cliente(client, "cliente-mobile-single@empresa.test")

    resposta_primeiro = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Operador Mobile Único",
            "email": "operador.mobile@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62998880001",
            "crea": "",
        },
    )
    assert resposta_primeiro.status_code == 201

    resposta_segundo = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Mesa Extra",
            "email": "mesa.extra@empresa-a.test",
            "nivel_acesso": "revisor",
            "telefone": "62998880002",
            "crea": "123456/GO",
        },
    )
    assert resposta_segundo.status_code == 409
    assert "limite operacional" in resposta_segundo.json()["detail"].lower()

    resposta_auditoria = client.get("/cliente/api/auditoria")
    assert resposta_auditoria.status_code == 200
    itens = resposta_auditoria.json()["itens"]
    registro_negado = next(item for item in itens if item["acao"] == "usuario_criacao_negada_pacote")
    assert registro_negado["categoria"] == "team"
    assert registro_negado["payload"]["requested_email"] == "mesa.extra@empresa-a.test"
    assert registro_negado["payload"]["contract_operational_user_limit"] == 1
    assert registro_negado["payload"]["operational_users_in_use"] == 1
    assert registro_negado["payload"]["shared_mobile_operator_surface_set"] == [
        "mobile",
        "inspetor_web",
        "mesa_web",
    ]

    resposta_diagnostico = client.get("/cliente/api/diagnostico", headers={"X-CSRF-Token": csrf})
    assert resposta_diagnostico.status_code == 200
    diagnostico = resposta_diagnostico.json()
    pacote_operacional = diagnostico["operational_package"]
    assert pacote_operacional["mobile_single_operator_enabled"] is True
    assert pacote_operacional["contract_operational_user_limit"] == 1
    assert pacote_operacional["operational_users_in_use"] == 1
    assert pacote_operacional["operational_users_at_limit"] is True
    assert pacote_operacional["shared_mobile_operator_surface_set"] == [
        "mobile",
        "inspetor_web",
        "mesa_web",
    ]


def test_admin_cliente_chat_lista_laudos_da_empresa_sem_vazar_outra(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    with SessionLocal() as banco:
        laudo_empresa_a = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        laudo_empresa_b = _criar_laudo(
            banco,
            empresa_id=ids["empresa_b"],
            usuario_id=ids["inspetor_b"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )

    resposta_lista = client.get("/cliente/api/chat/laudos", headers={"X-CSRF-Token": csrf})

    assert resposta_lista.status_code == 200
    ids_laudos = {int(item["id"]) for item in resposta_lista.json()["itens"]}
    assert laudo_empresa_a in ids_laudos
    assert laudo_empresa_b not in ids_laudos

    resposta_mensagens_empresa_a = client.get(
        f"/cliente/api/chat/laudos/{laudo_empresa_a}/mensagens",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_mensagens_empresa_a.status_code == 200

    resposta_mensagens_empresa_b = client.get(
        f"/cliente/api/chat/laudos/{laudo_empresa_b}/mensagens",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_mensagens_empresa_b.status_code == 404


def test_admin_cliente_exclui_usuario_operacional_sem_apagar_historico_tecnico(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_criacao = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Inspetor Temporario A3",
            "email": "inspetor3@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62990000003",
            "crea": "",
        },
    )
    assert resposta_criacao.status_code == 201
    usuario_id = int(resposta_criacao.json()["usuario"]["id"])

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=usuario_id,
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        banco.add(
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=usuario_id,
                tipo=TipoMensagem.USER.value,
                conteudo="Historico em campo que nao pode desaparecer com a exclusao do cadastro.",
                custo_api_reais=Decimal("0.0000"),
            )
        )
        banco.commit()

    resposta_exclusao = client.delete(
        f"/cliente/api/usuarios/{usuario_id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_exclusao.status_code == 200
    assert resposta_exclusao.json()["success"] is True
    assert int(resposta_exclusao.json()["usuario_id"]) == usuario_id

    with SessionLocal() as banco:
        usuario_removido = banco.get(Usuario, usuario_id)
        laudo = banco.get(Laudo, laudo_id)
        mensagem = (
            banco.query(MensagemLaudo)
            .filter(MensagemLaudo.laudo_id == laudo_id)
            .order_by(MensagemLaudo.id.desc())
            .first()
        )
        auditoria = (
            banco.query(RegistroAuditoriaEmpresa)
            .filter(
                RegistroAuditoriaEmpresa.empresa_id == ids["empresa_a"],
                RegistroAuditoriaEmpresa.acao == "usuario_excluido",
            )
            .order_by(RegistroAuditoriaEmpresa.id.desc())
            .first()
        )

        assert usuario_removido is None
        assert laudo is not None
        assert laudo.usuario_id is None
        assert mensagem is not None
        assert mensagem.remetente_id is None
        assert auditoria is not None
        assert auditoria.payload_json["usuario_id"] == usuario_id
        assert auditoria.payload_json["email"] == "inspetor3@empresa-a.test"

    resposta_recriacao = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Inspetor Recriado A3",
            "email": "inspetor3@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62990000013",
            "crea": "",
        },
    )
    assert resposta_recriacao.status_code == 201
    assert resposta_recriacao.json()["usuario"]["email"] == "inspetor3@empresa-a.test"


def test_admin_cliente_mesa_reescreve_urls_de_anexo_para_o_proprio_portal(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    conteudo = _imagem_png_bytes_teste()
    caminho = ""

    try:
        with SessionLocal() as banco:
            laudo_id = _criar_laudo(
                banco,
                empresa_id=ids["empresa_a"],
                usuario_id=ids["inspetor_a"],
                status_revisao=StatusRevisao.AGUARDANDO.value,
            )

            mensagem = MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=ids["revisor_a"],
                tipo=TipoMensagem.HUMANO_ENG.value,
                conteudo="Pendencia com evidencia anexada.",
                lida=False,
                custo_api_reais=Decimal("0.0000"),
            )
            banco.add(mensagem)
            banco.flush()

            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as arquivo:
                arquivo.write(conteudo)
                caminho = arquivo.name

            anexo = AnexoMesa(
                laudo_id=laudo_id,
                mensagem_id=mensagem.id,
                enviado_por_id=ids["revisor_a"],
                nome_original="retorno-mesa.png",
                nome_arquivo="retorno-mesa.png",
                mime_type="image/png",
                categoria="imagem",
                tamanho_bytes=len(conteudo),
                caminho_arquivo=caminho,
            )
            banco.add(anexo)
            banco.commit()
            banco.refresh(anexo)
            anexo_id = int(anexo.id)

        resposta = client.get(
            f"/cliente/api/mesa/laudos/{laudo_id}/mensagens",
            headers={"X-CSRF-Token": csrf},
        )

        assert resposta.status_code == 200
        itens = resposta.json()["itens"]
        assert itens
        anexo_payload = itens[-1]["anexos"][0]
        assert anexo_payload["nome"] == "retorno-mesa.png"
        assert anexo_payload["url"] == f"/cliente/api/mesa/laudos/{laudo_id}/anexos/{anexo_id}"

        resposta_completo = client.get(
            f"/cliente/api/mesa/laudos/{laudo_id}/completo",
            params={"incluir_historico": "true"},
            headers={"X-CSRF-Token": csrf},
        )
        assert resposta_completo.status_code == 200
        historico = resposta_completo.json()["historico"]
        assert historico[-1]["anexos"][0]["url"] == f"/cliente/api/mesa/laudos/{laudo_id}/anexos/{anexo_id}"

        resposta_pacote = client.get(
            f"/cliente/api/mesa/laudos/{laudo_id}/pacote",
            headers={"X-CSRF-Token": csrf},
        )
        assert resposta_pacote.status_code == 200
        pacote = resposta_pacote.json()
        assert pacote["pendencias_abertas"][0]["anexos"][0]["url"] == f"/cliente/api/mesa/laudos/{laudo_id}/anexos/{anexo_id}"

        download = client.get(anexo_payload["url"])
        assert download.status_code == 200
        assert download.content == conteudo
    finally:
        if caminho and os.path.exists(caminho):
            os.unlink(caminho)


def test_admin_cliente_upload_documental_reaproveita_fluxo_do_chat(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.post(
        "/cliente/api/chat/upload_doc",
        headers={"X-CSRF-Token": csrf},
        files={
            "arquivo": (
                "checklist-operacional.docx",
                _docx_bytes_teste("Checklist operacional do admin-cliente para a empresa."),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert "Checklist operacional do admin-cliente" in corpo["texto"]
    assert corpo["nome"] == "checklist-operacional.docx"
    assert corpo["chars"] >= 20
    assert corpo["truncado"] is False


def test_admin_cliente_registra_auditoria_de_plano_e_usuarios(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_plano = client.post(
        "/cliente/api/empresa/plano/interesse",
        headers={"X-CSRF-Token": csrf},
        json={
            "plano": "Intermediario",
            "origem": "admin",
            "urgencia": "30_dias",
            "motivo": "crescimento_equipe",
            "observacoes": "Contratação prevista para duas frentes novas.",
        },
    )
    assert resposta_plano.status_code == 200

    resposta_usuario = client.post(
        "/cliente/api/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome": "Auditado Empresa A",
            "email": "auditado@empresa-a.test",
            "nivel_acesso": "inspetor",
            "telefone": "62991110000",
            "crea": "",
        },
    )
    assert resposta_usuario.status_code == 201
    usuario_novo_id = int(resposta_usuario.json()["usuario"]["id"])

    resposta_auditoria = client.get("/cliente/api/auditoria")
    assert resposta_auditoria.status_code == 200
    auditoria_payload = resposta_auditoria.json()
    itens = auditoria_payload["itens"]
    acoes = [item["acao"] for item in itens]
    assert "plano_interesse_registrado" in acoes
    assert "usuario_criado" in acoes
    assert all(item["portal"] == "cliente" for item in itens)
    assert any(item["ator_usuario_id"] == ids["admin_cliente_a"] for item in itens)
    assert any(item["alvo_usuario_id"] == usuario_novo_id for item in itens if item["acao"] == "usuario_criado")
    assert auditoria_payload["resumo"]["categories"]["commercial"] >= 1
    assert auditoria_payload["resumo"]["categories"]["team"] >= 1
    registro_plano = next(item for item in itens if item["acao"] == "plano_interesse_registrado")
    assert registro_plano["payload"]["plano_anterior"] == "Ilimitado"
    assert registro_plano["payload"]["plano_sugerido"] == "Intermediario"
    assert registro_plano["payload"]["origem"] == "admin"
    assert registro_plano["payload"]["movimento"] == "downgrade"
    assert registro_plano["payload"]["urgencia"] == "30_dias"
    assert registro_plano["payload"]["motivo"] == "crescimento_equipe"
    assert registro_plano["payload"]["observacoes"] == "Contratação prevista para duas frentes novas."
    assert "Impacto esperado" in registro_plano["detalhe"]
    assert registro_plano["categoria"] == "commercial"
    assert registro_plano["scope"] == "admin"

    resposta_bootstrap = client.get("/cliente/api/bootstrap")
    assert resposta_bootstrap.status_code == 200
    bootstrap_itens = resposta_bootstrap.json()["auditoria"]["itens"]
    assert bootstrap_itens
    assert {item["acao"] for item in bootstrap_itens} >= {"plano_interesse_registrado", "usuario_criado"}
    assert resposta_bootstrap.json()["auditoria"]["resumo"]["categories"]["commercial"] >= 1

    with SessionLocal() as banco:
        registros = list(
            banco.scalars(
                select(RegistroAuditoriaEmpresa).where(RegistroAuditoriaEmpresa.empresa_id == ids["empresa_a"]).order_by(RegistroAuditoriaEmpresa.id.desc())
            ).all()
        )
        assert registros
        assert all(int(item.empresa_id) == ids["empresa_a"] for item in registros)
        assert {item.acao for item in registros} >= {"plano_interesse_registrado", "usuario_criado"}


def test_admin_cliente_registra_interesse_em_upgrade_no_historico(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.plano_ativo = PlanoEmpresa.INICIAL.value
        banco.commit()

    resposta_interesse = client.post(
        "/cliente/api/empresa/plano/interesse",
        headers={"X-CSRF-Token": csrf},
        json={"plano": "Intermediario", "origem": "chat"},
    )
    assert resposta_interesse.status_code == 200
    corpo = resposta_interesse.json()
    assert corpo["success"] is True
    assert corpo["plano"]["plano"] == "Intermediario"
    assert corpo["plano"]["movimento"] == "upgrade"

    resposta_auditoria = client.get("/cliente/api/auditoria")
    assert resposta_auditoria.status_code == 200
    itens = resposta_auditoria.json()["itens"]
    registro = next(item for item in itens if item["acao"] == "plano_interesse_registrado")
    assert registro["payload"]["origem"] == "chat"
    assert registro["payload"]["plano_sugerido"] == "Intermediario"
    assert "Impacto esperado" in registro["detalhe"]


def test_admin_cliente_bootstrap_expoe_override_humano_interno_no_chat_e_na_mesa(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.report_pack_draft_json = {
            "quality_gates": {
                "human_override": {
                    "scope": "quality_gate",
                    "applied_at": "2026-04-13T12:00:00+00:00",
                    "actor_user_id": ids["inspetor_a"],
                    "actor_name": "Inspetor A",
                    "reason": "O responsável técnico decidiu manter a conclusão após revisar a NR manualmente.",
                    "matched_override_cases": [
                        "evidencia_complementar_substituida_por_registro_textual_com_rastreabilidade"
                    ],
                    "matched_override_case_labels": [
                        "Evidência complementar substituída por registro textual com rastreabilidade"
                    ],
                    "overrideable_item_ids": ["fotos_essenciais"],
                },
                "human_override_history": [
                    {
                        "scope": "quality_gate",
                        "applied_at": "2026-04-13T12:00:00+00:00",
                        "actor_user_id": ids["inspetor_a"],
                        "actor_name": "Inspetor A",
                        "reason": "O responsável técnico decidiu manter a conclusão após revisar a NR manualmente.",
                    }
                ],
            }
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_chat = client.get("/cliente/api/bootstrap?surface=chat")
    assert resposta_chat.status_code == 200
    laudo_chat = next(item for item in resposta_chat.json()["chat"]["laudos"] if int(item["id"]) == laudo_id)
    assert laudo_chat["human_override_summary"]["latest"]["actor_name"] == "Inspetor A"
    assert "revisar a NR manualmente" in laudo_chat["human_override_summary"]["latest"]["reason"]

    resposta_mesa = client.get("/cliente/api/bootstrap?surface=mesa")
    assert resposta_mesa.status_code == 200
    laudo_mesa = next(item for item in resposta_mesa.json()["mesa"]["laudos"] if int(item["id"]) == laudo_id)
    assert laudo_mesa["human_override_summary"]["latest"]["actor_name"] == "Inspetor A"
    assert laudo_mesa["human_override_summary"]["count"] == 1


def test_admin_cliente_bootstrap_mesa_expoe_status_visual_label_canonico(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.nome_arquivo_pdf = "laudo_emitido.pdf"
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_mesa = client.get("/cliente/api/bootstrap?surface=mesa")
    assert resposta_mesa.status_code == 200
    laudo_mesa = next(item for item in resposta_mesa.json()["mesa"]["laudos"] if int(item["id"]) == laudo_id)
    assert laudo_mesa["case_lifecycle_status"] == "emitido"
    assert laudo_mesa["active_owner_role"] == "none"
    assert laudo_mesa["status_visual_label"] == "Emitido / Responsavel: conclusao"


def test_admin_cliente_bootstrap_documentos_expoe_biblioteca_documental_minima(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="spda",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.nome_arquivo_pdf = "laudo_spda_emitido.pdf"
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    corpo = resposta_documentos.json()
    assert "documentos" in corpo
    assert corpo["documentos"]["summary"]["total_documents"] >= 1
    item = next(item for item in corpo["documentos"]["items"] if int(item["laudo_id"]) == laudo_id)
    assert item["document_type"] == "laudo"
    assert item["document_type_label"] == "Inspeção SPDA"
    assert item["pdf_present"] is True
    assert item["verification_url"].endswith(str(item["codigo_hash"]))
    assert item["hash_short"] == str(item["codigo_hash"])[-6:]
    assert item["issue_status_label"]
    assert item["document_visual_state"] in {"official", "draft", "in_review", "historical", "internal"}
    assert item["document_visual_state_label"]
    assert item["document_summary_card"]["hash"] == str(item["codigo_hash"])[-6:]
    assert item["document_package_sections"]["counts"]["documento_oficial"] >= 1
    assert any(step["key"] == "aprovado" for step in item["document_timeline"])


def test_admin_cliente_documentos_concentra_comprovacoes_profissionais(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    enviado_em = datetime(2026, 5, 3, 12, 10, tzinfo=timezone.utc)
    documento_hash = hashlib.sha256(b"comprovacao documentos").hexdigest()

    with SessionLocal() as banco:
        signatario = SignatarioGovernadoLaudo(
            tenant_id=ids["empresa_a"],
            nome="Eng. Documentos Profissionais",
            funcao="Engenheiro de Segurança do Trabalho",
            registro_profissional="CREA DOCS 2026",
            valid_until=enviado_em + timedelta(days=180),
            allowed_family_keys_json=["nr12"],
            governance_metadata_json={
                "professional_approval_status": "in_review",
                "professional_approval_source": "cliente_portal",
                "professional_approval_submitted_at": enviado_em.isoformat(),
                "professional_type": "engenheiro_seguranca",
                "professional_email": "eng.docs@empresa-a.test",
                "professional_phone": "62999990000",
                "professional_documents_status": "uploaded",
                "professional_documents_updated_at": enviado_em.isoformat(),
                "professional_documents": [
                    {
                        "id": "doc-profissional-1",
                        "nome": "crea-docs.pdf",
                        "mime_type": "application/pdf",
                        "categoria": "pdf",
                        "tamanho_bytes": 2048,
                        "sha256": documento_hash,
                        "storage_path": "/tmp/nao-expor/crea-docs.pdf",
                        "uploaded_at": enviado_em.isoformat(),
                    }
                ],
            },
            ativo=True,
            criado_por_id=ids["admin_a"],
        )
        banco.add(signatario)
        banco.commit()
        signatario_id = int(signatario.id)

    _login_cliente(client, "cliente@empresa-a.test")

    pagina_documentos = client.get("/cliente/documentos")
    assert pagina_documentos.status_code == 200
    assert 'id="documentos-habilitacao-profissional"' in pagina_documentos.text
    assert "Comprovações profissionais" in pagina_documentos.text

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    corpo = resposta_documentos.json()
    habilitacao = corpo["documentos"]["professional_habilitation"]
    item = next(entry for entry in habilitacao["items"] if int(entry["id"]) == signatario_id)
    documento = item["professional_documents"][0]

    assert item["professional_type_label"] == "Engenheiro de Segurança do Trabalho"
    assert item["professional_email"] == "eng.docs@empresa-a.test"
    assert item["approval_status"] == "in_review"
    assert item["professional_documents_count"] == 1
    assert documento["nome"] == "crea-docs.pdf"
    assert documento["tamanho_label"] == "2.0 KB"
    assert documento["sha256"] == documento_hash
    assert "storage_path" not in documento


def test_admin_cliente_bootstrap_documentos_agrega_art_pie_e_prontuario(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr10_prontuario",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.nome_arquivo_pdf = "prontuario_qgbt07.pdf"
        laudo.catalog_family_label = "NR10 · Prontuario instalacoes eletricas"
        laudo.dados_formulario = {
            "documentacao_e_registros": {
                "documentos_disponiveis": "PIE: PIE QGBT-07 atualizado. ART: ART 2026-00155. Diagrama: rev.04.",
                "observacoes_documentais": "Prontuario eletrico consolidado para o painel QGBT-07.",
                "prontuario": {
                    "referencias_texto": "DOC_777 - prontuario_qgbt07.pdf",
                    "observacao": "Prontuario revisado com rastreabilidade documental.",
                },
            }
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    corpo = resposta_documentos.json()
    summary = corpo["documentos"]["summary"]
    item = next(item for item in corpo["documentos"]["items"] if int(item["laudo_id"]) == laudo_id)

    assert summary["documents_with_art"] >= 1
    assert summary["documents_with_pie"] >= 1
    assert summary["documents_with_prontuario"] >= 1
    assert any(int(doc["laudo_id"]) == laudo_id for doc in summary["with_art_items"])
    assert any(int(doc["laudo_id"]) == laudo_id for doc in summary["with_pie_items"])
    assert any(int(doc["laudo_id"]) == laudo_id for doc in summary["with_prontuario_items"])
    assert item["document_signals"]["count"] >= 3
    assert item["document_signals"]["present_labels"] == ["ART vinculada", "PIE", "Prontuário"]


def test_admin_cliente_bootstrap_documentos_resume_status_operacional_nr35_para_wf(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_aprovado_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo_reprovado_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        laudo_pendente_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )

        laudo_aprovado = banco.get(Laudo, laudo_aprovado_id)
        laudo_reprovado = banco.get(Laudo, laudo_reprovado_id)
        laudo_pendente = banco.get(Laudo, laudo_pendente_id)
        assert laudo_aprovado is not None
        assert laudo_reprovado is not None
        assert laudo_pendente is not None

        laudo_aprovado.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo_aprovado.dados_formulario = {
            "objeto_inspecao": {"tipo_linha_de_vida": "Vertical"},
            "componentes_inspecionados": {
                "fixacao_dos_pontos": {"condicao": "C"},
                "condicao_cabo_aco": {"condicao": "C"},
            },
            "registros_fotograficos": [{"titulo": "Inicio"}, {"titulo": "Fim"}],
            "conclusao": {
                "status": "Aprovado",
                "status_operacional": "liberado",
                "proxima_inspecao_periodica": "Fevereiro de 2027",
            },
        }

        laudo_reprovado.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo_reprovado.dados_formulario = {
            "objeto_inspecao": {"tipo_linha_de_vida": "Horizontal"},
            "componentes_inspecionados": {
                "fixacao_dos_pontos": {"condicao": "NC"},
                "condicao_cabo_aco": {"condicao": "NC"},
                "condicao_esticador": {"condicao": "NA"},
            },
            "registros_fotograficos": [{"titulo": "Vista geral"}],
            "conclusao": {
                "status": "Reprovado",
                "status_operacional": "bloqueio",
                "acao_requerida": "corrigir_e_revalidar",
                "proxima_inspecao_periodica": "Após correção",
            },
        }

        laudo_pendente.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo_pendente.dados_formulario = {
            "objeto_inspecao": {"tipo_linha_de_vida": "Horizontal"},
            "componentes_inspecionados": {
                "fixacao_dos_pontos": {"condicao": "NA"},
                "condicao_cabo_aco": {"condicao": "NA"},
            },
            "conclusao": {
                "status": "Pendente",
                "status_operacional": "complementar_inspecao",
                "proxima_inspecao_periodica": "Inspeção complementar",
            },
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    corpo = resposta_documentos.json()
    summary = corpo["documentos"]["summary"]

    assert summary["nr35_approved"] >= 1
    assert summary["nr35_reproved"] >= 1
    assert summary["nr35_pending"] >= 1

    item_aprovado = next(item for item in corpo["documentos"]["items"] if int(item["laudo_id"]) == laudo_aprovado_id)
    assert item_aprovado["nr35_summary"]["conclusion_status"] == "Aprovado"
    assert item_aprovado["nr35_summary"]["operational_status"] == "liberado"
    assert item_aprovado["nr35_summary"]["line_type"] == "Vertical"
    assert item_aprovado["nr35_summary"]["component_counts"] == {"C": 2, "NC": 0, "NA": 0}
    assert item_aprovado["nr35_summary"]["photo_count"] == 2

    item_reprovado = next(item for item in corpo["documentos"]["items"] if int(item["laudo_id"]) == laudo_reprovado_id)
    assert item_reprovado["nr35_summary"]["conclusion_status"] == "Reprovado"
    assert item_reprovado["nr35_summary"]["operational_status"] == "bloqueio"
    assert item_reprovado["nr35_summary"]["component_counts"] == {"C": 0, "NC": 2, "NA": 1}

    item_pendente = next(item for item in corpo["documentos"]["items"] if int(item["laudo_id"]) == laudo_pendente_id)
    assert item_pendente["nr35_summary"]["conclusion_status"] == "Pendente"
    assert item_pendente["nr35_summary"]["operational_status"] == "complementar_inspecao"
    assert item_pendente["nr35_summary"]["component_counts"] == {"C": 0, "NC": 0, "NA": 2}


def test_admin_cliente_documentos_expoe_entrega_oficial_nr35_auditavel(
    ambiente_critico,
    tmp_path,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id, pdf_bytes, package_bytes = _criar_entrega_oficial_nr35_cliente(banco, ids, tmp_path)

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    corpo = resposta_documentos.json()
    summary = corpo["documentos"]["summary"]
    item = next(item for item in corpo["documentos"]["items"] if int(item["laudo_id"]) == laudo_id)

    assert summary["nr35_official_issued"] >= 1
    assert summary["official_package_ready"] >= 1
    assert summary["official_issue_history_count"] >= 1
    assert item["family_key"] == "nr35_inspecao_linha_de_vida"
    assert item["already_issued"] is True
    assert item["emissao_oficial"]["existe"] is True
    assert item["emissao_oficial"]["status"] == "emitido"
    assert item["emissao_oficial"]["mesa_status"] == "aprovado"
    assert item["emissao_oficial"]["package_sha256"] == hashlib.sha256(package_bytes).hexdigest()
    assert item["emissao_oficial"]["primary_pdf_sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
    assert item["emissao_oficial"]["template_version"]
    assert item["emissao_oficial"]["schema_version"]
    assert item["emissao_oficial"]["download_pdf_url"].endswith("/nr35/emissao-oficial/pdf")
    assert item["emissao_oficial"]["download_package_url"].endswith("/nr35/emissao-oficial/pacote")
    assert item["nr35"]["slots_fotograficos"] == 4
    assert item["nr35"]["manifest_ok"] is True
    assert item["nr35"]["auditavel"] is True
    assert {slot["slot"] for slot in item["nr35"]["photo_slots"]} == set(NR35_REQUIRED_PHOTO_SLOTS)
    assert item["historico_emissoes"][0]["issue_number"] == "TAR-20260426-0001-000001"
    assert item["historico_emissoes"][0]["nr35_manifest_ok"] is True

    resposta_pdf = client.get(item["emissao_oficial"]["download_pdf_url"])
    assert resposta_pdf.status_code == 200
    assert resposta_pdf.content == pdf_bytes
    leitor_pdf_oficial = pypdf.PdfReader(io.BytesIO(resposta_pdf.content))
    assert "/TarielOfficiality" not in leitor_pdf_oficial.metadata
    assert NON_OFFICIAL_PDF_NOTICE_TITLE not in _texto_pdf(resposta_pdf.content)
    assert "laudo_nr35_cliente.pdf" in resposta_pdf.headers["content-disposition"]

    resposta_pacote = client.get(item["emissao_oficial"]["download_package_url"])
    assert resposta_pacote.status_code == 200
    assert resposta_pacote.content == package_bytes
    assert "TAR-NR35-CLIENTE.zip" in resposta_pacote.headers["content-disposition"]

    with SessionLocal() as banco:
        registros_download = banco.scalars(
            select(RegistroAuditoriaEmpresa)
            .where(
                RegistroAuditoriaEmpresa.empresa_id == ids["empresa_a"],
                RegistroAuditoriaEmpresa.acao == "emissao_oficial_download",
                RegistroAuditoriaEmpresa.portal == "cliente",
            )
            .order_by(RegistroAuditoriaEmpresa.id.asc())
        ).all()
    assert len(registros_download) == 2
    payloads = [registro.payload_json or {} for registro in registros_download]
    assert {payload["artifact_kind"] for payload in payloads} == {"primary_pdf", "official_package"}
    assert {payload["issue_number"] for payload in payloads} == {"TAR-20260426-0001-000001"}
    assert {payload["laudo_id"] for payload in payloads} == {laudo_id}
    assert any(payload.get("primary_pdf_sha256") == hashlib.sha256(pdf_bytes).hexdigest() for payload in payloads)
    assert all("package_storage_path" not in payload for payload in payloads)
    assert all("storage_path" not in payload for payload in payloads)


def test_admin_cliente_documentos_publica_linguagem_canonica_para_emissao_e_pdf_operacional(
    ambiente_critico,
    tmp_path,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_oficial_id, _pdf_bytes, _package_bytes = _criar_entrega_oficial_nr35_cliente(banco, ids, tmp_path)
        laudo_operacional_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="padrao",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo_operacional = banco.get(Laudo, laudo_operacional_id)
        assert laudo_operacional is not None
        laudo_operacional.nome_arquivo_pdf = "pdf_operacional_cliente.pdf"
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    items = resposta_documentos.json()["documentos"]["items"]
    item_oficial = next(item for item in items if int(item["laudo_id"]) == laudo_oficial_id)
    item_operacional = next(item for item in items if int(item["laudo_id"]) == laudo_operacional_id)

    assert item_oficial["document_ui"]["official_issue_label"] == "Emissão oficial"
    assert item_oficial["document_ui"]["official_package_label"] == "Pacote oficial"
    assert item_oficial["document_ui"]["history_label"] == "Histórico de emissões"
    assert item_oficial["document_ui"]["status_label"] == "Emitido"
    assert item_operacional["document_ui"]["document_kind_label"] == "PDF operacional"
    assert item_operacional["document_ui"]["document_kind_detail"] == "Arquivo de trabalho do caso; não substitui emissão oficial."
    assert item_operacional["emissao_oficial"]["existe"] is False

    ui_payload = json.dumps(
        [item_oficial["document_ui"], item_operacional["document_ui"]],
        ensure_ascii=False,
        sort_keys=True,
    )
    for termo_interno in (
        "mobile_autonomous",
        "reviewer_issue",
        "reviewer_decision",
        "primary_pdf_diverged",
        "tenant_without_mesa",
        "nr35_mesa_required_unavailable",
    ):
        assert termo_interno not in ui_payload


def test_admin_cliente_documentos_historico_traduz_emissao_substituida(
    ambiente_critico,
    tmp_path,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id, _pdf_bytes, _package_bytes = _criar_entrega_oficial_nr35_cliente(banco, ids, tmp_path)
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        snapshot = banco.scalar(
            select(ApprovedCaseSnapshot).where(ApprovedCaseSnapshot.laudo_id == laudo_id)
        )
        signatario = banco.scalar(
            select(SignatarioGovernadoLaudo).where(SignatarioGovernadoLaudo.tenant_id == ids["empresa_a"])
        )
        assert snapshot is not None
        assert signatario is not None
        package_path = tmp_path / "TAR-NR35-CLIENTE-OLD.zip"
        package_bytes = b"nr35 official old package cliente"
        package_path.write_bytes(package_bytes)
        banco.add(
            EmissaoOficialLaudo(
                laudo_id=laudo_id,
                tenant_id=ids["empresa_a"],
                approval_snapshot_id=int(snapshot.id),
                signatory_id=int(signatario.id),
                issued_by_user_id=ids["revisor_a"],
                issue_number="TAR-20260425-0001-000001",
                issue_state="superseded",
                issued_at=datetime.now(timezone.utc) - timedelta(days=2),
                superseded_at=datetime.now(timezone.utc) - timedelta(days=1),
                verification_hash=laudo.codigo_hash,
                public_verification_url=f"/app/public/laudo/verificar/{laudo.codigo_hash}",
                package_sha256=hashlib.sha256(package_bytes).hexdigest(),
                package_fingerprint_sha256="e" * 64,
                package_filename="TAR-NR35-CLIENTE-OLD.zip",
                package_storage_path=str(package_path),
                package_size_bytes=len(package_bytes),
                manifest_json={"bundle_kind": "tariel_official_issue_package"},
                issue_context_json={
                    "approval_version": 1,
                    "superseded_by_issue_number": "TAR-20260426-0001-000001",
                    "superseded_reason_summary": "Nova emissão oficial disponível.",
                    "signatory_snapshot": {"nome": signatario.nome, "funcao": signatario.funcao},
                    "issued_by_snapshot": {"nome": "Revisor A"},
                },
            )
        )
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    item = next(
        item for item in resposta_documentos.json()["documentos"]["items"] if int(item["laudo_id"]) == laudo_id
    )
    historico_antigo = next(
        issue for issue in item["historico_emissoes"] if issue["issue_number"] == "TAR-20260425-0001-000001"
    )

    assert item["emissao_oficial"]["issue_number"] == "TAR-20260426-0001-000001"
    assert historico_antigo["issue_state_label"] == "Substituído"
    assert historico_antigo["document_history_label"] == "Documento substituído"
    assert historico_antigo["package_sha256"] == hashlib.sha256(package_bytes).hexdigest()


def test_admin_cliente_documentos_nao_trata_rascunho_nr35_como_oficial(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo.dados_formulario = _payload_nr35_cliente_aprovado()
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    item = next(item for item in resposta_documentos.json()["documentos"]["items"] if int(item["laudo_id"]) == laudo_id)

    assert item["emissao_oficial"]["existe"] is False
    assert item["emissao_oficial"]["download_pdf_url"] is None
    assert item["emissao_oficial"]["download_package_url"] is None
    assert item["nr35"]["auditavel"] is False


def test_admin_cliente_download_oficial_nr35_respeita_tenant(
    ambiente_critico,
    tmp_path,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        admin_cliente_b = Usuario(
            empresa_id=ids["empresa_b"],
            nome_completo="Admin Cliente B",
            email="cliente@empresa-b.test",
            senha_hash=SENHA_HASH_PADRAO,
            nivel_acesso=NivelAcesso.ADMIN_CLIENTE.value,
        )
        banco.add(admin_cliente_b)
        banco.commit()
        laudo_id, _pdf_bytes, _package_bytes = _criar_entrega_oficial_nr35_cliente(banco, ids, tmp_path)

    _login_cliente(client, "cliente@empresa-b.test")

    resposta_pdf = client.get(f"/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pdf")
    resposta_pacote = client.get(f"/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pacote")

    assert resposta_pdf.status_code == 404
    assert resposta_pacote.status_code == 404


def test_admin_cliente_bootstrap_ativos_agrega_unidade_ativo_e_proxima_inspecao_para_wf(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo.dados_formulario = {
            "informacoes_gerais": {
                "unidade": "Moinho 03",
            },
            "identificacao": {
                "localizacao": "Caixa de expedição 01 interna",
                "objeto_principal": "Linha de vida interna",
            },
            "objeto_inspecao": {
                "tipo_linha_de_vida": "Horizontal",
            },
            "documentacao_e_registros": {
                "proxima_inspecao_planejada": "Abril de 2027",
            },
            "conclusao": {
                "status": "Aprovado",
                "status_operacional": "liberado",
            },
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_ativos = client.get("/cliente/api/bootstrap?surface=ativos")
    assert resposta_ativos.status_code == 200
    corpo = resposta_ativos.json()
    assert "ativos" in corpo
    summary = corpo["ativos"]["summary"]
    item = next(item for item in corpo["ativos"]["items"] if int(item["laudo_id"]) == laudo_id)

    assert summary["total_assets"] >= 1
    assert summary["total_units"] >= 1
    assert summary["healthy_assets"] >= 1
    assert item["unit_label"] == "Moinho 03"
    assert item["location_label"] == "Caixa de expedição 01 interna"
    assert item["asset_label"] == "Linha de vida interna"
    assert item["asset_type"] == "Horizontal"
    assert item["next_due_at"] == "Abril de 2027"
    assert item["health_status"] == "healthy"
    assert item["service_keys"] == ["nr35"]


def test_admin_cliente_bootstrap_servicos_agrega_carteira_contratada_para_wf(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        laudo_nr35_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo_spda_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="spda",
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        laudo_pie_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr10_prontuario",
            status_revisao=StatusRevisao.APROVADO.value,
        )

        laudo_nr35 = banco.get(Laudo, laudo_nr35_id)
        laudo_spda = banco.get(Laudo, laudo_spda_id)
        laudo_pie = banco.get(Laudo, laudo_pie_id)
        assert laudo_nr35 is not None
        assert laudo_spda is not None
        assert laudo_pie is not None

        laudo_nr35.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo_nr35.nome_arquivo_pdf = "wf_nr35.pdf"
        laudo_nr35.dados_formulario = {
            "informacoes_gerais": {"unidade": "Planta A"},
            "identificacao": {"objeto_principal": "Linha de vida superior"},
            "documentacao_e_registros": {"proxima_inspecao_planejada": "2027-04-01"},
            "conclusao": {"status": "Aprovado", "status_operacional": "liberado"},
        }

        laudo_spda.catalog_family_key = "spda_inspecao"
        laudo_spda.dados_formulario = {
            "informacoes_gerais": {"unidade": "Planta B"},
            "documentacao_e_registros": {"proxima_inspecao_planejada": "2026-10-10"},
            "conclusao": {"status": "Pendente", "status_operacional": "complementar_inspecao"},
        }

        laudo_pie.catalog_family_key = "nr10_pie_prontuario"
        laudo_pie.nome_arquivo_pdf = "pie_qgbt.pdf"
        laudo_pie.dados_formulario = {
            "informacoes_gerais": {"unidade": "Planta A"},
            "documentacao_e_registros": {
                "documentos_disponiveis": "PIE consolidado e ART vinculada.",
            },
            "conclusao": {"status": "Aprovado", "status_operacional": "liberado"},
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta_servicos = client.get("/cliente/api/bootstrap?surface=servicos")
    assert resposta_servicos.status_code == 200
    corpo = resposta_servicos.json()
    assert "servicos" in corpo
    summary = corpo["servicos"]["summary"]
    itens = corpo["servicos"]["items"]

    assert summary["total_services"] >= 3
    assert summary["attention_services"] >= 1
    assert summary["healthy_services"] >= 1

    item_nr35 = next(item for item in itens if item["service_key"] == "nr35")
    assert item_nr35["label"] == "NR35"
    assert item_nr35["assets_covered"] >= 1
    assert item_nr35["units_covered"] >= 1
    assert item_nr35["documents_ready"] >= 1

    item_spda = next(item for item in itens if item["service_key"] == "spda")
    assert item_spda["label"] == "SPDA"
    assert item_spda["status"] == "attention"
    assert item_spda["open_findings"] >= 1

    item_pie = next(item for item in itens if item["service_key"] == "pie")
    assert item_pie["label"] == "PIE"
    assert item_pie["documents_total"] >= 1


def test_admin_cliente_bootstrap_recorrencia_agrega_vencimentos_e_atrasos_para_wf(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    hoje = date.today()

    with SessionLocal() as banco:
        laudo_proximo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr35_linha_vida",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo_atrasado_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="spda",
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        laudo_planejado_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="nr10_prontuario",
            status_revisao=StatusRevisao.APROVADO.value,
        )

        laudo_proximo = banco.get(Laudo, laudo_proximo_id)
        laudo_atrasado = banco.get(Laudo, laudo_atrasado_id)
        laudo_planejado = banco.get(Laudo, laudo_planejado_id)
        assert laudo_proximo is not None
        assert laudo_atrasado is not None
        assert laudo_planejado is not None

        laudo_proximo.catalog_family_key = "nr35_inspecao_linha_de_vida"
        laudo_proximo.dados_formulario = {
            "informacoes_gerais": {"unidade": "Planta A"},
            "identificacao": {"objeto_principal": "Linha de vida superior"},
            "documentacao_e_registros": {"proxima_inspecao_planejada": (hoje + timedelta(days=10)).isoformat()},
            "conclusao": {"status": "Aprovado", "status_operacional": "liberado"},
        }

        laudo_atrasado.catalog_family_key = "spda_inspecao"
        laudo_atrasado.dados_formulario = {
            "informacoes_gerais": {"unidade": "Planta B"},
            "identificacao": {"objeto_principal": "Malha SPDA 02"},
            "documentacao_e_registros": {"proxima_inspecao_planejada": (hoje - timedelta(days=5)).isoformat()},
            "conclusao": {"status": "Pendente", "status_operacional": "complementar_inspecao"},
        }

        laudo_planejado.catalog_family_key = "nr10_pie_prontuario"
        laudo_planejado.dados_formulario = {
            "informacoes_gerais": {"unidade": "Planta C"},
            "identificacao": {"objeto_principal": "PIE QGBT-01"},
            "documentacao_e_registros": {"proxima_inspecao_planejada": (hoje + timedelta(days=70)).isoformat()},
            "conclusao": {"status": "Aprovado", "status_operacional": "liberado"},
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.get("/cliente/api/bootstrap?surface=recorrencia")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert "recorrencia" in corpo
    summary = corpo["recorrencia"]["summary"]
    itens = corpo["recorrencia"]["items"]

    assert summary["total_events"] >= 3
    assert summary["next_30_days"] >= 1
    assert summary["overdue"] >= 1
    assert summary["scheduled"] >= 1

    item_proximo = next(item for item in itens if int(item["laudo_id"]) == laudo_proximo_id)
    assert item_proximo["status"] == "next_30_days"
    assert item_proximo["status_label"] == "Próximos 30 dias"
    assert item_proximo["plan_label"] == "Plano preventivo"

    item_atrasado = next(item for item in itens if int(item["laudo_id"]) == laudo_atrasado_id)
    assert item_atrasado["status"] == "overdue"
    assert item_atrasado["status_label"] == "Atrasado"

    item_planejado = next(item for item in itens if int(item["laudo_id"]) == laudo_planejado_id)
    assert item_planejado["status"] == "scheduled"
    assert item_planejado["action_label"] == "Programar reinspeção"


def test_admin_cliente_bootstrap_expoe_onboarding_guiado_e_hints_por_superficie(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]

    _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.get("/cliente/api/bootstrap?surface=servicos")
    assert resposta.status_code == 200
    corpo = resposta.json()
    guided = corpo["guided_onboarding"]

    assert guided["progress"]["total"] >= 1
    step_keys = {item["key"] for item in guided["steps"]}
    assert "primeiro_acesso" in step_keys
    assert "primeiro_envio_mesa" in step_keys
    assert guided["next_step"]["key"] in {"primeiro_acesso", "primeiro_laudo", "primeiro_envio_mesa", "documentos", "recorrencia"}
    assert guided["surface_empty_hints"]["servicos"]["action_kind"] == "chat-section"
    assert guided["surface_empty_hints"]["servicos"]["action_target"] == "form-chat-laudo"
    assert "carteira" in guided["surface_empty_hints"]["servicos"]["title"].lower()


def test_admin_cliente_bootstrap_expoe_pacote_contratado_e_observabilidade_executiva(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat_mesa_reviewer_services",
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "operating_model": "standard",
        }
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            tipo_template="spda",
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.nome_arquivo_pdf = "laudo_spda_emitido.pdf"
        banco.add(
            MensagemLaudo(
                laudo_id=laudo_id,
                remetente_id=ids["revisor_a"],
                tipo=TipoMensagem.HUMANO_ENG.value,
                conteudo="Pendência aberta para ajuste documental.",
                lida=False,
                custo_api_reais=Decimal("0.0000"),
            )
        )
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.get("/cliente/api/bootstrap")
    assert resposta.status_code == 200
    corpo = resposta.json()
    pacote = corpo["tenant_commercial_overview"]
    observability = corpo["operational_observability"]

    assert pacote["package_label"] == "Inspeção IA + Revisão Técnica + Emissão"
    assert pacote["mesa_contracted"] is True
    assert pacote["official_issue_included"] is True
    assert pacote["resource_summary"]["separate_mesa_available"] is True
    assert pacote["resource_summary"]["official_issue_allowed"] is True
    assert pacote["resource_summary"]["official_issue_download_allowed"] is True
    assert pacote["resource_summary"]["documents_enabled"] is True
    assert pacote["capability_aliases"]["official_issue_create"] is True
    assert pacote["mobile_chat_first_governance"]["separate_mesa_required"] is True
    recursos = {item["key"]: item for item in pacote["resources"]}
    assert recursos["mesa"]["available"] is True
    assert recursos["official_issue"]["available"] is True
    assert recursos["documents"]["available"] is True
    assert any(item["key"] == "cliente" for item in pacote["available_surfaces"])
    pacote_bootstrap = corpo["tenant_commercial_package"]
    assert pacote_bootstrap["capability_aliases"]["official_issue_create"] is True
    assert pacote_bootstrap["mobile_chat_first_governance"]["official_issue_allowed"] is True
    assert observability["executive_metrics"]["issued"] >= 1
    assert observability["executive_metrics"]["awaiting_mesa"] >= 0
    assert observability["blocking_reason"]
    assert any(item["kind"] in {"mesa", "documento", "recorrencia"} for item in observability["pending_center"])
    assert [item["key"] for item in observability["operational_timeline"]] == [
        "criado",
        "enviado",
        "comentado",
        "devolvido",
        "aprovado",
        "emitido",
        "reaberto",
    ]


def test_admin_cliente_bootstrap_explica_recursos_do_pacote_sem_mesa(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.admin_cliente_policy_json = {
            "commercial_service_package": "inspector_chat",
            "case_visibility_mode": "case_list",
            "case_action_mode": "case_actions",
            "operating_model": "standard",
        }
        banco.commit()

    _login_cliente(client, "cliente@empresa-a.test")

    resposta = client.get("/cliente/api/bootstrap")
    assert resposta.status_code == 200
    corpo = resposta.json()
    pacote = corpo["tenant_commercial_overview"]
    recursos = {item["key"]: item for item in pacote["resources"]}
    resumo = pacote["resource_summary"]

    assert pacote["commercial_service_package"] == "inspector_chat"
    assert resumo["mobile_enabled"] is True
    assert resumo["chat_enabled"] is True
    assert resumo["self_review_allowed"] is True
    assert resumo["separate_mesa_available"] is False
    assert resumo["official_issue_allowed"] is False
    assert resumo["official_issue_download_allowed"] is False
    assert resumo["documents_enabled"] is True
    assert recursos["mobile"]["available"] is True
    assert recursos["chat"]["available"] is True
    assert recursos["self_review"]["available"] is True
    assert recursos["mesa"]["available"] is False
    assert recursos["mesa"]["contractual_blocked"] is True
    assert "não incluída neste pacote" in recursos["mesa"]["detail"].lower()
    assert recursos["official_issue"]["available"] is False
    assert "pdf operacional" in recursos["official_issue"]["detail"].lower()
    assert recursos["documents"]["available"] is True
    assert not any("Revisão Técnica contratada não liberada" in item for item in pacote["pending_configuration"])

    serializado = json.dumps(pacote, ensure_ascii=False).lower()
    for termo_sensivel in ("senha", "csrf", "token", "secret", "package_storage_path", "storage_path"):
        assert termo_sensivel not in serializado

    resposta_documentos = client.get("/cliente/api/bootstrap?surface=documentos")
    assert resposta_documentos.status_code == 200
    assert resposta_documentos.json()["documentos"]["summary"]["total_documents"] >= 0


def test_admin_cliente_exporta_diagnostico_e_registra_suporte(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_diagnostico = client.get("/cliente/api/diagnostico", headers={"X-CSRF-Token": csrf})
    assert resposta_diagnostico.status_code == 200
    assert "attachment; filename=" in resposta_diagnostico.headers["content-disposition"]
    diagnostico = resposta_diagnostico.json()
    assert diagnostico["contract_name"] == "TenantAdminOperationalDiagnosticV1"
    assert int(diagnostico["empresa"]["id"]) == ids["empresa_a"]
    assert diagnostico["contexto_portal"]["support_report_url"] == "/cliente/api/suporte/report"
    assert diagnostico["fronteiras"]["chat_scope"] == "company_scoped"
    assert diagnostico["route_governance"]["contract_name"] == "ClientePortalRouteGovernanceV1"
    assert "surface_availability" in diagnostico["route_governance"]["admin_ceo_contract_scope"]
    assert "case_finalization" in diagnostico["route_governance"]["admin_cliente_operational_scope"]
    assert diagnostico["visibility_policy"]["technical_access_mode"] == "surface_scoped_operational"
    assert diagnostico["visibility_policy"]["audit_scope"] == "tenant_operational_timeline"
    assert diagnostico["operational_package"]["mobile_single_operator_enabled"] is False
    assert diagnostico["operational_package"]["identity_runtime_mode"] == "standard_role_accounts"

    resposta_suporte = client.post(
        "/cliente/api/suporte/report",
        headers={"X-CSRF-Token": csrf},
        json={
            "tipo": "feedback",
            "titulo": "Fila administrativa",
            "mensagem": "Precisamos revisar a trilha operacional do tenant.",
            "email_retorno": "cliente@empresa-a.test",
            "contexto": "fase07",
        },
    )
    assert resposta_suporte.status_code == 200
    corpo = resposta_suporte.json()
    assert corpo["success"] is True
    assert corpo["status"] == "Recebido"
    assert corpo["protocolo"].startswith("CLI-")

    resposta_auditoria = client.get("/cliente/api/auditoria")
    assert resposta_auditoria.status_code == 200
    itens = resposta_auditoria.json()["itens"]
    registro = next(item for item in itens if item["acao"] == "suporte_reportado")
    assert registro["payload"]["protocolo"] == corpo["protocolo"]
    assert registro["payload"]["contexto"] == "fase07"
    assert registro["categoria"] == "support"


def test_admin_cliente_filtra_auditoria_por_superficie_operacional(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_criar = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "padrao"},
    )
    assert resposta_criar.status_code == 200
    laudo_chat_id = int(resposta_criar.json()["laudo_id"])

    resposta_chat = client.post(
        "/cliente/api/chat/mensagem",
        headers={"X-CSRF-Token": csrf},
        json={
            "laudo_id": laudo_chat_id,
            "mensagem": "Mensagem auditada no chat.",
            "historico": [],
            "setor": "geral",
            "modo": "detalhado",
        },
    )
    assert resposta_chat.status_code == 200

    with SessionLocal() as banco:
        laudo_mesa_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )

    resposta_mesa = client.post(
        f"/cliente/api/mesa/laudos/{laudo_mesa_id}/responder",
        headers={"X-CSRF-Token": csrf},
        json={"texto": "Revisão Técnica respondeu pelo portal."},
    )
    assert resposta_mesa.status_code == 200

    auditoria_chat = client.get("/cliente/api/auditoria?scope=chat")
    assert auditoria_chat.status_code == 200
    itens_chat = auditoria_chat.json()["itens"]
    assert itens_chat
    assert all(item["scope"] == "chat" for item in itens_chat)
    assert {"chat_laudo_criado", "chat_mensagem_enviada"} <= {item["acao"] for item in itens_chat}

    auditoria_mesa = client.get("/cliente/api/auditoria?scope=mesa")
    assert auditoria_mesa.status_code == 200
    itens_mesa = auditoria_mesa.json()["itens"]
    assert itens_mesa
    assert all(item["scope"] == "mesa" for item in itens_mesa)
    assert any(item["acao"] == "mesa_resposta_enviada" for item in itens_mesa)


def test_admin_cliente_registra_auditoria_operacional_de_chat_e_mesa(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    resposta_criar = client.post(
        "/cliente/api/chat/laudos",
        headers={"X-CSRF-Token": csrf},
        data={"tipo_template": "padrao"},
    )
    assert resposta_criar.status_code == 200
    laudo_chat_id = int(resposta_criar.json()["laudo_id"])

    resposta_chat = client.post(
        "/cliente/api/chat/mensagem",
        headers={"X-CSRF-Token": csrf},
        json={
            "laudo_id": laudo_chat_id,
            "mensagem": "Fluxo auditado do admin-cliente no chat.",
            "historico": [],
            "setor": "geral",
            "modo": "detalhado",
        },
    )
    assert resposta_chat.status_code == 200

    with SessionLocal() as banco:
        laudo_reaberto_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.REJEITADO.value,
        )
        laudo_mesa_resposta_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )
        laudo_mesa_aprovacao_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.AGUARDANDO.value,
        )

    resposta_reabrir = client.post(
        f"/cliente/api/chat/laudos/{laudo_reaberto_id}/reabrir",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_reabrir.status_code == 200

    resposta_mesa = client.post(
        f"/cliente/api/mesa/laudos/{laudo_mesa_resposta_id}/responder",
        headers={"X-CSRF-Token": csrf},
        json={"texto": "Revisão Técnica respondeu pelo portal do admin-cliente."},
    )
    assert resposta_mesa.status_code == 200

    resposta_avaliar = client.post(
        f"/cliente/api/mesa/laudos/{laudo_mesa_aprovacao_id}/avaliar",
        headers={"X-CSRF-Token": csrf},
        json={"acao": "aprovar", "motivo": ""},
    )
    assert resposta_avaliar.status_code == 200

    resposta_auditoria = client.get("/cliente/api/auditoria")
    assert resposta_auditoria.status_code == 200
    itens = resposta_auditoria.json()["itens"]
    acoes = {item["acao"] for item in itens}
    assert {
        "chat_laudo_criado",
        "chat_mensagem_enviada",
        "chat_laudo_reaberto",
        "mesa_resposta_enviada",
        "mesa_laudo_avaliado",
    }.issubset(acoes)


def test_admin_cliente_reabrir_emitido_pode_ocultar_pdf_da_superficie_ativa(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    csrf = _login_cliente(client, "cliente@empresa-a.test")

    with SessionLocal() as banco:
        laudo_id = _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.APROVADO.value,
        )
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        laudo.primeira_mensagem = "Laudo emitido para entrega."
        laudo.nome_arquivo_pdf = "cliente_emitido.pdf"
        banco.commit()

    resposta = client.post(
        f"/cliente/api/chat/laudos/{laudo_id}/reabrir",
        headers={"X-CSRF-Token": csrf},
        json={"issued_document_policy": "hide_from_case"},
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["issued_document_policy_applied"] == "hide_from_case"
    assert corpo["previous_issued_document_visible_in_case"] is False

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.nome_arquivo_pdf is None


def test_admin_cliente_resumo_empresa_explica_capacidade_e_upgrade_sugerido(ambiente_critico) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    _login_cliente(client, "cliente@empresa-a.test")

    with SessionLocal() as banco:
        _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        _criar_laudo(
            banco,
            empresa_id=ids["empresa_a"],
            usuario_id=ids["inspetor_a"],
            status_revisao=StatusRevisao.RASCUNHO.value,
        )
        empresa = banco.get(Empresa, ids["empresa_a"])
        assert empresa is not None
        empresa.plano_ativo = PlanoEmpresa.INICIAL.value
        banco.commit()

    resposta = client.get("/cliente/api/empresa/resumo")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["plano_ativo"] == "Inicial"
    assert corpo["usuarios_em_uso"] == 3
    assert corpo["usuarios_max"] == 1
    assert corpo["usuarios_restantes"] == 0
    assert corpo["usuarios_excedente"] == 2
    assert corpo["laudos_mes_atual"] == 2
    assert corpo["laudos_mes_limite"] == 50
    assert corpo["laudos_restantes"] == 48
    assert corpo["capacidade_status"] == "critico"
    assert corpo["capacidade_tone"] == "ajustes"
    assert corpo["capacidade_gargalo"] == "usuarios"
    assert corpo["plano_sugerido"] == "Intermediario"
    assert "usuarios" in corpo["plano_sugerido_motivo"].lower()
    assert any(item["plano"] == "Intermediario" and item["sugerido"] is True for item in corpo["planos_catalogo"])
    assert any(item["canal"] == "admin" and "acessos" in item["badge"].lower() for item in corpo["avisos_operacionais"])
    saude = corpo["saude_operacional"]
    assert saude["historico_mensal"]
    assert saude["historico_diario"]
    assert saude["mix_equipe"]["inspetores"] >= 1
    assert saude["usuarios_ativos_total"] >= 1
    assert saude["status"]
    assert saude["tendencia_rotulo"]
