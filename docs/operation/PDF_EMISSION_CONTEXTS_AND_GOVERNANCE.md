# Contextos de Criacao, PDF, Revisao e Emissao Oficial de Laudos

Atualizado em `2026-04-26`.

Status: analise operacional. Este documento nao muda contrato, template, gate, mobile smoke, Maestro, `human_ack`, Android, seed, flags ou comportamento de produto.

Escopo: mapear os caminhos existentes para um laudo/PDF ser criado, revisado, aprovado, assinado, emitido e entregue no Tariel, antes de avançar para E2E do Golden Path NR35.

## Fontes Referenciadas

Este documento consolida informacao ja espalhada nos documentos abaixo, sem substitui-los:

| Documento | Uso nesta analise |
|---|---|
| `PROJECT_MAP.md` | mapa rapido de dominios, portais e arquivos principais |
| `docs/STATUS_CANONICO.md` | direcao atual de produto, caso tecnico, validacao humana e emissao |
| `PLANS.md` | checkpoints PR1-PR7 do Golden Path NR35 e historico operacional |
| `docs/direcao_produto_laudos.md` | vocabulario de familia, schema, template, laudo output e Mesa |
| `web/docs/catalogo_laudos_operating_model.md` | modelo catalogo, familia tecnica, oferta comercial e liberacao por tenant |
| `web/docs/logistica_entrega_mesa_admin_ceo.md` | autoridade Admin CEO, release por empresa, versao final e trilha |
| `web/docs/direcao_operacional_mesa.md` | modelo inspetor, IA, Mesa e documento final |
| `web/docs/preenchimento_laudos_canonico.md` | separacao entre IA, estrutura de documento, revisao e PDF |
| `web/docs/regras_de_encerramento.md` | regras de finalizacao, reabertura e envio para Mesa |
| `web/docs/checklist_qualidade.md` | quality gate, evidencias minimas e override humano |
| `web/docs/mesa_avaliadora.md` | rotas e persistencia da Mesa Avaliadora |
| `docs/golden-paths/NR35_LINHA_DE_VIDA_GOLDEN_PATH.md` | contrato funcional local do Golden Path NR35 PR1-PR7 |

Observacao: a arvore atual possui trabalho local nao necessariamente commitado dos PRs NR35 1 a 7. A analise abaixo descreve o estado do workspace local observado em `2026-04-26`.

## Resumo Executivo

O Tariel possui mais de um caminho para produzir artefatos documentais. Nem todo PDF e uma emissao oficial.

A separacao mais importante e esta:

| Camada | O que representa | Fonte principal | Pode ser vendido como oficial? |
|---|---|---|---|
| Caso tecnico | Entidade operacional `Laudo`, mensagens, fotos, draft guiado, `dados_formulario` e `report_pack_draft_json` | `web/app/shared/db/models_laudo.py` | Nao, e a base de trabalho |
| Preview ou PDF operacional | PDF gerado para visualizacao, template, fallback legado ou editor rico | `/app/api/gerar_pdf`, `GeradorLaudos`, `template_laudos`, `template_editor_word` | Nao por si so |
| Finalizacao do inspetor | Envio do caso para Mesa ou aprovacao governada em modo sem Mesa/mobile quando permitido | `web/app/domains/chat/laudo_decision_services.py` | Nao, apenas muda o estado do caso |
| Mesa Avaliadora | Revisao humana, pendencias, anexos, decisao e pacote tecnico | `web/app/domains/revisor/mesa_api.py`, `web/app/domains/mesa/service.py` | Aprova tecnicamente, mas ainda nao congela emissao oficial |
| Snapshot aprovado | Fonte congelada de aprovacao humana para emissao | `ApprovedCaseSnapshot` | Sim, como insumo de emissao |
| Emissao oficial | Registro transacional, pacote ZIP congelado, hash, signatario, manifest, verificacao publica e historico | `EmissaoOficialLaudo`, `official_issue_transaction.py`, `official_issue_package.py` | Sim |
| Entrega ao cliente | Portal Cliente mostra status, hash, historico e download apenas quando ha emissao oficial valida | `cliente/dashboard_bootstrap_support.py`, `cliente/chat_routes.py` | Sim, quando `emissao_oficial.existe=true` |

Conclusao pratica: o E2E do Golden Path NR35 nao deve considerar `nome_arquivo_pdf` ou `/app/api/gerar_pdf` como sucesso final. O criterio de sucesso vendavel deve ser uma `EmissaoOficialLaudo` ativa, com pacote congelado, manifest NR35 valido, hash, snapshot aprovado, Mesa humana e download governado no Portal Cliente.

## Vocabulario Operacional

