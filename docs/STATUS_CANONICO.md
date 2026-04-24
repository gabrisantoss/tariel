# Status Canônico

Data de referência: 2026-04-24
Branch operacional: `main`
Repositório remoto: `gabrisantoss/tariel`

## Objetivo

Ser a referência curta e prática do estado atual do projeto.

Este arquivo deve responder:

- onde o projeto realmente está;
- qual direção de produto está valendo;
- o que já está sólido;
- o que ainda está faltando;
- qual é o próximo corte de trabalho.

## Estado atual resumido

O Tariel já é um produto real com:

- multiportal funcional;
- backend web forte;
- app mobile existente;
- governança de catálogo e templates;
- fluxo de mesa avaliadora;
- pipeline documental com gates e readiness;
- cobertura automatizada relevante.

Desde a consolidação canônica de 2026-04-12, o projeto também já ganhou materialização real em código de:

- governança configurável do `Admin Cliente` por tenant sob `Admin CEO`;
- contrato canônico do lifecycle do `caso técnico`;
- projeções compartilhadas entre backend, inspetor web, portal cliente e app Android;
- bloqueios e ações de superfície guiados por `allowed_surface_actions` e `allowed_lifecycle_transitions`.

O sistema não está na fase de "ideia".
Ele está na fase de:

- consolidar direção canônica;
- reduzir acoplamento;
- fortalecer mobile;
- terminar o pipeline documental premium;
- fechar onboarding, branding e operação comercial.

## Direção canônica atual

### Produto

- a unidade principal é o `caso técnico`;
- o caso pode começar livre e nem sempre precisa virar laudo;
- o caso pode operar em `análise livre`, `laudo guiado` e `laudo com mesa`;
- o ownership do caso é híbrido por estado;
- em fluxo guiado, a correção deve acontecer por checkpoint e campos, sem um segundo chat redundante;
- quando a `Mesa` estiver ausente por política do tenant, o inspetor web deve usar uma aba dedicada de `Correções`, separada do `Chat`, com edição estruturada por bloco e assistente textual apenas como apoio;
- a aprovação final humana continua obrigatória.
- a IA pode preencher pré-laudo e sugerir correções, mas sua atuação principal fica na trilha interna do caso;
- se um humano insistir em manter algo fora do padrão da NR ou do template, o sistema deve alertar a divergência, mostrar a orientação correta e pedir confirmação explícita;
- a responsabilidade técnica final continua com o humano signatário, incluindo assinatura profissional aplicável como `CREA`;
- depois da aprovação humana, o sistema gera o PDF final, marca o caso como `emitido` e encerra o ciclo corrente;
- um caso `emitido` pode ser reaberto para nova edição e nova finalização quando o laudo precisar ser refeito.
- na reabertura de um caso emitido, o usuário pode decidir se o PDF anterior continua visível no caso ou se sai da superfície ativa;
- mesmo quando sair da superfície ativa, o documento anterior pode permanecer como histórico interno e candidato a aprendizado.

### Canais

- o foco principal é `mobile-first`;
- o app mobile é centrado em um chat com IA que pode ou não virar laudo;
- o `inspetor web` continua oficial;
- ambos participam do mesmo núcleo funcional.
- quando a mesa existir no mobile, ela deve existir de forma nativa no app;
- o mesmo usuário mobile pode validar no app, conforme pacote e permissão.

### Documento

- o requisito estável de entrega é `PDF final`;
- o `PDF final` continua sendo tratado como documento validado por humano, sem marcação explícita de IA por padrão;
- o formato-fonte interno ainda é decisão de implementação.

### Operação

- `Admin Cliente` tem visibilidade ampla da operação do próprio tenant;
- a visão caso a caso e as ações operacionais do `Admin Cliente` passam a ser capacidades configuráveis por tenant, sob governança do `Admin CEO` conforme contratação;
- o cadastro da empresa no `Admin CEO` também pode declarar o pacote `mobile principal com operador único` como regra contratual do tenant;
- `Admin Geral` opera a plataforma com menor acesso possível ao conteúdo técnico;
- o protocolo excepcional do `Admin Geral` agora é fechado: aprovação, justificativa, step-up, janela temporária e escopo mínimo auditável;
- `Admin CEO` governa criação, edição e liberação de templates e pré-laudos;
- a mesa pode ser obrigatória, opcional ou ausente, conforme política comercial.
- a continuidade cross-surface entre mobile, inspetor web e mesa web passa a ser governada por grants e links do tenant, sem depender de sessão única real por padrão;
- retenção mínima, autoria obrigatória e trilha de IA/override humano agora têm baseline canônico;
- a matriz comercial passa a ser lida por eixos de capacidade por tenant, não só por volume.

