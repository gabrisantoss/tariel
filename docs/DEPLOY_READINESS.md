# Deploy Readiness

Atualizado em `2026-04-26`.

## Objetivo

Esta matriz prepara o release candidate tecnico para revisao e para validacao em staging/producao real. Ela nao altera feature, gate, runner, smoke mobile, seed, flags, banco ou build Android.

Estado de partida:

- `make release-verify-local` e `make release-verify` ja ficaram verdes e reprodutiveis em checkout limpo com `AMBIENTE=dev`.
- O blueprint de producao atual fica em `render.yaml` e usa `rootDir: web`.
- O deploy alvo roda `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`.
- O health check configurado no Render usa `/health`; a aplicacao tambem expoe `/ready` com verificacao de banco, realtime, storage, cleanup e sessoes.

## Validacao local desta rodada

Executado em `2026-04-26`:

- `git diff --check`: passou sem saida.
- `git status --short --branch`: branch `release-gate-mobile-smoke-hardening`, upstream `origin/release-gate-mobile-smoke-hardening`, `ahead 1`; apenas `PLANS.md` e `docs/DEPLOY_READINESS.md` aparecem como mudancas intencionais de documentacao.
- `AMBIENTE=dev make release-verify-local`: passou.
- `AMBIENTE=dev make release-verify`: passou.

Evidencia mobile final:

- artefato: `artifacts/mobile_pilot_run/20260426_075416`;
- `result=success_human_confirmed`;
- `feed_covered=True`;
- `thread_covered=True`;
- `human_ack_recent_events_after=2`;
- `apk_preview_build_succeeded=True`;
- `apk_stale_detected=False`;
- `native_prebuild_executed=False`, porque `android/android` ja estava materializado;
- `network_backend_health_host_ok=True`;
- `network_adb_reverse_configured=True`;
- `operator_route_preflight_status=ok`.

Observacoes da rodada:

- `contract-check` manteve `2 skipped` por ausencia do pacote externo `../Tarie 2/schemas`, como documentado abaixo.
- `npm audit --omit=dev --audit-level=high` retornou exit code verde, mas ainda reporta vulnerabilidades `moderate` transitivas do stack Expo.
- `production-ops-check-strict` ficou `production_ready=true` com warning esperado `automatic_upload_cleanup_has_not_run_yet` no ambiente local equivalente.
- `uploads-cleanup-check` passou em dry-run estrito e gerou relatorio ignorado em `web/static/uploads/_cleanup_reports/uploads_cleanup_20260426_075856.json`.

## Infraestrutura alvo

| Componente | Estado no repo | Classificacao | Nota de readiness |
| --- | --- | --- | --- |
| Web service Render `tariel-web` | `type: web`, `runtime: python`, `plan: starter`, `rootDir: web` | requisito de infraestrutura | Necessario para staging/producao. Validar build, start, logs e health real no Render. |
| PostgreSQL Render `tariel-web-db` | `plan: free` em `render.yaml` | bloqueador de producao real | Suficiente para staging tecnico, mas producao com dados reais precisa plano pago, PITR/logical backup e procedimento de restore testado. |
| Render Key Value `tariel-web-realtime` | `plan: free`, `maxmemoryPolicy: allkeys-lru` | requisito de infraestrutura | Necessario quando `REVISOR_REALTIME_BACKEND=redis`. Para producao com realtime multi-instancia, preferir plano pago ou aceitar explicitamente ausencia de persistencia do plano free. |
| Disco persistente de uploads | `tariel-web-uploads`, mount `/opt/render/project/src/web/static/uploads`, `sizeGB: 5` | requisito de infraestrutura | Obrigatorio para anexos, fotos de perfil e aprendizado visual. Validar capacidade e snapshots antes de dados reais. |
| Playwright/Chromium | requerido por `mesa-acceptance` | requisito de infraestrutura | Bloqueia gate completo se Chromium nao estiver instalado no host de validacao. |
| Android SDK, AVD, ADB, Maestro | requerido por `smoke-mobile` | requisito de infraestrutura | Bloqueia `make release-verify` quando a lane real mobile nao puder executar. |

## Variaveis obrigatorias de producao