| Termo | Significado no produto atual | Evidencia principal |
|---|---|---|
| `Laudo` | caso tecnico persistido; guarda tenant, usuario, familia/template, status, formulario, report pack e nome de PDF materializado | `web/app/shared/db/models_laudo.py` |
| `status_revisao` | estado legado de revisao: `Rascunho`, `Aguardando Aval`, `Aprovado`, `Rejeitado` | `web/app/shared/db/contracts.py` |
| `case_lifecycle_status` | estado canonico derivado para UI e governanca V2 | `web/app/domains/chat/laudo_state_helpers.py` |
| `dados_formulario` | payload estruturado atual do laudo, incluindo output IA ou revisado | `Laudo.dados_formulario` |
| `report_pack_draft_json` | pacote semantico de coleta, evidencias, image slots, gates e review mode | `Laudo.report_pack_draft_json` |
| `nome_arquivo_pdf` | referencia ao PDF principal materializado no runtime do caso | `Laudo.nome_arquivo_pdf` |
| `ApprovedCaseSnapshot` | snapshot da versao aprovada, com hash, familia, output e manifest de evidencias | `web/app/shared/db/models_operational_memory.py` |
| `SignatarioGovernadoLaudo` | responsavel/signatario configurado pelo Admin CEO para tenant/familia | `web/app/shared/db/models_review_governance.py` |
| `EmissaoOficialLaudo` | emissao oficial congelada, com issue number, estado, hash, pacote e contexto | `web/app/shared/db/models_review_governance.py` |
| `reviewer_issue` | capability que libera emissao oficial governada | `web/app/shared/tenant_entitlement_guard.py` |
| `reviewer_decision` | capability que libera decisao e pacote da Mesa | `web/app/shared/tenant_entitlement_guard.py` |

## Tipos de PDF e Pacote

| Artefato | Como nasce | Onde esta | Status de governanca |
|---|---|---|---|
| Preview de template | Renderizacao de template salvo ou seed canonico | `web/app/domains/revisor/templates_laudo*.py`, `web/nucleo/template_laudos.py`, `web/nucleo/template_editor_word.py` | Nao e documento oficial |
| PDF operacional do chat | `POST /app/api/gerar_pdf` gera por template resolvido, editor rico ou fallback legado | `web/app/domains/chat/chat_aux_routes.py`, `web/nucleo/gerador_laudos.py` | Preview/documento de runtime, nao emissao oficial |
| PDF principal do caso | Arquivo PDF associado ao `Laudo.nome_arquivo_pdf` e depois usado pelo pacote oficial | `Laudo.nome_arquivo_pdf`, `official_issue_package.resolve_official_issue_primary_pdf_artifact` | Necessario, mas insuficiente para emissao oficial |
| PDF de pendencias Mesa | Export auxiliar para pendencias e contexto | `web/nucleo/gerador_laudos.py` | Interno/operacional |
| PDF do pacote Mesa | Export do pacote tecnico para revisao | `/revisao/api/laudo/{id}/pacote/exportar-pdf` | Governado por Mesa, nao congelado como emissao oficial |
| ZIP do pacote Mesa/oficial exportado | Export de pacote tecnico em ZIP | `/revisao/api/laudo/{id}/pacote/exportar-oficial` | Export governado, mas diferente do registro transacional |
| ZIP de emissao oficial | Bundle congelado por transacao, com `manifest.json`, hash e storage oficial | `emitir_oficialmente_transacional` | Artefato oficial vendavel |
| PDF oficial NR35 | PDF primario dentro ou referenciado pelo pacote oficial, validado contra manifest NR35 | `nr35_linha_vida_official_pdf.py`, `EmissaoOficialLaudo.issue_context_json` | Oficial se manifest e pacote estiverem validos |

## Eixos de Governanca

| Eixo | O que decide | Onde esta |
|---|---|---|
| Pacote comercial do tenant | Se a empresa tem chat sem Mesa, chat com Mesa ou Mesa com servicos no inspetor | `web/app/shared/tenant_admin_policy.py` |
| Capabilities do tenant/usuario | Criar, finalizar, enviar para Mesa, aprovar mobile, decidir Mesa, emitir oficial | `tenant_admin_policy.py`, `tenant_entitlement_guard.py` |
| Familia/template liberado | Quais familias, variantes, templates e modos podem ser usados pelo tenant | `web/app/domains/admin/client_catalog_form_routes.py`, `catalog_tenant_management_services.py` |
| Review mode | `mesa_required`, `mobile_review_allowed`, `mobile_autonomous` e overrides por release | `TenantFamilyReleaseLaudo.governance_policy_json`, `report_pack_draft_json.quality_gates` |
| Signatario governado | Quem pode assinar/emissao por tenant e familia | `SignatarioGovernadoLaudo`, Admin CEO em `/admin/clientes/{empresa_id}/signatarios-governados` |
| Quality gate | Minimos de evidencia, formulario, checklist e hard gates documentais | `web/app/domains/chat/gate_helpers.py` |
| Snapshot aprovado | Qual payload aprovado pode ser congelado em emissao | `web/app/shared/operational_memory_hooks.py` |
| Emissao oficial | Se ha PDF, verificacao publica, anexos obrigatorios, signatario, Mesa e blockers especificos | `web/app/shared/official_issue_package.py` |

Pacotes comerciais observados:

| Pacote | Chat inspetor | Mesa | Emissao oficial | Mobile approve |
|---|---:|---:|---:|---:|
| `inspector_chat` | sim | nao | nao | sim |
| `inspector_chat_mesa` | sim | sim | sim | nao |
| `inspector_chat_mesa_reviewer_services` | sim | sim | sim | nao |

## Estados e Transicoes Relevantes

| Estado legado | Leitura operacional | O que permite |
|---|---|---|
| `Rascunho` | caso em coleta | chat, edicao, draft, quality gate e finalizacao |
| `Aguardando Aval` | caso enviado para Mesa | Mesa pode revisar, responder, devolver ou aprovar |
| `Rejeitado` | devolvido para ajuste | inspetor/admin cliente precisa reabrir antes de continuar |
| `Aprovado` | aprovacao governada concluida | snapshot aprovado pode existir; emissao oficial pode ser preparada se demais requisitos passarem |

