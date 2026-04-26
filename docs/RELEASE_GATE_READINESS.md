# Release Gate Readiness

Atualizado em `2026-04-25`.

## Escopo

Este documento separa:

- o que cada gate valida;
- o que `make release-verify` realmente precisa para rodar ponta a ponta;
- quais dependencias sao obrigatorias;
- quais checks ainda dependem de infra opcional ou cobertura condicional;
- quais falhas devem bloquear promocao.

## Diferenca entre os gates

| Target | Papel | Composicao |
| --- | --- | --- |
| `make verify` | baseline local rapida | `web-ci` + `mobile-ci` + `mesa-smoke` |
| `make release-verify-local` | gate forte local antes de promover | `verify` + `contract-check` + `hygiene-check` + `security-audit` + `binary-assets-audit-strict` + `production-ops-check-strict` + `uploads-restore-drill` + `document-contract-check` |
| `make release-verify` | gate completo de promocao | `release-verify-local` + `release-gate-real` |
| `make release-gate-hosted` | gate hospedado sem lane Android real | `verify` + `mesa-acceptance` + `document-acceptance` + `observability-acceptance` |
| `make release-gate-real` | gate real pre-deploy | `release-gate-hosted` + `smoke-mobile` + `production-ops-check-strict` + `uploads-restore-drill` + `uploads-cleanup-check` |

Observacao importante:

- `document-acceptance` nao cobre `web/tests/test_free_chat_report_pdf.py`;
- essa regressao documental entra hoje por `document-contract-check` dentro de `make release-verify-local`.

## Snapshot verde da execucao real em 2026-04-25

- `make release-verify-local`: passou.
- `make smoke-mobile`: passou.
- `make release-verify`: passou.
- reprodutibilidade em worktree limpo com `AMBIENTE=dev`: `make release-verify-local` e `make release-verify` passaram apos versionar `web/artifacts/.gitignore` e `web/artifacts/README.md`.
- `release-gate-hosted`: passou dentro do `make release-verify`.
- `mesa-acceptance`: passou.
- `document-acceptance`: passou.
- `observability-acceptance`: passou.
- `uploads-cleanup-check`: passou dentro do `make release-verify`.
- `mobile-native-preflight`: passou; o projeto nativo estava presente e o prebuild nao precisou ser reexecutado.

Artefatos finais relevantes:

- `artifacts/mobile_pilot_run/20260425_213227`: primeira rodada verde isolada de `make smoke-mobile` apos corrigir o wiring de `human_ack` da thread.
- `artifacts/mobile_pilot_run/20260425_214252`: rodada verde dentro de `make release-verify`, com `result=success_human_confirmed`.
- `artifacts/mobile_pilot_run/20260425_232916`: rodada verde de `make release-verify` em worktree limpo com `native_prebuild_executed=True`, `feed_covered=True`, `thread_covered=True` e `human_ack_recent_events_after=2`.

Evidencias finais da lane mobile:

- `feed_covered=True`.
- `thread_covered=True`.
- `operator_run_outcome=completed_successfully`.
- `operator_run_reason=required_surfaces_completed`.
- `human_ack_recent_events_after=2`.
- `v2_served_total_after=2`.
- `apk_preview_build_succeeded=True`.
- `apk_stale_detected=False`.
- `network_backend_health_host_ok=True`.
- `network_adb_reverse_configured=True`.
- `ui_runtime_flag_enabled=true`.
- `operator_route_preflight_status=ok`.

Estado consolidado:

- o gate real nao possui bloqueador aberto nesta copia local;
- o gate completo e reprodutivel em checkout/worktree limpo desde que `AMBIENTE=dev` esteja definido e as dependencias de host listadas abaixo estejam instaladas;
- a lane mobile real gera APK preview novo, instala no emulador, valida API local, executa Maestro e exige `human_ack` real para `feed` e `thread`;
- o runner continua sem sintetizar `human_ack` pelo host;
- a protecao por feature flag de producao foi preservada; as flags de rollout/admin/operator-run sao aplicadas apenas no ambiente local criado pelo runner;
- a ausencia de `human_ack` em qualquer superficie obrigatoria continua falhando a lane.