## O que já está sólido

- tenant boundary e RBAC compartilhados;
- gates documentais V2;
- catálogo governado por tenant, família, variante e template;
- testes críticos em backend, mobile e E2E;
- contracts V2 entre backend, web e mobile já materializados para lifecycle do caso;
- política de visibilidade e ação do `Admin Cliente` persistida por tenant;
- portal cliente obedecendo governança por tenant e modo `read_only`;
- política de pacote `mobile principal com operador único` já declarada no cadastro/Admin-CEO e exposta nas projeções do tenant;
- portal cliente e diagnóstico exportado já explicando o pacote operacional por tenant, incluindo limite de operador e superfícies previstas;
- tentativas de criar conta operacional extra em tenant `mobile principal com operador único` já ficam bloqueadas e auditadas;
- inspetor web obedecendo ações canônicas de finalização e reabertura;
- app Android já lendo lifecycle, owner, transições e ações permitidas;
- app Android já recebendo no bootstrap os grants efetivos de portal do usuário e o modelo operacional do tenant;
- persistência local do app Android agora escopada por identidade de conta/tenant para cache, fila offline e notificações;
- grants multiportal do tenant agora também governam as jornadas offline do app, incluindo mesa, fila local, notificações e cache persistido;
- configurações, ajuda e suporte do app Android agora também respeitam os grants reais do usuário, ocultando sinais de `mesa` quando o tenant não libera esse portal e exibindo o resumo governado do acesso ativo;
- fluxo nativo de `mesa` no app agora devolve com contexto canônico de revisão, incluindo bloco prioritário, ação requerida e sinalizações críticas;
- jornada guiada do app agora abre a `Mesa` nativa quando o handoff exigir revisão humana e o checklist já estiver concluído;
- app Android agora executa `quality gate` nativo antes da finalização, com `override humano` justificado, trilha interna e envio para fila offline quando necessário;
- finalização governada do caso agora pode ser retomada da fila offline do app sem perder o contexto do gate ou a justificativa humana;
- contas multiportal governadas pelo tenant agora exibem troca explícita de superfície entre `Admin-Cliente`, `Inspetor` e `Mesa` nos portais web;
- payloads mobile agora também expõem `portal_switch_links`, nota de runtime de identidade e continuidade cross-surface para `Inspetor`, `Mesa` e `Admin-Cliente`;
- sheet de plano e exportação do app Android agora mostram a continuidade web do usuário e o runtime de identidade governado pelo tenant;
- preservação explícita da validação humana final mesmo com pré-laudo preenchido por IA;
- revisão humana explicitamente preservada no produto.
- fullscreen por padrão no Android já foi validado em aparelho;
- comunicação do dev client Android com backend local voltou a funcionar com correção de runtime de env e base URL;
- `preferencias_ia_mobile` agora trafegam como contexto interno e já não devem aparecer como texto visível em chat, histórico ou preview;
- a superfície principal do app já separa melhor `Chat`, `Mesa` e `Finalizar`, reduzindo parte da poluição operacional na conversa.
- a baseline local foi restaurada e checkpointada em `964a348`, com `make verify` verde antes do corte atual.
- `web-ci` agora inclui `mypy` progressivo via `make web-typecheck`, e o workspace web está sem erros de tipagem no recorte atual.
- o pacote de segurança ganhou `make security-audit`, cobrindo `pip-audit` pinado para Python e `npm audit --omit=dev --audit-level=high` no mobile.
- `render.yaml` e `make production-ops-check-strict` já exigem disco persistente para uploads, backup obrigatório, restore drill obrigatório e sessão fail-closed em produção.
- existe drill local executável de restore de uploads em `make uploads-restore-drill`, agora também dentro de `release-gate-real`.
- os 12 PDFs/ZIPs rastreados acima de 10 MiB saíram do Git futuro e ficaram documentados em `docs/binary_asset_manifests/oversized_assets_2026-04-24.json`.
- o backend agora emite log production-safe para fluxos críticos lentos ou com erro 5xx, cobrindo cliente, chat do inspetor, Mesa/revisor e emissão documental sem vazar payload técnico.
- `mesa/service.py` começou a perder responsabilidades internas para módulos dedicados, com a sumarização de mensagens/evidências/pendências da Mesa isolada em `mesa/package_message_summary.py`.
- o portal cliente avançou na troca de HTML hardcoded por contratos estáticos allowlisted para estados read-only do Chat.

