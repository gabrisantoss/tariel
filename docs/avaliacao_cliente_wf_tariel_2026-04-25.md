# Avaliacao como Cliente WF do Tariel

Data: 2026-04-25

Perfil assumido: dono de uma empresa que vende RTI, SPDA, PIE, LOTO, NR12, NR13, NR20, NR33, NR35, projetos, adequacoes, treinamentos, levantamentos em campo e emissao de laudos tecnicos com responsabilidade profissional.

Objetivo do comprador: reduzir o tempo de producao de laudos, hoje em torno de 10 dias, sem perder rastreabilidade, padrao tecnico, controle de ART/CREA, qualidade documental e confianca operacional.

## Veredito de Compra

Eu consideraria o Tariel para um piloto pago assistido, principalmente para NR10, NR13 e NR35. Eu ainda nao compraria como implantacao ampla e autonoma para toda a carteira WF sem antes ver uma demonstracao fechada com casos reais e corrigir friccoes de primeira experiencia.

Notas como comprador:

- `Produto e arquitetura`: 8/10
- `Cobertura tecnica da carteira WF`: 7/10
- `Experiencia visual inicial`: 5.5/10
- `Clareza comercial para quem compra`: 5/10
- `Prontidao para piloto pago`: 8/10
- `Prontidao para venda self-service ou escala sem acompanhamento`: 4.5/10

Resumo direto: o sistema tem muita base tecnica por baixo, mas a primeira experiencia ainda nao vende essa forca. A tela inicial que vi esta limpa, porem generica e vazia. Para uma empresa que quer acelerar laudos, eu preciso enxergar logo os servicos, os modelos liberados, o status dos laudos, as pendencias e o ganho operacional. Hoje eu vejo mais "um chat com IA" do que "minha fabrica de laudos tecnicos governados".

## Evidencias Consultadas

Arquivos locais lidos:

- `docs/STATUS_CANONICO.md`
- `PROJECT_MAP.md`
- `README.md`
- `web/README.md`
- `docs/portfolio_empresa_wf_servicos.md`
- `web/docs/prontidao_comercial_primeiro_cliente.md`
- `web/docs/waves_a_b_c_produto_vendavel.md`
- `web/docs/matriz_comercial_planos_tariel.md`
- `web/templates/inspetor/_portal_home.html`
- `web/templates/inspetor/_workspace.html`
- `web/templates/inspetor/workspace/_assistant_landing.html`
- `web/templates/inspetor/base.html`
- `web/templates/cliente_portal.html`
- `web/templates/painel_revisor.html`
- `web/templates/admin/dashboard.html`
- `web/app/domains/chat/auth_mobile_support.py`
- `web/app/domains/cliente/dashboard_bootstrap_support.py`
- `android/src/features/InspectorMobileApp.tsx`

Validacao visual executada:

```bash
cd web
RUN_E2E=1 E2E_VISUAL=0 python -m pytest tests/e2e/test_inspetor_visual_playwright.py -q --browser chromium -s
```

Resultado: o teste salvou o screenshot `web/.test-artifacts/visual/00-inspetor-portal-home.png`, mas falhou ao abrir o modal de perfil. O seletor `#modal-perfil-chat` permaneceu oculto depois do clique em `#btn-abrir-perfil-chat`.

Fonte externa consultada para reduzir risco normativo:

- Portal oficial de Normas Regulamentadoras do Ministerio do Trabalho e Emprego: `https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/ctpp-nrs/normas-regulamentadoras-nrs`

## O Que Eu Espero Como Cliente

Como comprador, eu nao estou comprando "IA". Eu estou comprando reducao de prazo, padronizacao, menor retrabalho, controle tecnico e previsibilidade de entrega.

Eu esperaria encontrar no sistema:

- Catalogo claro com os nomes comerciais da WF: `RTI`, `SPDA`, `PIE`, `LOTO`, `NR12 Maquinas`, `NR13 Vasos/Caldeiras/Tubulacoes`, `NR20 Inflamaveis`, `NR33 Espaco Confinado`, `NR35 Linha de Vida/Ponto de Ancoragem`.
- Botao direto para iniciar cada servico, sem depender de eu saber o nome interno da familia tecnica.
- Fluxo guiado por ativo, local, TAG, cliente, unidade, fotos, documentos, medicoes, nao conformidades, conclusao e recomendacoes.
- Checklists curtos em campo, com anexos/fotos como parte natural do fluxo.
- Uso mobile forte, porque o valor nasce no levantamento em campo.
- Clonagem de inspecao anterior para inspecoes periodicas.
- Pendencias por bloco, nao conversa solta.
- Mesa avaliadora com SLA, responsavel, decisao e devolucao objetiva.
- PDF final com pacote congelado, assinatura/signatario, hash ou QR Code, versao e historico de reemissao.
- Evidencia de que o laudo pode sair em 1 ou 2 dias quando o material de campo esta completo.
- Painel gerencial mostrando onde os 10 dias atuais estao sendo consumidos: coleta, espera de documento, mesa, correcao, emissao.

## Aderencia Por Linha de Servico WF

### Eletrica Industrial: RTI, PIE, SPDA, LOTO

Ponto forte: o projeto ja tem base clara para NR10 e prontuario. Existem referencias a `nr10_inspecao_instalacoes_eletricas`, `nr10_prontuario_instalacoes_eletricas`, `nr10_implantacao_loto` e `nr10_inspecao_spda`.

Risco atual: na experiencia do usuario, isso precisa aparecer como produto comercial da WF, nao como familia tecnica escondida. Eu quero clicar em `Criar RTI`, `Criar PIE`, `Inspecionar SPDA` ou `Implantar LOTO`, e nao descobrir isso por tentativa no chat.

O que falta para me convencer:

- Jornada separada para RTI, PIE, SPDA e LOTO.
- Campos especificos de ART, responsavel tecnico, CREA, escopo, unidade, diagramas, prontuario, unifilar e documentos de referencia.
- Sinal claro de evidencias minimas antes de enviar para revisao.
- Diferenciar inspecao eletrica de prontuario documental. Misturar os dois pode gerar laudo bonito, mas operacionalmente errado.

### NR12: Maquinas, Dispositivos e Zonas de Risco

Ponto forte: existe material forte para NR12, incluindo inspecao de maquina/equipamento e apreciacao de risco.

Risco atual: o texto comercial da WF mistura itens que podem ser NR11 ou NR12. O proprio documento `docs/portfolio_empresa_wf_servicos.md` reconhece essa confusao. Como cliente, eu espero que o sistema me ajude a classificar corretamente, porque vender ou emitir com enquadramento errado e um risco serio.

O que falta para me convencer:

- Tela de triagem que pergunte se o objeto e maquina/equipamento, movimentacao/icamento ou armazenagem.
- Separar `NR12 Maquinas` de eventual `NR11 Movimentacao/Icamento`.
- Checklist de dispositivos de seguranca, zonas de risco, seguranca eletrica e protecoes mecanicas.
- Campo de recomendacoes de adequacao com prioridade, risco e prazo.

### NR13: Caldeiras, Vasos, Tubulacoes e Ensaios

Ponto forte: esta parece uma das linhas mais vendaveis. O projeto cobre caldeira, vaso de pressao, tubulacao, teste hidrostatico, livro de registro e levantamento in loco. A base documental tambem parece mais madura.

Risco atual: os servicos complementares ainda precisam virar fluxo operacional evidente. Medicao de espessura por ultrassom, calibracao de valvula de seguranca/manometro, teste hidrostatico e estanqueidade nao podem parecer observacoes dentro de um laudo generico.

O que falta para me convencer:

- Fluxos separados para inspecao inicial, periodica e extraordinaria.
- Aba ou etapa de medicoes, com tabela estruturada.
- Registro de valvulas, manometros, certificados e calibracao.
- Controle de livro de registro.
- Comparacao com inspecao anterior e alerta de recorrencia.
- Indicador de prontidao do laudo NR13 antes da emissao.