Estados derivados como `case_lifecycle_status`, `active_owner_role`, `allowed_surface_actions`, `review_phase` e `document_visual_state` refinam a UI e bloqueios. Eles sao montados principalmente em `laudo_state_helpers.py`, `official_issue_package.py` e adapters V2/mobile.

## Matriz de Pontos de Entrada

| Contexto | Usuario/canal | Entrada principal | Cria ou altera o que | Pode gerar PDF? | Pode emitir oficial? | Observacoes |
|---|---|---|---|---|---|---|
| Inspetor Web - abertura manual | Inspetor web | `POST /app/api/laudo/iniciar` | `Laudo` em `Rascunho`, snapshot de catalogo/template | Nao diretamente | Nao | Governado por `inspector_case_create` |
| Inspetor Web - chat livre | Inspetor web | `POST /app/api/chat/stream` e correlatos | mensagens, imagens, `dados_formulario`, report context | Sim, via `/app/api/gerar_pdf` | Nao diretamente | Chat livre pode produzir PDF operacional, mas nao oficial |
| Inspetor Web - fluxo guiado | Inspetor web | chat stream com `guided_inspection_draft` | draft guiado, evidence refs, handoff Mesa | Sim, depois de materializar documento | Nao diretamente | Review mode decide Mesa ou autonomia |
| Inspetor Web - finalizar | Inspetor web | `POST /app/api/laudo/{id}/finalizar` | muda status para `Aguardando Aval` ou `Aprovado` conforme policy | Nao diretamente | Nao | Passa por quality gate e capability `inspector_case_finalize` |
| Inspetor Web - preparar emissao | Inspetor web com capability | `GET /app/laudo/{id}/preparar-emissao` | monta contexto de pacote, signatario, blockers e emissao | Exibe links de pacote/PDF | Sim, via POST se `reviewer_issue` | Fluxo para pacote Mesa + servicos no Inspetor |
| Inspetor Web - emissao oficial | Inspetor web com `reviewer_issue` | `POST /app/api/laudo/{id}/emissao-oficial` | `EmissaoOficialLaudo`, ZIP congelado, issue number | Usa PDF principal existente | Sim | Mesmo motor transacional da Mesa |
| Mobile inspetor | App Android | `/app/api/mobile/*`, `/app/api/laudo/{id}/finalizar`, `mobile-review-command` | chat, draft guiado, fila offline, finalizacao e possivel aprovacao mobile governada | Nao ha geracao PDF final no app observada | Pode aprovar caso se policy permitir, mas nao emite ZIP oficial | App consome `emissao_oficial` no review package como leitura |
| Mesa/Revisor | Revisor web | `/revisao/api/laudo/{id}/avaliar`, pacote, anexos | status, pendencias, aprovacoes, snapshot aprovado | Sim, pacote Mesa PDF/ZIP | Sim, via `/revisao/api/laudo/{id}/emissao-oficial` | Caminho principal para venda com Mesa |
| Admin Cliente - chat | Admin cliente | `/cliente/api/chat/laudos`, `/mensagem`, `/finalizar` | proxy tenant-scoped para criar/finalizar/responder | Nao diretamente | Nao | Governado por visibilidade e `case_actions` |
| Admin Cliente - Mesa | Admin cliente com acoes | `/cliente/api/mesa/laudos/{id}/avaliar` e respostas | proxy tenant-scoped de revisao/Mesa | Nao diretamente | Nao observado como endpoint generico | Pode aprovar/rejeitar se policy permitir |
| Admin Cliente - documentos | Admin cliente | `/cliente/documentos`, bootstrap e downloads NR35 | lista status, historico e links oficiais | Baixa PDF oficial NR35 se permitido | Nao emite | Entrega ao cliente, nao autoridade de emissao |
| Admin CEO | Admin plataforma | `/admin/catalogo-laudos`, `/admin/clientes/*` | familias, ofertas, releases, signatarios, policies | Preview de template | Nao por caso | Define elegibilidade, nao emite laudo individual |

## Caminhos Detalhados

### 1. Criacao do Caso

O caso nasce como `Laudo` em `Rascunho`.

| Caminho | Arquivos/rotas | Dados gravados |
|---|---|---|
| Inspetor Web inicia relatorio | `web/app/domains/chat/laudo.py::api_iniciar_relatorio` | `empresa_id`, `usuario_id`, `tipo_template`, catalog family/variant, `codigo_hash`, entry mode |
| Chat stream cria caso quando necessario | `web/app/domains/chat/chat_stream_support.py` | mesmo `Laudo`, mensagens, contexto guiado |
| Admin Cliente cria caso | `web/app/domains/cliente/chat_routes.py`, `portal_bridge_chat.py` | proxy para dominio `chat`, com auditoria do portal cliente |
| Mobile lista/continua caso | `web/app/domains/chat/auth_mobile_routes.py`, `android/src/config/chatApi.ts` | consome laudos existentes e salva draft guiado |

Ponto importante: o Admin CEO nao cria laudo operacional. Ele cria governanca, catalogo, release e signatarios.

### 2. Coleta, IA e Estrutura

Durante a coleta, o sistema acumula conversa, imagens, documentos, draft guiado e report pack.

