# PLANS

Arquivo de trabalho para tarefas longas, confusas ou multissuperfície.

Atualizado em `2026-04-22`.

## Quando usar

- tarefa com mais de `30 min`;
- tarefa com impacto em mais de um workspace;
- investigação com muitos blockers;
- refatoração estrutural;
- correção crítica com risco de regressão.

## Estado atual

### `PKT-WEB-HOTSPOTS-03` - Inspetor runtime, admin rollups, bridge cliente e mesa SSR

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` perdeu mais dois blocos de composição para `web/static/js/inspetor/workspace_runtime_registry.js` e `web/static/js/inspetor/workspace_page_elements.js`, `admin/services.py` drenou o bloco coeso de governança/rollups para `web/app/domains/admin/admin_catalog_rollup_runtime_services.py`, depois drenou a normalização/contrato comercial do catálogo para `web/app/domains/admin/admin_catalog_contract_normalization_services.py`, `web/app/domains/cliente/portal_bridge.py` virou agregador fino sobre `portal_bridge_chat.py` e `portal_bridge_review.py`, e `web/app/domains/revisor/panel.py` simplificou a resolução SSR/shadow sem reabrir o contrato da mesa

### Objetivo

- reduzir mais um ciclo de custo estrutural no runtime do inspetor web
- continuar drenando `admin/services.py` sem reintroduzir acoplamento
- afinar a fronteira técnica do `admin-cliente` com `chat` e `mesa`
- simplificar a composição SSR da mesa preservando compatibilidade de testes e rollout

### Escopo

- entra extração de registry/runtime globals e cache de elementos da página do inspetor
- entra extração do bloco de governança e rollups do catálogo/admin para módulo próprio
- entra fatiamento do `portal_bridge` em chat e revisão, mantendo um agregador compatível
- entra helper mais simples de composição do painel SSR da mesa
- nao entra mudança de contrato funcional do caso técnico, catálogo ou fluxo de revisão

### Criterio de pronto

- `chat_index_page.js` perde mais um bloco grande de wiring mecânico
- `admin/services.py` deixa de concentrar o bloco de governança/rollups
- `portal_bridge.py` deixa de carregar todas as integrações concretas em um único arquivo
- `panel.py` reduz o ruído de shadow/projection sem quebrar a compatibilidade atual
- `node --check`, `py_compile`, `ruff`, `tests/test_v2_review_queue_projection.py`, `tests/test_reviewer_panel_boot_hotfix.py`, `tests/test_cliente_portal_critico.py` e `tests/test_smoke.py` ficam verdes

### `PKT-HOTSPOTS-BASELINE-01` - Baseline local + primeiros cortes nos hotspots web/admin

- `status`: concluído localmente em `2026-04-21`; lint do `admin/services.py` voltou a ficar verde, a normalização de estado do inspetor saiu de `chat_index_page.js` para `web/static/js/inspetor/state_normalization.js`, o console de settings da plataforma saiu de `admin/services.py` para `web/app/domains/admin/platform_settings_services.py`, e o `make verify` ficou verde sob `Node v22.22.2`

### Objetivo

- restaurar a baseline local antes de continuar refatorações mais profundas
- reduzir dois hotspots centrais sem mudar comportamento de produto
- registrar o estado operacional desta cópia recuperada antes de pensar em commit/push

### Escopo

- entra remoção de bloqueio de lint no `admin`
- entra extração pequena e segura no runtime do inspetor web
- entra extração pequena e segura no domínio `admin`
- entra validação do gate completo sob runtime Node compatível para o mobile
- nao entra normalização completa da metadata Git desta árvore recuperada

### Criterio de pronto

- `make verify` fecha verde no ambiente local compatível
- `chat_index_page.js` perde ao menos uma responsabilidade coesa para módulo próprio
- `admin/services.py` perde ao menos um slice semântico para módulo próprio
- o próximo corte fica registrado em `docs/LOOP_ORGANIZACAO_FULLSTACK.md`

### `PKT-POST-MOBILE-02` - Polimento visual de Finalizar, Histórico e Configurações no Android

- `status`: concluído em `2026-04-16`; `Finalizar` ganhou agrupamento visual explícito entre ações, radar de emissão e pontos críticos, `Histórico` passou a expor radar operacional e cards de retomada mais legíveis, e `Configurações` ganhou topo com sinais rápidos de workspace, ambiente e contato sem reabrir a navegação principal

### Objetivo

- limpar a hierarquia visual das superfícies secundárias mais densas do app do inspetor
- reduzir sensação de painel genérico em `Finalizar`, `Histórico` e `Configurações`
- preservar contratos de navegação, testes e automação já estabelecidos

### Escopo

- entra reforço visual do topo de `Configurações` com sinais operacionais rápidos
- entra radar resumido de casos e item de retomada mais legível no `Histórico`
- entra separação explícita entre ações, resumo e pontos críticos em `Finalizar`
- nao entra redesenho estrutural do shell autenticado nem mudança de contrato da thread

### Criterio de pronto

- `Finalizar` deixa claro o que é ação imediata, o que é radar de emissão e o que é detalhe crítico
- `Histórico` permite leitura mais rápida de fila, mesa e retomada sem abrir cada caso
- `Configurações` expõe no topo os sinais principais da sessão atual sem depender da rolagem longa
- bateria focal de componentes do Android segue verde após o polimento

### `PKT-POST-ADMIN-CEO-01` - Polimento UX do catálogo de laudos

- `status`: concluído em `2026-04-09`; home em largura total com `drawer` para criação/bootstrap, detalhe de família com `abas` reais em `SSR` via `?tab=`, header compacto, formulários recolhidos por padrão, `advanced mode` explícito para JSON cru e leitura reforçada de releases/histórico

### Objetivo

- transformar o catálogo de laudos em painel executivo mais denso e menos parecido com cadastro operacional comprido
- preservar a separação já existente entre `family`, `mode`, `offer`, `calibration` e `tenant release`
- melhorar foco visual, hierarquia e legibilidade sem mexer no contrato principal do backend além do necessário para URL-first e retorno consistente

### Escopo

- entra remoção do formulário fixo de `Nova família` da home em favor de `drawer`
- entram `abas` reais no detalhe com apenas a aba ativa renderizada em `SSR`
- entram listas/estado atual antes dos formulários, formulários recolhidos e `advanced mode` para JSON cru
- entram header compacto, cards/KPIs menores, overflow de ações secundárias e timeline mais legível
- nao entra remodular o catálogo, reabrir migrações ou misturar oferta comercial com modo técnico

### Criterio de pronto

- a home prioriza portfólio, filtros, status e ação rápida em `1366x768`, sem coluna fixa de cadastro
- o detalhe da família deixa de ser uma página longa e passa a navegar por `?tab=` e `#hash`
- JSON cru e blocos vazios deixam de dominar a UX principal
- testes focais do catálogo no `admin` seguem verdes no recorte alterado

### `PKT-CATALOGO-TEMPLATES-01` - Runtime canônico de templates por família

- `status`: em andamento em `2026-04-09`; foco em ligar catálogo governado, `template_master_seed` e geração real de PDF por família sem reabrir modelagem principal; frente atual já cobre resolução catalog-aware de template no `/app/api/gerar_pdf`, priorização de template específico da família quando existir, fallback para seed canônico da família quando não existir template tenant salvo, preservação do legado apenas quando não houver artefato canônico operacional, materialização do `laudo_output` canônico para `NR13` (`vaso de pressão` e `caldeira`), `NR10` (`instalações elétricas` e agora também `prontuário de instalações elétricas`), `NR12` (`máquina e equipamento` e `apreciação de risco`), `NR20` (`inspeção de instalações inflamáveis` e `prontuário de instalações inflamáveis`), `NR33` (`avaliação de espaço confinado` e `permissão de entrada`) e `NR35` (`linha de vida` e `ponto de ancoragem`) a partir do payload atual do caso, início da `wave_2` com `NR18` (`canteiro de obra` e `frente de construção`), `NR22` (`área de mineração` e `instalação mineira`), `NR29` (`operação portuária`), `NR30` (`trabalho aquaviário`), `NR31` (`frente rural`), `NR32` (`inspeção em serviço de saúde` e `plano de risco biológico`), `NR34` (`inspeção frente naval`) e agora também `NR36` (`unidade de abate e processamento`), `NR37` (`plataforma de petróleo`) e `NR38` (`limpeza urbana e manejo de resíduos`), fechando a cobertura de runtime da `wave_2`, extensão da malha catalogada para a `wave_3` completa com `NR01`, `NR04`, `NR05`, `NR06`, `NR07`, `NR08`, `NR09`, `NR11`, `NR14`, `NR15`, `NR16`, `NR17`, `NR19`, `NR21`, `NR23`, `NR24`, `NR25` e `NR26`, persistência desse payload canônico no ciclo de finalização HTTP/SSE antes da etapa de PDF, leitura da Mesa/revisor por blocos canônicos com resumo operacional por seção no pacote técnico e painel inline do caso aberto para revisão sem depender do modal, uma suíte de regressão por fixtures canônicas da `onda_1` para impedir drift entre os artefatos oficiais e o runtime, smoke de emissão PDF por fixture oficial para validar seleção de template canônico e materialização final por família, um runner único de homologação completa da `onda_1` com gate de testes, provisão operacional e relatório consolidado em `.test-artifacts/homologacao/wave_1`, já fechado em `12` famílias homologadas sem pendências remanescentes dentro da onda, um runner equivalente da `wave_2` em `.test-artifacts/homologacao/wave_2`, fechado em `13` famílias homologadas com `13` demos emitidas no tenant piloto, a homologação completa da `wave_3` em `.test-artifacts/homologacao/wave_3`, fechada em `22` famílias homologadas com `22` demos emitidas no tenant piloto, o fechamento automatizado da `wave_4` em `.test-artifacts/homologacao/wave_4`, validando `NR02`, `NR03`, `NR27` e `NR28` como exceções de catálogo sem `family_schema` vendável nem provisão de templates, e agora também contrato documental oficial com `templates mestres`, `document_control`, `tenant_branding` e compatibilidade de placeholders de cabeçalho/rodapé para personalização do PDF por empresa cliente

### Objetivo

- fazer o catálogo de famílias deixar de ser só governança e passar a participar da emissão real do PDF
- garantir que famílias catalogadas possam gerar documento próprio com template dedicado, mesmo antes de uma biblioteca tenant totalmente curada
- manter compatibilidade com templates legacy existentes e com o renderer atual do `editor_rico`

### Escopo

- entra resolução de template por `catalog_family_key`, `release default`, `offer default` e artefato canônico da família
- entra fallback para `template_master_seed` e `laudo_output_seed` no runtime de PDF quando não houver template ativo salvo
- entra priorização de template específico da família sobre runtime genérico do tipo `nr13`
- nao entra modelar de uma vez todos os `report packs` semânticos por família
- nao entra reabrir migrations ou alterar o contrato principal de início/finalização do caso

### Criterio de pronto

- um laudo governado por catálogo consegue sair com PDF da família sem depender de template tenant já salvo
- um template ativo específico da família continua prevalecendo quando existir
- o fallback legado segue intacto para famílias sem artefato canônico operacional

### `PKT-LAUDOS-01` - Espinha semantica para preenchimento correto de laudos oficiais

- `status`: em andamento em `2026-04-06`; `Fase A`, `Fase B` e `Fase C` da entrada configuravel ja implementadas; `Fase D` fechada no fluxo atual com retomada/alternancia do mesmo caso, persistencia canonica do draft guiado por `laudo`, round-trip em `status/mensagens`, sync mobile, `evidence_refs` ligados a `message_id` da thread e `mesa_handoff` no draft canonico; `Fase E` e `Fase F` agora estao implementadas para as familias modeladas `nr35_linha_vida` e `cbmgo`, com `report_pack_draft_json`, `image_slots`, faltas de evidencia, candidato estruturado incremental, gates semanticos e liberacao `mobile_autonomous` allowlisted na finalizacao quando o caso fecha completo, sem nao conformidade impeditiva e sem conflito relevante; `Fase G` tambem entrou no backend com allowlist por template/tenant e agregacao operacional local de rollout, cobrindo preferencia do usuario x modo efetivo, troca de modo, gaps de evidencia e divergencia IA-humano; isso conclui o `full automatico` das familias modeladas atuais, nao a liberacao ampla para todas as familias; ponto de retomada em `docs/restructuring-roadmap/131_dual_entry_resume_checkpoint.md`; proximo slice passa para expansao segura de familias/modelagem e eventual superficie de consulta operacional; plano executivo em `docs/restructuring-roadmap/127_semantic_report_pack_execution_plan.md`, governanca normativa em `docs/restructuring-roadmap/128_normative_override_and_learning_governance.md`, entrada configuravel em `docs/restructuring-roadmap/129_dual_entry_configurable_inspection_roadmap.md` e checklist em `docs/restructuring-roadmap/130_dual_entry_implementation_checklist.md`
- `checkpoint 2026-04-22`: contrato documental e `delivery_package` agora distinguem formalmente `analysis_basis` interno de fotos explicitamente selecionadas para emissao; `build_catalog_pdf_payload` passou a promover apenas `selected_photo_evidence`/`issued_photo_evidence`/`final_pdf_photo_evidence` para `registros_fotograficos` quando a familia suporta anexo fotografico publico, preservando o default `internal_audit_only` para a trilha bruta da IA
- `checkpoint 2026-04-22`: `NR35 linha de vida` agora usa no schema da IA um bloco estrutural mais proximo do laudo real recebido (`metodologia_e_recursos`, `documentacao_e_registros`, `nao_conformidades_ou_lacunas` e `recomendacoes`), e o `report pack` passou a tratar `Pendente` como estado final valido para `mesa_required`, sem marcar ausencia artificial de conclusao; validacao local com `ruff`, `py_compile`, `tests/test_templates_ia_nr35.py`, `tests/test_semantic_report_pack_nr35_autonomy.py`, `tests/test_catalog_nr35_overlay.py` e `tests/test_smoke.py`
- `checkpoint 2026-04-22`: o caminho `family_schema -> laudo_output -> catalog_pdf_projection -> template_master_seed` da familia `nr35_inspecao_linha_de_vida` agora materializa tambem `limitacoes_de_inspecao`, `motivo_status`, `liberado_para_uso`, `acao_requerida` e `condicao_para_reinspecao`, com conclusao tecnica e justificativa mais especificas para `Reprovado` e `Pendente`; validacao local com `py_compile`, `ruff`, `tests/test_catalog_pdf_templates.py -k 'nr35_linha_de_vida or normaliza_status_legado_nr35'`, `tests/test_catalog_nr35_overlay.py` e `tests/test_smoke.py`
- `checkpoint 2026-04-22`: a familia `nr35_inspecao_linha_de_vida` agora explicita no `family_schema` os slots fotograficos opcionais recorrentes do material real (`foto_panoramica_contexto`, `foto_tag_identificacao`, `foto_contexto_restricao_acesso` e `foto_detalhe_achado_principal`), sem reabrir os slots obrigatorios nem o fluxo de emissao; validacao local com `json.tool`, `tests/test_catalog_nr35_overlay.py` e `tests/test_smoke.py`
- `checkpoint 2026-04-22`: a cobertura operacional da `NR35 linha de vida` ficou explicitada em uma matriz dedicada para `Aprovado`, `Pendente` por acesso parcial e `Reprovado` por irregularidade material, ligando material real, artefato canonico e testes de runtime sem multiplicar `laudo_output_exemplo`; validacao local com `json.tool`, `tests/test_catalog_nr35_overlay.py` e `tests/test_smoke.py`
- `checkpoint 2026-04-22`: a direção de produto para tenants sem `Mesa` agora foi registrada em `docs/restructuring-roadmap/133_inspetor_correcoes_sem_mesa.md` e `web/docs/correcao_sem_mesa.md`, consolidando a aba `Correções` como superfície separada do `Chat`, sem `Word livre` e sem segundo chat genérico; validacao local documental
- `checkpoint 2026-04-23`: o chat livre do inspetor passou a distinguir conversa livre de criação de laudo: mensagens comuns não abrem caso técnico, enquanto o gatilho explícito `iniciar novo laudo`/botão sutil `Iniciar laudo` cria um laudo livre; o mesmo botão agora pausa/retoma a coleta do laudo ativo, marcando mensagens `off` como fora do contexto documental para que o histórico continue no chat sem contaminar `report_pack`, pré-laudo ou PDF; o composer ganhou ações compactas de prévia, correções e checagem NR35, e o backend passou a expor análise não destrutiva de compatibilidade antes de migrar um laudo livre para família guiada

### Objetivo

- transformar o preenchimento de laudos oficiais no fluxo central do produto, acima da conversa isolada com a IA
- unificar `Templates/`, `editor_rico` da Mesa e finalizacao da IA em uma espinha unica baseada em `report packs`
- fazer a IA preencher `JSON canonico` por familia documental, com texto, checklist, fotos e gates de validacao
- permitir `chat-first` ou `evidence-first` como entradas configuraveis do mesmo caso tecnico, com preferencia definida pelo usuario e restricoes por politica

### Escopo

- entra catalogo de familias documentais oficiais e congelamento de `family/version/policy`
- entra contrato de `report pack` com `schema`, `image_slots`, `evidence_policy` e `validation_policy`
- entra `evidence bundle` do caso inteiro, em vez de depender apenas do payload corrente da interacao
- entra evolucao do renderer para texto, `checkbox` e imagem
- entra integracao semantica do `editor_rico` da Mesa como autoria de template
- entra politica dupla `mesa_required` e `mobile_autonomous`, com hard gates para autonomia
- entra separacao entre `aprovacao operacional`, `verdade normativa` e `elegibilidade para aprendizado`
- entra politica de `entrada configuravel` com `entry_mode_preference`, `entry_mode_effective` e `entry_mode_reason`
- nao entra liberacao ampla e imediata de autonomia mobile para todas as familias
- nao entra tratar PDF travado como fonte primaria de inteligencia do processo

### Criterio de pronto

- ao menos uma familia oficial opera ponta a ponta via `report pack` versionado, `evidence bundle`, `JSON canonico` e renderer com texto, `checkbox` e imagem
- a politica `mesa_required` funciona com medicao explicita de divergencia entre prefill da IA e decisao final humana
- override humano pode aprovar emissao sem transformar conflito normativo em aprendizado automatico
- o usuario consegue iniciar por conversa ou evidencias sem criar pipeline tecnico paralelo ou perder rastreabilidade do caso
- a autonomia mobile so existe onde houver allowlist, gates fortes e rollback simples para `mesa_required`

### `PKT-POST-ADMIN-CLIENTE-01` - Fechamento do portal Admin-Cliente

- `status`: concluído em `2026-03-31`; checklist pratico em `docs/restructuring-roadmap/122_admin_cliente_implementation_checklist.md` e fechamento em `docs/restructuring-roadmap/123_admin_cliente_surface_closure.md`

### Objetivo

- fechar o portal `admin-cliente` como superficie canonica da empresa cliente
- retirar mutacao comercial direta e autoprovisionamento ambiguo no mesmo nivel administrativo
- limpar stubs de auth, semantica residual de `admin-geral` e compatibilidade excessiva do boot

### Escopo

- entra governanca de plano por `interesse/solicitacao`, nao por mutacao direta
- entra foco de usuarios em `inspetor` e `revisor`, com `decision gate` explicito sobre multiplos `admin_cliente`
- entra honestidade de produto no login cliente
- entra limpeza semantica do bootstrap e reducao do `temporaryCompat` no portal cliente
- entra simplificacao de UX e isolamento visual do auth cliente
- nao entra `modo suporte` do `admin-geral`
- nao entra redesign premium amplo de todo o portal

### Criterio de pronto