### NR20: Inflamaveis e Combustiveis

Ponto forte: o projeto ja reconhece NR20 como linha de inflamaveis, com inspecao e prontuario.

Risco atual: a carteira WF inclui projeto de instalacao, planos de inspecao/manutencao, analise de riscos e planos de prevencao. Isso nao e somente laudo. O Tariel precisa deixar claro quando esta emitindo laudo, quando esta organizando prontuario e quando esta gerando plano.

O que falta para me convencer:

- Tipo de entrega explicito: laudo, prontuario, plano, analise de risco ou projeto.
- Checklist de documentos obrigatorios por classe/instalacao.
- Separar recomendacao tecnica de plano de acao executivo.

### NR33: Espaco Confinado

Ponto forte: existem familias para avaliacao de espaco confinado e permissao de entrada/trabalho.

Risco atual: a WF vende classificacao/mapeamento, padronizacoes, layouts e planos de resgate. Isso exige mais que texto de laudo: precisa mapa, lista de espacos, atributos, fotos, riscos, ventilacao, acesso, resgate e periodicidade.

O que falta para me convencer:

- Cadastro de espacos confinados como ativos.
- Mapeamento por unidade/setor.
- Fluxo para PET e fluxo separado para classificacao/mapeamento.
- Plano de resgate como artefato proprio.
- Exportacao objetiva para cliente final.

### NR35: Linha de Vida, Ancoragem e Trabalho em Altura

Ponto forte: a cobertura de linha de vida e ponto de ancoragem parece forte. A linha `nr35_inspecao_linha_de_vida` aparece como um dos melhores candidatos para vitrine comercial.

Risco atual: projetos, fabricacao e montagem nao devem ser misturados com inspecao. Se o sistema tratar tudo como laudo de conformidade, ele pode forcar uma operacao de engenharia a virar documento errado.

O que falta para me convencer:

- Separar inspecao de linha de vida, ponto de ancoragem, projeto, fabricacao e montagem.
- Checklist de componentes e pontos fotografados.
- Historico por sistema instalado.
- Evidencias obrigatorias por trecho, ponto, cabo, terminal, fixacao e identificacao.

### Projetos, Adequacoes e Treinamentos

Ponto forte: o conceito de `caso tecnico` pode absorver fluxos que nao viram laudo imediatamente.

Risco atual: a comunicacao e a UI ainda falam muito em laudo/chat. Como empresa WF, eu tambem vendo adequacao, projeto e treinamento. Se o sistema nao deixa isso claro, eu entendo que ele resolve so parte da minha operacao.

O que falta para me convencer:

- Tipo de caso: laudo, projeto, adequacao, treinamento, prontuario, plano, diagnostico.
- Entregaveis por tipo.
- Status por tipo de entrega, nao tudo como "laudo".
- Relatorio gerencial de servicos alem de laudos emitidos.

## Avaliacao da Experiencia Visual

O visual que vi no screenshot e limpo, com pouca poluicao. Isso e bom. O problema e que ele ficou limpo demais e comunica pouco valor.

Problemas observados:

- A primeira tela mostrou `Ola, sou Tariel. Como posso te ajudar?`, mas nao mostrou claramente os servicos WF, modelos liberados ou laudos em andamento.
- A area central tem muito espaco vazio. Parece premium em silencio, mas para comprador tecnico parece falta de informacao operacional.
- A sidebar ocupa bastante area e mostra `Nenhuma conversa ainda`, o que reforca sensacao de produto vazio.
- O botao `Nova inspecao` e bom, mas o botao `Iniciar laudo` aparece separado e cria duvida: eu comeco pela inspecao, pelo laudo ou pelo chat?
- O campo `Pergunte alguma coisa` e generico demais para um inspetor em campo. Eu esperaria algo como descrever ativo, setor, TAG, evidencias e objetivo.
- Os botoes de anexo e foto sao importantes e estao visiveis, mas poderiam estar conectados a um checklist de evidencias minimas.
- O produto nao mostra logo a promessa central: reduzir prazo de laudo com governanca.
- A identidade visual esta correta para SaaS tecnico, mas ainda nao parece uma central operacional de empresa de inspecao.

