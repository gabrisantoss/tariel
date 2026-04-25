# Checklist de Correcoes Urgentes - Cliente WF

Data de abertura: 2026-04-25

Origem: `docs/avaliacao_cliente_wf_tariel_2026-04-25.md`

Objetivo: transformar a avaliacao como cliente WF em uma lista executavel de correcoes, validacoes e melhorias, priorizada pelo que mais afeta venda, demo e piloto pago.

## Regra de Uso

- Marcar `[x]` somente quando houver evidencia objetiva.
- Registrar a evidencia na linha `Evidencia`.
- Se uma tarefa mudar de escopo, criar uma nova linha em vez de apagar historico relevante.
- Antes de vender ou demonstrar para cliente real, todos os itens `P0` precisam estar concluidos ou formalmente aceitos como risco.

Status possiveis:

- `[ ]` pendente
- `[~]` em andamento
- `[x]` concluido
- `[!]` bloqueado

## Resumo Executivo

O urgente nao e adicionar mais texto nem mais tela. O urgente e fazer o produto provar, na primeira experiencia, que ele reduz prazo de laudo com governanca.

Regra de produto definida nesta frente: o chat e a superficie principal. Templates, checklist, aprendizado visual, edicao do laudo, validacoes e ressalvas devem rodar por tras da conversa, sem virar menus, telas tecnicas ou termos internos para o inspetor.

Ordem recomendada:

1. Corrigir bug visivel que quebra confianca em demo.
2. Deixar a entrada do inspetor objetiva e orientada a servicos WF.
3. Resolver a ambiguidade entre `Novo chat`, `Nova inspecao` e `Iniciar laudo`.
4. Fechar uma demo completa de ponta a ponta em uma familia forte.
5. Mostrar gargalos e tempo de ciclo para sustentar a promessa de sair de 10 dias para menos.

## P0 - Bloqueia Demo ou Piloto Pago

### P0.1 Corrigir fluxo do perfil no portal do inspetor

- [x] Ajustar o E2E visual para seguir o fluxo real do card lateral: menu da conta -> `Perfil`.
- [x] Fazer o botão flutuante de perfil abrir `#modal-perfil-chat` diretamente, sem cair no menu lateral.
- [x] Garantir que abrir/fechar perfil funcione no trecho inicial do E2E visual.

Motivo: erro simples em perfil passa inseguranca na demo.

Criterio de aceite:

- `RUN_E2E=1 E2E_VISUAL=0 python -m pytest tests/e2e/test_inspetor_visual_playwright.py -q --browser chromium -s` passa pelo trecho do perfil.

Evidencia:

- 2026-04-25: `RUN_E2E=1 E2E_VISUAL=0 python -m pytest tests/e2e/test_inspetor_visual_playwright.py -q --browser chromium -s` abriu o perfil, salvou `web/.test-artifacts/visual/05-inspetor-modal-perfil.png` e avançou ate o workspace. A suíte ainda falhou depois em `inspection_history`, ponto residual separado do perfil.
- 2026-04-25: `node --check static/js/chat/chat_perfil_usuario.js` passou.
- 2026-04-25: `node --check static/js/shared/ui.js` passou.
- 2026-04-25: falha residual de `inspection_history` corrigida; o mesmo E2E visual passou com `1 passed` e gerou `web/.test-artifacts/visual/04-inspetor-workspace-historico.png`.

### P0.2 Reduzir ambiguidade entre Novo chat, Nova inspecao e Iniciar laudo

- [~] Definir regra clara: quando usar `Nova inspecao`, quando usar `Chat livre`, quando criar laudo a partir do chat.
- [~] Ajustar texto e hierarquia visual para o usuario nao ter duvida de onde comecar.
- [~] Evitar que `Nova inspecao` e `Criar laudo pelo chat` parecam dois caminhos concorrentes para a mesma coisa.

Motivo: se o usuario nao sabe como iniciar, a promessa de produtividade cai no primeiro minuto.

Criterio de aceite:

- Primeira tela deve ter um CTA primario claro.
- Caminho de chat livre deve ficar secundario e explicitamente livre, sem competir com fluxo guiado.
- Teste visual ou screenshot precisa mostrar a nova hierarquia.

Evidencia:

- 2026-04-25: `Novo chat` virou `Chat livre` na sidebar e no portal.
- 2026-04-25: `Iniciar laudo` foi substituido por `Criar laudo pelo chat` no template/runtime.
- 2026-04-25: placeholder do composer passou a pedir ativo, TAG, setor, evidencias ou pendencia tecnica.
- 2026-04-25: `Chat guiado` foi movido para uma faixa discreta abaixo do composer; escolher um template aplica o preprompt no chat em vez de abrir um fluxo separado.
- 2026-04-25: o botao visivel `Ver compat. NR35` saiu das acoes principais do composer; checklist e compatibilidade ficam como contexto interno/gate, nao como mais uma opcao concorrente.
- 2026-04-25: ainda falta decidir se o CTA secundario deve ficar oculto ate haver mensagem no chat livre.

