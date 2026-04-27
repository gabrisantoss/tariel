# Governança de Portais, Tenants e Cenários Operacionais

Atualizado em `2026-04-26`.

Status: análise operacional e arquitetural. Este documento não altera código, rotas, permissões, release gate, mobile smoke, Maestro, `human_ack`, Android, NR35 ou comportamento de produto.

## 1. Resumo executivo

O Tariel já está estruturado para operar múltiplos cenários de cliente. O sistema não assume que todo tenant usa Mesa Avaliadora, nem assume que todo tenant opera sem Mesa. A decisão de comportamento vem de política por tenant, pacote comercial, portais liberados, capabilities e governança de família/template.

O papel do `Admin CEO` é governar a plataforma inteira. Ele define o contrato operacional do tenant: pacotes, portais, capabilities, famílias, templates, releases, políticas de revisão, limites, signatários governados e protocolos excepcionais. No código, essa autoridade aparece principalmente em `web/app/shared/tenant_admin_policy.py`, nas rotas Admin em `web/app/domains/admin/`, no catálogo governado e nos modelos de governança/release.

O papel do `Admin Cliente` é administrar a própria empresa dentro do que o Admin CEO liberou. Ele não governa schema global, template global, família técnica global ou release da plataforma. Ele gerencia equipe, acompanha casos, acessa superfícies contratadas, pode operar casos quando a política permitir e consome documentos oficiais quando existirem. O Portal Cliente não deve ser tratado como sempre `read-only`, porque há `case_actions` e capability `admin_manage_team`; também não deve ser tratado como operador técnico completo universal, porque suas ações dependem de grants, portais e pacote.

O papel do `Chat Inspetor` é ser a superfície técnica web de campo. Ele cria casos/laudos, conversa com IA, recebe anexos/fotos, usa fluxo livre ou guiado, executa finalização e pode enviar para Mesa quando o tenant possui a capability `inspector_send_to_mesa`. Em pacotes mais fortes, o Chat Inspetor também pode expor ferramentas de preparação de emissão e serviços relacionados à Mesa, mas isso é governado por capability, não por regra fixa da tela.

O papel do `Mobile` é ser o canal operacional principal ou complementar do inspetor. O app usa o portal lógico `inspetor`, consome grants do tenant, lê catálogo/template liberado e participa de chat, histórico, anexos, Mesa, fila offline e finalização conforme política. Para alguns clientes, especialmente operação individual ou mobile-first, o mobile pode ser a superfície principal. Para outros, ele é apenas canal de coleta integrado ao web e à Mesa.

O papel da `Mesa Avaliadora` é revisar, devolver, aprovar, decidir tecnicamente e, quando a capability `reviewer_issue` existe, participar da emissão oficial governada. Ela pode ser obrigatória, opcional ou não contratada. O runtime não deve forçar Mesa para todo tenant. A Mesa entra quando o pacote, a família ou o `report_pack` pedem `mesa_required` e quando o tenant possui capability para envio/revisão. Para NR35 Linha de Vida vendável, a Mesa é obrigatória por decisão específica do piloto, mas isso não generaliza para todos os clientes e famílias.

Pacotes e capabilities mudam o comportamento do sistema. Hoje há três presets principais em `tenant_admin_policy.py`: `inspector_chat`, `inspector_chat_mesa` e `inspector_chat_mesa_reviewer_services`. Eles derivam portais (`cliente`, `inspetor`, `revisor`) e capabilities como `admin_manage_team`, `inspector_case_create`, `inspector_case_finalize`, `inspector_send_to_mesa`, `mobile_case_approve`, `reviewer_decision` e `reviewer_issue`. Além disso, há `operating_model`, incluindo `standard` e `mobile_single_operator`, que muda a leitura de conta operacional, limite de operador e acesso cross-surface.

Assim, o sistema atende:

- `Cliente individual`: pode operar como tenant pequeno com Admin Cliente para conta/equipe mínima, portal inspetor/mobile liberado e sem Mesa, usando `inspector_chat` e `mobile_case_approve` quando a família permitir. Se a família exigir Mesa, esse cliente precisa contratar pacote com Mesa ou usar outra família/política.
- `Empresa pequena`: pode ter Admin Cliente, alguns inspetores e, conforme contrato, operar com ou sem Mesa. O pacote `inspector_chat` viabiliza fluxo sem Mesa; `inspector_chat_mesa` adiciona revisão/decisão/emissão por Mesa.
- `Empresa grande`: pode separar papéis entre Admin Cliente, inspetores, revisores, responsáveis técnicos e cliente final. Pode operar sem Mesa em fluxos mais simples, ou com Mesa e emissão oficial quando precisa de governança, assinatura, histórico e auditoria.
- `Cliente mobile-first`: ainda possui Admin Cliente para gestão, mas usa o app como canal principal. O modelo `mobile_single_operator` permite conta operacional concentrada, com acesso web complementar quando habilitado.
- `Cliente governado`: usa Admin Cliente para administrar o tenant, Inspetor/Mobile para coleta, Mesa para revisão, signatário governado para emissão oficial e Portal Cliente para entrega/auditoria.

## 2. Fontes analisadas

| Fonte | O que indica |
| --- | --- |
| `docs/STATUS_CANONICO.md` | Direção de produto: caso técnico, multiportal, Admin CEO governando contrato/superfícies e Admin Cliente governando operação própria. |
| `PROJECT_MAP.md` | Mapa dos domínios: Admin, Cliente, Inspetor, Revisor/Mesa, Mobile, catálogo, documento e IA. |
| `PLANS.md` | Checkpoints de pacote comercial, mobile, Mesa, emissão oficial e Golden Path NR35. |
| `docs/operation/PDF_EMISSION_CONTEXTS_AND_GOVERNANCE.md` | Separação entre PDF operacional, Mesa, snapshot aprovado, emissão oficial e Portal Cliente. |
| `web/app/shared/tenant_admin_policy.py` | Núcleo de pacotes, portais, capabilities, operating model e grants de usuário. |
| `web/app/shared/tenant_entitlement_guard.py` | Guard runtime para bloquear ações quando a capability do tenant não existe. |
| `web/app/shared/tenant_access.py` | Guard multiempresa para escopo de empresa/laudo. |
| `web/app/shared/tenant_report_catalog.py` | Catálogo por tenant, família, oferta, release e runtime template. |
| `web/app/domains/admin/client_surface_policy*.py` | Rotas/Admin CEO para configurar contrato/superfícies do tenant. |
| `web/app/domains/admin/tenant_user_services.py` | Criação/edição de usuários do tenant respeitando portais e limite operacional. |
| `web/app/domains/cliente/*` | Portal Admin Cliente, superfícies, gestão de equipe, diagnóstico, chat, mesa e documentos. |
| `web/app/domains/chat/*` | Portal Inspetor, mobile auth, finalização, report pack, Mesa do inspetor e emissão pelo fluxo do inspetor. |
| `web/app/domains/revisor/*` e `web/app/domains/mesa/*` | Mesa/Revisor, decisões, pacotes, emissão e realtime. |
| `android/src/*` | Mobile consumindo capabilities, portal `inspetor`, fila offline, chat, Mesa e lifecycle. |

## 3. Modelo de autoridade

