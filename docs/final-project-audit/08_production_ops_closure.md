# 08 Production Ops Closure

Data: 2026-04-24

## O que mudou nesta fase

A operacao de producao deixou de depender de inferencia espalhada em envs e docs. Agora existe:

- configuracao central em `web/app/core/settings.py`
- resumo operacional canônico em `web/app/domains/admin/production_ops_summary.py`
- endpoint admin `GET /admin/api/production-ops/summary`
- sinal resumido no `/ready`
- check executavel: `python3 scripts/run_production_ops_check.py --json --strict`
- drill local executavel de backup/restore: `python3 scripts/run_uploads_restore_drill.py --json`

## Politica operacional explicitada

Uploads e anexos:

- storage mode canônico: `persistent_disk` em producao
- paths canônicos:
  - `PASTA_UPLOADS_PERFIS`
  - `PASTA_ANEXOS_MESA`
- retencao explicita:
  - perfis: `TARIEL_UPLOADS_PROFILE_RETENTION_DAYS`
  - anexos Mesa: `TARIEL_UPLOADS_MESA_RETENTION_DAYS`
- backup obrigatorio: `TARIEL_UPLOADS_BACKUP_REQUIRED=1`
- restore drill obrigatorio: `TARIEL_UPLOADS_RESTORE_DRILL_REQUIRED=1`
- cleanup automatico habilitado no contrato de producao do Render, com dry-run estrito em `make uploads-cleanup-check`
- observabilidade de rota crítica habilitada em produção por `TARIEL_ROUTE_OBSERVABILITY_ENABLED=1`, registrando apenas fluxos críticos lentos ou com erro 5xx

Sessao:

- politica endurecida para producao: `SESSAO_FAIL_CLOSED_ON_DB_ERROR=1`
- quando combinada com `SESSAO_CACHE_DB_REVALIDACAO_SEGUNDOS=0`, a leitura oficial passa a ser:
  - `db_authoritative_with_local_cache`
  - `multi_instance_ready = true`

## Validacao executada

Check estrito em modo producao:

- `python3 scripts/run_production_ops_check.py --json --strict`
- resultado: `production_ready = true`
- blockers: nenhum
- warning remanescente aceitavel antes da primeira execucao real: `automatic_upload_cleanup_has_not_run_yet`

Drill local de restore:

- `python3 scripts/run_uploads_restore_drill.py --json`
- resultado: `status = passed`
- arquivos verificados: `3`

## Decisao canonica

A operacao real de producao pode ser considerada **fechada com rotina executavel local**:

- storage persistente, backup, restore e sessao multi-instancia agora estao explicitados e verificaveis;
- o restore drill local verifica backup, extração e checksum de perfis, anexos da Mesa e aprendizados visuais;
- a limpeza automatica de uploads fica habilitada por env e observavel por report/runtime.
- os fluxos críticos do produto ficam visíveis nos logs de produção quando passarem do limite configurado por `TARIEL_ROUTE_OBSERVABILITY_SLOW_MS` ou falharem com erro de servidor.

## Leitura honesta

Depois desta fase, o gap principal de producao deixou de ser ambiguidade de politica. O que sobra e operacionalizar o provedor real:

- executar restore drill contra o storage externo definitivo quando ele for definido;
- acompanhar o primeiro report real do cleanup no ambiente publicado.
- consultar os primeiros logs reais de `observability_kind=critical_route` depois do deploy para calibrar o limite de lentidão.

Observação do deploy publicado em 2026-04-24:

- o serviço real publicado no workspace atual é `tariel-web-free`, service id `srv-d795sq2a214c73alec20`, em `https://tariel-web-free.onrender.com`;
- `/health` respondeu `status=ok`, banco/realtime prontos;
- `/ready` ainda respondeu `production_ops_ready=false`, `uploads_storage_mode=local_fs`, `uploads_cleanup_enabled=false` e scheduler desligado;
- portanto, o serviço `tariel-web-free` deve ser tratado como ambiente publicado/free, não como produção real fechada, até o plano/env do Render aplicar storage persistente, cleanup automático e restore drill operacional fora do workspace local.
- o contrato local equivalente continua verde em `make production-ops-check-strict`, com `TARIEL_UPLOADS_STORAGE_MODE=persistent_disk`, backup obrigatório e restore drill obrigatório.
