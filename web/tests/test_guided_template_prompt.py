from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.domains.chat.guided_template_prompt import build_guided_template_prompt_context


@pytest.mark.parametrize(
    ("template_key", "expected_focus"),
    [
        ("nr12maquinas", "zonas de risco"),
        ("nr13", "caldeiras"),
        ("nr13_calibracao", "calibracao de valvulas"),
        ("nr13_teste_hidrostatico", "teste hidrostatico"),
        ("nr13_ultrassom", "medicao por ultrassom"),
        ("nr20_instalacoes", "inflamaveis"),
        ("nr33_espaco_confinado", "espaco confinado"),
        ("nr35_linha_vida", "linha de vida"),
        ("nr35_ponto_ancoragem", "ponto de ancoragem"),
        ("pie", "prontuario"),
        ("rti", "instalacoes eletricas"),
        ("spda", "descargas atmosfericas"),
    ],
)
def test_contexto_guiado_ancora_prompt_na_nr_escolhida(
    template_key: str,
    expected_focus: str,
) -> None:
    laudo = SimpleNamespace(
        tipo_template=template_key,
        catalog_family_key=None,
        catalog_family_label=None,
        guided_inspection_draft_json=None,
    )
    prompt = build_guided_template_prompt_context(
        laudo=laudo,
        guided_draft={
            "template_key": template_key,
            "template_label": "Template mobile",
            "checklist": [
                {
                    "id": "etapa_1",
                    "title": "Primeira etapa",
                    "prompt": "colete a evidencia principal",
                    "evidence_hint": "foto, descricao e contexto",
                }
            ],
        },
        guided_context={
            "step_id": "etapa_1",
            "step_title": "Primeira etapa",
            "attachment_kind": "image",
        },
    )

    assert "[foco_template_guiado]" in prompt
    assert template_key in prompt
    assert expected_focus in prompt
    assert "Checklist mobile de referencia" in prompt
    assert "Responda como especialista dessa NR/familia" in prompt
    assert "mesma inspecao, local e empresa" in prompt
    assert "lotes de fotos do mesmo caso como conjunto integrado" in prompt
    assert "imagens-chave para ilustrar o laudo/PDF" in prompt