| Variavel | Obrigatoria quando | Valor esperado / origem |
| --- | --- | --- |
| `AMBIENTE` | sempre em producao/staging production-like | `production`, `prod` ou `producao`; `render.yaml` define `production`. |
| `DATABASE_URL` | sempre | Vem do banco Render via `fromDatabase`. Para producao real, usar banco pago. |
| `CHAVE_SECRETA_APP` | sempre em producao | Segredo com pelo menos 32 caracteres; a app aborta startup em producao se ausente ou curta. |
| `PYTHON_VERSION` | Render | `3.12.3` no blueprint atual. |
| `PORT` | Render | Injetada pela plataforma e consumida no start command do Uvicorn. |
| `DB_SQLALCHEMY_DRIVER` | Postgres Render | `pg8000` no blueprint atual. |
| `DB_SSLMODE` | Postgres Render | `disable` no blueprint atual; validar contra politica de conexao do banco alvo antes de producao real. |
| `DB_BOOTSTRAP_RUN_MIGRATIONS` | deploy com migracoes automaticas | `1` no blueprint atual. Exige revisao do historico Alembic antes do primeiro deploy real. |
| `PASTA_UPLOADS_PERFIS` | uploads persistentes | `/opt/render/project/src/web/static/uploads/perfis`. |
| `PASTA_ANEXOS_MESA` | anexos da Mesa | `/opt/render/project/src/web/static/uploads/mesa_anexos`. |
| `PASTA_APRENDIZADOS_VISUAIS_IA` | aprendizado visual | `/opt/render/project/src/web/static/uploads/aprendizados_ia`. |
| `TARIEL_UPLOADS_STORAGE_MODE` | producao | `persistent_disk`. |
| `TARIEL_UPLOADS_BACKUP_REQUIRED` | producao | `1`. |
| `TARIEL_UPLOADS_RESTORE_DRILL_REQUIRED` | producao | `1`. |
| `SESSAO_FAIL_CLOSED_ON_DB_ERROR` | producao | `1`, para nao aceitar sessao quando revalidacao no banco falhar. |
| `REDIS_URL` | quando `REVISOR_REALTIME_BACKEND=redis` | Vem do Render Key Value via `fromService`. Ausencia quebra o backend Redis ou degrada conforme fail-closed. |
| `REVISOR_REALTIME_BACKEND` | realtime distribuido | `redis` no blueprint atual. |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | primeiro deploy em banco vazio | Segredos temporarios para criar primeiro Admin CEO. Remover/rotacionar apos primeiro acesso criado e confirmado. |
| `CHAVE_API_GEMINI` | produto com IA habilitada | Obrigatoria para chat/IA em producao real. Sem ela, a aplicacao sobe, mas recursos de IA ficam indisponiveis. |

## Variaveis opcionais ou condicionais

| Variavel | Uso | Classificacao |
| --- | --- | --- |
| `APP_HOST_PUBLICO` | fixa host publico usado por links e verificacao publica | requisito de infraestrutura para dominio customizado; sem ela a app usa `RENDER_EXTERNAL_HOSTNAME` ou default. |
| `ALLOWED_HOSTS` | restringe hosts aceitos | melhoria pos-release se dominio customizado ainda nao estiver fechado; validar antes de go-live publico. |
| `SESSION_COOKIE_NAME` / `SESSION_MAX_AGE` | politica de sessao | opcional, blueprint ja fixa nome do cookie. |
| `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE` | tuning de pool Postgres | requisito de capacidade, nao bloqueia RC tecnico. |
| `DB_BOOTSTRAP_BLOCKING_STARTUP` | startup bloqueante vs background | risco aceito documentado; blueprint usa background (`0`), entao `/ready` deve ser usado na validacao pos-deploy. |
| `REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP` | falha fechada quando Redis nao inicia | risco aceito documentado; blueprint usa `0`, permitindo degradacao local do realtime. |
| `REVISOR_REALTIME_CHANNEL_PREFIX` | namespace Redis | opcional; usar prefixo diferente por ambiente se staging/producao dividirem Key Value. |
| `GOOGLE_APPLICATION_CREDENTIALS` | OCR/Vision | requisito se OCR estiver no escopo do deploy. Nao versionar JSON de credencial. |
| `BOOTSTRAP_ADMIN_NOME`, `BOOTSTRAP_EMPRESA_NOME`, `BOOTSTRAP_EMPRESA_CNPJ` | seed inicial platform | opcional, com defaults no blueprint. |
| `SUPORTE_WHATSAPP` | contato exibido nos portais | opcional, mas deve ser real antes de validacao comercial. |
| `OTEL_ENABLED`, `OTEL_EXPORTER_MODE`, `OTEL_EXPORTER_OTLP_ENDPOINT` | tracing OpenTelemetry | melhoria pos-release se nao houver backend de observabilidade externo. |
| `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE` | erros e traces Sentry | melhoria pos-release; recomendado para staging/producao real. |
| `TARIEL_BROWSER_ANALYTICS_ENABLED`, `TARIEL_BROWSER_REPLAY_ENABLED` | analytics/replay browser | opcional; exige politica de privacidade/consentimento. |
| `TARIEL_V2_ANDROID_*` | rollout Android V2 | requisito apenas para rollout real mobile; nao deve ser alterado nesta fase. |
| `E2E_BASE_URL` | aponta Playwright para deploy hospedado | requisito de validacao de staging/producao, nao de build. |

