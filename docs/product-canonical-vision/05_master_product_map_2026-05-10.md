# Mapa Mestre do Produto Tariel

Data de referencia: 2026-05-10

## Objetivo deste mapa

Este documento existe para reduzir a confusao do projeto.

Ele deve responder rapidamente:

- o que o Tariel e;
- qual e o caminho principal do produto;
- o que cada perfil precisa fazer;
- o que fica opcional;
- o que nao deve roubar o centro do produto;
- qual ordem de trabalho devemos seguir.

## Definicao simples

Tariel e um app/chat de inspecao tecnica com IA para coletar evidencias, gerar, editar e finalizar documentos de NR com responsabilidade humana.

O centro do produto nao e a Mesa Avaliadora, nao e o Admin, nao e um dashboard e nao e um editor isolado.

O centro do produto e:

1. o inspetor em campo;
2. um caso tecnico;
3. uma conversa com IA;
4. evidencias;
5. geracao e edicao do documento;
6. gate de qualidade;
7. aprovacao humana;
8. PDF/documento final.

## Regra de ouro

Se uma funcionalidade nao melhora o app mobile, o chat de inspecao, a geracao/edicao de NR, a qualidade do caso ou a governanca humana, ela deve esperar.

## Caminho principal

O fluxo principal do Tariel deve ser:

1. Inspetor cria ou abre um caso.
2. Inspetor conversa com a IA.
3. Inspetor envia texto, fotos, anexos e contexto tecnico.
4. IA estrutura entendimento, perguntas, pendencias e rascunho.
5. Inspetor edita, corrige e confirma informacoes.
6. Tariel roda gate de qualidade.
7. Humano aprova, devolve para correcao ou envia para revisao separada quando aplicavel.
8. Tariel gera o PDF/documento final.
9. Cliente acompanha e acessa documentos conforme pacote.

## Hierarquia das superficies

### 1. Mobile Inspetor

Papel: superficie principal de campo.

Deve ter:

- chat com IA;
- criacao e retomada de casos;
- envio de evidencias;
- orientacao de pendencias;
- edicao/confirmacao de dados;
- finalizacao governada;
- fila offline;
- acesso claro ao historico.

Nao deve virar:

- dashboard administrativo;
- painel de revisor;
- central comercial;
- tela cheia de explicacoes.

### 2. Chat Web do Inspetor

Papel: espelho e continuidade do mobile.

Deve ter:

- experiencia parecida com ChatGPT/Gemini, mas focada em inspecao NR;
- conversa como centro visual;
- anexos, evidencias e contexto ao redor do composer;
- geracao e edicao de laudo dentro do fluxo da conversa;
- finalizacao com gate claro;
- acao opcional para Mesa quando contratada ou recomendada.

Nao deve virar:

- outro produto diferente do mobile;
- painel lotado de cards;
- checklist exposto como sistema paralelo;
- tela que explica demais o obvio.

### 3. Cliente / Admin Cliente

Papel: gestao da propria empresa cliente.

Deve ter:

- resumo da operacao;
- casos em andamento;
- documentos entregues;
- equipe e acessos;
- pacote contratado;
- limites e capacidades;
- pontos que exigem acao.

Nao deve virar:

- editor tecnico de template;
- cockpit de IA;
- ferramenta interna da Tariel;
- mesa tecnica disfarcada;
- dashboard com metricas infinitas.

### 4. Admin CEO

Papel: governanca da plataforma Tariel.

Deve ter:

- clientes;
- pacotes;
- capacidades por tenant;
- usuarios e acessos de alto nivel;
- familias/templates liberados;
- regras comerciais;
- risco, suporte excepcional e auditoria.

Nao deve virar:

- operador normal do conteudo tecnico do cliente;
- substituto do Admin Cliente;
- aprovador tecnico automatico.

### 5. Mesa Avaliadora

Papel: revisao tecnica separada opcional.

Deve ter:

- fila de casos enviados;
- leitura de evidencias;
- pendencias;
- devolucao ao inspetor;
- aprovacao/reprovacao;
- apoio a emissao oficial quando o pacote incluir.

Nao deve ser:

- requisito universal para toda NR;
- centro do produto;
- caminho obrigatorio para finalizar caso;
- substituta da aprovacao interna autorizada;
- motivo para o mobile/chat ficarem incompletos.

## O que fica no MVP

### Nucleo obrigatorio

- login e identidade por tenant;
- criacao de caso tecnico;
- chat IA do inspetor;
- coleta de evidencias;
- geracao de rascunho/laudo NR;
- edicao humana;
- gate de qualidade;
- aprovacao humana;
- PDF/documento final;
- historico do caso;
- Admin Cliente simples;
- Admin CEO para pacote, cliente e governanca;
- app mobile como prioridade.

### Opcional por pacote