- o portal cliente nao conclui troca comercial de plano nem se autoprovisiona como governanca superior por padrao
- login e UX do portal cliente so anunciam capacidades reais do produto
- residuos de `Admin-CEO` deixam de contaminar a experiencia principal do tenant
- `pytest` focal de `cliente`, `tenant boundary`, `session/auth/audit`, `smoke` e bootstrap `v2` permanece verde

### `PKT-POST-ADMIN-CLIENTE-02` - Fechamento operacional de visibilidade, suporte e auditoria

- `status`: concluido em `2026-04-01`; follow-up registrado em `docs/restructuring-roadmap/124_admin_cliente_policy_completion.md`

### Objetivo

- fechar o residual funcional do `admin-cliente` deixado apos o encerramento estrutural
- materializar a politica final de visibilidade do tenant no contrato administrativo
- governar suporte excepcional por tenant sem abrir um "modo suporte" navegavel dentro do `/cliente`
- classificar a auditoria do tenant por escopo e categoria, com timeline explicita

### Escopo

- entra derivacao da `visibility_policy` a partir da politica real da plataforma
- entra abertura e encerramento auditavel de suporte excepcional no `admin-geral`, com `step-up`, justificativa e referencia de aprovacao
- entra resumo e filtro de auditoria por `admin`, `chat`, `mesa` e `support` no portal cliente
- entra reflexo dessas politicas no diagnostico do tenant e no detalhe administrativo do `Admin-CEO`
- nao entra `admin-geral` navegando por dentro do tenant
- nao entra redesign premium amplo

### Criterio de pronto

- `admin-cliente` deixa de depender de placeholder para visibilidade, suporte e auditoria
- o suporte excepcional fica formalmente governado fora do `/cliente`, com trilha duravel por tenant
- bootstrap, API, diagnostico e telas administrativas convergem para a mesma leitura de politica
- rodada ampla de regressao do dominio cliente/admin permanece verde

### `PKT-POST-ADMIN-CLIENTE-03` - Checkpoint de UX premium local do portal

- `status`: concluido em `2026-04-01`; fechamento em `docs/restructuring-roadmap/125_admin_cliente_premium_ux_checkpoint.md`

### Objetivo

- fechar o acabamento premium local do `admin-cliente` depois do encerramento estrutural e funcional
- elevar leitura executiva, hierarquia visual e exploracao da timeline sem reabrir backend sensivel
- endurecer deep link, reload e historico das subabas do tenant com UX mais madura

### Escopo

- entra hero executivo, CTA dominante e KPIs na shell do portal cliente
- entram briefs por secao, cards mais hierarquicos e subnavegacao premium no `admin`
- entram politica de suporte mais visivel, protocolo recente, filtros e busca na auditoria
- entram fallbacks SSR mais fortes em `chat` e `mesa` para `?sec=`
- entra endurecimento URL-first da navegacao do `admin` para preservar historico
- nao entra redesign premium amplo do produto inteiro
- nao entram mudancas de auth, sessao, contratos do chat ou ACL do tenant

### Criterio de pronto

- o `admin-cliente` passa a ter leitura premium local verificavel sem perder estabilidade
- deep link, reload e back/forward seguem verdes nas superficies do portal cliente
- suporte e auditoria deixam de ser apenas blocos basicos e passam a ter leitura exploravel
- checks de JS, testes focais do portal e recorte Playwright permanecem verdes

### `PKT-POST-INSPETOR-01` - Hardening URL-first do workspace e historico canonico

- `status`: concluido em `2026-04-01`; fechamento em `docs/restructuring-roadmap/126_inspetor_workspace_history_hardening.md`

### Objetivo

- fechar o residual do workspace focado do `inspetor` depois da reorganizacao estrutural
- transformar `Conversa | Historico | Anexos | Mesa` em abas recuperaveis por URL e `history.state`
- trocar a timeline do `Historico` para leitura canonica do payload do laudo com fallback apenas para transientes locais

### Escopo

- entram helpers explicitos de `?aba=` no core do chat
- entram boot, `popstate` e selecao de laudo preservando a aba ativa do workspace
- entra priorizacao de `?aba=` no resolvedor do `inspetor` sem misturar autoridade de negocio com navegacao
- entra timeline de historico alimentada pelo payload canonico e pelo evento `tariel:historico-laudo-renderizado`
- entram testes browser para deep link, reload, back/forward e leitura do historico tecnico
- nao entra redesign premium amplo do `inspetor`
- nao entra API nova dedicada so para timeline tecnica

### Criterio de pronto

- `?aba=` passa a reabrir `historico`, `anexos` e `mesa` sem depender de estado efemero do runtime
- reload e back/forward preservam a aba ativa do workspace do `inspetor`
- o modo `Historico` deixa de depender apenas do DOM corrente e passa a consumir o payload canonico do laudo quando ele existe
- smoke, testes focais do `inspetor` e recorte Playwright especifico permanecem verdes

### `PKT-POST-PLAN-01` — Alinhamento técnico pós-plano

- `status`: executado em `2026-03-31`; próximos passos deixaram de ser limpeza estrutural ampla e passaram a ser slices dependentes de decisão

### Objetivo

- fechar os resíduos técnicos pós-plano em `P1` a `P8` sem reabrir o plano mestre
- transformar o que ainda era `shadow`, compatibilidade ou observação em contrato explícito quando isso pudesse ser feito sem ambiguidade
- sair do modo “hotspot estrutural” para um checkpoint orientado por decisão e governança

### Escopo

- entra convergência do estado do Inspetor
- entra enforcement documental por tenant
- entra colaboração canônica da Mesa em `frontend paralelo da Mesa`, Android, shell legada e realtime do revisor
- entra política explícita de visibilidade administrativa
- entram contrato explícito de anexos/sync móvel, governança documental, benchmarks pós-plano e alinhamento visual seguro do shell principal do Inspetor
- não entra redefinição jurídica final de IA, catálogo comercial fino nem redesign premium amplo de UX

### Critério de pronto

- `make contract-check`, `make verify`, `make v2-acceptance` e `make post-plan-benchmarks` verdes na mesma rodada
- resíduos estruturais concentrados apenas no que depende de decisão de produto/comercial/jurídico
- checkpoint documentado em `Tarie 2/docs/migration/79_post_plan_execution_closure.md`

### `PKT-F12-01` — Fechamento da Fase 12 Evolução estrutural V2

- `status`: concluído em `2026-03-31`; próximo passo direto é encerrar o plano mestre atual e tratar novas frentes como evolução pós-plano

### Objetivo

- promover a espinha estrutural do `V2` no sistema vivo sem reescrita big bang
- consolidar a ordem `envelopes -> ACL -> projeções -> provenance -> policy engine -> facade -> adapter`
- institucionalizar um runner oficial de aceite da fase

### Escopo

- entram envelopes, ACL, projeções do inspetor e da mesa, provenance, `policy engine`, facade documental e adapter Android
- entram projeções administrativas e `metering` explícito sem leitura técnica bruta
- entra `make v2-acceptance` com artifact autoritativo em `artifacts/v2_phase_acceptance/20260331_071151/`
- não entra uma nova fase posterior dentro do plano mestre atual

### Critério de pronto

- a ordem estrutural do `V2` fica materializada em código versionado e coberta por testes focais
- o pacote administrativo deixa de depender de lógica implícita de billing/consumo embutida em projeções
- `make v2-acceptance`, `make contract-check` e `make verify` passam na rodada final da fase

### `PKT-F11-01` — Fechamento da Fase 11 Higiene permanente e governança

- `status`: concluído em `2026-03-31`; próximo passo direto é `Fase 12 - Evolução estrutural V2`

### Objetivo

- institucionalizar política de `artifacts/`, `gitignore` por workspace e governança local mínima
- tirar `PLANS.md` e `git worktree` da memória informal
- reduzir a chance de outputs locais dominarem `git status`

### Escopo

- entra policy versionada de hygiene local
- entram `.gitignore` revistos por workspace
- entram `make hygiene-check` e `make hygiene-acceptance`
- entra endurecimento do `clean-generated`
- não entra reescrita histórica de artifacts já antigos/versionados

### Critério de pronto

- policy de `artifacts/` fica explícita e versionada
- `PLANS.md` e `git worktree` ficam institucionalizados como regra operacional
- `make hygiene-acceptance`, `make contract-check` e `make verify` passam na rodada final da fase

### `PKT-F10-01` — Fechamento da Fase 10 Observabilidade, operação e segurança

- `status`: concluído em `2026-03-30`; próximo passo direto é `Fase 11 - Higiene permanente e governança`

### Objetivo

- promover a `Fase 10` sem deixar tracing, erro, retenção e governança dependerem de memória informal
- unificar `correlation_id` e `traceparent` entre backend, `frontend paralelo da Mesa` e mobile
- institucionalizar um runner oficial de aceite da fase

### Escopo

- entra `OpenTelemetry` opcional no backend
- entra `Sentry` opcional com scrubbing
- entra política explícita de analytics/replay/LGPD/retenção
- entra summary administrativo em `/admin/api/observability/summary`
- entra `make observability-acceptance`
- não entra enforcement remoto de branch protection no GitHub via API

### Critério de pronto

- `correlation_id` e `traceparent` cruzam backend, `frontend paralelo da Mesa` e mobile sem dialetos paralelos
- logs e medições pesadas ficam observáveis sem depender de grep manual em payload bruto
- retenção, mascaramento e replay deixam de ser implícitos
- `make observability-acceptance`, `make contract-check` e `make verify` passam na rodada final da fase

### `PKT-F09-01` — Fechamento da Fase 09 Documento, template e IA

- `status`: concluído em `2026-03-30`; próximo passo direto é `Fase 10 - Observabilidade, operação e segurança`

### Objetivo

- promover a `Fase 09 - Documento, template e IA` sem deixar o ciclo documental depender do legado invisível
- fechar lifecycle de template, preview/publicação/rollback, provenance IA/humana e medição operacional de `OCR`/custos
- institucionalizar um runner oficial de aceite da fase

### Escopo

- entra lifecycle completo de template no `frontend paralelo da Mesa`, com `publish`, status, base recomendada, clone, preview e arquivo-base
- entra provenance IA/humana explícita no shell oficial do caso sem quebrar o fold principal validado por snapshot
- entra agregação administrativa de operações pesadas em `/admin/api/document-operations/summary`
- entra `make document-acceptance` com artifact autoritativo em `artifacts/document_phase_acceptance/20260330_213625/`
- não entra observabilidade distribuída ampla nem policy global de rollout/segurança

### Critério de pronto

- template, preview, publicação e rollback deixam de divergir entre shell oficial e fonte de verdade
- provenance IA/humana fica explícita e auditável no detalhe do caso
- `OCR`, geração documental e custos pesados ficam agregados em leitura administrativa explícita
- `make document-acceptance`, `make verify` e `make contract-check` passam na rodada final da fase

### `PKT-F08-01` — Fechamento da Fase 08 Mobile

- `status`: concluído em `2026-03-30`; próximo passo direto é `Fase 09 - Documento, template e IA`

### Objetivo

- promover a `Fase 08 - Mobile` sem depender de login/manual smoke improvisado para validar a APK
- fechar build local, push operacional e smoke real controlado do app Android
- manter separada a trilha de validação orgânica/humana do tenant demo para qualquer discussão futura de tenant real

### Escopo

- entra endurecimento do login mobile com timeout real, persistência local não-bloqueante e probe de automação
- entra registro operacional de dispositivo/push no backend e no app
- entra institucionalização de `make mobile-baseline`, `make mobile-preview` e `make smoke-mobile`
- entra artifact autoritativo do runner oficial em `artifacts/mobile_pilot_run/20260330_203601/`
- não entra promoção de tenant real

### Critério de pronto

- a APK preview sobe, autentica e alcança o shell autenticado no emulador de forma reproduzível
- histórico, seleção de laudo, central de atividade e thread da Mesa passam no runner oficial
- o build/smoke do mobile ficam amarrados em entrypoints oficiais do repositório
- a trilha orgânica/humana continua separada como guard-rail operacional e não como smoke improvisado

### `PKT-F07-01` — Fechamento da Fase 07 de Cliente/Admin

- `status`: concluído em `2026-03-30`; próximo passo direto é `Fase 08 - Mobile`

### Objetivo

- promover a `Fase 07 - Cliente e admin` sem trilha administrativa oculta
- fechar auditoria visível do `admin-geral`
- fechar suporte e diagnóstico explícitos do portal `admin-cliente`

### Escopo

- entra auditoria HTML/JSON do `admin-geral`
- entra diagnóstico exportável por tenant no detalhe administrativo
- entra diagnóstico exportável e relato de suporte no portal cliente
- entra a manutenção do `RBAC`, `CSRF` e da fronteira explícita entre `cliente`, `admin`, `chat` e `mesa`
- não entra redesign estrutural amplo dos portais

### Critério de pronto

- `/admin/auditoria` existe como leitura explícita da trilha crítica do `admin-geral`
- `/admin/clientes/{empresa_id}/diagnostico` exporta o tenant sem depender de console ou script manual
- `/cliente/api/diagnostico` e `/cliente/api/suporte/report` ficam operacionais e auditáveis
- a bateria focal de `cliente/admin`, tenant boundary, sessão/auth/auditoria e smoke parcial fica verde

### `PKT-F06-01` — frontend paralelo da Mesa oficial, FE-V10 e fechamento da Fase 06

- `status`: concluído em `2026-03-30` e supersedido em `2026-04-04` pela consolidação da Mesa oficial no `SSR`; próximo passo direto continua `Fase 07 - Cliente e admin`

### Objetivo

- promover a `frontend paralelo da Mesa` como superfície oficial da Mesa sem quebrar auth/sessão do legado
- materializar rollout, rollback e aceite final da Mesa em artifact reproduzível
- integrar o smoke oficial da Mesa ao gate local do repositório

### Escopo

- entra o bridge de rollout em `web/app/domains/revisor`
- entra a preservação da cookie/sessão real no BFF do `frontend paralelo da Mesa`
- entra o runner read-only de paridade/aceite FE-V10
- entra o gate local `mesa-smoke` em `make verify`
- não entra automação cega de mutação real em dados do revisor

### Critério de pronto

- `/revisao/painel` redireciona oficialmente para `frontend paralelo da Mesa` com rollback explícito por `?surface=ssr`
- a fila real do `frontend paralelo da Mesa` continua lendo a fonte legacy sem recursão
- `make mesa-smoke` fica verde e passa a compor `make verify`
- o artifact de aceite FE-V10 fica verde com paridade real e sem divergências na fila

### Observação posterior

- em `2026-04-04`, a iniciativa `frontend paralelo da Mesa` foi arquivada para eliminar a duplicação da Mesa; a superfície oficial voltou a ser exclusivamente o `SSR` em `web/`, com limpeza de scripts, workflows e docs operacionais associados ao frontend paralelo

### `PKT-E02-01` — Mapeamento legado do Technical Case

- `status`: concluído em `2026-03-30`; próximo pacote direto é `PKT-E02-02`

### Objetivo

- congelar o mapa `Laudo -> case_id/thread_id/document_id/document_version`
- explicitar quais superfícies leem e escrevem o caso hoje
- deixar a ACL do caso pronta para implementação sem depender de memória informal

### Escopo

- entra o legado vivo em `web/app/domains/chat`, `web/app/domains/revisor`, `web/app/domains/cliente`, `web/app/domains/admin` e `web/app/shared`
- entra o alinhamento com os contratos canônicos do workspace V2 em `/home/gabriel/Área de trabalho/Tarie 2`
- não entra mudança funcional no backend do legado
- não entra troca de payload em produção

### Passos

1. inventariar `Laudo`, `MensagemLaudo`, `LaudoRevisao`, `AnexoMesa` e `PacoteMesaLaudo`
2. congelar a tradução de estado legado para estado canônico
3. mapear entrypoints de inspetor/chat web, mesa web, admin-cliente web, admin geral web e Android mobile
4. registrar o pacote documental em `/home/gabriel/Área de trabalho/Tarie 2/scaffolding/backend/domains/technical_case/legacy_mapping/README.md`

### Critério de pronto

- tabela `legado -> caso técnico` publicada
- assimetria entre `Admin Cliente`, `Admin Geral`, chat e mesa explicitada
- próximo passo `PKT-E02-02` identificado sem ambiguidade

### `PKT-E02-02` — ACL de leitura do caso

- `status`: concluído em `2026-03-30`; próximo pacote direto é `PKT-E02-03`

### Objetivo

- transformar o mapeamento legado em snapshot canônico executável do caso
- materializar `case_id`, `thread_id`, `document_id` e `document_version` sem depender do payload bruto do portal
- expor a leitura canônica em `shadow mode` em caminhos reais de inspetor e mesa

### Escopo

- entra a ACL incremental em `web/app/v2/acl`
- entra integração leve via `request.state` nos reads de status do inspetor e pacote da mesa
- entra cobertura de teste da nova tradução
- não entra troca do payload público em produção

### Passos

1. criar `technical_case_snapshot.py` com estado, refs legadas, visibilidade e sensibilidade
2. conectar o snapshot rico ao read de status do inspetor
3. conectar o snapshot rico ao read de pacote da mesa
4. validar com `pytest` focado e manter payload público intacto

### Critério de pronto

- snapshot canônico rico executável publicado em `web/app/v2/acl/technical_case_snapshot.py`
- `request.state` expõe o snapshot rico nos caminhos de leitura conectados
- `pytest` focal da ACL, inspetor e mesa verde
- próximo passo `PKT-E02-03` identificado sem ambiguidade

### `PKT-E02-03` — Consumo piloto da facade

- `status`: concluído em `2026-03-30`; próximo pacote direto é `PKT-E03-01`

### Objetivo

- usar a leitura canônica do caso em um consumer controlado, sem trocar o fluxo público inteiro
- validar a assimetria do `admin-cliente` sobre chat web e mesa web sem promover acesso administrativo cruzado
- comparar o piloto com o bootstrap legado e manter rollback por `feature flag`

### Escopo

- entra o bootstrap do `admin-cliente` em `web/app/domains/cliente`
- entra projeção canônica incremental para visão administrativa do tenant em `web/app/v2/contracts` e `web/app/v2/adapters`
- entra `shadow mode` por `request.state` e `feature flag`
- não entra troca do payload público do endpoint
- não entra exposição de superfícies administrativas para chat web ou mesa web

### Passos

1. criar a projeção incremental do `tenant admin`
2. adaptar o bootstrap legado para gerar a projeção em `shadow mode`
3. validar compatibilidade com o payload atual e divergências mínimas
4. cobrir o piloto com teste focado sem alterar a resposta pública

### Critério de pronto

- o bootstrap do `admin-cliente` registra a projeção canônica em `shadow mode`
- o payload público permanece inalterado com a `feature flag` ligada
- `pytest` focal do piloto, da ACL e das projeções correlatas verde
- próximo passo `PKT-E03-01` identificado sem ambiguidade

### `MP-003` — Projeção administrativa do Admin Geral

- `status`: concluído em `2026-03-30`; próximo passo direto é fechar a matriz contratual multiportal e revisar `RBAC` por ação

### Objetivo

- projetar uma visão administrativa agregada para o `admin-geral`, sem conteúdo técnico bruto por padrão
- validar a singularidade entre `Admin Geral` e `Admin Cliente`
- conectar a projeção em `shadow mode` no painel legado sem trocar o HTML público

### Escopo

- entra contrato incremental em `web/app/v2/contracts/platform_admin.py`
- entra adapter de shadow do painel em `web/app/v2/adapters/platform_admin_dashboard.py`
- entra integração leve em `web/app/domains/admin/routes.py`
- entra cobertura de teste focada para shape e rota
- não entra leitura técnica integral de tenant

### Passos

