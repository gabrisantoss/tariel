# Mobile smoke real e gate de release

Data: 2026-04-04

Este documento registra a canonizacao do gate feita na Execucao 2.

Status operacional mais recente:

- consulte `docs/developer-experience/05_mobile_real_lane_debugging.md`
- consulte `docs/final-project-audit/06_mobile_host_stabilization.md`

## Comando oficial do mobile real

```bash
make smoke-mobile
```

Runner oficial:

- `scripts/run_mobile_pilot_runner.py`

Preflight oficial antes do runner:

- `make mobile-native-preflight`
- se `android/android/app/build.gradle` nao existir, o preflight executa o comando oficial `cd android && npm run android:prebuild`
- se o runner for chamado diretamente sem esse passo, ele falha com mensagem operacional clara em vez de `FileNotFoundError`
- o workspace Android declara Node `^20.19.0 || ^22.13.0 || >=24`; quando a versao ativa nao atende, o preflight usa uma versao compativel instalada via `nvm`, se existir

Flow oficial:

- `android/maestro/mobile-v2-pilot-run.yaml`

Leitura operacional:

- `make smoke-mobile` agora garante a materializacao do projeto nativo Android antes do bootstrap do runner
- caminho esperado a partir da raiz: `android/android/app/build.gradle`
- caminho esperado a partir do workspace `android`: `android/app/build.gradle`
- rodada validada em `2026-04-25`: a falha `Cannot find module '@expo/image-utils'` foi reproduzida com Node `v22.12.0`; o mesmo prebuild passou com Node `v20.20.2` e `v22.22.2`
- classificacao operacional desse bloqueio: `instalacao/build Android` por versao Node incompatível, sem necessidade de adicionar `@expo/image-utils` como dependencia direta
- apos essa correcao, `make smoke-mobile` avancou ate backend local e parou em `no such table: usuarios`
- causa raiz do bloqueio de banco: a resolucao de credenciais ainda consultava o SQLite legado `web/tariel_admin (1).db`, que pode existir vazio em checkout local, enquanto a API mobile local herdava outro `DATABASE_URL`
- a lane agora prepara um SQLite temporario proprio por execucao em `artifacts/mobile_pilot_run/<timestamp>/mobile_local.sqlite3`
- o preparo usa o bootstrap oficial `app.shared.database.inicializar_banco()` com migrations e `SEED_DEV_BOOTSTRAP=1`; o seed especifico do piloto continua em `web/scripts/seed_mobile_pilot_data.py`
- a API local mobile e iniciada com exatamente o mesmo `DATABASE_URL` temporario
- classificacao operacional se essa etapa voltar a falhar: `backend local`, especificamente schema/seed do banco temporario da lane mobile
- validacao em `2026-04-25`: o erro `no such table: usuarios` nao reapareceu; `usuarios_table_exists=true`, `seed_users_present=true`, login mobile retornou token e o proximo bloqueador foi `HTTP Error 404: Not Found` em `/admin/api/mobile-v2-rollout/summary`
- classificacao do novo bloqueador: `API route`/configuracao de backend local, com `TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY` desabilitada
- validacao seguinte em `2026-04-25`: o runner passou a resolver o tenant demo pelo proprio banco/seed local e a aplicar as flags V2 apenas no ambiente da API local que ele sobe; o artefato `operator_route_preflight.json` ficou com `operator_route_preflight_status=ok` e `/admin/api/mobile-v2-rollout/summary` respondeu `200` antes do operator-run
- tenant observado nessa rodada validada: `tenant_id=1`, `tenant_label=Empresa Demo (DEV)`; o runner nao depende mais desse valor fixo e valida o `tenant_id` real contra `mobile_pilot_seed_payload.json`
- artefatos novos da rodada local: `backend_env_flags_applied.json`, `mobile_pilot_seed_payload.json` e `operator_route_preflight.json`
- depois da correcao do backend local, a lane avancou por APK, Maestro, callback real, entrada na Mesa, APK stale e conectividade local; esses pontos agora sao auditados por `operator_run_action_diagnostics.json`, `apk_build_preflight.json` e `mobile_network_preflight.json`
- bloqueador atual investigado em `artifacts/mobile_pilot_run/20260425_203912`: `thread_opened_but_no_human_ack`; a Mesa/thread abriu, mas o APK foi compilado com `EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED` ausente, entao `ui_runtime_flag_enabled=false` e o app usou contrato legacy sem metadata de `human_ack`
- a lane real agora compila o preview local tambem com `EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED=1`; o valor fica registrado em `apk_build_preflight.json` como `android_v2_read_contracts_enabled_for_build` e em `build_env_flags_applied`
- rodada `artifacts/mobile_pilot_run/20260425_210458`: a flag build-time foi validada (`ui_runtime_flag_enabled=true`, `runtime_flag_raw_value=1`), o backend contou `v2_served` para `feed` e `thread`, e houve `human_ack` real aceito para `feed`
- bloqueador atual depois disso: `feed_only_confirmed`; a thread V2 foi servida com metadata de organic validation, mas nao houve request real de `human_ack` para `thread`; classificacao: `app mobile UI state`/wiring do ack de thread
- se `ui_runtime_flag_enabled=false` reaparecer com APK novo, classificar como `flag build-time mobile` antes de investigar o handler de thread