## Banco de dados

Estado atual:

- `DATABASE_URL` vem de `render.yaml` via `fromDatabase`.
- O runtime normaliza `postgres://` e `postgresql://` para SQLAlchemy com driver configuravel.
- `DB_BOOTSTRAP_RUN_MIGRATIONS=1` no blueprint executa Alembic no bootstrap.
- `DB_BOOTSTRAP_BLOCKING_STARTUP=0` permite app viva enquanto o bootstrap tenta em background; `/ready` reporta `503` enquanto o banco nao estiver pronto.

Readiness:

- Para staging tecnico, o banco free do blueprint pode ser usado se nao houver dado real e se o objetivo for apenas validar deploy.
- Para producao real, banco `free` e falta de PITR/logical backup gerenciado bloqueiam go-live com dados de cliente.
- Antes de producao real, executar um restore real isolado: criar backup/export, restaurar em banco novo, apontar staging para o banco restaurado e validar login, laudos, Mesa e emissao.

## Redis / realtime

Estado atual:

- `render.yaml` provisiona Render Key Value `tariel-web-realtime`.
- `REDIS_URL` e injetado no web service por `fromService`.
- `REVISOR_REALTIME_BACKEND=redis`.
- `REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP=0`, portanto falha de Redis pode degradar para transporte local em vez de abortar startup.

Classificacao:

- Ausencia de `REDIS_URL` no gate local continua risco aceito documentado.
- Ausencia de Redis real em staging/producao e requisito de infraestrutura nao atendido.
- Para producao multi-instancia ou realtime critico da Mesa, Redis degradado deve bloquear validacao pos-deploy.

## Storage e uploads

Estado atual:

- O disco persistente Render monta em `/opt/render/project/src/web/static/uploads`.
- Perfis, anexos da Mesa e aprendizado visual ficam sob esse mount.
- `TARIEL_UPLOADS_STORAGE_MODE=persistent_disk` e obrigatorio em producao pelo check estrito.

Readiness:

- Confirmar no Render que o disco esta anexado ao web service correto e montado no path do blueprint.
- Confirmar tamanho inicial de `5 GB` contra uso esperado de fotos/anexos; aumentar antes de carga real se necessario.
- Confirmar que o rollback de codigo nao reverte estado do disco. Se um deploy escrever arquivo incompatível, o rollback exige procedimento de cleanup/restore de storage separado.

## Cleanup

Estado atual:

- `TARIEL_UPLOADS_CLEANUP_ENABLED=1`.
- Grace period: `14` dias.
- Intervalo: `24` horas.
- Max deletions por execucao: `200`.
- `make uploads-cleanup-check` roda dry-run estrito.
- `make final-product-stamp` adiciona `post-deploy-cleanup-observation`, mas essa observacao real ainda nao faz parte do gate pedido aqui.

Readiness:

- Pre-deploy: executar `uploads-cleanup-check` dentro de `make release-verify`.
- Pos-deploy: observar no `/ready` e logs se scheduler esta rodando, se `uploads_cleanup_last_status` nao esta em atencao e se nao ha delecao inesperada.
- Antes de `uploads-cleanup-apply` manual, capturar backup do disco/uploads.

## Backup e restore

Banco:

- Produção real exige Postgres pago com PITR e/ou logical export.
- O plano free do blueprint bloqueia go-live com dados reais porque nao entrega a politica minima de recovery.
- Restore esperado: recuperar em banco novo, validar isoladamente, trocar `DATABASE_URL`/binding para o banco restaurado e manter o banco antigo ate confirmacao.

Uploads:

- `make uploads-restore-drill` valida backup/restore local de perfis, anexos e aprendizado visual.
- Em Render, snapshots de disco ajudam, mas restaurar snapshot descarta mudancas posteriores e nao substitui backup operacional externo quando houver dado real.
- Produção real exige procedimento de export/retencao para uploads fora do repo, com manifesto de data, origem, destino e checksum.

