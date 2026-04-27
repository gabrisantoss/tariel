# Alinhamento Arquitetural Mobile/Chat-First

Atualizado em `2026-04-27`.

Status: analise arquitetural. Este documento nao altera codigo, rotas, templates, release gate, mobile smoke, Maestro, `human_ack`, Android, NR35 ou comportamento de produto.

## 1. Resumo executivo

A visao mobile/chat-first do Tariel esta parcialmente suportada pela arquitetura atual. O nucleo ja trata `Mobile` e `Chat Inspetor` como superficies tecnicas centrais do caso, com chat IA, anexos, quality gate, finalizacao, handoff para Mesa e revisao mobile governada. Tambem ja existe governanca por tenant, pacote, portal, capability, familia/template e signatario, configurada pelo `Admin CEO`.

O ponto forte atual e que a decisao entre `com Mesa`, `sem Mesa` e `mobile-first` nao esta totalmente hardcoded em uma tela. Ela passa por `tenant_admin_policy.py`, `tenant_entitlement_guard.py`, `report_pack_draft_json.quality_gates.final_validation_mode`, policy V2 no request, familia/template e estado do caso.

O desalinhamento principal e semantico e contratual: parte das capacidades reutilizaveis ainda esta nomeada e condicionada como se pertencesse sempre ao portal `revisor`. Exemplos: `reviewer_decision` e `reviewer_issue` sao usadas para decisao e emissao oficial, mas tecnicamente o motor de emissao ja pode ser chamado pelo `Chat Inspetor` em `/app/api/laudo/{id}/emissao-oficial`. Isso mostra que a capacidade e mais ampla que "Mesa separada", mas o nome e a dependencia de portal ainda puxam o desenho para Mesa.

Conclusao pratica: o projeto nao precisa transformar todo cliente em fluxo com Mesa. Tambem nao deve transformar todo cliente sem Mesa em fluxo fraco. A arquitetura-alvo deve tratar `Mesa` como modulo/portal opcional de revisao externa ou separada, enquanto `revisao`, `aprovacao`, `pendencias`, `assinatura`, `emissao` e `pacote oficial` viram capacidades centrais reutilizaveis por Chat/Mobile/Mesa conforme governanca.

## 2. Fontes analisadas

| Fonte | Evidencia relevante |
| --- | --- |
| `docs/STATUS_CANONICO.md` | Mobile-first, chat IA como centro, Mesa obrigatoria/opcional/ausente conforme politica, aprovacao humana final obrigatoria. |
| `docs/operation/PORTAL_GOVERNANCE_AND_TENANT_SCENARIOS.md` | Modelo multiportal, Admin CEO como autoridade global, Admin Cliente como operador do tenant, pacotes/capabilities. |
| `docs/operation/PDF_EMISSION_CONTEXTS_AND_GOVERNANCE.md` | Separacao entre PDF operacional, pacote Mesa, snapshot aprovado, emissao oficial e entrega no Portal Cliente. |
| `PLANS.md` | Historico recente de gate, mobile, Mesa, emissao oficial e Golden Path NR35. |
| `PROJECT_MAP.md` | Pontos de entrada por dominio: chat, mesa, cliente, admin, mobile e documento. |
| `web/app/shared/tenant_admin_policy.py` | Presets comerciais, portais, capabilities, operating model e grants cross-surface. |
| `web/app/shared/tenant_entitlement_guard.py` | Guard central por capability do tenant/usuario. |
| `web/app/domains/chat/laudo_decision_services.py` | Finalizacao do caso, fallback `mobile_autonomous`, comandos de revisao mobile e snapshot aprovado. |
| `web/app/domains/chat/laudo.py` | Emissao oficial tambem exposta no Chat Inspetor quando `reviewer_issue` existe. |
| `web/app/domains/revisor/mesa_api.py` | Rotas Mesa para pacote, decisao, revisao estruturada NR35, emissao e download. |
| `web/app/domains/revisor/service_messaging.py` | Service de decisao humana da Mesa, parcialmente reutilizavel mas ainda revisor-centric. |
| `web/app/domains/mesa/*` | Pacote da Mesa decomposto em builders/read models reutilizaveis. |
| `web/app/shared/official_issue_package.py` e `official_issue_transaction.py` | Motor central de emissao oficial, hash, pacote, snapshot, signatario e historico. |
| `android/src/config/chatApi.ts` e `android/src/config/mesaApi.ts` | Mobile finaliza caso, roda quality gate e executa comandos de revisao mobile/Mesa. |
| `android/src/features/chat/*` | UI mobile ja diferencia validacao humana, Mesa, emissao, reemissao recomendada e integridade do documento. |
| `web/static/js/chat/*` e `web/static/js/cliente/*` | Chat Inspetor e Portal Cliente ja exibem sinais de Mesa, finalizacao, capabilities e entrega oficial. |

## 3. Diagnostico do estado atual

