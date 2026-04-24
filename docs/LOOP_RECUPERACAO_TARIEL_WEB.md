# Loop de Recuperação Tariel Web

## Objetivo

Registrar apenas os ciclos executados nesta cópia recuperada do projeto:

- `/home/gabriel/Área de trabalho/tariel-web`

Este arquivo substitui o uso operacional do loop antigo para esta árvore local.
O loop antigo fica preservado apenas como histórico legado e não deve mais ser usado
como fonte principal desta recuperação.

## Escopo

Este loop cobre somente:

- recuperação local do `tariel-web`;
- debug funcional desta cópia;
- estabilização de ambiente local;
- organização incremental de backend e frontend desta base;
- validação local antes de qualquer novo push.

Este loop não deve misturar:

- ciclos do repositório antigo em `/home/gabriel/Área de trabalho/TARIEL`;
- deploys históricos de outras árvores;
- decisões operacionais que não tenham sido executadas nesta cópia.

## Regras deste loop

Cada novo ciclo deve:

1. partir do estado atual desta árvore local;
2. descrever um problema real observado aqui;
3. executar um corte pequeno e coeso;
4. validar localmente;
5. registrar arquivos alterados;
6. registrar o próximo corte provável.

## Estado inicial desta recuperação

Data base deste loop:

- `2026-04-21 16:19:20 -0300`

Estado consolidado no momento de criação:

- repositório local reconectado ao remoto `gstarielio-hash/tariel-web`;
- localhost funcional em `http://127.0.0.1:8010`;
- stack local principal fixada em `PostgreSQL + Redis`;
- `.env` local configurado em `web/.env`;
- credenciais locais de Vision restauradas para esta cópia;
- catálogo administrativo recuperado com famílias canônicas visíveis;
- templates antigos importados para a base local de recuperação.

## Ciclo R1 — Recuperação do localhost e dos acessos seed

Status:

- concluído e validado localmente

Problema observado:

- a cópia recuperada precisava voltar a subir localmente com acessos funcionais para inspeção e debug;
- o fluxo de login do Admin-CEO exigia MFA no seed de desenvolvimento, o que dificultava a retomada operacional imediata.

Corte executado:

- subida local inicial com banco de recuperação;
- estabilização do ambiente para uso em `localhost`;
- desabilitação de MFA apenas para o seed de desenvolvimento do Admin-CEO nesta retomada local.

Arquivos do ciclo:

- `web/app/shared/db/bootstrap.py`

Validação local executada:

- smoke local de subida;
- validação manual dos logins seed;
- `pytest -q web/tests/test_smoke.py`

Próximo passo imediato:

- corrigir falhas reais do runtime do inspetor e liberar o workspace para debug funcional.

## Ciclo R2 — Hotfix do runtime do inspetor

Status:

- concluído e validado localmente

Problema observado:

- o portal do inspetor autenticava, mas o workspace quebrava no boot com recursão infinita;
- quase todos os botões deixavam de responder depois do login.

Corte executado:

- correção da recursão em `atualizarEstadoModoEntrada` no runtime do inspetor;
- preservação da implementação real registrada pelos módulos antes do wrapper compatível.

Arquivos do ciclo:

- `web/static/js/chat/chat_index_page.js`

Validação local executada:

- `node --check web/static/js/chat/chat_index_page.js`
- `pytest -q web/tests/test_smoke.py`
- validação em browser do login do inspetor e abertura do modal de nova inspeção

Próximo passo imediato:

- recuperar templates, catálogo e base administrativa desta cópia.

## Ciclo R3 — Recuperação dos templates e dos artefatos antigos

Status:

- concluído e validado localmente

Problema observado:

- os templates antigos existiam em bases legadas, mas não estavam presentes na base ativa desta cópia;
- os JSONs e schemas antigos precisavam ser trazidos para o projeto sem misturar código legado.

Corte executado:

- backup da base SQLite de recuperação;
- cópia das bases legadas para `web/recovery_imports/legacy_databases`;
- cópia dos artefatos de schema/template para `web/recovery_imports/legacy_assets`;
- importação dos registros de `templates_laudo` da base antiga mais consistente.

Arquivos e diretórios do ciclo:

- `web/dev_recovery.db`
- `web/recovery_imports/legacy_databases/`
- `web/recovery_imports/legacy_assets/`

Validação local executada:

- conferência de contagem da tabela `templates_laudo`
- inspeção manual dos arquivos copiados

Próximo passo imediato:

- restaurar o catálogo governado do Admin-CEO para que a UI deixe de aparecer vazia.

## Ciclo R4 — Sincronização do catálogo governado local

Status:

- concluído e validado localmente

Problema observado:

- os templates existiam, mas a tela `/admin/catalogo-laudos` seguia vazia;
- a UI do catálogo dependia de `familias_laudo_catalogo`, não apenas de `templates_laudo`;
- em desenvolvimento, o bootstrap canônico do catálogo não era executado automaticamente.

Corte executado:

- importação local das famílias canônicas para o catálogo governado desta cópia;
- validação da presença das famílias na base usada pela UI administrativa.

Arquivos do ciclo:

- base ativa local da recuperação

Validação local executada:

- conferência de contagem de `familias_laudo_catalogo`
- recarga e inspeção da tela `/admin/catalogo-laudos`

Próximo passo imediato:

- consolidar o ambiente local definitivo em PostgreSQL.

## Ciclo R5 — Migração da recuperação para PostgreSQL local

Status:

- concluído e validado localmente

Problema observado:

- a recuperação inicial estava útil em SQLite, mas o projeto é multiusuário e precisa rodar com banco compatível com concorrência real;
- já havia PostgreSQL e Redis locais disponíveis.

Corte executado:

- criação da base `tariel_dev_recovery_20260421`;
- aplicação do schema oficial via Alembic;
- importação do snapshot relevante do SQLite para o PostgreSQL;
- validação do Admin-CEO e do catálogo nessa base nova.

Arquivos e superfícies do ciclo:

- `web/.env`
- base PostgreSQL local `tariel_dev_recovery_20260421`

Validação local executada:

- `curl http://127.0.0.1:8010/health`
- validação do login em `/admin/login`
- conferência das contagens de usuários, empresas, templates e famílias no PostgreSQL

Próximo passo imediato:

- fixar a configuração local para sempre subir com `.env`, Redis, Gemini e Vision desta cópia.

## Ciclo R6 — Fixação do ambiente local desta cópia

Status:

- concluído e validado localmente

Problema observado:

- o ambiente estava funcional, mas dependia de variáveis passadas manualmente em linha de comando;
- a chave do Gemini e a credencial do Vision ainda estavam fora desta árvore local.

Corte executado:

- criação de `web/.env` como fonte local desta cópia recuperada;
- fixação da stack local em `PostgreSQL + Redis`;
- restauração da chave local do Gemini;
- cópia de `visao_wf.json` para a pasta `web/`.

Arquivos do ciclo:

- `web/.env`
- `web/visao_wf.json`

Validação local executada:

- leitura efetiva do `.env` pelo runtime;
- `health check` local;
- acesso ao `/admin/login`

Próximo passo imediato:

- iniciar o loop de organização estrutural desta cópia sem misturar histórico do projeto antigo.

## Próximo corte sugerido

1. criar serviço/comando idempotente para sincronização do catálogo canônico em qualquer ambiente;
2. iniciar a quebra do hotspot `web/app/domains/admin/services.py` pela fatia de catálogo;
3. continuar a desglobalização do runtime do inspetor em `web/static/js/chat/chat_index_page.js`.

## Ciclo R7 — Extração da sincronização canônica do catálogo

Status:

- concluído e validado localmente

Problema observado:

- a sincronização do catálogo canônico estava enterrada dentro de `web/app/shared/db/bootstrap.py` e limitada ao fluxo de produção;
- isso mantinha a regra duplicada e aumentava a divergência entre ambiente local e ambiente produtivo;
- a base recuperada já mostrou esse efeito ao exibir `templates_laudo` preenchido com `familias_laudo_catalogo` vazio.

Corte executado:

- criação do módulo `web/app/domains/admin/catalog_sync_services.py`;
- extração da rotina idempotente `sincronizar_catalogo_canonico(...)`;
- reapontamento do bootstrap do banco para usar o novo serviço em vez de manter a lógica inline;
- adição de teste cobrindo importação apenas das famílias faltantes e idempotência na segunda execução.

Arquivos do ciclo:

- `web/app/domains/admin/catalog_sync_services.py`
- `web/app/shared/db/bootstrap.py`
- `web/tests/test_admin_catalog_sync_services.py`

Validação local executada:

- `python -m py_compile app/domains/admin/catalog_sync_services.py app/shared/db/bootstrap.py tests/test_admin_catalog_sync_services.py`
- `PYTHONPATH=. python -m pytest tests/test_admin_catalog_sync_services.py -q`
- `PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `1 passed`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra do hotspot `web/app/domains/admin/services.py`, começando pelas rotinas de catálogo que ainda ficaram no arquivo principal;
- depois disso, avaliar a próxima extração segura no runtime do inspetor.

## Ciclo R8 — Extração de leitura e escrita do catálogo canônico

Status:

- concluído e validado localmente

Problema observado:

- `web/app/domains/admin/services.py` ainda concentrava leitura dos `family_schemas` canônicos e toda a escrita/importação inicial das famílias do catálogo;
- isso deixava o hotspot com responsabilidades misturadas e aumentava o risco de regressão ao tocar em qualquer trecho de catálogo.

Corte executado:

- criação do módulo `web/app/domains/admin/catalog_canonical_schema_services.py` para centralizar resolução de diretórios, leitura JSON e carregamento/listagem dos schemas canônicos;
- criação do módulo `web/app/domains/admin/catalog_family_write_services.py` para concentrar `upsert` e importação de famílias canônicas para o catálogo governado;
- manutenção de wrappers compatíveis em `web/app/domains/admin/services.py`, preservando contratos públicos, monkeypatches de teste e consumidores legados;
- restauração explícita do wrapper `_ler_json_arquivo(...)` no arquivo principal para evitar regressão em fluxos administrativos ainda dependentes dessa API interna.

Arquivos do ciclo:

- `web/app/domains/admin/catalog_canonical_schema_services.py`
- `web/app/domains/admin/catalog_family_write_services.py`
- `web/app/domains/admin/services.py`
- `web/app/domains/admin/catalog_sync_services.py`

Validação local executada:

- `python -m py_compile web/app/domains/admin/catalog_canonical_schema_services.py web/app/domains/admin/catalog_family_write_services.py web/app/domains/admin/catalog_sync_services.py web/app/domains/admin/services.py web/app/shared/db/bootstrap.py web/tests/test_admin_catalog_sync_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_catalog_sync_services.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "test_catalogo_de_familias_upsert_e_resumo_com_camadas_operacionais or test_catalogo_importa_family_schema_canonico_quando_disponivel"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `1 passed`
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- seguir quebrando `web/app/domains/admin/services.py` pela próxima fatia coesa de catálogo ou governança comercial;
- depois retomar uma extração segura no frontend do inspetor para não concentrar a limpeza só no backend.

## Ciclo R9 — Extração da escrita de oferta comercial do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/app/domains/admin/services.py` ainda acumulava a rotina completa de `upsert` da oferta comercial, incluindo resolução de modo técnico, normalização comercial e persistência;
- isso mantinha o hotspot grande demais e acoplava a fachada administrativa a uma implementação de catálogo que já não precisava viver no arquivo principal.

Corte executado:

- criação do módulo `web/app/domains/admin/catalog_offer_write_services.py`;
- extração da rotina `upsert_oferta_comercial_familia(...)` para o módulo novo;
- manutenção do contrato público em `web/app/domains/admin/services.py` com wrapper fino para preservar consumidores e cobertura existente.

Arquivos do ciclo:

- `web/app/domains/admin/catalog_offer_write_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `python -m py_compile web/app/domains/admin/catalog_offer_write_services.py web/app/domains/admin/services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "test_catalogo_de_familias_upsert_e_resumo_com_camadas_operacionais or test_catalogo_filtros_principais_respeitam_prontidao_e_lifecycle or test_catalogo_detalhe_da_familia_separa_camadas_e_legado_fallback or test_catalogo_rollup_expoe_biblioteca_premium_e_material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `4 passed, 38 deselected`
  - `41 passed`

Próximo passo imediato:

- retomar uma extração segura no frontend do inspetor, priorizando o runtime de `web/static/js/chat/chat_index_page.js`;
- depois voltar ao backend só para a próxima fatia isolada de catálogo/governança que ainda restar em `admin/services.py`.

## Ciclo R10 — Extração de modo técnico e calibração do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/app/domains/admin/services.py` ainda mantinha a escrita de `modo técnico` e `calibração`, duas rotinas de catálogo muito próximas entre si e independentes do restante da fachada administrativa;
- isso aumentava o ruído do arquivo principal e dificultava separar o que é regra de catálogo do que é regra de painel/admin.

Corte executado:

- criação do módulo `web/app/domains/admin/catalog_family_runtime_write_services.py`;
- extração das rotinas `upsert_modo_tecnico_familia(...)` e `upsert_calibracao_familia(...)`;
- manutenção dos contratos públicos em `web/app/domains/admin/services.py` com wrappers finos, preservando consumidores existentes.

Arquivos do ciclo:

- `web/app/domains/admin/catalog_family_runtime_write_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `python -m py_compile web/app/domains/admin/catalog_family_runtime_write_services.py web/app/domains/admin/catalog_offer_write_services.py web/app/domains/admin/services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "test_catalogo_de_familias_upsert_e_resumo_com_camadas_operacionais or test_catalogo_filtros_principais_respeitam_prontidao_e_lifecycle or test_catalogo_detalhe_da_familia_separa_camadas_e_legado_fallback or test_catalogo_rollup_expoe_biblioteca_premium_e_material_real or test_catalogo_governanca_review_e_release_structured"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `5 passed, 37 deselected`
  - `41 passed`

Próximo passo imediato:

- voltar para o frontend do inspetor e identificar uma extração pequena em `web/static/js/chat/chat_index_page.js`, preferencialmente em helpers de estado/snapshot;
- se não houver corte seguro sem mexer no wiring da página, continuar a limpeza do backend por mais uma fatia isolada de catálogo.

## Ciclo R11 — Extração dos helpers de snapshot do inspetor

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava leitura e normalização de múltiplas fontes de estado do inspetor, incluindo `dataset`, `SSR`, `storage`, compat legada e memória;
- esse bloco era coeso, mas ocupava muito espaço dentro do arquivo principal e aumentava o custo de leitura antes de chegar ao runtime de sincronização da tela.

Corte executado:

- criação do módulo `web/static/js/inspetor/state_snapshots.js`;
- extração dos helpers de coleta e composição de snapshot:
  - `obterSnapshotCompatCoreInspector`
  - `obterSnapshotCompatApiInspector`
  - `obterSnapshotDatasetInspector`
  - `obterSnapshotSSRInspector`
  - `obterSnapshotStorageInspector`
  - `obterSnapshotMemoriaInspector`
  - `obterSnapshotBootstrapInspector`
  - `escolherCampoEstadoInspector`
  - `resolverInspectorBaseScreenPorSnapshot`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o módulo novo via `window.TarielInspectorStateSnapshots`;
- ajuste da ordem de carga em `web/templates/index.html` para garantir que o helper seja carregado antes do `chat_index_page.js`.

Arquivos do ciclo:

- `web/static/js/inspetor/state_snapshots.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`

Validação local executada:

- `node --check web/static/js/inspetor/state_snapshots.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`

Próximo passo imediato:

- continuar a quebra do runtime do inspetor em `web/static/js/chat/chat_index_page.js`, mirando o bloco de sincronização/aplicação de estado;
- se o acoplamento aumentar demais, voltar ao backend para a próxima fatia isolada restante em `web/app/domains/admin/services.py`.

## Ciclo R12 — Extração do espelhamento e aplicação de estado do inspetor

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava o espelhamento do estado do inspetor para `dataset`, `storage`, compat legada e evento público, além da aplicação do snapshot no estado local;
- isso mantinha o miolo do runtime com responsabilidades demais no mesmo arquivo, mesmo após a saída dos helpers de snapshot.

Corte executado:

- criação do módulo `web/static/js/inspetor/state_runtime_sync.js`;
- extração das rotinas:
  - `espelharEstadoInspectorCompat`
  - `espelharEstadoInspectorNoDataset`
  - `espelharEstadoInspectorNoStorage`
  - `emitirEstadoInspectorSincronizado`
  - `aplicarSnapshotEstadoInspector`
  - `obterSnapshotEstadoInspectorAtual`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorStateRuntimeSync`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/state_runtime_sync.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`

Validação local executada:

- `node --check web/static/js/inspetor/state_runtime_sync.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pela resolução autoritativa do estado e pela detecção de divergências do inspetor;
- se essa fatia ficar acoplada demais ao restante da página, alternar de volta para a próxima extração isolada do backend.

## Ciclo R13 — Extração da resolução autoritativa do estado do inspetor

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda continha a montagem autoritativa do snapshot do inspetor, combinando memória, `SSR`, `dataset`, `storage`, URL e compat legada no mesmo bloco;
- esse era o miolo mais denso restante do runtime de estado e deixava o arquivo principal difícil de revisar.

Corte executado:

- criação do módulo `web/static/js/inspetor/state_authority.js`;
- extração da rotina `resolverEstadoAutoritativoInspector(...)` para o módulo novo, preservando o algoritmo atual e injetando dependências por parâmetro;
- manutenção de `registrarDivergenciaEstadoInspector(...)` no arquivo principal para preservar o `Map` local e o logging operacional sem abrir um acoplamento desnecessário;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o novo helper antes do `chat_index_page.js`.

Arquivos do ciclo:

- `web/static/js/inspetor/state_authority.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`

Validação local executada:

- `node --check web/static/js/inspetor/state_authority.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`

Próximo passo imediato:

- continuar a limpeza de `web/static/js/chat/chat_index_page.js`, agora mirando helpers remanescentes de divergência/logging ou o próximo bloco coeso do runtime do inspetor;
- se o ganho estrutural do frontend cair, alternar de volta para uma fatia isolada do backend admin.

## Ciclo R14 — Screen sync do workspace e dashboard admin

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda centralizava a sincronização das views do workspace, a visibilidade do widget da mesa e a emissão do evento `tariel:screen-synced`, mantendo mais orquestração de tela do que o necessário no runtime principal;
- `web/app/domains/admin/services.py` ainda concentrava a leitura agregada do dashboard administrativo, misturando contadores, ranking e rollups do catálogo no mesmo agregado já muito grande.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_screen.js`;
- extração das rotinas:
  - `sincronizarWorkspaceViews`
  - `sincronizarWidgetsGlobaisWorkspace`
  - `sincronizarInspectorScreen`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceScreen`;
- criação do módulo `web/app/domains/admin/admin_dashboard_services.py`;
- extração da rotina `buscar_metricas_ia_painel(...)` para o módulo novo, preservando a API pública em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_screen.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_dashboard_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_screen.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_dashboard_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_dashboard_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "buscar_metricas_ia_painel or ignora_tenant_plataforma_em_metricas or governance_rollup"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `1 passed, 41 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime do workspace, preferindo utilitários de navegação/home ou contexto residual;
- no backend, seguir com a próxima fatia isolada de leitura ou mutação administrativa ainda remanescente em `web/app/domains/admin/services.py`.

## Ciclo R15 — Utilidades do workspace e backend de boas-vindas

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda acumulava utilitários de navegação/home, resumo textual, composer, CSRF e parsing de erro HTTP, mesmo após as extrações anteriores do runtime do workspace;
- `web/app/domains/admin/services.py` ainda mantinha a implementação inteira do backend operacional de boas-vindas, apesar de esse bloco ser pequeno e já testado de forma direta.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_utils.js`;
- extração das rotinas:
  - `navegarParaHome`
  - `processarAcaoHome`
  - `resumirTexto`
  - `normalizarConexaoMesaWidget`
  - `pluralizarMesa`
  - `obterTipoTemplateDoPayload`
  - `inserirTextoNoComposer`
  - `aplicarPrePromptDaAcaoRapida`
  - `obterLaudoAtivoIdSeguro`
  - `obterHeadersComCSRF`
  - `extrairMensagemErroHTTP`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceUtils`;
- criação do módulo `web/app/domains/admin/admin_welcome_notification_services.py`;
- extração das rotinas `aviso_notificacao_boas_vindas()` e `disparar_email_boas_vindas(...)`, preservando wrappers compatíveis em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_utils.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_welcome_notification_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_utils.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_welcome_notification_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_welcome_notification_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "boas_vindas or registrar_novo_cliente"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `6 passed, 36 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual do workspace, preferindo anexos/mesa ou helpers remanescentes de integração;
- no backend, seguir para a próxima fatia pequena e coberta ainda remanescente em `web/app/domains/admin/services.py`.

## Ciclo R16 — Stage do workspace e resumo administrativo do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda acumulava o bloco de stage/contexto do workspace, incluindo cópia dinâmica, abertura/fechamento da nova inspeção e sincronização dos controles principais;
- `web/app/domains/admin/services.py` ainda mantinha helpers de prontidão, lifecycle e filtros do catálogo, além da fachada de detalhe do cliente, mantendo o agregado principal maior do que o necessário.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_stage.js`;
- extração das rotinas:
  - `atualizarNomeTemplateAtivo`
  - `abrirNovaInspecaoComScreenSync`
  - `fecharNovaInspecaoComScreenSync`
  - `atualizarCopyWorkspaceStage`
  - `atualizarControlesWorkspaceStage`
  - `atualizarContextoWorkspaceAtivo`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceStage`;
- criação do módulo `web/app/domains/admin/admin_client_detail_services.py`;
- criação do módulo `web/app/domains/admin/admin_catalog_summary_services.py`;
- criação do módulo `web/app/domains/admin/admin_signatory_services.py`;
- extração das rotinas de detalhe de cliente, dos helpers de prontidão/lifecycle/filtros do catálogo e do bloco de signatários governados, preservando wrappers compatíveis em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_stage.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_client_detail_services.py`
- `web/app/domains/admin/admin_catalog_summary_services.py`
- `web/app/domains/admin/admin_signatory_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_stage.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_client_detail_services.py web/app/domains/admin/admin_catalog_summary_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_client_detail_services.py app/domains/admin/admin_catalog_summary_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_deriva_prontidao or catalogo_filtros_principais or buscar_detalhe_cliente or signatario or portfolio"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `5 passed, 37 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo anexos/mesa ou fluxo de chat livre;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando reduções reais do agregado.

## Ciclo R17 — Contexto visual do workspace e registry de ativos do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava o bloco de contexto visual do workspace, landing do assistente, chat livre e reset da interface;
- `web/app/domains/admin/services.py` ainda mantinha helpers de registry da biblioteca de templates e descoberta/leitura dos workspaces de material real do catálogo.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_context_flow.js`;
- extração das rotinas:
  - `detailPossuiContextoVisual`
  - `enriquecerCardLaudoComContextoVisual`
  - `enriquecerPayloadLaudoComContextoVisual`
  - `resolverContextoVisualWorkspace`
  - `definirModoInspecaoUI`
  - `exibirInterfaceInspecaoAtiva`
  - `exibirLandingAssistenteIA`
  - `abrirChatLivreInspector`
  - `promoverPortalParaChatNoModoFoco`
  - `restaurarTelaSemRelatorio`
  - `resetarInterfaceInspecao`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceContextFlow`;
- criação do módulo `web/app/domains/admin/admin_catalog_asset_registry_services.py`;
- extração dos helpers de registry da biblioteca de templates e descoberta/leitura de workspaces de material real, preservando wrappers compatíveis em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_context_flow.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_catalog_asset_registry_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_context_flow.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_asset_registry_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_asset_registry_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "buscar_catalogo_familia_admin or catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo anexos/mesa ou fluxo de retomada home;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando reduções reais do agregado.

## Ciclo R18 — Retomada pela home e material real do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava o fluxo de abertura de laudo pela home, incluindo retomada, contexto visual, modo de entrada e fallback entre `TarielChatPainel` e `TarielAPI`;
- `web/app/domains/admin/services.py` ainda mantinha o bloco grande de material real do catálogo, com resumo do workspace, prioridade, fila e trilha de execução.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_home_flow.js`;
- extração da rotina `abrirLaudoPeloHome(...)`;
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceHomeFlow`;
- criação do módulo `web/app/domains/admin/admin_catalog_material_real_services.py`;
- extração das rotinas de resumo do workspace, prioridade, worklist, track de execução e helpers auxiliares de material real, preservando wrappers compatíveis em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_home_flow.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_catalog_material_real_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_home_flow.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_material_real_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_material_real_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo anexos/mesa ou foco do composer;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando preview/documentação e outras leituras volumosas.

## Ciclo R19 — Anexos da mesa e preview documental do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava a normalização e renderização de anexos do widget da mesa no runtime principal;
- `web/app/domains/admin/services.py` ainda mantinha a família de helpers de preview documental do catálogo, com status, objetivo, resumo e enriquecimento das linhas de catálogo;
- era um corte seguro porque o bloco era majoritariamente de serialização/leitura e sem alteração de contrato.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_mesa_attachments.js`;
- extração das rotinas:
  - `formatarTamanhoBytes`
  - `normalizarAnexoMesa`
  - `renderizarLinksAnexosMesa`
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceMesaAttachments`;
- criação do módulo `web/app/domains/admin/admin_catalog_document_preview_services.py`;
- extração das rotinas de status, objetivo, resumo e enriquecimento de preview documental do catálogo, preservando wrappers compatíveis em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_mesa_attachments.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_catalog_document_preview_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_mesa_attachments.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_document_preview_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_document_preview_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo preview/finalização ou foco do composer;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando biblioteca de variantes e alvo de refinamento template.

## Ciclo R20 — Delivery flow do workspace e variantes do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava a pré-visualização do PDF, a finalização da inspeção e o foco do composer dentro do runtime principal;
- `web/app/domains/admin/services.py` ainda mantinha a biblioteca de variantes e o alvo de refinamento template dentro do agregado administrativo;
- era um corte seguro porque os blocos eram de leitura, serialização e orquestração leve, sem mudança de contrato.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_delivery_flow.js`;
- extração das rotinas:
  - `abrirPreviewWorkspace`
  - `finalizarInspecao`
- migração de `focarComposerInspector` para `web/static/js/inspetor/workspace_composer.js`;
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir o helper novo via `window.TarielInspectorWorkspaceDeliveryFlow` e o foco do composer via `window.TarielInspectorWorkspaceComposer`;
- criação do módulo `web/app/domains/admin/admin_catalog_variant_services.py`;
- extração das rotinas `build_variant_library_summary` e `build_template_refinement_target`, preservando wrappers compatíveis em `services.py`;
- ajuste da ordem de carga em `web/templates/index.html` para carregar o helper novo antes do runtime principal.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_delivery_flow.js`
- `web/static/js/inspetor/workspace_composer.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_catalog_variant_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_composer.js`
- `node --check web/static/js/inspetor/workspace_delivery_flow.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_variant_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_variant_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo controles do composer/teclado ou bloco de screen sync derivado;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando o rollup da fila de calibração e outras agregações ainda volumosas.

## Ciclo R21 — Fluxo de primeiro envio do composer e fila de calibração

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava o primeiro envio do novo chat e o ajuste de thread do composer dentro do runtime principal;
- `web/app/domains/admin/services.py` ainda mantinha o rollup da fila de calibração no agregado administrativo;
- era um corte seguro porque os blocos já dependiam de helpers desacoplados e sem mudança de contrato.

Corte executado:

- migração de `armarPrimeiroEnvioNovoChatPendente` e `prepararComposerParaEnvioModoEntrada` para `web/static/js/inspetor/workspace_composer.js`;
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir esse bloco via `window.TarielInspectorWorkspaceComposer`;
- criação do módulo `web/app/domains/admin/admin_catalog_calibration_queue_services.py`;
- extração da rotina `build_calibration_queue_rollup`, preservando wrapper compatível em `services.py`.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_composer.js`
- `web/static/js/chat/chat_index_page.js`
- `web/app/domains/admin/admin_catalog_calibration_queue_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_composer.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_calibration_queue_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_calibration_queue_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo `screen sync` derivado ou outro bloco de orquestração de workspace;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando rollups de material real/comercial ou agregações de governança ainda volumosas.

## Ciclo R22 — Matriz de visibilidade do workspace e rollups operacional/comercial

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava a aplicação da matriz de visibilidade do workspace no runtime principal;
- `web/app/domains/admin/services.py` ainda mantinha os rollups de material real e escala comercial no agregado administrativo;
- era um corte seguro porque os blocos eram de leitura, serialização e composição de payload.

Corte executado:

- migração de `aplicarMatrizVisibilidadeInspector` para `web/static/js/inspetor/workspace_screen.js`;
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir esse bloco via `window.TarielInspectorWorkspaceScreen`;
- criação do módulo `web/app/domains/admin/admin_catalog_rollup_services.py`;
- extração das rotinas `build_material_real_rollup` e `build_commercial_scale_rollup`, preservando wrappers compatíveis em `services.py`.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_screen.js`
- `web/static/js/chat/chat_index_page.js`
- `web/app/domains/admin/admin_catalog_rollup_services.py`
- `web/app/domains/admin/services.py`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_screen.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_rollup_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_rollup_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo sincronização de rail/widgets ou outro bloco de orquestração ainda local;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando governança ou template library rollup, que ainda concentram volume real.

## Ciclo R23 — Mesa widget do workspace e registry documental do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda concentrava a disponibilidade do Mesa widget e o encaixe do painel dentro do stage `inspection_mesa`, mesmo depois da extração de `workspace_screen.js`;
- `web/app/domains/admin/services.py` ainda mantinha a resolução de rótulo documental do catálogo acoplada ao hotspot principal, embora o registry e o rollup já estivessem em módulo dedicado;
- era um corte seguro porque os blocos eram de orquestração leve e leitura de registry, sem mudança de contrato.

Corte executado:

- migração de `resolveMesaWidgetDisponibilidade` e `sincronizarMesaStageWorkspace` para `web/static/js/inspetor/workspace_screen.js`;
- reapontamento de `web/static/js/chat/chat_index_page.js` para consumir esse bloco via `window.TarielInspectorWorkspaceScreen`;
- extração de `catalog_model_label` para `web/app/domains/admin/admin_catalog_asset_registry_services.py`;
- preservação do wrapper compatível em `web/app/domains/admin/services.py`.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_screen.js`
- `web/static/js/chat/chat_index_page.js`
- `web/app/domains/admin/admin_catalog_asset_registry_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_screen.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_asset_registry_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_asset_registry_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo algum resíduo de sincronização entre rail, tabs e overview que ainda esteja no entrypoint;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando governança ou o restante da infraestrutura da template library que ainda esteja acoplado ao agregado principal.

## Ciclo R24 — Thread do workspace e leitura textual do catálogo

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda mantinha a troca de canal do workspace (`conversa`, `histórico`, `anexos`, `mesa`) dentro do entrypoint principal;
- `web/app/domains/admin/services.py` ainda concentrava helpers textuais usados pelo histórico e pela leitura de liberação do catálogo, embora esse contexto já estivesse em `catalog_tenant_management_services.py`;
- era um corte seguro porque os blocos eram de navegação local e serialização textual, sem mudança de contrato.

Corte executado:

- criação do módulo `web/static/js/inspetor/workspace_thread.js`;
- migração de `atualizarThreadWorkspace` para esse módulo e reapontamento de `web/static/js/chat/chat_index_page.js` para consumi-lo por delegação;
- carregamento do novo módulo em `web/templates/index.html` antes do entrypoint principal;
- extração de `catalogo_texto_leitura` e `catalogo_scope_summary_label` para `web/app/domains/admin/catalog_tenant_management_services.py`, preservando wrappers compatíveis em `services.py`.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_thread.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/catalog_tenant_management_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_thread.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/catalog_tenant_management_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/catalog_tenant_management_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- continuar a quebra de `web/static/js/chat/chat_index_page.js` pelo próximo bloco coeso de runtime residual, preferindo algum resíduo de controle de stage/overview ainda preso ao entrypoint;
- no backend, seguir para a próxima fatia administrativa ainda pesada em `web/app/domains/admin/services.py`, priorizando governança ou helpers documentais/serialização que ainda orbitam o agregado principal.

## Ciclo R25 — Runtime core do inspetor e superfícies de aplicação do admin

Status:

- concluído e validado localmente

Problema observado:

- `web/static/js/chat/chat_index_page.js` ainda acumulava o runtime core do inspetor, misturando resolução de estado, espelhamento, cálculo de screen/view, orquestração do workspace e boot/event wiring no mesmo entrypoint;
- `web/app/domains/admin/services.py` seguia como barramento de composições de catálogo e operações do painel, mesmo depois de vários recortes temáticos;
- os dois hotspots já não eram apenas grandes por volume, mas por papel arquitetural misturado.

Corte executado:

- criação dos módulos `web/static/js/inspetor/workspace_runtime_state.js` e `web/static/js/inspetor/workspace_runtime_screen.js` para o runtime core do inspetor;
- criação do módulo `web/static/js/inspetor/workspace_orchestration.js` para stage/contexto/home/finalização;
- criação do módulo `web/static/js/inspetor/workspace_page_boot.js` para boot/event wiring básico da página;
- reapontamento de `web/static/js/chat/chat_index_page.js` para operar como delegador fino desses blocos, preservando compatibilidade e hooks de performance;
- criação dos módulos `web/app/domains/admin/admin_catalog_application_services.py` e `web/app/domains/admin/admin_operations_application_services.py`;
- reapontamento de `web/app/domains/admin/services.py` para delegar a esses módulos as superfícies de catálogo, onboarding, dashboard e detalhe administrativo do cliente.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_runtime_state.js`
- `web/static/js/inspetor/workspace_runtime_screen.js`
- `web/static/js/inspetor/workspace_orchestration.js`
- `web/static/js/inspetor/workspace_page_boot.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/app/domains/admin/admin_catalog_application_services.py`
- `web/app/domains/admin/admin_operations_application_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_runtime_state.js`
- `node --check web/static/js/inspetor/workspace_runtime_screen.js`
- `node --check web/static/js/inspetor/workspace_orchestration.js`
- `node --check web/static/js/inspetor/workspace_page_boot.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_application_services.py web/app/domains/admin/admin_operations_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_application_services.py app/domains/admin/admin_operations_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Próximo passo imediato:

- no inspetor, revisar se vale um último corte para reduzir `window.*` e a compat layer de `window.TarielInspectorState` sem abrir refactor transversal maior do que o branch atual pede;
- no admin, seguir esvaziando `web/app/domains/admin/services.py` por helpers residuais de catálogo/governança ou decidir se o próximo passo já pede mover a compatibilidade pública para os módulos de aplicação recém-criados.

## R26. Tenant/catalog application slice no admin

Resumo:

- removi wrappers redundantes de escrita/importação em `web/app/domains/admin/services.py`, reapontando `upsert_familia_catalogo`, `upsert_oferta_comercial_familia`, `upsert_modo_tecnico_familia`, `upsert_calibracao_familia` e importadores canônicos para reexports diretos dos módulos já extraídos;
- criei `web/app/domains/admin/admin_catalog_tenant_application_services.py` para concentrar detalhe de família, release tenant, signatário governado e sincronização/resumo de portfolio;
- religuei `web/app/domains/admin/services.py` para expor essas superfícies como fachada fina, preservando a API pública do domínio e reduzindo o agregado principal;
- corrigi o acoplamento interno do novo módulo para depender diretamente das superfícies e helpers necessários, evitando reexposição artificial de aliases privados em `services.py`.

Arquivos do ciclo:

- `web/app/domains/admin/admin_catalog_tenant_application_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or reference_package_workspace or material_real"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Impacto observado:

- `web/app/domains/admin/services.py`: `3109 -> 2622` linhas no estado atual do branch após este ciclo, com o slice tenant/catalog separado e os reexports redundantes removidos.

Próximo passo imediato:

- no admin, o centro de gravidade restante fica em governança/review policy e em resíduos de composição documental do catálogo; o próximo corte mais limpo é levar `upsert_governanca_review_familia` e eventuais serializers/document previews correlatos para uma superfície própria;
- no frontend, só vale novo corte se houver intenção explícita de reduzir a compat layer global do inspetor (`window.*`) sem abrir refactor transversal maior.

## R27. Governança e resumo do catálogo no admin

Resumo:

- criei `web/app/domains/admin/admin_catalog_governance_application_services.py` para concentrar a superfície de governança de review e a fachada principal de resumo do catálogo;
- removi de `web/app/domains/admin/services.py` a implementação de `upsert_governanca_review_familia`, `listar_metodos_catalogo` e `resumir_catalogo_laudos_admin`, mantendo o agregado como reexport fino dessas superfícies;
- preservei explicitamente a exportação de `flush_ou_rollback_integridade` no agregado principal, porque os módulos de escrita já extraídos ainda dependem desse contrato interno;
- corrigi os acoplamentos ocultos do novo módulo para importar diretamente o reader de resumo do catálogo em vez de depender de aliases privados removidos.

Arquivos do ciclo:

- `web/app/domains/admin/admin_catalog_governance_application_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_governance_application_services.py web/app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_governance_application_services.py app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or catalogo_governanca_review_e_release_structured or admin_rollup_de_governanca_agrega_catalogo_e_dashboard or signatario_governado_do_tenant_salva_escopo_e_aparece_no_detalhe"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `5 passed, 37 deselected`
  - `41 passed`

Impacto observado:

- `web/app/domains/admin/services.py`: `2622 -> 2468` linhas no estado atual do branch após este ciclo, com governança e resumo do catálogo saindo do agregado principal.

Próximo passo imediato:

- no admin, o hotspot remanescente mais claro agora está em serializers/helpers de composição documental e de variant/material summary usados no detalhe e no rollup do catálogo; esse é o próximo corte estrutural mais seguro;
- no frontend, ainda não vale novo corte sem intenção explícita de atacar a compat layer global do inspetor.

## R28. Apresentação documental do catálogo no admin

Resumo:

- criei `web/app/domains/admin/admin_catalog_presentation_services.py` para concentrar snapshots de artefatos, rollup de template library, leitura de material real, preview documental, variant library, template refinement e serialização da linha do catálogo;
- removi esse bloco de `web/app/domains/admin/services.py`, deixando o agregado principal apenas com aliases privados de compatibilidade para os módulos de governança e tenant já extraídos;
- preservei explicitamente no agregado os símbolos internos ainda usados por esses slices, como `summarize_offer_commercial_governance`, `catalog_offer_variants`, `resolve_master_template_id_for_family` e `_template_library_registry_index`;
- corrigi os acoplamentos residuais do novo módulo para depender diretamente dos serviços-base de asset/document/material em vez de aliases privados apagados do agregado.

Arquivos do ciclo:

- `web/app/domains/admin/admin_catalog_presentation_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_presentation_services.py web/app/domains/admin/admin_catalog_governance_application_services.py web/app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_presentation_services.py app/domains/admin/admin_catalog_governance_application_services.py app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or catalogo_governanca_review_e_release_structured or admin_rollup_de_governanca_agrega_catalogo_e_dashboard or signatario_governado_do_tenant_salva_escopo_e_aparece_no_detalhe"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `5 passed, 37 deselected`
  - `41 passed`

Impacto observado:

- `web/app/domains/admin/services.py`: `2468 -> 2009` linhas no estado atual do branch após este ciclo, com a apresentação documental do catálogo extraída.

Próximo passo imediato:

- no admin, o centro de gravidade remanescente mais claro fica em bootstrap/sync canônico e em alguns helpers transversais de catálogo ainda usados como compat layer interna; esse é o próximo corte mais natural se a ideia for continuar drenando o agregado;
- no frontend, ainda não faz sentido novo corte sem decidir explicitamente atacar a compat layer global do inspetor.

## R29. Base canônica e sync helpers do catálogo

Resumo:

- criei `web/app/domains/admin/admin_catalog_foundation_services.py` para concentrar paths canônicos, descoberta/carregamento de schemas, busca de família e bootstrap de métodos sugeridos do catálogo;
- removi esse bloco de `web/app/domains/admin/services.py`, mantendo aliases explícitos para preservar os contratos internos usados por `catalog_*_write_services`, pelos módulos de apresentação/governança/tenant e pelos testes que fazem monkeypatch de `_repo_root_dir` e `_family_schemas_dir`;
- corrigi a propagação desses monkeypatches no módulo novo, fazendo os loaders e file-path helpers passarem pela alias pública do agregado, para manter os smoke de bootstrap canônico e os cenários de artifact chain coerentes;
- com isso, o agregado principal ficou abaixo de `2k` linhas sem romper a compatibilidade interna atual.

Arquivos do ciclo:

- `web/app/domains/admin/admin_catalog_foundation_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_catalog_foundation_services.py web/app/domains/admin/admin_catalog_presentation_services.py web/app/domains/admin/admin_catalog_governance_application_services.py web/app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_catalog_foundation_services.py app/domains/admin/admin_catalog_presentation_services.py app/domains/admin/admin_catalog_governance_application_services.py app/domains/admin/admin_catalog_tenant_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or catalogo_governanca_review_e_release_structured or admin_rollup_de_governanca_agrega_catalogo_e_dashboard or signatario_governado_do_tenant_salva_escopo_e_aparece_no_detalhe"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `5 passed, 37 deselected`
  - `41 passed`

Impacto observado:

- `web/app/domains/admin/services.py`: `2009 -> 1945` linhas no estado atual do branch após este ciclo, com a base canônica e os helpers de sync retirados do agregado.

Próximo passo imediato:

- no admin, o que resta agora é majoritariamente compat layer, alguns helpers transversais de catálogo e blocos operacionais de onboarding/dashboard/plataforma; o próximo corte útil depende de decidir se vale continuar drenando aliases internos ou mudar o foco para outra superfície;
- no frontend, continua não valendo novo corte sem intenção explícita de atacar a compat layer global do inspetor.

## R30. Operações administrativas reapontadas para superfície dedicada

Resumo:

- reescrevi `web/app/domains/admin/admin_operations_application_services.py` para que ele próprio monte as dependências de onboarding, dashboard e detalhe de cliente, em vez de depender de wrappers inchados no agregado principal;
- reduzi `web/app/domains/admin/services.py` removendo os helpers locais de serialização operacional e os blocos extensos de montagem dessas superfícies, mantendo só as fachadas públicas e os aliases privados realmente consumidos;
- preservei os contratos que outras rotas e slices ainda importam de `services.py`, como `criar_usuario_empresa` e `_serializar_signatario_governado_admin`, para não quebrar a malha atual;
- com isso, o agregado administrativo caiu mais um degrau e ficou mais próximo de um composition root fino do que de um módulo monolítico operacional.

Arquivos do ciclo:

- `web/app/domains/admin/admin_operations_application_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_operations_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_operations_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "catalogo_rollup_expoe_biblioteca_premium_e_material_real or catalogo_detalhe_expoe_biblioteca_documental_e_workspace_material_real or catalogo_governanca_review_e_release_structured or admin_rollup_de_governanca_agrega_catalogo_e_dashboard or signatario_governado_do_tenant_salva_escopo_e_aparece_no_detalhe"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `5 passed, 37 deselected`
  - `41 passed`

Impacto observado:

- `web/app/domains/admin/services.py`: `1945 -> 1816` linhas no estado atual do branch após este ciclo, com onboarding/dashboard/detalhe reapontados para a superfície operacional dedicada.

Próximo passo imediato:

- no admin, o retorno marginal de continuar extraindo `services.py` caiu bastante; o que sobra é majoritariamente compat layer e algumas superfícies de plataforma/configuração;
- se a meta continuar sendo organização estrutural, o próximo corte com melhor sinal tende a ser plataforma/settings ou então voltar para o frontend e atacar a compat layer do inspetor.

## R31. Fachada de platform settings reapontada para módulo de aplicação

Resumo:

- criei `web/app/domains/admin/admin_platform_settings_application_services.py` para concentrar a orquestração pública de `apply_platform_settings_update` e `build_admin_platform_settings_console`;
- reduzi `web/app/domains/admin/services.py` a uma fachada fina para `platform/settings`, preservando a passagem explícita dos builders e descritores que a suíte monkeypatcha no agregado histórico;
- mantive a indireção sobre `build_platform_settings_console_overview`, `build_platform_settings_console_sections` e builders de descriptors/runtime para não quebrar os testes de compatibilidade do console administrativo;
- com isso, o hotspot administrativo perdeu mais um bloco coeso sem mexer no núcleo de `platform_settings_services.py`.

Arquivos do ciclo:

- `web/app/domains/admin/admin_platform_settings_application_services.py`
- `web/app/domains/admin/services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `python -m py_compile web/app/domains/admin/services.py web/app/domains/admin/admin_platform_settings_application_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/admin/services.py app/domains/admin/admin_platform_settings_application_services.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py -q -k "platform_settings or review_ui_canonical"`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- resultados:
  - `2 passed, 40 deselected`
  - `41 passed`

Impacto observado:

- `web/app/domains/admin/services.py`: `1816 -> 1801` linhas no estado atual do branch após este ciclo, com a fachada pública de `platform/settings` reapontada para superfície dedicada.

Próximo passo imediato:

- no admin, o hotspot remanescente agora é majoritariamente compat layer e alguns helpers transversais; o próximo corte só vale a pena se ainda remover volume real ou isolamento de risco mensurável;
- se a meta continuar sendo organização estrutural com melhor retorno marginal, o melhor próximo passo tende a voltar ao frontend e atacar o restante da compat layer/orquestração residual do inspetor.

## R32. Estado visual do composer reapontado para módulo dedicado

Resumo:

- movi o highlight e o estado visual do composer para `web/static/js/inspetor/workspace_composer.js`, consolidando nesse módulo tudo o que já era responsabilidade do composer;
- reduzi `web/static/js/chat/chat_index_page.js` a uma fachada fina para `aplicarHighlightComposer`, `atualizarVisualComposer` e `sincronizarScrollBackdrop`, preservando o mesmo contrato usado por `bootstrap.js` e `ui_bindings.js`;
- com isso, o root do inspetor perdeu mais um bloco local que não precisava mais ficar acoplado ao boot principal;
- o corte é pequeno em linhas, mas melhora a coerência modular e prepara a próxima rodada de drenagem da compat layer residual.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_composer.js`
- `web/static/js/chat/chat_index_page.js`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_composer.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4561 -> 4547` linhas no estado atual do branch após este ciclo, com o estado visual do composer drenado do root.

Próximo passo imediato:

- no frontend, o próximo corte com melhor retorno continua sendo a compat layer residual do inspetor, priorizando wrappers locais ainda presos ao root que já possuem módulo de destino claro;
- entre os candidatos imediatos, o melhor sinal agora tende a estar na família de wrappers de `page boot`/`sidebar history` ou em outro bloco residual de UI do workspace que ainda não foi consolidado no módulo correspondente.

## R33. Instrumentação PERF do inspetor reapontada para módulo dedicado

Resumo:

- criei `web/static/js/inspetor/workspace_perf.js` para concentrar os wrappers de instrumentação `PERF` do workspace do inspetor;
- removi de `web/static/js/chat/chat_index_page.js` o bloco grande de observabilidade/performance, mantendo no root apenas a montagem dos bindings e a reaplicação dos wrappers retornados;
- atualizei `web/templates/index.html` para carregar o novo módulo antes de `chat_index_page.js`, preservando a ordem necessária para o root usar a API de instrumentação sem conversão para modules ES;
- com isso, o composition root do inspetor perdeu mais uma responsabilidade transversal e ficou mais próximo de um root de montagem do que de um arquivo misturado com telemetria.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_perf.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_perf.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4547 -> 4273` linhas no estado atual do branch após este ciclo, com a instrumentação `PERF` drenada do root.

Próximo passo imediato:

- no frontend, o hotspot remanescente continua no root do inspetor, mas agora com perfil mais claro de compat layer e wrappers de composição;
- o próximo corte com melhor retorno tende a atacar wrappers residuais de `page boot`/`sidebar history` ou outra família local já delegada a módulo próprio, desde que o ganho siga vindo com baixo risco de boot.

## R34. Navegação home e disponibilidade de chat livre reapontadas para módulos utilitários/runtime

Resumo:

- movi para `web/static/js/inspetor/workspace_utils.js` os helpers de navegação/home state, incluindo limpeza/desativação de contexto ativo, resolução de `forceHomeLanding` e leitura do token CSRF;
- movi para `web/static/js/inspetor/workspace_runtime_screen.js` a disponibilidade/promoção do chat livre e a sincronização de visibilidade dos botões associados;
- reduzi `web/static/js/chat/chat_index_page.js` a wrappers finos para esse bloco, preservando o mesmo contrato usado por `bootstrap`, `workspace_orchestration` e `workspace_context_flow`;
- com isso, o root do inspetor perdeu mais uma faixa local que já não precisava carregar diretamente.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_utils.js`
- `web/static/js/inspetor/workspace_runtime_screen.js`
- `web/static/js/chat/chat_index_page.js`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_utils.js`
- `node --check web/static/js/inspetor/workspace_runtime_screen.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4273 -> 4216` linhas no estado atual do branch após este ciclo, com o bloco de navegação/home/chat livre drenado do root.

Próximo passo imediato:

- no frontend, o root do inspetor agora está cada vez mais concentrado em compat layer e composição;
- o próximo corte com melhor retorno tende a cair em wrappers residuais de `page boot`, `sidebar history` ou outra família local que ainda mantenha alguma lógica própria e já tenha módulo de destino definido.

## R35. Resolução de abas e visibilidade da sidebar reapontadas para módulo dedicado

Resumo:

- movi para `web/static/js/inspetor/sidebar_history.js` a resolução de seção ativa, contagem de itens visíveis e escolha da aba `fixados/recentes` da sidebar do histórico;
- reduzi `web/static/js/chat/chat_index_page.js` a uma camada fina que só fornece `document`, `el` e `estado` para o módulo de sidebar;
- com isso, o root do inspetor perdeu mais um bloco local de sidebar/history sem mexer no template ou na UX da barra lateral;
- o corte mantém o mesmo desenho URL-first e não altera a malha de eventos já usada por `ui_bindings`.

Arquivos do ciclo:

- `web/static/js/inspetor/sidebar_history.js`
- `web/static/js/chat/chat_index_page.js`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/sidebar_history.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4216 -> 4154` linhas no estado atual do branch após este ciclo, com a resolução local de abas/visibilidade da sidebar drenada do root.

