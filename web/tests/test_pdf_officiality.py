from __future__ import annotations

import io

import pypdf
from fpdf import FPDF

from app.shared.pdf_officiality import (
    NON_OFFICIAL_PDF_NOTICE_TITLE,
    marcar_pdf_nao_oficial_bytes,
)


def _pdf_bytes_teste(texto: str = "PDF operacional de teste") -> bytes:
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


def test_marcador_pdf_nao_oficial_aplica_aviso_visual_e_metadata() -> None:
    original = _pdf_bytes_teste()

    marcado = marcar_pdf_nao_oficial_bytes(original, logger_context="teste")

    assert marcado != original
    assert marcado.startswith(b"%PDF")
    leitor = pypdf.PdfReader(io.BytesIO(marcado))
    assert leitor.metadata["/TarielOfficiality"] == "non_official_operational_draft"
    assert leitor.metadata["/TarielOfficialityNotice"] == NON_OFFICIAL_PDF_NOTICE_TITLE
    assert NON_OFFICIAL_PDF_NOTICE_TITLE in _texto_pdf(marcado)


def test_marcador_pdf_nao_oficial_preserva_bytes_quando_pdf_invalido() -> None:
    original = b"%PDF-1.4\n%arquivo incompleto\n"

    assert marcar_pdf_nao_oficial_bytes(original, logger_context="pdf_invalido") == original