| Area | Estado atual | Alinhamento com mobile/chat-first | Principal lacuna |
| --- | --- | --- | --- |
| Governanca Admin CEO | Forte: pacotes, portais, capabilities, catalogo, releases e signatarios existem. | Bom. O Admin CEO ja governa contrato. | Capabilities precisam expressar melhor revisao/emissao sem acoplar tudo ao portal `revisor`. |
| Admin Cliente | Funcional e governado por tenant. Pode gerir equipe, ver documentos e operar casos quando policy permite. | Bom, desde que nao vire portal tecnico universal por padrao. | UX precisa explicar melhor capacidade contratada versus acao bloqueada. |
| Chat Inspetor | Forte para coleta, chat IA, anexos, quality gate, finalizacao, handoff e preparacao de emissao. | Bom. Deve ser cockpit tecnico web. | Ferramentas de revisao estruturada ainda estao mais concentradas na Mesa/revisor. |
| Mobile | Ja tem chat, finalizacao, quality gate, fila offline, Mesa nativa, comandos de revisao e leitura de emissao. | Bom, mas incompleto para fechamento documental oficial. | Falta expor de forma completa revisao estruturada, assinatura/emissao/download oficial quando permitido. |
| Mesa | Forte como portal separado de revisao, decisao, pacote e emissao. | Bom para clientes governados. | Nomes e capabilities fazem partes reutilizaveis parecerem exclusivas da Mesa. |
| Emissao oficial | Motor central forte, transacional, com snapshot, hash, pacote e signatario. | Bom como servico reutilizavel. | Capability `reviewer_issue` deveria virar conceito neutro de `official_issue`. |
| Portal Cliente | Entrega documentos, status, historico, hashes e downloads oficiais. Tambem pode operar chat/mesa conforme policy. | Parcial. Serve bem como admin/auditoria; pode operar se permitido. | Evitar confusao entre administrador, operador tecnico e consumidor documental. |

## 4. Como a decisao funciona hoje

O desenho atual combina varios eixos:

| Eixo | Como influencia |
| --- | --- |
| Pacote comercial | `inspector_chat`, `inspector_chat_mesa` e `inspector_chat_mesa_reviewer_services` definem portais e capabilities. |
| Portal liberado | `cliente`, `inspetor` e `revisor` limitam acesso de superficies. |
| Capability | `inspector_case_create`, `inspector_case_finalize`, `inspector_send_to_mesa`, `mobile_case_approve`, `reviewer_decision`, `reviewer_issue`. |
| Operating model | `standard` ou `mobile_single_operator`; este ultimo concentra operacao e grants web complementares. |
| Familia/template | Pode exigir Mesa/signatario ou permitir self-review. NR35 e exemplo de familia de alto risco com Mesa obrigatoria no piloto. |
| Report pack | `quality_gates.final_validation_mode` informa `mesa_required`, `mobile_review_allowed` ou `mobile_autonomous`. |
| Estado do caso | `Rascunho`, `Aguardando Aval`, `Aprovado`, `emitido` e derivados controlam acoes permitidas. |

O comportamento observado em `laudo_decision_services.py` e:

| Condicao | Resultado |
| --- | --- |
| Familia de alto risco com guardrail estrito | Forca `mesa_required`, mesmo se policy/report pack vier como `mobile_autonomous`. |
| `review_mode != mesa_required` em familia simples | Modo segue como veio da policy/report pack. |
| `mesa_required` + capability `inspector_send_to_mesa` | Caso segue para Mesa. |
| `mesa_required` + familia de alto risco estrita | Bloqueia se nao houver Mesa, porque a familia exige revisao separada. |
| `mesa_required` sem Mesa + capability `mobile_case_approve` | Cai para `mobile_autonomous`, registrando motivo `tenant_without_mesa`. |
| Sem Mesa e sem aprovacao mobile | Bloqueia com erro acionavel. |

Essa regra e coerente para o estado atual, mas o nome `mobile_autonomous` e fraco para a visao de produto: a decisao nao e autonoma nem necessariamente mobile; ela e uma aprovacao humana interna/self-review governada.

## 5. Matriz de capacidades da Mesa