Próximo passo imediato:

- no frontend, o composition root do inspetor segue reduzindo e o que sobra está cada vez mais próximo de compat layer real;
- o próximo corte com melhor retorno tende a ficar em wrappers residuais de `page boot` ou em alguma família local do timeline/contexto ainda parcialmente espalhada entre o root e `workspace_history_context.js`.

## R36. Filtros, meta e render do timeline reapontados para módulo de histórico

Resumo:

- movi para `web/static/js/inspetor/workspace_history_context.js` o reset de filtros, os rótulos/meta do histórico, os resultados do timeline e a filtragem principal do workspace;
- reduzi `web/static/js/chat/chat_index_page.js` a uma fachada fina para esse bloco, passando apenas as dependências de builders, estado e sincronização já disponíveis no root;
- com isso, o root do inspetor perdeu mais uma fatia de lógica real do timeline, e não apenas wrappers de compatibilidade;
- o corte mantém intactos os filtros por ator/tipo, os contadores de registros e os empty states já exibidos na UI.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_history_context.js`
- `web/static/js/chat/chat_index_page.js`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_history_context.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4154 -> 4076` linhas no estado atual do branch após este ciclo, com meta/filtros/render do timeline drenados do root.

Próximo passo imediato:

- no frontend, o root do inspetor agora está muito mais próximo de composition root e compat layer real;
- o próximo corte com melhor retorno tende a ficar em `page boot` ou em algum bloco residual de conversa/thread ainda local, desde que continue removendo lógica de verdade em vez de apenas trocar aliases.

## R37. Fluxo de thread/conversation focada reapontado para módulo dedicado

Resumo:

- movi para `web/static/js/inspetor/workspace_thread.js` a lógica de conversa focada, variante de conversa, sync de URL e promoção da primeira mensagem do novo chat;
- reduzi `web/static/js/chat/chat_index_page.js` a wrappers finos para esse fluxo, preservando as mesmas entradas usadas por `state_runtime_sync`, `system_events` e `observers`;
- com isso, o root do inspetor perdeu mais um bloco de lógica real de thread/conversation, e não apenas alias de compatibilidade;
- o comportamento de conversa focada e a sincronização de aba/URL permaneceram encapsulados no módulo de thread, que é onde essa responsabilidade já fazia mais sentido.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_thread.js`
- `web/static/js/chat/chat_index_page.js`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_thread.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4076 -> 4030` linhas no estado atual do branch após este ciclo, com o fluxo local de thread/conversation focada drenado do root.

Próximo passo imediato:

- no frontend, o root do inspetor está cada vez mais próximo de composition root real;
- o próximo corte com melhor retorno tende a ficar em `page boot` ou em algum bloco residual de utilitários/cleanup do runtime, mas só vale seguir se continuar removendo lógica coesa e não apenas redistribuindo wrappers mínimos.

## R38. Diagnóstico de preview reapontado para delivery flow

Resumo:

- movi para `web/static/js/inspetor/workspace_delivery_flow.js` a montagem do diagnóstico auditável usado na pré-visualização do laudo;
- reduzi `web/static/js/chat/chat_index_page.js` a uma camada fina que só repassa estado, linhas do workspace, metadados resumidos e contagem de evidências para o módulo de delivery;
- com isso, fechei o último corte frontend que ainda tinha retorno claro no root do inspetor sem cair em redistribuição artificial de wrappers;
- a responsabilidade de preview ficou mais coerente, concentrando geração e preparação do payload no mesmo módulo de delivery.

Arquivos do ciclo:

- `web/static/js/inspetor/workspace_delivery_flow.js`
- `web/static/js/chat/chat_index_page.js`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `node --check web/static/js/inspetor/workspace_delivery_flow.js`
- `node --check web/static/js/chat/chat_index_page.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `41 passed`
  - único aviso conhecido de `CRLF` em `web/static/js/chat/chat_index_page.js`

Impacto observado:

- `web/static/js/chat/chat_index_page.js`: `4030 -> 3996` linhas no estado atual do branch após este ciclo, com o diagnóstico auditável do preview drenado do root.

Próximo passo imediato:

- no frontend, o root do inspetor entrou em zona de retorno marginal baixo: o que sobra é majoritariamente composition root, compat layer e utilitários transversais;
- a recomendação operacional agora é parar a drenagem de `chat_index_page.js` por enquanto e voltar para outro hotspot com retorno real, em vez de continuar fragmentando o root em cortes mínimos.

## R39. Decisão final do laudo extraída para módulo temático

Resumo:

- extraí de `web/app/domains/chat/laudo_service.py` o bloco de decisão final, revisão mobile e reabertura para `web/app/domains/chat/laudo_decision_services.py`;
- reapontei `web/app/domains/chat/laudo.py` e `web/app/domains/cliente/portal_bridge.py` para o novo módulo, preservando o contrato HTTP existente;
- o recorte isolou o trecho de maior acoplamento restante no backend do ciclo de laudo, deixando `laudo_service.py` mais próximo de um módulo de suporte neutro;
- com isso, o hotspot backend saiu de um monólito misto para uma separação mais clara entre suporte de ciclo e casos de uso de decisão.

Arquivos do ciclo:

- `web/app/domains/chat/laudo_decision_services.py`
- `web/app/domains/chat/laudo_service.py`
- `web/app/domains/chat/laudo.py`
- `web/app/domains/cliente/portal_bridge.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `ruff check web/app/domains/chat/laudo_service.py web/app/domains/chat/laudo_decision_services.py web/app/domains/chat/laudo.py web/app/domains/cliente/portal_bridge.py`
- `python -m py_compile web/app/domains/chat/laudo_service.py web/app/domains/chat/laudo_decision_services.py web/app/domains/chat/laudo.py web/app/domains/cliente/portal_bridge.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_v2_document_hard_gate.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `3 passed`
  - `41 passed`
  - apenas avisos conhecidos de `CRLF` em arquivos já modificados no branch

Impacto observado:

- `web/app/domains/chat/laudo_service.py`: `2082 -> 1085` linhas no estado atual do branch após este ciclo;
- `web/app/domains/chat/laudo_decision_services.py`: novo módulo com `1035` linhas concentrando somente os casos de uso de decisão final do laudo;
- o próximo passo já não é continuar drenando o frontend raiz, e sim reavaliar se ainda existe outro hotspot backend com retorno estrutural comparável ou se o branch deve pivotar para correções e melhorias de produto.

## R40. Pipeline documental endurecido do fallback ao preview real

Resumo:

- endureci o fallback do pipeline documental para que o editor universal materialize shell mínimo também em contingência;
- alinhei a política de promoção para preview rico com a capacidade real do editor universal, evitando que template legado fraco fique preso a um preview pobre quando o shell rico já consegue responder;
- `build_catalog_pdf_payload` passou a preservar melhor blocos estruturados públicos de payload parcial, como `identificacao`, `conclusao` e `recomendacoes`, em vez de depender só de payload canônico completo ou de projeções por família;
- fechei a cadeia de garantia com testes em quatro níveis: contrato, templates, visual QA e rota crítica real do revisor.

Arquivos do ciclo:

- `web/app/domains/chat/catalog_document_view_model.py`
- `web/app/domains/chat/catalog_pdf_templates.py`
- `web/tests/test_catalog_document_contract.py`
- `web/tests/test_catalog_pdf_templates.py`
- `web/tests/test_catalog_pdf_visual_qa.py`
- `web/tests/test_regras_rotas_criticas.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `ruff check web/app/domains/chat/catalog_document_view_model.py web/app/domains/chat/catalog_pdf_templates.py web/tests/test_catalog_document_contract.py web/tests/test_catalog_pdf_templates.py web/tests/test_catalog_pdf_visual_qa.py web/tests/test_regras_rotas_criticas.py`
- `python -m py_compile web/app/domains/chat/catalog_document_view_model.py web/app/domains/chat/catalog_pdf_templates.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_catalog_document_contract.py tests/test_catalog_pdf_templates.py tests/test_catalog_pdf_visual_qa.py tests/test_regras_rotas_criticas.py -q -k 'promove_legado_fraco_para_preview_editor_rico or partial_structured_payload or contingencia or shell_minimo or rich_runtime_preview_usa_shell_de_contingencia or materializa_shell_minimo_para_payload_vazio'`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q`
- `git diff --check`
- resultados:
  - `5 passed, 260 deselected`
  - `41 passed`
  - apenas avisos conhecidos de `CRLF` em arquivos já modificados no branch

Impacto observado:

- o pipeline documental ficou menos dependente de payload “perfeito” e responde melhor a payload vazio, parcial e template legado fraco;
- a garantia agora cobre desde a montagem do `view_model` até a rota real de preview no revisor;
- o próximo passo mais útil tende a sair da infraestrutura do pipeline e voltar para alguma correção funcional ou superfície de produto com retorno direto.

## R41. Baseline ampla reavaliada com bloqueio isolado no toolchain mobile

Resumo:

- executei a baseline ampla depois do pacote documental e do ajuste de garantias no portal cliente;
- o lado web fechou verde em escopo amplo: `ruff` completo no `web`, `246 passed` no pacote largo (`tests/test_smoke.py`, `tests/test_regras_rotas_criticas.py`, `tests/test_inspetor_comandos_dominio.py`, `tests/test_inspetor_confianca_dominio.py`, `tests/test_operational_memory.py`) e `6 passed` em `tests/test_tenant_access.py`;
- o fechamento de `make verify` continuou bloqueado no `android`, mas agora o problema ficou isolado como falha de toolchain/dependency graph do Jest/Babel/React Native, não como regressão do pacote web desta rodada;
- deixei explícito no repositório que o workspace mobile exige `Node 22.13.1`, com `android/.nvmrc`, nota no `android/README.md` e `mobile-test` do `Makefile` rodando Jest com `npx -y node@22.13.1`.

Arquivos do ciclo:

- `Makefile`
- `android/.nvmrc`
- `android/README.md`
- `android/babel.config.js`
- `android/package.json`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `make verify`
- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/config/mobileV2Config.test.ts`
- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/settings/repository/settingsRemoteAdapter.test.ts src/settings/migrations/migrateSettingsDocument.test.ts src/features/settings/SettingsExperienceAiSection.test.tsx`
- `git diff --check`
- resultados:
  - baseline ampla do `web` verde
  - `src/config/mobileV2Config.test.ts`: `1 passed`
  - suíte mobile ampla ainda falha antes de executar a maioria dos testes, com resolução incompleta de módulos da cadeia Babel/RN como `@babel/helper-compilation-targets`, `@babel/plugin-proposal-export-default-from` e `@react-native/codegen/lib/parsers/typescript/parser`
  - `git diff --check` sem erro estrutural, só avisos conhecidos de `CRLF` em arquivos já sujos do branch

Impacto observado:

- o branch já tem baseline web ampla suficiente para seguir em superfícies de produto sem medo de regressão escondida no pacote atual;
- o próximo bloqueio real a tratar, se a prioridade continuar sendo baseline total do repositório, é o dependency graph/toolchain do mobile;
- se a prioridade voltar para produto web, a recomendação é não abrir nova frente estrutural agora e tratar primeiro correções/melhorias funcionais pequenas com o web já estabilizado.

## R42. Núcleo compartilhado do ciclo de laudo extraído para support module

Resumo:

- extraí de `web/app/domains/chat/laudo_service.py` o bloco compartilhado que já vinha sendo consumido como pseudo-API privada por `laudo_decision_services.py` e `report_finalize_stream_shadow.py`;
- o novo módulo `web/app/domains/chat/laudo_workflow_support.py` passou a concentrar helpers de `quality gate override`, `document gate`, `review mode`, `binding` de família e campos de resposta de lifecycle;
- `laudo_service.py` ficou focado novamente em `status`, `início` e `gate` neutro do portal inspetor, enquanto os casos de uso de decisão e o shadow importam o suporte compartilhado pelo lugar certo;
- com isso, o hotspot backend deixou de esconder um segundo “compat root” dentro do service neutro do laudo.

Arquivos do ciclo:

- `web/app/domains/chat/laudo_service.py`
- `web/app/domains/chat/laudo_workflow_support.py`
- `web/app/domains/chat/laudo_decision_services.py`
- `web/app/domains/chat/report_finalize_stream_shadow.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd web && PYTHONPATH=. python -m py_compile app/domains/chat/laudo_service.py app/domains/chat/laudo_workflow_support.py app/domains/chat/laudo_decision_services.py app/domains/chat/report_finalize_stream_shadow.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/chat/laudo_service.py app/domains/chat/laudo_workflow_support.py app/domains/chat/laudo_decision_services.py app/domains/chat/report_finalize_stream_shadow.py`
- `cd web && PYTHONPATH=. python -m pytest -q tests/test_regras_rotas_criticas.py`
- `cd web && PYTHONPATH=. python -m pytest -q tests/test_smoke.py`
- resultado adicional:
  - um recorte mais amplo com `tests/test_cliente_portal_critico.py` caiu em vermelho por `admin/services.py` não expor mais `gerar_senha_fortificada`, fora do escopo desta extração

Impacto observado:

- `web/app/domains/chat/laudo_service.py`: `1085 -> 658` linhas no estado atual do branch;
- `web/app/domains/chat/laudo_workflow_support.py`: novo módulo com `464` linhas para o núcleo compartilhado do workflow do laudo;
- o próximo passo coerente agora é reavaliar se ainda existe um corte backend de retorno comparável ou se vale pivotar para correções e melhorias de produto, já com o ciclo de laudo bem mais legível.

## R43. Leitura/status do laudo extraída para módulo próprio

Resumo:

- extraí de `web/app/domains/chat/laudo_service.py` o fluxo de leitura/status do inspetor, que misturava montagem do payload público, provenance, projeção V2, facade documental e `shadow` do caso;
- o novo módulo `web/app/domains/chat/laudo_status_response_services.py` passou a concentrar esse caso de uso de leitura, com helpers locais para payload base e provenance;
- `laudo_service.py` ficou reduzido ao bootstrap de início do laudo, persistência do draft guiado mobile e gate neutro, atuando também como fachada fina para o status legado;
- com isso, o pacote estrutural atual do ciclo de laudo ficou fechado sem reabrir contratos HTTP nem espalhar nova compatibilidade implícita.

Arquivos do ciclo:

- `web/app/domains/chat/laudo_service.py`
- `web/app/domains/chat/laudo_status_response_services.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd web && PYTHONPATH=. python -m py_compile app/domains/chat/laudo_service.py app/domains/chat/laudo_status_response_services.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/chat/laudo_service.py app/domains/chat/laudo_status_response_services.py`
- `cd web && PYTHONPATH=. python -m pytest -q tests/test_regras_rotas_criticas.py tests/test_smoke.py`
- resultados:
  - `ruff` verde
  - `py_compile` verde
  - `227 passed`

Impacto observado:

- `web/app/domains/chat/laudo_service.py`: `658 -> 427` linhas no estado atual do branch;
- `web/app/domains/chat/laudo_status_response_services.py`: novo módulo com `292` linhas concentrando somente a leitura/status projetada do inspetor;
- o retorno marginal da drenagem estrutural em `laudo_service.py` caiu bastante; o próximo passo coerente passa a ser pivotar para correções e melhorias de produto, usando o hotspot já estabilizado como base mais legível.

## R44. Observabilidade do ciclo principal do laudo no inspetor

Resumo:

- instrumentei as rotas principais do ciclo do laudo em `web/app/domains/chat/laudo.py` com `observe_backend_hotspot`, cobrindo `status`, `início`, `gate de qualidade`, `finalização`, `reabertura` e comando de revisão mobile;
- a mudança não alterou o contrato HTTP do inspetor, mas passou a registrar `endpoint`, `surface`, `outcome`, `response_status_code` e detalhes leves suficientes para leitura operacional;
- também ampliei `web/tests/test_backend_hotspot_metrics.py` para provar que `GET /app/api/laudo/status` e `POST /app/api/laudo/iniciar` entram no sumário administrativo de backend hotspots;
- com isso, o ciclo principal do laudo deixou de ser um ponto cego no painel de observabilidade leve já existente no projeto.

Arquivos do ciclo:

- `web/app/domains/chat/laudo.py`
- `web/tests/test_backend_hotspot_metrics.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd web && PYTHONPATH=. python -m py_compile app/domains/chat/laudo.py tests/test_backend_hotspot_metrics.py`
- `cd web && PYTHONPATH=. python -m ruff check app/domains/chat/laudo.py tests/test_backend_hotspot_metrics.py`
- `cd web && PYTHONPATH=. python -m pytest -q tests/test_backend_hotspot_metrics.py`
- `cd web && PYTHONPATH=. python -m pytest -q tests/test_smoke.py`
- `git diff --check`
- resultados:
  - `ruff` verde
  - `py_compile` verde
  - `4 passed`
  - `41 passed`
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- o sumário administrativo de backend hotspots agora passa a refletir também o ciclo principal do laudo do inspetor, não só chat, painel, bootstrap e operações documentais;
- o time ganha base factual para decidir se o próximo passo de produto deve cair em lifecycle, documento ou multiportal a partir de volume e outcome reais;
- o próximo pacote coerente de melhorias tende a continuar em observabilidade/contrato de produto ou então atacar uma correção funcional do inspetor já guiada por esses sinais.

## R45. Contrato mobile reforçado com fallback canônico de tenant access policy

Resumo:

- reforcei o contrato web/mobile do envelope do inspetor sem mudar rotas: `tenant_access_policy`, que já vinha do backend, passou a ficar explicitamente coberto nos testes web de login/bootstrap mobile;
- no Android, `android/src/types/mobile.ts` passou a tipar essa política, e `android/src/features/common/mobileUserAccess.ts` passou a usá-la como fallback canônico para `allowed_portals`, labels e links de troca de portal quando os campos achatados não vierem preenchidos;
- isso preserva o comportamento atual quando `allowed_portals` já vem do backend, mas reduz a chance de drift silencioso entre o payload canônico e os helpers do app;
- também adicionei cobertura dedicada no Jest do helper mobile para garantir a reconstrução de grants, labels e links a partir da política do tenant.

Arquivos do ciclo:

- `android/src/types/mobile.ts`
- `android/src/features/common/mobileUserAccess.ts`
- `android/src/features/common/mobileUserAccess.test.ts`
- `web/tests/test_multiportal_bootstrap_contracts.py`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd web && PYTHONPATH=. python -m py_compile tests/test_multiportal_bootstrap_contracts.py`
- `cd web && PYTHONPATH=. python -m pytest -q tests/test_multiportal_bootstrap_contracts.py`
- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/features/common/mobileUserAccess.test.ts`
- `git diff --check`
- resultados:
  - `5 passed`
  - `7 passed`
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- o backend mobile passa a ter contrato mais explícito para grants multiportal, sem depender de inferência implícita no app;
- o Android fica mais robusto a envelopes parciais ou transicionais, porque consegue reconstruir acesso e links a partir de `tenant_access_policy`;
- o próximo passo coerente nessa trilha é continuar fechando contratos canônicos consumidos pelo mobile, agora preferindo `status/lifecycle/actions` do caso técnico ou então seguir para uma correção funcional já protegida por esse reforço contratual.

## R46. Entry mode do caso preservado no estado local do Android

Resumo:

- promovi `entry_mode_preference`, `entry_mode_effective` e `entry_mode_reason` para o `ChatState` do app, porque o backend já expõe esses campos no envelope principal e o runtime do chat ainda dependia demais do `laudoCard` para enxergá-los;
- com isso, a normalização inicial da conversa, a atualização de resumo do laudo e a resposta do envio do chat agora preservam o `entry mode` mesmo quando o `laudoCard` vier nulo ou parcial;
- também ajustei os consumidores que tomam decisão visual/operacional com base nisso, em especial `buildThreadContextState`, `caseLifecycle` e `buildAuthenticatedLayoutSections`, para usarem fallback top-level antes de cair no card;
- fechei a trilha com testes dedicados do helper de conversa, do contexto da thread, do controller de chat e do helper de workflow formal.

Arquivos do ciclo:

- `android/src/features/chat/types.ts`
- `android/src/features/chat/conversationStateHelpers.ts`
- `android/src/features/chat/inspectorChatMessageController.ts`
- `android/src/features/chat/buildThreadContextState.ts`
- `android/src/features/chat/caseLifecycle.ts`
- `android/src/features/common/buildAuthenticatedLayoutSections.ts`
- `android/src/features/chat/conversationHelpers.test.ts`
- `android/src/features/chat/buildThreadContextState.test.ts`
- `android/src/features/chat/useInspectorChatController.entryMode.test.ts`

Validação local executada:

- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/features/chat/conversationHelpers.test.ts src/features/chat/buildThreadContextState.test.ts src/features/chat/useInspectorChatController.entryMode.test.ts src/features/chat/caseLifecycle.test.ts`
- `git diff --check`
- resultados:
  - `49 passed`
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- o Android deixa de perder `entry_mode_*` em envelopes parciais, especialmente em bootstrap/transições onde o `laudoCard` nem sempre é a única fonte de verdade;
- a retomada guiada e a leitura de workflow formal ficam alinhadas com o contrato mobile já existente no backend, sem depender de duplicação silenciosa no card;
- o próximo passo coerente nessa frente é continuar endurecendo o consumo mobile dos campos canônicos do caso técnico apenas onde ainda houver risco real de envelope parcial, e então voltar a melhorias funcionais maiores.