Minha leitura como cliente: visualmente nao esta sujo. Ele esta contido. Mas esta abstrato demais.

## Problema Funcional Encontrado

O teste E2E visual falhou ao tentar abrir o perfil do usuario:

- Acao: clicar em `#btn-abrir-perfil-chat`.
- Esperado: `#modal-perfil-chat` visivel.
- Observado: modal continuou oculto.

Impacto comercial: em uma demo, um erro desse passa inseguranca. Perfil, sessao, usuario e empresa sao partes basicas da confianca do sistema. Antes de apresentar para comprador real, isso precisa estar funcionando.

## O Que O Projeto Ja Satisfaz

O Tariel satisfaz pontos importantes:

- Tem multiportal: inspetor, mesa, admin cliente, admin CEO e mobile.
- Tem conceito certo de caso tecnico, nao apenas chat.
- Tem mesa avaliadora, o que e essencial para responsabilidade humana.
- Tem governanca por tenant, familia, variante e template.
- Tem material documental e schemas para varias NRs.
- Tem app mobile existente, o que combina com trabalho em campo.
- Tem gates, readiness e emissao oficial transacional documentada.
- Tem QR/hash/verificacao publica como diferencial de confianca.
- Tem controle de signatario governado e fluxo de aprovacao humana.
- Tem documentacao interna madura sobre o que ainda falta.

Isso e forte. O problema nao e ausencia de base. O problema e embalagem operacional, primeira experiencia e clareza por linha de servico.

## O Que Ainda Nao Satisfaz Como Comprador Exigente

### 1. Falta uma vitrine operacional por servico

Eu nao quero abrir um chat e explicar do zero que preciso fazer RTI, NR13 ou linha de vida. Eu quero escolher o servico e entrar em um fluxo guiado.

Prioridade: alta.

### 2. Falta mostrar economia de prazo

Se hoje meu laudo demora 10 dias, eu quero ver indicadores:

- tempo medio por etapa;
- casos travados;
- pendencias da mesa;
- laudos prontos para emissao;
- retrabalho por falta de evidencia;
- previsao de conclusao.

Prioridade: alta.

### 3. Falta linguagem comercial na UI

A base tecnica fala em familias, variantes, templates e governanca. Isso e bom para backend e admin. Para o comprador, a linguagem deve ser:

- `Criar RTI`
- `Criar PIE`
- `Inspecionar vaso de pressao`
- `Abrir teste hidrostatico`
- `Mapear espaco confinado`
- `Inspecionar linha de vida`

Prioridade: alta.

### 4. Falta separar tipos de entrega

Laudo, projeto, adequacao, treinamento, plano e prontuario nao sao a mesma coisa. O sistema precisa mostrar isso desde o inicio.

Prioridade: alta.

### 5. O mobile precisa aparecer como protagonista

A documentacao diz que o foco e mobile-first, mas a avaliacao visual feita aqui foi do portal web. Como comprador de empresa de campo, eu so fecho compra grande se o mobile for muito bom para:

- foto rapida;
- anexo offline;
- audio/ditado;
- checklist curto;
- clonagem;
- fila offline;
- retorno da mesa;
- finalizacao com qualidade.

Prioridade: alta.

### 6. A experiencia inicial esta limpa, mas pouco objetiva

O usuario pediu um sistema objetivo e sem textos desnecessarios. A UI caminha para isso, mas o texto que sobra ainda e generico. Se e para ter pouco texto, cada palavra precisa carregar acao tecnica.

Prioridade: media-alta.

### 7. Falta uma demo fechada com caso real WF

Eu compraria mais rapido se visse um fluxo completo:

1. Criar laudo NR35 linha de vida.
2. Coletar fotos e dados em campo.
3. Mesa pedir uma correcao.
4. Inspetor responder.
5. Gate liberar emissao.
6. PDF final sair com pacote congelado e verificacao publica.

Prioridade: alta.

## Recomendacoes Prioritarias

### Antes de vender para um cliente real

- Corrigir o bug do modal de perfil encontrado no E2E visual.
- Montar uma demo completa de uma familia forte: `NR35 linha de vida` ou `NR13 vaso/caldeira`.
- Ajustar primeira tela para mostrar servicos liberados e casos ativos, nao apenas chat generico.
- Criar atalhos por servico WF com linguagem comercial.
- Mostrar KPI de reducao de prazo e gargalo por etapa.
- Garantir que `Nova inspecao`, `Iniciar laudo` e `Novo chat` tenham diferenca clara.

### Para fechar piloto pago WF

- Liberar inicialmente 3 a 5 frentes bem fechadas, nao a carteira inteira.
- Sugestao de pacote piloto: `RTI/NR10`, `NR13 vaso ou caldeira`, `NR35 linha de vida`, `NR33 avaliacao de espaco confinado`.
- Usar Mesa obrigatoria nas primeiras emissoes.
- Registrar material real aprovado para amadurecer memoria operacional.
- Medir prazo real antes/depois por etapa.

### Para vender em escala

- Produto comercial por bundles: eletrica, NR13, espaco confinado, trabalho em altura, maquinas.
- Entitlements claros por plano.
- Onboarding guiado do tenant com servicos, usuarios, signatarios e templates.
- Mais UX premium no catalogo e no preview documental.
- Dashboard executivo para dono da empresa, nao so para operador.
- Biblioteca de evidencias minimas por familia.

## Como Eu Redesenharia a Primeira Experiencia

Primeira tela ideal para um cliente WF:

- Topo: nome da empresa, plano, emissao mensal usada e status de operacao.
- Bloco principal: `Iniciar servico`.
- Cards objetivos: `RTI`, `PIE`, `NR13`, `NR35`, `NR33`, `NR12`.
- Area lateral: `Pendencias`, `Aguardando mesa`, `Prontos para emissao`.
- Busca: por cliente, ativo, TAG, unidade ou numero do laudo.
- CTA principal: `Nova inspecao`.
- CTA secundario: `Chat livre`.

Texto ideal: pouco, tecnico e acionavel.

Evitar:

- frases genericas de assistente;
- explicacoes longas;
- mostrar recursos internos;
- excesso de cards decorativos;
- termos como `familia`, `variant`, `release`, `runtime`, `governanca` para usuario de campo.

## Criterios De Aceite Para Eu Comprar

Eu compraria depois de ver:

- Um laudo completo emitido em fluxo real, com antes/depois do tempo.
- Pelo menos 3 servicos WF rodando de ponta a ponta.
- Mobile funcionando em campo com anexos e offline.
- Mesa devolvendo pendencia por bloco.
- PDF final com assinatura/signatario, hash/QR, pacote congelado e historico.
- Admin cliente mostrando produtividade, gargalos e usuarios.
- Prova de que o sistema nao inventa norma e preserva aprovacao humana.
- Visual limpo, rapido e objetivo.
- Treinamento de equipe em menos de 1 dia.

## Conclusao

O Tariel e tecnicamente mais forte do que a primeira tela aparenta. Como comprador, isso e ao mesmo tempo bom e perigoso: existe substancia, mas ela nao esta sendo vendida rapidamente pela experiencia.

Eu avancaria para piloto pago, nao para contrato amplo imediato. A prioridade nao e colocar mais texto na tela. A prioridade e transformar a experiencia inicial em uma mesa de operacao objetiva, com servicos WF claros, fluxo guiado, evidencias minimas, mesa, emissao e indicadores de prazo.

Se o objetivo e convencer uma empresa como a WF, o sistema precisa abrir dizendo com acao e dados: "escolha o servico, colete as evidencias certas, reduza retrabalho, envie para revisao e emita com seguranca".