| Capacidade | Mesa separada | Chat Inspetor | Mobile | Depende de capability | Deve ser reutilizavel? |
| --- | --- | --- | --- | --- | --- |
| Revisar pacote/caso | Sim, via `/revisao/api/laudo/{id}/pacote` e read models da Mesa. | Parcial: prepara emissao e le sinais de pacote, mas nao tem toolkit completo de revisao. | Parcial: consome review package e contexto de finalizacao. | Hoje `reviewer_decision`/portal `revisor` para Mesa; leitura varia por superficie. | Sim. Deve virar toolkit de revisao por capability, nao por portal fixo. |
| Listar pendencias | Sim, pacote Mesa, mensagens, pendencias e irregularidades. | Sim/parcial: quality gate, correcoes e preview de finalizacao. | Sim/parcial: quality gate, missing evidence, Mesa feed/thread. | `inspector_case_finalize`, `inspector_send_to_mesa` ou leitura de pacote conforme contexto. | Sim. Pendencia e conceito do caso, nao da Mesa. |
| Aprovar caso | Sim, via `reviewer_decision`. | Parcial: finalizacao pode aprovar sem Mesa em `mobile_autonomous`; emissao exige outra capability. | Sim/parcial: `aprovar_no_mobile` com `mobile_case_approve`. | Hoje dividido entre `reviewer_decision` e `mobile_case_approve`. | Sim, mas com guardrails por familia, tenant e papel. |
| Devolver/reabrir para ajuste | Sim, decisao Mesa e mensagens de devolucao. | Sim/parcial: reabrir, correcoes estruturadas e retorno ao chat. | Sim: `devolver_no_mobile` e `reabrir_bloco`. | Hoje dividido entre Mesa/revisor e comandos mobile. | Sim. Deve ser `case_return_for_correction`. |
| Conversar com Mesa | Sim, portal revisor. | Sim, widget/canal Mesa quando permitido. | Sim, thread/feed Mesa nativos. | `inspector_send_to_mesa` e grants de portal. | Sim para handoff; nao deve existir quando tenant/familia nao tem Mesa. |
| Assinar/signatario | Sim, emissao oficial seleciona signatario governado. | Sim/parcial: preparar emissao e emitir pelo Inspetor se `reviewer_issue`. | Leitura parcial; selecao/assinatura oficial nao esta completa no app. | `reviewer_issue` + signatario elegivel. | Sim, mas a autoridade do signatario deve continuar Admin CEO. |
| Emitir oficialmente | Sim, `/revisao/api/laudo/{id}/emissao-oficial`. | Sim, `/app/api/laudo/{id}/emissao-oficial`. | Nao como acao completa observada; app le sinais de emissao. | `reviewer_issue`. | Sim. Motor ja e central; capability deveria ser neutra. |
| Gerar pacote oficial/exportavel | Sim, pacote Mesa PDF/ZIP e pacote de emissao. | Parcial, por preparacao de emissao e motor oficial. | Parcial, leitura do review package. | `reviewer_decision`/`reviewer_issue`. | Sim. Pacote e artefato do caso. |
| Baixar documento oficial | Sim, download de emissao/pacote. | Sim, download pelo Inspetor quando emitido. | Parcial/indireto; nao aparece como fluxo completo de download oficial. | Capability + tenant boundary + emissao ativa. | Sim. Download deve ser central, tenant-scoped e auditavel. |
| Entrega ao cliente | Nao e papel principal da Mesa. | Nao e papel principal do Inspetor. | Nao e papel principal do Mobile. | Portal Cliente e emissao ativa. | Sim como consumo, nao como decisao tecnica. |

## 6. Classificacao das capacidades

| Capacidade | Classificacao atual |
| --- | --- |
| Quality gate e pendencias | Ja pode ser usada por Inspetor/Mobile; boa base reutilizavel. |
| Revisao estruturada de JSON | Existe no backend, mas esta mais exposta via Mesa/revisor e NR35. Precisa virar capability reutilizavel. |
| Aprovacao interna/self-review | Existe para Mobile/Chat em alguns modos, mas com nome `mobile_autonomous` e capability `mobile_case_approve`. Precisa normalizar. |
| Aprovacao Mesa separada | Deve continuar exclusiva da Mesa quando `mesa_required` ou quando cliente contratou Mesa separada. |
| Assinatura/signatario | Existe como governanca central. Deve ser reutilizavel, mas nunca delegada livremente ao Admin Cliente ou IA. |
| Emissao oficial | Motor central ja reutilizavel por Mesa e Chat. Falta capability neutra e superficie mobile completa. |
| Pacote oficial | Backend bem estruturado; UI e nomes ainda Mesa-centric. Deve ser reutilizavel. |
| Download oficial | Portal Cliente e Chat ja cobrem parte; Mobile precisa UX/endpoint claro se pacote permitir. |

## 7. Cenarios operacionais

### Cliente individual

O caminho natural e `inspector_chat` com `mobile_single_operator` quando aplicavel. O Admin Cliente continua existindo para conta, equipe minima, diagnostico e contrato; o Mobile/Chat fazem a operacao tecnica.

| Pergunta | Leitura atual |
| --- | --- |
| Mobile/Chat deve criar? | Sim, se `inspector_case_create` e familia/template estiverem liberados. |
| Mobile/Chat deve revisar/aprovar? | Sim para familias simples quando `mobile_case_approve` ou futura `self_review_allowed` existir. |
| Pode emitir oficial? | Hoje nao no pacote `inspector_chat`, porque `reviewer_issue=false` e depende de portal `revisor`. Precisa pacote/capability neutra para emissao sem Mesa, se o produto quiser vender isso. |
| Falta | Separar self-review de canal mobile; definir se pessoa individual pode ter signatario e emissao oficial sem Mesa. |

### Cliente mobile-only

O app ja tem base forte: chat, upload, fila offline, quality gate, finalizacao, Mesa nativa quando existe, comandos `aprovar_no_mobile`, `devolver_no_mobile` e `reabrir_bloco`.

| Necessidade | Estado |
| --- | --- |
| Criar/coletar/finalizar no app | Parcialmente suportado. |
| Baixar laudo oficial no app | Parcial; app le emissao e integridade, mas fluxo completo de download oficial precisa fechar. |
| Assinatura/signatario | Nao deve ser local/ad hoc no app; deve consumir signatario governado do backend. |
| Falta | Expor revisao estruturada, aprovacao/self-review, emissao e download como capacidades mobile quando o pacote permitir. |

### Empresa sem Mesa

Hoje o pacote `inspector_chat` libera `mobile_case_approve` e bloqueia `reviewer_decision`/`reviewer_issue`. Isso encaixa bem para fluxo assistido sem Mesa, mas nao resolve por completo documento vendavel oficial se a oferta exigir assinatura/hash/pacote.