| Autoridade | Pode governar | Não deve governar | Evidência principal |
| --- | --- | --- | --- |
| Admin CEO | Tenants, pacotes, portais, capabilities, catálogo, famílias, releases, templates, signatários, limites e suporte excepcional. | Operação cotidiana do cliente como se fosse usuário da empresa sem protocolo. | `admin/client_surface_policy_routes.py`, `catalog_tenant_management_services.py`, `tenant_admin_policy.py`, `admin_signatory_services.py`. |
| Admin Cliente | Equipe própria, usuários operacionais, acompanhamento, ações em casos quando contratadas, suporte e diagnóstico do tenant. | Schema global, templates globais, releases globais, permissões fora do contrato, criação de Admin Cliente adicional. | `cliente/management_routes.py`, `tenant_user_services.py`, `tenant_entitlement_guard.py`. |
| Inspetor | Criar/coletar/finalizar caso, anexar evidências, conversar com IA, enviar para Mesa se permitido. | Aprovar tecnicamente como Mesa quando a política exigir Mesa; emitir oficial sem capability. | `chat/laudo_service.py`, `chat/laudo_decision_services.py`, `chat/mesa_message_routes.py`. |
| Mobile | Operar como canal do inspetor, inclusive mobile-first, com fila offline e leitura de Mesa conforme grants. | Substituir Mesa/signatário quando família/pacote exigem revisão governada. | `chat/auth_mobile_routes.py`, `auth_mobile_support.py`, `android/src/features/*`. |
| Mesa/Revisor | Revisar, decidir, devolver, aprovar, gerar pacote e emitir oficialmente quando habilitada. | Existir como etapa obrigatória para todos os tenants sem contrato ou sem política da família. | `revisor/mesa_api.py`, `revisor/service_messaging.py`, `mesa/service.py`. |
| Signatário governado | Dar responsabilidade técnica na emissão oficial conforme família/tenant. | Ser inferido automaticamente pela IA ou pelo Admin Cliente sem cadastro/liberação. | `models_review_governance.py`, `official_issue_package.py`. |

## 4. Portais e superfícies

| Portal/superfície | Papel atual | Como é liberado | Observações |
| --- | --- | --- | --- |
| Admin CEO (`/admin`) | Plataforma, tenants, catálogo, pacote, release, signatários e suporte excepcional. | Nível `DIRETORIA` e escopo plataforma. | É a autoridade global. |
| Admin Cliente (`/cliente`) | Gestão da empresa, equipe, superfícies contratadas, casos, Mesa, documentos e diagnóstico. | Portal `cliente` e capability por tenant. | Pode ser read-only ou ter ações; depende de política. |
| Chat Inspetor Web (`/app`) | Coleta, chat IA, anexos, fluxo guiado, finalização e handoff. | Portal `inspetor`; capabilities `inspector_*`. | Pode ganhar ferramentas de Mesa/emissão conforme pacote. |
| Mobile Inspetor | Canal mobile do portal inspetor. | Acesso ao portal `inspetor` e token bearer. | Mobile-first é suportado por operating model, não por outro portal. |
| Mesa/Revisor (`/revisao`) | Revisão, decisão, pacote, emissão quando liberada. | Portal `revisor`; capabilities `reviewer_*`. | Pode ser interna/externa conforme cadastro do tenant. |
| Portal Cliente Documentos | Entrega, status, histórico, hashes e downloads oficiais. | Portal `cliente`; dados tenant-scoped. | Não deve tratar PDF operacional como oficial. |

## 5. Pacotes comerciais e capabilities atuais

Pacotes atuais observados em `tenant_admin_policy.py`:

| Pacote | Portais liberados | Capabilities principais | Uso operacional |
| --- | --- | --- | --- |
| `inspector_chat` | `cliente`, `inspetor`; sem `revisor`. | cria/finaliza caso; não envia para Mesa; `mobile_case_approve=true`; sem `reviewer_decision`/`reviewer_issue`. | Cliente individual, pequena empresa sem Mesa, mobile/chat com finalização interna quando a família permitir. |
| `inspector_chat_mesa` | `cliente`, `inspetor`, `revisor`. | cria/finaliza; envia para Mesa; Mesa decide; emissão oficial habilitada; `mobile_case_approve=false`. | Fluxo governado clássico: campo -> Mesa -> emissão. |
| `inspector_chat_mesa_reviewer_services` | `cliente`, `inspetor`, `revisor`. | Igual ao anterior, com `operational_user_cross_portal_enabled=true`. | Operação em que usuários técnicos podem acumular campo e análise conforme grants. |

Capabilities atuais:

| Capability | O que libera | Dependência de portal | Onde bloqueia |
| --- | --- | --- | --- |
| `admin_manage_team` | Admin Cliente gerenciar equipe. | `cliente`. | `cliente/management_routes.py`. |
| `inspector_case_create` | Criar laudo/caso. | `inspetor`. | `chat/laudo_service.py`. |
| `inspector_case_finalize` | Finalizar caso/coleta. | `inspetor`. | `chat/laudo_decision_services.py`, `chat/laudo.py`. |
| `inspector_send_to_mesa` | Enviar mensagem/anexo/caso para Mesa. | `inspetor` + `revisor`. | `chat/mesa_message_routes.py`, `laudo_decision_services.py`. |
| `mobile_case_approve` | Aprovação interna/mobile quando política permitir. | `inspetor`. | `laudo_decision_services.py`. |
| `reviewer_decision` | Mesa decidir/aprovar/devolver. | `revisor`. | `revisor/mesa_api.py`, `revisor/service_messaging.py`, websocket. |
| `reviewer_issue` | Emissão oficial governada. | `revisor`. | `revisor/mesa_api.py`, `chat/laudo.py`, `official_issue_transaction.py`. |

Importante: o código calcula grants efetivos por usuário. Um usuário de nível `INSPETOR` parte do portal `inspetor`; `REVISOR` parte do portal `revisor`; `ADMIN_CLIENTE` parte do portal `cliente`. O operating model e o pacote podem permitir grants cross-portal, mas sempre dentro do contrato do tenant.

Read model neutro adicionado no PR B:

| Alias neutro | Derivado de | Uso |
| --- | --- | --- |
| `case_create` e `case_collect` | `inspector_case_create` | Criacao/coleta do caso tecnico no Chat ou Mobile. |
| `case_finalize_request` | `inspector_case_finalize` | Pedido de finalizacao apos gate. |
| `case_send_to_separate_review` | `inspector_send_to_mesa` | Handoff para Mesa/revisao separada. |
| `case_self_review` | `mobile_case_approve` | Self-review humano governado quando nao ha Mesa obrigatoria. |
| `case_review_decide` e `structured_review_edit` | `reviewer_decision` | Decisao/revisao estruturada por avaliador autorizado. |
| `official_issue_create`, `official_issue_download`, `governed_signatory_select` | `reviewer_issue` | Emissao oficial, download e signatario governado. |

Esses aliases nao substituem as capabilities antigas e nao mudam os presets existentes. Eles existem para separar a semantica do caso tecnico da superficie `Mesa/Revisor` e permitir que Chat/Mobile consumam as mesmas capacidades quando a governanca permitir.

Checkpoint PR C no Chat Inspetor:

| Superficie | Ajuste | Efeito |
| --- | --- | --- |
| Previa de finalizacao | Expõe `mobile_chat_first_governance` e `chat_review_tools` com flags diretos para `self_review_allowed`, `separate_mesa_required`, `official_issue_allowed`, `structured_review_edit`, `case_review_decide`, `official_issue_create` e downloads oficiais. | A UI distingue `Revisao interna governada`, `Pendencias do caso` e `Revisao pela Mesa Avaliadora` sem mudar o contrato legado de finalizacao. |
| Rail do Chat Inspetor | Ferramentas de template/editor/assinatura/PDF/pacote passam a usar aliases neutros como `structured_review_edit` e `official_issue_create`. | O Chat nao depende de chamar tudo de "Mesa" quando o tenant tem capacidade de revisao/emissao pelo cockpit tecnico. |
| Compatibilidade JS | `window.TARIEL.hasUserCapability` consulta aliases de usuario/tenant e tambem deriva aliases de capabilities legadas. | Pacotes existentes continuam funcionando enquanto novas telas podem pedir capabilities neutras. |

Checkpoint PR D no Mobile:

| Superficie | Ajuste | Efeito |
| --- | --- | --- |
| Access policy mobile | O app lê `capability_aliases`, `user_capability_aliases`, `mobile_chat_first_governance` e `user_mobile_chat_first_governance`, com fallback para capabilities legadas. | Pacotes atuais continuam funcionando, mas o app pode perguntar por `case_self_review`, `official_issue_create` ou `official_issue_download`. |
| Cockpit mobile | Estado derivado passa a expor `selfReviewAllowed`, `separateMesaRequired`, `officialIssueAllowed`, `officialIssueDownloadAllowed` e labels neutros. | Cliente sem Mesa vê `Revisão interna`; cliente com Mesa continua vendo `Mesa Avaliadora`. |
| Revisão/documento no app | Labels de `mobile_autonomous`/`Aprovar no mobile` viram `Revisão interna`/`Aprovar internamente`; PDF operacional segue separado de emissão oficial. | Reduz ambiguidade comercial sem criar nova regra de emissão. |

O PR D não cria emissão oficial nova pelo app e não adiciona assinatura local.
Ele prepara o mobile para consumir a governança neutra; endpoints de emissão,
assinatura e download dedicado continuam sujeitos a capability e a PR posterior.

Checkpoint PR E no Portal Cliente:

| Superfície | Ajuste | Efeito |
| --- | --- | --- |
| Bootstrap Admin Cliente | `tenant_commercial_package` e `tenant_commercial_overview` passam a expor `operating_model`, aliases neutros e `mobile_chat_first_governance` junto do pacote comercial. | O Portal Cliente consegue explicar o contrato usando a mesma fonte de verdade do Chat/Mobile sem criar capability nova. |
| Overview comercial | A seção vira `Seu pacote e recursos`, com resumo de `Mobile`, `Chat Inspetor`, `Revisão interna`, `Mesa Avaliadora`, `Emissão oficial`, `Documentos oficiais` e `Signatário governado`. | Bloqueio por pacote aparece como limite contratual; ausência de Mesa ou emissão oficial não é tratada como erro operacional. |
| Entrega documental | O recurso `Emissão oficial` explica que PDF operacional não equivale a `EmissaoOficialLaudo`; `Documentos oficiais` continua apontando para a superfície de documentos tenant-scoped. | Reduz confusão comercial entre preview/PDF operacional e entrega oficial governada. |

## 6. Operating models

| Modelo | Significado | Efeito atual |
| --- | --- | --- |
| `standard` | Perfis operam por portal conforme papel. | Admin Cliente, inspetor e revisor tendem a ser contas separadas por função. |
| `mobile_single_operator` | App mobile como operação principal com uma pessoa responsável. | Limite operacional de 1 usuário, possibilidade de grants web complementares, identidade runtime `tenant_scoped_portal_grants`. |

O modelo `mobile_single_operator` não significa que o Admin Cliente desaparece. Ele continua existindo para gestão da conta, diagnóstico e contrato, mas a operação técnica pode ficar concentrada em uma pessoa/canal.

## 7. Cenários operacionais suportados

| Cenário | Configuração provável | Fluxo esperado | Pontos de atenção |
| --- | --- | --- | --- |
| Cliente individual | `inspector_chat`, possivelmente `mobile_single_operator`. | Admin Cliente gerencia a própria conta; Mobile/Chat cria e finaliza; sem Mesa se a família permitir. | Famílias de alto risco podem exigir Mesa; emissão oficial pode não existir se `reviewer_issue=false`. |
| Empresa pequena sem Mesa | `inspector_chat`, `standard`. | Admin Cliente cria equipe; inspetores coletam; finalização interna/mobile conforme policy. | Precisa deixar claro o que é PDF operacional versus documento oficial. |
| Empresa pequena com Mesa | `inspector_chat_mesa`. | Inspetor coleta; envia para Mesa; revisor decide; emissão oficial se signatário e pacote permitirem. | Requer usuários revisores e governança de signatário. |
| Empresa grande sem Mesa | `inspector_chat` ou pacote custom futuro. | Muitos inspetores, Admin Cliente acompanha, finalização interna governada por família. | O código atual tem pacotes simples; escala grande sem Mesa exige limites, auditoria e governança comercial mais detalhados. |
| Empresa grande com Mesa | `inspector_chat_mesa` ou `inspector_chat_mesa_reviewer_services`. | Papéis separados, Mesa interna/externa, emissão oficial, histórico e auditoria. | Melhor encaixe com arquitetura atual de emissão oficial e Portal Documentos. |
| Cliente só mobile | `mobile_single_operator`, portal `inspetor`, Admin Cliente mínimo. | App mobile é canal principal; web pode ser fallback se liberado. | Distribuição app, push, offline e backend hospedado precisam estar prontos para produção real. |
| Cliente governado premium | `inspector_chat_mesa_reviewer_services` + catálogo/release/signatários. | Admin Cliente administra; inspetor coleta; Mesa revisa; signatário emite; Portal Cliente entrega. | Caminho mais auditável e mais próximo do Golden Path NR35. |

