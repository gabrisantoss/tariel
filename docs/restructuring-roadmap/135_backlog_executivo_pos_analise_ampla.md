# Backlog Executivo Pós-Análise Ampla

Data de referência: `2026-04-23`
Base de leitura: `docs/STATUS_CANONICO.md`, `PLANS.md`, `PROJECT_MAP.md`

## Objetivo

Transformar a leitura ampla do estado atual do Tariel em backlog executivo acionável, priorizado por risco e por impacto real de produto.

Este documento responde:

- o que precisa ser feito primeiro;
- o que já pode esperar;
- qual frente é de UX, qual é de arquitetura e qual é de produto comercial;
- como sequenciar sem abrir trabalho demais ao mesmo tempo.

## Leitura executiva

O Tariel já é um produto funcional e vendável.

O principal trabalho agora não é inventar mais capacidade bruta.
O principal trabalho é:

- consolidar a experiência do `inspetor`;
- reduzir duplicação entre canais e superfícies;
- limpar hotspots arquiteturais;
- fechar melhor a entrega documental;
- refletir a matriz comercial do produto nas superfícies já existentes;
- aumentar legibilidade operacional para cliente, engenharia e suporte.

## Ordem recomendada

1. `Inspetor + Mesa` como fluxo flagship coerente.
2. Núcleo compartilhado do `caso técnico` e desacoplamento backend.
3. Pipeline documental premium.
4. Matriz comercial e onboarding visível no produto.
5. Mobile com mais fechamento operacional nativo.
6. Observabilidade funcional e leitura executiva do sistema.

## Prioridade Crítica

### `CRIT-01` Consolidar a experiência oficial da `Mesa` no inspetor

- área: `frontend web`, `inspetor`, `mesa`
- problema: a direção já está correta, mas ainda existem ecos de canal paralelo e costura visível entre aba dedicada, rail e widget de fallback
- resultado esperado: a aba `Mesa` vira o canal oficial inequívoco de revisão no inspetor
- inclui:
  - reduzir a lógica restante duplicada do widget de `Mesa`
  - garantir que fora de `dev` o fallback não pareça um segundo fluxo oficial
  - reforçar badge, empty state, cards de evento e próxima ação na aba `Mesa`
  - endurecer E2E focado em `inspetor + mesa`
- critério de pronto:
  - o operador entende sem ambiguidade onde falar com a mesa
  - não existe competição visual entre `Mesa` e atalhos paralelos
  - existe E2E cobrindo comentário, pendência, decisão, devolução e aprovação no mesmo caso

### `CRIT-02` Fechar a máquina operacional do caso técnico

- área: `backend`, `chat`, `revisor`, `cliente`
- problema: o lifecycle já existe, mas ainda pede mais legibilidade em subestados, ownership e ações permitidas
- resultado esperado: o caso técnico passa a ter leitura mais previsível em todas as superfícies
- inclui:
  - explicitar subestados operacionais principais
  - padronizar transições administrativas por estado
  - refletir isso em payloads, histórico e feedback de UI
  - reduzir divergência de interpretação entre `admin-cliente`, `inspetor` e `mesa`
- critério de pronto:
  - a mesma fase do caso é lida do mesmo jeito no backend, no portal cliente, no inspetor e na mesa
  - o operador sempre enxerga `situação atual`, `próxima ação` e `quem está com a vez`

### `CRIT-03` Desacoplar hotspots do backend

- área: `backend compartilhado`
- problema: ainda há acoplamento excessivo entre `cliente`, `chat`, `revisor` e hotspots como `admin/services.py`
- resultado esperado: evolução mais barata e menos regressão cruzada
- inclui:
  - continuar extração do núcleo compartilhado do `caso técnico`
  - quebrar serviços extensos por domínio
  - reduzir compat layers legadas onde já há contrato canônico
- critério de pronto:
  - mudanças em `cliente`, `inspetor` e `mesa` passam por módulos mais claros e com menos efeito colateral
  - hotspots críticos ficam menores e com testes mais localizados

