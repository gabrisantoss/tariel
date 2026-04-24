# Backlog de Execucao - Inspetor, Backend e UX

Data de referencia: `2026-04-24`
Base: `docs/STATUS_CANONICO.md`, `PLANS.md`, `PROJECT_MAP.md`, `docs/restructuring-roadmap/135_backlog_executivo_pos_analise_ampla.md`, `docs/restructuring-roadmap/136_plano_tecnico_inspetor_mesa_flagship.md`, `docs/restructuring-roadmap/133_inspetor_correcoes_sem_mesa.md`, `web/docs/correcao_sem_mesa.md`, `web/docs/frontend_mapa.md`, `web/app/ARCHITECTURE.md`, `web/app/domains/chat/ARCHITECTURE.md`

## Objetivo

Transformar a leitura ampla do projeto em backlog curto, executavel e sequenciado para a proxima rodada estrutural.

Este documento responde:

- o que fazer primeiro;
- o que depende do que;
- quais arquivos abrem cada lote;
- o que precisa passar para considerar cada etapa pronta.

## Leitura curta

O projeto esta funcional e com baseline forte.

O principal risco agora nao e ausencia de feature.
O principal risco e custo de evolucao:

- o `inspetor` ainda recompõe estado demais a partir de `SSR`, `dataset`, `storage`, compat layers e memoria;
- a jornada principal do usuario ainda expoe mais modos e acoes do que deveria;
- o backend ainda mistura `async def` com `Session` sincronica e commit implicito por request;
- parte do gate de qualidade ainda opera por heuristica textual em vez de contrato tipado de evidencia;
- os hotspots grandes ja nao sao so um problema estetico; eles viraram custo operacional para qualquer nova mudanca.

## Ordem obrigatoria

1. consolidar o estado canonico do `inspetor`
2. simplificar a jornada principal do `inspetor`
3. corrigir a fronteira transacional do backend
4. tipar evidencia e endurecer o gate de qualidade
5. continuar drenando hotspots grandes do backend
6. reduzir `innerHTML` e rendering manual restante
7. so entao otimizar performance e observabilidade fina

## Regra de execucao

- nao redesenhar o `inspetor` antes de fechar a autoridade de estado;
- nao mexer em `UX` principal sem antes decidir de onde o estado manda;
- nao espalhar nova regra de evidencia antes do contrato tipado existir;
- nao abrir refatoracao ampla de hotspot sem fronteira transacional minimamente estavel;
- usar os documentos acima para resolver comportamento esperado;
- perguntar ao usuario apenas quando a documentacao viva entrar em conflito ou ficar insuficiente para decidir.

## Fase 1 - Fechar o Inspetor

### Lote 1.1 - Estado canonico do inspetor

- `impacto`: critico
- `dificuldade`: alta
- `risco`: alto

### Problema

Hoje o runtime do `inspetor` ainda reconcilia estado vindo de varios lugares:

- `#tariel-boot`
- `data-*` do SSR
- `sessionStorage`
- `window.TarielChatPainel`
- `window.TarielAPI`
- memoria JS atual

Isso aparece diretamente em:

- `web/static/js/inspetor/state_snapshots.js`
- `web/static/js/inspetor/state_authority.js`
- `web/static/js/inspetor/state_runtime_sync.js`
- `web/static/js/chat/chat_index_page.js`

### Resultado esperado

- um store autoritativo do `inspetor` decide `laudoAtualId`, `estadoRelatorio`, `modoInspecaoUI`, `workspaceStage`, `threadTab`, `overlayOwner`, `inspectorScreen` e flags derivadas;
- `DOM`, `storage` e compat layers passam a ser espelhos ou fontes de bootstrap, nao autoridade continua;
- `chat_index_page.js` para de descobrir estado por conta propria em multiplos pontos.

### Arquivos a abrir primeiro

- `web/static/js/chat/chat_index_page.js`
- `web/static/js/inspetor/state_snapshots.js`
- `web/static/js/inspetor/state_authority.js`
- `web/static/js/inspetor/state_runtime_sync.js`
- `web/static/js/inspetor/workspace_runtime_state.js`
- `web/templates/inspetor/base.html`
- `web/templates/inspetor/_portal_main.html`
- `web/templates/inspetor/_workspace.html`

### Passos

1. congelar o shape minimo do snapshot autoritativo do `inspetor`
2. reduzir `state_authority.js` a bootstrap + merge inicial + derivacao final
3. fazer `chat_index_page.js` consumir snapshot e acoes do store, nao `dataset`/`storage` diretamente
4. deixar `sessionStorage` e `data-*` apenas como persistencia e espelho
5. endurecer testes focais do boot, `home`, `sidebar`, `?laudo=`, `?home=1` e retomada

