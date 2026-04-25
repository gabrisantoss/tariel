from __future__ import annotations

from types import SimpleNamespace

from app.domains.chat.report_template_compatibility import (
    analisar_compatibilidade_template_laudo,
)


def test_laudo_livre_sem_fotos_nao_migra_para_nr35() -> None:
    laudo = SimpleNamespace(
        tipo_template="padrao",
        parecer_ia="Linha de vida em avaliação.",
        status_conformidade="pendente",
        mensagens=[SimpleNamespace(conteudo="Linha em caixa de expedição.")],
        report_pack_draft_json={"analysis_basis": {"photo_evidence": []}},
    )

    payload = analisar_compatibilidade_template_laudo(laudo, target_template="nr35_linha_vida")

    assert payload["compatible"] is False
    assert payload["can_migrate"] is False
    assert payload["target_template"] == "nr35_linha_vida"
    assert {
        item["code"]
        for item in payload["missing_evidence"]
        if item["severity"] == "required"
    } == {"nr35_photo_pair_missing"}
    checklist_ids = {item["id"] for item in payload["required_checklist"]}
    assert "nr35_fotos_minimas" in checklist_ids
    assert "nr35_componentes_c_nc_na" in checklist_ids


def test_laudo_livre_com_contexto_e_duas_fotos_pode_migrar_para_nr35() -> None:
    laudo = SimpleNamespace(
        tipo_template="padrao",
        parecer_ia="Linha aprovada, acessórios conformes e segura para uso.",
        status_conformidade="aprovado",
        mensagens=[SimpleNamespace(conteudo="Linha horizontal com início e fim registrados.")],
        report_pack_draft_json={
            "analysis_basis": {
                "photo_evidence": [
                    {"key": "inicio", "caption": "Início da linha"},
                    {"key": "fim", "caption": "Fim da linha"},
                ]
            }
        },
    )

    payload = analisar_compatibilidade_template_laudo(laudo, target_template="nr35_linha_vida")

    assert payload["compatible"] is True
    assert payload["can_migrate"] is True
    assert payload["evidence_summary"]["photo_items"] == 2
    assert payload["score"] >= 90


def test_mensagem_off_record_nao_conta_como_contexto_de_migracao() -> None:
    laudo = SimpleNamespace(
        tipo_template="padrao",
        parecer_ia="",
        status_conformidade="pendente",
        mensagens=[
            SimpleNamespace(
                conteudo="Essa dúvida é fora do laudo.",
                metadata_json={"report_context": {"included": False}},
            )
        ],
        report_pack_draft_json={
            "analysis_basis": {
                "photo_evidence": [
                    {"key": "inicio", "caption": "Início da linha"},
                    {"key": "fim", "caption": "Fim da linha"},
                ]
            }
        },
    )

    payload = analisar_compatibilidade_template_laudo(laudo, target_template="nr35_linha_vida")

    assert payload["compatible"] is False
    assert payload["evidence_summary"]["text_items"] == 0
    assert {
        item["code"]
        for item in payload["missing_evidence"]
        if item["severity"] == "required"
    } == {"context_text_missing"}
