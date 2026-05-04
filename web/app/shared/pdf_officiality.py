"""Marcacoes de oficialidade para PDFs operacionais."""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Any

from fpdf import FPDF
from pypdf import PdfReader, PdfWriter

logger = logging.getLogger(__name__)

NON_OFFICIAL_PDF_NOTICE_TITLE = "DOCUMENTO NAO OFICIAL - RASCUNHO OPERACIONAL"
NON_OFFICIAL_PDF_NOTICE_BODY = (
    "Uso interno/operacional. Nao substitui emissao oficial, assinatura profissional validada "
    "ou pacote oficial Tariel."
)

_MM_PER_POINT = 25.4 / 72


def _pdf_output_bytes(pdf: FPDF) -> bytes:
    raw = pdf.output()
    if isinstance(raw, bytes):
        return raw
    if isinstance(raw, bytearray):
        return bytes(raw)
    return str(raw).encode("latin-1", errors="replace")


def _safe_pdf_text(value: Any) -> str:
    return str(value or "").encode("latin-1", errors="replace").decode("latin-1")


def _notice_overlay_bytes(*, width_pt: float, height_pt: float) -> bytes:
    width_mm = max(float(width_pt) * _MM_PER_POINT, 1.0)
    height_mm = max(float(height_pt) * _MM_PER_POINT, 1.0)
    pdf = FPDF(unit="mm", format=(width_mm, height_mm))
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    pdf.set_draw_color(245, 158, 11)
    pdf.set_fill_color(255, 251, 235)
    pdf.set_text_color(146, 64, 14)
    pdf.set_font("helvetica", "B", 8)
    pdf.set_xy(8, 6)
    texto = _safe_pdf_text(f"{NON_OFFICIAL_PDF_NOTICE_TITLE} | {NON_OFFICIAL_PDF_NOTICE_BODY}")
    pdf.multi_cell(max(width_mm - 16, 10), 5, texto, border=1, align="C", fill=True)
    return _pdf_output_bytes(pdf)


def marcar_pdf_nao_oficial_bytes(conteudo_pdf: bytes, *, logger_context: str = "") -> bytes:
    """Adiciona aviso visual a uma copia de PDF de rascunho operacional.

    Em caso de PDF invalido ou falha de overlay, retorna os bytes originais para
    nao quebrar fluxos existentes de preview/fallback.
    """

    conteudo = bytes(conteudo_pdf or b"")
    if not conteudo:
        return conteudo
    try:
        writer = PdfWriter(clone_from=io.BytesIO(conteudo))
        for page in writer.pages:
            width_pt = float(page.mediabox.width)
            height_pt = float(page.mediabox.height)
            overlay_reader = PdfReader(io.BytesIO(_notice_overlay_bytes(width_pt=width_pt, height_pt=height_pt)))
            page.merge_page(overlay_reader.pages[0])
        writer.add_metadata(
            {
                "/TarielOfficiality": "non_official_operational_draft",
                "/TarielOfficialityNotice": NON_OFFICIAL_PDF_NOTICE_TITLE,
            }
        )
        saida = io.BytesIO()
        writer.write(saida)
        return saida.getvalue()
    except Exception:
        logger.warning(
            "Falha ao marcar PDF como nao oficial | contexto=%s",
            logger_context,
            exc_info=True,
        )
        return conteudo


def marcar_pdf_nao_oficial_arquivo(caminho_pdf: str | Path, *, logger_context: str = "") -> bool:
    caminho = Path(caminho_pdf)
    try:
        original = caminho.read_bytes()
        marcado = marcar_pdf_nao_oficial_bytes(original, logger_context=logger_context)
        if marcado == original:
            return False
        caminho.write_bytes(marcado)
        return True
    except Exception:
        logger.warning(
            "Falha ao marcar arquivo PDF como nao oficial | contexto=%s | caminho=%s",
            logger_context,
            caminho,
            exc_info=True,
        )
        return False


__all__ = [
    "NON_OFFICIAL_PDF_NOTICE_BODY",
    "NON_OFFICIAL_PDF_NOTICE_TITLE",
    "marcar_pdf_nao_oficial_arquivo",
    "marcar_pdf_nao_oficial_bytes",
]