## Prioridade Alta

### `HIGH-01` Fechar o pipeline documental premium

- área: `documento`, `renderer`, `template`, `catálogo`
- problema: o pipeline existe, mas ainda não entrega sempre uma percepção de produto documental premium e coeso
- resultado esperado: emissão mais forte, menos fallback visível e pacote final mais profissional
- inclui:
  - fortalecer `document_view_model -> editor -> render`
  - reduzir fallback visual fraco
  - enriquecer pacote final de entrega por tenant e família
  - melhorar distinção entre documento emitido, histórico, versão anterior e material interno
- critério de pronto:
  - o cliente percebe clareza entre documento oficial, anexos, histórico e rascunho
  - o PDF final e o pacote associado parecem parte do mesmo produto

### `HIGH-02` Refletir a matriz comercial nas superfícies

- área: `admin-ceo`, `admin-cliente`, `tenant policy`, `entitlements`
- problema: a governança contratual existe, mas ainda não está totalmente legível como oferta comercial do produto
- resultado esperado: pacote contratado, capacidades liberadas e limites operacionais ficam visíveis de forma simples
- inclui:
  - explicitar pacotes, eixos de capacidade e superfícies liberadas
  - reforçar onboarding de primeira venda
  - reforçar branding e personalização por empresa
  - tornar mais legível quando existe `Mesa`, quando não existe e qual é o modelo operacional do tenant
- critério de pronto:
  - o `admin-cliente` entende o pacote contratado sem depender de suporte
  - o `admin-ceo` consegue vender e configurar sem leitura implícita do código

### `HIGH-03` Continuar desglobalização do frontend web

- área: `inspetor web`, `portal cliente`, `frontend shared`
- problema: ainda existe dependência excessiva de `window.*`, ordem de scripts e camadas de compatibilidade
- resultado esperado: frontend mais modular e menos frágil
- inclui:
  - reduzir uso de globais
  - modularizar runtime do inspetor
  - remover duplicações antigas de binding e bootstrap
  - carregar mais estado por contrato explícito
- critério de pronto:
  - as superfícies críticas conseguem evoluir sem depender de ordem frágil de script
  - debugging de tela crítica fica mais rápido

### `HIGH-04` Fechar melhor a experiência inicial do cliente

- área: `admin-cliente`, `support`, `onboarding`, `equipes`
- problema: o portal cliente já está forte, mas ainda pode parecer “casca pronta” quando o tenant está vazio ou recém-provisionado
- resultado esperado: valor percebido logo no primeiro acesso
- inclui:
  - onboarding guiado mais denso
  - estados vazios inteligentes
  - seed ou orientação clara para primeira carteira
  - fluxo liso de criação de `inspetor` e `revisor`
- critério de pronto:
  - uma empresa nova consegue entender o que fazer nos primeiros 15 minutos
  - a tela vazia orienta a operação em vez de só indicar ausência de dados

## Prioridade Média

### `MED-01` Aprofundar mobile como canal operacional autônomo

- área: `android`
- problema: o mobile já participa do núcleo, mas ainda depende mais da web do que o ideal em algumas jornadas
- resultado esperado: mais fechamento de fluxo no app, conforme pacote e grants
- inclui:
  - aprofundar jornadas guiadas por missão
  - melhorar reuso de contexto do ativo e inspeção
  - limpar visual de `Finalizar`, `Configurações` e `Histórico`
  - aumentar cobertura prática de login, offline, anexos e mesa em aparelho
- critério de pronto:
  - mais casos operacionais podem ser encerrados inteiramente no app
  - o app fica menos “companheiro da web” e mais canal principal real

### `MED-02` Melhorar observabilidade funcional

- área: `auditoria`, `histórico`, `admin`, `suporte`
- problema: ainda existe inferência manual demais para entender bloqueios, ownership e status real do caso
- resultado esperado: leitura mais objetiva do sistema para operação e manutenção
- inclui:
  - mais sinais canônicos em histórico e telas administrativas
  - leitura clara de bloqueios, exceções e autoria
  - consolidação de `quem fez`, `quando`, `por quê` e `o que falta`