## 8. Como o sistema decide Mesa ou sem Mesa

O fluxo de finalização não deve ser lido como regra única. A decisão combina:

| Entrada | Papel na decisão |
| --- | --- |
| `report_pack_draft_json.quality_gates.final_validation_mode` | Pode indicar `mesa_required`, `mobile_review_allowed` ou `mobile_autonomous`. |
| Policy V2 em `request.state.v2_policy_decision_summary` | Pode trazer `review_mode` efetivo. |
| Capability `inspector_send_to_mesa` | Permite handoff para Mesa quando a Mesa existe para o tenant. |
| Capability `mobile_case_approve` | Permite fallback de aprovação interna/mobile quando não há Mesa e a família permite. |
| Família/template | Pode endurecer regra. NR35 Linha de Vida, por exemplo, exige Mesa no piloto vendável. |

Em `laudo_decision_services.py`, se o modo é `mesa_required` e o tenant possui `inspector_send_to_mesa`, o caso segue para Mesa. Se não possui Mesa, o sistema só cai para `mobile_autonomous` quando `mobile_case_approve` está liberado e a família não exige Mesa estrita. Se a família exigir Mesa, a finalização deve bloquear com erro acionável.

## 9. Catálogo, templates e releases por tenant

O catálogo separa família técnica, modo técnico, oferta comercial e liberação por tenant. A liberação por tenant define:

- famílias permitidas;
- modos/variantes permitidas;
- templates permitidos;
- template default;
- status de release;
- política de revisão herdada ou sobrescrita.

O Admin CEO controla essa camada. O Admin Cliente consome o que foi liberado. O Chat Inspetor e o Mobile recebem opções já filtradas pelo tenant, e a Mesa atua sobre casos que nascem dessa governança.

## 10. Portal Cliente não é um único papel fixo

O Portal Cliente reúne múltiplas superfícies:

| Superfície | Leitura correta |
| --- | --- |
| `admin` | Gestão do tenant, equipe, capacidade, suporte e diagnóstico. |
| `chat` | Pode acompanhar ou operar casos se o contrato liberar ações. |
| `mesa` | Pode acompanhar ou agir na Mesa conforme policy/capabilities. |
| `documentos` | Entrega documental, status, histórico, hash e downloads oficiais. |
| `servicos`, `ativos`, `recorrencia` | Superfícies comerciais/operacionais do tenant. |

Portanto, o Portal Cliente não deve ser reduzido a `read-only`. Também não deve ser elevado a operador técnico total por padrão. Ele é uma superfície administrável e parcialmente operacional, governada por `tenant_admin_policy`.

## 11. Matriz de cenários versus capacidades