Historico dos bloqueadores corrigidos durante a normalizacao:

- projeto nativo Android ausente (`android/android`) tratado por `mobile-native-preflight`;
- versao Node incompatível para Expo/prebuild/preview tratada por selecao controlada via `nvm`;
- banco local nao deterministico tratado por SQLite temporario com schema, migrations e seed no mesmo `DATABASE_URL`;
- rota admin `/admin/api/mobile-v2-rollout/summary` indisponivel tratada por flags locais e preflight explicito;
- selector Maestro obsoleto tratado por entrada real `chat-report-pack-card-open-mesa`/`Abrir Mesa`;
- Mesa bloqueada para `inspetor@tariel.ia` tratada por leitura de entitlement `inspector_send_to_mesa`;
- APK stale tratado por abortar antes do Maestro quando `android:preview` falha;
- conectividade local tratada por build-time URLs, cleartext local de preview e `adb reverse` validado;
- flag build-time V2 do APK tratada por `EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED=1`;
- wiring final de `human_ack` da thread tratado preservando metadata V2 no caminho monitor -> activity center -> estado local raiz.

## Pre-requisitos para `make release-verify`

### Dependencias do projeto

- Python com as dependencias do workspace `web` instaladas.
- Ambiente Python gerenciado ou venv; em Ubuntu/Debian, instalar `python3.12-venv`/`ensurepip` antes de usar `python3 -m venv`.
- Node.js e `npm` com dependencias do workspace `android` instaladas.
- Node compativel com o workspace Android: `^20.19.0 || ^22.13.0 || >=24`.
- `nvm` disponivel ou Node compativel ja ativo no shell.
- `pypdf` declarado em `web/requirements.txt`.
- `playwright` e `pytest-playwright` declarados em `web/requirements.txt`.
- `adb`, `emulator` e `maestro` disponiveis no host quando a lane mobile real for executada.
- Android SDK funcional, AVD disponivel e Playwright/Chromium instalado para os E2E de `mesa-acceptance`.

Observacao sobre `pypdf`:

- ja esta declarado em [web/requirements.txt](/home/gabriel/Área%20de%20trabalho/tariel-web/web/requirements.txt:52).
- nao existe, nesta rodada, dependencia faltante para o teste de PDF no manifesto do projeto.

### Projeto nativo Android gerado

- o gate completo hoje precisa que o projeto nativo `android/android` exista antes da lane `smoke-mobile`.
- o arquivo cuja ausencia quebrou a rodada foi [android/android/app/build.gradle](</home/gabriel/Área de trabalho/tariel-web/android/android/app/build.gradle:1>).
- caminho correto a partir da raiz do repo: `android/android/app/build.gradle`
- caminho correto a partir do workspace `android`: `android/app/build.gradle`
- `make smoke-mobile` e `make mobile-acceptance` agora garantem o preflight oficial `mobile-native-preflight` antes do runner.
- a forma minima de materializar essa pasta e:

```bash
cd android
npm run android:prebuild
```

ou:

```bash
cd android
npm run android:preview:fresh
```

Sem isso, a rodada real do mobile nao chega nem a validar emulador, install ou Maestro.

Artefatos do preflight:

- estado estavel do devkit: `.tmp_online/devkit/mobile_native_preflight_status.json`
- artefato por execucao: `artifacts/mobile_native_preflight/<timestamp>/preflight_status.json`
- copia no artefato do runner quando ele inicia: `artifacts/mobile_pilot_run/<timestamp>/mobile_native_preflight.json`

### Banco local da lane mobile

