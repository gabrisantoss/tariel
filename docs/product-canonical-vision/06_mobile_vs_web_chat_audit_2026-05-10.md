# Auditoria Mobile vs Chat Web - 2026-05-10

## Objetivo

Transformar o app Android em referencia pratica para recentralizar o Chat Web do Inspetor.

Esta auditoria nao abre uma frente nova de produto. Ela identifica o que o mobile ja resolveu bem e quais ajustes pequenos no web deixam o Tariel mais proximo de um chat de IA profissional, com geracao e edicao de laudos NR, sem transformar a Mesa Avaliadora em caminho obrigatorio.

## Conclusao executiva

O app mobile ja esta mais proximo do produto desejado: uma conversa central com IA, anexos, revisao opcional e finalizacao contextual.

O Chat Web tem os elementos certos, mas eles estao competindo entre si. O web ainda parece misturar chat, painel operacional, checklist, historico, anexos, preview, ferramentas e finalizacao no mesmo campo visual.

A correcao principal nao e adicionar mais recursos. E mudar a hierarquia:

1. `Chat` deve ser o centro.
2. `Revisao` deve ser uma camada opcional ou recomendada.
3. `Finalizar` deve virar modo proprio, nao uma colecao de botoes espalhados.
4. `Historico`, `Anexos`, `Correcoes`, preview e helpers devem apoiar o caso, nao disputar a navegacao principal.

## Arquivos observados

- `android/src/features/InspectorAuthenticatedLayout.tsx`
- `android/src/features/chat/ThreadHeaderControls.tsx`
- `android/src/features/chat/ThreadConversationPane.tsx`
- `android/src/features/chat/ThreadComposerPanel.tsx`
- `android/src/features/chat/ThreadFinalizationCard.tsx`
- `android/src/features/chat/buildThreadContextState.ts`
- `android/src/features/chat/types.ts`
- `web/templates/inspetor/_workspace.html`
- `web/templates/inspetor/workspace/_assistant_landing.html`
- `web/templates/inspetor/workspace/_inspection_conversation.html`
- `web/templates/inspetor/workspace/_workspace_header.html`
- `web/templates/inspetor/workspace/_workspace_toolbar.html`
- `web/static/js/chat/chat_index_page.js`
- `web/static/js/inspetor/workspace_context_flow.js`
- `web/static/js/inspetor/workspace_mesa_status.js`

## O que o mobile acertou

- O mobile trabalha com tres modos mentais simples: `Chat`, `Revisao` e `Finalizar`.
- O composer e a acao principal da tela, com anexo, foto, audio e envio perto da digitacao.
- A revisao aparece como superficie propria quando faz sentido, sem dominar todo o fluxo.
- A finalizacao aparece como contexto proprio, com proxima acao, pendencias e documento/auditoria.
- A conversa nao tenta explicar demais o produto em cada bloco.
- A coleta de evidencia fica natural: texto, imagem, conjunto de imagens, documento e fila offline.
- O estado do caso entra como contexto, nao como painel administrativo permanente.
- O app suporta operacao robusta sem parecer um backoffice.

## Onde o Chat Web se afastou

- A toolbar principal do web usa `Chat`, `Historico`, `Anexos` e `Correcoes`, enquanto o mobile organiza a experiencia por `Chat`, `Revisao` e `Finalizar`.
- O header do web concentra muitas responsabilidades: status, etapa, evidencias, pendencias, verificacao publica, emissao, preview, finalizacao, ferramentas e rails.
- O composer do web tem boa base, mas ainda carrega helpers persistentes como escolha guiada de NR, primeira mensagem, sugestoes e preview no mesmo espaco da conversa.
- `Finalizar` aparece como acao de cabecalho, nao como modo claro de trabalho.
- `Ver previa` aparece em mais de um ponto e disputa com a acao real de finalizar.
- `Mesa`, `Correcoes`, `Historico` e `Anexos` aparecem como areas primarias demais para uma experiencia que deveria ser chat-first.
- A landing e o empty state ainda explicam mais do que precisam para um usuario recorrente.

## Modelo alvo para o Chat Web

O Chat Web deve espelhar a logica do mobile, nao necessariamente o layout pixel a pixel.

### Navegacao primaria

Use apenas os modos que representam decisoes reais do inspetor:

- `Chat`: conversa com IA, coleta de evidencia, geracao e edicao do rascunho.
- `Revisao`: Mesa Avaliadora ou revisao interna, quando contratada, recomendada ou acionada.
- `Finalizar`: gate de qualidade, preview, pendencias, aprovacao humana e documento final.

### Navegacao secundaria

Deve sair do trilho principal e ficar como apoio contextual:

- `Historico`
- `Anexos`
- `Correcoes`
- `Ferramentas`
- `Verificacao publica`
- `Emissao oficial`
- `Preview`

Essas funcoes sao importantes, mas nao devem definir a identidade da tela.

## Sequencia recomendada de implementacao

### Corte 1 - Navegacao do web igual ao modelo mental do mobile

Trocar a barra primaria do Chat Web para:

- `Chat`
- `Revisao`
- `Finalizar`

Mover `Historico`, `Anexos` e `Correcoes` para uma area secundaria, como rail direito, menu `Ferramentas` ou painel contextual.

Este corte deve ser feito primeiro porque muda a leitura do produto sem alterar regra de negocio.

### Corte 2 - Composer mais limpo e mais parecido com chat de IA

Manter visivel:

- campo de mensagem;
- anexar;
- foto;
- audio;
- enviar;
- um seletor compacto de modo/NR quando necessario.

Colapsar ou tornar sob demanda:

- `Boa primeira mensagem`;
- lista longa de NR/modelos;
- sugestoes persistentes;
- preview dentro do bloco do composer.

A regra pratica: se o usuario ja sabe o que quer escrever, nada deve empurrar manual de uso para cima dele.

### Corte 3 - Finalizar como modo proprio

Criar uma experiencia web equivalente ao `ThreadFinalizationCard` do mobile.

Ela deve conter:

- proxima acao;
- status e pendencias;
- documento e auditoria;
- acao principal unica;
- acoes secundarias discretas.

Depois deste corte, `Finalizar` deixa de ser botao solto no header e vira uma etapa clara do caso.

### Corte 4 - Header mais silencioso

O header do Chat Web deve ficar mais perto de um cockpit simples:

- nome do produto/caso;
- status curto;
- acao de novo caso;
- acesso secundario a ferramentas.

Mover para contexto especifico:

- readiness completo;
- verificacao publica;
- emissao oficial;
- indicadores detalhados de evidencias;
- pendencias longas.

### Corte 5 - Revisao opcional sem dominar a tela

`Revisao` deve respeitar o pacote do tenant:

- se nao houver Mesa, mostrar revisao interna ou estado indisponivel sem vender erro;
- se houver Mesa, permitir acionar e acompanhar;
- se a familia recomendar Mesa, exibir recomendacao sem bloquear por padrao;
- se a politica exigir Mesa, ai sim travar a finalizacao conforme contrato.

Esta decisao preserva a Mesa como ferramenta premium forte, mas devolve o protagonismo ao app/chat.

## Regra de produto para evitar regressao

Toda mudanca futura no Chat Web deve passar por esta pergunta:

> Isto deixa o inspetor mais perto de conversar, anexar, revisar e finalizar o caso, ou esta transformando o chat em um painel administrativo?

Se a resposta for painel, a funcao deve ir para contexto secundario.

## Ordem pratica dos proximos PRs

1. `WEB-CHAT-MOBILE-MIRROR-01`: trocar navegacao primaria do workspace para `Chat`, `Revisao`, `Finalizar`, sem mexer em backend.
2. `WEB-CHAT-MOBILE-MIRROR-02`: limpar composer e mover helpers para estado colapsado/sob demanda.
3. `WEB-CHAT-MOBILE-MIRROR-03`: criar modo `Finalizar` inspirado no mobile e reduzir botoes soltos no header.
4. `WEB-CHAT-MOBILE-MIRROR-04`: fazer dieta do header e mover readiness/emissao/preview para contexto de finalizacao.
5. `WEB-CHAT-MOBILE-MIRROR-05`: revisar estado visual da Mesa como opcional/recomendada/exigida por politica.

## Decisao recomendada

Comecar pelo `WEB-CHAT-MOBILE-MIRROR-01`.

Ele e o menor corte com maior impacto de clareza: nao muda contrato, nao muda permissao, nao muda banco, mas faz o web finalmente falar a mesma lingua mental do mobile.
