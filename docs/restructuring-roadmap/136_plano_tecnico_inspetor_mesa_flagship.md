# Plano Técnico - Inspetor + Mesa como fluxo principal do produto

Data de referência: `2026-04-23`
Base: `docs/STATUS_CANONICO.md`, `docs/restructuring-roadmap/133_inspetor_correcoes_sem_mesa.md`, `web/docs/mesa_avaliadora.md`, `web/docs/frontend_mapa.md`, `PLANS.md`

## Objetivo

Transformar `Inspetor + Mesa` no fluxo mais claro, estável e demonstrável do produto.

Na prática, isso significa:

- o inspetor entende onde coleta, onde revisa e onde fala com a mesa;
- a mesa tem papel nítido de revisão humana, sem concorrer com o chat principal;
- o sistema sempre mostra `situação atual`, `próxima ação` e `ownership`;
- o fallback de desenvolvimento não confunde a experiência oficial.

## Resultado esperado

Ao final desta frente:

- a aba `Mesa` é o canal oficial inequívoco de interação com a revisão;
- o rail do inspetor vira contexto/resumo, não canal concorrente;
- o widget paralelo deixa de carregar peso funcional de produto fora de `dev`;
- o caso técnico expõe sinais operacionais mais legíveis no inspetor e na mesa;
- existe cobertura E2E focada no fluxo real `inspetor -> mesa -> retorno -> decisão`.

## Escopo

### Entra

- consolidar a aba `Mesa` como canal principal no inspetor;
- reduzir duplicação do widget de `Mesa`;
- reforçar estado, próxima ação, pendências e decisão na UI;
- alinhar payloads mínimos entre inspetor e revisão;
- endurecer testes E2E e críticos do fluxo `inspetor + mesa`.

### Não entra

- reabrir o desenho completo do portal cliente;
- redesenhar o painel SSR inteiro do revisor;
- refatorar toda a arquitetura do caso técnico nesta mesma fase;
- reabrir a política `Correções sem Mesa` além do necessário para compatibilidade.

## Problema atual resumido

O produto já avançou bastante:

- existe aba `Mesa` no inspetor;
- já há resposta contextual, aprovação e reabertura mais previsíveis;
- o rail e o widget já foram enfraquecidos como canal principal;
- o fluxo local ponta a ponta já fecha em E2E.

O que ainda falta é fechamento de experiência:

- ainda há resquícios de duplicação funcional e visual;
- nem todo estado do caso fica autoexplicativo no inspetor;
- a leitura de `comentário`, `pendência`, `devolução` e `decisão` pode ficar mais nítida;
- o fallback de `dev` ainda precisa ficar mais obviamente secundário;
- faltam E2Es mais focados nas variantes do fluxo de mesa.

## Decisões de produto já assumidas

### 1. A aba `Mesa` é o canal oficial

O inspetor usa a aba `Mesa` para comunicação institucional com a revisão.

### 2. O rail não é canal primário

O rail deve apenas:

- resumir situação;
- mostrar próxima ação;
- apontar para a aba `Mesa`.

### 3. O widget paralelo é fallback de desenvolvimento

Fora de `dev`, ele não deve competir visual nem funcionalmente com a aba `Mesa`.

### 4. Comentário contextual não é devolução

O sistema deve deixar explícita a diferença entre:

- comentário técnico;
- pendência aberta;
- devolução para correção;
- decisão final.

## Arquivos principais da frente

### Inspetor web

- `web/templates/index.html`
- `web/templates/inspetor/_mesa_widget.html`
- `web/templates/inspetor/workspace/_workspace_toolbar.html`
- `web/templates/inspetor/workspace/_workspace_context_rail.html`
- `web/templates/inspetor/workspace/_inspection_mesa.html`
- `web/static/js/chat/chat_index_page.js`
- `web/static/js/chat/chat_painel_mesa.js`
- `web/static/js/inspetor/mesa_widget.js`
- `web/static/js/inspetor/workspace_screen.js`
- `web/static/js/inspetor/workspace_runtime_screen.js`
- `web/static/js/inspetor/workspace_page_elements.js`
- `web/static/js/inspetor/workspace_mesa_status.js`
- `web/static/css/inspetor/reboot.css`
- `web/static/css/inspetor/workspace_chrome.css`
- `web/static/css/inspetor/workspace_rail.css`
- `web/static/css/inspetor/workspace_states.css`
- `web/static/css/inspetor/visual_refinements.css`

### Backend e contratos

- `web/app/domains/chat/mesa.py`
- `web/app/domains/chat/laudo_state_helpers.py`
- `web/app/domains/chat/pendencias_helpers.py`
- `web/app/domains/revisor/mesa_api.py`
- `web/app/domains/revisor/service_contracts.py`
- `web/app/domains/revisor/service_messaging.py`
- `web/app/domains/mesa/contracts.py`
- `web/app/domains/mesa/service.py`