| Fonte | Papel | Arquivos |
|---|---|---|
| Chat livre | conversa, contexto, arquivos e mensagens IA/humano | `chat_stream_routes.py`, `chat_stream_support.py`, `web/nucleo/cliente_ia.py` |
| Fluxo guiado | draft estruturado, evidence refs, handoff Mesa | `chat_stream_support.py`, `schemas.py` |
| Report pack | image slots, quality gates, final validation mode | `report_pack_runtime_builders.py`, `report_pack_semantic_builders.py` |
| NR35 PR4 | prompt especializado e normalizacao pos-IA | `nr35_linha_vida_prompt.py`, `cliente_ia.py` |
| NR35 PR5 | revisao estruturada e diff humano | `nr35_linha_vida_structured_review.py`, `mesa_api.py` |

O sistema ja possui caminhos de IA estruturada, mas a autoridade final do documento continua humana.

### 3. Quality Gate e Finalizacao

`POST /app/api/laudo/{id}/finalizar` chama `finalizar_relatorio_resposta`.

Regras observadas:

| Regra | Efeito | Evidencia |
|---|---|---|
| exige capability `inspector_case_finalize` | tenant sem permissao nao finaliza | `laudo_decision_services.py` |
| quality gate bloqueia quando faltam evidencias/campos | retorna payload de pendencias | `gate_helpers.py`, `checklist_qualidade.md` |
| override humano pode existir quando permitido | registra responsabilidade humana | `registrar_override_humano_gate_qualidade` |
| `mesa_required` envia para `Aguardando Aval` | Mesa passa a ser dona da revisao | `finalizar_relatorio_resposta` |
| `mobile_autonomous` pode aprovar direto quando policy permitir | status vira `Aprovado` e snapshot pode ser gravado | `finalizar_relatorio_resposta` |
| NR35 Golden Path forca Mesa no piloto | nao deve cair para autonomia mobile | `nr35_linha_vida_validation.py`, PLANS PR2 |

Para NR35 vendavel, finalizacao do inspetor e apenas handoff. A emissao oficial so deve ocorrer depois de Mesa humana aprovar e o validador `official_pdf` passar.

### 4. Revisao Mesa

Mesa possui dois papeis distintos: revisar tecnicamente e operar pacote/emissao.

| Operacao | Rota/arquivo | Resultado |
|---|---|---|
| Ler pacote | `GET /revisao/api/laudo/{id}/pacote` em `mesa_api.py` | payload com caso, mensagens, anexos, pendencias, emissao oficial |
| Responder/devolver contexto | `command_handlers.py`, `command_side_effects.py` | mensagens, pendencias, reabertura, irregularidades |
| Aprovar/rejeitar | `POST /revisao/api/laudo/{id}/avaliar` | muda status, grava decisao e pode gravar snapshot aprovado |
| Exportar pacote PDF | `GET /revisao/api/laudo/{id}/pacote/exportar-pdf` | PDF operacional do pacote Mesa |
| Exportar ZIP oficial da Mesa | `GET /revisao/api/laudo/{id}/pacote/exportar-oficial` | ZIP exportavel do pacote tecnico |
| Emitir oficialmente | `POST /revisao/api/laudo/{id}/emissao-oficial` | chama `emitir_oficialmente_transacional` |

No PR5 NR35 local, a aprovacao Mesa tambem passa pelo validador NR35 em nivel `mesa` e grava `mesa_review.aprovacao_origem = mesa_humana`.

### 5. Materializacao de PDF

Existem renderizadores diferentes. Isso e funcionalmente importante.

| Renderer | Chamado por | Uso correto |
|---|---|---|
| `GeradorLaudos.gerar_pdf_inspecao` | fallback de `/app/api/gerar_pdf` | PDF operacional/preview legado |
| `gerar_preview_pdf_template` | template legacy com overlay | preview/template preenchido |
| `gerar_pdf_editor_rico_bytes` | editor rico e seed canonico promovido | preview/runtime com template moderno |
| `gerar_pdf_pacote_mesa` | export Mesa | pacote de revisao, nao emissao transacional |
| `gerar_exportacao_pacote_mesa_laudo_zip` | pacote e emissao oficial | ZIP usado pelo motor oficial |
| `nr35_linha_vida_official_pdf` | manifest e blockers NR35 | contrato auditavel NR35 para emissao |

Risco principal: o mesmo caso pode ter PDF operacional existente e ainda assim nao estar oficialmente emitido.

### 6. Emissao Oficial Transacional

O motor central e `emitir_oficialmente_transacional`.

Pre-condicoes sintetizadas:

| Pre-condicao | Bloqueio se falhar | Onde |
|---|---|---|
| `build_official_issue_summary.ready_for_issue=true` | `ValueError` com primeiro blocker | `official_issue_transaction.py` |
| caso aprovado e sem owner ativo | `review_not_approved` | `official_issue_package.py` |
| PDF principal materializado | `missing_pdf` | `build_anexo_pack_summary` |
| verificacao publica existe | `missing_public_verification` | `public_verification.py` |
| anexos obrigatorios completos | `annex_pack_incomplete` | `build_anexo_pack_summary` |
| signatario elegivel | `no_eligible_signatory` | `build_governed_signatory_summary` |
| NR35 valida official issue | `nr35_golden_path_validation_failed` e correlatos | `nr35_linha_vida_validation.py` |
| NR35 PDF auditavel valido | blockers de snapshot, divergence, manifest, fotos, Mesa | `nr35_linha_vida_official_pdf.py` |

O que a transacao grava:

| Registro | Conteudo |
|---|---|
| `package_sha256` | hash do ZIP oficial emitido |
| `package_fingerprint_sha256` | fingerprint de laudo, signatario, snapshot e manifest |
| `issue_number` | `TAR-YYYYMMDD-tenant-id` apos flush |
| `issue_state` | `issued`, `superseded` ou `revoked` |
| `package_storage_path` | storage persistente do ZIP congelado |
| `manifest_json` | manifest do ZIP |
| `issue_context_json` | signatario, emissor, catalog binding, PDF primario, manifest NR35 e linhagem |
| `approval_snapshot_id` | snapshot aprovado usado como fonte |

Reemissao: se ja existe emissao ativa e o snapshot, signatario, PDF ou manifest mudaram, a nova emissao substitui a anterior e a anterior vira `superseded`.

### 7. Assinatura e Signatario

O modelo atual usa `SignatarioGovernadoLaudo` como signatario governado configurado por tenant.

| Elemento | Onde fica | Regra |
|---|---|---|
| cadastro do signatario | Admin CEO em `/admin/clientes/{empresa_id}/signatarios-governados` | nome, funcao, registro profissional, validade, familias permitidas |
| elegibilidade | `build_governed_signatory_summary` | status `ready` ou `expiring_soon` |
| selecao | `resolve_signatory_for_official_issue` | um elegivel pode ser auto selecionado; multiplos exigem escolha |
| persistencia | `EmissaoOficialLaudo.signatory_id` e `issue_context_json.signatory_snapshot` | congelado na emissao |

Assinatura aqui significa governanca de responsavel tecnico e snapshot de assinatura. Se houver assinatura digital criptografica externa, ela nao aparece como dependencia obrigatoria universal neste fluxo observado.

### 8. Entrega no Portal Cliente

O Portal Cliente tem tres superficies relevantes:

| Superficie | Papel |
|---|---|
| `chat` | abrir, conversar, finalizar e reabrir casos quando o tenant permite acoes |
| `mesa` | acompanhar e responder Mesa; pode avaliar se policy permitir |
| `documentos` | listar biblioteca documental, status, hashes, historico e downloads oficiais |

No estado local PR7, NR35 tem entrega especifica:

| Elemento | Onde |
|---|---|
| bootstrap documental | `web/app/domains/cliente/dashboard_bootstrap_support.py` |
| status e links oficiais | `_build_cliente_official_delivery_payload` |
| historico de emissoes | `_listar_historico_emissoes_cliente` |
| download pacote NR35 | `/cliente/api/documentos/laudos/{id}/nr35/emissao-oficial/pacote` |
| download PDF NR35 | `/cliente/api/documentos/laudos/{id}/nr35/emissao-oficial/pdf` |
| UI | `web/static/js/cliente/portal_documentos_surface.js` |

Regra de seguranca observada: os links de download so aparecem quando ha emissao ativa, pacote com hash/storage, manifest NR35 valido e, para PDF, PDF primario pronto. A rota tambem retorna 404 quando nao encontra `nr35_official_pdf`, Mesa humana, manifest ok, hash ou snapshot aprovado.

## Contextos Possiveis de Produto

### Contexto A - Chat Livre com PDF Operacional

Fluxo:

1. Inspetor ou Admin Cliente abre caso.
2. Usuario conversa no chat livre e anexa imagens/documentos.
3. Usuario chama geracao de PDF por `/app/api/gerar_pdf`.
4. Sistema tenta template resolvido, editor rico, preview legacy ou fallback `GeradorLaudos`.

Classificacao:

| Pergunta | Resposta |
|---|---|
| Tem laudo? | Sim, enquanto `Laudo` existe |
| Tem PDF? | Pode ter |
| Tem revisao humana? | Nao necessariamente |
| Tem Mesa? | Nao necessariamente |
| Tem assinatura? | Nao |
| Tem emissao oficial? | Nao |
| Uso correto | preview, rascunho, documento operacional, teste de template |

Risco: se UI chamar esse PDF de "oficial", o produto vende algo sem governanca.

### Contexto B - Fluxo Guiado com Mesa

Fluxo:

1. Caso nasce com familia/template catalogado.
2. Draft guiado registra campos, evidencia e image slots.
3. Report pack define `final_validation_mode`.
4. Finalizacao envia para Mesa quando `mesa_required`.
5. Mesa revisa, corrige, devolve ou aprova.
6. Snapshot aprovado vira fonte da emissao oficial.
7. Emissao oficial congela pacote e hashes.

Classificacao:

| Pergunta | Resposta |
|---|---|
| Tem laudo? | Sim |
| Tem PDF operacional? | Pode ter |
| Tem Mesa? | Sim |
| Tem assinatura/signatario? | Exigido para emissao oficial |
| Tem emissao oficial? | Apenas apos POST de emissao transacional |
| Uso correto | caminho premium/vendavel |

Este e o caminho recomendado para NR35.

### Contexto C - Mobile com Finalizacao Governada

Fluxo:

1. App lista ou continua laudos.
2. App conversa, anexa e salva draft guiado.
3. App executa quality gate e finaliza pelo endpoint web compartilhado.
4. Resultado pode enviar para Mesa ou aprovar mobile se policy permitir.
5. App exibe review package, document facade, anexo pack e emissao oficial quando existir.

Classificacao:

| Pergunta | Resposta |
|---|---|
| Mobile cria/continua caso? | Sim |
| Mobile finaliza? | Sim, por `/app/api/laudo/{id}/finalizar` |
| Mobile aprova sozinho? | So com `mobile_case_approve` e review mode permitido |
| Mobile emite ZIP oficial? | Nao observado como caminho direto |
| Mobile baixa/emite PDF oficial? | Consome sinais/downloads de anexos, mas emissao oficial e governada no backend web/Mesa |