### Criterio de pronto

- reload, `back/forward`, `?laudo=`, `?home=1` e troca de caso produzem o mesmo estado sem depender da ordem de script;
- `chat_index_page.js` perde mais um bloco grande de reconciliacao dispersa;
- `URL` e `storage` nao sequestram mais o caso ativo depois do bootstrap.

### Checkpoint local - 2026-04-24

- `status`: fechado localmente
- `entrega`: criado `criarBindingsEstadoInspector` em `web/static/js/inspetor/workspace_runtime_state.js`, centralizando os bindings de URL, snapshot, autoridade, espelhamento em `dataset`/`storage`, aplicação de snapshot e retomada de home
- `entrega`: `web/static/js/chat/chat_index_page.js` passou a consumir esse pacote autoritativo em vez de manter localmente o bloco grande de reconciliacao do estado do inspetor
- `entrega`: `web/app/domains/chat/session_helpers.py` agora marca `/app/` sem query como home SSR ativa depois de limpar o contexto ativo, mantendo separados os contratos de `/app/?home=1`, `/app/?laudo=...` e query invalida
- `teste`: `node --check web/static/js/inspetor/workspace_runtime_state.js`
- `teste`: `node --check web/static/js/chat/chat_index_page.js`
- `teste`: `python -m py_compile web/app/domains/chat/session_helpers.py`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_inspector_active_report_authority.py tests/test_app_boot_query_reduction.py -q`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k 'templates_chat_mantem_controles_essenciais_de_ui or workspace'`
- `teste`: `git diff --check`
- `teste`: `make verify`
- `teste`: `make hygiene-check`
- `proximo`: `Lote 1.2` executado no checkpoint seguinte; proxima frente estrutural e a `Fase 2`

### Validacao minima

```bash
node --check web/static/js/chat/chat_index_page.js
node --check web/static/js/inspetor/state_snapshots.js
node --check web/static/js/inspetor/state_authority.js
node --check web/static/js/inspetor/state_runtime_sync.js
cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k "home or perfil or modo_foco"
cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k "home_app_nao_desloga_inspetor or home_desativa_contexto_sem_excluir_laudo or home_nao_exibe_rascunho_sem_interacao_na_sidebar"
```

### Lote 1.2 - Simplificar a jornada principal do inspetor

- `impacto`: critico
- `dificuldade`: media
- `risco`: medio

### Problema

O primeiro passo do `inspetor` ainda expoe acoes e modos demais ao mesmo tempo.
Isso aumenta carga cognitiva e deixa a retomada de caso menos obvia.

### Resultado esperado

- uma entrada principal clara para `chat livre` ou `novo laudo`, guiada pelo contexto do caso;
- menos CTAs simultaneos no composer;
- `Mesa`, `Correcoes`, `Previa` e acoes derivadas aparecendo mais por contexto do que por exposicao permanente.

### Arquivos a abrir primeiro

- `web/templates/inspetor/_workspace.html`
- `web/templates/inspetor/workspace/_assistant_landing.html`
- `web/templates/inspetor/workspace/_workspace_toolbar.html`
- `web/static/js/chat/chat_painel_laudos.js`
- `web/static/js/inspetor/workspace_composer.js`
- `web/static/js/inspetor/workspace_screen.js`

### Passos

1. reduzir o conjunto de acoes sempre visiveis no primeiro uso
2. promover a acao principal coerente com o estado atual do caso
3. mover acoes secundarias para contexto, rail ou menu
4. endurecer a retomada de caso para deixar `proxima acao` e `onde responder` obvios

### Criterio de pronto

- usuario novo entende como comecar sem interpretar varias opcoes tecnicas;
- usuario recorrente entende em segundos onde retomar o caso;
- `Mesa` e `Correcoes` aparecem quando fazem sentido, sem competir com o fluxo principal.

### Checkpoint local - 2026-04-24

