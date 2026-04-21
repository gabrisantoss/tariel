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