Para NR35 vendavel, nao usar `mobile_autonomous` como atalho, porque o contrato do piloto exige Mesa humana.

### Contexto D - Mesa com Emissao Oficial

Fluxo:

1. Caso chega em `Aguardando Aval`.
2. Revisor analisa pacote, pendencias, anexos e report pack.
3. Revisor aprova ou rejeita.
4. Se aprovado, snapshot aprovado e gerado.
5. Revisor chama emissao oficial com signatario elegivel.
6. Transacao congela ZIP e grava `EmissaoOficialLaudo`.

Classificacao:

| Pergunta | Resposta |
|---|---|
| Tem revisao humana? | Sim |
| Tem snapshot aprovado? | Sim, quando aprovacao grava snapshot |
| Tem PDF oficial? | Sim se PDF principal existe e o pacote oficial foi emitido |
| Quem governa? | Mesa, tenant capabilities e Admin CEO |

Este e o caminho mais alinhado com venda B2B industrial.

### Contexto E - Admin Cliente como Operador

Fluxo:

1. Admin Cliente acessa portal tenant-scoped.
2. Conforme policy, cria laudo, manda mensagem, finaliza, responde Mesa ou avalia.
3. Para documentos, consome a biblioteca e downloads oficiais.

Classificacao:

| Pergunta | Resposta |
|---|---|
| Admin Cliente pode criar/finalizar? | Sim se `case_actions` e capabilities permitirem |
| Admin Cliente pode revisar? | Pode proxyar Mesa se o contrato liberar |
| Admin Cliente emite oficialmente? | Nao ha rota generica observada para emitir; NR35 entrega downloads oficiais |
| Admin Cliente entrega ao cliente? | Sim pela superficie `documentos` |

Risco: este portal mistura acompanhamento, operacao e consumo. O E2E deve afirmar permissao por capability, nao assumir que todo Admin Cliente pode agir.

### Contexto F - Admin CEO como Governanca

Fluxo:

1. Admin CEO define familia tecnica.
2. Define modo, oferta, release por tenant, template default e overrides.
3. Configura pacote comercial e capabilities.
4. Configura signatario governado.

Classificacao:

| Pergunta | Resposta |
|---|---|
| Admin CEO cria laudo individual? | Nao |
| Admin CEO emite PDF? | Nao por caso |
| Admin CEO decide elegibilidade? | Sim |
| Admin CEO controla se existe Mesa/emissao? | Sim, por pacote/capability/release/signatario |

O E2E vendavel precisa ter setup de Admin CEO ou fixture equivalente que prove release ativo, capability `reviewer_issue` e signatario elegivel.

## Matriz de Autoridade por Acao

| Acao | Inspetor Web | Mobile | Mesa/Revisor | Admin Cliente | Admin CEO |
|---|---:|---:|---:|---:|---:|
| Criar caso | sim, se `inspector_case_create` | continua/lista; criacao depende fluxo exposto | nao principal | sim, via proxy se permitido | nao |
| Coletar conversa/fotos | sim | sim | responde/solicita | sim, via proxy | nao |
| Salvar draft guiado | sim | sim | le/revisa | via proxy conforme UI | nao |
| Gerar PDF preview | sim | nao observado | preview/pacote | nao diretamente | preview de template |
| Finalizar coleta | sim | sim | nao | sim, via proxy | nao |
| Enviar para Mesa | sim, se policy | sim via mobile command/finalizacao | recebe | via proxy | define se existe |
| Revisar tecnicamente | nao principal | limitado por mobile review policy | sim | possivel via proxy se permitido | nao |
| Aprovar caso | so se mobile/autonomia governada ou servico no inspetor | so se `mobile_case_approve` | sim | possivel via proxy | nao |
| Configurar signatario | nao | nao | consome | nao observado | sim |
| Emitir oficialmente | sim se `reviewer_issue` em fluxo servico no inspetor | nao observado | sim se `reviewer_issue` | nao observado generico | nao |
| Baixar oficial | sim se `reviewer_issue` | leitura no package, download de anexos | sim | sim na superficie documentos | nao |

## Diferenca Entre `PDF`, `Pacote Mesa` e `Emissao Oficial`

| Criterio | PDF operacional | Pacote Mesa | Emissao oficial |
|---|---|---|---|
| Tem `Laudo.nome_arquivo_pdf` | pode ter | pode usar | deve ter PDF principal |
| Tem `ApprovedCaseSnapshot` | nao obrigatorio | desejavel | obrigatorio para governanca real |
| Tem `EmissaoOficialLaudo` | nao | nao necessariamente | sim |
| Tem `package_sha256` | nao | export temporario pode ter internamente | sim, persistido |
| Tem `issue_number` | nao | nao | sim |
| Tem signatario governado | nao | exibido como bloqueio/contexto | sim |
| Tem storage congelado | nao por padrao | temporario no export | sim |
| Pode ser reemitido/superseded | nao | nao | sim |
| Deve aparecer no Portal Cliente como oficial | nao | nao | sim |

## Reabertura e Reemissao

O caso aprovado/emitido pode ser reaberto. A politica de reabertura permite decidir se o PDF anterior continua visivel no caso ativo ou sai da superficie ativa.

Evidencias:

| Elemento | Onde |
|---|---|
| endpoint de reabertura | `POST /app/api/laudo/{id}/reabrir` |
| politica `issued_document_policy` | `laudo_decision_services.py` |
| historico de documento emitido reaberto | `report_pack_draft_json.reopen_issued_document_history` |
| visualizacao Mesa | `revisor_painel_governanca.js` |
| reemissao recomendada | `official_issue_package.build_official_issue_summary` |