| Ponto | Leitura |
| --- | --- |
| Como finaliza? | Chat/Mobile finalizam pelo quality gate; se permitido, status vira aprovado internamente. |
| Como aprova? | Self-review/mobile approval, com responsabilidade humana e override quando aplicavel. |
| Como gera documento? | PDF operacional pode existir; emissao oficial precisa modelo de capability separado de Mesa. |
| Diferenca critica | PDF operacional nao e `EmissaoOficialLaudo`. Sem capability de emissao, nao vender como documento oficial auditavel. |

Checkpoint PR G: `web/tests/test_company_no_mesa_multi_user_pr_g.py` fixa o cenario de empresa sem Mesa com pacote `inspector_chat` e `operating_model=standard`. O Admin Cliente cria e lista multiplos inspetores, mas nao cria outro Admin Cliente, nao altera plano direto e nao concede portal `revisor` quando o pacote nao inclui Mesa. O inspetor A cria e finaliza caso `padrao` por revisao interna governada, o inspetor B da mesma empresa nao acessa o caso fora do seu escopo, o Portal Cliente mostra Mobile/Chat/self-review disponiveis e Mesa/emissao/signatario nao incluidos, e o Mobile nao recebe `official_issue_summary` sem `EmissaoOficialLaudo`.

No mesmo PR, NR35 Linha de Vida continua bloqueada por `nr35_mesa_required_unavailable` no tenant `inspector_chat` sem Mesa. Isso preserva a regra de que self-review e valido para familias simples permitidas, nao para familias de alto risco que exigem Mesa/governanca separada.

### Empresa com Mesa

Este e o fluxo mais completo hoje. Inspetor/Mobile coletam, enviam para Mesa, Mesa decide, snapshot aprovado e motor oficial emite pacote com hash/signatario/manifest.

| Ponto | Leitura |
| --- | --- |
| Handoff | `inspector_send_to_mesa` e `mesa_required` direcionam ownership para Mesa. |
| Acoes separadas | Revisar, devolver, aprovar, emitir e baixar pacote ficam no portal Mesa ou servicos equivalentes. |
| Encaixe arquitetural | Forte. E o caminho mais maduro para venda governada. |

Checkpoint PR H: `web/tests/test_company_with_mesa_premium_pr_h.py` fixa a empresa premium com `inspector_chat_mesa` e `operating_model=standard`. A familia simples usada e `cbmgo`; o Chat Inspetor cria/coleta/finaliza, a previa indica `send_to_mesa`, a Mesa aprova por `reviewer_decision`, o PDF operacional fica apenas como documento de trabalho ate a emissao governada e o motor central cria `EmissaoOficialLaudo` ativa com `issue_number`, `package_sha256`, signatario governado, download ZIP e auditoria.

O mesmo teste valida que o Portal Cliente mostra Mesa e emissao oficial incluidas, que antes da emissao o PDF operacional nao aparece como oficial, que depois da emissao a aba Documentos aponta para a emissao ativa e que o Mobile/Chat continua usando `official_issue_summary.current_issue` para baixar o pacote oficial. Isso protege o fluxo premium depois dos cenarios sem Mesa dos PRs F/G.

### Familia de alto risco

Familia de alto risco deve poder endurecer regra independentemente do pacote. NR35 Linha de Vida ja exemplifica isso: mesmo que o tenant nao tenha Mesa, o piloto vendavel bloqueia se a familia exigir Mesa.

| Regra desejada | Estado |
| --- | --- |
| `mesa_required` por familia | Ja existe como padrao/override e foi aplicado no NR35. |
| `signatory_required` por familia | Existe no motor de emissao via signatario governado, mas deveria aparecer como policy explicita de familia. |
| Bloquear self-review | Ja ocorre para NR35; precisa generalizar por contrato de familia. |
| Explicar no UX | Precisa melhorar para nao parecer falha do app/Chat. |

## 8. Avaliacao do termo `mobile_autonomous`

`mobile_autonomous` nao e um bom termo de produto para o futuro.

Problemas:

- mistura canal (`mobile`) com governanca (`aprovacao interna`);
- sugere autonomia sem humano, mas a direcao canonica exige validacao humana;
- nao cobre Chat Inspetor web em empresa sem Mesa;
- fica estranho para Admin Cliente ou inspetor web aprovando no mesmo modo;
- dificulta vender fluxo sem Mesa como governado e auditavel.

Nomes recomendados:

| Nome | Uso sugerido |
| --- | --- |
| `self_review_allowed` | A propria operacao do tenant pode revisar/aprovar sem Mesa separada. |
| `inspector_governed_approval` | Inspetor/Mobile/Chat pode aprovar sob governanca. |
| `separate_mesa_required` | Mesa separada e obrigatoria. |
| `mesa_optional` | Mesa pode ser usada como escalonamento, mas nao e obrigatoria. |
| `signatory_required` | Emissao oficial exige signatario governado. |
| `official_issue_allowed` | Tenant/familia permite criar `EmissaoOficialLaudo`. |

Recomendacao de compatibilidade: manter `mobile_autonomous` como alias legado no curto prazo, mas introduzir um read model novo de governanca:

| Campo alvo | Valores possiveis |
| --- | --- |
| `review_governance_mode` | `separate_mesa_required`, `self_review_allowed`, `self_review_with_signatory`, `no_review_for_draft_only`. |
| `approval_actor_scope` | `inspector_self`, `tenant_reviewer`, `separate_mesa`, `governed_signatory`. |
| `issue_governance_mode` | `none`, `official_issue_allowed`, `signatory_required`. |

