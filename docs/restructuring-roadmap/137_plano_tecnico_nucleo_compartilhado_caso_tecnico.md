# Plano Técnico - Núcleo Compartilhado do Caso Técnico

Data de referência: `2026-04-23`
Base: `docs/STATUS_CANONICO.md`, `web/app/ARCHITECTURE.md`, `web/app/domains/chat/ARCHITECTURE.md`, `PROJECT_MAP.md`, `PLANS.md`

## Objetivo

Consolidar o `caso técnico` como núcleo compartilhado explícito do produto, reduzindo regra espalhada entre `chat`, `revisor`, `cliente`, `mobile` e camadas legadas.

Na prática, esta frente deve fazer o sistema falar uma língua mais única para:

- lifecycle;
- ownership;
- ações permitidas;
- transições;
- sinais operacionais de UI;
- payloads compartilhados entre superfícies.

## Resultado esperado

Ao final desta frente:

- o estado do caso deixa de depender de inferência local excessiva;
- backend e superfícies consomem contratos mais explícitos e previsíveis;
- `chat`, `mesa`, `cliente` e `mobile` compartilham o mesmo conjunto de campos centrais;
- hotspots ligados ao caso técnico ficam menores e menos acoplados;
- a próxima frente documental passa a depender menos de compat layers.

## Problema atual resumido

O projeto já tem materialização real do lifecycle canônico, mas o núcleo ainda aparece fragmentado em vários lugares:

- `laudo_state_helpers.py`
- payloads legados e V2
- projeções de inspetor
- resumo da mesa
- contratos do revisor
- payloads mobile
- campos derivados em `cliente`

O sistema funciona, mas ainda existe custo estrutural por:

- campos semelhantes sendo montados em mais de um domínio;
- fallback entre `snapshot`, `laudo_card` e payload legado;
- lógica de fase/ownership repetida em pontos diferentes;
- projeções com responsabilidade misturada entre contrato, adaptação e compatibilidade;
- dependência de heurística no frontend quando o backend poderia afirmar o estado.

## Decisões de produto já assumidas

### 1. O `caso técnico` é a unidade principal

Tudo gira em torno dele, não do chat bruto, da mesa isolada ou do PDF final.

### 2. O ownership é híbrido por estado

Logo, `active_owner_role` e `case_lifecycle_status` não são detalhe de UI. São contrato central.

### 3. As superfícies devem ler o mesmo estado

`inspetor`, `mesa`, `admin-cliente` e `mobile` devem convergir na leitura do mesmo caso.

### 4. Ações permitidas e transições devem vir do backend

O frontend não deve ser o lugar principal da regra de negócio do lifecycle.

## Arquivos principais da frente

### Núcleo atual do caso técnico

- `web/app/domains/chat/laudo_state_helpers.py`
- `web/app/domains/chat/laudo_workflow_support.py`
- `web/app/domains/chat/laudo_decision_services.py`
- `web/app/domains/chat/laudo_status_response_services.py`
- `web/app/domains/chat/chat_service.py`
- `web/app/domains/chat/mesa_mobile_support.py`
- `web/app/domains/chat/mesa_thread_routes.py`

### Projeções e contratos

- `web/app/v2/acl/technical_case_core.py`
- `web/app/v2/case_runtime.py`
- `web/app/v2/contracts/projections.py`
- `web/app/v2/adapters/android_case_feed.py`
- `web/app/v2/adapters/android_case_thread.py`
- `web/app/domains/mesa/contracts.py`
- `web/app/domains/revisor/service_contracts.py`

### Superfícies consumidoras

- `web/static/js/inspetor/workspace_status_payload.js`
- `web/static/js/inspetor/workspace_mesa_status.js`
- `web/static/js/inspetor/governance.js`
- `web/static/js/cliente/portal_mesa_surface.js`
- `android/src/features/...` que consomem snapshot e projection

### Testes principais

- `web/tests/test_regras_rotas_criticas.py`
- `web/tests/test_mesa_mobile_sync.py`
- `web/tests/test_tenant_entitlements_critical.py`
- `web/tests/e2e/test_portais_playwright.py`

## Estratégia

Esta frente não deve tentar “migrar tudo” de uma vez.

A estratégia correta é:

1. centralizar os campos canônicos mínimos;
2. consolidar builders de estado/phase/action;
3. reduzir fallback nos consumidores;
4. só depois começar a extrair módulos mais profundos.

## Campos centrais que precisam convergir

