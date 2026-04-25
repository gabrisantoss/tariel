# Regras de Encerramento

Resumo da finalizacao, pendencias de fechamento e reabertura de laudo.

## Backend principal

- `app/domains/chat/laudo.py`: finalizar, consultar gate e reabrir.
- `app/domains/chat/gate_helpers.py`: regras do gate de qualidade.
- `app/domains/chat/laudo_state_helpers.py`: permissao de reabrir e estado.
- `app/domains/chat/session_helpers.py`: estado exposto ao frontend.
- `docs/checklist_qualidade.md`: regras atuais do gate por template.

## Fluxo atual

1. Inspetor tenta finalizar o laudo pelo chat/workspace.
2. Backend valida as pendencias obrigatorias de finalizacao.
3. Se faltar item obrigatorio, a UI volta para coleta e mostra um painel objetivo com o que falta.
4. O inspetor pode levar as pendencias para o composer e continuar no chat.
5. Se a politica do template permitir, o inspetor pode finalizar incompleto registrando motivo humano.
6. Se aprovado ou finalizado por responsabilidade humana, o laudo segue para a mesa.
7. Dependendo do retorno da mesa, o laudo pode exigir reabertura.

## O que acontece na finalizacao aprovada

- `status_revisao` muda para `AGUARDANDO`
- `encerrado_pelo_inspetor_em` recebe timestamp
- `reabertura_pendente_em` volta para `None`
- o card passa para estado de envio/aguardando mesa

## O que acontece na reprovacao

- resposta HTTP `422`
- o payload de pendencias volta inteiro em `detail`
- o laudo continua em `RASCUNHO`
- o front abre o painel de pendencias e nao deve exibir erro generico de finalizacao
- a acao `Levar pendencias para o chat` insere uma mensagem orientada no composer
- a acao `Finalizar mesmo assim` so aparece quando `human_override_policy.available = true`

## O que acontece na finalizacao incompleta por responsabilidade humana

- o usuario precisa registrar motivo com pelo menos 12 caracteres
- o backend salva o motivo em `quality_gates.human_override`
- a responsabilidade final permanece humana; a Tariel apenas monta o laudo
- o laudo segue para `AGUARDANDO`/mesa, sem a IA validar tecnicamente a decisao

## Sinais importantes no codigo

- rota de gate: `/api/laudo/{laudo_id}/gate-qualidade`
- rota de reabrir: `/api/laudo/{laudo_id}/reabrir`
- finalizacao efetiva: `api_finalizar_relatorio` em `app/domains/chat/laudo.py`

## Frontend principal

- `templates/index.html`
- `static/js/chat/chat_index_page.js`

Elementos uteis:

- `#btn-finalizar-inspecao`
- `#modal-gate-qualidade`
- `#lista-gate-faltantes`
- `#lista-gate-checklist`
- `#btn-gate-preencher-no-chat`
- `#btn-gate-override-continuar`

## Regras praticas

- Nao colocar regra de negocio pesada so no front.
- O front pode orientar, mas quem bloqueia de verdade e o backend.
- Falha de pendencia de finalizacao nao deve aparecer como erro generico depois que o painel foi aberto.
- A linguagem para inspetor deve ser `pendencias`, `voltar ao chat` e `finalizar mesmo assim`, nao `gate`, `excecao governada` ou termos internos.
- Se uma exigencia depende do tipo de laudo, a normalizacao do template importa.
- Reabertura precisa refletir no estado da sessao e no card do laudo.
- `permite_edicao` hoje so e verdadeiro em `RASCUNHO`.
- `permite_reabrir` hoje depende de `status_card == "ajustes"`.

## Testes que mais ajudam

- `tests/e2e/test_portais_playwright.py -k "gate_qualidade or finalizar"`
- `tests/test_regras_rotas_criticas.py -k "gate or reabr"`

## Perguntas que resolvem mais rapido

- O laudo esta em estado editavel?
- O gate falhou por checklist, evidencia ou regra de estado?
- O front recebeu `permite_reabrir` e `permite_edicao` corretos?
- O template exige formulario estruturado, como em `cbmgo`?
