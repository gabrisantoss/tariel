# Mapa Estrutural Inicial · NR12

Data de consolidacao: `2026-04-22`
Base usada:

- `docs/references_external/nr12/nr12_oficial_mte.pdf`
- `docs/references_external/nr12/manual_aplicacao_nr12_mte.pdf`

## Objetivo

Criar uma leitura operacional curta da `NR12` para preparar:

- coleta de material real da empresa;
- desenho do contrato estrutural da familia;
- futura modelagem de `schema -> report pack -> projection -> PDF`.

## Leitura base da norma oficial

O PDF oficial da `NR12` confirma que a norma cobre um espectro bem mais amplo do que a `NR35`.
Ela nao trata de um unico ativo recorrente, mas de `maquinas e equipamentos` em fases diferentes do ciclo de vida:

- projeto;
- fabricacao;
- importacao;
- comercializacao;
- exposicao;
- utilizacao;
- manutencao;
- inspecao;
- limpeza;
- desativacao e desmonte.

Isso muda o desenho da familia:

- uma familia unica e generica de `NR12` tende a ficar larga demais;
- o produto provavelmente vai precisar de `subfamilias` ou `variantes por classe de equipamento/escopo`.

## Blocos normativos principais observados

Pelo sumario oficial, a norma se organiza em eixos recorrentes:

1. `principios gerais`
2. `arranjo fisico e instalacoes`
3. `instalacoes e dispositivos eletricos`
4. `dispositivos de partida, acionamento e parada`
5. `sistemas de seguranca`
6. `parada de emergencia`
7. `componentes pressurizados`
8. `transportadores de materiais`
9. `aspectos ergonomicos`
10. `riscos adicionais`
11. `manutencao, inspecao, ajuste, reparo e limpeza`
12. `sinalizacao`
13. `manuais`
14. `procedimentos de trabalho e seguranca`
15. `projeto, fabricacao, venda e locacao`
16. `capacitacao`
17. `outros requisitos especificos`
18. `disposicoes finais`
19. `anexos especificos por tipo de maquina`

## Leitura base do manual oficial

O manual baixado e focado em `partes de sistemas de comando relacionadas a seguranca`.
Ele e especialmente util para familias e subfamilias em que a analise passa por:

- intertravamento;
- parada de emergencia;
- prevencao de partida inesperada;
- reset manual;
- muting;
- comando sem retencao;
- categoria;
- performance level;
- validacao do sistema de seguranca;
- documentacao de projeto do sistema.

Ou seja:

- o manual ajuda muito para `estrutura tecnica do laudo`;
- mas nao substitui o recorte operacional do equipamento real da empresa.

## Estrutura recomendada para coleta real

Antes de congelar um contrato de laudo da `NR12`, o material real precisa ser classificado ao menos por:

### 1. Tipo de entrega

- inspecao de maquina/equipamento
- apreciacao de risco
- adequacao / retrofit
- validacao de sistema de seguranca
- analise documental

### 2. Tipo de equipamento

- transportador
- prensa
- injetora
- maquina de panificacao
- equipamento agricola
- sistema robotico
- elevacao / guindar
- maquina rotativa
- outro

### 3. Eixo tecnico dominante

- guarda fisica
- intertravamento
- parada de emergencia
- circuito de seguranca
- ergonomia
- sinalizacao
- documentacao e manual
- procedimento e capacitacao

## Contrato estrutural minimo sugerido

Uma base inicial de contrato para `NR12` precisa acomodar:

- identificacao do equipamento e localizacao;
- tipo de equipamento;
- escopo da avaliacao;
- contexto operacional do uso;
- funcoes de seguranca avaliadas;
- dispositivos presentes ou ausentes;
- nao conformidades por item;
- evidencias fotograficas e documentais;
- conclusao tecnica;
- recomendacoes;
- prioridade/criticidade;
- liberacao ou nao para operacao;
- condicoes para reinspecao ou revalidacao.

## Diferenca pratica para NR35

`NR35` permitiu um contrato muito mais estavel porque os exemplos reais repetem o mesmo eixo documental.

Na `NR12`, o risco principal e este:

- tentar fazer um unico JSON generico para tudo cedo demais.

O caminho mais seguro parece ser:

1. receber material real;
2. agrupar por classe de equipamento e tipo de entrega;
3. escolher a primeira subfamilia mais recorrente;
4. so entao congelar contrato, report pack e template.

## Primeiro recorte recomendado

Quando chegar material real, a melhor pergunta nao e:

- `como modelar a NR12 inteira?`

E sim:

- `qual subfamilia da NR12 aparece mais na operacao da empresa e com menos variacao brutal de layout?`

Exemplos candidatos:

- `nr12_inspecao_maquina_equipamento`
- `nr12_apreciacao_risco`
- `nr12_validacao_sistema_seguranca`

## Conclusao operacional

Com o que foi baixado hoje:

- ja existe base oficial suficiente para leitura normativa e tecnica;
- ja existe base visual publica suficiente para contexto inicial;
- ainda nao existe base real suficiente para congelar o contrato final da familia `NR12` da empresa.

O proximo ganho real depende do material operacional concreto.
