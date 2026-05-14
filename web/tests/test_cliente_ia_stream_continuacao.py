import json
from types import SimpleNamespace

from nucleo.cliente_ia import ClienteIA


class _FakeChunk:
    def __init__(
        self,
        text: str,
        *,
        finish_reason: str | None = None,
        prompt_tokens: int = 0,
        output_tokens: int = 0,
    ) -> None:
        self.text = text
        self.usage_metadata = SimpleNamespace(
            prompt_token_count=prompt_tokens,
            candidates_token_count=output_tokens,
        )
        self.candidates = []
        if finish_reason:
            self.candidates.append(SimpleNamespace(finish_reason=finish_reason))


class _FakeModels:
    def __init__(self, streams: list[list[_FakeChunk]]) -> None:
        self.streams = streams
        self.calls: list[dict] = []

    def generate_content_stream(self, **kwargs):
        self.calls.append(kwargs)
        index = len(self.calls) - 1
        return iter(self.streams[index])


def _build_cliente(streams: list[list[_FakeChunk]]) -> tuple[ClienteIA, _FakeModels]:
    models = _FakeModels(streams)
    cliente = ClienteIA.__new__(ClienteIA)
    cliente.cliente = SimpleNamespace(models=models)
    cliente.motor_visao = None
    cliente._ocr_disponivel = False
    return cliente, models


def _partes_visiveis(chunks: list[str]) -> str:
    return "".join(chunk for chunk in chunks if not chunk.startswith("__METADATA__:"))


def _metadata(chunks: list[str]) -> dict:
    raw = next(chunk for chunk in chunks if chunk.startswith("__METADATA__:"))
    return json.loads(raw.removeprefix("__METADATA__:"))


def test_stream_continua_automaticamente_quando_gemini_corta_por_limite() -> None:
    cliente, models = _build_cliente(
        [
            [
                _FakeChunk(
                    "Parte 1 interrompida em NR",
                    finish_reason="MAX_TOKENS",
                    prompt_tokens=100,
                    output_tokens=8192,
                )
            ],
            [
                _FakeChunk(
                    "-12 finalizada.",
                    finish_reason="STOP",
                    prompt_tokens=30,
                    output_tokens=18,
                )
            ],
        ]
    )

    chunks = list(
        cliente.gerar_resposta_stream(
            "Analise as fotos da protecao de maquina.",
            setor="nr12",
            modo="detalhado",
        )
    )

    assert _partes_visiveis(chunks) == "Parte 1 interrompida em NR-12 finalizada."
    assert len(models.calls) == 2
    assert _metadata(chunks)["auto_continuations"] == 1
    assert _metadata(chunks)["partial_by_output_limit"] is False


def test_stream_avisa_quando_continuacao_tambem_bate_limite() -> None:
    cliente, models = _build_cliente(
        [
            [_FakeChunk("Parte inicial ", finish_reason="MAX_TOKENS")],
            [_FakeChunk("continuacao parcial", finish_reason="MAX_TOKENS")],
        ]
    )

    chunks = list(
        cliente.gerar_resposta_stream(
            "Analise um pacote extenso de evidencias.",
            setor="nr12",
            modo="detalhado",
        )
    )

    texto = _partes_visiveis(chunks)
    assert "Parte inicial continuacao parcial" in texto
    assert "Resposta parcial" in texto
    assert len(models.calls) == 2
    assert _metadata(chunks)["partial_by_output_limit"] is True