1. materializar a projeção canônica `platform_admin_view`
2. adaptar o dashboard legado para emitir a projeção em `request.state`
3. comparar contagens agregadas com o payload administrativo atual
4. validar que o HTML público do painel não muda com a `feature flag`

### Critério de pronto

- o painel do `admin-geral` registra a projeção agregada em `shadow mode`
- a visão continua sem conteúdo técnico bruto por padrão
- o HTML público do painel permanece inalterado com a `feature flag` ligada
- `pytest` focal da nova projeção e das projeções correlatas verde

### `MP-004` — Matriz de RBAC por ação

- `status`: concluído em `2026-03-30`; próximo passo direto é revisar isolamento de tenant por ação crítica

### Objetivo

- explicitar `RBAC` por ação nas superfícies críticas com base nos guards reais do sistema vivo
- remover o atalho que deixava `Admin Geral` entrar na superfície bruta da `Mesa`
- travar em teste as fronteiras entre `Inspetor`, `Revisor`, `Admin Cliente`, `Admin Geral` e `Android`

### Escopo

- entra a revisão de guards em `web/app/shared/security.py`
- entra a matriz operacional em `/home/gabriel/Área de trabalho/Tarie 2/contracts/api/multiportal_rbac_action_matrix_v1.md`
- entra teste focal de fronteira entre superfícies em `web/tests/test_rbac_action_matrix.py`
- não entra política fina de acesso excepcional

### Passos

1. mapear endpoints críticos por superfície e papel permitido
2. alinhar o guard da `Mesa` com a singularidade entre `Revisor` e `Admin Geral`
3. registrar a matriz multiportal com leitura e escrita representativas
4. validar com suites focais e suites amplas dos portais afetados

### Critério de pronto

- `Admin Geral` deixa de acessar endpoints brutos da `Mesa`
- `Admin Cliente` continua consumindo recortes próprios de chat e mesa sem usar endpoints brutos
- a matriz de `RBAC` por ação fica publicada e referenciada no pacote multiportal
- `pytest` focal de `RBAC`, portais, cliente, admin e projeções verde

### `MP-005` — Matriz de tenant boundary

- `status`: concluído em `2026-03-30`; próximo passo direto é consolidar sessão, auth e trilha de auditoria

### Objetivo

- explicitar o isolamento de tenant por superfície crítica no sistema vivo
- provar em teste que `inspetor`, `mesa`, `admin-cliente` e `mobile` não atravessam tenant por acidente
- garantir que `admin-geral` só governa tenant por alvo explícito e não por herança do `empresa_id` administrativo

### Escopo

- entra a revisão do estado de sessão por portal em `web/app/shared/security_portal_state.py`
- entra a matriz operacional em `/home/gabriel/Área de trabalho/Tarie 2/contracts/api/multiportal_tenant_boundary_matrix_v1.md`
- entra a suíte focal em `web/tests/test_tenant_boundary_matrix.py`
- não entra política detalhada de auditoria nem correlação distribuída

### Passos

1. mapear as rotas críticas com tenant implícito e tenant explícito
2. fechar qualquer compatibilidade de sessão que misture portal administrativo com mesa
3. registrar a matriz multiportal com semântica de `404`, bootstrap e alvo explícito
4. validar com suites focais e suites amplas dos portais afetados

### Critério de pronto

- `inspetor web`, `mobile`, `mesa` e `admin-cliente` mantêm isolamento de tenant em teste
- `admin-geral` governa tenant por `empresa_id` explícito sem prender a plataforma ao próprio tenant do usuário
- a matriz de `tenant boundary` fica publicada e referenciada no pacote multiportal
- `pytest` focal de tenant, portais, cliente, admin e `RBAC` verde

### `MP-006` — Sessão, auth e trilha de auditoria

- `status`: concluído em `2026-03-30`; próximo passo direto é fechar a verdade única do laudo ativo no inspetor

### Objetivo

- consolidar o contrato de sessão por portal nas superfícies web
- impedir que logout de um portal derrube outro portal no mesmo browser por acidente
- persistir trilha durável mínima das ações críticas do `admin-geral` sobre tenant

### Escopo

- entra a unificação do `admin` no contrato `portal-aware` de sessão
- entra o logout seletivo do `admin-cliente`
- entra auditoria durável das mutações críticas do `admin-geral` em tenant
- entra a matriz operacional em `/home/gabriel/Área de trabalho/Tarie 2/contracts/api/multiportal_session_auth_audit_matrix_v1.md`
- não entra auditoria durável completa do `inspetor` nem do `Android`

### Passos

1. mapear auth mode, sessão e CSRF por superfície
2. remover atalho de sessão global bruta do `admin`
3. tornar seletivo o encerramento de sessão do `admin-cliente`
4. registrar auditoria durável do `admin-geral` nas ações críticas sobre tenant
5. validar com suites focais e suites amplas do legado

### Critério de pronto

- `admin` e `admin-cliente` conseguem coexistir no mesmo browser sem logout cruzado acidental
- `admin-geral` grava auditoria durável nas mutações críticas de tenant
- a matriz de sessão/auth/auditoria fica publicada e referenciada no pacote multiportal
- `pytest` focal de sessão, portais, cliente, admin e regressão ampla verde

### `MP-007` — Verdade única do laudo ativo no inspetor

- `status`: concluído em `2026-03-30`; próximo passo direto volta para fechar os contratos críticos multiportal e promover a `Fase 03`

### Objetivo

- explicitar quem manda no `laudo ativo` entre sessão, SSR, `?laudo=`, `?home=1`, sidebar e espelhos locais
- impedir que `URL` ou `localStorage` sequestrem o contexto técnico depois que o backend já materializou o estado principal

### Escopo

- entra um resolvedor backend único do contexto principal do inspetor
- entra helper único de limpeza do contexto do laudo ativo
- entra redução da autoridade contínua de `URL/localStorage` no boot do inspetor
- entra a matriz operacional em `/home/gabriel/Área de trabalho/Tarie 2/contracts/api/inspector_active_report_authority_v1.md`
- não entra revisão completa de `sidebar`, filtros, tabs ou layout do inspetor

### Passos

1. mapear como sessão, `?laudo=`, `?home=1` e storage competem hoje
2. consumir `?laudo=` no backend como ingresso explícito e refletir isso no SSR
3. centralizar a limpeza do contexto do laudo ativo
4. remover `URL/localStorage` da escolha autoritativa contínua no boot do inspetor
5. validar com `pytest` focal, regressão ampla de portais e `Playwright` específico

### Critério de pronto

- `?laudo=` válido promove o mesmo laudo para sessão e SSR no mesmo request
- `?home=1` só força landing visual e não limpa o laudo ativo por acidente
- `URL/localStorage` não sobrepõem o `laudo ativo` depois que o backend já materializou o estado
- a matriz de autoridade do `laudo ativo` fica publicada e referenciada no pacote multiportal
- `pytest` focal + regressão ampla de portais + `Playwright` específico ficam verdes

### `MP-008` — Bootstraps multiportal explícitos

- `status`: concluído em `2026-03-30`; próximo passo direto é fechar a fila especializada da mesa, `template publish` e as lacunas administrativas restantes do pacote multiportal

### Objetivo

- congelar os contratos mínimos de bootstrap/transporte que ainda estavam implícitos no inspetor, na mesa `SSR` e no Android
- reduzir a matriz multiportal às lacunas reais, sem confundir shell/boot com contrato acidental
- travar esses shapes com testes próprios no sistema vivo

### Escopo

- entra o bootstrap SSR do inspetor via `#tariel-boot`
- entra o front contract mínimo da mesa `SSR` via `#revisor-front-contract`
- entra o envelope legado de `login/bootstrap` do Android
- entra documentação canônica no workspace V2 e suíte focal no legado
- não entra fila especializada da mesa
- não entra `template publish`
- não entra fechamento dos contratos administrativos de billing/saúde operacional

### Passos

1. mapear os blocos mínimos de bootstrap por superfície
2. publicar os contratos canônicos e schemas aplicáveis no workspace V2
3. travar os shapes mínimos com `pytest` focal no sistema vivo
4. reduzir a matriz multiportal para exibir apenas as lacunas ainda abertas de verdade

### Critério de pronto

- `inspetor/chat web` tem contrato explícito para `meta csrf` e `#tariel-boot`
- `mesa avaliadora web` tem contrato explícito para shell `SSR` e `#revisor-front-contract`
- `Android mobile` tem envelope explícito para `login` e `bootstrap`
- a matriz multiportal deixa de listar bootstrap/sessão dessas superfícies como lacuna aberta
- `pytest` focal dos contratos + regressões correlatas ficam verdes

### `MP-009` — Template publish explícito da Mesa

- `status`: concluído em `2026-03-30`; próximo passo direto é congelar a projeção especializada de fila da mesa antes de atacar as lacunas administrativas restantes

### Objetivo

- tornar explícito o contrato de publicação de template da mesa
- garantir que a rota clássica e a rota do editor rico devolvam o mesmo envelope mínimo
- travar a geração de auditoria e a semântica de ativação no sistema vivo

### Escopo

- entra o par de rotas `POST /revisao/api/templates-laudo/{id}/publicar` e `POST /revisao/api/templates-laudo/editor/{id}/publicar`
- entra schema do envelope mínimo de resposta no workspace V2
- entra suíte focal de contrato no legado
- não entra preview, diff, lote, base recomendada nem fila da mesa

### Passos

1. ler o payload público atual das rotas de publicação
2. publicar contrato canônico único para as duas rotas
3. validar equivalência de envelope e efeitos mínimos em teste
4. reduzir a matriz multiportal para remover `template publish` da lista de lacunas

### Critério de pronto

- as duas rotas devolvem o mesmo envelope mínimo `{ok, template_id, status}`
- a publicação continua rebaixando ativos anteriores do mesmo código
- a ação continua gerando auditoria `template_publicado`
- a matriz multiportal deixa de listar `template publish` como lacuna aberta da mesa
- `pytest` focal do contrato + regressão ampla correlata ficam verdes

### `MP-010` — Projecao especializada de fila da Mesa

- `status`: concluido em `2026-03-30`; proximo passo direto e voltar a reduzir as lacunas contratuais de `inspetor`, `Android`, `admin-cliente` e `admin-geral`

### Objetivo

- congelar a linguagem da fila especializada da mesa fora do HTML do painel
- registrar a projecao canônica em `shadow mode` no `painel_revisor`
- permitir convergencia futura entre `SSR` e `frontend paralelo da Mesa` sem depender de estrutura incidental do template

### Escopo

- entra projecao canonica da fila da mesa em `web/app/v2/contracts/review_queue.py`
- entra adapter de comparacao em `web/app/v2/adapters/review_queue_dashboard.py`
- entra integracao em `shadow mode` no `web/app/domains/revisor/panel.py`
- entra schema e contrato no workspace V2
- nao entra mudanca do HTML publico
- nao entra troca da superficie oficial da mesa

### Passos

1. mapear o shape real das secoes, totais, filtros e resumo de templates do painel
2. publicar a projecao canônica especializada da fila
3. comparar a projecao com o contexto legado do painel em `request.state`
4. validar que o HTML publico nao muda quando a flag esta ligada

### Criterio de pronto

- a fila da mesa tem projecao canônica propria, separada do `reviewer_case_view`
- o `painel_revisor` registra o resultado da projecao em `shadow mode`
- a matriz multiportal deixa de listar a fila especializada como lacuna contratual da mesa
- `pytest` focal da fila + regressao ampla correlata ficam verdes

### `MP-011` — Visao documental propria do inspetor

- `status`: concluido em `2026-03-30`; proximo passo direto e voltar a reduzir as lacunas contratuais de `Android`, `admin-cliente` e `admin-geral`

### Objetivo

- congelar o recorte documental do `inspetor/chat web` fora do payload legado de status
- registrar uma projecao documental dedicada em `shadow mode`, derivada da `document_facade`
- fechar a lacuna contratual do inspetor sem transformar preview, policy ou facade interna em contrato acidental

### Escopo

- entra projecao canonica em `web/app/v2/contracts/inspector_document.py`
- entra integracao em `shadow mode` no `web/app/domains/chat/laudo_service.py`
- entra schema e contrato no workspace V2
- nao entra mudanca do JSON publico de `/app/api/laudo/status`
- nao entra rota nova de preview ou emissao

### Passos

1. mapear o recorte documental ja calculado pela `document_facade` no fluxo do inspetor
2. publicar a projecao documental dedicada para a superficie `inspetor/chat web`
3. registrar o resultado em `request.state` sem alterar o payload legado
4. reduzir a matriz multiportal para remover a lacuna documental do inspetor

### Criterio de pronto

- o inspetor tem projecao documental propria separada do `inspector_case_view`
- `obter_status_relatorio_resposta` registra essa projecao em `shadow mode`
- a matriz multiportal deixa de listar lacuna contratual critica para a superficie do inspetor
- `pytest` focal documental do inspetor + regressao ampla correlata ficam verdes

### `MP-012` — Sync offline observavel do Android

- `status`: concluido em `2026-03-30`; proximo passo direto e fechar a politica final do feedback da mesa no mobile antes de tentar promover a `Fase 03`

### Objetivo

- congelar a linguagem observavel da fila offline do Android fora de strings do modal
- compartilhar um snapshot unico entre agregados do app e diagnostico exportavel
- reduzir a lacuna contratual do Android sem acoplar o mobile a payload incidental do backend

### Escopo

- entra builder puro de snapshot em `android/src/features/offline/offlineSyncObservability.ts`
- entra consumo no diagnostico exportado em `android/src/features/settings/useSettingsOperationsActions.ts`
- entra alinhamento dos agregados de fila em `android/src/features/common/buildInspectorBaseDerivedStateSections.ts`
- entra contrato e schema no workspace V2
- nao entra troca do payload HTTP publico do backend
- nao entra decisao final da politica de feedback da mesa no mobile

### Passos

1. mapear a fila offline real do app e os helpers de retry/backoff ja vivos
2. publicar snapshot observavel unico com totais, blocker, atividade e itens
3. usar o snapshot no diagnostico local sem depender de texto de UI
4. reduzir a matriz multiportal para deixar aberta apenas a politica de feedback da mesa

### Criterio de pronto

- a fila offline do Android tem snapshot observavel proprio e testado
- o diagnostico exportado inclui estado, capacidade e atividade da fila offline
- a matriz multiportal deixa de listar `sync offline observavel` como lacuna do Android
- `jest` focal do mobile, `typecheck` e `make contract-check` ficam verdes

### `MP-013` — Politica final do feedback da Mesa no Android

- `status`: concluido em `2026-03-30`; proximo passo direto e fechar as lacunas contratuais administrativas remanescentes para tentar promover a `Fase 03`

### Objetivo

- congelar quanto feedback da mesa o Android pode ver sem transformar o app em cliente da superficie de revisao
- tornar a politica movel explicita em backend, contrato publico V2 e parser do app
- impedir leak de contador, ponteiro temporal ou corpo de mensagem quando o feedback da mesa estiver oculto

### Escopo

- entra contrato publico explicito em `web/app/v2/contracts/mobile.py`
- entra enforcement de visibilidade nos adapters moveis do backend
- entra parser e validacao de consistencia no app Android
- entra contrato operacional e schema alinhado no workspace V2
- nao entra colaboracao quase completa da mesa no mobile
- nao entra billing/admin nem promocao automatica da `Fase 03`

### Passos

1. transformar `android_feedback_sync_policy` em contrato explicito de leitura publica
2. filtrar mensagens, contadores e ponteiros da mesa quando a politica ficar em modo `hidden`
3. validar no parser do app que backend e politica permanecem coerentes
4. reduzir a matriz multiportal para remover a ultima lacuna contratual do Android nesta fase

### Criterio de pronto

- o contrato publico V2 do mobile expõe `feedback_policy` explicita
- `hidden` remove corpo de mensagem, contadores e ponteiros da mesa do payload movel
- `jest` focal do app e `pytest` focal do backend ficam verdes
- a matriz multiportal deixa de listar o Android como lacuna contratual critica da `Fase 03`

### `MP-014` — Matriz inicial de hotspots e ownership

- `status`: iniciado em `2026-03-30`; proximo passo direto e atacar `InspectorMobileApp.tsx` como primeiro hotspot estrutural da `Fase 04`

### Objetivo

- promover a `Fase 03` sem entrar na `Fase 04` de forma cega
- registrar quais arquivos grandes e sensiveis concentram risco real de acoplamento
- definir ownership alvo e primeiro corte recomendado antes de qualquer quebra estrutural

### Escopo

- entra inventario de hotspots confirmado por auditoria e tamanho real de arquivo
- entra doc operacional no workspace V2
- entra backlog minimo da `Fase 04`
- nao entra refatoracao estrutural ainda
- nao entra redesign de superficie

### Passos

1. cruzar hotspots confirmados pela auditoria com os arquivos vivos mais concentrados
2. publicar matriz com ownership alvo e primeiro corte por hotspot
3. promover a fase nos artefatos operacionais
4. apontar o primeiro hotspot a ser quebrado na sequencia automatica

### Criterio de pronto

- a `Fase 04` passa a ter um mapa inicial de hotspots com ownership claro
- backlog e plano mestre deixam explicito o primeiro alvo estrutural
- a sequencia automatica passa a seguir `InspectorMobileApp.tsx` antes dos demais hotspots

### `MP-015` — Primeiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair estado e efeitos transversais de runtime/configuracao do app raiz

### Objetivo

- iniciar a drenagem real do hotspot mais evidente do mobile sem mexer no comportamento publico
- tirar do app raiz o bloco de automacao do piloto que mistura diagnostico de historico, markers de probe e acks de render humano
- manter a baseline movel inteira verde depois da extracao

### Escopo

- entra novo controller em `android/src/features/common/usePilotAutomationController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o controller extraido
- nao entra redesign de tela
- nao entra troca de payload, bootstrap ou contrato publico

### Passos

1. extrair wrapper de selecao de historico com diagnostico para hook dedicado
2. mover markers/probe e acks de render humano para o mesmo controller
3. reconnectar o app raiz so com a interface do novo controller
4. validar com `jest` focal, `typecheck` e baseline movel completa

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar a logica de automacao do piloto
- o novo controller fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-016` — Segundo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair shell lateral, teclado e apresentacao transitoria do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem mudar a superficie publica
- tirar do app raiz o pacote de runtime/configuracao que ainda misturava observabilidade, crash reports, runtime de voz e aviso de IA
- manter a baseline movel completa verde apos o segundo corte

### Escopo