- Mesa Avaliadora;
- emissao oficial governada;
- signatario governado;
- servicos de revisor;
- multiportal avancado;
- templates/familias premium;
- dashboards mais profundos;
- suporte excepcional.

### Futuro, nao prioridade agora

- analytics avancado;
- billing completo;
- marketplace de templates;
- editor visual complexo para todos;
- automacoes comerciais;
- BI operacional profundo;
- integracoes externas pesadas.

## Matriz por perfil

| Perfil | Pergunta principal | Acoes essenciais | Resultado esperado |
|---|---|---|---|
| Inspetor mobile | O que preciso fazer agora neste caso? | conversar, anexar, corrigir, finalizar | caso tecnico pronto e documentado |
| Inspetor web | Como continuo ou reviso meu caso no chat? | conversar, editar, anexar, finalizar, enviar para Mesa se quiser/puder | mesmo caso do mobile com continuidade |
| Admin Cliente | Como esta minha operacao? | ver casos, documentos, equipe, pacote e pendencias | empresa acompanhando sem operar tecnicamente tudo |
| Revisor/Mesa | O que chegou para revisao? | avaliar evidencias, pedir correcao, aprovar/devolver | revisao separada quando contratada |
| Admin CEO | Como governo a plataforma? | gerir clientes, pacotes, familias, acessos e risco | operacao SaaS controlada |

## Corte de complexidade

Coisas que devem sair do caminho principal:

- Mesa obrigatoria por padrao;
- textos longos explicando cada card;
- duas conversas paralelas para o mesmo caso;
- Admin Cliente tentando ser sistema tecnico completo;
- Chat Web competindo com o Mobile;
- tela de inspetor com cara de dashboard administrativo;
- termos internos visiveis como linguagem principal;
- novas features sem dono, perfil e resultado claro.

## Regra para novas funcionalidades

Antes de criar ou manter uma funcionalidade, responder:

1. Quem usa?
2. Em qual momento?
3. Qual decisao ou acao ela ajuda?
4. Qual artefato ou estado ela produz?
5. Ela pertence ao caminho principal ou e opcional por pacote?

Se nao houver resposta clara, a funcionalidade deve ficar fora do MVP ou escondida em camada secundaria.

## Ordem de execucao recomendada

### Fase 1 - Alinhar produto

Objetivo: parar de expandir e estabilizar a narrativa.

Entregas:

- este mapa mestre;
- matriz de responsabilidades por perfil;
- linguagem canonica: mobile/chat-first, Mesa opcional, gate tecnico obrigatorio;
- lista do que nao deve aparecer no caminho principal.

### Fase 2 - Espelhar mobile no chat web

Objetivo: o chat web do inspetor deve parecer continuidade do app mobile.

Entregas:

- conversa como centro;
- composer forte;
- evidencias e anexos sem poluir a tela;
- finalizacao clara;
- Mesa como acao opcional/recomendada;
- menos texto explicativo.

### Fase 3 - Simplificar Admin Cliente

Objetivo: Admin Cliente deve ser gestao da empresa, nao cockpit tecnico infinito.

Entregas:

- home/resumo mais claro;
- documentos e casos com linguagem curta;
- equipe e pacote visiveis;
- menos blocos concorrendo por atencao.

### Fase 4 - Identidade visual unica

Objetivo: Tariel deve parecer tecnologia operacional premium.

Entregas:

- tokens visuais mais consistentes;
- menos densidade textual;
- telas com mesma linguagem entre mobile, web, cliente e mesa;
- componentes principais mais fortes.

### Fase 5 - Mesa opcional bem posicionada

Objetivo: Mesa ser uma capacidade excelente, nao uma dependencia estrutural.

Entregas:

- rotulos de recomendacao em vez de obrigatoriedade universal;
- fluxo de envio claro;
- fila de revisao limpa;
- retorno ao inspetor simples;
- contrato por pacote/politica.

## Como o Codex deve ajudar daqui para frente

O trabalho deve seguir esta cadencia:

1. escolher uma superficie;
2. ler o fluxo real no codigo;
3. comparar com este mapa;
4. cortar ruido antes de adicionar coisa nova;
5. mudar pouco por vez;
6. validar com teste ou smoke;
7. registrar a decisao.

O Codex nao deve tentar resolver o projeto inteiro em uma resposta. Deve transformar a confusao em sequencias pequenas, com entregas concretas.

## Proximo passo pratico

O proximo trabalho recomendado e fazer uma auditoria curta do `Chat Web do Inspetor` contra o `Mobile Inspetor`:

- o que o mobile faz bem;
- o que o chat web ainda mostra demais;
- quais acoes precisam ficar no composer;
- onde a Mesa aparece como opcional;
- quais textos podem sumir;
- qual primeira tela devemos ajustar.

Essa auditoria deve virar uma lista curta de tarefas implementaveis, nao um documento teorico grande.