## 9. Chat Inspetor usando ferramentas da Mesa sem fingir ser Mesa

O Chat Inspetor deve ser o cockpit tecnico web. Ele pode usar ferramentas de revisao sem se passar por Mesa separada quando o pacote permitir.

Arquitetura recomendada:

| Ferramenta | Como expor no Chat |
| --- | --- |
| Painel de pendencias | Como pendencias do caso, nao "pendencias da Mesa" quando nao houver Mesa. |
| Revisao estruturada | Como aba/bloco de revisao do caso, usando os mesmos validators e diffs humanos. |
| Aprovacao interna | Como decisao humana do inspetor/tenant, com justificativa, snapshot e audit trail. |
| Assinatura governada | Como selecao/confirmacao de signatario elegivel quando `signatory_required` e `official_issue_allowed`. |
| Emissao oficial | Chamar o mesmo motor `emitir_oficialmente_transacional`, bloqueando sem snapshot, hash, signatario e policy. |
| Escalonar para Mesa | Disponivel apenas se `inspector_send_to_mesa` e `separate_mesa_required/optional` estiverem ativos. |

Regra de UX: quando o tenant nao tem Mesa, nao chamar a tela de "Mesa". Chamar de `Revisao`, `Pendencias`, `Aprovacao` ou `Emissao`, conforme a capability ativa.

## 10. Mobile como cockpit tecnico

O Mobile ja esta bem alinhado com a direcao: ele consome chat, quality gate, finalizacao, Mesa nativa e sinais de emissao. A proxima etapa nao e criar outro portal; e expor as mesmas capacidades centrais de revisao/aprovacao/emissao dentro do app, respeitando o contrato.

| Area mobile | Estado atual | Melhoria necessaria |
| --- | --- | --- |
| Chat IA e coleta | Base existente. | Fechar jornadas guiadas por familia alem do handoff. |
| Quality gate | Nativo, com override humano e fila offline. | Manter como base de bloqueio antes de aprovar/emissao. |
| Revisao mobile | Comandos existem (`aprovar_no_mobile`, `devolver_no_mobile`, `reabrir_bloco`). | Generalizar para self-review estruturado por bloco/campo. |
| Mesa nativa | Existe feed/thread e handoff. | Continuar como modulo quando `mesa_required`; esconder quando nao contratado. |
| Emissao oficial | App le sinais e integridade. | Adicionar acao/download oficial quando `official_issue_allowed` e `signatory_required` forem satisfeitos. |
| Download | Anexos/Mesa existem; oficial completo ainda parcial. | Download tenant-scoped com auditoria futura. |

## 10.1. Portal Cliente como explicador de pacote

Checkpoint PR E: o Portal Cliente passa a usar o mesmo read model mobile/chat-first para explicar pacote, portais e capacidades contratadas ao Admin Cliente. A seção `Seu pacote e recursos` mostra `Mobile`, `Chat Inspetor`, `Revisão interna`, `Mesa Avaliadora`, `Emissão oficial`, `Documentos oficiais` e `Signatário governado`.

A regra de arquitetura permanece a mesma: o Portal Cliente não cria capability nova, não relaxa validação e não transforma PDF operacional em emissão oficial. Ele apenas diferencia recurso disponível, recurso não incluído no pacote e recurso que depende da família/template, reduzindo a chance de o cliente interpretar governança contratual como erro do sistema.

Checkpoint Mobile download oficial: quando o backend já possui `EmissaoOficialLaudo` ativa e pacote congelado disponível, o resumo de emissão publica uma `download_url` autenticada para o app. O Mobile mostra `Baixar pacote oficial` na thread e na superfície Mesa usando o downloader autenticado existente. Isso fecha o acesso mobile ao pacote oficial já emitido, mas não cria emissão oficial pelo app nem adiciona assinatura local.

Checkpoint auditoria de download oficial: os downloads oficiais existentes passam a registrar auditoria sanitizada no tenant para Portal Cliente, Chat/Mobile pelo endpoint `/app` e Mesa pelo endpoint `/revisao`. O registro preserva `laudo_id`, `issue_number`, estado da emissão, tipo de artefato, hash do pacote/PDF quando aplicável e superfície de origem, sem expor `package_storage_path`, `storage_path` ou conteúdo do arquivo.

Checkpoint reemissão/superseded: o motor central de emissão oficial passa a ser validado para reemissão sem sobrescrita. Quando há divergência pós-Mesa, Chat/Mobile/Mesa podem consumir `reissue_recommended`, `primary_pdf_diverged` e `current_issue`, mas o download oficial continua apontando para a emissão ativa `issued`. Nova emissão exige novo snapshot aprovado; a emissão anterior vira `superseded` e permanece apenas como histórico/auditoria.

## 11. Portal Cliente

O Portal Cliente deve continuar sendo o lugar de administracao, visibilidade, auditoria e entrega. Ele pode ter operacao quando pacote permitir, mas nao deve virar cockpit tecnico padrao para todo tenant.