- entra novo controller em `android/src/features/common/useInspectorRuntimeController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para runtime/configuracao
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. extrair runtime instalado, politica de anexos e config de IA para hook dedicado
2. mover observabilidade, crash reports e runtime de voz para o mesmo controller
3. reconnectar o app raiz usando apenas a saida do novo hook
4. validar com `jest` focal e `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar runtime/configuracao transversal
- o novo controller fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-017` — Terceiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e consolidar o mapping massivo de `settingsState` e aliases/setters fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem tocar no comportamento publico
- tirar do app raiz o shell lateral, o ciclo de teclado e a apresentacao transitoria ligada a drawers e modais
- manter a baseline movel completa verde apos o terceiro corte

### Escopo

- entra novo controller em `android/src/features/common/useInspectorShellController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para shell/transitorio
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. extrair estado local de historico, drawers, preview, intro e teclado para hook dedicado
2. mover efeitos de reset transitorio de bloqueio/sessao e scroll condicionado pelo teclado
3. reconnectar o app raiz ao novo controller e manter `useSidePanelsController` encapsulado
4. validar com `jest` focal e `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar shell lateral, teclado e apresentacao transitoria
- o novo controller fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-018` — Quarto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildAuthenticatedLayoutInput` e `buildLoginScreenProps` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o mapping massivo de `settingsState`, aliases e setters acoplados
- manter a baseline movel completa verde apos o quarto corte

### Escopo

- entra novo binding em `android/src/features/settings/useInspectorSettingsBindings.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o binding de settings
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular o mapping de `settingsState` e `settingsActions` em binding dedicado por dominio
2. reconnectar o app raiz por destructuring do binding, preservando os nomes consumidos
3. validar setters acoplados de fala, notificacao e seguranca em teste focal
4. validar com `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar o mapping massivo de settings
- o novo binding fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-019` — Quinto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildInspectorSettingsDrawerInput` e `buildInspectorSessionModalsInput` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem pesada dos props de layout autenticado e da tela de login
- manter a baseline movel completa verde apos o quinto corte

### Escopo

- entra novo builder em `android/src/features/common/buildInspectorScreenProps.ts`
- entra export de tipo em `android/src/features/auth/buildLoginScreenProps.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o builder de props de tela
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de props do layout autenticado em builder puro que consome `inspectorBaseDerivedState` e `threadContextState`
2. encapsular a composicao de props da tela de login em builder puro compartilhado
3. reconnectar o app raiz por blocos `baseState`, `shellState`, `threadState`, `composerState` e `authState`
4. limpar destructuring residual para manter `lint` limpo
5. validar com `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline os props do layout autenticado e da tela de login
- o builder novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-020` — Sexto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildInspectorSettingsDrawerInput` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem inline dos `session modals` usando o estado derivado ja consolidado
- manter a baseline movel completa verde apos o sexto corte

### Escopo

- entra novo builder em `android/src/features/common/buildInspectorRootChromeProps.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o builder de `session modals`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao dos `session modals` em builder puro que consome `inspectorBaseDerivedState`
2. reconnectar o app raiz por blocos `activityAndLockState`, `attachmentState`, `offlineQueueState` e `settingsState`
3. limpar destructuring residual para manter `lint` limpo
4. validar com `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline os `session modals`
- o builder novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-021` — Setimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildSettingsSheetBodyRenderer` e `buildSettingsSheetConfirmAction` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem inline do `settings drawer`, fazendo o shell consumir `baseState` e grupos especificos de settings
- manter a baseline movel completa verde apos o setimo corte

### Escopo

- entra novo builder em `android/src/features/settings/buildInspectorRootSettingsDrawerProps.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o builder do `settings drawer`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao do `settings drawer` em builder puro que consome `inspectorBaseDerivedState`
2. reconnectar o app raiz por blocos `accountState`, `experienceState`, `navigationState`, `securityState` e `supportAndSystemState`
3. limpar destructuring residual para manter `lint` limpo
4. validar com `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o `settings drawer`
- o builder novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-022` — Oitavo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `buildSettingsConfirmAndExportActions` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem inline do trilho de `settings sheet`, incluindo `body renderer` e `confirm action`
- manter a baseline movel completa verde apos o oitavo corte

### Escopo

- entra novo builder em `android/src/features/settings/buildInspectorRootSettingsSheetProps.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o builder do `settings sheet`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `buildSettingsSheetBodyRenderer` e `buildSettingsSheetConfirmAction` em builder puro que consome `inspectorBaseDerivedState`
2. reconnectar o app raiz por blocos `accountState`, `actionsState`, `appState`, `backendState`, `baseState`, `draftState` e `settersState`
3. limpar destructuring residual para manter `lint` limpo
4. validar com `npm run quality:baseline`

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de `settings sheet`
- o builder novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-023` — Nono corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useSettingsToggleActions` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de `confirm/export` das configuracoes
- manter a baseline movel completa verde apos o nono corte

### Escopo

- entra novo builder em `android/src/features/settings/buildInspectorRootSettingsConfirmExportActions.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o builder do trilho de `confirm/export`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `buildSettingsConfirmAndExportActions` em builder puro com grupos explicitos de estado e callbacks
2. reconnectar o app raiz por blocos `accountState`, `actionState`, `collectionState`, `draftState`, `preferenceState` e `settersState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de `confirm/export`
- o builder novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-024` — Decimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useSettingsSecurityActions` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de `toggle` das configuracoes
- manter a baseline movel completa verde apos o decimo corte

### Escopo

- entra novo wrapper em `android/src/features/settings/useInspectorRootSettingsToggleActions.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de `toggle`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useSettingsToggleActions` em wrapper de root com grupos explicitos de estado e callbacks
2. reconnectar o app raiz por blocos `actionState`, `cacheState`, `permissionState`, `setterState` e `voiceState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de `toggle`
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-025` — Decimo primeiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useSettingsEntryActions` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de seguranca das configuracoes
- manter a baseline movel completa verde apos o decimo primeiro corte

### Escopo

- entra novo wrapper em `android/src/features/settings/useInspectorRootSettingsSecurityActions.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de seguranca
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useSettingsSecurityActions` em wrapper de root com grupos explicitos de conta, auth, colecoes, setters e callbacks
2. reconnectar o app raiz por blocos `accountState`, `actionState`, `authState`, `collectionState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de seguranca
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-026` — Decimo segundo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useSettingsReauthActions` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de entrada/navegacao das configuracoes
- manter a baseline movel completa verde apos o decimo segundo corte

### Escopo

- entra novo wrapper em `android/src/features/settings/useInspectorRootSettingsEntryActions.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de entrada
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useSettingsEntryActions` em wrapper de root com grupos explicitos de conta, callbacks e setters
2. reconnectar o app raiz por blocos `accountState`, `actionState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de entrada
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-027` — Decimo terceiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useSettingsOperationsActions` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de reautenticacao das configuracoes
- manter a baseline movel completa verde apos o decimo terceiro corte

### Escopo

- entra novo wrapper em `android/src/features/settings/useInspectorRootSettingsReauthActions.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de reautenticacao
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useSettingsReauthActions` em wrapper de root com grupos explicitos de callbacks, estado transitório e setters
2. reconnectar o app raiz por blocos `actionState`, `draftState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de reautenticacao
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-028` — Decimo quarto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useAttachmentController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho operacional de settings
- manter a baseline movel completa verde apos o decimo quarto corte

### Escopo

- entra novo wrapper em `android/src/features/settings/useInspectorRootSettingsOperationsActions.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho operacional
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useSettingsOperationsActions` em wrapper de root com grupos explicitos de callbacks, colecoes, identidade, permissoes, runtime e setters
2. reconnectar o app raiz por blocos `actionState`, `collectionState`, `identityState`, `permissionState`, `runtimeState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho operacional de settings
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-029` — Decimo quinto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useInspectorSession` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de anexos do chat
- manter a baseline movel completa verde apos o decimo quinto corte

### Escopo

- entra novo wrapper em `android/src/features/chat/useInspectorRootAttachmentController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de anexos
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useAttachmentController` em wrapper de root com grupos explicitos de acesso, politica, builders e setters
2. reconnectar o app raiz por blocos `accessState`, `policyState`, `builderState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de anexos
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-030` — Decimo sexto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useHistoryController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de sessao/bootstrap do inspetor
- manter a baseline movel completa verde apos o decimo sexto corte

### Escopo

- entra novo wrapper em `android/src/features/session/useInspectorRootSession.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de sessao
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useInspectorSession` em wrapper de root com grupos explicitos de bootstrap, setters e callbacks
2. reconnectar o app raiz por blocos `bootstrapState`, `setterState` e `callbackState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de sessao
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-031` — Decimo setimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useVoiceInputController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de historico
- manter a baseline movel completa verde apos o decimo setimo corte

### Escopo

- entra novo wrapper em `android/src/features/history/useInspectorRootHistoryController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de historico
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useHistoryController` em wrapper de root com grupos explicitos de estado, callbacks e setters
2. reconnectar o app raiz por blocos `state`, `actionState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de historico
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-032` — Decimo oitavo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useOfflineQueueController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de voz/ditado
- manter a baseline movel completa verde apos o decimo oitavo corte

### Escopo

- entra novo wrapper em `android/src/features/chat/useInspectorRootVoiceInputController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de voz
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useVoiceInputController` em wrapper de root com grupos explicitos de capacidade, vozes e callbacks
2. reconnectar o app raiz por blocos `capabilityState`, `voiceState` e `actionState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de voz
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-033` — Decimo nono corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useActivityCenterController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho de fila offline
- manter a baseline movel completa verde apos o decimo nono corte

### Escopo

- entra novo wrapper em `android/src/features/offline/useInspectorRootOfflineQueueController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do trilho de fila offline
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useOfflineQueueController` em wrapper de root com grupos explicitos de estado, callbacks e setters
2. reconnectar o app raiz por blocos `state`, `actionState` e `setterState`
3. validar com teste focal, `typecheck` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho de fila offline
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-034` — Vigesimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useMesaController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline da central de atividade
- manter a baseline movel completa verde apos o vigesimo corte

### Escopo

- entra novo wrapper em `android/src/features/activity/useInspectorRootActivityCenterController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper da central de atividade
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useActivityCenterController` em wrapper de root com grupos explicitos de estado, callbacks, setters e limites
2. reconnectar o app raiz por blocos `state`, `actionState`, `setterState` e `limitsState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline a central de atividade
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-035` — Vigesimo primeiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useInspectorChatController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do trilho da mesa
- manter a baseline movel completa verde apos o vigesimo primeiro corte

### Escopo

- entra novo wrapper em `android/src/features/mesa/useInspectorRootMesaController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper da mesa
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useMesaController` em wrapper de root com grupos explicitos de estado, refs, cache, callbacks e setters
2. reconnectar o app raiz por blocos `state`, `refState`, `cacheState`, `actionState` e `setterState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o trilho da mesa
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-036` — Vigesimo segundo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de `useAppLockController` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do controller principal do chat
- manter a baseline movel completa verde apos o vigesimo segundo corte

### Escopo

- entra novo wrapper em `android/src/features/chat/useInspectorRootChatController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper do chat
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useInspectorChatController` em wrapper de root com grupos explicitos de sessao, conversa, mesa, setters e callbacks de dominio
2. reconnectar o app raiz por blocos `sessionState`, `conversationState`, `mesaState`, `setterState` e `actionState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o controller principal do chat
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-037` — Vigesimo terceiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildInspectorBaseDerivedStateInput` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline do controller de bloqueio do app
- manter a baseline movel completa verde apos o vigesimo terceiro corte

### Escopo

- entra novo wrapper em `android/src/features/security/useInspectorRootAppLockController.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o wrapper de app lock
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a composicao de `useAppLockController` em wrapper de root com grupos explicitos de sessao, permissoes, setters e callbacks de seguranca
2. reconnectar o app raiz por blocos `sessionState`, `permissionState`, `setterState` e `actionState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o controller de bloqueio do app
- o wrapper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-038` — Vigesimo quarto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildInspectorAuthenticatedLayoutScreenProps` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem inline do input base do estado derivado compartilhado
- manter a baseline movel completa verde apos o vigesimo quarto corte

### Escopo

- entra novo helper em `android/src/features/common/buildInspectorRootBaseDerivedStateInput.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o helper root do estado derivado
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a montagem de `buildInspectorBaseDerivedStateInput` em helper root com grupos explicitos de shell, chat, historico/offline, configuracoes e helpers
2. reconnectar o app raiz por blocos `shellState`, `chatState`, `historyAndOfflineState`, `settingsState` e `helperState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o input base do estado derivado
- o helper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-039` — Vigesimo quinto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a montagem de `buildInspectorLoginScreenProps` para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem inline dos props do branch autenticado
- manter a baseline movel completa verde apos o vigesimo quinto corte

### Escopo

- entra novo helper em `android/src/features/common/buildInspectorRootScreenProps.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o helper root de props do layout autenticado
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a montagem de `buildInspectorAuthenticatedLayoutScreenProps` em helper root
2. reconnectar o app raiz preservando os grupos `baseState`, `composerState`, `historyState`, `sessionState`, `shellState`, `speechState`, `threadContextState` e `threadState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline os props do branch autenticado
- o helper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-040` — Vigesimo sexto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair o branch autenticado para um shell dedicado fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a montagem inline dos props do branch de login
- manter a baseline movel completa verde apos o vigesimo sexto corte

### Escopo

- reaproveita `android/src/features/common/buildInspectorRootScreenProps.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o helper root de props do login
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular a montagem de `buildInspectorLoginScreenProps` em helper root
2. reconnectar o app raiz preservando os grupos `authActions`, `authState`, `baseState` e `presentationState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline os props do branch de login
- o helper novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-041` — Vigesimo setimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair o branch de login para um shell dedicado fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o branch autenticado final com o probe de automacao e o layout do inspetor
- manter a baseline movel completa verde apos o vigesimo setimo corte

### Escopo

- entra novo componente em `android/src/features/common/InspectorAuthenticatedShell.tsx`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o shell autenticado
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular o branch autenticado em componente dedicado com `authenticatedLayoutProps`, probe de automacao e `InspectorAuthenticatedLayout`
2. reconnectar o app raiz preservando os helpers root de props ja extraidos
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de renderizar inline o branch autenticado
- o shell novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-042` — Vigesimo oitavo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair o bloco local de efeitos de persistencia/privacidade/retenção para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o branch de login final
- manter a baseline movel completa verde apos o vigesimo oitavo corte

### Escopo

- entra novo componente em `android/src/features/auth/InspectorLoginShell.tsx`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o shell de login
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular o branch de login em componente dedicado com `loginScreenProps` ja montados
2. reconnectar o app raiz preservando o helper root de props do login ja extraido
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de renderizar inline o branch de login
- o shell novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-043` — Vigesimo nono corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e mover os helpers locais de persistencia/retenção para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o bloco local de efeitos de persistencia, privacidade, retenção e sincronizacao critica
- manter a baseline movel completa verde apos o vigesimo nono corte

### Escopo

- entra novo hook em `android/src/features/common/useInspectorRootPersistenceEffects.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova para o hook root de persistencia
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. encapsular os efeitos locais de sincronizacao critica, salvamento local, retencao e reautenticacao em hook root
2. reconnectar o app raiz por blocos `sessionState`, `settingsState`, `dataState`, `actionState` e `setterState`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de montar inline o bloco local de efeitos criticos
- o hook novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-044` — Trigesimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a logica pura de conversa/chat para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz os helpers locais de persistencia, privacidade e retencao ainda usados por bootstrap e efeitos root
- manter a baseline movel completa verde apos o trigesimo corte

### Escopo

- entra novo modulo em `android/src/features/common/inspectorLocalPersistence.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/common/inspectorLocalPersistence.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover leitura, escrita e limpeza do estado local de cache, fila offline, notificacoes e historico para utilitario dedicado
2. reconnectar o app raiz no bootstrap de sessao usando closures explicitas para os normalizadores injetados
3. validar com testes focais, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar os helpers locais de persistencia/retenção
- o modulo novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-045` — Trigesimo primeiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair os helpers puros de fila offline e notificacoes do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a logica pura de conversa/chat que ainda servia de cola para sessao, historico, anexos e envio
- manter a baseline movel completa verde apos o trigesimo primeiro corte

### Escopo

- entra novo modulo em `android/src/features/chat/conversationHelpers.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/chat/conversationHelpers.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover chaves de rascunho, normalizacao de modo, normalizacao de conversa, composicao de historico e helpers de anexo para utilitario dedicado
2. reconnectar o app raiz e os wrappers root consumindo o modulo novo
3. validar com testes focais, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar a logica pura de conversa/chat
- o modulo novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-046` — Trigesimo segundo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair o agrupamento cronologico do historico para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o pacote puro de fila offline, preview de mensagem e notificacoes de atividade
- manter a baseline movel completa verde apos o trigesimo segundo corte

### Escopo

- entram novos modulos em `android/src/features/common/messagePreviewHelpers.ts`, `android/src/features/offline/offlineQueueHelpers.ts` e `android/src/features/activity/activityNotificationHelpers.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entram coberturas focais novas para os tres modulos
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover preview resumido de referencias, status/backoff/prioridade da fila offline e criacao de notificacoes para modulos puros dedicados
2. reconnectar o app raiz preservando as mesmas interfaces ja consumidas por wrappers root, `derived state` e modais
3. validar com testes focais, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar o pacote puro de fila offline e notificacoes
- os modulos novos ficam cobertos por testes focais
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-047` — Trigesimo terceiro corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair os helpers puros de anexo/arquivo e suporte/export do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o agrupamento cronologico do historico, a aplicacao de preferencias de laudos e o filtro de chips de contexto
- manter a baseline movel completa verde apos o trigesimo terceiro corte

### Escopo

- entra novo modulo em `android/src/features/history/historyHelpers.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/history/historyHelpers.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover a logica de seccionamento cronologico e preferencias do historico para helper puro dedicado
2. reconnectar o app raiz e o estado derivado usando o modulo novo
3. validar com testes focais, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar a logica de historico e agrupamento
- o modulo novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-048` — Trigesimo quarto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e drenar o bloco local de `useState` para hook root dedicado

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz os helpers puros de anexo/arquivo, suporte/export e utilitarios de apresentacao que ainda restavam inline
- manter a baseline movel completa verde apos o trigesimo quarto corte

### Escopo

- entram novos modulos em `android/src/features/chat/attachmentFileHelpers.ts` e `android/src/features/common/appSupportHelpers.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entram coberturas focais novas para os dois modulos
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover identidade de anexo, montagem de anexos, exportacao, suporte, timeout e utilitarios de apresentacao para modulos dedicados
2. reconnectar o app raiz preservando as mesmas interfaces consumidas por wrappers root e operacoes de settings
3. validar com testes focais, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar os helpers puros de anexo/arquivo e suporte/export
- os modulos novos ficam cobertos por testes focais
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-049` — Trigesimo quinto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair wiring local de refs, callbacks e bridges de composicao do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o bloco de estado local/transiente que ainda ocupava uma parte grande do componente
- manter a baseline movel completa verde apos o trigesimo quinto corte

### Escopo

- entra novo hook em `android/src/features/common/useInspectorRootLocalState.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/common/useInspectorRootLocalState.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover o bloco de `useState` do root para hook dedicado com defaults explicitos
2. reconnectar o app raiz preservando os mesmos nomes publicos de estado e setters
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar o bloco local de estado transiente
- o hook novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-050` — Trigesimo sexto corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e consolidar o suporte de settings para tirar `presentation/navigation/security event log` do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz o pacote local de refs, callbacks imperativos e bridges de composicao usados por historico, voz, refresh e integrações do shell
- manter a baseline movel completa verde apos o trigesimo sexto corte

### Escopo

- entra novo hook em `android/src/features/common/useInspectorRootRefsAndBridges.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/common/useInspectorRootRefsAndBridges.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover refs imperativos e bridges de callback para hook root dedicado
2. reconnectar historico, voice input, refresh e shell usando o hook novo
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar refs e bridges imperativos locais
- o hook novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-051` — Trigesimo setimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de sessao/bootstrap/reset para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline de `useSettingsPresentation`, `useSettingsNavigation` e `useSecurityEventLog`
- manter a baseline movel completa verde apos o trigesimo setimo corte

### Escopo

- entra novo hook em `android/src/features/settings/useInspectorRootSettingsSupportState.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/settings/useInspectorRootSettingsSupportState.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. agregar presentation, navigation e security event log de settings em hook root unico
2. reconnectar o app raiz preservando os mesmos grupos de estado, setters e callbacks
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar a composicao inline de suporte de settings
- o hook novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-052` — Trigesimo oitavo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao de shell/reset lateral e acesso externo para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a composicao inline de sessao, bootstrap local e reset pos-logout
- manter a baseline movel completa verde apos o trigesimo oitavo corte

### Escopo

