# Revisao Oficial NR - 2026-04-30

## Escopo

Revisao manual acionada apos `scripts/check_nr_official_updates.py` detectar diferencas nas fontes oficiais monitoradas em 2026-04-30.

Prioridade desta rodada:

- NR13, por concentrar o maior numero de familias tecnicas e material operacional;
- diferenciar alteracao normativa real de ruido de pagina `gov.br`;
- nao alterar checklist, template ou payload sem evidencia normativa objetiva.

## Resultado da triagem

O diff inicial apontou 13 URLs HTML alteradas e nenhuma remocao ou adicao de URL. Todas as alteracoes detectadas pelo monitor eram em paginas HTML ou paginas auxiliares, nao em bytes de PDFs ja monitorados.

Para NR13, a pagina oficial vigente do MTE lista como documento textual principal:

- `NR-13 - CALDEIRAS, VASOS DE PRESSAO, TUBULACOES E TANQUES METALICOS DE ARMAZENAMENTO`
- URL: `https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-13-atualizada-2023-b.pdf`

Comparacao local dos PDFs:

- `nr-13-atualizada-2022-retificada.pdf`
  - sha256: `382b6c30179a8e7bb974873ae289f4dc2b1141006b08bc6aece158e8fbc12035`
  - paginas: 35
  - metadata: criacao em 2022-12-08
- `nr-13-atualizada-2023-b.pdf`
  - sha256: `1939ee95fe5bfbaada179aca02dd73d9da9dc5843e7cfdf55e06ef135fd115b0`
  - paginas: 35
  - metadata: criacao em 2025-01-03
- `arquivos/normas-regulamentadoras/nr-13.pdf`
  - sha256: `4ffd600945cebed5279f22056a58d56313af940e587b78c8dd8286dbeee8ca95`
  - paginas: 43
  - metadata: criacao em 2020-04-22

## Diferencas normativas relevantes entre 2022 e 2023-b

O diff textual entre `2022-retificada` e `2023-b` identificou pelo menos estes pontos materiais:

- inclusao da `Portaria MTP nº 4.219, de 20 de dezembro de 2022` na lista de alteracoes;
- ajuste de vigencia para tanques metalicos de armazenamento abrangidos no item 13.2.1(f), com entrada em vigor em `04 de julho de 2026`;
- alteracao editorial/normativa relacionada a `Comissao Interna de Prevencao de Acidentes e de Assedio - CIPA`;
- atualizacoes de redacao e retificacoes em itens de aplicacao, exclusoes, documentacao e requisitos de equipamentos.

Essas diferencas justificam atualizar a fonte oficial primaria das familias NR13. Elas nao justificam, nesta rodada, alterar campos obrigatorios, checklist tecnico ou criterio de conclusao sem uma revisao item-a-item posterior.

## Decisao aplicada

- As familias `nr13_*` passam a apontar para `nr-13-atualizada-2023-b.pdf` como fonte primaria vigente.
- Anchors e `requirement_mapping` existentes foram preservados.
- URLs antigas `nr-13-atualizada-2022-retificada.pdf` e `arquivos/normas-regulamentadoras/nr-13.pdf` deixam de ser usadas como fonte primaria dos schemas NR13.
- O monitor oficial passa a hashear o conteudo principal de paginas HTML quando houver `<main>`, reduzindo falsos positivos causados por menu, rodape e shell global do `gov.br`.
- A baseline oficial deve ser regravada apos a revisao manual para refletir a fonte NR13 vigente e o novo modo de hash HTML.

## Pendencias

- Revisar item-a-item o impacto de `13.2.1(f)` em familias de tanques metalicos, tubulacoes e levantamento in loco antes de promover qualquer novo gate tecnico.
- Avaliar se `nr13_fluxograma_linhas_acessorios` e `nr13_levantamento_in_loco_equipamentos` precisam explicitar tratamento para prazo de vigencia em 2026.
- Fazer triagem equivalente, em rodadas separadas, para NR7, NR9, NR11, NR17, NR18, NR22, NR24, NR15 e NR16.
