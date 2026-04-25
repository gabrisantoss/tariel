# Checklist de Evidencias - NR35 Linha de Vida

Data: 2026-04-25

Origem tecnica:

- `docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/checklist_estrutura_real.md`
- `docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/manifesto_coleta.json`
- `docs/portfolio_empresa_nr35_material_real/nr35_inspecao_linha_de_vida/briefing_real.md`

Objetivo: definir o minimo que o sistema precisa pedir, exibir e validar para um caso piloto de `NR35 Linha de Vida`.

## Regra Principal

Nao basta o inspetor anexar uma foto qualquer. A evidencia precisa estar vinculada ao objeto correto, sustentar a conclusao tecnica e deixar claro se o status final e `Aprovado`, `Reprovado` ou `Pendente`.

Se a IA nao identificar a familia correta, o chat continua sendo o centro do fluxo: o inspetor pode corrigir com uma frase objetiva, como "isso e NR35 linha de vida", e a IA deve reavaliar a foto com mais cuidado. Essa correcao nao pode aparecer para o usuario como "aprendizado", "treinamento", "tenant" ou "governanca"; para o usuario, a experiencia deve ser apenas uma conversa tecnica normal.

Se a foto nao sustentar NR35 com boa confianca, a IA deve dizer que a evidencia nao confirma essa classificacao e pedir justificativa tecnica ou nova evidencia. Se o usuario explicar e a explicacao cruzar com a foto, o sistema segue como hipotese operacional validavel. Se a explicacao nao cruzar, a IA pergunta se o usuario tem certeza que deseja continuar; se ele confirmar, a IA nao deve discutir nem tentar convencer novamente. Ela deve montar a analise ou o laudo como solicitado, mas deixando claro que a classificacao e uma premissa declarada pelo usuario, com baixa confianca visual, dependente de validacao humana e sob responsabilidade tecnica do humano que revisar/assinar.

Toda correcao visual fica restrita ao `empresa_id` atual. Ela so pode influenciar casos futuros depois de validacao pela governanca do admin-cliente. Uma frase generica com "porque" ou "tenho certeza" nao deve ativar o fluxo se nao existir uma correcao visual anterior vinculada a uma foto.

Quando a IA erra por causa de variacao real da foto, como angulo incomum, corte parcial ou qualidade limitada, o sistema deve aprender internamente somente se houver cruzamento tecnico suficiente: explicacao do usuario, foto original, nova foto/outro angulo ou outra evidencia que confirme o mesmo objeto. Depois de validado pela Mesa/governanca do admin-cliente, esse caso vira referencia futura para fotos parecidas, sem virar regra global para outros clientes.

Foto ruim nao deve gerar conclusao forte. O chat deve dizer "foto com baixa qualidade" ou "evidencia visual insuficiente", pedir nova imagem ou outro angulo e tratar a resposta como pendencia de evidencia. A regra pratica e: so fechar analise categórica quando houver evidencia suficiente e alta confianca visual; nao prometer certeza matematica de 100%.

Politica de responsabilidade: a Tariel nao valida laudo. A Tariel organiza evidencias, monta analise e gera rascunho de relatorio. Correcao tecnica, validacao final, ART e assinatura sao sempre humanas. Quando o usuario insiste em uma analise que a IA considera visualmente invalida, o sistema atende como solicitacao do usuario, mas se protege registrando baixa confianca, premissa declarada e necessidade de validacao humana.

Blindagem contra aprendizado malicioso: se o usuario tenta forcar uma classificacao absurda ou incompatível apenas para testar a IA, o sistema pode seguir o caso atual por solicitacao dele, mas marca internamente como `risco_poisoning`, `baixa_confianca_visual` e `aprendizado_bloqueado`. Esses marcadores nao devem aparecer para o usuario e nao podem virar referencia futura automaticamente. Eles tambem devem ser preservados quando a mesa edita pontos-chave, para evitar que uma edicao simples apague o historico de risco.

Regra de experiencia: o checklist NR35, o aprendizado visual e a edicao do laudo nao devem parecer sistemas separados. O inspetor escolhe `Chat guiado`, envia fotos e conversa. Quando pedir para finalizar, o chat/gate informa o que falta. Quando pedir uma correcao no laudo, o chat transforma isso em ajuste estruturado interno e aplica no rascunho sem mostrar editor ou fila tecnica.