- entra novo hook em `android/src/features/session/useInspectorRootSessionFlow.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- entra cobertura focal nova em `android/src/features/session/useInspectorRootSessionFlow.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. agregar bootstrap readers locais, merge de bootstrap cache e reset pos-logout em hook root unico de sessao
2. reconnectar o app raiz preservando o mesmo contrato de `useInspectorRootSession`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar a composicao inline de sessao/bootstrap/reset
- o hook novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-053` — Trigesimo nono corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e extrair a composicao final de tela raiz (`authenticatedState`, `loginState`, `sessionModalsState` e `threadContextInput`) para fora do app raiz

### Objetivo

- continuar a drenagem do hotspot principal do mobile sem alterar comportamento publico
- tirar do app raiz a costura transversal entre shell root, acesso externo e a superficie inteira de settings
- manter a baseline movel completa verde apos o trigesimo nono corte

### Escopo

- entra novo hook em `android/src/features/settings/useInspectorRootSettingsSurface.ts`
- entra novo teste focal em `android/src/features/settings/useInspectorRootSettingsSurface.test.ts`
- entra ajuste de composicao em `android/src/features/InspectorMobileApp.tsx`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. agregar `useInspectorRootSettingsEntryActions`, `useInspectorRootSettingsSecurityActions`, `useInspectorRootSettingsOperationsActions` e `useInspectorRootSettingsUi` em uma superficie root unica de settings
2. reconnectar o app raiz usando `useInspectorRootSettingsSurface` e remover do componente os handlers intermediarios de `entry`, `security` e `operations`
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. fixar o proximo corte estrutural do hotspot sem ambiguidade

### Criterio de pronto

- `InspectorMobileApp.tsx` deixa de concentrar a costura transversal de settings e o wiring residual de shell/acesso externo ja fica fora do componente
- o hook novo fica coberto por teste focal
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural do hotspot fica identificado sem ambiguidade

### `MP-054` — Quadragesimo corte estrutural de `InspectorMobileApp.tsx`

- `status`: concluido em `2026-03-30`; proximo passo direto e quebrar `useInspectorRootApp.ts` por trilhos de sessao, shell, controladores, estado derivado e composicao final

### Objetivo

- concluir a drenagem do componente raiz do mobile sem alterar comportamento publico
- mover o corpo restante do componente para um hook root dedicado
- deixar `InspectorMobileApp.tsx` como orquestrador fino entre shell autenticado e shell de login

### Escopo

- entra novo hook em `android/src/features/useInspectorRootApp.ts`
- entra novo teste focal em `android/src/features/InspectorMobileApp.test.tsx`
- entra ajuste final de composicao em `android/src/features/InspectorMobileApp.tsx`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover o corpo restante do componente para `useInspectorRootApp`
2. reduzir `InspectorMobileApp.tsx` a um branch minimo entre shells autenticado/login
3. validar com teste focal, `typecheck`, `lint` e `npm run quality:baseline`
4. apontar o novo hotspot real apos a drenagem do componente

### Criterio de pronto

- `InspectorMobileApp.tsx` fica reduzido a orquestrador fino
- o wiring restante do root sai fisicamente do componente
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo hotspot fica explicitado sem ambiguidade

### `MP-055` — Quebra de `useInspectorRootApp.ts` em trilhos tematicos

- `status`: concluido em `2026-03-30`; proximo passo direto e quebrar `useInspectorRootPresentation.ts` por estado derivado, input de settings surface e composicao final de tela

### Objetivo

- deixar `useInspectorRootApp.ts` como orquestrador fino do root mobile
- retirar do hook raiz o bootstrap de sessao/settings, os controladores operacionais e a composicao final de tela
- explicitar o novo hotspot real apos a drenagem do hook root

### Escopo

- entra novo hook em `android/src/features/useInspectorRootBootstrap.ts`
- entra novo hook em `android/src/features/useInspectorRootControllers.ts`
- entra novo hook em `android/src/features/useInspectorRootPresentation.ts`
- entra ajuste final de composicao em `android/src/features/useInspectorRootApp.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. mover o bootstrap local de sessao/settings/shell para `useInspectorRootBootstrap`
2. mover os controladores, efeitos persistentes e estado operacional para `useInspectorRootControllers`
3. mover estado derivado, settings surface e composicao final de tela para `useInspectorRootPresentation`
4. reduzir `useInspectorRootApp.ts` a wiring minimo entre os tres trilhos e registrar o novo hotspot

### Criterio de pronto

- `useInspectorRootApp.ts` fica reduzido a orquestrador fino
- o hotspot residual deixa de ser o hook root e passa a estar explicito nos novos modulos grandes
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo corte estrutural fica identificado sem ambiguidade

### `MP-056` — Drenagem final do root móvel para builders e trilhos dedicados

- `status`: concluido em `2026-03-30`; proximo passo direto e atacar `web/app/domains/chat/mesa.py` como hotspot principal da `Fase 04`

### Objetivo

- remover a concentracao residual que ainda ficou em `useInspectorRootPresentation.ts` e `useInspectorRootControllers.ts`
- distribuir o root móvel em builders puros de tela/settings e trilhos operacionais dedicados
- retirar o Android root da frente crítica de hotspots da fase

### Escopo

- entram `buildInspectorRootDerivedState.ts` e `buildInspectorRootFinalScreenState.ts`
- entram `useInspectorRootConversationControllers.ts`, `useInspectorRootOperationalControllers.ts` e `useInspectorRootSecurityAndPersistence.ts`
- entra a familia `android/src/features/settings/buildInspectorRootSettings*State.ts`
- entram testes focais em `useInspectorRootPresentation.test.ts` e `useInspectorRootControllers.test.ts`
- nao entra redesign de tela
- nao entra alteracao de contrato publico

### Passos

1. separar o estado derivado e o wiring final de tela de `useInspectorRootPresentation.ts`
2. quebrar `useInspectorRootSettingsSurfaceUiState` em blocos menores por responsabilidade
3. quebrar `useInspectorRootControllers.ts` em trilhos de conversa, operacao e seguranca/persistencia
4. validar a baseline movel completa e reposicionar o hotspot ativo da fase para o backend web

### Criterio de pronto

- `useInspectorRootPresentation.ts` e `useInspectorRootControllers.ts` ficam como wrappers finos
- nenhum modulo residual do root móvel fica acima de `300` linhas
- `npm run quality:baseline` fecha verde apos a extracao
- o proximo hotspot da fase fica explicitado sem ambiguidade

### Resultado

- `InspectorMobileApp.tsx` manteve `29` linhas; `useInspectorRootApp.ts` ficou com `26`
- `useInspectorRootPresentation.ts` caiu para `37` linhas e `useInspectorRootControllers.ts` caiu para `29`
- os maiores modulos residuais do root móvel passaram a `289`, `274`, `252` e `228` linhas
- a baseline movel fechou verde com `86` suites e `223` testes

### `MP-057` — Drenagem estrutural de `mesa.py`

- `status`: concluido em `2026-03-30`; proximo passo direto e atacar `web/app/domains/chat/chat_stream_routes.py`

### Objetivo

- retirar de `mesa.py` o acoplamento entre thread, feed mobile, contrato publico V2 e mutacoes do canal
- manter a superficie publica estavel para `router.py`, `mobile_probe.py` e testes existentes
- deixar `mesa.py` apenas como shell de roteamento e export

### Escopo

- entram `mesa_common.py`, `mesa_thread_routes.py`, `mesa_feed_routes.py` e `mesa_message_routes.py`
- entra a reducao de `mesa.py` para shell com aliases/export publicos estaveis
- entram validacoes de contrato Android, sync móvel e rotas criticas
- nao entra redesign de payload
- nao entra troca de contrato publico

### Passos

1. mapear imports externos e manter os simbolos publicos de `mesa.py`
2. mover helpers compartilhados e fatias de rota para modulos dedicados
3. reduzir `mesa.py` a shell de `APIRouter` e `add_api_route`
4. validar sintaxe, contratos Android, sync móvel e rotas criticas
5. reposicionar o hotspot ativo da fase para `chat_stream_routes.py`

### Criterio de pronto

- `mesa.py` fica como shell fino e estavel
- feed/thread/mensagem/anexo da mesa ficam em modulos separados por responsabilidade
- contratos Android e rotas criticas fecham verdes sem regressao
- o proximo hotspot da fase fica explicito sem ambiguidade

### Resultado

- `mesa.py` caiu de `1504` para `117` linhas
- o canal foi distribuido em `mesa_common.py`, `mesa_thread_routes.py`, `mesa_feed_routes.py` e `mesa_message_routes.py`
- `python3 -m compileall` fechou verde para os modulos novos
- `pytest -q tests/test_v2_android_case_feed_adapter.py tests/test_v2_android_case_thread_adapter.py tests/test_v2_android_public_contract.py` fechou com `12 passed`
- `pytest -q tests/test_portais_acesso_critico.py tests/test_regras_rotas_criticas.py` fechou com `136 passed`
- `pytest -q tests/test_mesa_mobile_sync.py tests/test_v2_android_request_trace_gap.py tests/test_v2_android_rollout_metrics.py tests/test_v2_android_rollout.py tests/test_smoke.py` fechou com `39 passed`

### `MP-058` — Drenagem estrutural de `chat_stream_routes.py`

- `status`: concluido em `2026-03-30`; proximo passo direto e atacar `web/app/domains/cliente/dashboard_bootstrap.py`

### Objetivo

- retirar de `chat_stream_routes.py` a mistura entre preparacao de entrada, persistencia da mensagem inicial e transporte SSE
- preservar a superficie publica da rota e os pontos de monkeypatch dos testes do hard gate documental
- deixar `chat_stream_routes.py` apenas como shell de orquestracao

### Escopo

- entram `chat_stream_support.py` e `chat_stream_transport.py`
- entra a reducao de `chat_stream_routes.py` para shell fino
- entram validacoes de hard gate documental, rotas criticas e smoke do chat
- nao entra redesign de payload
- nao entra troca de contrato publico

### Passos

1. mapear os blocos de entrada/comando/laudo, persistencia inicial e transporte SSE
2. mover preparacao e persistencia inicial para modulo dedicado
3. mover whisper SSE e stream da IA para modulo dedicado
4. manter `rota_chat` no shell para preservar compatibilidade de monkeypatch
5. validar rotas e smokes do fluxo de chat

### Criterio de pronto

- `chat_stream_routes.py` fica como shell fino
- o transporte SSE fica isolado do preparo/persistencia do fluxo
- testes do hard gate documental e do chat seguem verdes
- o proximo hotspot fica explicito sem ambiguidade

### Resultado

- `chat_stream_routes.py` caiu de `479` para `97` linhas
- a preparacao/persistencia inicial foi movida para `chat_stream_support.py`
- o transporte SSE do whisper e da IA foi movido para `chat_stream_transport.py`
- `python3 -m compileall` fechou verde para os modulos novos
- `pytest -q tests/test_v2_document_hard_gate_10f.py tests/test_v2_document_hard_gate_10g.py` fechou com `5 passed`
- `pytest -q tests/test_regras_rotas_criticas.py tests/test_smoke.py` fechou com `149 passed`

### `MP-059` — Drenagem estrutural de `dashboard_bootstrap.py`

- `status`: concluido em `2026-03-30`; proximo passo direto e atacar `web/app/domains/revisor/panel.py`

### Objetivo

- retirar de `dashboard_bootstrap.py` a mistura entre serializacao publica, bootstrap legado e shadow canônico do admin-cliente
- preservar a superficie publica importada por `dashboard.py` e pelos testes do tenant admin
- deixar `dashboard_bootstrap.py` apenas como shell de composicao

### Escopo

- entram `dashboard_bootstrap_support.py` e `dashboard_bootstrap_shadow.py`
- entra a reducao de `dashboard_bootstrap.py` para shell fino
- entram validacoes do bootstrap do tenant admin, boundary do portal cliente e smoke do portal
- nao entra redesign do portal
- nao entra troca de contrato publico

### Passos

1. mover serializacao publica e listagens para modulo de suporte
2. mover o shadow canônico do tenant admin para modulo dedicado
3. reduzir `dashboard_bootstrap.py` a composicao do payload legado e do hook shadow
4. validar projeção, guards do portal cliente e smoke
5. reposicionar o hotspot ativo da fase para `panel.py`

### Criterio de pronto

- `dashboard_bootstrap.py` fica como shell fino
- leitura gerencial publica e shadow canônico ficam explicitamente separados
- os testes administrativos seguem verdes sem regressao
- o proximo hotspot da fase fica explicito sem ambiguidade

### Resultado

- `dashboard_bootstrap.py` caiu de `285` para `80` linhas
- a serializacao publica foi movida para `dashboard_bootstrap_support.py`
- o shadow canônico foi movido para `dashboard_bootstrap_shadow.py`
- `python3 -m compileall` fechou verde para os modulos novos
- `pytest -q tests/test_v2_tenant_admin_projection.py tests/test_cliente_portal_critico.py tests/test_portais_acesso_critico.py tests/test_tenant_boundary_matrix.py tests/test_rbac_action_matrix.py` fechou com `30 passed`
- `pytest -q tests/test_smoke.py` fechou com `26 passed`

### `MP-060` — Drenagem estrutural de `panel.py`

- `status`: concluido em `2026-03-30`; fechamento da `Fase 04`

### Objetivo

- retirar de `panel.py` a mistura entre filtros, queries, serializacao de fila, totais operacionais e render SSR
- preservar a rota `painel_revisor` e o monkeypatch de `templates` usado pelos testes
- deixar `panel.py` apenas como shell SSR fino da fila da mesa

### Escopo

- entram `panel_state.py` e `panel_shadow.py`
- entra a reducao de `panel.py` para shell fino
- entram validacoes da projeção da fila, boot do painel, contratos SSR e smoke amplo
- nao entra redesign do painel
- nao entra troca de contrato publico

### Passos

1. mover filtros, queries e serializacao de fila para modulo dedicado de estado
2. mover o shadow canônico da fila para modulo dedicado
3. reduzir `panel.py` a orquestracao do estado + render `TemplateResponse`
4. validar projeção, boot do painel, guards e smoke
5. promover a `Fase 04` se os gates globais continuarem verdes

### Criterio de pronto

- `panel.py` fica como shell fino
- fila, resumo e estado de tela deixam de ficar misturados na rota SSR
- os testes focais e amplos da mesa/revisor seguem verdes
- `make verify` e `make contract-check` voltam a fechar verdes

### Resultado

- `panel.py` caiu de `525` para `49` linhas
- o estado SSR da fila foi movido para `panel_state.py`
- o shadow canônico foi movido para `panel_shadow.py`
- `pytest -q tests/test_v2_review_queue_projection.py tests/test_reviewer_panel_boot_hotfix.py tests/test_multiportal_bootstrap_contracts.py tests/test_portais_acesso_critico.py tests/test_regras_rotas_criticas.py tests/test_smoke.py` fechou com `168 passed`
- `make contract-check` fechou com `16 passed`
- `make verify` voltou a fechar verde apos a formatacao do mobile e os cortes finais da fase

### `MP-061` — Promoção da `Fase 04`

- `status`: concluido em `2026-03-30`; frente atual passa a ser `Fase 05 - Inspetor web`

### Objetivo

- confirmar que os hotspots priorizados da arquitetura foram drenados sem regressao
- recolocar `make verify` e `make contract-check` como gates finais da promoção
- encerrar a fase com ownership claro e shells estáveis

### Resultado

- `mesa.py`, `chat_stream_routes.py`, `dashboard_bootstrap.py` e `panel.py` ficaram como shells finos
- o root móvel deixou de ser hotspot crítico e ficou em regime de guardrail
- `make verify` e `make contract-check` fecharam verdes em `2026-03-30`
- a frente principal passa a ser `Fase 05 - Inspetor web`

### `MP-062` — Fechamento da `Fase 05 - Inspetor web`

- `status`: concluido em `2026-03-30`; frente atual passa a ser `Fase 06 - Mesa`

### Objetivo

- fechar o trilho ponta a ponta do inspetor web antes de mover a frente principal para a Mesa
- validar envio do chat, envio da mesa no inspetor, anexos/preview, loading/fallback/retry, `SSE`/reconexao e coerencia entre `home`, sidebar, query param e sessao
- promover a fase apenas com os gates canonicos locais novamente verdes

### Escopo

- entram ajustes em `chat_index_page.js`, templates do workspace e `CSS` pontual do composer
- entram suites focais do inspetor e `Playwright` representativo
- entram `make verify` e `make contract-check` como gates finais
- nao entra redesign da interface do inspetor
- nao entra contrato novo multissuperficie

### Passos

1. corrigir preview e limpeza de anexo no composer tecnico
2. corrigir a autoridade do contexto com `?laudo=`/API e a resincronizacao de tela/SSE
3. eliminar a duplicidade do affordance `home` no header do workspace
4. validar com suites focais do inspetor, subset `Playwright` e gates completos do repositorio
5. promover a fase se os gates continuarem verdes

### Criterio de pronto

- o inspetor fecha os fluxos criticos de envio, mesa, anexo, `home`, sidebar, query param, sessao e `SSE` sem regressao conhecida
- o subset `Playwright` representativo do inspetor fica verde
- `make verify` e `make contract-check` ficam verdes
- a proxima fase fica explicita sem ambiguidade

### Resultado

- `preview-anexo` foi movido para dentro do composer tecnico em `web/templates/inspetor/_workspace.html`, eliminando o conflito de geometria com o header fixo
- o botao de remocao do preview foi reposicionado em `web/static/css/chat/chat_base.css`, preservando clique e visibilidade do chip de anexo
- `web/static/js/chat/chat_index_page.js` passou a tratar `?laudo=` e contexto vindo da API como autoridade suficiente para promover a superficie de inspecao, alem de resincronizar `screen`/`SSE` automaticamente apos snapshot valido
- a duplicidade de `.btn-home-cabecalho` foi eliminada em `web/templates/inspetor/workspace/_workspace_header.html`, preservando a semantica `data-action="go-home"` sem ambiguidade no DOM
- `pytest -q tests/test_inspector_active_report_authority.py tests/test_app_boot_query_reduction.py tests/test_chat_notifications.py tests/test_chat_runtime_support.py` fechou com `11 passed`
- `pytest -q tests/test_regras_rotas_criticas.py -k 'home_app_nao_desloga_inspetor or home_desativa_contexto_sem_excluir_laudo or home_nao_exibe_rascunho_sem_interacao_na_sidebar'` fechou com `3 passed`
- `RUN_E2E=1 pytest -q tests/e2e/test_portais_playwright.py -k 'home_com_laudo_ativo_retorna_para_tela_inicial_sem_deslogar or historico_pin_unpin_e_excluir_laudo'` fechou com `2 passed`
- `make contract-check` fechou com `16 passed`
- `make verify` voltou a fechar verde em `2026-03-30`
- a frente principal passa a ser `Fase 06 - Mesa`

## Template

### Objetivo

- o que precisa ficar resolvido

### Escopo

- o que entra
- o que não entra

### Passos

1. diagnóstico
2. implementação
3. validação
4. documentação

### Critério de pronto

- quais comandos precisam passar
- quais comportamentos precisam ser validados
- qual documento precisa ser atualizado

### `PKT-HOTSPOTS-BASELINE-02` — Continuidade de drenagem dos hotspots web/admin

- `status`: em andamento em `2026-04-21`

### Objetivo

- continuar drenando os dois hotspots principais sem alterar comportamento funcional nem romper o bootstrap atual

### Escopo

- entra extração de slices coesos do histórico do inspetor
- entra extração de serviços de governança review/release do admin
- não entra redesign do workspace
- não entra mudança de contrato de catálogo, tenant ou runtime

### Passos