## Health checks

Endpoints:

- `/health`: retorna status basico da app, versao, ambiente, rate-limit storage e estado do realtime. E o endpoint configurado em `render.yaml`.
- `/ready`: consulta banco, production ops, storage, cleanup, sessoes e realtime. Deve ser usado na validacao pos-deploy e em staging production-like.

Classificacao:

- `healthCheckPath: /health` nao bloqueia RC tecnico.
- Para producao real, a equipe deve decidir se muda para `/ready` ou se mantem `/health` para evitar falso negativo durante bootstrap background. A decisao precisa estar documentada antes de go-live.

## Logs e observabilidade

Estado atual:

- A app configura logging production-safe e rota de observabilidade lenta/5xx via `TARIEL_ROUTE_OBSERVABILITY_ENABLED=1`.
- OpenTelemetry e Sentry existem como opcionais: `OTEL_*` e `SENTRY_*`.
- Render fornece logs e metricas no dashboard; retencao e streaming dependem do plano do workspace.

Readiness:

- Pre-deploy: confirmar que logs nao vazam payload tecnico sensivel nem credenciais.
- Pos-deploy: filtrar logs por `critical`, `error`, `warning`, status `5xx`, `/ready`, `db_bootstrap`, `revisor_realtime` e `uploads_cleanup`.
- Para producao real, configurar destino externo de logs/metricas ou aceitar explicitamente a retencao do plano Render.

## Rollback

Rollback de codigo:

- Usar rollback de deploy no Render para voltar ao deploy anterior quando a falha for apenas codigo/build.
- Confirmar que o commit anterior e compativel com o schema de banco atual antes de rollback.

Rollback de banco:

- Se migracao ou dado quebrar producao, preferir restore/PITR para banco novo e troca controlada de `DATABASE_URL`.
- Nunca tratar rollback de codigo como rollback de dados.

Rollback de storage:

- Rollback de codigo nao reverte uploads.
- Restore de snapshot de disco perde mudancas posteriores ao snapshot; usar apenas com janela de impacto aceita e backup separado.

Rollback mobile:

- Esta fase nao altera rollout mobile. Se staging/producao usar Android V2 real, rollback deve ser feito por flags/allowlists existentes e por publicacao/instalacao de build anterior fora desta tarefa.

## Diferencas entre gate local e producao real

| Tema | Gate local verde | Producao/staging real |
| --- | --- | --- |
| Ambiente | `AMBIENTE=dev` | `AMBIENTE=production`; docs/debug desabilitados e segredo obrigatorio. |
| Banco | SQLite temporario em lanes especificas e Postgres local conforme env | Postgres Render real, migracoes e conexoes reais. |
| Redis | teste real fica em `skip` sem `REDIS_URL` | Redis/Key Value deve existir quando backend realtime for `redis`. |
| Playwright | servidor local por padrao; `E2E_BASE_URL` opcional | `E2E_BASE_URL` deve apontar staging/producao para validar deploy hospedado. |
| Mobile smoke | API local em `127.0.0.1:8000`, ADB reverse, APK preview local | Nao prova backend hospedado nem distribuicao real de app. |
| Storage | filesystem local e drills em `.test-artifacts` | disco persistente real e politicas de snapshot/export. |
| Backup | drill local de uploads | PITR/logical backup real do banco e backup externo de uploads. |
| Observabilidade | logs locais e acceptance scripts | logs/metricas Render e integracoes externas se configuradas. |
| Rollback | git/worktree local | rollback Render + compatibilidade de banco/storage. |

## Pendencias classificadas