### P0.3 Trocar entrada generica por entrada orientada a servicos WF

- [x] Exibir atalhos comerciais claros: `RTI`, `PIE`, `SPDA`, `LOTO`, `NR12`, `NR13`, `NR20`, `NR33`, `NR35`.
- [x] Cada atalho deve mapear para familia/template real quando liberado no tenant.
- [ ] Quando o servico ainda nao estiver liberado, mostrar estado controlado: indisponivel, em calibracao ou pedir liberacao.
- [x] Evitar termos internos na UI do inspetor: `family`, `variant`, `release`, `runtime`, `governanca`.

Motivo: o cliente compra servico, nao estrutura interna do catalogo.

Criterio de aceite:

- Um usuario WF consegue iniciar pelo nome do servico que vende.
- A tela inicial deixa de parecer apenas um chat vazio.

Evidencia:

- 2026-04-25: os servicos WF passaram a aparecer como `Chat guiado` ao redor do composer: RTI, PIE, SPDA, LOTO, NR12 Maquinas, NR13 Integridade, NR20 Inflamaveis, NR33 Espaco Confinado e NR35 Linha de Vida.
- 2026-04-25: screenshot atualizado em `web/.test-artifacts/visual/00-inspetor-portal-home.png`.
- 2026-04-25: `PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k "perfil or portal or inspetor"` passou com 10 testes.
- 2026-04-25: `PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py -q -k "portal_inspetor_abre_chat_principal"` passou.

### P0.4 Mostrar estado operacional logo na primeira tela

- [x] Exibir `pendencias`, `aguardando mesa`, `prontos para emissao` e `em andamento`.
- [~] Exibir laudos/casos recentes com proxima acao clara.
- [x] Se nao houver casos, o empty state deve conduzir para servicos WF, nao para uma conversa generica.

Motivo: o comprador quer saber onde a operacao esta travada.

Criterio de aceite:

- Screenshot da home mostra prioridades operacionais sem precisar abrir menu lateral.
- Empty state orienta para iniciar servico ou importar/criar primeiro caso.

Evidencia:

- 2026-04-25: `montar_contexto_portal_inspetor` passou a retornar `portal_operational_summary` com `Em andamento`, `Aguardando mesa`, `Pendencias` e `Prontos emissao`.
- 2026-04-25: primeira tela do chat livre passou a mostrar o bloco `Estado operacional`; os atalhos de servico foram reposicionados como `Chat guiado` abaixo do composer.
- 2026-04-25: empty state do portal mudou de conversa generica para `Escolher servico WF` e nova inspecao guiada.
- 2026-04-25: screenshot atualizado em `web/.test-artifacts/visual/01-inspetor-novo-chat.png`.
- Pendente: revisar cards recentes para mostrar uma proxima acao explicita por caso, nao apenas status.

### P0.5 Criar uma demo fechada de ponta a ponta

- [x] Escolher uma familia piloto: recomendado `NR35 linha de vida` ou `NR13 vaso/caldeira`.
- [x] Criar roteiro: iniciar servico, anexar evidencias, preencher dados, enviar para mesa, receber pendencia, corrigir, aprovar, emitir PDF.
- [ ] Registrar evidencias visuais da demo.
- [ ] Garantir que o fluxo funcione sem explicar workaround.

Motivo: sem demo completa, a venda fica baseada em promessa.

Criterio de aceite:

- Roteiro documentado.
- Fluxo reproduzivel localmente.
- Pelo menos um teste, script ou checklist de validacao acompanha a demo.

Evidencia:

- 2026-04-25: familia piloto definida como `NR35 Linha de Vida`.
- 2026-04-25: roteiro documentado em `docs/demo_nr35_linha_de_vida_cliente_wf_2026-04-25.md`.
- Pendente: executar o roteiro completo e anexar evidencias visuais.

### P0.6 Criar checklist de evidencias minimas para uma familia piloto

- [x] Para `NR35 linha de vida` ou `NR13`, listar evidencias obrigatorias.
- [~] Mostrar evidencias faltantes antes da emissao.
- [ ] Vincular fotos/anexos ao bloco correto do laudo.
- [ ] Evitar que placeholder ou anexo sem conteudo conte como evidencia suficiente.

Motivo: acelerar laudo sem controlar evidencia aumenta retrabalho e risco tecnico.

Criterio de aceite:

- O usuario consegue ver o que falta coletar.
- O gate de qualidade bloqueia ou alerta quando faltar evidencia critica.

Evidencia:

- 2026-04-25: checklist minimo documentado em `docs/checklist_evidencias_nr35_linha_de_vida_wf_2026-04-25.md`.
- 2026-04-25: checklist derivado do material real em `docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/checklist_estrutura_real.md` e `manifesto_coleta.json`.
- 2026-04-25: roteiro do gate `nr35_linha_vida` passou a expor identificacao documental, objeto/escopo, componentes C/NC/NA, fotos minimas, slots do report pack e conclusao tecnica.
- 2026-04-25: checklist NR35 deixou de ser uma acao primaria; o roteiro minimo fica disponivel para gate/finalizacao e para o contexto interno que orienta a conversa.
- 2026-04-25: chat passou a aceitar correcao do inspetor sobre foto ja enviada, ex.: "isso e NR35 linha de vida"; a IA reavalia no prompt atual, o rascunho fica restrito ao `empresa_id` do admin-cliente e so vira memoria futura depois de validacao pela governanca do tenant.
- 2026-04-25: correcao visual ficou como comportamento interno do chat: se a imagem nao sustentar a NR indicada, a IA pede justificativa; se o usuario insistir, o caso pode seguir por responsabilidade dele, mas o sinal incompatível nao vira referencia futura.
- 2026-04-25: toda foto enviada ao chat passou a carregar politica interna de qualidade visual; foto borrada, escura, cortada ou sem objeto rastreavel deve virar pendencia de evidencia, nao conclusao categorica.
- 2026-04-25: variacoes reais de foto, angulo e enquadramento podem virar referencia futura apenas depois de cruzar explicacao, foto complementar/outro angulo e validacao do tenant.
- 2026-04-25: instrucao base reforcada: Tariel monta analise e rascunho; validacao tecnica, ART e assinatura final sao humanas. Se o usuario insistir em premissa visual invalida, a IA segue sem discutir, mas registra baixa confianca, premissa declarada e responsabilidade humana.
- 2026-04-25: blindagem anti-poisoning adicionada; insistencia incompatível ganha marcadores internos de risco e bloqueio, preservados na validacao, e nao entra como referencia futura do chat.
- 2026-04-25: pedidos naturais de correcao do laudo no chat, como mudar status/conclusao/observacao, viram correcoes estruturadas internas aplicadas ao rascunho sem expor editor, formulario ou fila de correcoes ao inspetor.
- 2026-04-25: tentativa de finalizacao incompleta deixou de gerar erro generico; a UI volta ao chat, lista o que falta, permite levar as pendencias para o composer e, quando a politica permitir, mostra `Finalizar mesmo assim` com motivo humano.
- Pendente: vincular fotos/anexos diretamente ao bloco correto do laudo e impedir de forma tipada que placeholder/anexo vazio conte como evidencia suficiente.

### P0.7 Provar reducao de prazo com indicadores simples

- [ ] Mostrar tempo por etapa: coleta, mesa, correcao, aprovacao e emissao.
- [ ] Mostrar casos travados e motivo do travamento.
- [ ] Mostrar previsao simples de conclusao ou proxima acao.

Motivo: o cliente quer sair de laudos de 10 dias; o sistema precisa medir onde o tempo esta sendo perdido.

Criterio de aceite:

- Admin Cliente ou portal do inspetor mostra gargalos de ciclo.
- Pelo menos uma tela consegue responder: "por que este laudo ainda nao saiu?"

Evidencia:

- Pendente.

### P0.8 Validar fluxo mobile de campo para uma familia piloto

- [ ] Confirmar captura/envio de foto.
- [ ] Confirmar anexo offline ou fila offline, se aplicavel ao pacote.
- [ ] Confirmar retorno da mesa no app.
- [ ] Confirmar finalizacao/gate no app ou transicao clara para web.

Motivo: para WF, o valor nasce no levantamento em campo.

Criterio de aceite:

- Demo mobile ou teste mobile cobre coleta, anexo, mesa e finalizacao.
- O caminho mobile nao depende de explicacao manual para ser entendido.

Evidencia:

- Pendente.

## P1 - Necessario Para Piloto Comercial Forte

### P1.1 Separar tipos de entrega alem de laudo

- [ ] Modelar entrada para `laudo`, `prontuario`, `plano`, `projeto`, `adequacao`, `treinamento` e `diagnostico`.
- [ ] Ajustar labels de status para nao chamar tudo de laudo quando o caso for outro tipo de entrega.
- [ ] Definir quais tipos entram no piloto e quais ficam bloqueados.

Motivo: a WF nao vende somente laudos.

Criterio de aceite:

- Usuario escolhe tipo de entrega antes de iniciar ou durante a triagem.
- UI nao mistura projeto/adequacao/treinamento com laudo tecnico.

Evidencia:

- Pendente.

### P1.2 Criar triagem NR12 versus NR11