1. extrair builders do histórico do workspace para módulo próprio com fachada compatível
2. extrair merge/resumo de governança review/release para módulo admin dedicado
3. validar com `node --check`, `py_compile`, `pytest` específico e smoke
4. registrar checkpoint no loop operacional e seguir para o próximo corte pesado

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso sem regressão de bootstrap
- `admin/services.py` perde mais um bloco de governança sem quebrar testes
- `tests/test_smoke.py` e o subset do admin continuam verdes

### `PKT-HOTSPOTS-BASELINE-03` — Composer do inspetor e rollup do catálogo

- `status`: em andamento em `2026-04-21`

### Objetivo

- continuar a drenagem dos hotspots por blocos de interface e governança que já tenham fronteira clara

### Escopo

- entra extração do fluxo do composer do workspace para módulo próprio
- entra extração do rollup de governança de catálogo ativo para serviço dedicado
- não entra mudança visual do composer
- não entra mudança de contrato em payload de catálogo

### Passos

1. extrair slash commands, sugestões e reemissão do composer para módulo do inspetor
2. extrair resolução e agregação do rollup de governança para serviço admin dedicado
3. validar com smoke, subset admin, sintaxe e lint
4. reexecutar `make verify` para fechar o pacote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco operacional relevante do workspace
- `admin/services.py` perde o rollup de governança sem regressão no smoke/admin
- `make verify` continua verde após o lote

### `PKT-HOTSPOTS-BASELINE-04` — Histórico/contexto do workspace e leitura do catálogo

- `status`: em andamento em `2026-04-21`

### Objetivo

- seguir reduzindo os hotspots restantes com foco em leitura e apresentação, sem mexer em contratos centrais

### Escopo

- entra extração da renderização do histórico e do contexto IA do workspace
- entra extração da leitura principal do catálogo admin
- não entra redesign visual do histórico
- não entra mudança de schema ou bootstrap funcional do catálogo

### Passos

1. extrair render do histórico e contexto fixado/IA para módulo do inspetor
2. extrair resumo e detalhe de leitura do catálogo para serviço admin dedicado
3. validar com smoke, subset admin, lint e sintaxe
4. fechar com `make verify` e registrar o checkpoint

### Critério de pronto

- `chat_index_page.js` perde mais um bloco grande de render/contexto do workspace
- `admin/services.py` perde a leitura principal do catálogo sem regressão funcional
- `make verify` segue verde

### `PKT-HOTSPOTS-BASELINE-05` — Mesa do workspace e gestão tenant do catálogo

- `status`: em andamento em `2026-04-22`

### Objetivo

- seguir drenando o restante dos hotspots por blocos operacionais de UI e gestão de catálogo tenant

### Escopo

- entra extração do status/card da mesa no workspace
- entra extração da gestão tenant do catálogo, releases e signatários
- não entra mudança funcional de governança
- não entra redesign da UI da mesa

### Passos

1. extrair status operacional da IA/mesa e card da mesa para módulo do inspetor
2. extrair releases, signatários e portfolio tenant para serviço admin dedicado
3. validar com smoke, subset admin, lint e sintaxe
4. fechar com `make verify` e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco operacional do workspace
- `admin/services.py` perde mais uma fatia de gestão tenant/catálogo
- `make verify` continua verde

### `PKT-HOTSPOTS-BASELINE-06` — Sidebar do workspace e apresentação admin

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega a sincronização/filtragem da sidebar e o expand/collapse do histórico home para `web/static/js/inspetor/sidebar_history.js`, `admin/services.py` delega serialização de usuários/admin-cliente e resumo de primeiro acesso para `web/app/domains/admin/admin_presentation_services.py`, e o pacote fechou com `make verify` verde

### Objetivo

- continuar drenando os hotspots restantes por blocos de apresentação e navegação do workspace/admin sem reabrir contratos centrais

### Escopo

- entra extração das ações de tabs, busca e rolagem do histórico/sidebar do inspetor
- entra extração da apresentação administrativa de usuários e primeiro acesso do tenant
- entra preservação explícita da compatibilidade de monkeypatch do console de platform settings em `admin/services.py`
- não entra redesign visual da sidebar
- não entra mudança de contrato de login cliente ou plataforma

### Passos

1. extrair sincronização, busca e expansão do histórico/sidebar para módulo do inspetor
2. extrair serialização de usuário admin e resumo de primeiro acesso para serviço dedicado
3. restaurar compatibilidade de testes do console de platform settings via fachada de `admin/services.py`
4. validar com `node --check`, `py_compile`, `ruff`, `pytest` focal e `make verify`

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de sidebar/home sem regressão de navegação
- `admin/services.py` perde mais uma fatia de apresentação administrativa sem quebrar o suite do admin
- `make verify` fecha verde no workspace inteiro

### `PKT-HOTSPOTS-BASELINE-07` — Rail do workspace e onboarding de tenant

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega visibilidade/estado do rail para `web/static/js/inspetor/workspace_rail.js`, `admin/services.py` delega o onboarding de tenant para `web/app/domains/admin/tenant_onboarding_services.py`, e o recorte passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por blocos de navegação do workspace e fluxos operacionais grandes do admin sem romper as fachadas atuais

### Escopo

- entra extração da visibilidade, acordeões e sincronização de layout do rail do workspace
- entra extração do onboarding de tenant com provisionamento inicial de usuários operacionais
- entra preservação da compatibilidade de monkeypatch em `admin/services.py` para o disparo de boas-vindas
- não entra mudança visual do rail
- não entra mudança funcional nas rotas admin-cliente/admin-ceo

### Passos

1. extrair helpers do rail do workspace para módulo do inspetor com dependências explícitas
2. extrair `registrar_novo_cliente` para serviço dedicado de onboarding tenant
3. validar com `node --check`, `py_compile`, `ruff`, smoke e subset focal de `test_admin_services.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de navegação/rail sem regressão de bootstrap
- `admin/services.py` perde o fluxo de onboarding sem quebrar testes de cadastro e boas-vindas
- smoke do web e testes focais do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-08` — Screen sync do workspace e dashboard admin

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega sincronização de views/widgets/screen para `web/static/js/inspetor/workspace_screen.js`, `admin/services.py` delega `buscar_metricas_ia_painel` para `web/app/domains/admin/admin_dashboard_services.py`, e o recorte passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por blocos centrais de screen sync do inspetor e leitura agregada do dashboard admin sem mexer no contrato público

### Escopo

- entra extração da sincronização de views do workspace, widget da mesa e evento `tariel:screen-synced`
- entra extração da leitura agregada de métricas do painel admin
- entra alinhamento da memória operacional entre `LOOP_ORGANIZACAO_FULLSTACK` e `LOOP_RECUPERACAO_TARIEL_WEB`
- não entra mudança visual do inspetor
- não entra alteração semântica do dashboard admin

### Passos

1. extrair o bloco de views/widgets/screen sync para módulo do inspetor com dependências explícitas
2. extrair `buscar_metricas_ia_painel` para serviço dedicado de dashboard admin
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso do screen sync sem quebrar o bootstrap do inspetor
- `admin/services.py` perde a leitura agregada do painel sem regressão em métricas e rollups
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-09` — Utilidades do workspace e backend de boas-vindas

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega utilitários de home/composer/HTTP para `web/static/js/inspetor/workspace_utils.js`, `admin/services.py` delega o backend de boas-vindas para `web/app/domains/admin/admin_welcome_notification_services.py`, e o recorte passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por helpers utilitários do runtime do inspetor e serviços operacionais pequenos do admin sem alterar contratos públicos

### Escopo

- entra extração de navegação para home, resumo textual, helpers de composer, CSRF e parsing de erro HTTP
- entra extração do backend operacional de boas-vindas `log|noop|strict`
- entra preservação da fachada `_disparar_email_boas_vindas` em `admin/services.py` para manter monkeypatch e rotas
- não entra mudança de UX no home do inspetor
- não entra mudança de fluxo de onboarding

### Passos

1. extrair os utilitários remanescentes do workspace para módulo dedicado
2. extrair o backend de boas-vindas para serviço admin pequeno e autocontido
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de utilidades sem quebrar o runtime principal
- `admin/services.py` perde o backend de boas-vindas sem quebrar testes de cadastro e aviso operacional
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-10` — Stage do workspace e resumo administrativo do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega stage/contexto do workspace para `web/static/js/inspetor/workspace_stage.js`, `admin/services.py` delega detalhe de cliente e helpers de resumo/filtro do catálogo para módulos dedicados, e o pacote passou em sintaxe, `ruff`, smoke e subsets focais do admin

### Objetivo

- continuar drenando os hotspots por um bloco central de stage/contexto do inspetor e por helpers administrativos de catálogo que ainda mantinham volume demais no agregado principal

### Escopo

- entra extração do stage do workspace, cópia dinâmica e controles visuais do inspetor
- entra extração do detalhe administrativo do cliente para módulo dedicado
- entra extração dos helpers de prontidão, lifecycle, distribuição por plano e filtros do catálogo admin
- não entra mudança funcional de onboarding, catálogo ou UI do inspetor
- não entra redesign visual

### Passos

1. extrair o bloco de stage/contexto do workspace para módulo dedicado
2. extrair `buscar_detalhe_cliente` para uma fachada de detalhe administrativo
3. extrair os helpers de resumo/filtro do catálogo para serviço administrativo dedicado
4. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de stage/contexto sem quebrar o runtime principal
- `admin/services.py` perde uma fatia material de resumo/filtro do catálogo e detalhe do cliente
- smoke do web e subsets focais do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-11` — Contexto visual do workspace e registry de ativos do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega contexto visual/chat livre para `web/static/js/inspetor/workspace_context_flow.js`, `admin/services.py` delega helpers de registry/material real para `web/app/domains/admin/admin_catalog_asset_registry_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por blocos de contexto do inspetor e por helpers de leitura documental do catálogo que ainda ocupavam volume demais no agregado admin

### Escopo

- entra extração do fluxo de contexto visual, landing do assistente e chat livre do inspetor
- entra extração de helpers de registry de templates e workspaces de material real do catálogo
- não entra mudança de comportamento funcional do chat livre
- não entra mudança de contrato do catálogo

### Passos

1. extrair o bloco de contexto visual/chat livre para módulo dedicado do inspetor
2. extrair os helpers de registry/material real para serviço administrativo dedicado
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de contexto visual/chat livre
- `admin/services.py` perde mais uma fatia material de helpers de leitura documental
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-12` — Abertura de laudo pela home e material real do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega a abertura de laudo pela home para `web/static/js/inspetor/workspace_home_flow.js`, `admin/services.py` delega o bloco de material real do catálogo para `web/app/domains/admin/admin_catalog_material_real_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de retomada/home do inspetor e por uma fatia administrativa grande de material real que ainda ocupava volume demais no agregado principal

### Escopo

- entra extração do fluxo `abrirLaudoPeloHome`
- entra extração do bloco de workspace/prioridade/fila de material real do catálogo
- não entra mudança funcional da retomada de laudo
- não entra mudança semântica do catálogo material real

### Passos

1. extrair a abertura de laudo pela home para módulo dedicado do inspetor
2. extrair o bloco de material real para serviço administrativo dedicado
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de retomada/home
- `admin/services.py` perde uma fatia grande de material real e filas associadas
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-13` — Anexos da mesa e preview documental do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega normalização/renderização de anexos da mesa para `web/static/js/inspetor/workspace_mesa_attachments.js`, `admin/services.py` delega o bloco de preview documental do catálogo para `web/app/domains/admin/admin_catalog_document_preview_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de anexos/mesa no inspetor e por helpers de preview documental do catálogo que ainda ocupavam muito volume no agregado administrativo

### Escopo

- entra extração de `formatarTamanhoBytes`, `normalizarAnexoMesa` e `renderizarLinksAnexosMesa`
- entra extração de status, objetivo, resumo e enriquecimento de preview documental do catálogo
- não entra mudança funcional do widget da mesa
- não entra mudança semântica do preview comercial/documental

### Passos

1. extrair o bloco de anexos/mesa para módulo dedicado do inspetor
2. extrair a família de helpers de preview documental do catálogo para serviço administrativo dedicado
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de anexos/mesa
- `admin/services.py` perde mais uma fatia material de preview documental
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-14` — Delivery flow do workspace e variantes do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega preview/finalização para `web/static/js/inspetor/workspace_delivery_flow.js`, o foco do composer passa a sair de `web/static/js/inspetor/workspace_composer.js`, `admin/services.py` delega biblioteca de variantes e alvo de refinamento para `web/app/domains/admin/admin_catalog_variant_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de ações de entrega do workspace no inspetor e por helpers administrativos de variantes/refino documental ainda concentrados no agregado principal

### Escopo

- entra extração de `abrirPreviewWorkspace` e `finalizarInspecao`
- entra migração de `focarComposerInspector` para o módulo do composer
- entra extração de `build_variant_library_summary` e `build_template_refinement_target`
- não entra mudança funcional de geração de PDF ou envio para a mesa
- não entra mudança semântica da estratégia comercial/documental

### Passos

1. extrair preview/finalização para módulo dedicado do inspetor
2. mover o foco do composer para o módulo já responsável pelo composer
3. extrair variantes/refino para serviço administrativo dedicado
4. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de delivery/finalização
- `admin/services.py` perde mais uma fatia material de variantes e refino documental
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-15` — Fluxo de primeiro envio do composer e fila de calibração

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega o primeiro envio e o ajuste de thread do composer para `web/static/js/inspetor/workspace_composer.js`, `admin/services.py` delega o rollup da fila de calibração para `web/app/domains/admin/admin_catalog_calibration_queue_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de controle do composer no inspetor e por uma agregação administrativa ainda pesada da fila de calibração no catálogo

### Escopo

- entra migração de `armarPrimeiroEnvioNovoChatPendente` e `prepararComposerParaEnvioModoEntrada` para o módulo do composer
- entra extração de `build_calibration_queue_rollup`
- não entra mudança funcional da UX do composer
- não entra mudança semântica das prioridades da fila de calibração

### Passos

1. mover o bloco de primeiro envio/ajuste de thread para `workspace_composer.js`
2. extrair a fila de calibração para serviço administrativo dedicado
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de controle do composer
- `admin/services.py` perde mais uma fatia material de agregação da fila de calibração
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-16` — Matriz de visibilidade do workspace e rollups operacional/comercial

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega a aplicação da matriz de visibilidade para `web/static/js/inspetor/workspace_screen.js`, `admin/services.py` delega os rollups de material real e escala comercial para `web/app/domains/admin/admin_catalog_rollup_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de visibilidade/orquestração do workspace no inspetor e por rollups administrativos ainda volumosos de operação e escala comercial

### Escopo

- entra migração de `aplicarMatrizVisibilidadeInspector` para `workspace_screen.js`
- entra extração de `build_material_real_rollup` e `build_commercial_scale_rollup`
- não entra mudança funcional da matriz visual do inspetor
- não entra mudança semântica dos indicadores operacionais/comerciais

### Passos

1. mover a aplicação da matriz de visibilidade para `workspace_screen.js`
2. extrair os rollups operacional/comercial para serviço administrativo dedicado
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de visibilidade de workspace
- `admin/services.py` perde mais uma fatia material de rollups operacionais/comerciais
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-17` — Mesa widget do workspace e registry documental do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega a disponibilidade e o embutimento do Mesa widget para `web/static/js/inspetor/workspace_screen.js`, `admin/services.py` delega a resolução de rótulo documental para `web/app/domains/admin/admin_catalog_asset_registry_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de sincronização do workspace no inspetor e por um helper ainda acoplado ao registry documental do catálogo

### Escopo

- entra migração de `resolveMesaWidgetDisponibilidade` e `sincronizarMesaStageWorkspace` para `workspace_screen.js`
- entra extração de `catalog_model_label` para `admin_catalog_asset_registry_services.py`
- não entra mudança funcional da UX do Mesa widget
- não entra mudança semântica do catálogo documental

### Passos

1. mover a disponibilidade e o encaixe do Mesa widget para `workspace_screen.js`
2. extrair a resolução de label documental para o módulo de asset registry do admin
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de screen sync derivado
- `admin/services.py` perde mais um helper ligado ao registry documental
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-18` — Thread do workspace e leitura textual do catálogo

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega a troca de canal do workspace para `web/static/js/inspetor/workspace_thread.js`, `admin/services.py` delega a leitura/resumo textual de releases e histórico para `web/app/domains/admin/catalog_tenant_management_services.py`, e o pacote passou em sintaxe, `ruff`, smoke e subset focal do admin

### Objetivo

- continuar drenando os hotspots por um bloco residual de navegação do workspace no inspetor e por helpers textuais ainda acoplados ao agregado administrativo do catálogo

### Escopo

- entra migração de `atualizarThreadWorkspace` para `workspace_thread.js`
- entra extração de `catalogo_texto_leitura` e `catalogo_scope_summary_label` para `catalog_tenant_management_services.py`
- não entra mudança funcional da navegação do inspetor
- não entra mudança semântica no histórico/liberação do catálogo

### Passos

1. mover a troca de canal do workspace para um módulo dedicado do inspetor
2. extrair os helpers textuais de histórico/liberação para o módulo de tenant management
3. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
4. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` perde mais um bloco coeso de navegação do workspace
- `admin/services.py` perde mais helpers ligados ao histórico/liberação do catálogo
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-19` — Runtime core do inspetor e superfícies de aplicação do admin

- `status`: concluído localmente em `2026-04-22`; `chat_index_page.js` delega runtime state, runtime screen, orquestração do workspace e ciclo de vida básico de página para `web/static/js/inspetor/workspace_{runtime_state,runtime_screen,orchestration,page_boot}.js`, enquanto `admin/services.py` passa a delegar composições de catálogo e operações do painel para `web/app/domains/admin/admin_{catalog,operations}_application_services.py`; o pacote passou em sintaxe, `ruff`, subset focal do admin e `tests/test_smoke.py`

### Objetivo

- reduzir o papel arquitetural do entrypoint do inspetor, separando composition root de runtime core
- reorganizar o agregado administrativo por superfícies de aplicação antes de continuar drenando helpers residuais

### Escopo

- entra extração do runtime de estado/tela do inspetor para módulos dedicados
- entra extração da orquestração de stage/contexto/home/finalização do workspace
- entra extração do wiring de eventos/boot básico da página
- entra criação de superfícies de aplicação para catálogo e operações do admin
- não entra desglobalização total do inspetor
- não entra remoção completa das compat layers restantes do admin

### Passos

1. mover estado/tela, orquestração e boot do inspetor para módulos dedicados
2. religar `chat_index_page.js` como delegador fino sobre esses módulos
3. criar superfícies de aplicação do admin para catálogo e operações do painel
4. validar com `node --check`, `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e commitar o lote

### Critério de pronto

- `chat_index_page.js` deixa de concentrar o runtime core do inspetor
- `admin/services.py` deixa de montar diretamente parte relevante das superfícies de catálogo e operações
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-20` — Tenant/catalog application slice do admin

- `status`: concluído localmente em `2026-04-22`; `web/app/domains/admin/services.py` passou a reexportar diretamente writers já extraídos e delegar o slice de detalhe/liberação/signatário/portfolio do catálogo para `web/app/domains/admin/admin_catalog_tenant_application_services.py`, reduzindo o agregado principal sem alterar contratos públicos; o pacote passou em sintaxe, `ruff`, subset focal do admin e `tests/test_smoke.py`

### Objetivo

- cortar volume real de `admin/services.py` depois da reorganização por superfícies de aplicação
- isolar o slice tenant/catalog que ainda misturava detalhe administrativo, releases e signatários

### Escopo

- entra criação do módulo `admin_catalog_tenant_application_services.py`
- entra reexportação direta, em `services.py`, de writers/importadores já segregados
- entra migração de detalhe de família, release tenant, signatário governado e portfolio para a nova superfície
- não entra refactor de governança review nem onboarding/dashboard adicionais
- não entra revisão do contrato HTTP do admin

### Passos

1. reexportar diretamente writers/readers já extraídos para remover wrappers redundantes
2. mover o slice tenant/catalog residual para um módulo de aplicação dedicado
3. religar `services.py` como fachada fina desse pacote
4. validar com `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e revisar o próximo centro de gravidade

