# NR35 Reference PDF QA

Data: 2026-04-28

## Escopo

Esta rodada fecha um PDF NR35 realista de referencia para demonstracao e QA visual controlado da familia `nr35_inspecao_linha_de_vida`.

O ajuste nao altera regra de negocio, backend, endpoints, emissao oficial, NR35 validator, release gate, Android, mobile smoke, Maestro ou `human_ack`.

## Artefato Versionado

- `docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/pacote_referencia/pdf/nr35_inspecao_linha_de_vida_referencia_sintetica.pdf`

O PDF materializa o arquivo ja referenciado em `tariel_filled_reference_bundle.json` e preserva os PNGs originais do pacote como fonte de referencia.

## Conteudo Validado

- Capa com status final de bloqueio operacional.
- Resumo executivo e escopo tecnico.
- Quatro fotos obrigatorias do contrato NR35:
  - visao geral da linha de vida;
  - ponto superior;
  - ponto inferior;
  - detalhe critico tecnico.
- Checklist tecnico dos componentes.
- Achado principal vinculado a corrosao inicial no cabo de aco.
- Conclusao em bloqueio ate correcao e reinspecao.
- Governanca da Mesa.
- Assinatura/responsabilidade tecnica.
- Auditoria com cadeia `foto -> achado -> campo JSON -> secao PDF -> decisao Mesa -> emissao oficial`.
- Hash do pacote de referencia.

## Evidencias Locais

- QA documental: `artifacts/document_pdf_qa/20260428_124754/`
- Imagens das paginas: `artifacts/nr35_reference_pdf_qa/current/pages/`
- Texto extraido: `artifacts/nr35_reference_pdf_qa/current/extracted_text.txt`
- Assets otimizados temporarios usados na renderizacao: `artifacts/nr35_reference_pdf_qa/current/optimized_assets/`

Os artefatos locais acima nao foram versionados.

## Resultado Tecnico

- `pdfinfo`: ok
- `qpdf --check`: ok
- `pdftotext`: ok
- paginas: 5
- tamanho: 353643 bytes
- PDF SHA-256: `d554de69f58212e2118e0b1313d0b5b03a5f07a7db7df3ac0aab233e28fd5c71`
- pacote de referencia SHA-256 exibido no PDF: `e7e7bd0661596d4328789bf8c7b53d2efc77531adcada380c293ed31e5f9c4f2`

## Validacao Executada

- `python scripts/run_document_pdf_qa.py --profile quick --pdf docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/pacote_referencia/pdf/nr35_inspecao_linha_de_vida_referencia_sintetica.pdf`
- `pdfinfo docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/pacote_referencia/pdf/nr35_inspecao_linha_de_vida_referencia_sintetica.pdf`
- `qpdf --check docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/pacote_referencia/pdf/nr35_inspecao_linha_de_vida_referencia_sintetica.pdf`
- `pdftoppm -png -r 120 docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/pacote_referencia/pdf/nr35_inspecao_linha_de_vida_referencia_sintetica.pdf artifacts/nr35_reference_pdf_qa/current/pages/page`

## Observacoes

- Este PDF e uma referencia sintetica para QA visual e demonstracao controlada, nao uma emissao tecnica real.
- O PDF usa imagens compactadas no artefato final para evitar duplicar os PNGs originais em tamanho integral dentro do PDF.
- A entrega oficial de produto continua dependendo do fluxo governado: caso, Mesa, snapshot aprovado, signatario, emissao oficial, pacote oficial e auditoria.