## Identificacao Documental

- [ ] Unidade operacional.
- [ ] Localizacao ou setor.
- [ ] Numero do laudo de inspecao.
- [ ] Numero do laudo do fabricante, quando existir.
- [ ] Numero da ART.
- [ ] Contratante.
- [ ] Contratada.
- [ ] Engenheiro responsavel.
- [ ] Inspetor lider.
- [ ] Data da vistoria.

Bloqueio recomendado: nao permitir emissao sem unidade, localizacao, objeto principal, responsavel tecnico e conclusao.

## Objeto da Inspecao

- [ ] Objeto principal com TAG, nome ou referencia rastreavel.
- [ ] Tipo da linha: `Vertical`, `Horizontal` ou `Ponto de Ancoragem`.
- [ ] Escopo da inspecao.
- [ ] Condicoes de acesso ou limitacoes de campo.
- [ ] Referencia principal do ativo, por foto ou documento.

Bloqueio recomendado: se o objeto principal for generico, o caso deve voltar para coleta antes da Mesa aprovar.

## Checklist Tecnico de Componentes

Cada item deve ter condicao `C`, `NC` ou `NA`, com observacao quando houver `NC`, `NA` relevante ou status final pendente.

- [ ] Fixacao dos pontos.
- [ ] Condicao do cabo de aco.
- [ ] Condicao do esticador.
- [ ] Condicao da sapatilha.
- [ ] Condicao do olhal.
- [ ] Condicao dos grampos.

Regra: `NA` nao pode ser tratado automaticamente como conformidade. Se muitos itens forem `NA`, o sistema deve pedir motivo de limitacao.

## Evidencias Fotograficas Minimas

- [ ] Vista geral da linha de vida ou do contexto de instalacao.
- [ ] Ponto superior.
- [ ] Ponto inferior.
- [ ] Identificacao visual do ativo, TAG, silo, area ou referencia equivalente.
- [ ] Detalhe do achado principal, quando houver nao conformidade.
- [ ] Foto de contexto quando o acesso impedir verificacao completa.

Bloqueio recomendado: sem ao menos uma evidencia principal e uma evidencia de execucao, a Mesa deve receber alerta de evidencia insuficiente.

## Slots Obrigatorios do Report Pack

- [ ] `slot_referencia_principal`: foto ou documento que ancora o ativo.
- [ ] `slot_evidencia_execucao`: foto, documento ou texto que prova a vistoria executada.
- [ ] `slot_evidencia_principal`: evidencia que sustenta conclusao, bloqueio ou aprovacao.
- [ ] `slot_conclusao_servico`: texto tecnico final auditavel.

Regra: anexo vazio, placeholder ou texto sem relacao com o ativo nao deve contar como slot preenchido.

## Conclusao Tecnica

- [ ] Status final: `Aprovado`, `Reprovado` ou `Pendente`.
- [ ] Observacao final explicando o motivo do status.
- [ ] Proxima inspecao periodica, quando aplicavel.
- [ ] Recomendacoes ou medidas corretivas quando houver `NC` ou pendencia.
- [ ] Coerencia entre checklist, fotos e conclusao.

Bloqueio recomendado: `Pendente` exige motivo de limitacao e condicao para reinspecao; `Reprovado` exige motivo tecnico direto; `Aprovado` exige checklist e fotos coerentes.

## Alertas que o Usuario Deve Ver

- [ ] Falta objeto principal.
- [ ] Falta localizacao.
- [ ] Falta slot obrigatorio.
- [ ] Falta conclusao tecnica.
- [ ] Escopo informado nao parece ser NR35 linha de vida.
- [ ] Familia principal foi trocada silenciosamente.
- [ ] Evidencia anexada nao esta vinculada a nenhum bloco do laudo.

## Criterio de Pronto Para Mesa

- [ ] Identificacao documental minima preenchida.
- [ ] Objeto da inspecao claro.
- [ ] Componentes principais avaliados.
- [ ] Fotos minimas anexadas ou ausencia justificada.
- [ ] Conclusao preliminar preenchida.

## Criterio de Pronto Para Emissao