Regra para E2E: uma reabertura nao deve apagar a emissao anterior. Ela deve preservar historico e exigir nova aprovacao/emissao se o documento atual divergir do congelado.

## Matriz de Bloqueios de Emissao Oficial

| Bloqueio | Tipo | Mensagem operacional |
|---|---|---|
| Caso nao aprovado | governanca | aguardar aprovacao final/Mesa |
| PDF principal ausente | materializacao | gerar/materializar PDF principal |
| verificacao publica ausente | entrega/auditoria | preparar `codigo_hash`/URL publica |
| anexos obrigatorios ausentes | pacote | completar documentos/evidencias obrigatorias |
| sem signatario elegivel | assinatura | configurar signatario governado no Admin CEO |
| capability `reviewer_issue` ausente | contrato tenant | contratar/liberar emissao oficial |
| snapshot aprovado ausente | auditoria | aprovar por fluxo governado |
| PDF atual diverge do snapshot/manifest | integridade | reemitir ou regenerar a partir da fonte aprovada |
| NR35 sem 4 fotos | familia piloto | coletar evidencias obrigatorias |
| NR35 sem Mesa humana | familia piloto | aprovar via Mesa humana |
| NR35 sem rastreabilidade | familia piloto | vincular foto, achado, campo JSON e secao PDF |

## Implicacoes para o Golden Path NR35

Para nao forcar um caminho errado, o E2E NR35 deve seguir este caminho minimo:

| Etapa | Caminho recomendado |
|---|---|
| Setup tenant | Admin CEO ou fixture equivalente com familia NR35 ativa, template/release, `reviewer_decision`, `reviewer_issue` e signatario elegivel |
| Criacao | Inspetor Web ou Admin Cliente usando familia `nr35_inspecao_linha_de_vida`/alias `nr35_linha_vida` |
| Coleta | chat/fluxo guiado com 4 fotos obrigatorias e dados minimos |
| IA | prompt NR35 preenche JSON, marca pendencias sem inventar dados |
| Revisao | Mesa humana revisa JSON estruturado, registra diff e justificativa |
| Aprovacao | Mesa aprova com `mesa_review.aprovacao_origem = mesa_humana` |
| PDF | PDF principal materializado a partir do snapshot aprovado |
| Emissao | `emitir_oficialmente_transacional` gera `EmissaoOficialLaudo` ativa |
| Entrega | Portal Cliente `documentos` mostra status `emitido`, hash, historico e links |

Caminhos que nao devem ser usados como prova final do Golden Path:

| Caminho | Motivo |
|---|---|
| apenas `/app/api/gerar_pdf` | gera PDF operacional, nao emissao oficial |
| apenas `status_revisao=Aprovado` | aprova caso, mas nao congela pacote |
| apenas pacote Mesa PDF | e pacote de revisao, nao emissao oficial |
| mobile autonomous | conflita com decisao `mesa_required` do piloto NR35 |
| download de anexo Mesa | nao prova PDF oficial |
| template preview | nao prova caso real nem snapshot aprovado |

## Lacunas e Riscos Atuais

| Risco | Impacto | Evidencia | Mitigacao recomendada |
|---|---|---|---|
| Confusao entre PDF operacional e oficial | cliente pode receber rascunho como entrega | `/app/api/gerar_pdf` gera PDF sem `EmissaoOficialLaudo` | UI e E2E devem checar `EmissaoOficialLaudo` ativa |
| Multiplos renderizadores de PDF | divergencia visual/semantica entre preview e oficial | `GeradorLaudos`, editor rico, template preview, pacote Mesa | contrato por familia deve definir renderer oficial |
| `nome_arquivo_pdf` isolado parece suficiente | emissao pode falhar mesmo com PDF presente | `build_official_issue_summary` ainda exige aprovacao, hash, signatario, anexos | tratar `nome_arquivo_pdf` como requisito, nao como prova |
| Admin Cliente pode operar dependendo da policy | E2E pode passar com permissao errada | `case_actions`, capabilities e tenant grants | cenarios devem testar read-only e case-actions |
| Mobile possui caminhos de aprovacao governada | NR35 poderia escapar da Mesa se policy errada | `mobile_case_approve`, `mobile_autonomous` | NR35 deve bloquear autonomia no piloto |
| Reemissao/historico pode ser ignorado | documento antigo pode parecer atual | `superseded`, `primary_pdf_diverged`, reissue recommended | E2E deve cobrir emissao ativa e divergencia em recorte futuro |
| Signatario ausente bloqueia venda | pacote tecnico pronto nao emite | `no_eligible_signatory` | setup de staging deve criar signatario por tenant/familia |
| Catalog release inativo | familia existe mas nao esta vendavel para tenant | `TenantFamilyReleaseLaudo.release_status` | fixture de piloto deve provar release ativo |
| JSON aprovado divergente do PDF | documento entregue pode nao corresponder ao aprovado | PR6 adicionou blockers NR35 | manter teste de snapshot aprovado vs payload atual |
| Portal Cliente generico ainda depende de familia | downloads oficiais NR35 estao especificos | rotas `/nr35/emissao-oficial/*` | generalizar entrega oficial por familia em PR posterior |

## Requisitos para E2E Antes do PR8