| Pendencia | Classificacao para RC tecnico | Classificacao para producao real | Recomendacao |
| --- | --- | --- | --- |
| Schemas V2 externos em `../Tarie 2/schemas` ausentes | risco aceito documentado | melhoria pos-release, ou requisito se contrato V2 externo virar criterio de go-live | Manter skip documentado; antes de ampliar contrato V2, versionar/pacotar schemas ou tornar dependencia explicita no ambiente de CI. |
| Redis real via `REDIS_URL` ausente no host local | risco aceito documentado | requisito de infraestrutura | Validar staging com Redis real e `/ready`; se realtime for critico, mudar fail-closed para bloquear degradacao. |
| Vulnerabilidades `moderate` Expo transitivas | risco aceito documentado | risco aceito documentado ate mudar politica | `npm audit --omit=dev --audit-level=moderate` reporta `postcss <8.5.10` e `uuid <14.0.0` via Expo; fix automatico sugere downgrade/breaking change para `expo@49.0.23`. Nao corrigir nesta fase. |
| Playwright/Chromium | requisito de infraestrutura | requisito de infraestrutura | Instalar browsers no host de validacao; ausencia bloqueia `mesa-acceptance`/`release-verify`. |
| `AMBIENTE=dev` no gate local | risco aceito documentado | nao aplicavel | O gate local prova reproducibilidade tecnica, nao equivalencia total de producao. Staging deve rodar com `AMBIENTE=production`. |
| Banco Render `free` | nao bloqueia RC tecnico | bloqueador de producao real | Subir plano pago antes de dados reais para PITR/logical backups. |
| `REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP=0` | risco aceito documentado | risco aceito ou bloqueador conforme SLA de realtime | Para go-live multi-instancia, validar se degradacao local e aceitavel; se nao for, exigir fail-closed. |
| `healthCheckPath: /health` em vez de `/ready` | risco aceito documentado | melhoria pos-release antes de endurecer deploy | Usar `/ready` em validacao manual/automatica; decidir depois se o health do Render deve ser mais estrito. |
| Observabilidade externa (`SENTRY_DSN`/OTEL) ausente | melhoria pos-release | requisito de infraestrutura para operacao 24/7 | Configurar pelo menos erro/alerta externo antes de clientes reais. |
| Backup externo de uploads | risco aceito no RC tecnico | bloqueador de producao real | Definir armazenamento externo/retencao/checksum e executar restore drill real. |

## Checklist pre-deploy

- Confirmar `git status --short --branch` limpo ou com apenas docs de readiness intencionais.
- Confirmar que artifacts, APKs, SQLite, logs e caches continuam ignorados e nao rastreados.
- Rodar `git diff --check`.
- Rodar `AMBIENTE=dev make release-verify-local`.
- Rodar `AMBIENTE=dev make release-verify` no host com Android SDK, AVD, Maestro e Playwright/Chromium.
- Validar que `render.yaml` aponta para o branch/commit correto e que `rootDir: web` continua correto.
- Provisionar staging com `AMBIENTE=production`, `DATABASE_URL`, `REDIS_URL`, `CHAVE_SECRETA_APP`, storage persistente e secrets de IA conforme escopo.
- Para banco vazio, definir `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD`, criar primeiro acesso, confirmar login e entao rotacionar/remover secrets temporarios.
- Se houver dominio customizado, definir `APP_HOST_PUBLICO` e `ALLOWED_HOSTS` e validar HTTPS/hosts.
- Definir politica de backup de banco e uploads antes de dados reais.

## Checklist pos-deploy

- Confirmar deploy ativo no Render no commit esperado.
- Acessar `/health` e verificar `status=ok`, ambiente, versao e estado do realtime.
- Acessar `/ready` e exigir `status=ok`, `banco=ok`, `production_ops_ready=true`, storage persistente pronto, cleanup scheduler rodando e sessoes multi-instancia prontas.
- Validar login Admin CEO, Admin Cliente, Inspetor e Revisor em staging.
- Validar fluxo minimo: criar/abrir laudo, enviar mensagem, enviar Mesa, responder/aprovar na Mesa, emitir/baixar PDF quando escopo exigir.
- Rodar Playwright hospedado com `E2E_BASE_URL=<url-staging>` para os cenarios de Mesa.
- Se mobile fizer parte do staging, validar backend hospedado separadamente da lane local do `smoke-mobile`.
- Conferir logs Render por `critical`, `error`, `warning`, `5xx`, `db_bootstrap`, `revisor_realtime`, `uploads_cleanup` e latencias lentas.
- Confirmar que nenhum artifact local, APK, SQLite, log ou cache entrou no Git apos a rodada.
- Registrar decisao: promover, manter staging em observacao, rollback de codigo ou rollback/restore de dados.

## Proximos passos recomendados

1. Abrir PR tecnico com os tres commits atuais da branch de release gate, incluindo este documento em commit separado de readiness.
2. Subir staging Render a partir do PR/branch e validar `/health`, `/ready`, logs e Playwright com `E2E_BASE_URL`.
3. Antes de producao real, trocar o Postgres `free` por plano pago com recovery, definir backup externo de uploads e executar restore drill real.
4. Decidir se Redis degradado e `/health` como health check do Render sao riscos aceitos ou se devem virar endurecimentos antes do go-live.