- `status`: fechado localmente
- `entrega`: `web/templates/inspetor/workspace/_assistant_landing.html` recebeu o CTA primario de `Nova inspeção`, deixando a decisao principal antes do composer
- `entrega`: `web/templates/inspetor/_workspace.html` deixou de expor a faixa redundante de acoes do rodape; `Anexar` e `Foto` permanecem visiveis pelos gatilhos do proprio composer, enquanto os IDs legados ficam escondidos para compatibilidade com os handlers existentes
- `entrega`: `Mesa` e `Áudio` foram posicionados como acoes compactas do composer, com `Mesa` ainda governada pela matriz de visibilidade/capability
- `entrega`: `web/static/js/shared/app_shell.js` passou a aplicar o aviso de plano sem upload de PDF tambem no botao visivel de anexo do composer
- `teste`: `node --check web/static/js/shared/app_shell.js`
- `teste`: `node --check web/static/js/chat/chat_index_page.js`
- `teste`: `node --check web/static/js/inspetor/workspace_runtime_state.js`
- `teste`: `python -m py_compile web/app/domains/chat/session_helpers.py`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k 'templates_chat_mantem_controles_essenciais_de_ui or workspace'`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_inspector_active_report_authority.py tests/test_app_boot_query_reduction.py -q`
- `teste`: `git diff --check`
- `teste`: `make verify`
- `teste`: `make hygiene-check`
- `proximo`: iniciar `Fase 2`, com fronteira transacional explicita do backend, ou executar um novo refinamento visual focado em Playwright se houver tempo de validação visual

### Validacao minima

```bash
node --check web/static/js/chat/chat_painel_laudos.js
node --check web/static/js/inspetor/workspace_composer.js
cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q
cd web && RUN_E2E=1 PYTHONPATH=. python -m pytest tests/e2e/test_portais_playwright.py -q -k "home or perfil or mesa"
```

## Fase 2 - Fechar consistencia do backend

### Lote 2.1 - Fronteira transacional explicita

- `impacto`: critico
- `dificuldade`: alta
- `risco`: alto

### Problema

Hoje o backend ainda depende bastante de:

- `async def` com `Session` SQLAlchemy sincronica;
- commit implicito no fim da request em `obter_banco()`;
- side effects distribuidos entre rota e service.

### Resultado esperado

- leitura e escrita mais explicitas;
- comandos de mutacao com commit claro;
- menos risco de efeito colateral escondido em request aparentemente simples.

### Arquivos a abrir primeiro

- `web/app/shared/database.py`
- `web/app/domains/chat/laudo.py`
- `web/app/domains/revisor/mesa_api.py`
- `web/app/domains/chat/laudo_service.py`
- `web/app/domains/chat/laudo_decision_services.py`

### Passos

1. mapear endpoints quentes que mutam sessao sem commit explicito
2. separar melhor leituras de comandos de escrita
3. remover dependencias do commit implicito por request nos fluxos principais
4. endurecer testes de side effect em `chat` e `mesa`

### Criterio de pronto

- os fluxos principais de `iniciar`, `finalizar`, `reabrir`, `avaliar` e `responder` nao dependem de commit invisivel;
- as rotas ficam mais finas e os command services passam a carregar a fronteira transacional real.

### Checkpoint local - 2026-04-24

- `status`: iniciado localmente pelos fluxos principais do Chat Inspetor
- `entrega`: `web/app/domains/chat/laudo_service.py` substituiu o `banco.commit()` direto de criação por `commit_ou_rollback_operacional`, mantendo rollback/log padronizados
- `entrega`: `web/app/domains/chat/laudo_decision_services.py` passou a comitar explicitamente a finalização e a reabertura no service, depois de montar o payload do caso, removendo dependência do commit implícito de `obter_banco()` nesses fluxos
- `entrega`: `web/tests/test_transaction_contract.py` passou a cobrir o helper operacional e travar que `laudo_service.py` e `laudo_decision_services.py` nao voltem a usar `banco.commit()` direto nos fluxos principais
- `teste`: `python -m py_compile web/app/domains/chat/laudo_service.py web/app/domains/chat/laudo_decision_services.py web/tests/test_transaction_contract.py`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_transaction_contract.py -q`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k 'iniciar_relatorio_sem_tipo_assume_padrao_por_resiliencia or inspetor_finalizacao_aprovada_com_evidencias_minimas or reabrir'`
- `teste`: `git diff --check`
- `teste`: `make verify`
- `teste`: `make hygiene-check`
- `proximo`: aplicar o mesmo padrao nos comandos de `avaliar`/`responder` da Mesa e nos endpoints do revisor que ainda dependem de flush + commit implícito

### Checkpoint local - 2026-04-24 - Mesa, Pendencias e Correcoes

