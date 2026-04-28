# UX-I — Auditoria visual global pós-polish

Data: 2026-04-28

## Escopo

Esta rodada fecha o recorte de QA visual do UX-I com foco em uma correção pequena encontrada no mobile nativo, sem ampliar regra de negócio ou criar nova frente visual.

Superfícies auditadas como evidência local:

- Portal Cliente em desktop e viewport mobile web.
- Chat Inspetor e thread de caso.
- Mesa Avaliadora.
- Admin CEO.
- PDF/documentos por QA documental rápida.
- Mobile nativo em aparelho físico.

Artefatos locais:

- Screenshots e inventário web: `artifacts/final_visual_audit/ux_i_after/`
- Inventário visual: `artifacts/final_visual_audit/ux_i_after/visual_inventory_after.json`
- Screenshots mobile nativos: `artifacts/final_visual_audit/ux_i_after/mobile_native/`
- QA documental/PDF: `artifacts/document_pdf_qa/20260428_095414/`

Os artefatos acima são evidência local e não foram versionados neste PR.

## Mobile Nativo

Estado final: aprovado com P1 visual corrigido.

- Device usado: `RQCW20887GV` / `SM_S918B`.
- O aparelho foi autorizado no `adb`, recebeu APK preview e executou o smoke canônico via Maestro.
- Screenshots capturados localmente:
  - `canonical-pre-laudo-card.png`
  - `canonical-pre-laudo-mesa.png`
  - `canonical-pre-laudo-finalizar.png`
  - `pilot-run-shell.png`
  - `pilot-run-history-open.png`
  - `pilot-run-history-search-applied.png`
  - `pilot-run-history.png`

Achado corrigido:

- A aba `Finalizar` podia comprimir o título/status em uma coluna estreita quando o badge “Pendências antes do PDF” disputava largura com o título.
- A correção empilha o topo do hero de finalização para manter título, status e ações legíveis em tela real.

Arquivo versionado da correção:

- `android/src/features/styles/chatThreadStyles.ts`

## Ambiente Mobile

O build preview Android precisou rodar com Node `22.22.2`.

- Node `22.12.0` falhou no bundle Expo/Gradle com erro de resolução de `@expo/metro/metro-config`.
- Node `22.22.2` gerou o bundle e instalou o APK corretamente.

Comando Maestro executado no aparelho:

```bash
PATH="/home/gabriel/.nvm/versions/node/v22.22.2/bin:$PATH" \
/home/gabriel/.nvm/versions/node/v22.22.2/bin/node \
scripts/run_mobile_maestro_smoke.cjs \
  --preview \
  --device RQCW20887GV \
  --flow android/maestro/pre-laudo-canonical-smoke.yaml
```

Observação: os flows Maestro versionados não foram alterados neste PR.

## Validação

- `cd android && PATH="/home/gabriel/.nvm/versions/node/v22.22.2/bin:$PATH" npm run typecheck`
- `cd android && PATH="/home/gabriel/.nvm/versions/node/v22.22.2/bin:$PATH" npm run lint`
- `cd android && PATH="/home/gabriel/.nvm/versions/node/v22.22.2/bin:$PATH" npm run format:check`
- `cd android && PATH="/home/gabriel/.nvm/versions/node/v22.22.2/bin:$PATH" npx jest src/features/chat/ThreadFinalizationCard.test.tsx src/features/chat/ThreadHeaderControls.test.tsx --runInBand`
- Maestro no device físico `RQCW20887GV`
- `git diff --check`

## Gaps Restantes

- Capturar um PDF NR35 real emitido como imagem/PDF de referência final antes de demonstração comercial.
- Fazer uma rodada futura específica para screenshots web se for necessário transformar os artefatos locais em checklist formal de homologação.

## Regra De Negócio

Não houve alteração de regra de negócio, backend, endpoints, permissões, emissão oficial, NR35 validator, release gate, Maestro flow versionado ou human_ack.