- `make smoke-mobile` nao deve depender do banco default do host nem do SQLite legado `web/tariel_admin (1).db`.
- a cada execucao, `scripts/run_mobile_pilot_runner.py` cria o banco temporario `artifacts/mobile_pilot_run/<timestamp>/mobile_local.sqlite3`.
- o schema e aplicado pelo fluxo oficial existente `app.shared.database.inicializar_banco()`, com `DB_BOOTSTRAP_RUN_MIGRATIONS=1`.
- o seed minimo de usuarios vem do bootstrap dev existente com `SEED_DEV_BOOTSTRAP=1`.
- o seed especifico do piloto mobile continua em `web/scripts/seed_mobile_pilot_data.py`.
- a API local e iniciada por `scripts/start_local_mobile_api_background.sh` usando exatamente o mesmo `DATABASE_URL` temporario.
- o cwd do preparo de schema/seed e `web`; o cwd efetivo da API tambem e `web`.

Artefatos de auditoria do banco:

- `artifacts/mobile_pilot_run/<timestamp>/mobile_database_preflight.json`
- `artifacts/mobile_pilot_run/<timestamp>/mobile_database_prepare.txt`
- `artifacts/mobile_pilot_run/<timestamp>/mobile_pilot_seed.txt`
- `artifacts/mobile_pilot_run/<timestamp>/mobile_pilot_seed_payload.json`
- `artifacts/mobile_pilot_run/<timestamp>/backend_env_flags_applied.json`
- `artifacts/mobile_pilot_run/<timestamp>/operator_route_preflight.json`
- `artifacts/mobile_pilot_run/<timestamp>/final_report.md`

Campos auditados pelo preflight:

- `database_url_redacted`
- `sqlite_path`
- `db_file_exists`
- `usuarios_table_exists`
- `seed_users_present`
- `schema_prepare_executed`
- `seed_prepare_executed`
- `pilot_seed_prepare_executed`
- `cwd_prepare`
- `cwd_api`
- `backend_env_flags_applied`
- `operator_route_preflight_status`
- `summary_route.status_code`
- `summary_route.json`

### Ferramentas e permissao de host

- permissao para subir processos locais Python, Node, `uvicorn`, `adb`, `emulator` e `maestro`;
- permissao para abrir portas locais `8000`, `8081`, `19000` e `19001`;
- permissao para escrever em `artifacts/`, `.tmp_online/`, `.test-artifacts/` e `web/static/uploads/_cleanup_reports`;
- Android SDK funcional com pelo menos uma AVD disponivel;
- Chromium do Playwright disponivel para os cenarios `mesa-acceptance`.

## Variaveis de ambiente

### Obrigatorias por composicao atual

- `AMBIENTE=dev` para execucao local em checkout limpo, ou valor equivalente definido em `.env`; sem essa variavel o bootstrap de settings falha cedo com mensagem explicita de ambiente obrigatorio.
- para a lane mobile real fechar o caminho funcional completo no backend local, o runner agora injeta no proprio processo local que ele sobe:
  - `TARIEL_V2_ANDROID_PUBLIC_CONTRACT=1`
  - `TARIEL_V2_ANDROID_ROLLOUT=1`
  - `TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY=1`
  - `TARIEL_V2_ANDROID_PILOT_TENANT_KEY=<tenant resolvido da seed>`
  - `TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES=<tenant>=pilot_enabled`
  - `TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES=<tenant>:feed=promoted,<tenant>:thread=promoted`
  - `TARIEL_V2_ANDROID_FEED_ENABLED=1`
  - `TARIEL_V2_ANDROID_THREAD_ENABLED=1`
- `summary` em `/admin/api/mobile-v2-rollout/summary` exige especificamente `TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY=1`; o restante das flags acima garante o rollout V2 publico, o tenant demo do piloto e as superfícies do operator-run de forma deterministica.

Demais dependencias externas permanecem opcionais porque:

- `mesa-acceptance` sobe servidor local e banco temporario por padrao;
- `production-ops-check-strict` cai para um SQLite temporario quando `TARIEL_PRODUCTION_OPS_DATABASE_URL` nao esta definido;
- `smoke-mobile` seta `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_AUTH_WEB_BASE_URL`, `EXPO_PUBLIC_ANDROID_LOCALHOST_STRATEGY=reverse` e `EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED=1` para o APK preview local.
- `apk_build_preflight.json` registra as flags build-time seguras em `build_env_flags_applied`, incluindo `android_v2_read_contracts_enabled_for_build`.
- o runner de `smoke-mobile` tambem seta `DATABASE_URL` para o SQLite temporario da execucao, alem de `SEED_DEV_BOOTSTRAP=1` e `DB_BOOTSTRAP_RUN_MIGRATIONS=1`, antes de preparar o banco e subir a API local.

### Opcionais que mudam o comportamento da rodada

| Variavel | Uso | Observacao |
| --- | --- | --- |
| `E2E_BASE_URL` | aponta Playwright para deploy hospedado | opcional; sem ela os testes sobem servidor local |
| `E2E_USE_LOCAL_DB` | força uso de DB local no Playwright | opcional |
| `E2E_LOCAL_DATABASE_URL` | DB local do Playwright | opcional |
| `DATABASE_URL` | DB para E2E local ou outros scripts | opcional na composicao atual |
| `REDIS_URL` | habilita teste real de Redis em `test_revisor_realtime.py` | sem ela a cobertura real de Redis fica em `skip` |
| `TARIEL_PRODUCTION_OPS_DATABASE_URL` | troca o SQLite default do check de producao | opcional |
| `ANDROID_SERIAL` / `MOBILE_DEVICE_ID` | fixa device ou emulador alvo | opcional |
| `MOBILE_VISUAL` | liga modo visual do mobile | opcional |
| `MOBILE_FORCE_FRESH_BOOT` | controla cold boot do emulador | opcional |
| `MOBILE_WIPE_ON_INSTALL_RECOVERY` | controla wipe em recovery do install | opcional |
| `MOBILE_FORCE_INSTALL` | força reinstalacao do app | opcional |
| `TARIEL_V2_ANDROID_ROLLOUT` | habilita rollout Android V2 | necessario para a execucao funcional completa da lane, embora o bloqueador atual tenha surgido antes por observabilidade desligada |
| `TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY` | habilita rotas admin `/admin/api/mobile-v2-rollout/*` | obrigatoria para o operator-run da lane real |
| `TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES` | fixa estado do tenant demo na lane mobile | recomendado para execucao deterministica do piloto |
| `TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES` | fixa estados `feed`/`thread` do tenant demo | recomendado para execucao deterministica do piloto |
| `CI` | altera comportamento headless | opcional |
| `DISPLAY` / `WAYLAND_DISPLAY` | necessario apenas para modo visual | nao e requisito do modo headless |
| `SEED_INSPETOR_SENHA` / `SEED_ADMIN_SENHA` / `SEED_DEV_SENHA_PADRAO` | sobrescrevem credenciais default da lane mobile | opcionais; o runner tem fallback `Dev@123456` |

### URLs hospedadas

- `make release-verify` nao exige URL hospedada por padrao.
- se `E2E_BASE_URL` for definida, o Playwright passa a depender de um deploy que responda em `/health`.
- a lane mobile real atual usa API local `http://127.0.0.1:8000` e nao um backend hospedado.

## Servicos necessarios

### Necessarios por padrao

- servidor web local para a lane Playwright quando `E2E_BASE_URL` nao estiver definida;
- backend local em `127.0.0.1:8000` para `smoke-mobile`;
- emulador Android com AVD valida;
- runtime Maestro para automacao mobile;
- filesystem local gravavel para artefatos, uploads temporarios e restore drill.

### Nao obrigatorios hoje, mas relevantes para cobertura real

- Redis real;
- pacote externo de schemas V2 em `../Tarie 2/schemas`;
- deploy hospedado acessivel via `E2E_BASE_URL`.