### Critério de pronto

- `admin/services.py` perde wrappers redundantes e boa parte do bloco tenant/catalog residual
- detalhe de família, release e signatário passam a ter superfície própria no domínio admin
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-21` — Governança e resumo do catálogo no admin

- `status`: concluído localmente em `2026-04-22`; `web/app/domains/admin/services.py` passou a delegar a governança de review e a fachada de resumo do catálogo para `web/app/domains/admin/admin_catalog_governance_application_services.py`, preservando a API pública enquanto reduz o agregado principal; o pacote passou em sintaxe, `ruff`, subset focal do admin com governança e `tests/test_smoke.py`

### Objetivo

- atacar o próximo centro de gravidade residual do agregado administrativo após o corte tenant/catalog
- retirar de `admin/services.py` a composição de governança review e o resumo principal do catálogo

### Escopo

- entra criação do módulo `admin_catalog_governance_application_services.py`
- entra migração de `upsert_governanca_review_familia`
- entra migração de `listar_metodos_catalogo` e `resumir_catalogo_laudos_admin`
- entra manutenção explícita do contrato interno `flush_ou_rollback_integridade` no agregado principal
- não entra refactor dos serializers/document previews remanescentes
- não entra mudança de contratos HTTP ou de fixtures

### Passos

1. mover governança review e a fachada de resumo do catálogo para módulo próprio
2. religar `services.py` como superfície fina/reexport do novo pacote
3. preservar exports internos ainda consumidos pelos módulos de escrita já extraídos
4. validar com `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e recalcular o hotspot remanescente

### Critério de pronto

- `admin/services.py` deixa de carregar a orquestração de governança review e do resumo do catálogo
- os cenários de governança, release, detalhe e rollup continuam verdes
- smoke do web segue verde após o corte

### `PKT-HOTSPOTS-BASELINE-22` — Apresentação documental do catálogo no admin

- `status`: concluído localmente em `2026-04-22`; `web/app/domains/admin/services.py` passou a delegar snapshots de artefatos, preview documental, material-real workspace/priority, variant library, template refinement e serialização de linha para `web/app/domains/admin/admin_catalog_presentation_services.py`, mantendo apenas aliases privados de compatibilidade; o pacote passou em sintaxe, `ruff`, subset focal do admin e `tests/test_smoke.py`

### Objetivo

- reduzir o último bloco denso de composição documental e de summaries do catálogo no agregado administrativo
- separar a camada de apresentação/catalog view-model da camada de superfície pública do domínio admin

### Escopo

- entra criação do módulo `admin_catalog_presentation_services.py`
- entra migração de snapshot de artefatos, template library rollup, material-real workspace/priority, preview documental, variant library, template refinement e serialização da linha do catálogo
- entra preservação explícita dos aliases privados usados pelos módulos já extraídos
- não entra refactor do bloco de sync/bootstrap canônico
- não entra alteração de contratos HTTP ou de testes

### Passos

1. mover helpers de apresentação documental e summaries do catálogo para módulo dedicado
2. religar `services.py` com aliases privados de compatibilidade para os módulos de governança e tenant
3. reexpor no agregado apenas os símbolos internos ainda usados por slices já extraídos
4. validar com `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e recalcular o hotspot remanescente

### Critério de pronto

- `admin/services.py` deixa de concentrar o bloco de apresentação/documentação do catálogo
- detalhe e rollup do catálogo seguem verdes com o novo módulo
- smoke do web segue verde após o corte

### `PKT-HOTSPOTS-BASELINE-23` — Base canônica e sync helpers do catálogo

- `status`: concluído localmente em `2026-04-22`; `web/app/domains/admin/services.py` passou a delegar paths canônicos, carga de schemas, busca de família e bootstrap de métodos sugeridos para `web/app/domains/admin/admin_catalog_foundation_services.py`, preservando monkeypatch/compat via aliases no agregado; o pacote passou em sintaxe, `ruff`, subset focal do admin e `tests/test_smoke.py`

### Objetivo

- drenar do agregado administrativo o bloco residual de base canônica do catálogo
- estabilizar a compat layer interna usada por bootstrap/sync e pelos módulos já extraídos

### Escopo

- entra criação do módulo `admin_catalog_foundation_services.py`
- entra migração de `_repo_root_dir`, `_family_schemas_dir`, `_family_schema_file_path`, `_family_artifact_file_path`, `_ler_json_arquivo`, `listar_family_schemas_canonicos`, `carregar_family_schema_canonico`, `_buscar_familia_catalogo_por_chave`, `_metodos_sugeridos_para_familia` e `_upsert_metodos_catalogo_para_familia`
- entra preservação explícita dos aliases usados por monkeypatch e por slices já extraídos
- não entra refactor do sync/bootstrap em si
- não entra redução da compat layer pública do admin abaixo do necessário para a suite atual

### Passos

1. mover a base canônica do catálogo para módulo dedicado
2. religar `services.py` com aliases internos compatíveis com bootstrap/sync e monkeypatch de testes
3. validar os cenários focais de detalhe/rollup e os smoke de bootstrap canônico
4. registrar o checkpoint e recalcular o que ainda vale extrair

### Critério de pronto

- `admin/services.py` deixa de carregar a base canônica e o bootstrap de métodos sugeridos
- smoke de bootstrap canônico segue verde
- detalhe/rollup do catálogo seguem verdes após o corte

### `PKT-HOTSPOTS-BASELINE-24` — Operações administrativas reapontadas para superfície dedicada

- `status`: concluído localmente em `2026-04-22`; `web/app/domains/admin/admin_operations_application_services.py` passou a montar diretamente onboarding, dashboard e detalhe de cliente, enquanto `web/app/domains/admin/services.py` ficou como fachada fina para essas operações e preservou apenas os aliases privados necessários; o pacote passou em sintaxe, `ruff`, subset focal do admin e `tests/test_smoke.py`

### Objetivo

- reduzir mais um bloco operacional coeso do agregado administrativo
- concentrar onboarding/dashboard/detalhe no módulo de operações em vez de manter montagem de dependências espalhada em `services.py`

### Escopo

- entra expansão de `admin_operations_application_services.py` para montar dependências reais de onboarding, dashboard e detalhe
- entra remoção, de `services.py`, de helpers operacionais locais e dos wrappers extensos dessas superfícies
- entra preservação dos reexports públicos e aliases privados ainda consumidos por rotas e slices internos
- não entra refactor de plataforma/settings
- não entra redução agressiva da compat layer restante

### Passos

1. mover a montagem de dependências de onboarding/dashboard/detalhe para o módulo de operações
2. reapontar `services.py` como fachada fina
3. restaurar os aliases privados/publicos realmente consumidos por outras superfícies
4. validar com `py_compile`, `ruff`, subset focal do admin e `tests/test_smoke.py`
5. registrar o checkpoint e reavaliar o retorno marginal dos próximos cortes

### Critério de pronto

- `admin/services.py` deixa de montar diretamente onboarding, dashboard e detalhe de cliente
- rotas e slices internos continuam consumindo as mesmas entradas públicas/privadas necessárias
- smoke do web e subset focal do admin seguem verdes

### `PKT-HOTSPOTS-BASELINE-25` — Fachada de platform settings reapontada para módulo de aplicação

- `status`: concluído localmente em `2026-04-22`; `web/app/domains/admin/admin_platform_settings_application_services.py` passou a concentrar a orquestração pública de `platform/settings`, enquanto `web/app/domains/admin/services.py` ficou apenas como fachada compatível para rotas e monkeypatches da suíte; o pacote passou em sintaxe, `ruff`, subset focal de `platform_settings` e `tests/test_smoke.py`

### Objetivo

- retirar de `admin/services.py` mais um bloco coeso de orquestração pública ligado à plataforma
- preservar a compatibilidade da suíte que monkeypatcha os builders do console administrativo em cima da fachada histórica

### Escopo

- entra criação do módulo `admin_platform_settings_application_services.py`
- entra migração da orquestração pública de `apply_platform_settings_update` e `build_admin_platform_settings_console`
- entra preservação explícita da indireção via `admin/services.py` para manter monkeypatch de `build_platform_settings_console_overview`, `build_platform_settings_console_sections` e descritores/runtime builders
- não entra refactor do núcleo de `platform_settings_services.py`
- não entra remoção dos aliases de compatibilidade ainda usados por rotas e testes

### Passos

1. criar o módulo de aplicação para `platform/settings`
2. reapontar `services.py` para wrappers finos sobre esse módulo
3. preservar a injeção dos builders via fachada histórica do admin
4. validar com `py_compile`, `ruff`, subset focal de `platform_settings` e `tests/test_smoke.py`
5. registrar o checkpoint e reavaliar o que ainda faz sentido drenar do hotspot

### Critério de pronto

- `admin/services.py` deixa de carregar a orquestração pública de `platform/settings`
- os testes que monkeypatcham os builders do console continuam verdes
- smoke do web segue verde após o corte

### `PKT-HOTSPOTS-BASELINE-26` — Estado visual do composer reapontado para módulo dedicado

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/workspace_composer.js` passou a concentrar o highlight e o estado visual do composer, enquanto `web/static/js/chat/chat_index_page.js` ficou apenas como fachada fina para o boot e os bindings existentes; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- reduzir mais um resíduo local do root do inspetor sem alterar o contrato de carregamento da página
- fazer `bootstrap` e `ui_bindings` dependerem do módulo de composer também para o estado visual da entrada

### Escopo

- entra migração de `obterModoMarcador`, `atualizarVisualComposer`, `aplicarHighlightComposer` e `sincronizarScrollBackdrop` para `workspace_composer.js`
- entra reapontamento de `chat_index_page.js` para wrappers finos sobre `InspectorWorkspaceComposer`
- não entra mudança de template, seletores DOM ou eventos do composer
- não entra refactor maior da compat layer do inspetor

### Passos

1. mover o estado visual do composer para o módulo já responsável pelo composer
2. reapontar o root do chat para wrappers finos
3. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
4. registrar o checkpoint e reavaliar o próximo slice frontend com melhor retorno

### Critério de pronto

- `chat_index_page.js` deixa de carregar a lógica local de highlight/estado visual do composer
- `bootstrap` e `ui_bindings` continuam usando as mesmas actions sem regressão
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-27` — Instrumentação PERF do inspetor reapontada para módulo dedicado

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/workspace_perf.js` passou a concentrar a instrumentação `PERF` do workspace do inspetor, enquanto `web/static/js/chat/chat_index_page.js` ficou responsável apenas por fornecer os bindings instrumentáveis e reaplicar os wrappers retornados; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- retirar do root do inspetor um bloco volumoso, transversal e claramente isolável de observabilidade/performance
- preservar a mesma instrumentação de boot, state sync, thread, screen e transições sem acoplar esse código ao composition root

### Escopo

- entra criação de `workspace_perf.js`
- entra migração do bloco de wrappers `PERF` de `chat_index_page.js`
- entra inclusão do novo script em `web/templates/index.html` antes do root do chat
- não entra alteração de comportamento do produto ou do boot principal
- não entra refactor das regras de `PERF` em `shared/api-core.js`

### Passos

1. criar módulo dedicado para instrumentação do workspace
2. reapontar `chat_index_page.js` para pedir wrappers a esse módulo
3. incluir o novo script no template do inspetor
4. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
5. registrar o checkpoint e reavaliar o próximo slice com melhor retorno marginal

### Critério de pronto

- `chat_index_page.js` deixa de concentrar o bloco de instrumentação `PERF`
- o boot e as transições continuam instrumentados com a mesma semântica
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-28` — Navegação home e disponibilidade de chat livre reapontadas para módulos utilitários/runtime

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/workspace_utils.js` passou a concentrar helpers de navegação/home state, `web/static/js/inspetor/workspace_runtime_screen.js` passou a concentrar a disponibilidade e promoção do chat livre, e `web/static/js/chat/chat_index_page.js` ficou como fachada fina para essas rotinas; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- drenar do root do inspetor um bloco misto de navegação/home/chat livre que já tinha destino claro em módulos de utilitários e runtime de tela
- continuar reduzindo o root sem mexer no contrato visual ou no fluxo principal de boot

### Escopo

- entra migração de `obterTokenCsrf`, limpeza/desativação de contexto home e flags de `forceHomeLanding` para `workspace_utils.js`
- entra migração da disponibilidade/promoção do chat livre para `workspace_runtime_screen.js`
- entra reapontamento de `chat_index_page.js` para wrappers finos sobre esses módulos
- não entra alteração de rotas, template ou contratos de `bootstrap`
- não entra refactor do fluxo principal de `workspace_context_flow`

### Passos

1. mover os helpers de home/navigation para `workspace_utils.js`
2. mover os helpers de disponibilidade/promoção do chat livre para `workspace_runtime_screen.js`
3. reapontar `chat_index_page.js` para wrappers finos
4. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
5. registrar o checkpoint e reavaliar a próxima fatia do root do inspetor

### Critério de pronto

- `chat_index_page.js` deixa de concentrar o bloco local de navegação/home/chat livre
- boot e fluxos de transição continuam consumindo as mesmas actions sem regressão
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-29` — Resolução de abas e visibilidade da sidebar reapontadas para módulo dedicado

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/sidebar_history.js` passou a concentrar a resolução de abas, contagem e visibilidade da sidebar de histórico, enquanto `web/static/js/chat/chat_index_page.js` ficou apenas montando dependências mínimas para esse módulo; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- retirar do root do inspetor mais um bloco local de sidebar/history que já tinha módulo de destino claro
- seguir reduzindo o composition root sem mexer na navegação, seletores ou comportamento visual do histórico

### Escopo

- entra migração de `obterSecaoSidebarLaudos`, contagem de itens visíveis e resolução de aba ativa para `sidebar_history.js`
- entra reapontamento de `chat_index_page.js` para fornecer apenas `document`, `el` e `estado`
- não entra mudança de markup da sidebar
- não entra refactor do timeline/histórico canônico do workspace

### Passos

1. mover a lógica local de tabs/contagem da sidebar para `sidebar_history.js`
2. simplificar o root do chat para dependências mínimas
3. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
4. registrar o checkpoint e reavaliar o próximo slice residual do root

### Critério de pronto

- `chat_index_page.js` deixa de carregar a resolução local de abas e visibilidade da sidebar
- a sidebar continua alternando entre fixados/recentes sem regressão
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-30` — Filtros, meta e render do timeline reapontados para módulo de histórico

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/workspace_history_context.js` passou a concentrar reset de filtros, meta do histórico, resultados do timeline e a filtragem principal do workspace, enquanto `web/static/js/chat/chat_index_page.js` ficou como fachada fina para esse bloco; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- retirar do root do inspetor um bloco real de timeline/histórico que já pertencia semanticamente ao módulo de contexto do histórico
- continuar reduzindo o composition root sem alterar o comportamento de filtros, contadores e empty states do timeline

### Escopo

- entra migração de `resetarFiltrosHistoricoWorkspace`, labels de filtro, meta/resultados do histórico e `filtrarTimelineWorkspace` para `workspace_history_context.js`
- entra ampliação das dependências do módulo de histórico para consumir builders, estado e sincronizações já existentes
- não entra mudança do markup do timeline
- não entra refactor dos builders canônicos em `history_builders.js`

### Passos

1. mover o bloco de meta/filtros/render do timeline para `workspace_history_context.js`
2. reapontar `chat_index_page.js` para wrappers finos
3. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
4. registrar o checkpoint e reavaliar o próximo slice residual do root

### Critério de pronto

- `chat_index_page.js` deixa de carregar a lógica local de meta/filtros/render do timeline
- histórico e empty states continuam funcionando sem regressão
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-31` — Fluxo de thread/conversation focada reapontado para módulo dedicado

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/workspace_thread.js` passou a concentrar a lógica de conversa focada, variante de conversa, sync de URL e promoção da primeira mensagem do novo chat, enquanto `web/static/js/chat/chat_index_page.js` ficou como fachada fina para esse fluxo; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- retirar do root do inspetor mais um bloco real de thread/conversation que já pertencia semanticamente ao módulo de thread
- preservar o comportamento atual de conversa focada, sync de aba/URL e promoção do primeiro envio

### Escopo

- entra migração de `landingNovoChatAtivo`, `conversaWorkspaceModoChatAtivo`, `resolverConversationVariant`, `sincronizarConversationVariantNoDom`, `limparFluxoNovoChatFocado`, `exibirConversaFocadaNovoChat` e `promoverPrimeiraMensagemNovoChatSePronta` para `workspace_thread.js`
- entra reapontamento de `chat_index_page.js` para wrappers finos sobre `InspectorWorkspaceThread`
- não entra mudança do contrato de `state_runtime_sync`, `system_events` ou `observers`
- não entra refactor do boot principal

### Passos

1. mover o fluxo de thread/conversation focada para `workspace_thread.js`
2. reapontar o root do chat para wrappers finos
3. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
4. registrar o checkpoint e reavaliar o próximo slice residual do root

### Critério de pronto

- `chat_index_page.js` deixa de carregar o bloco local de thread/conversation focada
- sync de URL, conversa focada e promoção do primeiro envio seguem sem regressão
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-32` — Diagnóstico de preview reapontado para delivery flow

- `status`: concluído localmente em `2026-04-22`; `web/static/js/inspetor/workspace_delivery_flow.js` passou a concentrar a montagem do diagnóstico auditável usado na pré-visualização, enquanto `web/static/js/chat/chat_index_page.js` ficou apenas repassando estado e dependências operacionais; o pacote passou em `node --check`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- fechar o último corte frontend com retorno claro no root do inspetor sem entrar em redistribuição artificial de wrappers
- consolidar a lógica de preview no módulo de delivery, onde ela já fazia parte da mesma responsabilidade funcional

### Escopo

- entra migração de `montarDiagnosticoPreviewWorkspace` para `workspace_delivery_flow.js`
- entra reapontamento de `chat_index_page.js` para passar `estado`, linhas, metadados e contagem de evidências
- não entra refactor do boot principal nem de `finalizarInspecao`
- não entra nova rodada de micro-extrações no composition root

### Passos

1. mover a montagem do diagnóstico de preview para `workspace_delivery_flow.js`
2. simplificar o root do chat para um wrapper fino de preview
3. validar com `node --check`, `tests/test_smoke.py` e `git diff --check`
4. registrar o checkpoint e reavaliar se ainda existe algum corte frontend com retorno real

### Critério de pronto

- `chat_index_page.js` deixa de montar localmente o diagnóstico auditável do preview
- a pré-visualização continua funcional sem regressão
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-33` — Decisão final do laudo extraída para módulo temático

- `status`: concluído localmente em `2026-04-22`; a camada de decisão final, revisão mobile e reabertura saiu de `web/app/domains/chat/laudo_service.py` para `web/app/domains/chat/laudo_decision_services.py`, mantendo `laudo_service.py` como suporte neutro do ciclo de laudo; o pacote passou em `ruff`, `python -m py_compile`, `tests/test_v2_document_hard_gate.py`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- retirar de `laudo_service.py` o bloco de casos de uso mais acoplado do ciclo do laudo
- separar regras de finalização, revisão mobile e reabertura em um módulo de aplicação com fronteira explícita
- preparar o hotspot backend remanescente para nova análise sem seguir cortando o frontend por inércia

### Escopo