| Area | Requisito de teste |
|---|---|
| Tenant | fixture com pacote `inspector_chat_mesa` ou `inspector_chat_mesa_reviewer_services` |
| Catalogo | NR35 ativo para tenant, template default e release ativo |
| Signatario | signatario governado elegivel para `nr35_inspecao_linha_de_vida` |
| Coleta | 4 fotos obrigatorias com referencias persistidas |
| IA | JSON NR35 completo ou pendencias estruturadas sem invencao |
| Revisao | diff humano registrado quando editar JSON |
| Mesa | aprovacao humana grava origem `mesa_humana` |
| PDF | PDF principal materializado e referenciado no pacote oficial |
| Emissao | `EmissaoOficialLaudo.issue_state=issued`, `package_sha256`, `issue_number` |
| Portal Cliente | status `emitido`, historico, hash, download PDF/pacote |
| Negativo | rascunho, 3 fotos, sem Mesa, sem signatario e sem manifest nao liberam download oficial |

## Perguntas em Aberto

| Pergunta | Por que importa |
|---|---|
| A emissao oficial deve ser sempre da Mesa ou tambem do Inspetor com `reviewer_issue`? | O codigo permite ambos; produto precisa definir narrativa por pacote |
| Admin Cliente deve poder emitir oficialmente ou apenas baixar/acompanhar? | Hoje ha entrega/download NR35, mas nao rota generica de emissao pelo cliente |
| Qual e o renderer oficial por familia fora NR35? | Existem varios renderizadores e fallback legado |
| O pacote oficial deve sempre incluir o PDF primario ou pode referenciar storage externo? | Hoje resolve artefato e hash, mas politica de storage precisa ser estavel |
| Assinatura digital externa sera obrigatoria em producao? | Hoje ha signatario governado, nao necessariamente assinatura criptografica |
| Como tratar tenants sem Mesa para familias de alto risco? | Existe `inspector_chat` e mobile autonomy, mas NR35 piloto exige Mesa |
| O Portal Cliente deve expor pacote oficial completo para todos os perfis? | Risco de JSON/anexos sensiveis |
| Qual caminho sera o baseline para familias nao NR35? | NR35 tem contrato especial local; outras familias podem estar menos fechadas |

## Recomendacao Operacional

Para o PR8/E2E NR35, usar o caminho `fluxo guiado ou chat estruturado -> finalizacao -> Mesa humana -> snapshot aprovado -> PDF principal -> emissao oficial transacional -> Portal Cliente Documentos`.

Nao usar `gerar_pdf` nem pacote Mesa como criterio final de sucesso. Eles sao necessarios para operacao e revisao, mas a fronteira vendavel e `EmissaoOficialLaudo` ativa com pacote congelado, hash, signatario, manifest e download controlado.

Para reduzir risco de regressao, o E2E deve validar explicitamente:

| Check | Esperado |
|---|---|
| antes da Mesa | sem download oficial no Portal Cliente |
| apos aprovacao sem emissao | status pronto/aguardando emissao, sem link oficial |
| apos emissao oficial | links de PDF/pacote, hash e historico presentes |
| com 3 fotos | emissao bloqueada |
| com Mesa nao humana | emissao bloqueada |
| com PDF atual divergente | reemissao recomendada ou bloqueio conforme estado |

## Resultado Do PR8 NR35

O PR8 adiciona `web/tests/test_nr35_golden_path_official_issue_e2e.py` como prova de integracao governada do caminho vendavel NR35.

O cenario positivo cobre:

| Check | Evidencia no teste |
|---|---|
| tenant governado | pacote `inspector_chat_mesa`, familia/release NR35 ativo, capability `reviewer_decision` e `reviewer_issue` |
| signatario governado | `SignatarioGovernadoLaudo` ativo e elegivel para `nr35_inspecao_linha_de_vida` |
| coleta/IA controlada | fixture NR35 sem chamada externa, 4 fotos obrigatorias e `foto_detalhe_critico` |
| revisao humana | edicao estruturada com diff e justificativa |
| Mesa humana | `mesa_review.aprovacao_origem = mesa_humana` |
| snapshot aprovado | `ApprovedCaseSnapshot` usado pela emissao |
| emissao oficial | `emitir_oficialmente_transacional` cria `EmissaoOficialLaudo.issue_state = issued` |
| manifest/hash | ZIP oficial contem `nr35_official_pdf`, hashes do pacote/PDF, versoes e changelog humano |
| Portal Cliente | `surface=documentos` mostra `emitido`, historico, hashes e links oficiais |
| tenant boundary | outro tenant recebe 404 nos downloads oficiais |

Os negativos do PR8 deixam explicito que estes caminhos nao fecham entrega vendavel:

| Cenario | Resultado esperado |
|---|---|
| PDF operacional com `nome_arquivo_pdf` | Portal Cliente nao cria links oficiais sem `EmissaoOficialLaudo` |
| 3 fotos | emissao bloqueada por `nr35_required_photo_slot_missing` |
| Mesa nao humana/aprovacao por IA | emissao bloqueada por origem invalida e `ia_aprovou_mesa` |
| sem signatario governado | emissao bloqueada por `no_eligible_signatory` |

Lacunas ainda fora do PR8:

| Lacuna | Motivo |
|---|---|
| reemissao completa | precisa recorte dedicado para `superseded`, divergencia do PDF e novo snapshot |
| auditoria de download | os endpoints fazem tenant boundary, mas ainda nao registram evento de download oficial |
| polimento visual | o E2E valida payload e download, nao regressao visual da aba Documentos |