## Gate oficial do produto

### Baseline rapida

```bash
make verify
```

### Gate forte local antes da promocao

```bash
make release-verify-local
```

Observacao:

- esse alvo adiciona `contract-check`, `hygiene-check`, `security-audit`, `binary-assets-audit-strict`, `production-ops-check-strict`, `uploads-restore-drill` e `document-contract-check`
- `document-contract-check` exige `pypdf` instalado no Python do workspace `web`

### Gate hospedado da CI

```bash
make release-gate-hosted
```

### Gate real de release

```bash
make release-gate
```

### Gate completo de promocao

```bash
make release-verify
```

## Leitura atual

- `make verify` continua obrigatorio, mas nao representa sozinho o pronto real
- `make release-verify-local` representa o pacote forte local antes de promover
- `make release-gate-hosted` representa o pronto hospedado
- `make release-gate` continua representando o pronto real canônico
- `make release-verify` combina o gate forte local com o pronto real pré-deploy
- a lane mobile real foi estabilizada na Execucao 3 com politica oficial de cold boot
- a lane mobile real agora tambem faz preflight oficial de projeto nativo antes do smoke
- a lane mobile real prepara e audita banco local temporario antes de iniciar API, app ou Maestro

## Artefatos de banco da lane mobile

O runner registra:

- `artifacts/mobile_pilot_run/<timestamp>/mobile_database_preflight.json`
- `artifacts/mobile_pilot_run/<timestamp>/mobile_database_prepare.txt`
- `artifacts/mobile_pilot_run/<timestamp>/mobile_pilot_seed.txt`
- `artifacts/mobile_pilot_run/<timestamp>/final_report.md`

Campos essenciais:

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

Se `usuarios_table_exists` ou `seed_users_present` vierem falsos, o erro deve ser tratado como falha operacional de backend local/schema-seed, nao como falha Maestro ou emulador.

## Flags backend da lane real

Para a parte admin/operator-run da lane responder, o backend local precisa expor as rotas `/admin/api/mobile-v2-rollout/*`.

Flags confirmadas no codigo para a lane funcional completa:

- `TARIEL_V2_ANDROID_PUBLIC_CONTRACT=1`
- `TARIEL_V2_ANDROID_ROLLOUT=1`
- `TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY=1`
- `TARIEL_V2_ANDROID_PILOT_TENANT_KEY=<tenant resolvido no banco local>`
- `TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES=<tenant>=pilot_enabled`
- `TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES=<tenant>:feed=promoted,<tenant>:thread=promoted`
- `TARIEL_V2_ANDROID_FEED_ENABLED=1`
- `TARIEL_V2_ANDROID_THREAD_ENABLED=1`

Leitura correta dessas flags:

- `summary` em `/admin/api/mobile-v2-rollout/summary` exige `TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY=1` e sessao admin valida
- o rollout V2 do app exige `TARIEL_V2_ANDROID_PUBLIC_CONTRACT=1` e `TARIEL_V2_ANDROID_ROLLOUT=1`
- o operator-run usa `TARIEL_V2_ANDROID_PILOT_TENANT_KEY` para escolher o tenant demo e depende das superfícies `feed`/`thread` estarem promovidas por `TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES`
- `TARIEL_V2_ANDROID_FEED_ENABLED` e `TARIEL_V2_ANDROID_THREAD_ENABLED` ja nascem `1` por default no backend, mas o runner agora seta ambos explicitamente para evitar drift local

Regra operacional do runner:

- essas flags nao sao persistidas no repo nem mudam logica de producao
- elas sao aplicadas apenas no ambiente do processo local criado por `scripts/run_mobile_pilot_runner.py`
- o runner falha cedo se `mobile_pilot_seed_payload.json` devolver tenant diferente do tenant usado nas flags locais

## Preflight das rotas admin

Depois de subir a API local e autenticar no admin, o runner agora executa um preflight explicito antes de iniciar o operator-run:

- rota validada: `GET /admin/api/mobile-v2-rollout/summary`
- rota adicional validada: `GET /admin/api/mobile-v2-rollout/operator-run/status`
- artefato: `artifacts/mobile_pilot_run/<timestamp>/operator_route_preflight.json`

Campos auditados:

- `rollout_observability_enabled`
- `rollout_enabled`
- `rollout_state_overrides`
- `rollout_surface_state_overrides`
- `backend_env_flags_applied`
- `operator_route_preflight_status`
- `summary_route.status_code`
- `summary_route.json`

Classificacao do preflight:

- `200`: continua
- `404`: `API route`, com rota e flags registradas no artefato
- `401/403`: `autenticacao/autorizacao`
- erro de conexao: `backend local indisponivel`
- outro status: `unexpected_http_status`