## O que ainda falta melhorar

### Produto

- refinar o lifecycle v1 do caso técnico com subestados operacionais e ações administrativas por estado;
- matriz comercial clara por pacote;
- lifecycle e versionamento do catálogo governado de templates;
- onboarding de primeira venda;
- branding e personalização por empresa.

### Backend

- desacoplamento restante entre `cliente`, `chat` e `revisor`;
- quebra de hotspots como `admin/services.py`;
- extração mais nítida do núcleo compartilhado de caso técnico para fora de compat layers legadas.
- continuar drenando `mesa/service.py`, `admin/client_routes.py` e helpers documentais sem reabrir contrato de produto.

### Frontend web

- redução de `window.*` e ordem manual de scripts;
- quebra do runtime do inspetor em módulos menores;
- redução de compat layers legadas;
- levar mais sinais canônicos para histórico, observabilidade e telas administrativas.
- seguir trocando renderização manual por helpers escapados e contratos explícitos de superfície no portal cliente e no inspetor.

### Mobile

- aprofundar jornadas guiadas por missão além do handoff atual para mesa;
- reuso de contexto do ativo e da inspeção;
- limpeza visual de `Finalizar`, `Configurações` e `Histórico`;
- possibilidade de fechar mais fluxos sem depender da web, conforme pacote.
- manter Expo SDK 55 em patch atual e atualizar o runtime local de Node para `>=22.13.0` ou versão LTS compatível antes de tratar warnings de engine como erro.

### Documento

- fortalecer `document_view_model -> editor -> render`;
- reduzir fallback visível fraco;
- enriquecer pacote final de entrega.

### Operação e segurança

- hashificar `web/requirements.txt` em etapa futura para reduzir aviso do `pip-audit --no-deps`;
- decidir política para vulnerabilidades moderadas transitivas do Expo quando a correção automática exigir downgrade incompatível;
- mover os binários restantes entre 2 MiB e 10 MiB para LFS/storage conforme valor operacional e frequência de alteração;
- executar restore drill real no provedor de storage externo quando o bucket/LFS definitivo dos assets pesados estiver definido.
- transformar os novos logs de rota crítica em painel/alerta operacional real, com consulta no provedor de logs ou APM escolhido.
- alinhar o serviço publicado `tariel-web-free` ao contrato production-ready; em 2026-04-24, `/ready` respondeu `production_ops_ready=false`, `uploads_storage_mode=local_fs` e cleanup desligado, indicando que o Render free atual ainda não aplica disco persistente/envs de produção real.

## Próximo corte oficial

1. manter `make verify`, `make hygiene-check`, `make security-audit`, `make production-ops-check-strict`, `make uploads-restore-drill` e `make binary-assets-audit-strict` como pacote mínimo de promoção local;
2. continuar a extração dos hotspots `mesa/service.py`, `admin/client_routes.py`, `chat_index_page.js` e superfícies do portal cliente, usando os novos logs críticos para priorizar gargalos reais;
3. consolidar o pacote `docs/product-canonical-vision/`;
4. refletir a matriz comercial por eixos nas superfícies administrativas e nos entitlements;
5. reduzir desglobalização e compat layers do inspetor web;
6. limpar visualmente `Finalizar`, `Configurações` e `Histórico` no app Android;
7. validar no aparelho login, offline, anexos e mesa após esse ajuste;
8. retomar o pipeline `document_view_model -> editor -> render`.

## Regra de manutenção

Sempre que uma decisão grande mudar:

- atualizar este arquivo;
- atualizar o pacote canônico de visão do produto;
- registrar a mudança em commit próprio.
