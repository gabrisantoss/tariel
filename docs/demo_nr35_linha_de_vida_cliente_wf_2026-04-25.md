# Demo Cliente WF - NR35 Linha de Vida

Data: 2026-04-25

Origem: `docs/checklist_correcoes_urgentes_cliente_wf_2026-04-25.md`

Escopo: demo comercial e operacional para provar reducao de retrabalho na elaboracao de laudo, sem incluir `admin-ceo`.

## Objetivo

Demonstrar um fluxo completo de `NR35 Linha de Vida`, do inicio da coleta ate a preparacao da emissao oficial, com Mesa avaliadora e controle de evidencias minimas.

Resultado esperado para venda: o cliente entende em poucos minutos onde iniciar, o que falta coletar, quem esta travando o caso e quando o laudo pode virar pacote oficial.

## Persona da Demo

- Dono ou gestor da empresa WF: quer enxergar prazo, gargalo e risco tecnico.
- Admin cliente: quer acompanhar operacao, usuarios e casos.
- Inspetor: quer iniciar servico pelo nome vendido e coletar evidencias sem texto solto demais.
- Mesa avaliadora: quer devolver pendencias objetivas ou aprovar sem refazer leitura manual.

## Caso Piloto

- Servico: `NR35 Linha de Vida`.
- Ativo: `Linha de vida vertical LV-01`.
- Unidade: `Silo A - Planta Industrial`.
- Status planejado: primeiro envio com pendencia controlada, correcao pelo inspetor e aprovacao final.
- Motivo da escolha: familia forte para campo, fotos, componentes, conclusao tecnica e demonstracao de bloqueio por evidencia ausente.

## Pre-requisitos

- Tenant de demo com portal do inspetor, admin cliente e Mesa habilitados.
- Template `nr35_linha_vida` ou `nr35_inspecao_linha_de_vida` liberado no catalogo do tenant.
- Usuario inspetor com acesso ao portal do inspetor.
- Usuario revisor ou mesa com permissao de avaliar.
- Pelo menos um signatario configurado se a etapa de emissao oficial for demonstrada.

## Roteiro da Demonstracao

### 1. Entrada objetiva por servico

- Abrir o portal do inspetor.
- Mostrar a primeira tela com `Estado operacional` e grade `Servicos WF`.
- Clicar em `NR35 Linha de Vida`.
- Confirmar que o sistema nao exige o usuario entender nomes internos como `family`, `variant`, `runtime` ou `release`.

Aceite: o cliente deve conseguir apontar onde comecar sem explicacao longa.

### 2. Criacao do caso

- Abrir `Nova inspecao` se o modal for necessario.
- Informar cliente, unidade, local, ativo, objetivo e contexto inicial.
- Usar o texto: `Inspecao NR35 da linha de vida vertical LV-01 no Silo A, com verificacao de pontos, cabo, esticador, sapatilhas, olhais e grampos`.

Aceite: o caso aparece como `Em andamento` e fica visivel na lista de recentes.

### 3. Coleta guiada de evidencias

- Anexar ou simular evidencia de `vista geral`.
- Anexar ou simular evidencia de `ponto superior`.
- Deixar propositalmente ausente a evidencia de `ponto inferior`.
- Registrar checklist tecnico com pelo menos um item `C`, um `NC` ou `Pendente`, e uma observacao objetiva.

Aceite: o sistema deve indicar que existe evidencia faltante antes de permitir uma finalizacao limpa.

### 4. Envio para Mesa

- Enviar o caso para avaliacao.
- Abrir a visao da Mesa.
- A Mesa devolve pendencia: `Falta foto do ponto inferior e motivo tecnico da conclusao pendente`.

Aceite: o portal do inspetor passa a mostrar `Pendencias` ou status equivalente sem o usuario procurar no historico.

### 5. Correcao pelo inspetor

- Reabrir ou retomar o caso devolvido.
- Anexar evidencia de `ponto inferior`.
- Preencher conclusao tecnica com status final coerente.
- Reenviar para Mesa.

Aceite: o caso deixa de ficar travado por pendencia de campo.

### 6. Aprovacao e emissao

- A Mesa aprova o caso.
- O portal deve mostrar o caso como pronto para proxima acao de emissao.
- Abrir preparacao de emissao oficial se o pacote estiver habilitado.
- Conferir fotos selecionadas, identificacao documental e pacote tecnico.

Aceite: a demo termina em caso aprovado e rastreavel, sem depender de workaround verbal.

## Evidencias Visuais a Registrar

- Screenshot da primeira tela com `Estado operacional` e `Servicos WF`.
- Screenshot do caso `NR35 Linha de Vida` em andamento.
- Screenshot do gate ou bloco de evidencias faltantes.
- Screenshot da devolucao da Mesa.
- Screenshot do caso aprovado ou da tela de preparacao de emissao.

## Testes ou Validacoes Minimas

- `PYTHONPATH=. python -m pytest tests/test_smoke.py -q -k "perfil or portal or inspetor"`
- `PYTHONPATH=. python -m pytest tests/test_tenant_entitlements_critical.py -q -k "portal_inspetor_abre_chat_principal"`
- `RUN_E2E=1 E2E_VISUAL=0 python -m pytest tests/e2e/test_inspetor_visual_playwright.py -q --browser chromium -s`

## Riscos Ainda Abertos

- O roteiro esta documentado, mas ainda precisa ser executado de ponta a ponta sem falha.
- A etapa de emissao oficial depende de governanca, signatario e pacote tecnico habilitados no tenant.
- O gate de evidencias precisa estar visivel no fluxo real da familia, nao apenas descrito em documento.
- O fluxo mobile de coleta de foto ainda precisa de validacao propria antes de prometer campo completo.

## Criterio Para Considerar a Demo Fechada

- O mesmo usuario consegue repetir o roteiro sem orientacao tecnica externa.
- A Mesa consegue devolver uma pendencia objetiva.
- O inspetor consegue corrigir a pendencia e reenviar.
- O caso aprovado fica pronto para emissao ou com motivo claro de bloqueio.
- As evidencias visuais ficam registradas em `web/.test-artifacts/visual/` ou pasta equivalente de demo.