| Superficie | Papel recomendado |
| --- | --- |
| Admin/equipe | Admin Cliente gerencia usuarios, permissoes e diagnostico dentro do contrato. |
| Chat | Pode criar/interagir/finalizar se `case_actions` e capabilities permitirem; caso contrario, leitura/acompanhamento. |
| Mesa | Deve aparecer quando o tenant possui Mesa ou quando Admin Cliente pode agir como avaliador interno. |
| Documentos | Entrega oficial, historico, hash, status, downloads, reemissao recomendada. |
| UX de pacote | Mostrar claramente: sem Mesa, com Mesa, mobile-first, emissao oficial incluia ou nao. |

Risco principal: se a UX nao explicar capabilities, o cliente pode interpretar bloqueio contratual como bug. O Portal Cliente precisa ser a fonte clara de "o que esta liberado neste pacote".

## 12. Arquitetura-alvo

Modelo alvo:

`Admin CEO governa contrato -> tenant recebe pacote/capabilities/familias/releases/signatarios -> Admin Cliente administra equipe/uso -> Chat Inspetor e Mobile operam casos -> Mesa entra como modulo quando exigida/contratada -> motor central emite oficialmente -> Portal Cliente entrega e audita`.

Separacao desejada:

| Componente | Responsabilidade alvo |
| --- | --- |
| Admin CEO | Governar templates, familias, releases, pacotes, capabilities, signatarios, Mesa e emissao. |
| Admin Cliente | Administrar tenant, equipe, visibilidade, operacao permitida e consumo documental. |
| Chat Inspetor | Cockpit web tecnico para coleta, IA, revisao, aprovacao governada, handoff e emissao quando permitido. |
| Mobile | Cockpit mobile tecnico para coleta, IA, fotos, quality gate, revisao/aprovacao governada e download quando permitido. |
| Mesa | Portal/modulo de revisao separada quando cliente/familia exigir. |
| Emissao | Motor central reutilizavel, independente da superficie que chamou. |
| Portal Documentos | Entrega, historico, hash, manifest, download e reemissao/auditoria. |

Capabilities alvo sugeridas:

| Capability alvo | Substitui/complementa |
| --- | --- |
| `case_create` | `inspector_case_create`. |
| `case_collect` | Acao tecnica de coleta por Chat/Mobile. |
| `case_finalize_request` | `inspector_case_finalize`. |
| `case_send_to_separate_review` | `inspector_send_to_mesa`. |
| `case_self_review` | `mobile_case_approve` quando nao ha Mesa separada. |
| `case_review_decide` | `reviewer_decision`, sem pressupor portal. |
| `structured_review_edit` | Revisao estruturada JSON/campos. |
| `official_issue_create` | `reviewer_issue`, com nome neutro. |
| `official_issue_download` | Download de pacote/PDF oficial tenant-scoped. |
| `governed_signatory_select` | Selecao/uso de signatario elegivel. |

Regra: capabilities neutras podem ser expostas por Chat, Mobile, Mesa ou Portal Cliente conforme grants de superficie. Mesa separada continua existindo quando `separate_mesa_required=true`.

### Read model compativel do PR B

O PR B materializa a primeira camada dessa arquitetura sem alterar comportamento funcional. Os nomes antigos continuam como fonte operacional dos guards existentes, e os nomes novos sao derivados como aliases/read model:

| Capability antiga | Alias neutro | Leitura |
| --- | --- | --- |
| `inspector_case_create` | `case_create`, `case_collect` | Criar e coletar dados em caso tecnico por Chat/Mobile. |
| `inspector_case_finalize` | `case_finalize_request` | Solicitar finalizacao do caso apos quality gate. |
| `inspector_send_to_mesa` | `case_send_to_separate_review` | Enviar para revisao separada/Mesa quando contratada ou exigida. |
| `mobile_case_approve` | `case_self_review` | Aprovacao interna humana quando a familia/pacote permitem. |
| `reviewer_decision` | `case_review_decide`, `structured_review_edit` | Decisao/revisao estruturada por avaliador autorizado. |
| `reviewer_issue` | `official_issue_create`, `official_issue_download`, `governed_signatory_select` | Emissao oficial, pacote/download e uso de signatario governado. |

O read model `mobile_chat_first_governance` expõe:

- `review_governance_mode`;
- `approval_actor_scope`;
- `issue_governance_mode`;
- `separate_mesa_required`;
- `self_review_allowed`;
- `official_issue_allowed`;
- `signatory_required`;
- `available_case_actions`.

`mobile_autonomous` permanece aceito como valor legado, mas passa a ser interpretado no read model como `self_review_allowed` quando a capability de self-review existe. Familias de alto risco podem forcar `separate_mesa_required` sem trocar os pacotes existentes.

## 13. Riscos

| Risco | Impacto | Mitigacao |
| --- | --- | --- |
| Manter nomes `reviewer_*` para capacidades gerais | Forca desenho mental de Mesa obrigatoria e dificulta cliente sem Mesa. | Criar alias/capabilities neutras mantendo compatibilidade. |
| Chamar self-review de `mobile_autonomous` | Sugere ausencia de humano e limita canal. | Trocar read model para `self_review_allowed`/`inspector_governed_approval`. |
| Permitir emissao sem Mesa sem modelo de signatario | Documento pode parecer oficial sem responsabilidade tecnica clara. | Separar `official_issue_allowed` de `signatory_required` e bloquear se signatario faltar. |
| Expor ferramentas Mesa no Chat sem rotulo correto | Cliente sem Mesa acha que contratou Mesa. | Renomear UI para revisao/pendencias/aprovacao quando nao ha Mesa separada. |
| Portal Cliente operar demais por padrao | Admin Cliente vira operador tecnico sem governanca clara. | Acoes sempre por capability e explicacao de contrato. |
| Familia de alto risco cair em self-review | Risco funcional/regulatorio. | Guardrail por familia: `separate_mesa_required`, `signatory_required`, validadores estritos. |
| Mobile nao fechar download/emissao | Cliente mobile-only depende da web para vender documento. | PR especifico para download/emissao mobile governados. |