## R47. Histórico mobile com radar operacional de guiados e reemissões

Resumo:

- melhorei o card “Radar da operação” no drawer de histórico do Android para resumir não só andamento/mesa/concluídos, mas também quantos casos visíveis estão em `coleta guiada` e quantos já carregam `reemissão recomendada`;
- a melhoria reaproveita sinais já presentes nos cards do histórico (`entry_mode_effective` e `official_issue_summary.primary_pdf_diverged`), sem mexer em backend ou contrato;
- também enriqueci o texto de busca quando os resultados encontrados carregarem esses sinais, para a leitura rápida não depender só da contagem bruta de casos;
- a cobertura ficou concentrada em `HistoryDrawerPanel.test.tsx`, mantendo o pacote pequeno e claramente funcional.

Arquivos do ciclo:

- `android/src/features/history/HistoryDrawerPanel.tsx`
- `android/src/features/history/HistoryDrawerPanel.test.tsx`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/features/history/HistoryDrawerPanel.test.tsx src/features/history/historyHelpers.test.ts src/features/InspectorAuthenticatedLayout.test.tsx`
- `cd android && npx prettier --check src/features/history/HistoryDrawerPanel.tsx src/features/history/HistoryDrawerPanel.test.tsx`
- `git diff --check`
- resultados:
  - `12 passed`
  - `prettier` verde
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- o histórico do app fica mais útil como painel rápido de retomada, porque já expõe o volume de casos guiados e de reemissões sem obrigar o inspetor a abrir item por item;
- a melhoria aproveita contratos já estabilizados no branch e reforça valor funcional sem abrir nova dependência entre mobile e backend;
- o próximo passo coerente nessa trilha é continuar em melhorias pequenas de produto que usem sinais canônicos já existentes, preferindo superfícies de retomada, fila offline ou finalização.

## R48. Fila offline com resumo operacional mais acionável

Resumo:

- melhorei o resumo curto da fila offline no Android para priorizar o impacto operacional da fila, não apenas o volume bruto de envios;
- o app agora destaca explicitamente quando a fila contém `criação de caso`, `finalização` e `respostas à mesa`, combinando isso com o detalhe técnico já existente de falha, itens prontos para reenvio ou backoff;
- fiz isso criando um helper compartilhado em `offlineQueueHelpers.ts` e reapontando o derived state principal do app, o que espalha a melhoria para thread, modais e settings sem duplicar regra;
- a mudança ficou totalmente no mobile, sem tocar contrato HTTP nem backend.

Arquivos do ciclo:

- `android/src/features/offline/offlineQueueHelpers.ts`
- `android/src/features/offline/offlineQueueHelpers.test.ts`
- `android/src/features/common/buildInspectorBaseDerivedStateSections.ts`
- `android/src/features/common/buildInspectorBaseDerivedStateSections.test.ts`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/features/offline/offlineQueueHelpers.test.ts src/features/common/buildInspectorBaseDerivedStateSections.test.ts src/features/chat/buildThreadContextState.test.ts src/features/common/buildInspectorSessionModalsSections.test.ts src/features/settings/buildInspectorRootSettingsDrawerProps.test.ts`
- `cd android && npx prettier --check src/features/offline/offlineQueueHelpers.ts src/features/offline/offlineQueueHelpers.test.ts src/features/common/buildInspectorBaseDerivedStateSections.ts src/features/common/buildInspectorBaseDerivedStateSections.test.ts`
- `git diff --check`
- resultados:
  - `42 passed`
  - `prettier` verde
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- a fila offline fica mais priorizável no uso real, porque o inspetor passa a enxergar rapidamente se há criação de caso travada, finalização pendente ou resposta técnica parada;
- o mesmo resumo curto agora circula por mais de uma superfície do app sem derivação paralela nem texto genérico demais;
- o próximo passo coerente nessa trilha é seguir para finalização/quality gate, já que retomada e fila offline ficaram mais legíveis.

## R49. Finalização do caso com bloqueios de emissão mais legíveis

Resumo:

- melhorei a leitura dos bloqueios na etapa de finalização do Android, para o app parar de responder só com contadores genéricos e passar a dizer com clareza se o problema está em `bloqueios documentais`, `pendências do pré-laudo` ou apenas `pontos de atenção`;
- essa composição agora aparece tanto no card final do contexto da thread quanto no `QualityGateModal`, mantendo a mesma linguagem de priorização nas duas superfícies;
- a mudança reaproveita `document_blockers`, `pendingBlocks`, `missingEvidenceCount` e `attentionBlocks`, sem tocar na lógica de aprovação, override ou backend;
- a cobertura ficou em testes focais do quality gate e do resumo de finalização.

Arquivos do ciclo:

- `android/src/features/chat/threadContextFinalization.ts`
- `android/src/features/chat/qualityGateModalHelpers.ts`
- `android/src/features/chat/QualityGateModalSections.tsx`
- `android/src/features/chat/QualityGateModal.tsx`
- `android/src/features/chat/QualityGateModal.test.tsx`
- `android/src/features/chat/buildThreadContextState.test.ts`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/features/chat/QualityGateModal.test.tsx src/features/chat/buildThreadContextState.test.ts src/features/chat/ThreadContextCard.test.tsx`
- `cd android && npx prettier --check src/features/chat/threadContextFinalization.ts src/features/chat/qualityGateModalHelpers.ts src/features/chat/QualityGateModalSections.tsx src/features/chat/QualityGateModal.tsx src/features/chat/QualityGateModal.test.tsx src/features/chat/buildThreadContextState.test.ts`
- `git diff --check`
- resultados:
  - `27 passed`
  - `prettier` verde
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- o usuário passa a entender melhor por que a emissão ainda não pode seguir, sem precisar decodificar vários blocos separados do quality gate;
- finalização e quality gate agora falam a mesma linguagem curta de bloqueio, reduzindo ruído cognitivo numa etapa crítica do app;
- o próximo passo coerente nessa trilha é continuar em melhorias pequenas de produto no mobile, preferindo pontos onde já exista sinal canônico forte e pouca necessidade de mexer em backend.

## R50. Central de atividade com priorização operacional

Resumo:

- melhorei a central de atividade do Android para ela se comportar mais como uma fila curta de atenção do inspetor do que como uma lista puramente cronológica;
- os itens agora são ordenados por prioridade operacional, com alertas críticos e reaberturas da mesa vindo antes de status comuns, e cada notificação ganhou um rótulo curto de categoria e um hint de destino mais explícito;
- a mudança ficou concentrada em helpers de atividade e na `ActivityCenterModal`, sem tocar no backend nem criar novos tipos de evento;
- a cobertura passou por helper, modal e controller, para garantir que a priorização continue estável.

Arquivos do ciclo:

- `android/src/features/activity/activityNotificationHelpers.ts`
- `android/src/features/activity/activityNotificationHelpers.test.ts`
- `android/src/features/common/OperationalModals.tsx`
- `android/src/features/common/OperationalModals.test.tsx`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada:

- `cd android && npx -y node@22.13.1 ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand src/features/activity/activityNotificationHelpers.test.ts src/features/common/OperationalModals.test.tsx src/features/activity/useActivityCenterController.test.ts`
- `cd android && npx prettier --check src/features/activity/activityNotificationHelpers.ts src/features/activity/activityNotificationHelpers.test.ts src/features/common/OperationalModals.tsx src/features/common/OperationalModals.test.tsx`
- `git diff --check`
- resultados:
  - `11 passed`
  - `prettier` verde
  - apenas avisos conhecidos de `CRLF` em arquivos antigos já sujos no branch

Impacto observado:

- a central de atividade ficou mais útil para triagem rápida, porque o inspetor passa a ver primeiro o que tende a exigir ação imediata;
- os itens ficaram mais autoexplicativos sem depender de backend novo, o que fecha bem a sequência de melhorias recentes em histórico, fila offline e finalização;
- o próximo passo coerente agora é decidir se vale continuar lapidando essa trilha operacional do mobile ou se o melhor retorno já volta para outra superfície do produto.

## R51. Fechamento do pacote web para promoção no Render

Resumo:

- consolidei um pacote coerente de promoção focado apenas no serviço web desta árvore, deixando a frente Android fora do deploy;
- o pacote reúne a nova rodada de drenagem dos hotspots do inspetor e do admin, a consolidação da família `NR35 linha de vida` no pipeline documental e a base inicial da aba `Correções` para tenants sem `Mesa`;
- a intenção deste ciclo não foi abrir comportamento novo de produto ponta a ponta, mas deixar o conjunto web grande o suficiente para promoção e pequeno o suficiente para depuração caso o deploy do Render aponte regressão;
- a baseline de promoção foi validada pelo gate oficial do web antes do staging seletivo.

Arquivos e superfícies do ciclo:

- `web/app/domains/admin/*`
- `web/app/domains/chat/*`
- `web/app/domains/cliente/*`
- `web/app/domains/revisor/*`
- `web/app/shared/official_issue_package.py`
- `web/app/v2/*`
- `web/static/js/**/*`
- `web/static/css/**/*`
- `web/templates/**/*`
- `web/tests/**/*`
- `web/docs/correcao_sem_mesa.md`
- `docs/STATUS_CANONICO.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`
- `docs/family_schemas/nr35_inspecao_linha_de_vida*`
- `docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/*`
- `docs/restructuring-roadmap/133_inspetor_correcoes_sem_mesa.md`
- `PLANS.md`
- `PROJECT_MAP.md`

Validação local executada:

- `git diff --check`
- `make hygiene-check`
- `make web-ci`
- resultados:
  - `workspace hygiene` verde
  - `web-ci` verde com `247 passed`
  - sem falha de sintaxe ou regressão detectada no pacote web preparado para promoção

Impacto observado:

- o pacote web fica promovível sem arrastar o ruído atual do mobile;
- a preparação para o Render passa a ter fronteira explícita entre o que é serviço web e o que é frente paralela Android;
- o próximo passo coerente é commitar apenas o pacote web/docs, fazer `push` para o GitHub e acompanhar o deploy automático do Render.

## R52. Baseline verde, mypy progressivo, segurança e restore

Resumo:

- criei o checkpoint Git `964a348` da árvore verde antes do novo pacote;
- zerei os 28 erros de `mypy` e incluí `web-typecheck` dentro de `web-ci`;
- rodei o pacote de segurança com `pip-audit` isolado em `.test-artifacts`, corrigi pinos Python vulneráveis, atualizei o Expo SDK 55 por patch e mantive o audit mobile bloqueando vulnerabilidade alta de runtime;
- removi os 12 binários rastreados acima de 10 MiB, mantendo manifesto de path, tamanho e SHA-256;
- fechei um slice backend em `cliente/routes.py`, um slice frontend em `portal_admin_surface.js` e adicionei drill local de restore de uploads ao gate real.

Arquivos e superfícies do ciclo:

- `Makefile`
- `scripts/run_python_security_audit.py`
- `scripts/run_uploads_restore_drill.py`
- `web/requirements.txt`
- `android/package.json`
- `android/package-lock.json`
- `web/app/domains/*`
- `web/static/js/cliente/portal_admin_surface.js`
- `web/tests/test_material_reference_packages.py`
- `docs/binary_asset_manifests/oversized_assets_2026-04-24.json`
- `docs/STATUS_CANONICO.md`
- `docs/final-project-audit/08_production_ops_closure.md`
- `docs/tracked_binary_assets_audit.md`
- `PLANS.md`

Validação local executada:

- `make verify`
- `make hygiene-check`
- `make security-audit`
- `make production-ops-check-strict`
- `make uploads-cleanup-check`
- `make uploads-restore-drill`
- `make binary-assets-audit-strict`
- `cd web && PYTHONPATH=. python -m pytest tests/test_material_reference_packages.py -q`
- `cd android && npx expo install --check`
- `node --check web/static/js/cliente/portal_admin_surface.js`
- `git diff --check`

Resultados:

- `make verify` verde;
- `mypy`: `Success: no issues found in 313 source files`;
- mobile: `420 passed`;
- Mesa: `94 passed`;
- binários rastreados: `147`, total `138.2 MiB`, oversized `0`;
- produção strict: `production_ready=true`, blockers `[]`;
- restore drill: `status=passed`, `3` arquivos verificados.

Impacto observado:

- a baseline voltou a ficar promovível com tipagem progressiva no gate principal;
- a árvore deixa de carregar quase 476 MiB de payload pesado no Git futuro sem perder rastreabilidade;
- produção/restore agora tem rotina executável local além da política de env;
- o próximo passo coerente é escolher outro slice pequeno em `mesa/service.py` ou `chat_index_page.js` e definir o storage externo/LFS definitivo dos assets migrados.

## R53. Observabilidade crítica, Mesa summary e contratos HTML do Chat cliente

Resumo:

- adicionei uma camada production-safe de observabilidade para rotas críticas, habilitada no `render.yaml` por `TARIEL_ROUTE_OBSERVABILITY_ENABLED=1`;
- a camada só registra log quando o fluxo crítico fica lento ou falha com 5xx, e cobre `cliente_bootstrap`, `cliente_chat`, `cliente_mesa`, `inspetor_chat`, `revisor_mesa` e `documento_oficial`;
- extraí de `mesa/service.py` a sumarização de mensagens, evidências, pendências e whispers para `web/app/domains/mesa/package_message_summary.py`, sem alterar o contrato do pacote da Mesa;
- no portal cliente, os avisos read-only do Chat passaram a usar contratos estáticos allowlisted em `portal_shared_helpers.js`, reduzindo HTML hardcoded diretamente na superfície de chat.

Arquivos do ciclo:

- `render.yaml`
- `web/app/core/settings.py`
- `web/app/core/http_runtime_support.py`
- `web/app/core/route_observability.py`
- `web/app/domains/mesa/package_message_summary.py`
- `web/app/domains/mesa/service.py`
- `web/static/js/cliente/portal.js`
- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_shared_helpers.js`
- `web/tests/test_route_observability.py`
- `docs/STATUS_CANONICO.md`
- `docs/final-project-audit/08_production_ops_closure.md`
- `PLANS.md`

Validação local executada:

- `python -m py_compile web/app/core/settings.py web/app/core/http_runtime_support.py web/app/core/route_observability.py web/app/domains/mesa/package_message_summary.py web/app/domains/mesa/service.py`
- `node --check web/static/js/cliente/portal_shared_helpers.js`
- `node --check web/static/js/cliente/portal_chat_surface.js`
- `node --check web/static/js/cliente/portal.js`
- `cd web && PYTHONPATH=. python -m pytest tests/test_route_observability.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_mesa_mobile_sync.py -q -k resumo`
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or portal'`
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k 'templates_cliente_explicitam_abas_e_formularios_principais'`
- `make web-ci`
- `make mesa-smoke`
- `make production-ops-check-strict`
- `make hygiene-check`
- `make verify`
- `make security-audit`
- `make uploads-cleanup-check`
- `make uploads-restore-drill`
- `make binary-assets-audit-strict`
- `git diff --check`

Resultados:

- `web-ci` verde com `mypy` em `315` arquivos fonte e `256` testes web críticos;
- `make verify` verde, incluindo mobile com `113` suites e `420` testes;
- `make security-audit` verde no critério atual, mantendo apenas vulnerabilidade moderada transitiva já conhecida em `uuid` via cadeia Expo/xcode;
- `mesa-smoke` verde com `94 passed`;
- produção strict continua `production_ready=true`, sem blockers;
- restore drill passou com `3` arquivos verificados;
- auditoria de binários segue com `147` arquivos rastreados, `138.2 MiB` e `0` oversized;
- higiene do workspace segue `ok`.
- Render ficou `live` no commit `2a78d8a`, mas o smoke externo de `/ready` apontou `production_ops_ready=false`, `uploads_storage_mode=local_fs` e cleanup desligado no serviço `tariel-web-free`.

Impacto observado:

- o próximo deploy passa a entregar sinal operacional útil sobre lentidão/falha nos fluxos que mais importam, sem expor conteúdo do caso;
- a Mesa perdeu mais um bloco de regra interna do arquivo monolítico;
- o Chat do portal cliente avançou na migração para contratos explícitos de HTML seguro;
- o próximo passo coerente é decidir o upgrade/configuração real do Render para storage persistente antes de chamar o ambiente publicado de produção fechada, e em paralelo transformar os logs críticos em consulta/alerta real.

## R54. Contrato explícito inicial da rota principal do Chat Inspetor

Resumo:

- iniciei a frente de contratos por rota crítica pelo Chat Inspetor;
- extraí a classificação de entrada de `/app/api/chat` para `chat_stream_contract.py`, com `intent`, `action` e `response_kind`;
- mantive o endpoint e os retornos atuais, isolando apenas a decisão inicial entre chat livre sem laudo e fluxo de laudo/comando;
- adicionei cobertura unitária para chat livre, laudo ativo, comando rápido, comando de finalização e mensagem para Mesa;
- passei a expor a classificação no detalhe da observabilidade de hotspot, para facilitar leitura operacional no Admin CEO sem vazar conteúdo do caso.
- depois do ajuste de governança definido em conversa, adicionei o contrato `ClientePortalRouteGovernanceV1` ao diagnóstico do Admin Cliente, explicitando que Admin CEO governa contrato/superfícies/limites do cliente e Admin Cliente governa seus funcionários, que neste projeto são inspetores e avaliadores.
- removi a leitura de `case_action_mode=read_only` e de `tenant_capability_*` como bloqueio fino de ação operacional; esses campos legados agora são compatibilidade/diagnóstico, enquanto a autoridade operacional deriva das superfícies contratadas.

Arquivos do ciclo:

- `web/app/domains/chat/chat_stream_contract.py`
- `web/app/domains/chat/chat_stream_routes.py`
- `web/tests/test_chat_stream_contract.py`
- `web/tests/test_backend_hotspot_metrics.py`
- `web/app/domains/cliente/route_contracts.py`
- `web/app/domains/cliente/diagnostics.py`
- `web/app/shared/tenant_admin_policy.py`
- `web/app/domains/cliente/common.py`
- `web/templates/admin/novo_cliente.html`
- `web/templates/admin/cliente_detalhe/_tab_acoes.html`
- `web/static/js/cliente/chat_page.js`
- `web/static/js/cliente/mesa_page.js`
- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_shared_helpers.js`
- `web/tests/test_cliente_route_contracts.py`
- `web/tests/test_cliente_portal_critico.py`
- `web/tests/test_tenant_entitlements_critical.py`
- `web/tests/test_admin_client_routes.py`
- `PLANS.md`

Validação local executada:

- `cd web && PYTHONPATH=. python -m py_compile app/domains/chat/chat_stream_contract.py app/domains/chat/chat_stream_routes.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_chat_stream_contract.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_backend_hotspot_metrics.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_report_finalize_stream_binding.py tests/test_v2_document_hard_gate_10f.py tests/test_v2_document_hard_gate_10g.py -q`
- `cd web && PYTHONPATH=. python -m py_compile app/domains/cliente/route_contracts.py app/domains/cliente/diagnostics.py`
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_route_contracts.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k diagnostico`
- `cd web && PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_route_contracts.py tests/test_cliente_portal_critico.py -q`
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_services.py tests/test_admin_client_routes.py tests/test_portais_acesso_critico.py tests/test_v2_tenant_admin_projection.py -q -k 'read_only or case_actions or politica or tenant_admin or entitlements'`
- `node --check web/static/js/cliente/chat_page.js`
- `node --check web/static/js/cliente/mesa_page.js`
- `node --check web/static/js/cliente/portal_chat_surface.js`
- `node --check web/static/js/cliente/portal_shared_helpers.js`
- `git diff --check`
- `make web-ci`
- `make hygiene-check`

Resultados:

- `test_chat_stream_contract.py`: `5 passed`;
- `test_backend_hotspot_metrics.py`: `4 passed`;
- hard gate/finalização stream: `11 passed`.
- `test_cliente_route_contracts.py`: `2 passed`;
- diagnóstico do portal cliente: `1 passed`, `31 deselected`;
- contrato completo do portal cliente: `35 passed`;
- entitlements críticos: `19 passed`;
- seleção admin/tenant policy: `10 passed`, `96 deselected`;
- checagem JS cliente: `4` arquivos sem erro de sintaxe.
- `make web-ci`: `ruff` verde, `mypy` verde em `317` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`.
- `make hygiene-check`: `status=ok`.

Impacto observado:

- a rota `/app/api/chat` fica mais legível sem alterar persistência, IA, Mesa ou finalização;
- o Admin Cliente agora expõe em diagnóstico a fronteira correta: contrato pertence ao Admin CEO; a governança dos funcionários do cliente pertence ao Admin Cliente;
- o próximo corte coerente é fechar uma rodada ampla de validação e depois avançar para o próximo hotspot backend/frontend sem reabrir essa regra de governança.

## R55. Sequencia de governanca por superficies e cortes estruturais

Resumo:

- corrigi o baseline de Mesa: `mobile_case_approve` volta a derivar da superficie Inspetor contratada, sem depender do pacote comercial de Mesa;
- removi `case_action_mode` e `tenant_capability_*` da UI/API administrativa de politica do Admin Cliente; os campos seguem apenas como compatibilidade interna para dados legados;
- extraí de `client_routes.py` a aplicação da política por superfície para `client_surface_policy.py`;
- extraí de `mesa/service.py` o mapa de cobertura do pacote para `package_coverage.py`;
- adicionei cobertura WebSocket/whispers garantindo que Mesa contratada continua operando mesmo com flags finas legadas falsas;
- reduzi limpeza direta por `innerHTML` no portal cliente com o helper `clearElement`;
- confirmei via Render CLI que o service id real do serviço publicado é `srv-d795sq2a214c73alec20` (`tariel-web-free`).

Arquivos do ciclo:

- `web/app/shared/tenant_admin_policy.py`
- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_surface_policy.py`
- `web/app/domains/mesa/service.py`
- `web/app/domains/mesa/package_coverage.py`
- `web/app/domains/revisor/ws.py`
- `web/static/js/cliente/portal.js`
- `web/static/js/cliente/portal_shared_helpers.js`
- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `web/templates/admin/novo_cliente.html`
- `web/templates/admin/cliente_detalhe/_tab_acoes.html`
- `web/tests/test_admin_client_routes.py`
- `web/tests/test_admin_services.py`
- `web/tests/test_mesa_mobile_sync.py`
- `web/tests/test_revisor_ws.py`
- `web/tests/test_tenant_entitlements_critical.py`
- `docs/STATUS_CANONICO.md`
- `docs/final-project-audit/08_production_ops_closure.md`
- `PLANS.md`

Validação local executada ate aqui:

- `cd web && PYTHONPATH=. python -m pytest tests/test_mesa_mobile_sync.py::test_mobile_review_command_aprovar_no_mobile_fecha_caso_autonomo -q` -> `1 passed`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py::test_flags_finas_legadas_nao_bloqueiam_funcionarios_do_cliente tests/test_admin_services.py::test_pacote_comercial_mesa_com_servicos_no_inspetor_libera_cross_portal -q` -> `2 passed`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_client_routes.py -q -k 'politica_operacional or mobile_single_operator or pacote_chat'` -> `3 passed, 37 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_mesa_mobile_sync.py -q -k 'coverage or pacote or resumo or mobile_review_command_aprovar'` -> `2 passed, 7 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_v2_reviewdesk_projection.py tests/test_revisor_mesa_api_side_effects.py -q -k 'pacote or package or coverage'` -> `4 passed, 8 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_revisor_ws.py -q -k 'mesa_contratada or superficie_indisponivel or fluxo_basico'` -> `3 passed, 15 deselected`;
- `node --check web/static/js/cliente/portal_shared_helpers.js && node --check web/static/js/cliente/portal.js && node --check web/static/js/cliente/portal_chat_surface.js && node --check web/static/js/cliente/portal_mesa_surface.js`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or mesa or diagnostico'` -> `12 passed, 20 deselected`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados.
- `make verify` -> `ruff` verde, `mypy` verde em `319` source files, web crítico `250 passed`, tenant access `6 passed`, mobile `113` suites/`420` testes e mesa-smoke `95 passed`;
- `make hygiene-check` -> `status=ok`;
- `git diff --check` -> sem erros; apenas aviso de normalização CRLF em `web/app/domains/mesa/service.py`.

Impacto observado:

- Admin CEO passa a alterar contrato/superfícies/limites sem expor trava operacional fina na UI/API;
- Admin Cliente mantém governança operacional de seus funcionários dentro das superfícies contratadas;
- Mesa e portal cliente perderam mais um pedaço de lógica concentrada, sem mudança de contrato externo;
- o ambiente publicado atual segue saudável, mas não production-ready: `/ready` em `https://tariel-web-free.onrender.com/ready` respondeu `production_ops_ready=false`, `uploads_storage_mode=local_fs` e cleanup desligado.

## R56. Funcionarios do cliente, historico da Mesa e runtime do Chat Inspetor

Resumo:

- mantive Render real como bloqueio externo: o serviço `srv-d795sq2a214c73alec20` precisa de disco persistente/envs production-ready, mas nenhum upgrade/plano pago foi aplicado sem autorização explícita;
- extraí de `admin/client_routes.py` as rotas de usuários/funcionários do cliente para `admin/client_employee_routes.py`, preservando que Admin Cliente governa inspetores e avaliadores dentro das superfícies contratadas;
- extraí de `mesa/service.py` o histórico de refazer, histórico de inspeção e memória operacional de família para `mesa/package_history.py`;
- adicionei helpers DOM seguros no portal cliente para empty state, chips e opções agrupadas, aplicando o primeiro corte nas listas de Chat/Mesa;
- criei `chat_index_page_runtime.js` como ponte explícita para runtime/eventos/toast do Chat Inspetor, reduzindo acesso direto a globais no arquivo principal;
- adicionei teste contra reentrada de `tenant_capability_*` legado no formulário de superfícies.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_employee_routes.py`
- `web/app/domains/admin/routes.py`
- `web/app/domains/mesa/service.py`
- `web/app/domains/mesa/package_history.py`
- `web/static/js/cliente/portal_shared_helpers.js`
- `web/static/js/cliente/portal.js`
- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `web/static/js/chat/chat_index_page_runtime.js`
- `web/static/js/chat/chat_index_page.js`
- `web/templates/index.html`
- `web/tests/test_admin_client_routes.py`
- `docs/STATUS_CANONICO.md`
- `docs/final-project-audit/08_production_ops_closure.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/tests/test_admin_client_routes.py web/app/domains/admin/client_routes.py web/app/domains/admin/client_employee_routes.py web/app/domains/admin/routes.py web/app/domains/mesa/service.py web/app/domains/mesa/package_history.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_client_routes.py -q -k 'politica_operacional or definir_pacote_chat_inspetor_sem_mesa or ignora_flags_legacy or usuario_do_tenant or admin_cliente or inspetor or resetar or bloquear'` -> `6 passed, 35 deselected`;
- `node --check web/static/js/cliente/portal_shared_helpers.js && node --check web/static/js/cliente/portal.js && node --check web/static/js/cliente/portal_chat_surface.js && node --check web/static/js/cliente/portal_mesa_surface.js && node --check web/static/js/chat/chat_index_page_runtime.js && node --check web/static/js/chat/chat_index_page.js` -> sem erro de sintaxe.
- `git diff --check` -> sem erros; apenas aviso de normalização CRLF em `web/app/domains/mesa/service.py` e `web/static/js/chat/chat_index_page.js`;
- `make web-ci` -> `ruff` verde, `mypy` verde em `321` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make mobile-ci` -> typecheck, lint, prettier e `113` suites/`420` testes verdes;
- `make mesa-smoke` -> `95 passed`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`.

Impacto observado:

- o Admin CEO continua no contrato/superfícies do cliente, sem assumir governo operacional fino dos funcionários;
- o Admin Cliente segue como autoridade sobre inspetores e avaliadores do próprio cliente dentro do contrato liberado;
- `mesa/service.py` e `chat_index_page.js` perderam mais responsabilidades sem alterar endpoint, contrato público ou fluxo do usuário;
- o próximo corte coerente é continuar extraindo emissão oficial da Mesa e cards/mensagens do portal cliente, depois atacar sidebar/histórico do inspetor com helper dedicado.

## R57. Emissao oficial da Mesa e mensagens seguras do Portal Cliente

Resumo:

- extraí a emissão oficial do pacote da Mesa para `web/app/domains/mesa/package_official_issue.py`, mantendo `mesa/service.py` como orquestrador;
- troquei a renderização de mensagens de Chat/Mesa no Portal Cliente para montagem DOM segura, incluindo texto com quebras, anexos e ações de pendência;
- avancei a ponte `chat_index_page_runtime.js` com acesso explícito a API, payload de status, location, viewport e publicação do runtime;
- adicionei teste direto garantindo que `case_action_mode=read_only` é compatibilidade visual legada e não bloqueia ações da superfície contratada;
- mantive Render real como pendência externa: sem alteração paga/disco via CLI e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/mesa/service.py`
- `web/app/domains/mesa/package_official_issue.py`
- `web/static/js/cliente/portal_shared_helpers.js`
- `web/static/js/cliente/portal.js`
- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `web/static/js/chat/chat_index_page_runtime.js`
- `web/static/js/chat/chat_index_page.js`
- `web/tests/test_tenant_entitlements_critical.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/mesa/service.py web/app/domains/mesa/package_official_issue.py web/tests/test_tenant_entitlements_critical.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/mesa/service.py app/domains/mesa/package_official_issue.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py -q -k 'case_action_mode_legado or superficies_contratuais or flags_finas'` -> `4 passed, 16 deselected`;
- `node --check web/static/js/cliente/portal_shared_helpers.js && node --check web/static/js/cliente/portal.js && node --check web/static/js/cliente/portal_chat_surface.js && node --check web/static/js/cliente/portal_mesa_surface.js && node --check web/static/js/chat/chat_index_page_runtime.js && node --check web/static/js/chat/chat_index_page.js` -> sem erro de sintaxe.
- `git diff --check` -> sem erros; apenas aviso de normalização CRLF em `web/app/domains/mesa/service.py` e `web/static/js/chat/chat_index_page.js`;
- `make web-ci` -> `ruff` verde, `mypy` verde em `322` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make mesa-smoke` -> `95 passed`;
- `make mobile-ci` -> typecheck, lint, prettier e `113` suites/`420` testes verdes;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`.

Impacto observado:

- `mesa/service.py` caiu para cerca de `1171` linhas e a próxima extração principal pode mirar `revisao_por_bloco` ou `montar_pacote_mesa_laudo`;
- o Portal Cliente removeu `innerHTML` do miolo de mensagens de Chat/Mesa, ficando com HTML direto principalmente em cards/contextos maiores;
- o Chat Inspetor ainda tem fallbacks `window.*`, mas a ponte já cobre mais acessos e permite remover compatibilidade com menos risco em ciclos futuros.

## R58. Revisao por bloco da Mesa e cards DOM do Portal Cliente

Resumo:

- extraí a revisão por bloco do pacote da Mesa para `web/app/domains/mesa/package_block_review.py`, isolando inferência de seção, pendências abertas, devoluções ao inspetor e ordenação de status;
- reduzi `mesa/service.py` para orquestração do pacote principal, sem alterar contrato externo, endpoint ou payload do pacote;
- troquei os cards das filas principais de Chat/Mesa no Portal Cliente para criação por DOM, mantendo `innerHTML` fora das listas operacionais;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/mesa/service.py`
- `web/app/domains/mesa/package_block_review.py`
- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `web/tests/test_smoke.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/mesa/service.py web/app/domains/mesa/package_block_review.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/mesa/service.py app/domains/mesa/package_block_review.py` -> verde;
- `node --check web/static/js/cliente/portal_shared_helpers.js && node --check web/static/js/cliente/portal.js && node --check web/static/js/cliente/portal_chat_surface.js && node --check web/static/js/cliente/portal_mesa_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_v2_reviewdesk_projection.py tests/test_revisor_mesa_api_side_effects.py -q -k 'pacote or package or coverage or revisao'` -> `4 passed, 8 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or mesa'` -> `11 passed, 21 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros; apenas aviso de normalização CRLF em `web/app/domains/mesa/service.py`;
- `make web-ci` -> `ruff` verde, `mypy` verde em `323` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make mesa-smoke` -> `95 passed`;
- `make mobile-ci` -> typecheck, lint, prettier e `113` suites/`420` testes verdes;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- `mesa/service.py` caiu para cerca de `849` linhas; o próximo slice natural é separar `montar_pacote_mesa_laudo`/orquestração final ou mover mais blocos documentais;
- as listas principais de Chat/Mesa agora usam texto via `textContent` e atributos via `dataset`; os próximos `innerHTML` restantes estão em triagem, contexto e movimentos;
- o próximo pacote coerente é atacar `portal_chat_surface.js`/`portal_mesa_surface.js` em triagem/contexto ou continuar o Admin CEO em `admin/client_routes.py`.

## R59. Read models do pacote da Mesa

Resumo:

- extraí a leitura de mensagens, leitura de revisões e serialização de mensagens do pacote da Mesa para `web/app/domains/mesa/package_read_models.py`;
- mantive `montar_pacote_mesa_laudo` como contrato público em `mesa/service.py`, mas removi dele a consulta direta de `MensagemLaudo`/`LaudoRevisao`;
- preservei a serialização de anexos, semântica de mensagens, referência de mensagem e resolvedor no novo módulo de read models;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/mesa/service.py`
- `web/app/domains/mesa/package_read_models.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/mesa/service.py web/app/domains/mesa/package_read_models.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/mesa/service.py app/domains/mesa/package_read_models.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_operational_memory.py tests/test_v2_reviewdesk_read_side.py -q -k 'pacote or mesa or operational or emissao'` -> `12 passed, 3 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_v2_reviewdesk_projection.py tests/test_revisor_mesa_api_side_effects.py -q -k 'pacote or package or coverage or revisao'` -> `4 passed, 8 deselected`;
- `git diff --check` -> sem erros; apenas aviso de normalização CRLF em `web/app/domains/mesa/service.py`;
- `make web-ci` -> `ruff` verde, `mypy` verde em `324` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make mesa-smoke` -> `95 passed`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- `mesa/service.py` caiu para cerca de `799` linhas; a próxima extração natural é mover documento estruturado/catálogo para módulo próprio ou separar a orquestração final de `montar_pacote_mesa_laudo`;
- o read-side do pacote fica testável sem misturar consulta SQL, serialização de mensagem e montagem global do pacote;
- o próximo pacote coerente pode alternar para frontend e remover `innerHTML` de triagem/contexto no Portal Cliente.

## R60. Triagem DOM do Portal Cliente

Resumo:

- troquei a triagem principal do Chat no Portal Cliente para montagem DOM segura, preservando `data-act="filtrar-chat-status"`, `limpar-chat-filtro` e `abrir-prioridade`;
- troquei a triagem principal da Mesa no Portal Cliente para montagem DOM segura, preservando `data-act="filtrar-mesa-status"`, `limpar-mesa-filtro` e `abrir-prioridade`;
- mantive os textos e classes operacionais (`toolbar-meta`, `activity-item`, `empty-state`, `pill`, `hero-chip`) para não alterar o contrato visual;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_shared_helpers.js && node --check web/static/js/cliente/portal.js && node --check web/static/js/cliente/portal_chat_surface.js && node --check web/static/js/cliente/portal_mesa_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or mesa'` -> `11 passed, 21 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `324` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- os blocos `innerHTML` da triagem de Chat/Mesa saíram das superfícies principais do Portal Cliente;
- os próximos `innerHTML` relevantes no Portal Cliente ficam em movimentos, contexto, capacidade/resumo e alguns fallbacks de mensagem;
- o próximo pacote coerente é atacar `renderChatMovimentos`/`renderMesaMovimentos` ou os contextos `renderChatContext`/`renderMesaContext`.

## R61. Movimentos DOM do Portal Cliente

Resumo:

- troquei `renderChatMovimentos` para montagem DOM segura, incluindo empty state, lista de movimentos, chip de contagem e botão `abrir-prioridade`;
- troquei `renderMesaMovimentos` para montagem DOM segura, incluindo empty state, lista de movimentos, chips de pendências/chamados e botão `abrir-prioridade`;
- preservei classes visuais e `data-act` usados pelos bindings do Portal Cliente;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_shared_helpers.js && node --check web/static/js/cliente/portal.js && node --check web/static/js/cliente/portal_chat_surface.js && node --check web/static/js/cliente/portal_mesa_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or mesa'` -> `11 passed, 21 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `324` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- triagem e movimentos de Chat/Mesa já não dependem de HTML string para renderizar conteúdo operacional dinâmico;
- os próximos `innerHTML` relevantes no Portal Cliente ficam concentrados em `renderChatContext`, `renderMesaContext`, resumo/capacidade e fallbacks de mensagem;
- o próximo pacote coerente é atacar os contextos `renderChatContext`/`renderMesaContext`, que concentram sinais do caso e guidance operacional.

## R62. Contextos DOM do Portal Cliente

Resumo:

- troquei `renderChatContext` para montagem DOM segura, incluindo estado vazio, card de contexto, blocos de metadata, guidance operacional, override humano e aviso de item parado;
- troquei `renderMesaContext` para montagem DOM segura, incluindo estado vazio, sinais canônicos do caso, momento canônico, fase operacional da mesa, override humano e aviso de fila parada;
- preservei classes, `dataset`, badges e habilitação de botões derivados de superfície contratada, sem alterar lifecycle nem permissão;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_shared_helpers.js` -> sem erro de sintaxe;
- `node --check web/static/js/cliente/portal.js` -> sem erro de sintaxe;
- `node --check web/static/js/cliente/portal_chat_surface.js` -> sem erro de sintaxe;
- `node --check web/static/js/cliente/portal_mesa_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or mesa'` -> `11 passed, 21 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `324` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- os painéis de contexto de Chat/Mesa já não dependem de `innerHTML` para conteúdo operacional dinâmico ou avisos de override;
- os próximos `innerHTML` relevantes no Portal Cliente ficam em documento pendente, capacidade/resumo e fallback de mensagens;
- o próximo pacote coerente pode atacar `renderChatCapacidade`/resumos do Portal Cliente ou alternar para o próximo slice backend em `admin/client_routes.py`/`mesa/service.py`.

## R63. Portal Cliente sem innerHTML direto nas superfícies Chat/Mesa

Resumo:

- troquei o status de documento pendente do Chat para DOM seguro, preservando lista de anexo, botão `Remover` e feedback;
- troquei a capacidade do Chat para DOM seguro, preservando estado read-only, indicação de plano, botão `preparar-upgrade` e bloqueio por superfície/limite;
- troquei os resumos gerais de Chat/Mesa e o resumo do pacote da Mesa para cards DOM, preservando classes e `data-accent`;
- removi o fallback `innerHTML` das mensagens de Chat/Mesa usando texto com quebras por `TextNode`/`br`;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_chat_surface.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_chat_surface.js` -> sem erro de sintaxe;
- `node --check web/static/js/cliente/portal_mesa_surface.js` -> sem erro de sintaxe;
- `rg -n "innerHTML" web/static/js/cliente/portal_chat_surface.js web/static/js/cliente/portal_mesa_surface.js` -> sem ocorrências;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'chat or mesa'` -> `11 passed, 21 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `324` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- `portal_chat_surface.js` e `portal_mesa_surface.js` não têm mais uso direto de `innerHTML` para renderização dinâmica;
- ainda existem usos controlados em helpers compartilhados (`renderStaticContractHtml`) e HTML allowlisted, que podem virar contratos DOM em outro slice se necessário;
- o próximo pacote coerente deve alternar para backend (`admin/client_routes.py` ou `mesa/service.py`) ou seguir no Inspetor web para reduzir `window.*` em `chat_index_page.js`.

## R64. Admin CEO suporte, Portal Admin DOM parcial e Mesa documento

Resumo:

- extraí as rotas de abrir/encerrar suporte excepcional do cliente para `web/app/domains/admin/client_support_routes.py`;
- preservei o contrato de governança: Admin CEO abre/encerra janela auditada de suporte, mas não assume a gestão direta de inspetores/avaliadores do cliente;
- reduzi `web/app/domains/admin/client_routes.py` para cerca de `2297` linhas;
- troquei os cards executivos de `empresa-cards` e o seletor `empresa-plano` do Portal Admin Cliente para montagem DOM segura;
- extraí verificação pública e anexo pack do pacote da Mesa para `web/app/domains/mesa/package_document_support.py`, reduzindo `mesa/service.py` para cerca de `731` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_support_routes.py`
- `web/static/js/cliente/portal_admin_surface.js`
- `web/app/domains/mesa/service.py`
- `web/app/domains/mesa/package_document_support.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_support_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/admin/client_routes.py app/domains/admin/client_support_routes.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_client_routes.py -q -k 'suporte_excepcional or politica_operacional or bloquear or trocar_plano or admin_cliente'` -> `4 passed, 37 deselected`;
- `node --check web/static/js/cliente/portal_admin_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'admin or portal or cliente'` -> `32 passed`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `PYTHONPATH=. python -m ruff check web/app/domains/mesa/service.py web/app/domains/mesa/package_document_support.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/mesa/service.py app/domains/mesa/package_document_support.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_v2_reviewdesk_projection.py tests/test_revisor_mesa_api_side_effects.py -q -k 'pacote or package or coverage or revisao'` -> `4 passed, 8 deselected`;
- `git diff --check` -> sem erros; aviso esperado de normalização CRLF em `web/app/domains/mesa/service.py`;
- `make web-ci` -> `ruff` verde, `mypy` verde em `326` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make mesa-smoke` -> `95 passed`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- `client_routes.py` ainda é grande, mas perdeu mais uma responsabilidade de governança sensível;
- `portal_admin_surface.js` ainda tem `innerHTML`, agora com um primeiro padrão DOM para cards/seletor que pode ser reaplicado nos resumos e auditoria;
- `mesa/service.py` ficou mais próximo de orquestração final, mas ainda pode perder documento estruturado/catálogo/verificação de escopo em próximos slices.

## R65. Briefs DOM do Portal Admin Cliente

Resumo:

- troquei o resumo geral administrativo do Portal Admin Cliente para cards DOM seguros, preservando classes e acentos visuais;
- troquei os briefs de capacidade, equipe e suporte para `stage-brief-card` criado por nós DOM, preservando botões `preparar-upgrade` e `abrir-prioridade`;
- troquei o alerta de capacidade e a nota de criação de usuário para helpers DOM, removendo mais dois blocos dinâmicos de `innerHTML`;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_admin_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_admin_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'admin or portal or cliente'` -> `32 passed`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `326` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- os blocos executivos mais visíveis do Portal Admin Cliente já usam o mesmo padrão DOM seguro dos cards recentes;
- `portal_admin_surface.js` ainda tem `innerHTML` em resumo detalhado, saúde, política/auditoria e tabela de usuários;
- o próximo pacote coerente é trocar `renderSaudeEmpresa`/auditoria para DOM seguro ou alternar para novo slice backend em `admin/client_routes.py`.

## R66. Saúde operacional DOM do Portal Admin Cliente

Resumo:

- troquei `renderSaudeEmpresa` para montar métricas de saúde operacional por cards DOM seguros;
- adicionei helpers DOM para guidance, pills e barras de histórico de saúde, preservando classes e `data-tone`;
- removi a dependência local de `htmlBarrasHistorico` nessa superfície administrativa;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_admin_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_admin_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'admin or portal or cliente'` -> `32 passed`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `326` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- a área de saúde operacional já não usa `innerHTML` para séries mensais/diárias;
- `portal_admin_surface.js` ainda tem `innerHTML` em resumo detalhado, suporte diagnóstico, onboarding, auditoria, histórico de planos e tabela de usuários;
- o próximo pacote coerente é atacar suporte diagnóstico/auditoria com helpers DOM reutilizando `criarPillAdminNode` e cards existentes.

## R67. Suporte diagnóstico DOM do Portal Admin Cliente

Resumo:

- troquei o resumo `admin-diagnostico-resumo` para chips DOM seguros;
- troquei os cards de política de suporte para `support-policy-card` criado por nós DOM;
- troquei o protocolo de suporte para nós DOM, preservando `support-protocol__copy`, `support-protocol__status`, pills e hero chips;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/static/js/cliente/portal_admin_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_admin_surface.js` -> sem erro de sintaxe;
- `cd web && PYTHONPATH=. python -m pytest tests/test_cliente_portal_critico.py -q -k 'admin or portal or cliente'` -> `32 passed`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k templates_cliente_explicitam_abas_e_formularios_principais` -> `1 passed, 42 deselected`;
- `git diff --check` -> sem erros.
- `make web-ci` -> `ruff` verde, `mypy` verde em `326` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- a área de suporte diagnóstico já não usa `innerHTML` para política, resumo ou protocolo;
- `portal_admin_surface.js` ainda tem `innerHTML` em resumo detalhado, onboarding, auditoria, histórico de planos e tabela de usuários;
- o próximo pacote coerente é atacar auditoria/onboarding com helpers DOM ou alternar para backend em `admin/client_routes.py`.

## R68. Catálogo Admin CEO importação e lifecycle extraídos

Resumo:

- extraí as rotas de importação canônica do catálogo para `web/app/domains/admin/client_catalog_import_routes.py`;
- extraí as rotas de `technical-status` e `offer-lifecycle` para `web/app/domains/admin/client_catalog_lifecycle_routes.py`;
- preservei o mesmo roteador, validação CSRF, acesso Admin CEO e execução auditada via `_executar_acao_admin_redirect`;
- reduzi `web/app/domains/admin/client_routes.py` de `2297` para `2124` linhas neste checkpoint de catálogo;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_catalog_import_routes.py`
- `web/app/domains/admin/client_catalog_lifecycle_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_catalog_lifecycle_routes.py web/app/domains/admin/client_catalog_import_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/admin/client_routes.py app/domains/admin/client_catalog_lifecycle_routes.py app/domains/admin/client_catalog_import_routes.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_client_routes.py -q -k 'catalogo and (importa or lifecycle or ofertas or renderiza or familia)'` -> `5 passed, 36 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k 'catalogo or bootstrap_catalogo'` -> `2 passed, 41 deselected`;
- `git diff --check` -> sem erros.
- `make web-ci` -> `ruff` verde, `mypy` verde em `328` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- o catálogo começou a sair do monólito de cliente sem mudar URL pública;
- `client_routes.py` ainda concentra home/detalhe de catálogo, formulários de família/modos/ofertas/calibração/liberação e ações diretas de cliente;
- o próximo pacote backend coerente é extrair os formulários de catálogo ou alternar para `portal_admin_surface.js` para seguir removendo `innerHTML`.

## R69. Formulários do catálogo Admin CEO extraídos

Resumo:

- extraí os formulários de família, governança review, ofertas comerciais, modos técnicos, calibração e liberação por tenant para `web/app/domains/admin/client_catalog_form_routes.py`;
- preservei as mesmas URLs públicas, validação CSRF, acesso Admin CEO e execução auditada via `_executar_acao_admin_redirect`;
- mantive no `client_routes.py` a home/detalhe/preview do catálogo e as ações diretas de cliente;
- reduzi `web/app/domains/admin/client_routes.py` para `1697` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_catalog_form_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_catalog_form_routes.py web/app/domains/admin/client_catalog_import_routes.py web/app/domains/admin/client_catalog_lifecycle_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `cd web && PYTHONPATH=. python -m py_compile app/domains/admin/client_routes.py app/domains/admin/client_catalog_form_routes.py app/domains/admin/client_catalog_import_routes.py app/domains/admin/client_catalog_lifecycle_routes.py` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_admin_client_routes.py -q -k 'catalogo and (familia or ofertas or calibracao or liberacao or importa or lifecycle or renderiza)'` -> `6 passed, 35 deselected`;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k 'catalogo or bootstrap_catalogo'` -> `2 passed, 41 deselected`;
- `git diff --check` -> sem erros.
- `make web-ci` -> `ruff` verde, `mypy` verde em `329` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- `client_routes.py` saiu do patamar de monólito extremo e agora concentra menos regra de catálogo;
- o próximo pacote backend coerente pode extrair home/detalhe/preview do catálogo ou seguir nas ações diretas de cliente;
- se alternar para frontend, o próximo ponto é `portal_admin_surface.js`/`portal_admin_overview_surface.js` por `innerHTML` restante.

## R70. Visualização e preview do catálogo Admin CEO extraídos

Resumo:

- extraí a home, o detalhe por família e o preview PDF do catálogo para `web/app/domains/admin/client_catalog_view_routes.py`;
- preservei as mesmas URLs públicas, acesso Admin CEO, fallback auditado via `_executar_leitura_admin` e renderização dos mesmos templates;
- mantive no `client_routes.py` as ações diretas de cliente e o registro dos módulos especializados;
- reduzi `web/app/domains/admin/client_routes.py` de `1697` para `1395` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_catalog_view_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_catalog_view_routes.py web/app/domains/admin/client_catalog_form_routes.py web/app/domains/admin/client_catalog_import_routes.py web/app/domains/admin/client_catalog_lifecycle_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `python -m py_compile web/app/domains/admin/client_routes.py web/app/domains/admin/client_catalog_view_routes.py web/app/domains/admin/client_catalog_form_routes.py web/app/domains/admin/client_catalog_import_routes.py web/app/domains/admin/client_catalog_lifecycle_routes.py` -> verde;
- `PYTHONPATH=. python -m pytest web/tests/test_admin_client_routes.py -q -k 'catalogo and (preview or renderiza or familia or ofertas or calibracao or liberacao or importa or lifecycle)'` -> `7 passed, 34 deselected`;
- `PYTHONPATH=. python -m pytest web/tests/test_smoke.py -q -k 'catalogo or bootstrap_catalogo'` -> `2 passed, 41 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `330` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- `client_routes.py` agora está abaixo de `1400` linhas e perdeu o bloco de preview PDF/runtime do catálogo;
- o catálogo Admin CEO ficou dividido em visualização/preview, formulários, importação e lifecycle/status;
- o próximo pacote backend coerente é extrair ações diretas de cliente restantes, como diagnóstico/export, signatário/portfolio ou política comercial; se alternar para frontend, o próximo ponto é `portal_admin_surface.js` por `innerHTML` restante.

## R71. Catálogo contratual do tenant Admin CEO extraído

Resumo:

- extraí a sincronização do portfólio de laudos liberado por cliente para `web/app/domains/admin/client_tenant_catalog_routes.py`;
- extraí o cadastro/edição de signatários governados do tenant para o mesmo módulo;
- preservei as URLs públicas `/admin/clientes/{empresa_id}/catalogo-laudos` e `/admin/clientes/{empresa_id}/signatarios-governados`, validação CSRF, acesso Admin CEO, auditoria e redirects;
- reduzi `web/app/domains/admin/client_routes.py` de `1395` para `1280` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_tenant_catalog_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_tenant_catalog_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `python -m py_compile web/app/domains/admin/client_routes.py web/app/domains/admin/client_tenant_catalog_routes.py` -> verde;
- `PYTHONPATH=. python -m pytest web/tests/test_admin_client_routes.py -q -k 'signatario or sincroniza_portfolio'` -> `2 passed, 39 deselected`;
- `PYTHONPATH=. python -m pytest web/tests/test_smoke.py -q -k 'admin or catalogo'` -> `4 passed, 39 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `331` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- o Admin CEO separou mais claramente governança contratual de catálogo/signatário das ações gerais do cliente;
- `client_routes.py` agora concentra principalmente onboarding/lista/detalhe, política operacional, diagnóstico/export, bloqueio e troca de plano;
- o próximo pacote backend coerente é extrair o diagnóstico/export administrativo ou mover bloqueio/troca de plano para um módulo de operações sensíveis do tenant.

## R72. Diagnóstico administrativo do tenant extraído

Resumo:

- extraí o endpoint `/admin/clientes/{empresa_id}/diagnostico` para `web/app/domains/admin/client_diagnostic_routes.py`;
- preservei step-up, verificação Admin CEO, fallback quando a empresa não existe, contrato `PlatformTenantOperationalDiagnosticV1` e cabeçalho de download;
- mantive callbacks para existência da empresa e snapshot de visibilidade, evitando duplicar a regra de governança do detalhe do cliente;
- reduzi `web/app/domains/admin/client_routes.py` de `1280` para `1136` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_diagnostic_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_diagnostic_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `python -m py_compile web/app/domains/admin/client_routes.py web/app/domains/admin/client_diagnostic_routes.py` -> verde;
- `PYTHONPATH=. python -m pytest web/tests/test_admin_client_routes.py::test_admin_geral_troca_plano_reset_seguro_e_exporta_bundle_administrativo -q` -> `1 passed`;
- `PYTHONPATH=. python -m pytest web/tests/test_smoke.py -q -k 'admin or catalogo'` -> `4 passed, 39 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `332` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- o export diagnóstico saiu do monólito sem mudar contrato público;
- `client_routes.py` agora concentra principalmente onboarding/lista/detalhe, política operacional, bloqueio e troca de plano;
- o próximo pacote backend coerente é extrair bloqueio/troca de plano para um módulo de operações sensíveis do tenant ou alternar para frontend e atacar `innerHTML` restante em `portal_admin_surface.js`.

## R73. Operações sensíveis do tenant Admin CEO extraídas

Resumo:

- extraí os endpoints `/admin/clientes/{empresa_id}/bloquear` e `/admin/clientes/{empresa_id}/trocar-plano` para `web/app/domains/admin/client_tenant_sensitive_routes.py`;
- preservei URLs públicas, validação CSRF, step-up, auditoria `tenant_block_toggled`/`tenant_plan_changed`, redirects e mensagens;
- mantive `client_routes.py` como registro do roteador e fluxo de onboarding/lista/detalhe/política operacional;
- reduzi `web/app/domains/admin/client_routes.py` de `1136` para `1013` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_tenant_sensitive_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_tenant_sensitive_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `python -m py_compile web/app/domains/admin/client_routes.py web/app/domains/admin/client_tenant_sensitive_routes.py` -> verde;
- `PYTHONPATH=. python -m pytest web/tests/test_admin_client_routes.py -q -k 'motivo_para_bloqueio or troca_plano'` -> `2 passed, 39 deselected`;
- `PYTHONPATH=. python -m pytest web/tests/test_smoke.py -q -k 'admin or catalogo'` -> `4 passed, 39 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `333` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- as operações de maior risco operacional do Admin CEO saíram do monólito e ficaram isoladas em um módulo próprio com step-up obrigatório;
- `client_routes.py` está perto de sair do hotspot principal, concentrando agora onboarding/lista/detalhe e política operacional;
- o próximo pacote backend coerente é extrair política operacional por superfície para rotas próprias ou alternar para frontend e atacar `innerHTML` restante em `portal_admin_surface.js`.

## R74. Política por superfície Admin CEO extraída

Resumo:

- extraí o endpoint `/admin/clientes/{empresa_id}/politica-admin-cliente` para `web/app/domains/admin/client_surface_policy_routes.py`;
- preservei URL pública, validação CSRF, execução auditada via `_executar_acao_admin_redirect`, mensagens e formulário `AdminClienteSurfacePolicyForm`;
- mantive `web/app/domains/admin/client_surface_policy.py` como serviço de aplicação da política contratual por superfície;
- reduzi `web/app/domains/admin/client_routes.py` de `1013` para `960` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_surface_policy_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_surface_policy_routes.py web/app/domains/admin/client_surface_policy.py web/tests/test_admin_client_routes.py` -> verde;
- `python -m py_compile web/app/domains/admin/client_routes.py web/app/domains/admin/client_surface_policy_routes.py web/app/domains/admin/client_surface_policy.py` -> verde;
- `PYTHONPATH=. python -m pytest web/tests/test_admin_client_routes.py -q -k 'politica_operacional or mobile_single_operator or pacote_chat or flags_legacy'` -> `4 passed, 37 deselected`;
- `PYTHONPATH=. python -m pytest web/tests/test_smoke.py -q -k 'admin or catalogo'` -> `4 passed, 39 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `334` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- a governança de superfícies contratadas ficou fora do roteador monolítico e continua separada da gestão direta de funcionários do cliente;
- `client_routes.py` saiu abaixo de `1000` linhas e agora concentra principalmente onboarding, lista/detalhe e helpers compartilhados de detalhe/visibilidade;
- o próximo pacote coerente pode ser extrair onboarding/cadastro para módulo próprio ou alternar para frontend e atacar `innerHTML` restante em `portal_admin_surface.js`.

## R75. Onboarding Admin CEO extraído

Resumo:

- extraí `/admin/novo-cliente`, `/admin/cadastrar-empresa` e `/admin/clientes/{empresa_id}/acesso-inicial` para `web/app/domains/admin/client_onboarding_routes.py`;
- preservei o bundle temporário de credenciais, fallback legado de flash, criação de equipe inicial, compatibilidade de monkeypatch via `registrar_novo_cliente` e hot spot de acesso inicial;
- mantive `client_routes.py` como agregador de rotas e reexportando `registrar_novo_cliente` para import legado de `admin/routes.py`;
- reduzi `web/app/domains/admin/client_routes.py` de `960` para `397` linhas;
- mantive Render real como pendência externa: sem aplicar disco/plano pago e sem aguardar deploy.

Arquivos do ciclo:

- `web/app/domains/admin/client_routes.py`
- `web/app/domains/admin/client_onboarding_routes.py`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `PYTHONPATH=. python -m ruff check web/app/domains/admin/client_routes.py web/app/domains/admin/client_onboarding_routes.py web/tests/test_admin_client_routes.py` -> verde;
- `python -m py_compile web/app/domains/admin/client_routes.py web/app/domains/admin/client_onboarding_routes.py` -> verde;
- `PYTHONPATH=. python -m pytest web/tests/test_admin_client_routes.py -q -k 'cadastrar_empresa or pacote_inicial or novo_cliente'` -> `2 passed, 39 deselected`;
- `PYTHONPATH=. python -m pytest web/tests/test_smoke.py -q -k 'admin or catalogo'` -> `4 passed, 39 deselected`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `335` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- o roteador principal de clientes saiu do hotspot severo e agora concentra lista/detalhe e helpers compartilhados de visibilidade/leitura;
- o ciclo de onboarding ficou coeso em um módulo com sessão temporária, credenciais e tela de acesso inicial;
- o próximo pacote coerente é atacar `innerHTML` restante em `portal_admin_surface.js` ou fazer uma limpeza final nos helpers remanescentes de `client_routes.py`.

## R76. Resumo detalhado Admin Cliente em DOM seguro

Resumo:

- troquei o bloco `empresa-resumo-detalhado` em `web/static/js/cliente/portal_admin_surface.js` de string HTML interpolada para montagem DOM explícita;
- adicionei helpers pequenos para `hero-chip` e `feature-chip`, reaproveitando `textContent`, `dataset` e os helpers DOM já existentes;
- preservei classes, `data-*`, barra de progresso, pills, chips de capacidade e guidance visual do Admin Cliente;
- mantive Render real como pendência externa: sem aguardar deploy e sem aplicar alteração de disco/plano no provedor.

Arquivos do ciclo:

- `web/static/js/cliente/portal_admin_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_admin_surface.js` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py::test_templates_cliente_explicitam_abas_e_formularios_principais -q` -> `1 passed`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `335` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- o resumo detalhado do plano/capacidade no Portal Admin Cliente deixou de renderizar dados do tenant via `innerHTML`;
- o padrão DOM seguro usado nos cards administrativos ficou mais reaproveitável para os próximos blocos;
- `portal_admin_surface.js` ainda tem `innerHTML` em onboarding, auditoria, histórico de planos e tabela de usuários; o próximo pacote coerente é atacar auditoria/histórico ou a tabela de usuários.

## R77. Onboarding de equipe Admin Cliente em DOM seguro

Resumo:

- troquei `renderOnboardingEquipe` em `web/static/js/cliente/portal_admin_surface.js` de HTML interpolado para montagem DOM explícita;
- o resumo de primeiros acessos, sem login, bloqueios e revisores sem login agora reaproveita `criarMetricCardAdminNode`;
- a lista de pendências, estado vazio e ações rápidas agora usam `textContent`, `dataset` e helpers DOM, preservando `filtrar-usuarios-status`, `limpar-filtro-usuarios`, `toggle-user`, `reset-user` e `abrir-prioridade`;
- mantive Render real como pendência externa: sem aguardar deploy e sem aplicar alteração de disco/plano no provedor.

Arquivos do ciclo:

- `web/static/js/cliente/portal_admin_surface.js`
- `docs/STATUS_CANONICO.md`
- `PLANS.md`
- `docs/LOOP_RECUPERACAO_TARIEL_WEB.md`

Validação local executada até aqui:

- `node --check web/static/js/cliente/portal_admin_surface.js` -> verde;
- `cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py::test_templates_cliente_explicitam_abas_e_formularios_principais -q` -> `1 passed`;
- `git diff --check` -> sem erros;
- `make web-ci` -> `ruff` verde, `mypy` verde em `335` source files, `250 passed` na bateria crítica e `6 passed` em `test_tenant_access.py`;
- `make production-ops-check-strict` -> `production_ready=true`, sem blockers, com warning esperado de primeiro cleanup ainda não observado;
- `make uploads-restore-drill` -> `status=passed`, `3` arquivos verificados;
- `make hygiene-check` -> `status=ok`;
- `make verify` -> `web-ci`, `mobile-ci` e `mesa-smoke` verdes.

Impacto observado:

- o onboarding da equipe deixou de interpolar nome/e-mail/status de usuários em `innerHTML`;
- os botões de filtro rápido e ação de usuário agora preservam o mesmo contrato via `dataset`, mas sem string HTML;
- `portal_admin_surface.js` ainda tem `innerHTML` em auditoria, histórico/preview de planos e tabela de usuários; o próximo pacote coerente é atacar auditoria ou histórico de planos.
