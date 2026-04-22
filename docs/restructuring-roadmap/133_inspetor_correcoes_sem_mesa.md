# Inspetor web - aba de Correções sem Mesa avaliadora

Criado em `2026-04-22`.

## Contexto

Existe um cenário operacional legítimo em que:

- o `chat inspetor` continua sendo a superfície principal;
- a IA monta o laudo normalmente;
- a política comercial do tenant permite operar sem `Mesa avaliadora`;
- depois da montagem ou até depois da emissão, o usuário percebe que o laudo precisa de correções.

Nesse cenário, deixar toda correção no mesmo feed do chat principal tende a criar confusão entre:

- coleta bruta do caso;
- montagem do laudo;
- revisão de um documento já estruturado;
- reabertura e reemissão.

Também não é desejável abrir um `Word` livre do laudo, porque isso quebra:

- rastreabilidade do `JSON canônico`;
- consistência entre checklist, evidências e conclusão;
- versionamento do documento emitido;
- governança de campos derivados.

## Decisão consolidada

Quando a `Mesa` estiver ausente por política do tenant, o inspetor web deve oferecer uma aba própria de `Correções`, mantendo o `Chat` como home e fluxo principal da rota.

Essa aba:

- não substitui o `Chat`;
- não vira um segundo chat genérico;
- não vira um editor livre estilo `Word`;
- funciona como uma superfície de `edição estruturada do laudo`, com apoio opcional de comandos em linguagem natural.

## Objetivo

Permitir correção segura de laudos no portal do inspetor sem poluir o fluxo principal do chat e sem depender de Mesa, preservando:

- estado do caso;
- contrato do `laudo_output`;
- rastreabilidade de evidências;
- trilha de reabertura e reemissão.

## Princípios de produto

### 1. O `Chat` continua dono da coleta

No `Chat` permanecem:

- narrativa livre;
- perguntas e respostas com IA;
- envio inicial de fotos, documentos e contexto;
- preenchimento progressivo;
- geração inicial do laudo.

### 2. A aba `Correções` é o modo de alterar o documento

Na aba `Correções` entram:

- troca de foto;
- adição de evidência faltante;
- remoção de evidência inválida;
- reclassificação de foto;
- correção de checklist;
- correção de status;
- correção de conclusão;
- reabertura pós-emissão;
- reemissão de nova versão.

### 3. Correção é operação estruturada, não texto solto

Toda correção precisa virar uma intenção formal, por exemplo:

- `replace_evidence`
- `append_evidence`
- `remove_evidence`
- `reclassify_evidence_slot`
- `update_checklist_item`
- `update_conclusion`
- `reopen_document`
- `reissue_document`

### 4. O laudo não é editado como `Word`

O usuário deve enxergar o laudo por blocos, não como texto corrido sem governança.

Cada bloco precisa expor ações coerentes com sua natureza:

- texto livre editável onde faz sentido;
- checklist com estados controlados;
- fotos por slot semântico;
- conclusão com campos derivados protegidos.

### 5. Toda correção pós-emissão gera nova versão

Se o laudo já foi emitido:

- a versão corrente é reaberta;
- a alteração entra em modo de correção;
- o resultado volta como nova versão emitida;
- a versão anterior permanece como histórico interno.

## Estrutura oficial do workspace

Direção recomendada para o inspetor web:

- `Chat`
- `Laudo`
- `Correções`

### `Chat`

Função:

- coleta;
- contexto;
- interação natural com IA;
- alimentação inicial do caso.

### `Laudo`

Função:

- preview estruturado;
- leitura do checklist;
- leitura dos registros fotográficos;
- leitura da conclusão;
- emissão.

### `Correções`

Função:

- editar o laudo já estruturado;
- revisar alterações pendentes;
- aplicar correções;
- reabrir/reemitir quando necessário.

## Modelo de interface da aba `Correções`

### Bloco 1. Cabeçalho operacional

Mostrar sempre:

- identificação do laudo;
- família documental;
- status atual;
- versão atual;
- se está em `rascunho` ou `emitido`;
- botão contextual de `Reabrir para correção` quando aplicável.

### Bloco 2. Preview editável por seções

O laudo deve aparecer como seções estruturadas, por exemplo:

- `Identificação`
- `Objeto da inspeção`
- `Checklist técnico`
- `Registros fotográficos`
- `Não conformidades`
- `Conclusão`
- `Observações`

Cada seção deve expor ações específicas.

### Bloco 3. Painel de ações por seção

Exemplos:

- `Editar bloco`
- `Substituir foto`
- `Adicionar foto`
- `Remover foto`
- `Reclassificar foto`
- `Editar checklist`
- `Editar conclusão`

### Bloco 4. Alterações pendentes

Toda alteração deve entrar primeiro numa fila visível, com:

- alvo da alteração;
- valor anterior;
- valor novo;
- motivo ou comando que originou a ação;
- indicador se exige reemissão.

### Bloco 5. Assistente de correção

Campo opcional de linguagem natural para acelerar a operação.

Exemplos de comandos aceitos:

- `substitua a foto do ponto superior por esta`
- `adicione esta imagem como ponto inferior`
- `essa foto é da tag de identificação`
- `mude o status para pendente`
- `corrija a conclusão para indicar acesso parcial`

Importante:

- o comando não aplica mudança invisível;
- ele apenas propõe ou preenche a operação estruturada.

## Decisão de UX

### O que não fazer