- critério de pronto:
  - suporte e operação reduzem tempo para explicar por que um caso travou ou avançou

### `MED-03` Melhorar dashboards executivos e fila operacional

- área: `admin-cliente`, `cliente portal`
- problema: já há dados suficientes para visão executiva, mas a leitura ainda está mais próxima de operação do que de gestão
- resultado esperado: o cliente empresarial entende gargalos e prioridade rapidamente
- inclui:
  - dashboard executivo por tenant
  - central de pendências
  - leitura por criticidade, unidade, norma e responsável
  - leitura de vencimentos e carteira por status
- critério de pronto:
  - o `admin-cliente` consegue responder “o que está vencendo”, “o que está parado” e “onde está o gargalo” sem navegar caso a caso

## Prioridade Baixa

### `LOW-01` Branding mais profundo por empresa

- área: `cliente`, `documentos`, `admin-ceo`
- problema: a personalização existe parcialmente, mas ainda pode avançar para percepção comercial mais forte
- resultado esperado: tenants estratégicos percebem a plataforma mais alinhada à sua identidade operacional
- inclui:
  - refinamento visual por empresa
  - identidade em documentos, portal e comunicações
  - superfícies mais aderentes ao contrato comercial

### `LOW-02` Pacotes e narrativas comerciais especializadas

- área: `produto`, `comercial`, `admin-ceo`
- problema: o sistema já suporta bastante nuance, mas isso ainda não está totalmente empacotado em narrativas simples de venda
- resultado esperado: venda mais simples para perfis como `WF`, `cliente mobile principal`, `empresa sem mesa`, `empresa com mesa e emissão premium`
- inclui:
  - presets mais claros
  - comparativo entre pacotes
  - superfícies de apoio comercial e diagnóstico por tenant

## Backlog por Área

### Inspetor

- consolidar `Mesa` como aba oficial
- reduzir fallback visual e funcional paralelo
- modularizar runtime
- melhorar observabilidade do caso na própria UI

### Mesa

- fechar leitura de subestado e decisão
- reduzir ambiguidade entre comentário contextual e devolução
- reforçar timeline e próxima ação

### Admin-Cliente

- fortalecer onboarding
- reforçar visão executiva
- amadurecer estados vazios
- consolidar leitura comercial do pacote contratado

### Admin-CEO

- deixar a matriz comercial mais explícita
- melhorar presets, branding e entendimento do tenant

### Backend

- extrair núcleo compartilhado do caso
- quebrar hotspots
- reduzir compat layers
- reforçar contratos canônicos entre domínios

### Documento

- fortalecer pipeline premium
- separar melhor oficial, histórico e material interno
- enriquecer pacote final

### Mobile

- aprofundar autonomia
- limpar superfícies ainda poluídas
- ampliar fechamento de fluxo completo no app

## Sequência de execução sugerida

### Fase 1

- `CRIT-01`
- `CRIT-02`
- `CRIT-03`

### Fase 2

- `HIGH-01`
- `HIGH-02`
- `HIGH-03`
- `HIGH-04`

### Fase 3

- `MED-01`
- `MED-02`
- `MED-03`

### Fase 4

- `LOW-01`
- `LOW-02`

## Regra de execução

- não abrir duas frentes críticas estruturais grandes ao mesmo tempo
- sempre amarrar mudança de contrato com teste e payload atualizado
- preferir cortes pequenos que fechem percepção real de produto, não só organização interna
- quando uma frente mexer em `inspetor`, `mesa` e `cliente` ao mesmo tempo, registrar checkpoint em `PLANS.md`

## Próximo corte recomendado

O próximo corte mais inteligente continua sendo:

1. fechar o `inspetor + mesa` como experiência flagship;
2. logo depois, atacar o núcleo compartilhado do `caso técnico`;
3. em seguida, retomar o pipeline documental premium com menos fallback fraco.