- `status`: segundo corte local da fronteira transacional fechado
- `entrega`: `web/app/shared/database.py` ganhou `commit_ou_rollback_operacional_preservando_integridade`, preservando `IntegrityError` para replay idempotente sem deixar commit manual nos handlers
- `entrega`: `web/app/domains/chat/mesa_message_routes.py` deixou de usar `banco.commit()` direto nos envios de mensagem e anexo do inspetor para a Mesa
- `entrega`: `web/app/domains/chat/pendencias.py` passou a comitar explicitamente marcacao em lote e atualizacao individual de pendencia da Mesa
- `entrega`: `web/app/domains/chat/corrections.py` passou a comitar explicitamente criacao e atualizacao de correcoes estruturadas do inspetor
- `entrega`: `web/tests/test_transaction_contract.py` passou a travar o helper idempotente e os novos fluxos sem `banco.commit()` direto nos handlers da Mesa
- `teste`: `python -m py_compile web/app/shared/database.py web/app/domains/chat/mesa_message_routes.py web/app/domains/chat/pendencias.py web/app/domains/chat/corrections.py web/tests/test_transaction_contract.py`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_transaction_contract.py -q`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_mesa_mobile_sync.py -q -k idempotencia`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k 'inspetor_envia_anexo_para_mesa_e_download_fica_protegido or revisor_responde_e_inspetor_visualiza_no_canal_mesa or revisor_responde_com_anexo_e_inspetor_recebe_no_canal_mesa'`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k 'inspetor_pendencias_marcar_lidas_atualiza_apenas_humano_eng or inspetor_pendencia_individual_registra_historico_e_reabre'`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py -q -k 'correcoes_estruturadas_do_inspetor_persistem_no_laudo or correcao_estruturada_aplicada_atualiza_documento_do_laudo or correcao_estruturada_aplicada_registra_checklist_e_evidencias'`
- `teste`: `cd web && python -m ruff check app/shared/database.py app/domains/chat/mesa_message_routes.py app/domains/chat/pendencias.py app/domains/chat/corrections.py tests/test_transaction_contract.py`
- `teste`: `git diff --check`
- `teste`: `make verify`
- `teste`: `make hygiene-check`
- `proximo`: reduzir os `flush()` restantes nos services de Revisor/Mesa quando eles ainda estiverem acoplados a side effects ou retorno idempotente

### Validacao minima

```bash
cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q
cd web && PYTHONPATH=. python -m pytest tests/test_revisor_command_side_effects.py tests/test_revisor_mesa_api_side_effects.py -q
cd web && PYTHONPATH=. python -m pytest tests/test_operational_memory.py -q
```

### Lote 2.2 - Contrato tipado de evidencia e gate de qualidade

- `impacto`: critico
- `dificuldade`: alta
- `risco`: alto

### Problema

O gate de qualidade ainda reconhece parte das evidencias por heuristica textual e placeholder.
Isso e fraco demais para um fluxo documental tecnico.

### Resultado esperado

- evidencia com contrato explicito de tipo, origem, mime, vinculo e elegibilidade;
- gate calculado em cima desse contrato;
- `Correcoes` sem `Mesa` respeitando o mesmo modelo de evidencia candidata/aplicada por bloco ou slot.

### Arquivos a abrir primeiro

- `web/app/domains/chat/gate_helpers.py`
- `web/app/domains/chat/media_helpers.py`
- `web/app/domains/chat/report_pack_helpers.py`
- `web/app/domains/chat/pendencias_helpers.py`
- `web/docs/checklist_qualidade.md`
- `web/docs/correcao_sem_mesa.md`

### Passos

1. definir contrato minimo de evidencia no dominio
2. diferenciar evidencia bruta, evidencia vinculada e evidencia elegivel para emissao
3. reescrever o gate para usar o contrato tipado
4. alinhar docs e testes com o novo comportamento

### Criterio de pronto

- gate deixa de depender de string solta para reconhecer foto ou documento;
- anexos novos em `Correcoes` entram como candidatos e nao vao automaticamente para o PDF;
- testes travam o contrato tipado por familia e por fluxo.

### Checkpoint local - 2026-04-24

- `status`: primeiro corte local do contrato tipado fechado sem alterar o comportamento do gate
- `entrega`: criado `web/app/domains/chat/evidence_contract.py` com `EvidenceClassification`, tipos (`text`, `photo`, `document`) e origens (`message`, `visual_learning`)
- `entrega`: `web/app/domains/chat/gate_helpers.py` passou a consumir `classificar_evidencia_mensagem(...)` para contar textos, fotos, documentos e evidencias consolidadas
- `entrega`: preservada a compatibilidade atual: placeholder de foto ainda conta como foto, documento ainda usa `media_helpers.py`, e mensagem textual com aprendizado visual vinculado pode contar como texto e foto
- `entrega`: `web/docs/checklist_qualidade.md` passou a documentar o contrato tipado inicial
- `entrega`: `web/tests/test_evidence_contract.py` cobre classificacao textual, foto por placeholder, foto por aprendizado visual, documento e comando de sistema sem evidencia
- `teste`: `python -m py_compile web/app/domains/chat/evidence_contract.py web/app/domains/chat/gate_helpers.py web/tests/test_evidence_contract.py`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_evidence_contract.py -q`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_semantic_report_pack_catalog_fallback.py -q -k 'gate_qualidade_catalogado'`
- `teste`: `cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k 'gate_reprovado or finalizacao_bloqueada or finalizacao_aprovada or inspetor_finalizacao_aprovada_com_evidencias_minimas'`
- `teste`: `cd web && python -m ruff check app/domains/chat/evidence_contract.py app/domains/chat/gate_helpers.py tests/test_evidence_contract.py`
- `teste`: `git diff --check`
- `teste`: `make verify`
- `teste`: `make hygiene-check`
- `proximo`: enriquecer o contrato para anexos reais, origem/mime/vinculo ao caso e elegibilidade de emissao, antes de remover a compatibilidade por placeholder

### Validacao minima

```bash
cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k "gate or finalizar"
cd web && PYTHONPATH=. python -m pytest tests/test_semantic_report_pack_cbmgo_autonomy.py tests/test_semantic_report_pack_nr35_autonomy.py -q
cd web && PYTHONPATH=. python -m pytest tests/e2e/test_portais_playwright.py -q -k "finalizar_sem_evidencias"
```

## Fase 3 - Limpar e medir depois

### Lote 3.1 - Drenar hotspots grandes do backend

- `impacto`: alto
- `dificuldade`: media
- `risco`: medio

### Arquivos prioritarios

- `web/app/domains/mesa/service.py`
- `web/app/domains/admin/services.py`
- `web/app/domains/chat/laudo_state_helpers.py`
- `web/app/domains/chat/laudo_decision_services.py`

### Resultado esperado

- arquivos menores;
- ownership mais claro;
- testes mais localizados;
- menos regressao cruzada por mudanca pequena.

### Lote 3.2 - Reduzir rendering manual e `innerHTML`

- `impacto`: medio
- `dificuldade`: media
- `risco`: medio

### Arquivos prioritarios

- `web/static/js/chat/chat_painel_laudos.js`
- `web/static/js/revisor/revisor_painel_historico.js`
- `web/static/js/revisor/revisor_painel_documento.js`

### Resultado esperado

- menos interpolacao de HTML;
- menos risco de regressao visual e sanitizacao;
- DOM mais previsivel para evolucao e testes.

### Lote 3.3 - Performance e observabilidade fina

- `impacto`: medio
- `dificuldade`: media
- `risco`: baixo

### Arquivos prioritarios

- `web/main.py`
- `web/app/core/http_runtime_support.py`
- `web/app/core/route_observability.py`
- `web/static/js/inspetor/workspace_perf.js`

### Resultado esperado

- metricas apontando gargalo real, nao ruido de arquitetura;
- trilha mais objetiva para lentidao de rota critica e bootstrap do `inspetor`.

## Primeiro corte recomendado agora

Se a execucao comecar imediatamente, o primeiro corte deve ser:

1. congelar o snapshot minimo do `inspetor`
2. centralizar leitura/escrita desse snapshot em `workspace_runtime_state`
3. cortar de `chat_index_page.js` o trecho que ainda recompõe estado por `dataset`/`storage`
4. validar `home`, `?laudo=`, reload e retomada

Arquivos exatos:

- `web/static/js/chat/chat_index_page.js`
- `web/static/js/inspetor/state_snapshots.js`
- `web/static/js/inspetor/state_authority.js`
- `web/static/js/inspetor/state_runtime_sync.js`
- `web/static/js/inspetor/workspace_runtime_state.js`

## Criterio de pronto da frente

Esta sequencia pode ser considerada bem executada quando:

- o `inspetor` tiver uma autoridade de estado clara;
- a jornada principal ficar mais obvia para primeiro uso e retomada;
- o backend nao depender dos principais commits implicitos por request;
- o gate de qualidade operar sobre evidencia tipada;
- os hotspots restantes puderem ser drenados com risco menor;
- performance e observabilidade passem a medir gargalo real.