## 14. Plano incremental

### PR A - Documento de arquitetura mobile/chat-first

Formalizar este documento como contrato de direcao. Impacto: reduz ambiguidades antes de mexer em capabilities.

Testes/gates: `git diff --check`.

### PR B - Normalizar capabilities de revisao/aprovacao/emissao

Adicionar aliases/read model neutro para `case_self_review`, `case_review_decide`, `official_issue_create`, `official_issue_download` e `signatory_required`, sem remover `reviewer_*` ainda.

Impacto: separa capacidade de superficie.

Testes/gates: testes de `tenant_admin_policy`, entitlement guard, Admin CEO policy e rotas protegidas.

### PR C - Expor ferramentas de revisao no Chat Inspetor quando permitido

Levar pendencias por bloco, revisao estruturada e decisao humana interna para o Chat, sem chamar isso de Mesa quando `separate_mesa_required=false`.

Impacto: Chat vira cockpit tecnico completo para cliente sem Mesa.

Testes/gates: testes de finalizacao, quality gate, revisao estruturada e Chat Inspetor.

Checkpoint PR C: a previa de finalizacao do Chat Inspetor passa a expor `mobile_chat_first_governance` e `chat_review_tools`, derivados do read model neutro. O frontend usa `chat_review_tools.title`, `primary_label` e `next_step` quando presentes, permitindo mostrar `Revisao interna governada`, `Pendencias do caso` ou `Revisao pela Mesa Avaliadora` conforme governanca, sem trocar os campos legados `primary_action`, `primary_label` e `review_mode_final_preview`.

O mesmo checkpoint tambem leva os aliases neutros para a rail do Chat Inspetor. As ferramentas existentes continuam abrindo as mesmas URLs, mas passam a ser condicionadas por `structured_review_edit`, `governed_signatory_select`, `official_issue_create` e `official_issue_download`, com fallback de compatibilidade para `reviewer_decision` e `reviewer_issue` no shell JS. Isso evita chamar ferramenta de emissao/revisao de "servico de Mesa" quando a capacidade esta liberada para o proprio cockpit do Inspetor.

### PR D - Expor aprovacao/assinatura/download no Mobile quando permitido

Fechar fluxo mobile para self-review governado, uso de signatario elegivel e download oficial quando o pacote permitir.

Impacto: mobile-only fica vendavel sem depender da web para etapas finais.

Testes/gates: mobile unit tests, API tests de download/emissao, smoke mobile se tocar fluxo critico.

Checkpoint PR D: o app mobile passa a entender `capability_aliases`,
`user_capability_aliases`, `mobile_chat_first_governance` e
`user_mobile_chat_first_governance` vindos do backend. O helper
`mobileUserAccess` resolve aliases neutros (`case_self_review`,
`case_send_to_separate_review`, `official_issue_create`,
`official_issue_download`, `governed_signatory_select`) com fallback para as
capabilities legadas, preservando pacotes existentes.

O cockpit mobile expõe sinais derivados para `selfReviewAllowed`,
`separateMesaRequired`, `officialIssueAllowed`,
`officialIssueDownloadAllowed`, `reviewSurfaceLabel`, `pendingCaseLabel` e
`officialIssueLabel`. Quando não há Mesa separada e o pacote permite revisão
interna, a UI usa `Revisão interna`/`Aprovar internamente` em vez de
`mobile_autonomous` ou `Aprovar no mobile`. Quando há Mesa separada, mantém
`Mesa Avaliadora`. PDFs operacionais continuam sendo apenas anexos/relatórios
da conversa; o app só mostra emissão oficial quando há `emissao_oficial`,
`current_issue` ou verificação pública no pacote de revisão.

Limite do PR D: não foi criada ação nova de emissão oficial no app nem
assinatura local/ad hoc. O mobile agora lê disponibilidade, rótulos e estado de
download oficial; emissão/download completos seguem como PR posterior caso o
backend mobile precise de endpoint dedicado.

Checkpoint PR9: o app não precisa de UI grande para reemissão neste recorte. O contrato disponível já diferencia PDF operacional de emissão oficial e permite mostrar sinais neutros de divergência/reemissão quando o backend publicar `reissue_recommended`; downloads seguem presos à emissão ativa.

Checkpoint pós-PR9: o sinal leve de reemissão passa a trafegar em `official_issue_summary` para Mobile e Chat Inspetor com `reissue_recommended`, `issue_status`, `reissue_reason_codes` e `reissue_reason_summary`. O Mobile interpreta `reissue_recommended || primary_pdf_diverged`, então cobre tanto divergência do PDF atual quanto nova aprovação/snapshot sem criar tela nova. A exposição fica limitada a chip, busca/histórico, central de atividade, configurações/exportação e card de documento emitido; PDF operacional continua sem virar emissão oficial.

