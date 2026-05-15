from __future__ import annotations

from nucleo.cliente_ia import ClienteIA
from tests.regras_rotas_criticas_support import _imagem_png_data_uri_teste


def test_cliente_ia_monta_pacote_visual_ordenado_e_compacto() -> None:
    cliente = ClienteIA.__new__(ClienteIA)
    cliente._ocr_disponivel = False
    cliente.motor_visao = None

    partes = cliente._montar_partes_usuario(
        "faça um laudo livre",
        "geral",
        dados_imagens=[_imagem_png_data_uri_teste()] * 12,
    )

    textos = [str(getattr(parte, "text", "") or "") for parte in partes]
    imagens = [parte for parte in partes if getattr(parte, "inline_data", None)]

    assert len(imagens) == 10
    assert any("[Pacote visual ordenado: 10 fotos]" in texto for texto in textos)
    assert any("nao gere laudo longo" in texto for texto in textos)
    assert any("no maximo 5 achados tecnicos" in texto for texto in textos)
    assert "[Foto 1 de 10]" in textos
    assert "[Foto 10 de 10]" in textos
    assert "[Foto 11 de 10]" not in textos


def test_cliente_ia_monta_pacote_visual_guiado_como_mesma_inspecao() -> None:
    cliente = ClienteIA.__new__(ClienteIA)
    cliente._ocr_disponivel = False
    cliente.motor_visao = None

    partes = cliente._montar_partes_usuario(
        (
            "[foco_template_guiado]\n"
            "Esta conversa veio de uma inspecao guiada.\n"
            "[/foco_template_guiado]\n\n"
            "Analise o lote de fotos."
        ),
        "geral",
        dados_imagens=[_imagem_png_data_uri_teste()] * 10,
    )

    textos = [str(getattr(parte, "text", "") or "") for parte in partes]
    imagens = [parte for parte in partes if getattr(parte, "inline_data", None)]

    assert len(imagens) == 10
    assert any("[Pacote visual ordenado: 10 fotos]" in texto for texto in textos)
    assert any("mesma inspecao, ao mesmo local e a mesma empresa" in texto for texto in textos)
    assert any("vistoria unica e integrada" in texto for texto in textos)
    assert not any("no maximo 5 achados tecnicos" in texto for texto in textos)
    assert "[Foto 1 de 10]" in textos
    assert "[Foto 10 de 10]" in textos


def test_cliente_ia_mantem_foto_unica_sem_triagem_multifoto() -> None:
    cliente = ClienteIA.__new__(ClienteIA)
    cliente._ocr_disponivel = False
    cliente.motor_visao = None

    partes = cliente._montar_partes_usuario(
        "analise a foto",
        "geral",
        dados_imagem=_imagem_png_data_uri_teste(),
    )

    textos = [str(getattr(parte, "text", "") or "") for parte in partes]
    imagens = [parte for parte in partes if getattr(parte, "inline_data", None)]

    assert len(imagens) == 1
    assert not any("Pacote visual ordenado" in texto for texto in textos)