## Checks dependentes de infraestrutura

| Check | Dependencia principal | Situacao atual |
| --- | --- | --- |
| `mesa-acceptance` | Playwright + Chromium + servidor local ou `E2E_BASE_URL` | executou localmente e passou |
| `document-acceptance` | Python web + artefatos locais | executou e passou |
| `observability-acceptance` | Python web + `npm` Android + subset reviewdesk | executou e passou |
| `smoke-mobile` | Android SDK + AVD + Maestro + backend local + projeto nativo `android/android` + Node compativel + SQLite temporario preparado pelo runner | passou no artefato `artifacts/mobile_pilot_run/20260425_213227` e repetiu sucesso dentro de `make release-verify` em `artifacts/mobile_pilot_run/20260425_214252` |
| `uploads-cleanup-check` | acesso ao filesystem de uploads | executou isolado e passou |
| `contract-check` | pacote externo `../Tarie 2/schemas` para cobertura completa | passa hoje com `skip` parcial quando o pacote nao existe |
| `test_revisor_realtime.py` real Redis | `REDIS_URL` | passa hoje sem essa cobertura, via `skip` |

## Falhas conhecidas

### Bloqueadores de release

- nenhum bloqueador aberto apos a rodada verde `artifacts/mobile_pilot_run/20260425_214252`.
- o `mobile-native-preflight` corrige a ausencia de `android/android`; se nao houver Node compativel com `^20.19.0 || ^22.13.0 || >=24`, a lane deve continuar bloqueando como `instalacao/build Android`.
- `no such table: usuarios` deve bloquear se reaparecer depois do preflight de banco, porque indicaria falha real de schema/seed no banco temporario da lane.
- `404` em `/admin/api/mobile-v2-rollout/summary` deve bloquear como `API route`; `401/403` deve bloquear como `autenticacao/autorizacao`; erro de conexao deve bloquear como `backend local indisponivel`.
- `feed_only_confirmed`, ausencia de request real de `human_ack` ou `thread_ack_status` diferente de `accepted` deve bloquear promocao mobile.
- se o runner for chamado direto fora do `make`, ele agora falha com mensagem operacional clara em vez de `FileNotFoundError`.

### Pendencias aceitaveis por ora

- `contract-check` ainda aceita `skip` quando o pacote externo `../Tarie 2/schemas` nao existe.
Justificativa: o gate atual continua verde por design, mas com cobertura reduzida de contrato V2.
- o teste real de Redis continua opcional via `REDIS_URL`.
Justificativa: a lane de observabilidade fecha sem Redis real, mas nao comprova o transporte Redis de ponta a ponta.
- `security-audit` continua aceitando vulnerabilidades `moderate` transitivas do stack Expo porque o threshold atual do target mobile e `high`.
Justificativa: e a politica atual do gate; o risco segue documentado, mas nao foi tratado nesta rodada.

## O que deve bloquear promocao

- falha de qualquer target que componha `make release-verify`;
- impossibilidade de executar `smoke-mobile`;
- ausencia do projeto nativo Android `android/android` sem prebuild previo ou sem auto-recuperacao do runner;
- falta de Playwright/Chromium para `mesa-acceptance`;
- falha em `production-ops-check-strict`, `uploads-restore-drill` ou `uploads-cleanup-check`.

## O que ainda pode ser aceito com ressalva

- ausencia de `REDIS_URL`, desde que a equipe aceite cobertura parcial do realtime;
- ausencia de `../Tarie 2/schemas`, desde que a equipe aceite cobertura parcial do contrato V2;
- vulnerabilidades `moderate` transitivas do Expo enquanto a politica do gate continuar em `audit-level=high`.

## Proxima rodada

- nao ha correcao obrigatoria aberta para deixar o release gate verde.
- se a proxima rodada falhar, classificar o primeiro bloqueador novo sem mascarar ausencia de `human_ack`, sem reaproveitar APK stale como sucesso e sem relaxar o operator-run.