- [ ] Mesa aprovou o caso.
- [ ] Finalizacao sem bloqueio critico ou finalizacao incompleta com responsabilidade humana registrada.
- [ ] Slots obrigatorios preenchidos com evidencia valida.
- [ ] Fotos que entram no PDF final foram selecionadas.
- [ ] Pacote oficial consegue ser congelado sem divergencia.

## Pendencias Para Implementacao no Produto

- [x] Exibir esse checklist dentro do fluxo NR35 via chat/gate, nao como menu separado.
- [x] Manter a correcao visual como regra interna do chat, sem criar tela ou experiencia aparente de aprendizado para o usuario.
- [x] Adicionar politica interna para foto ruim: baixa qualidade vira pendencia, nao conclusao categórica.
- [x] Registrar variacao real validada como referencia futura do tenant, nao como regra global.
- [~] Mostrar contagem de evidencias faltantes na primeira tela do caso.
- [ ] Vincular fotos aos blocos corretos do laudo.
- [ ] Bloquear ou alertar quando placeholder contar como evidencia.
- [ ] Criar validacao visual no E2E da demo NR35.

Evidencia 2026-04-25: o gate de qualidade `nr35_linha_vida` passou a expor o checklist minimo real no roteiro do template; o botao visivel de checklist saiu da superficie principal para manter o chat como centro.

Evidencia 2026-04-25: o chat passou a registrar correcao visual supervisionada para foto anterior, anexar o contexto de reavaliacao ao prompt atual e manter o aprendizado em rascunho isolado por `empresa_id` ate validacao da governanca.

Evidencia 2026-04-25: o prompt interno agora instrui a IA a nao revelar aprendizado/governanca ao usuario, pedir justificativa tecnica quando a classificacao visual nao fecha, aceitar continuidade por conta e risco como premissa declarada e descartar internamente sinais incompatíveis como referencia futura.

Evidencia 2026-04-25: instrucao base da IA passou a explicitar que a Tariel monta analise/rascunho, mas validacao, correcao tecnica, ART e assinatura final sao responsabilidade humana.

Evidencia 2026-04-25: toda mensagem com imagem recebe politica interna para checar nitidez, iluminacao, enquadramento, objeto visivel, distancia, angulo e contexto; se a foto estiver ruim, a IA deve apontar baixa qualidade e pedir outra foto/angulo antes de fechar conclusao.

Evidencia 2026-04-25: insistencia incompatível passou a receber marcadores internos de anti-poisoning e bloqueio de referencia futura; mesmo com status de validado, esses casos nao entram no contexto de aprendizados visuais usados pelo chat, salvo se houver validacao explicita de variacao real.

Evidencia 2026-04-25: correcao de laudo por linguagem natural no chat passou a gerar correcao estruturada interna com `hidden_from_user`, aplicada ao rascunho e omitida da fila visivel de correcoes do inspetor.

Evidencia 2026-04-25: quando o usuario tenta finalizar com pendencias, a experiencia agora volta para o chat: mostra o que falta, permite inserir uma mensagem de coleta no composer e oferece `Finalizar mesmo assim` com motivo humano apenas quando a politica do caso permitir.

## Ideias de Evolucao

- Criar uma marca interna `premissa_do_usuario` no report pack quando o usuario insistir contra a leitura tecnica, para o PDF/mesa diferenciarem fato observado de declaracao do cliente/inspetor.
- Exigir pelo menos uma evidencia adicional quando a IA discordar da classificacao visual e o usuario quiser seguir mesmo assim.
- Mostrar para a Mesa um alerta simples: "classificacao mantida por decisao do inspetor, baixa confianca visual", sem expor isso como aprendizado ao inspetor.
- Separar tres niveis internos de sinal: `confirmado_pela_imagem`, `confirmado_por_explicacao` e `mantido_por_responsabilidade_do_usuario`.
- Criar comparacao visual por embeddings ou descritores internos para reconhecer fotos parecidas com variacoes ja validadas, em vez de depender somente de texto consolidado pela Mesa.
- Guardar exemplos por angulo: `vista_geral`, `detalhe`, `lateral`, `baixo_para_cima`, `placa/tag` e `foto_ruim_validada_por_outra_evidencia`.