O contrato mínimo comum deve girar em torno de:

- `case_lifecycle_status`
- `case_workflow_mode`
- `active_owner_role`
- `status_visual_label`
- `allowed_surface_actions`
- `allowed_lifecycle_transitions`
- `allowed_next_lifecycle_statuses`
- `review_phase`
- `review_phase_label`
- `next_action_label`
- `next_action_summary`

## Slices recomendados

### Slice 1. Consolidar o pacote mínimo de estado do caso

Objetivo:
- fazer existir um builder único e reaproveitável do pacote operacional mínimo do caso

Mudanças:
- reunir em um único ponto a montagem dos campos centrais do caso
- evitar que cada domínio remonte manualmente:
  - lifecycle
  - owner
  - status visual
  - ações permitidas
  - fase da revisão
- reduzir duplicação entre `laudo_state_helpers`, `service_messaging`, `mesa_mobile_support` e projections

Critério de pronto:
- qualquer payload importante do caso passa a derivar esses campos do mesmo builder central

### Slice 2. Padronizar fases operacionais acima do lifecycle bruto

Objetivo:
- tornar mais claro o nível “operacional” do caso, além do status canônico cru

Mudanças:
- distinguir melhor:
  - fase do caso
  - fase da revisão
  - ownership
  - ação esperada
- reduzir a necessidade de o frontend interpretar combinações de campos

Critério de pronto:
- UI consegue ler fase e próxima ação com menos heurística e menos `if` espalhado

### Slice 3. Reduzir fallback nos payloads do inspetor

Objetivo:
- simplificar a convergência entre `snapshot`, `laudo_card` e payload legado

Mudanças:
- reduzir campos duplicados ou rehidratados em excesso em `workspace_status_payload.js`
- fortalecer o payload do backend para que o inspetor precise menos de merge defensivo
- padronizar prioridade de leitura do estado

Critério de pronto:
- o inspetor depende menos de merge multi-origem para entender o caso

### Slice 4. Reduzir duplicação entre `chat`, `mesa` e `revisor`

Objetivo:
- evitar que cada domínio tenha seu próprio entendimento parcial do caso

Mudanças:
- extrair helpers comuns ligados ao caso técnico para fora de pontos mais acoplados
- deixar `chat`, `mesa` e `revisor` consumirem o mesmo contrato derivado
- reduzir dependência em compat layers legadas

Critério de pronto:
- mudanças de lifecycle não precisam ser reimplementadas em três domínios

### Slice 5. Travar o contrato com testes

Objetivo:
- impedir drift silencioso entre backend, web e mobile

Mudanças:
- adicionar ou endurecer testes para:
  - campos centrais do snapshot
  - phase/review fields
  - allowed actions
  - transições e ownership
  - resumo da mesa
  - payload do inspetor

Critério de pronto:
- regressão de contrato do caso técnico quebra cedo em teste focal

## Ordem prática de implementação

1. `Slice 1`
2. `Slice 2`
3. `Slice 3`
4. `Slice 4`
5. `Slice 5`

## Testes recomendados por slice

### Focais

```bash
cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q
cd web && PYTHONPATH=. python -m pytest tests/test_mesa_mobile_sync.py -q
cd web && PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py -q
```

### E2E de segurança

```bash
cd web && RUN_E2E=1 PYTHONPATH=. python -m pytest tests/e2e/test_portais_playwright.py -q -k "comprador_exigente or mesa" --browser chromium
```

## Critério de pronto da frente

Esta frente pode ser considerada fechada quando:

- os campos centrais do caso técnico vierem de builders mais explícitos e compartilhados;
- a leitura de estado, ownership e próxima ação estiver mais uniforme entre superfícies;
- o inspetor depender menos de merge defensivo de payload;
- `chat`, `revisor` e `mesa` tiverem menos duplicação de lógica de lifecycle;
- a suíte crítica travar esse contrato.

## Risco principal

O maior risco é tentar reorganizar arquitetura demais sem fechar um pacote mínimo de contrato primeiro.

Para evitar isso:

- começar por centralização de builders e campos;
- só depois extrair módulos maiores;
- manter o frontend como consumidor, não como lugar principal da regra.

## Próximo corte recomendado

O primeiro corte concreto desta frente deve ser:

1. consolidar um builder compartilhado do pacote mínimo de estado do caso;
2. fazer `revisor`, `mesa/resumo` e projeções do inspetor consumirem esse builder;
3. endurecer testes focais desses campos antes de seguir para extrações maiores.