- [ ] Perguntar se o caso e maquina/equipamento, movimentacao, icamento ou armazenagem.
- [ ] Direcionar `zonas de risco`, `dispositivos de seguranca` e `seguranca eletrica da maquina` para NR12.
- [ ] Direcionar movimentacao/icamento/armazenagem para NR11 quando existir fluxo liberado.

Motivo: enquadramento normativo errado e risco tecnico e comercial.

Criterio de aceite:

- Usuario nao precisa saber previamente se o servico e NR11 ou NR12.
- Sistema faz triagem com linguagem simples e registra escolha.

Evidencia:

- Pendente.

### P1.3 Fortalecer subfluxos NR13

- [ ] Separar inspecao inicial, periodica e extraordinaria.
- [ ] Estruturar medicoes de espessura por ultrassom.
- [ ] Registrar valvulas, manometros e certificados de calibracao.
- [ ] Registrar livro de seguranca e testes hidrostaticos/estanqueidade quando aplicavel.

Motivo: NR13 e uma das linhas com maior aderencia comercial imediata.

Criterio de aceite:

- Um caso NR13 nao depende de texto livre para registrar medicoes e certificados importantes.

Evidencia:

- Pendente.

### P1.4 Onboarding do tenant WF para piloto

- [ ] Cadastrar empresa piloto com servicos liberados.
- [ ] Cadastrar usuarios: admin cliente, inspetor, revisor/mesa e signatario.
- [ ] Definir familias liberadas no piloto.
- [ ] Definir Mesa obrigatoria nas primeiras emissoes.
- [ ] Definir limite de emissao, usuarios e armazenamento do piloto.

Motivo: sem tenant configurado, demo e piloto ficam artificiais.

Criterio de aceite:

- Tenant de demo/piloto entra direto nos servicos liberados.
- Permissoes e superficie batem com o pacote comercial escolhido.

Evidencia:

- Pendente.

### P1.5 Amarrar PDF final, pacote congelado e verificacao publica na demo

- [ ] Mostrar numero oficial ou identificador da emissao.
- [ ] Mostrar hash/QR de verificacao publica.
- [ ] Mostrar pacote congelado ou evidenciar que ele existe.
- [ ] Mostrar historico em caso de reemissao.

Motivo: esse e um diferencial forte de confianca e precisa aparecer na venda.

Criterio de aceite:

- Demo consegue abrir o documento final e sua verificacao publica.

Evidencia:

- Pendente.

## P2 - Depois do Piloto Inicial

### P2.1 Organizar bundles comerciais WF

- [ ] Bundle eletrica: RTI, PIE, SPDA, LOTO.
- [ ] Bundle integridade NR13: vasos, caldeiras, tubulacoes, ensaios.
- [ ] Bundle maquinas: NR12 e triagem NR11 quando aplicavel.
- [ ] Bundle espaco confinado: NR33 avaliacao, PET e plano de resgate.
- [ ] Bundle altura: NR35 linha de vida e ponto de ancoragem.

Motivo: facilita venda e configuracao por pacote.

Evidencia:

- Pendente.

### P2.2 Melhorar UX premium do catalogo e preview documental

- [ ] Tornar catalogo mais comercial e menos tecnico.
- [ ] Mostrar preview de documento antes da emissao.
- [ ] Mostrar qualidade/cobertura do template por familia.

Motivo: aumenta confianca em escala, mas nao precisa bloquear o primeiro piloto.

Evidencia:

- Pendente.

### P2.3 Evoluir memoria operacional com material real aprovado

- [ ] Registrar fotos reais aprovadas.
- [ ] Registrar correcoes recorrentes da mesa.
- [ ] Promover memoria por familia com curadoria.
- [ ] Evitar autoaprendizado sem aprovacao humana.

Motivo: transforma piloto em vantagem cumulativa.

Evidencia:

- Pendente.

## Primeiro Corte Recomendado

Para comecar sem abrir frente grande demais:

1. `P0.1` corrigir modal de perfil.
2. `P0.2` resolver hierarquia de entrada.
3. `P0.3` criar atalhos de servico WF na home.
4. `P0.5` montar demo `NR35 linha de vida`.
5. `P0.6` checklist de evidencias minimas da familia demo.

Esse corte ja melhora a sensacao de produto, reduz risco de demo e cria base para vender piloto com menos explicacao.

## Historico de Atualizacoes

- 2026-04-25: checklist criado a partir da avaliacao como cliente WF.
- 2026-04-25: P0.1 concluido; P0.2 e P0.3 iniciados com ajustes de perfil, linguagem de entrada e atalhos WF no inspetor.
- 2026-04-25: P0.4 parcialmente fechado com resumo operacional na entrada; P0.5 e P0.6 documentados para demo NR35 linha de vida.
- 2026-04-25: E2E visual do inspetor voltou a passar no historico; checklist NR35 foi exposto no gate e no bloco de compatibilidade existente.