- não abrir um editor livre estilo `Word`;
- não depender apenas de um chat de correções;
- não permitir que nova foto no chat principal altere automaticamente o PDF.

### O que fazer

- mostrar o laudo atual em formato estruturado;
- permitir edição guiada por bloco;
- manter um assistente textual como apoio;
- exigir aplicação explícita das alterações pendentes.

## Tipos oficiais de correção

### 1. Evidência

Cobrir:

- substituir foto ruim;
- adicionar evidência faltante;
- remover evidência inválida;
- mover foto para outro slot;
- promover evidência complementar a principal.

### 2. Checklist

Cobrir:

- mudar item para `C`;
- mudar item para `NC`;
- mudar item para `N/A`;
- ajustar observação do componente.

### 3. Texto

Cobrir:

- legenda;
- observação final;
- recomendação;
- justificativa;
- metodologia.

### 4. Conclusão

Cobrir:

- mudar `Aprovado` para `Pendente`;
- mudar `Pendente` para `Reprovado`;
- ajustar motivo do status;
- ajustar condição para reinspeção.

### 5. Reabertura e reemissão

Cobrir:

- reabrir laudo emitido;
- aplicar lote de correções;
- emitir `nova versão`;
- manter histórico da anterior.

## Estados recomendados sem Mesa

### Durante a construção

- `coletando_informacoes`
- `rascunho_em_montagem`
- `rascunho_pronto_para_revisao`
- `corrigindo_rascunho`

### Durante a emissão

- `pronto_para_emitir`
- `emitido`

### Durante a correção pós-emissão

- `emitido_com_correcao_pendente`
- `em_revisao_pos_emissao`
- `reemitido`

## Regras de transição

### Antes da emissão

- correção altera o `rascunho` atual;
- preview é atualizado;
- o usuário pode continuar corrigindo ou emitir.

### Depois da emissão

- o documento entra em modo de `reabertura`;
- toda alteração passa a ser candidata à `nova versão`;
- a emissão anterior não é sobrescrita silenciosamente.

## Regras para evidências novas

Quando o usuário envia uma nova foto na aba `Correções`:

- a foto não entra automaticamente no laudo final;
- ela entra como `evidência candidata à substituição` ou `complemento`;
- o sistema pede ou resolve o `slot alvo`;
- a mudança vai para `alterações pendentes`.

## Regra de alvo estável

O sistema deve preferir referências internas por `slot_id`, e não por numeração visual do PDF.

Exemplos recomendados:

- `foto_visao_geral`
- `foto_ponto_superior`
- `foto_ponto_inferior`
- `foto_tag_identificacao`
- `foto_detalhe_achado_principal`

O sistema pode aceitar referências como `item 1.5`, mas deve convertê-las para o `slot_id` interno.

## Fluxos exemplares

### Fluxo A. Troca de foto ruim antes da emissão

1. usuário abre `Correções`;
2. entra em `Registros fotográficos`;
3. escolhe `Substituir` em `foto_ponto_superior`;
4. envia nova imagem;
5. sistema mostra `antes/depois`;
6. alteração entra em `pendente`;
7. preview do laudo é atualizado;
8. usuário emite o documento.

### Fluxo B. Correção de status antes da emissão

1. usuário abre `Conclusão`;
2. troca `Aprovado` por `Pendente`;
3. informa motivo: acesso parcial;
4. sistema recalcula campos derivados;
5. preview é atualizado;
6. usuário segue para emissão.

### Fluxo C. Correção após emissão

1. usuário abre a aba `Correções`;
2. sistema informa que o laudo já foi emitido;
3. usuário clica `Reabrir para correção`;
4. corrige foto, checklist ou conclusão;
5. sistema marca a versão atual como superada para a superfície ativa;
6. usuário emite `nova versão`;
7. histórico anterior é preservado internamente.

## Contrato mínimo esperado no backend

Sem travar implementação agora, a superfície deve pressupor:

- uma representação de `alterações pendentes`;
- um endpoint ou operação de `aplicar correção`;
- um endpoint ou operação de `reabrir laudo`;
- um endpoint ou operação de `reemitir`;
- trilha mínima de autoria, timestamp e motivo.

Campos ou estruturas recomendadas:

- `correction_mode_active`
- `correction_queue`
- `current_document_version`
- `superseded_document_versions`
- `last_correction_at`
- `last_corrected_by`

## Guardrails

- nenhuma alteração estrutural deve existir só no frontend;
- checklist, status e reabertura devem ser validados no backend;
- campos derivados não devem ser editados livremente quando são calculáveis;
- toda reemissão deve manter vínculo com a versão anterior;
- histórico de evidência substituída não deve ser descartado silenciosamente.

## Critérios de pronto desta frente documental

- a direção do produto deixa claro que `Correções` é uma aba separada do `Chat`;
- a solução evita `Word livre` e evita `chat de correção` como único mecanismo;
- os fluxos de troca de foto, ajuste de checklist, mudança de status e reemissão ficam especificados;
- a ausência de `Mesa` passa a ter um caminho canônico de revisão no próprio inspetor.

## Próximo passo recomendado

Executar em slices curtos:

1. criar a navegação da aba `Correções` sem lógica pesada;
2. materializar o preview estruturado do laudo com ações por bloco;
3. adicionar fila de alterações pendentes;
4. ligar o assistente textual às operações estruturadas;
5. implementar reabertura e reemissão controladas.