- entra extração de `_preparar_laudo_para_decisao_final`, `_persistir_decisao_final_laudo`, `finalizar_relatorio_resposta`, `executar_comando_revisao_mobile_resposta` e `reabrir_laudo_resposta`
- entra reapontamento de `web/app/domains/chat/laudo.py` e `web/app/domains/cliente/portal_bridge.py` para o novo módulo
- não entra mudança de contrato HTTP nem ajuste funcional de produto
- não entra nova rodada em `chat_index_page.js`

### Passos

1. criar `web/app/domains/chat/laudo_decision_services.py` com o bloco coeso de decisão final/revisão/reabertura
2. remover o bloco correspondente de `web/app/domains/chat/laudo_service.py`
3. reapontar rotas e bridge para o novo módulo
4. validar com `ruff`, `python -m py_compile`, `tests/test_v2_document_hard_gate.py`, `tests/test_smoke.py` e `git diff --check`

### Critério de pronto

- `laudo_service.py` deixa de concentrar os casos de uso de decisão final do laudo
- rotas do inspetor e portal cliente seguem respondendo pelo mesmo contrato
- hard gate documental e smoke do web seguem verdes

### `PKT-HOTSPOTS-BASELINE-34` — Pipeline documental endurecido do fallback ao preview real

- `status`: concluído localmente em `2026-04-22`; o pipeline `document_view_model -> editor -> render` passou a materializar shell mínimo de contingência, alinhar a promoção de preview rico com a capacidade real do editor universal, preservar blocos estruturados de payload parcial e validar a travessia desses dados até a rota real de preview do revisor; o pacote passou em `ruff`, `python -m py_compile`, `tests/test_catalog_document_contract.py`, `tests/test_catalog_pdf_templates.py`, `tests/test_catalog_pdf_visual_qa.py`, subset de `tests/test_regras_rotas_criticas.py`, `tests/test_smoke.py` e `git diff --check`

### Objetivo

- reduzir preview rico “genérico demais” quando o payload chega vazio ou parcial
- fortalecer o fallback documental sem depender de payload canônico completo
- fechar a cadeia de garantia do pipeline até o endpoint real de preview do revisor

### Escopo

- entra endurecimento de `build_universal_document_editor` para contingência
- entra ajuste de `should_use_rich_runtime_preview_for_pdf_template` para refletir a capacidade real do shell universal
- entra preservação de blocos estruturados públicos em `build_catalog_pdf_payload`
- entra ampliação da cobertura de contrato, visual QA e rota crítica de preview
- não entra mudança de contrato HTTP
- não entra redesign visual do documento

### Passos

1. materializar shell mínimo de contingência no editor universal
2. alinhar a seleção de preview rico com a materialização real do editor
3. preservar blocos estruturados parciais em `build_catalog_pdf_payload`
4. validar `payload -> editor -> html` e também a rota real de preview do revisor
5. rodar smoke do web e registrar o pacote

### Critério de pronto

- payload vazio ou parcial não degrada para preview rico fraco sem shell mínimo
- preview legado fraco pode ser promovido para editor rico com blocos públicos preservados
- QA visual e rota crítica do revisor confirmam a presença do conteúdo no documento gerado
- smoke do web e checagens de sintaxe seguem verdes

### `PKT-HOTSPOTS-BASELINE-35` — Baseline ampla reavaliada com bloqueio isolado no toolchain mobile

- `status`: em andamento em `2026-04-22`; a baseline ampla do web fechou verde (`ruff` completo + `246 passed` no pacote largo do web + `6 passed` em `tests/test_tenant_access.py`), mas o fechamento de `make verify` continua bloqueado no `android` por resolução incompleta da cadeia Babel/React Native durante o Jest; o ciclo também explicitou o requisito de `Node 22.13.1` no `android`, adicionou `android/.nvmrc`, `android/babel.config.js` e um runner dedicado no `Makefile` para o Jest mobile

### Objetivo

- fechar a validação mais ampla do pacote atual sem supor que o mobile ainda estava saudável
- separar regressão de código de problema de toolchain/ambiente
- deixar o bloqueio mobile explícito e reproduzível antes de seguir para novas melhorias de produto

### Escopo

- entra execução de `make verify` e leitura do primeiro ponto de quebra real
- entra alinhamento operacional do workspace mobile para `Node 22.13.1`
- entra documentação mínima do requisito no `android`
- não entra mudança funcional do app mobile
- não entra caça cega de novos hotspots estruturais

### Passos

1. rodar a baseline ampla do repositório
2. confirmar se a quebra restante é web, mobile ou higiene
3. alinhar a automação do Jest mobile com `Node 22.13.1`
4. registrar o bloqueio residual do Babel/React Native caso a suíte continue falhando antes de executar os testes

### Critério de pronto

- a baseline ampla do web segue verde
- o requisito operacional do mobile fica explícito no repositório
- o bloqueio residual do mobile deixa de parecer regressão de produto e passa a ficar documentado como problema de toolchain/dependency graph

### `PKT-HOTSPOTS-BASELINE-36` — Núcleo compartilhado do ciclo de laudo separado do service neutro

- `status`: concluído localmente em `2026-04-22`; o pseudo-core privado importado por `laudo_decision_services.py` e `report_finalize_stream_shadow.py` saiu de `web/app/domains/chat/laudo_service.py` para `web/app/domains/chat/laudo_workflow_support.py`, reduzindo `laudo_service.py` de `1085` para `658` linhas e eliminando a dependência estrutural de helpers privados espalhados

### Objetivo

- parar de usar `laudo_service.py` como compat layer implícita para helpers compartilhados
- separar o support code de workflow do caso de uso neutro de status/início/gate
- deixar o próximo hotspot backend mais legível antes de decidir nova extração

### Escopo

- entra extração do bloco compartilhado de `quality gate override`, `document gate`, `case lifecycle response fields`, `request/base_url` e helpers de binding/review mode
- entra reapontamento de `laudo_decision_services.py` e `report_finalize_stream_shadow.py`
- entra validação focada do ciclo de laudo e smoke do inspetor
- não entra mudança de contrato HTTP
- não entra ajuste funcional em `admin/services.py`

### Passos

1. criar `web/app/domains/chat/laudo_workflow_support.py` com o bloco compartilhado do workflow
2. remover os helpers equivalentes de `web/app/domains/chat/laudo_service.py`
3. reapontar os módulos de decisão final e shadow para o novo support module
4. validar com `ruff`, `python -m py_compile`, `tests/test_regras_rotas_criticas.py` e `tests/test_smoke.py`

### Critério de pronto

- `laudo_service.py` volta a concentrar apenas status, início e gate neutro do portal inspetor
- `laudo_decision_services.py` e `report_finalize_stream_shadow.py` deixam de importar helpers privados do service neutro
- o recorte de chat passa em lint, `py_compile` e smoke relevante

### `PKT-HOTSPOTS-BASELINE-37` — Leitura/status do laudo extraída para módulo próprio

- `status`: concluído localmente em `2026-04-22`; o fluxo de leitura/status do inspetor saiu de `web/app/domains/chat/laudo_service.py` para `web/app/domains/chat/laudo_status_response_services.py`, isolando a montagem do payload público, provenance, projeção V2, facade documental e `shadow` do caso sem alterar o contrato HTTP; o pacote passou em `ruff`, `python -m py_compile`, `tests/test_regras_rotas_criticas.py` e `tests/test_smoke.py`

### Objetivo

- retirar de `laudo_service.py` o bloco de leitura/projeção mais volumoso do ciclo do laudo
- separar o caso de uso de status do bootstrap de criação, do draft guiado mobile e do gate neutro
- fechar o pacote estrutural do hotspot antes de pivotar para correções e melhorias de produto

### Escopo

- entra extração de `obter_status_relatorio_resposta` e helpers internos de payload base/provenance para `web/app/domains/chat/laudo_status_response_services.py`
- entra reapontamento de `web/app/domains/chat/laudo_service.py` para atuar como fachada fina do novo módulo
- entra validação focal do ciclo do inspetor via smoke e regras críticas
- não entra mudança de contrato HTTP
- não entra nova rodada em `admin/services.py` nem no frontend do inspetor

### Passos

1. criar `web/app/domains/chat/laudo_status_response_services.py` com a montagem de status/projeção do inspetor
2. remover o bloco equivalente de `web/app/domains/chat/laudo_service.py`
3. manter `laudo_service.py` como fachada fina para rotas legadas do ciclo de laudo
4. validar com `ruff`, `python -m py_compile`, `tests/test_regras_rotas_criticas.py` e `tests/test_smoke.py`

### Critério de pronto

- `laudo_service.py` deixa de concentrar a leitura/status projetada do inspetor
- a resposta pública de status continua compatível para o portal atual
- provenance, projeção V2 e `shadow` seguem ativos no mesmo fluxo
- o pacote passa em lint, `py_compile` e na baseline web focal

### `PKT-PRODUTO-OBSERVABILITY-01` — Observabilidade do ciclo principal do laudo

- `status`: concluído localmente em `2026-04-22`; as rotas principais do ciclo do laudo no inspetor passaram a registrar hotspots operacionais para `status`, `início`, `gate de qualidade`, `finalização`, `reabertura` e comando de revisão mobile, com cobertura dedicada no sumário administrativo de backend hotspots; o pacote passou em `ruff`, `python -m py_compile`, `tests/test_backend_hotspot_metrics.py` e `tests/test_smoke.py`

### Objetivo

- tornar mensurável o ciclo principal do laudo sem alterar contrato HTTP
- incluir o fluxo de status/início/finalização do inspetor no sumário operacional já usado no admin
- ganhar base factual para decidir as próximas correções e melhorias de produto

### Escopo

- entra instrumentação com `observe_backend_hotspot` em `web/app/domains/chat/laudo.py`
- entra cobertura de teste para `GET /app/api/laudo/status` e `POST /app/api/laudo/iniciar`
- entra validação de smoke do web após a mudança
- não entra redesign de payload nem mudança funcional do ciclo do laudo
- não entra nova rodada estrutural em `chat_index_page.js` ou `admin/services.py`

### Passos

1. instrumentar as rotas principais do ciclo do laudo com endpoint, surface, status e outcome
2. estender `tests/test_backend_hotspot_metrics.py` para cobrir status e início do laudo
3. validar com `ruff`, `python -m py_compile`, `tests/test_backend_hotspot_metrics.py` e `tests/test_smoke.py`

### Critério de pronto

- o admin passa a enxergar o ciclo principal do laudo no sumário de backend hotspots
- status e início do laudo ficam cobertos por teste de observabilidade dedicado
- a mudança não altera o contrato público do inspetor

### `PKT-PRODUTO-MOBILE-CONTRACT-01` — Fallback canônico de grants mobile via tenant access policy

- `status`: concluído localmente em `2026-04-22`; o envelope mobile do backend passou a ficar formalmente coberto por `tenant_access_policy` nos testes web, e o Android passou a usar essa política como fallback canônico para `allowed_portals`, labels e links de troca de portal quando os campos explícitos não vierem preenchidos; o pacote passou em `pytest` focal do contrato web e `jest` focal do helper mobile

### Objetivo

- reduzir regressão silenciosa entre backend e Android na leitura de grants multiportal
- tratar `tenant_access_policy` como contrato canônico de fallback, sem depender só de campos achatados no envelope do usuário
- reforçar a fronteira web/mobile antes de abrir novas melhorias de produto

### Escopo

- entra tipagem de `tenant_access_policy` em `android/src/types/mobile.ts`
- entra fallback em `android/src/features/common/mobileUserAccess.ts` para grants, labels e links padrão por portal
- entra reforço do contrato web em `web/tests/test_multiportal_bootstrap_contracts.py`
- não entra mudança de rota ou alteração do payload do backend
- não entra redesign de superfícies mobile

### Passos

1. tipar `tenant_access_policy` no contrato mobile
2. usar a política como fallback canônico no helper de acesso do Android
3. reforçar o teste web do envelope mobile para explicitar esse campo
4. validar com `pytest` focal e `jest` focal

### Critério de pronto

- o Android consegue reconstruir grants multiportal a partir de `tenant_access_policy`
- o contrato web explicita a presença desse campo no login/bootstrap mobile
- a melhoria preserva o comportamento atual quando `allowed_portals` já vier preenchido

### `PKT-PRODUTO-MOBILE-CONTRACT-02` — Entry mode canônico preservado no estado local do app

- `status`: concluído localmente em `2026-04-22`; o Android passou a preservar `entry_mode_preference`, `entry_mode_effective` e `entry_mode_reason` no `ChatState`, usando fallback do envelope principal quando o `laudoCard` vier nulo ou parcial; o pacote passou em `jest` focal do chat mobile

### Objetivo

- reduzir drift entre o contrato mobile já exposto pelo backend e o estado efetivamente usado pelo app
- evitar perda silenciosa de `entry_mode_*` durante bootstrap, hidratação parcial e resposta de envio do chat
- reforçar as decisões de UI que dependem do modo efetivo do caso sem exigir mudança de rota

### Escopo

- entra promoção de `entry_mode_*` para `android/src/features/chat/types.ts`
- entra fallback no estado/consumidores do chat em `conversationStateHelpers`, `inspectorChatMessageController`, `buildThreadContextState` e `buildAuthenticatedLayoutSections`
- entra cobertura dedicada em `conversationHelpers.test.ts`, `buildThreadContextState.test.ts`, `useInspectorChatController.entryMode.test.ts` e `caseLifecycle.test.ts`
- não entra mudança de payload no backend
- não entra redesign da experiência de entrada no app

### Passos

1. promover `entry_mode_*` para o `ChatState`
2. preservar os campos vindos do envelope principal na normalização e na resposta do chat
3. usar fallback top-level nas decisões de workflow e contexto visual da thread
4. validar com `jest` focal e `git diff --check`

### Critério de pronto

- o app mantém `entry_mode_*` mesmo quando o `laudoCard` estiver ausente ou parcial
- retomada guiada, workflow formal e contexto visual continuam corretos em hidratação parcial
- a mudança não exige alteração no contrato HTTP do backend

### `PKT-PRODUTO-MOBILE-HISTORY-01` — Radar do histórico com sinais operacionais de retomada

- `status`: concluído localmente em `2026-04-22`; o drawer de histórico do Android passou a resumir também casos guiados e reemissões recomendadas no card “Radar da operação”, aproveitando sinais já presentes no contrato dos cards e sem mudar backend; o pacote passou em `jest` focal do histórico/layout

### Objetivo

- aumentar o valor operacional do histórico na retomada de caso no mobile
- destacar, já no resumo lateral, quantos casos estão em coleta guiada e quantos pedem reemissão
- reutilizar sinais canônicos já presentes nos cards do histórico sem ampliar payload ou regra de domínio

### Escopo

- entra agregação de `entry_mode_effective` e `official_issue_summary.primary_pdf_diverged` no resumo de `android/src/features/history/HistoryDrawerPanel.tsx`
- entra enriquecimento do texto de busca com esses sinais quando houver match relevante
- entra cobertura dedicada em `android/src/features/history/HistoryDrawerPanel.test.tsx`
- não entra mudança de backend
- não entra redesign estrutural do histórico

### Passos

1. agregar sinais operacionais já presentes nos cards do histórico
2. exibir pills/resumo textual para guiados e reemissões recomendadas
3. validar com `jest` focal do histórico/layout e `git diff --check`

### Critério de pronto

- o “Radar da operação” do histórico passa a resumir guiados e reemissões quando existirem
- a busca do histórico também aproveita esses sinais sem perder a leitura atual
- a melhoria não altera contrato HTTP nem classificação canônica do lifecycle

### `PKT-PRODUTO-MOBILE-OFFLINE-01` — Resumo operacional mais acionável da fila offline

- `status`: concluído localmente em `2026-04-22`; o resumo da fila offline no Android passou a priorizar impacto operacional real, destacando criação de caso, finalização e respostas à mesa antes do detalhe técnico de pronto/falha/backoff; o pacote passou em `jest` focal de fila, derived state, modais e settings

### Objetivo

- tornar a fila offline mais útil para retomada e priorização em campo
- reduzir o texto genérico de “envios pendentes” quando a fila na prática concentra criação de caso, finalização ou resposta técnica
- reaproveitar a mesma leitura curta em chat, modais e configurações sem duplicar lógica

### Escopo

- entra helper de resumo operacional em `android/src/features/offline/offlineQueueHelpers.ts`
- entra reapontamento de `buildInspectorBaseDerivedStateSections.ts` para usar esse resumo compartilhado
- entra cobertura dedicada em `offlineQueueHelpers.test.ts` e reforço no teste do derived state
- não entra mudança de backend
- não entra redesign da UI da fila offline

### Passos

1. classificar a fila por impacto operacional principal
2. combinar esse impacto com o estado técnico atual da fila
3. reaproveitar o resumo em derived state já consumido por thread, modais e settings
4. validar com `jest` focal e `git diff --check`

### Critério de pronto

- o app deixa de resumir a fila só como “N envios pendentes” quando houver impacto mais relevante para o operador
- criação de caso, finalização e resposta à mesa aparecem explicitamente no resumo curto
- a melhoria preserva a leitura de falha, pronto para reenvio e backoff

### `PKT-PRODUTO-MOBILE-FINALIZATION-01` — Bloqueios de emissão mais legíveis no fechamento

- `status`: concluído localmente em `2026-04-22`; a finalização do caso e o quality gate do Android passaram a resumir a composição dos bloqueios de emissão com mais clareza, diferenciando bloqueios documentais, pendências do pré-laudo e pontos de atenção sem alterar a lógica de aprovação; o pacote passou em `jest` focal do fluxo de fechamento

### Objetivo

- deixar mais clara a resposta para “o que está segurando a emissão agora”
- reduzir leitura opaca de contadores genéricos no fechamento do caso
- reaproveitar os contadores já existentes no `reportPackSummary` e no `reviewPackage`

### Escopo

- entra breakdown curto dos bloqueios em `threadContextFinalization.ts`
- entra narrativa de bloqueio no `QualityGateModal`/`QualityGateModalSections`
- entra cobertura dedicada em `QualityGateModal.test.tsx` e reforço em `buildThreadContextState.test.ts`
- não entra mudança de backend
- não entra redesign do fluxo de quality gate

### Passos

1. compor o resumo curto dos bloqueios do fechamento
2. exibir esse breakdown no card de finalização e no quality gate
3. validar com `jest` focal e `git diff --check`

### Critério de pronto

- o fechamento do caso passa a mostrar composição legível dos bloqueios
- quality gate e card final conversam na mesma linguagem de priorização
- a melhoria não altera regras de emissão nem contratos HTTP

### `PKT-PRODUTO-MOBILE-ACTIVITY-01` — Central de atividade com priorização operacional

- `status`: concluído localmente em `2026-04-22`; a central de atividade do Android passou a priorizar alertas críticos e eventos de mesa acima de status comuns, além de mostrar um rótulo curto de categoria operacional por item; o pacote passou em `jest` focal de helpers, modal e controller

### Objetivo

- transformar a central de atividade em uma fila de atenção real, não só em uma lista cronológica
- destacar primeiro o que exige ação do inspetor
- tornar cada item mais legível com categoria curta e destino explícito

### Escopo

- entra priorização das notificações em `android/src/features/activity/activityNotificationHelpers.ts`
- entra rótulo de categoria e hint de destino na `ActivityCenterModal`
- entra cobertura dedicada em `activityNotificationHelpers.test.ts` e `OperationalModals.test.tsx`
- não entra mudança de backend
- não entra novo tipo de evento

### Passos

1. ordenar notificações por urgência operacional
2. exibir categoria curta e hint de abertura por item
3. validar com `jest` focal e `git diff --check`

### Critério de pronto

- a central de atividade deixa de depender só da ordenação por tempo
- alertas críticos e reaberturas da mesa sobem na lista
- cada item comunica categoria e destino com leitura mais rápida