### Testes

- `web/tests/e2e/test_portais_playwright.py`
- `web/tests/test_regras_rotas_criticas.py`
- `web/tests/test_revisor_mesa_api_side_effects.py`
- `web/tests/test_smoke.py`

## Slices recomendados

### Slice 1. Fechar de vez a hierarquia da UI

Objetivo:
- remover ambiguidade entre aba `Mesa`, rail e widget

Mudanças:
- manter badge e estado da aba `Mesa` como elemento principal
- deixar o rail apenas como resumo
- fazer o widget fora de `dev` só redirecionar para a aba `Mesa` quando ainda existir alguma entrada residual
- remover qualquer copy restante que trate o widget como canal normal

Critério de pronto:
- em produção, um usuário novo identifica a aba `Mesa` como único ponto natural de revisão

### Slice 2. Tornar a aba `Mesa` autoexplicativa

Objetivo:
- a tela precisar de menos interpretação manual

Mudanças:
- reforçar cabeçalho com:
  - situação do caso
  - próxima ação
  - última atualização
- tornar os cards de evento mais informativos:
  - comentário técnico
  - pendência
  - decisão
- explicitar quando o caso está:
  - aguardando mesa
  - aguardando campo
  - pronto para decisão
  - encerrado

Critério de pronto:
- o operador entende o estado do caso sem ler o histórico inteiro

### Slice 3. Amarrar melhor pendências e anexos

Objetivo:
- aproximar mais a conversa da ação exigida

Mudanças:
- destacar pendências abertas com vínculo mais nítido ao que precisa ser feito
- mostrar anexos da mesa como parte do contexto operacional
- reduzir distância entre `pedido da mesa` e `ação esperada do inspetor`

Critério de pronto:
- o inspetor enxerga com clareza o que foi pedido, o que falta e onde responder

### Slice 4. Endurecer o contrato de estado do caso

Objetivo:
- reduzir divergência entre backend e UI

Mudanças:
- padronizar campos mínimos de leitura operacional no payload da mesa
- reforçar:
  - `review_phase`
  - `review_phase_label`
  - `next_action_label`
  - `next_action_summary`
- alinhar histórico e resumo da UI com esses contratos

Critério de pronto:
- UI do inspetor e da mesa não precisam inferir regra implícita do backend

### Slice 5. Fechar a bateria de testes flagship

Objetivo:
- transformar o fluxo `Inspetor + Mesa` em contrato estável do produto

Mudanças:
- adicionar E2Es focados em:
  - resposta contextual sem devolução
  - devolução com correção exigida
  - aprovação no mesmo caso
  - reabertura após decisão
  - badge/empty state/novidade na aba `Mesa`
- manter testes críticos de rota cobrindo side effects

Critério de pronto:
- qualquer regressão central de `inspetor + mesa` quebra teste rápido antes de chegar em produção

## Ordem prática de implementação

1. `Slice 1`
2. `Slice 2`
3. `Slice 4`
4. `Slice 3`
5. `Slice 5`

Motivo:

- primeiro fecha-se a leitura principal da experiência;
- depois a clareza da própria aba;
- em seguida consolida-se o contrato;
- depois refina-se a operação de pendências/anexos;
- por fim trava-se tudo em testes.

## Testes recomendados por slice

### Testes rápidos

```bash
cd web && PYTHONPATH=. python -m pytest tests/test_smoke.py -q
cd web && PYTHONPATH=. python -m pytest tests/test_regras_rotas_criticas.py -q -k "mesa or pendencias"
cd web && PYTHONPATH=. python -m pytest tests/test_revisor_mesa_api_side_effects.py -q
```

### E2E focado

```bash
cd web && RUN_E2E=1 PYTHONPATH=. python -m pytest tests/e2e/test_portais_playwright.py -q -k "comprador_exigente or mesa" --browser chromium
```

## Critério de pronto da frente

Esta frente pode ser considerada fechada quando:

- a aba `Mesa` for o canal claramente oficial no inspetor;
- o rail não competir com a aba;
- o fallback de `dev` estiver explicitamente secundário;
- comentário, pendência, devolução e decisão estiverem distinguíveis sem ambiguidade;
- os testes críticos e E2E cobrirem esse fluxo como contrato principal do produto.

## Risco principal

O maior risco é tentar resolver UX, lifecycle e arquitetura do caso técnico ao mesmo tempo.

Para evitar isso:

- manter o foco desta frente em `Inspetor + Mesa`;
- adiar limpeza estrutural maior do `caso técnico` para a frente seguinte;
- fazer cortes pequenos e validáveis.

## Próximo passo recomendado

O próximo corte concreto desta frente deve ser:

1. eliminar a última duplicação funcional residual do widget paralelo fora de `dev`;
2. reforçar a aba `Mesa` com leitura ainda mais nítida de `situação` e `próxima ação`;
3. endurecer o E2E focado em `inspetor + mesa`.
