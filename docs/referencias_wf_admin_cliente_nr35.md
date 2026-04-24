# WF como cliente do portal `admin-cliente`

Atualizado em `2026-04-23`.

## Premissa comercial correta

A `WF` não compra a plataforma inteira como operadora da Tariel.
A `WF` compra acesso ao sistema como cliente e utiliza principalmente o portal `admin-cliente`.

Isso muda a leitura do produto:

- a WF precisa enxergar seus laudos, documentos, status e vencimentos;
- a WF não precisa necessariamente operar todas as superfícies internas da Tariel;
- o valor do portal está em consolidar a carteira técnica da WF com linguagem operacional aderente.

## Material analisado

Arquivos locais fornecidos pelo usuário:

- `46 - MC-CRMR-0013 CAIXA D'ÁGUA AO LADO TQ DE ÓLEO (Repro)-20260422T183735Z-3-001.zip`
- `28 - WF-MC-714-04-25 LINHA DE VIDA - CAIXA DE EXPEDIÇÃO 01 INTERNA (P)-20260422T183736Z-3-001.zip`
- `01 - MC-CRMRSS-0507 ESC. DE AC. A LAJE DA SALA DOS OPERADORES-20260422T183737Z-3-001.zip`
- `NR35 (TRABALHO EM ALTURA).pdf`
- áudio/transcrição operacional da WF explicando o fluxo de laudo NR35.

## Padrão operacional confirmado

Os pacotes da WF seguem o padrão:

- `Excel editável`
- `fotos`
- `laudo técnico NR35`
- vínculo com `ART`

Campos explícitos encontrados nos workbooks:

- `Nº Laudo Fabricante`
- `Nº Laudo Inspeção`
- `Vinculado à A.R.T. Nº`
- `Tipo de Linha de Vida`
- matriz `C / NC / NA`
- `Conclusão`
- `Próxima Inspeção Periódica`
- `Observações`
- `Registros Fotográficos`

## Semântica operacional da WF para NR35

Os três estados centrais são:

- `Aprovado`
- `Pendente`
- `Reprovado`

Mapeamento observado nos exemplos:

- `Aprovado`: componentes em `C`, uso liberado, observação positiva de conformidade.
- `Pendente`: componentes em `NA` quando a inspeção não pôde ser concluída; exige complemento de inspeção.
- `Reprovado`: presença de `NC` em componentes críticos; normalmente implica bloqueio/correção.

## Expectativa de portal para a WF

No `admin-cliente`, a WF precisa ver por documento:

- status final do laudo;
- status operacional (`liberado`, `bloqueio`, `complementar inspeção`);
- tipo da linha (`vertical`, `horizontal`, `ponto de ancoragem`);
- próxima inspeção;
- vínculo com `ART`;
- fotos/evidências;
- observação final.

## Implicação de produto

Para a WF, a melhor verticalização não é abrir toda a Tariel.
É expor uma leitura executiva consistente no `admin-cliente`, começando por:

1. `Documentos`
2. `Ativos`
3. `Serviços`
4. `Recorrência`

No caso de `NR35`, o portal deve traduzir o laudo em um cartão de decisão operacional, não apenas armazenar PDF/Excel.
