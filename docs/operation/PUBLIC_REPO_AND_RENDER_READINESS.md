# Public Repo and Render Readiness

Data: 2026-04-28

## Objetivo

Registrar a checagem pós-publicação do repositório e do serviço Render publicado depois da landing pública com screenshots reais.

Esta rodada não altera regra de negócio, backend de emissão, NR35, permissões, dados de tenant ou plano do provedor.

## Estado Atual

- Repositório GitHub: `gabrisantoss/tariel`
- Visibilidade: público
- Serviço Render publicado: `tariel-web-free`
- Service ID: `srv-d795sq2a214c73alec20`
- URL: `https://tariel-web-free.onrender.com`
- Commit live validado: `5613ba5`
- Deploy live validado: `dep-d7og2i67r5hc7391gfpg`

## Smoke Render

Validação HTTP executada contra a URL pública:

- `/` -> `200`
- `/health` -> `200`
- `/ready` -> `200`
- `/static/css/shared/public_landing.css` -> `200`
- `/static/js/shared/public_landing.js` -> `200`
- `/static/img/landing/landing-mobile-inspetor.webp` -> `200`
- `/static/img/landing/landing-mesa-avaliadora.webp` -> `200`
- `/static/img/landing/landing-portal-cliente.webp` -> `200`
- `/static/img/landing/landing-pdf-nr35.webp` -> `200`

A landing pública foi conferida sem `Admin CEO` e sem `/admin/login`.

## `/ready` Publicado

O serviço está saudável para demo pública:

- banco: `ok`
- realtime revisor: `redis`
- realtime distribuído: `true`
- sessões multi-instância: `true`

Mas ainda não deve ser tratado como produção operacional fechada:

- `production_ops_ready=false`
- `uploads_storage_mode=local_fs`
- `uploads_cleanup_enabled=false`
- `uploads_cleanup_scheduler_running=false`

## Leitura Operacional

O serviço `tariel-web-free` continua adequado para demonstração pública e validação funcional leve.

Para piloto real com uploads, anexos, evidências e pacotes oficiais, o serviço precisa ser alinhado ao contrato production-ready:

- storage persistente em `/opt/render/project/src/web/static/uploads`;
- `TARIEL_UPLOADS_STORAGE_MODE=persistent_disk`;
- caminhos de uploads apontando para o mount persistente;
- `TARIEL_UPLOADS_CLEANUP_ENABLED=1`;
- `TARIEL_UPLOADS_BACKUP_REQUIRED=1`;
- `TARIEL_UPLOADS_RESTORE_DRILL_REQUIRED=1`;
- primeira observação real do cleanup automático;
- restore drill operacional fora do workspace local.

Não foi aplicado upgrade/plano pago/disco persistente no Render nesta rodada.

## Secret Scan Público

Foi adicionada configuração versionada para secret scanning:

- `.gitleaks.toml`
- `.gitleaksignore`
- target: `make public-repo-secret-scan`

Comando executado:

```bash
docker run --rm -v "$PWD":/repo zricethezav/gitleaks:latest detect \
  --source=/repo \
  --redact \
  --report-format=json \
  --report-path=/repo/artifacts/security/gitleaks_report_after_config.json \
  --exit-code=0
```

Resultado após configuração:

- `197 commits scanned`
- `no leaks found`

Classificação dos achados iniciais:

- O scan bruto encontrou falsos positivos de `generic-api-key` em identificadores de domínio como `family_key`, `catalog_family_key` e `template_key`.
- Dois fingerprints históricos restantes foram classificados como falsos positivos: um texto de planejamento em `PLANS.md` e a chamada `generate_totp_secret()` em `web/app/shared/db/bootstrap.py`.

Os relatórios JSON ficam em `artifacts/security/` e não devem ser commitados.

## Próximo Passo Recomendado

1. Manter `make public-repo-secret-scan` como checagem manual antes de mudanças sensíveis em repositório público.
2. Alinhar o serviço Render a produção real somente quando houver decisão operacional sobre plano/disco persistente.
3. Revalidar `/ready` até `production_ops_ready=true` antes de aceitar piloto com arquivos reais de cliente.
4. Depois do Render production-ready, executar uma emissão oficial NR35 ponta a ponta no ambiente hospedado.