### PR E - UX do Admin Cliente mostrando pacote/capacidades

Mostrar de forma clara o pacote ativo, o que pode agir, se ha Mesa, se ha emissao oficial, se ha signatario e quais familias exigem revisao.

Impacto: reduz confusao comercial e suporte.

Testes/gates: testes de bootstrap Portal Cliente e surfaces.

### PR F - Testes de cliente individual/mobile-only

Fixture de tenant `inspector_chat` ou `mobile_single_operator`, sem Mesa, com self-review permitido para familia simples.

Impacto: prova que Mesa nao e universal.

Testes/gates: integration tests de criar/coletar/finalizar/self-review e bloquear emissao se nao contratada.

Checkpoint PR F: o teste `web/tests/test_mobile_only_client_no_mesa_pr_f.py` fixa o cenario `inspector_chat` + `mobile_single_operator` para cliente individual. A familia simples usada e `padrao`; o Chat Inspetor finaliza por revisao interna governada (`mobile_autonomous` legado com motivo `tenant_without_mesa`), grava `ApprovedCaseSnapshot` com `approved_mobile_autonomous`, nao cria `EmissaoOficialLaudo` e deixa o PDF operacional apenas como `nome_arquivo_pdf`.

O mesmo teste valida que o Portal Cliente mostra Mobile/Chat e revisao interna como recursos disponiveis, mostra Mesa e emissao oficial como nao incluidas, e que o Mobile nao recebe `official_issue_summary` quando nao ha emissao oficial ativa. Para NR35 Linha de Vida, o mesmo tenant recebe bloqueio `nr35_mesa_required_unavailable`, preservando a regra de familia de alto risco sem cair em self-review.

### PR G - Testes de empresa sem Mesa

Cenario multi-inspetor sem `revisor`, com Admin Cliente acompanhando e finalizacao interna governada.

Impacto: valida pequena/grande empresa sem Mesa.

Testes/gates: backend integration, Portal Cliente, Chat/Mobile finalization.

### PR H - Testes de empresa com Mesa

Garantir que fluxo com Mesa continua intacto: handoff, revisao, devolucao, aprovacao, snapshot e emissao.

Impacto: protege cliente governado/premium.

Testes/gates: Mesa/revisor, pacote, official issue, Portal Cliente.

Checkpoint PR H: o teste `web/tests/test_company_with_mesa_premium_pr_h.py` cobre `inspector_chat_mesa` com CBMGO modelado, handoff para Mesa, aprovacao humana, snapshot aprovado, PDF operacional pre-emissao sem `issue_number`, emissao oficial por signatario governado, pacote congelado, Portal Cliente como consumidor da emissao ativa e Mobile/Chat apontando para o download oficial ativo.

### PR I - Guardrails para familia de alto risco

Generalizar o padrao de familia que exige Mesa/signatario/validator estrito, usando NR35 como referencia sem acoplar a uma familia unica.

Impacto: venda segura por familia tecnica.

Testes/gates: contrato de familia, validadores, finalizacao e emissao oficial.

Checkpoint PR I: `web/app/domains/chat/high_risk_family_guardrails.py` centraliza familias modeladas que exigem revisao separada: NR35 Linha de Vida, NR35 Ponto de Ancoragem, NR13 Caldeira, NR13 Vaso de Pressao, NR20 Prontuario e NR10 Prontuario. Na finalizacao do Chat/Mobile, essas familias forcam `mesa_required`; se o tenant nao possui `inspector_send_to_mesa`, a finalizacao bloqueia antes de cair em self-review. O codigo legado `nr35_mesa_required_unavailable` foi preservado para NR35 Linha de Vida, e as demais familias usam `high_risk_mesa_required_unavailable`.

O teste `web/tests/test_high_risk_family_guardrails_pr_i.py` fixa tres limites: familia simples `padrao` em tenant `inspector_chat` continua usando revisao interna governada; NR13 Caldeira sem Mesa bloqueia e nao cria snapshot/emissao; NR13 Caldeira com policy incorreta `mobile_autonomous` e pacote com Mesa e forcada para handoff `mesa_required`.

## 15. Conclusao

O Tariel ja tem a base correta para ser mobile/chat-first: Mobile e Chat Inspetor compartilham o nucleo do caso, Admin CEO governa contrato, Admin Cliente administra o tenant, Mesa entra conforme pacote/familia e a emissao oficial ja tem motor central.

O que precisa melhorar para alinhar totalmente a arquitetura e deixar de tratar Mesa como caminho implicito universal:

- normalizar capabilities para conceitos de caso e emissao, nao para nomes de portal;
- trocar `mobile_autonomous` por uma semantica de self-review humano governado;
- expor revisao/aprovacao/emissao como toolkit reutilizavel no Chat e no Mobile quando permitido;
- manter Mesa separada como modulo obrigatorio apenas quando pacote/familia exigirem;
- deixar o Portal Cliente explicar claramente o contrato e entregar documentos oficiais sem virar cockpit tecnico por padrao.

Sequencia recomendada: primeiro estabilizar o vocabulario/capabilities, depois expor ferramentas no Chat, depois fechar Mobile, e so entao ampliar testes por cenario comercial.