| Cenário | Admin Cliente | Chat Inspetor | Mobile | Mesa | Emissão oficial | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| Individual básico | Sim | Sim, se liberado | Sim | Não | Não ou futuro pacote | Bom para uso assistido sem Mesa em famílias simples. |
| Individual governado | Sim | Sim | Sim | Sim, pode ser externa | Sim | Exige pacote com Mesa/signatário. |
| Pequena empresa sem Mesa | Sim | Sim | Sim | Não | Limitada | Depende de `mobile_case_approve` e política da família. |
| Pequena empresa com Mesa | Sim | Sim | Sim | Sim | Sim | Fluxo mais seguro para venda técnica. |
| Grande empresa sem Mesa | Sim | Sim | Sim | Não | Parcial/custom | Precisa auditoria forte e regras de responsabilidade por família. |
| Grande empresa com Mesa | Sim | Sim | Sim | Sim | Sim | Arquitetura atual mais completa. |
| Mobile-only operacional | Sim | Opcional | Principal | Opcional | Conforme pacote | `mobile_single_operator` cobre a identidade principal. |

## 12. Lacunas e riscos arquiteturais

| Lacuna/risco | Impacto | Classificação |
| --- | --- | --- |
| Pacotes atuais ainda são poucos. | Alguns cenários reais exigem combinações mais finas que os três presets atuais. | P1 comercial/produto. |
| Portal Cliente mistura acompanhamento e ação conforme policy. | Risco de confusão na UX se a tela não explicar por que pode ou não agir. | P1 UX/governança. |
| Fluxo sem Mesa precisa narrativa documental clara. | Cliente pode confundir finalização interna com emissão oficial auditável. | P1 produto/documento. |
| Mobile-first ainda depende de validação operacional hospedada. | Para cliente que só quer app, produção real exige EAS, backend hospedado, push/offline e suporte. | P0/P1 infra/mobile. |
| Emissão oficial mais madura está concentrada em caminho governado. | Cenários sem Mesa podem precisar outro modelo de responsabilidade e assinatura. | P1 decisão de produto. |
| Família pode exigir regra diferente do pacote. | Exemplo: NR35 exige Mesa no piloto, mesmo que tenant sem Mesa exista. | Já modelado, mas precisa comunicação clara. |
| Admin Cliente com ações técnicas precisa fronteira clara. | Evita virar Admin CEO informal ou revisor sem governança. | P1 segurança/produto. |
| Reemissão/superseded ainda é follow-up. Downloads oficiais já registram auditoria sanitizada. | Histórico de substituição de emissão ainda pode ficar incompleto para produção real. | P0 para produção documental forte. |

## 13. Recomendações

1. Manter a arquitetura por capabilities como fonte de verdade. Não criar bifurcação fixa `com Mesa` versus `sem Mesa` espalhada por tela.
2. Formalizar mais pacotes comerciais em cima dos eixos já existentes: portais, capabilities, operating model, revisão, emissão, retenção, suporte e catálogo.
3. Diferenciar claramente três resultados documentais: rascunho/PDF operacional, aprovação/revisão e `EmissaoOficialLaudo`.
4. Para cliente individual e mobile-first, criar narrativa própria: operação simples, finalização interna quando permitida, limites explícitos e upgrade para Mesa/emissão oficial.
5. Para empresa grande, fortalecer auditoria, signatários, histórico, reemissão e permissões por papel.
6. Generalizar o padrão NR35 para outras famílias apenas depois de definir se a família exige Mesa, aceita mobile review ou permite autonomia governada.
7. Melhorar a UX do Portal Cliente para explicar capacidades liberadas e bloqueadas por contrato, sem parecer erro.
8. Antes de produção real, fechar PR9 de reemissão/superseded e manter auditoria de download oficial coberta nos fluxos Portal Cliente, Chat/Mobile e Mesa.

## 14. Conclusão

A arquitetura atual já suporta múltiplos contextos operacionais. O desenho correto é:

`Admin CEO governa contrato global -> tenant recebe pacote, portais e capabilities -> Admin Cliente administra a empresa -> Inspetor/Mobile coletam -> Mesa entra quando contratada/exigida -> emissão oficial entra quando a governança permite -> Portal Cliente entrega e audita`.

O ponto central é não tratar Mesa como universal e não tratar ausência de Mesa como universal. A regra real é governada por tenant, pacote, portal, capability, família e estado do caso.
