# Linguagem de Produto e Estados de UI

Este documento define a camada de tradução entre estados técnicos do Tariel e linguagem exibida ao usuário. O backend pode continuar usando nomes de contrato, mas a UI deve mostrar decisões claras, orientadas a operação.

## Matriz Canônica

| Estado/backend | Termo de UI | Descrição curta | Onde usar | Não usar |
|---|---|---|---|---|
| `nome_arquivo_pdf`, preview ou materialização de trabalho | PDF operacional | Arquivo de trabalho do caso, útil para conferência interna, sem valor de emissão oficial. | Inspeção IA, Mobile, Portal Cliente Documentos, preparação de emissão. | PDF oficial, documento emitido, pacote oficial. |
| `EmissaoOficialLaudo.issue_state=issued` | Emissão oficial | Documento emitido pelo motor oficial, vinculado a snapshot aprovado, signatário, hash e auditoria. | Portal Cliente, Revisão Técnica, Inspeção IA, Mobile quando houver emissão ativa. | Rascunho, preview, PDF operacional. |
| Pacote ZIP/hash gerado pela emissão oficial | Pacote oficial | Conjunto congelado de artefatos oficiais, manifesto, hashes e metadados auditáveis. | Download principal, auditoria, Portal Cliente Documentos. | Pacote Revisão Técnica, anexos operacionais. |
| Emissão ativa disponível ao cliente | Documento emitido | Estado curto para documento já emitido oficialmente. | Badges, timeline, lista documental. | Documento final se não houver emissão oficial. |
| Lista de `EmissaoOficialLaudo` do caso | Histórico de emissões | Linha do tempo de emissões anteriores e atual, preservando números e hashes. | Portal Cliente Documentos, auditoria, reemissão. | Atual quando o registro estiver substituído. |
| `reissue_recommended=true` ou divergência pós-emissão | Reemissão recomendada | O caso mudou depois da emissão ativa e exige nova aprovação/snapshot antes de nova emissão. | Alertas leves, cards documentais, Chat/Mobile. | Erro de PDF, emissão automática, superseded cru. |
| `issue_state=superseded` | Documento substituído | Emissão anterior preservada no histórico, mas não é a versão principal. | Histórico de emissões e auditoria. | Atual, ativa, superseded. |
| Self-review governado sem Revisão Técnica | Aprovação interna | Finalização humana interna permitida por pacote/família, sem Revisão Técnica separada. | Inspeção IA, Mobile, Portal Cliente pacote/recursos. | mobile_autonomous, autonomia mobile. |
| Revisão por revisor separado | Revisão Técnica | Módulo de governança contratado ou exigido pela família. | Handoff, fila, aprovação, bloqueios de família. | Reviewer, reviewer_decision, reviewer_issue, mesa_avaliadora. |
| Faltas de evidência, correção ou decisão | Pendências do caso | Itens que bloqueiam avanço operacional ou emissão. | Inspeção IA, Mobile, Revisão Técnica, Portal Cliente status. | Blockers, missing_evidence cru. |
| Capability ausente no contrato | Não incluído no pacote | Recurso não contratado para o tenant atual. | Portal Cliente recursos, botões desabilitados. | Sem permissão quando for limite comercial. |
| Regra depende de família, template ou release | Depende da família/template | Disponibilidade varia pela governança da família. | Recursos, ajuda contextual, bloqueios. | Erro genérico. |
| Família de alto risco recomenda Revisão Técnica | Família recomenda Revisão Técnica | A família deve destacar revisão separada como caminho recomendado, sem bloquear aprovação interna autorizada quando o gate técnico estiver completo. | Inspeção IA, Mobile, Portal Cliente, avisos NR35/alto risco. | nr35_mesa_required_unavailable cru. |

## Estados e Badges

| Estado visual | Uso | Tom recomendado |
|---|---|---|
| Em coleta | Caso/documento ainda em formação. | Neutro |
| Pendente | Existe ação necessária antes de avançar. | Atenção |
| Em aprovação interna | Aprovação humana interna em andamento. | Azul/operacional |
| Na Revisão Técnica | Caso está com Revisão Técnica. | Índigo/governança |
| Aprovado | Revisão humana concluiu aprovação. | Verde |
| Emitido | Emissão oficial ativa existe. | Verde forte |
| Reemissão recomendada | Emissão ativa divergiu do estado atual. | Âmbar |
| Substituído | Emissão antiga preservada no histórico. | Cinza |
| Bloqueado por pacote | Recurso ausente no contrato. | Cinza/âmbar |
| Atenção por família | Família recomenda governança adicional ou revisão separada. | Âmbar |

## Regras de Layout

- A ação principal deve ser única por bloco. Em Documentos, o download principal é o pacote oficial quando existir.
- Hashes e metadados longos devem ficar em bloco de auditoria copiável/recolhível, não em chips no topo.
- Submenus de superfície devem ser contextuais. Evite empilhar barras sticky quando a página já possui shell fixo.
- PDF operacional e emissão oficial nunca devem compartilhar o mesmo rótulo visual.
- Histórico pode preservar acesso a emissões antigas, mas não deve chamar documento substituído de atual.

## Aplicação no UX-A

- Piloto aplicado em Portal Cliente Documentos.
- O read model expõe `document_ui` com rótulos canônicos para a UI sem remover campos técnicos legados.
- A superfície separa resumo, documento oficial/PDF operacional, histórico, auditoria e recursos do pacote.
- O submenu de Documentos deixa de ser sticky nessa superfície piloto para reduzir poluição durante scroll.
- UX-B aplicado na Inspeção IA (prévia de finalização e `preparar-emissao`) com separação explícita entre `PDF operacional` e `Emissão oficial`.
- UX-C aplicado no Portal Cliente Documentos com layout de blocos (`Resumo`, `Documento oficial`, `Histórico de emissões`, `Auditoria`, `Recursos do pacote`) e redução de chips em excesso.
- UX-D aplicado no Portal Cliente Inspeção IA/Revisão Técnica com status canônico (`Em coleta`, `Na Revisão Técnica`, `Pendente`, `Aprovado`, `Emitido`), remoção de `Owner` cru e barra de seção não-sticky nessas duas superfícies.
- UX-D estendido para `Servicos`, `Ativos` e `Recorrencia` no Portal Cliente com subnav nao-sticky e leitura em blocos/linhas para reduzir densidade de chips.
- UX-D estendido para `Painel Admin Cliente` com troca de `Owner predominante` por `Responsavel predominante` e subnav nao-sticky na superficie.
- UX-D estendido para `Inspetor > Preparar emissao` com copy mais direta entre emissao oficial e PDF operacional (`Mudancas desde a emissao ativa`, `Acao sugerida`).
- UX-D estendido para `Revisão Técnica` (`/revisao/painel`) com sinais canônicos nos itens de fila (`Status`, `Responsavel`, `Decisão técnica disponível`), remoção de `Fluxo legado`/`Owner` e cabeçalhos de seção da lista sem sticky.

## Gaps após UX-D

- Revisar Revisão Técnica para substituir capabilities internas por labels canônicos nas mensagens de bloqueio.
- Revisar cartões de histórico e prompts de reabertura da Inspeção IA para reduzir termos legados em torno de `PDF final`.
- Padronizar badges globais em CSS compartilhado, reduzindo variações locais de `pill` e `hero-chip`.
- Revisar Admin CEO, onde termos técnicos ainda podem aparecer em configurações avançadas; manter técnicos apenas em modo avançado.
