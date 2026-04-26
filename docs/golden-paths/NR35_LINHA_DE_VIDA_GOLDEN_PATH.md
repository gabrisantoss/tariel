# Golden Path NR35 Linha de Vida

Status: contrato funcional do piloto com validador PR 2, contrato Template/PDF PR 3, prompt IA PR 4, revisao estruturada JSON PR 5, PDF auditavel final PR 6, entrega oficial no Portal Cliente PR 7 e E2E governado PR 8 em runtime.

Familia: `nr35_inspecao_linha_de_vida`.

Template runtime: `nr35_linha_vida`.

Este documento registra a decisao funcional do piloto vendavel antes da implementacao completa. Ele nao muda comportamento de produto, nao relaxa gates e nao substitui validacao humana.

## Objetivo

Fechar o contrato funcional minimo para que a familia `nr35_inspecao_linha_de_vida` possa virar o primeiro golden path de laudo vendavel do Tariel.

O piloto deve provar um fluxo ponta a ponta em que o usuario cria ou abre um caso NR35, coleta dados e evidencias, recebe apoio da IA para preencher um JSON estruturado, passa por validacao estrita, segue para revisao humana, e gera um PDF oficial rastreavel para entrega no Portal Cliente.

## Por Que Esta Familia

`nr35_inspecao_linha_de_vida` foi escolhida porque ja existe base tecnica mais madura que a maioria das familias catalogadas:

- schema de familia em `docs/family_schemas/nr35_inspecao_linha_de_vida.json`;
- output seed em `docs/family_schemas/nr35_inspecao_linha_de_vida.laudo_output_seed.json`;
- output exemplo em `docs/family_schemas/nr35_inspecao_linha_de_vida.laudo_output_exemplo.json`;
- template master em `docs/family_schemas/nr35_inspecao_linha_de_vida.template_master_seed.json`;
- schema Pydantic proprio `RelatorioNR35LinhaVida`;
- alias runtime `nr35_linha_vida`;
- report pack semantico modelado;
- slots de imagem existentes;
- projecao PDF especifica;
- testes de schema, overlay, PDF, autonomia, catalogo, portal cliente e material de referencia.

A familia tambem tem menor dependencia externa que `nr13_inspecao_caldeira`, pois o piloto pode ser provado com inspecao visual, evidencias fotograficas e revisao humana, sem depender inicialmente de prontuario tecnico completo, memoria de calculo, historico de equipamento ou ensaios especializados.

## Fluxo Ponta A Ponta Esperado

1. Usuario cria ou abre um caso com familia `nr35_inspecao_linha_de_vida`.
2. Sistema preserva o binding do caso para `nr35_linha_vida` e captura snapshot de catalogo/template.
3. Usuario coleta os campos minimos do laudo no chat guiado ou fluxo equivalente.
4. Usuario anexa as 4 fotos obrigatorias do piloto.
5. IA analisa conversa, documentos e fotos disponiveis.
6. IA preenche um JSON estruturado NR35, sem inventar dados ausentes.
7. Sistema valida o JSON contra contrato estrito da familia.
8. Sistema bloqueia PDF oficial se faltarem campos obrigatorios ou evidencias minimas.
9. Humano revisa e pode editar o JSON antes da emissao.
10. Mesa aprova, rejeita ou devolve para correcao.
11. Sistema gera PDF oficial a partir do JSON validado e aprovado.
12. PDF cita evidencias/fotos usadas para sustentar achados e conclusao.
13. Portal Cliente exibe status final e permite download do PDF oficial.
14. Auditoria registra template version, schema version, fotos, achados, aprovacao e emissao.

## Campos Obrigatorios Do Laudo

Campos minimos propostos para o piloto vendavel:

- `family_key`: deve ser `nr35_inspecao_linha_de_vida`.
- `template_code`: deve apontar para a familia/template NR35 escolhido.
- `case_context.laudo_id`.
- `case_context.empresa_nome`.
- `case_context.tipo_inspecao`.
- `case_context.data_execucao` ou `identificacao.data_vistoria`.
- `case_context.data_emissao` antes da emissao oficial.
- `identificacao.objeto_principal`.
- `identificacao.localizacao`.
- `identificacao.referencia_principal`.
- `identificacao.codigo_interno` ou justificativa de ausencia.
- `identificacao.tipo_sistema`.
- `objeto_inspecao.descricao_escopo`.
- `objeto_inspecao.tipo_linha_de_vida`.
- `objeto_inspecao.resumo_componentes_avaliados`.
- `escopo_servico.tipo_entrega`.
- `escopo_servico.modo_execucao`.
- `execucao_servico.metodo_aplicado`.
- `execucao_servico.condicoes_observadas`.
- `execucao_servico.evidencia_execucao`.
- `metodologia_e_recursos.metodologia`.
- `registros_fotograficos`.
- `evidencias_e_anexos.evidencia_principal`.
- `checklist_componentes.fixacao_dos_pontos.condicao`.
- `checklist_componentes.condicao_cabo_aco.condicao`.
- `checklist_componentes.condicao_esticador.condicao`.
- `checklist_componentes.condicao_sapatilha.condicao`.
- `checklist_componentes.condicao_olhal.condicao`.
- `checklist_componentes.condicao_grampos.condicao`.
- `nao_conformidades_ou_lacunas.ha_pontos_de_atencao`.
- `conclusao.status`.
- `conclusao.status_operacional`.
- `conclusao.conclusao_tecnica`.
- `conclusao.justificativa`.
- `conclusao.liberado_para_uso`.
- `conclusao.acao_requerida`.
- `conclusao.proxima_inspecao_periodica` ou justificativa de nao aplicabilidade.
- `mesa_review.status` antes da emissao oficial.

Valores aceitos de status funcional para o piloto:

- `Aprovado`;
- `Pendente`;
- `Reprovado`.

## Evidencias E Fotos Obrigatorias

Decisao do piloto: manter 4 fotos obrigatorias.

Fotos obrigatorias:

1. `foto_visao_geral`: visao geral da linha de vida.
2. `foto_extremidade_principal`: ponto ou ancoragem superior, ou extremidade principal.
3. `foto_extremidade_secundaria`: ponto ou ancoragem inferior, ou extremidade secundaria.
4. `foto_detalhe_critico`: detalhe tecnico relevante, como fixacao, conector, cabo, tensionador, absorvedor, corrosao, identificacao ou nao conformidade.

Regras:

- cada foto obrigatoria precisa ter referencia persistida, legenda tecnica e vinculo com um campo do JSON;
- uma mesma imagem nao deve satisfazer dois slots obrigatorios sem justificativa humana explicita;
- fotos de baixa qualidade, sem foco, sem contexto ou sem relacao clara com a linha de vida devem cair para revisao humana;
- documentos podem complementar, mas nao substituem as fotos obrigatorias do piloto;
- texto sozinho nao satisfaz evidencia fotografica obrigatoria.

## Decisao 4 Fotos Vs 3 Fotos

O schema da familia declara `minimum_evidence.fotos = 4`.

Alinhamento PR 2: o report pack NR35 passou a modelar 4 slots fotograficos obrigatorios em `_NR35_IMAGE_SLOTS`:

- `foto_visao_geral`;
- `foto_ponto_superior`, mantendo compatibilidade runtime com extremidade principal;
- `foto_ponto_inferior`, mantendo compatibilidade runtime com extremidade secundaria;
- `foto_detalhe_critico`.

Decisao funcional: o golden path vendavel segue 4 fotos obrigatorias.

O validador PR 2 bloqueia emissao oficial quando qualquer slot obrigatorio estiver ausente, pendente ou sem referencia persistida. O runtime preserva os nomes historicos `foto_ponto_superior` e `foto_ponto_inferior` para evitar quebra de compatibilidade, mas o contrato funcional continua descrevendo esses slots como extremidade principal e extremidade secundaria.

## Politica Mesa Required

Decisao do piloto: `mesa_required`.

Mesmo que o runtime atual tenha caminhos de `mobile_autonomous`, o piloto vendavel NR35 Linha de Vida deve exigir revisao humana final pela Mesa antes de PDF oficial.

Motivos:

- a responsabilidade tecnica final e humana;
- a IA pode preencher e sugerir, mas nao deve validar sozinha;
- o quarto slot fotografico agora esta alinhado no report pack e congelado no manifesto auditavel da emissao oficial;
- a validacao estrita NR35 existe como bloqueio de emissao oficial, mas a revisao estruturada ainda precisa de UI propria;
- o PDF oficial precisa sair de JSON validado e aprovado.

## Criterios Para IA Preencher JSON

A IA pode preencher o JSON estruturado quando:

- o caso estiver vinculado a `nr35_inspecao_linha_de_vida`;
- houver historico de conversa suficiente para identificar escopo, ativo, local e status;
- as fotos obrigatorias estiverem anexadas ou a ausencia estiver marcada como pendencia bloqueante;
- a IA conseguir citar quais evidencias sustentam cada achado relevante;
- campos ausentes forem deixados como pendencia, nao inventados;
- conclusao, status operacional e acao requerida forem coerentes com achados e evidencias;
- qualquer incerteza relevante for marcada para revisao humana.

A IA nao pode:

- trocar silenciosamente a familia do laudo;
- criar numero de ART, CREA, documento, codigo interno ou data sem fonte;
- declarar conformidade sem evidencia visual/documental suficiente;
- usar uma foto sem referencia rastreavel;
- liberar PDF oficial sem validacao humana.

## Criterios Para Bloqueio De PDF

O PDF oficial deve ser bloqueado quando:

- `family_key` nao for `nr35_inspecao_linha_de_vida`;
- faltarem campos obrigatorios do JSON;
- faltarem as 4 fotos obrigatorias;
- algum slot fotografico nao tiver referencia persistida;
- conclusao estiver ausente, incoerente ou sem justificativa;
- houver nao conformidade sem acao requerida;
- houver status `Pendente` sem limitacao ou pendencia descrita;
- houver conflito entre achado, conclusao e liberacao para uso;
- Mesa nao tiver aprovado;
- nao houver template version e schema version no pacote;
- nao houver trilha de auditoria minima.

## Criterios Para Revisao Humana

O humano deve conseguir:

- visualizar o JSON estruturado NR35 antes do PDF oficial;
- editar campos obrigatorios e opcionais;
- ver faltas de evidencia e campos incompletos;
- ver quais fotos sustentam cada achado;
- alterar status e conclusao com justificativa;
- devolver para o inspetor quando faltar evidencia;
- registrar override humano quando insistir em decisao divergente da recomendacao tecnica.

## Criterios Para Aprovacao Mesa

A Mesa pode aprovar apenas quando:

- validacao estrita NR35 estiver verde;
- 4 fotos obrigatorias estiverem presentes e vinculadas;
- conclusao estiver coerente com achados e evidencias;
- campos obrigatorios estiverem preenchidos ou justificados;
- PDF preview ou payload final estiver consistente com o JSON validado;
- pendencias criticas estiverem resolvidas;
- signatario/responsavel tecnico aplicavel estiver definido quando exigido para emissao.

Se qualquer criterio falhar, a Mesa deve rejeitar/devolver com motivo e pendencias acionaveis.

## Criterios Para Entrega No Portal Cliente

O Portal Cliente deve:

- exibir status do caso/laudo;
- distinguir rascunho, em revisao, aprovado, emitido e devolvido;
- permitir download somente do PDF/pacote oficial NR35 quando existir `EmissaoOficialLaudo` ativa com manifest `nr35_official_pdf`;
- mostrar numero/identificador da emissao quando existir;
- mostrar data de emissao, status Mesa, familia/template, `template_version`, `schema_version`, hash do pacote e hash do PDF principal;
- preservar historico de versoes ou reemissoes;
- avisar quando o caso ainda e rascunho, esta em revisao ou aguarda emissao oficial;
- impedir edicao indevida por perfil sem permissao;
- expor anexos/evidencias apenas conforme politica do tenant;
- registrar auditoria de acesso/download quando aplicavel.

No PR 7, a entrega oficial NR35 fica exposta pela superficie `Documentos` do Portal Cliente. O payload de bootstrap inclui `emissao_oficial` com status, hashes, versoes e URLs apenas quando a emissao oficial ativa esta completa, inclui `historico_emissoes` com metadados sanitizados das emissoes do laudo, e inclui `nr35` com `slots_fotograficos = 4`, `manifest_ok` e `auditavel`. Os endpoints de download sao escopados por tenant e exigem o bloco `nr35_official_pdf` no registro oficial; rascunhos e emissoes sem manifest NR35 nao recebem links oficiais.

## Rastreabilidade Exigida

O golden path exige rastreabilidade minima:

`foto -> achado -> campo JSON -> secao PDF -> decisao Mesa -> emissao oficial`

Para cada foto usada no laudo final, o sistema deve conseguir responder:

- qual arquivo/anexo foi usado;
- qual slot fotografico ele satisfaz;
- qual campo JSON recebeu a evidencia;
- qual achado/conclusao depende dela;
- em qual secao do PDF ela aparece ou e citada;
- quem aprovou a decisao;
- qual versao de template/schema estava ativa;
- qual emissao oficial incluiu essa evidencia.

## Contrato Template E PDF PR 3

O PR 3 formaliza o contrato de template e PDF sem implementar o prompt IA completo:

- `schema_version` e `template_version` ficam explicitos no `laudo_output`;
- `pdf_contract` declara secoes minimas, fotos obrigatorias, `mesa_required` e cadeia de rastreabilidade;
- `auditoria` registra familia, template, schema, status Mesa e regra de emissao;
- `registros_fotograficos.slots_obrigatorios` passa a listar as 4 fotos com `slot`, referencia persistida, legenda tecnica, campo JSON, achado relacionado e secao PDF;
- a projecao PDF NR35 materializa esse contrato em `document_projection.nr35_pdf_contract`;
- o template master expõe os campos de contrato PDF e auditoria no bloco final de anexos/referencias.

Secoes minimas do PDF NR35:

- capa;
- controle documental/sumario;
- identificacao do laudo;
- escopo e objeto;
- metodologia;
- registro fotografico;
- checklist tecnico;
- achados e nao conformidades;
- conclusao tecnica;
- revisao Mesa;
- responsabilidade tecnica;
- auditoria.

Matriz Template/PDF:

| Campo/Secao | Existe no template | Exigido pelo validador | Aparece no PDF | Falta melhorar |
|---|---|---|---|---|
| `schema_version` | Sim | Indiretamente no contrato de emissao | Sim, via contrato/auditoria | Travar versionamento semantico quando houver migracao v2 |
| `template_version` | Sim | Indiretamente no contrato de emissao | Sim, via contrato/auditoria | Automatizar incremento quando template master mudar |
| `family_key` / `template_code` | Sim | Sim | Sim | Nenhum gap P0 |
| `case_context` | Sim | Sim | Sim | PR 5 expõe origem de dados na revisao estruturada |
| `identificacao` | Sim | Sim | Sim | Nenhum gap P0 |
| `objeto_inspecao` / `escopo_servico` | Sim | Sim | Sim | Nenhum gap P0 |
| `metodologia_e_recursos` | Sim | Sim | Sim | PR 4 instrui a IA a marcar pendencia quando instrumento nao tiver fonte |
| 4 fotos obrigatorias | Sim, `slots_obrigatorios` | Sim | Sim, via registros/projecao | Render final ainda precisa posicionar imagens reais |
| Rastreabilidade foto -> campo -> secao | Sim | Sim para emissao oficial | Sim, via contrato/projecao | PR 6 congela no manifesto oficial |
| Checklist componentes | Sim | Sim | Sim | PR 5 expõe edicao estruturada no backend |
| Achados/nao conformidades | Sim | Sim quando houver NC/pendencia | Sim | PR 4 cria contrato de prompt; analise visual real segue pendente |
| Conclusao | Sim | Sim | Sim | Nenhum gap P0 |
| Mesa | Sim | Sim para PDF oficial | Sim | PR 5 bloqueia aprovacao quando o nivel `mesa` falha |
| Responsabilidade tecnica | Sim | Requisito de emissao | Sim | PR 6 congela signatario/pacote; PR 7 expõe entrega |
| Auditoria | Sim | Requisito de emissao | Sim | PR 6 registra hash/versao em pacote oficial |

## Prompt IA NR35 PR 4

O PR 4 cria o contrato de prompt especializado sem liberar PDF oficial e sem substituir a Mesa:

- `web/app/domains/chat/nr35_linha_vida_prompt.py` centraliza a instrucao de sistema, instrucao final de usuario e normalizacao pos-IA para a familia `nr35_inspecao_linha_de_vida`;
- `ClienteIA.gerar_json_estruturado` recebe parametros opcionais de `template_key`, `catalog_family_key`, `report_pack_draft` e contexto estruturado para ativar o prompt apenas no alias `nr35_linha_vida`;
- a IA deve preencher apenas a familia NR35 Linha de Vida, manter `mesa_review.status = pendente`, nunca declarar PDF oficial liberado e nunca criar ART, CREA, codigo interno, data, responsavel tecnico ou numero de laudo sem fonte;
- as 4 fotos obrigatorias entram no prompt a partir do `report_pack.image_slots`; slots ausentes ou sem referencia persistida viram pendencia estruturada em `ia_assessment.pendencias`;
- a normalizacao pos-IA preserva `pdf_contract`, `auditoria`, `registros_fotograficos.slots_obrigatorios`, versoes de schema/template e bloqueio de emissao oficial;
- quando houver pendencia ou nao conformidade sem `acao_requerida`, a normalizacao marca `pendente_revisao_humana` em vez de inventar uma acao tecnica definitiva.

Regras explicitas de imagem para a IA:

- usar somente fotos com referencia persistida;
- marcar `pendente` quando a foto nao for clara ou nao mostrar o componente;
- nao usar foto fraca como prova forte;
- exigir legenda tecnica por slot;
- usar `foto_detalhe_critico` para componente, risco, nao conformidade ou identificacao relevante;
- nao reutilizar a mesma imagem em multiplos slots sem justificativa humana.

O output completo da IA pode passar no validador em nivel `mesa`, mas continua bloqueado para `official_pdf` enquanto a Mesa humana nao aprovar.

## Revisao Estruturada JSON PR 5

O PR 5 cria o contrato backend minimo para revisao humana do JSON NR35 antes da aprovacao Mesa:

- o JSON candidato/final fica em `laudo.dados_formulario`;
- evidencias, slots fotograficos e curadoria continuam em `laudo.report_pack_draft_json`;
- a revisao estruturada e armazenada em `dados_formulario.nr35_structured_review`;
- snapshots humanos sao versionados em `laudo_revisoes` com origem `humano_nr35` quando a edicao passa por banco;
- o PDF/projecao continua lendo `dados_formulario` e `report_pack_draft_json`, mas `official_pdf` so passa quando a Mesa marcar aprovacao humana.

Endpoints minimos da Mesa:

- `GET /revisao/api/laudo/{laudo_id}/nr35/revisao-estruturada`: retorna JSON candidato, validacoes `mesa` e `official_pdf`, pendencias por bloco e historico de alteracoes humanas;
- `PATCH /revisao/api/laudo/{laudo_id}/nr35/revisao-estruturada`: aplica edicoes por caminho, exige justificativa humana, registra diff e revalida o payload.

Blocos de pendencia:

- `identificacao`;
- `objeto_inspecao`;
- `evidencias_fotos`;
- `checklist_componentes`;
- `achados`;
- `nao_conformidades`;
- `conclusao`;
- `mesa`;
- `pdf_auditoria`.

Cada alteracao humana registra:

- caminho do campo;
- alvo (`payload` ou `report_pack`);
- valor anterior;
- valor novo;
- usuario/revisor;
- justificativa;
- data/hora;
- codigos de pendencia resolvidos quando a revalidacao remove o erro.

A aprovacao Mesa agora chama o validador NR35 em nivel `mesa` antes de gravar `Aprovado`. Se houver pendencia de campo, foto, checklist, conclusao ou familia/template, a aprovacao falha com `nr35_structured_review_pending`. A marcacao de Mesa aprovada e feita somente por fluxo humano e grava `mesa_review.aprovacao_origem = mesa_humana`; a IA continua impedida de aprovar Mesa.

## PDF Auditavel Final PR 6

O PR 6 consolida a emissao oficial NR35 como pacote auditavel:

- a emissao oficial exige snapshot aprovado da Mesa em `laudo_approved_case_snapshots`;
- o JSON fonte do PDF oficial vem de `ApprovedCaseSnapshot.laudo_output_snapshot.dados_formulario`;
- o report pack/fotos fonte vem de `ApprovedCaseSnapshot.laudo_output_snapshot.report_pack_draft`;
- se o JSON ou report pack atual divergir do snapshot aprovado, a emissao oficial bloqueia;
- o validador `official_pdf` exige `mesa_review.aprovacao_origem = mesa_humana` e bloqueia aprovacao por IA;
- o validador `official_pdf` exige `template_version`, `schema_version`, 12 secoes minimas de PDF, 4 fotos, legenda tecnica e rastreabilidade foto -> campo JSON -> achado -> secao PDF;
- o pacote oficial inclui `governanca/nr35_official_pdf_manifest.json`;
- o pacote oficial inclui `documento/nr35_dados_formulario_aprovado.json`;
- o pacote oficial inclui `documento/nr35_report_pack_aprovado.json`;
- o pacote oficial inclui `governanca/nr35_revisao_humana_changelog.json`;
- `manifest.json` e `EmissaoOficialLaudo.issue_context_json` carregam o bloco `nr35_official_pdf`;
- o hash do PDF principal entra em `primary_pdf_artifact.sha256` quando o arquivo material esta no storage;
- o hash do pacote oficial continua em `EmissaoOficialLaudo.package_sha256`.

O manifesto NR35 registra:

- `family_key`, `template_code`, `schema_version` e `template_version`;
- 12 secoes obrigatorias do PDF;
- 4 slots fotograficos com referencia persistida, legenda, campo JSON, achado e secao PDF;
- snapshot aprovado, versao de aprovacao, hash do snapshot e hashes do JSON/report pack aprovados;
- status Mesa, origem humana da aprovacao e usuario/data da aprovacao;
- resumo das edicoes humanas do PR 5;
- resultado da validacao `official_pdf`;
- artefato PDF principal e hash quando disponivel.

## Portal Cliente Entrega Oficial PR 7

O PR 7 consolida a entrega oficial NR35 no Portal Cliente:

- `surface=documentos` passa a expor `emissao_oficial` com status, numero de emissao, data, status Mesa, hashes, `template_version`, `schema_version` e URLs oficiais quando disponiveis;
- `surface=documentos` passa a expor `nr35` com `slots_fotograficos`, slots sanitizados, `manifest_ok` e `auditavel`;
- downloads de PDF e pacote oficial usam endpoints NR35 escopados por tenant;
- os endpoints exigem `EmissaoOficialLaudo` ativa e bloco `nr35_official_pdf` no `issue_context_json`;
- o historico de emissoes exposto ao cliente contem numero, estado, data, hashes e versoes, sem caminhos internos ou JSON bruto;
- rascunho, revisao em andamento ou emissao sem manifest NR35 nao recebem `download_pdf_url` nem `download_package_url`;
- o frontend da aba Documentos mostra a entrega auditavel, versoes e hashes curtos sem expor JSON bruto sensivel.

## E2E Golden Path PR 8

O PR 8 consolida um teste de integracao ponta a ponta controlado para o piloto NR35:

- o tenant e configurado com pacote `inspector_chat_mesa`, release ativo da familia `nr35_inspecao_linha_de_vida`, template runtime `nr35_linha_vida`, capability de Mesa/emissao e signatario governado elegivel;
- o caso NR35 usa fixture estruturada de IA sem chamada externa, 4 fotos obrigatorias e `foto_detalhe_critico`;
- a revisao estruturada humana aplica diff com justificativa, revalida nivel `mesa` e grava aprovacao Mesa com `aprovacao_origem = mesa_humana`;
- `ApprovedCaseSnapshot` congela JSON e report pack aprovados antes da emissao;
- `emitir_oficialmente_transacional` cria `EmissaoOficialLaudo.issue_state = issued`, `issue_number`, `package_sha256`, `primary_pdf_sha256` e bloco `nr35_official_pdf`;
- o ZIP oficial contem manifest, dados aprovados, report pack aprovado, changelog humano e PDF principal;
- o Portal Cliente so mostra links oficiais depois da `EmissaoOficialLaudo` ativa;
- outro tenant recebe 404 nos downloads do PDF/pacote oficial;
- cenarios negativos cobrem PDF operacional sem emissao, 3 fotos, Mesa nao humana e ausencia de signatario governado.

## Mapa Atual No Codigo

| Item | Estado atual | Decisao para o piloto | Arquivo/fonte | Proxima acao |
|---|---|---|---|---|
| Schema NR35 | Alinhado em PR 3 | Fonte do contrato de familia, fotos e secoes PDF | `docs/family_schemas/nr35_inspecao_linha_de_vida.json` | PR 6 consome no manifesto oficial |
| Output seed | Alinhado em PR 3 | Base de campos esperados, contrato PDF e auditoria | `docs/family_schemas/nr35_inspecao_linha_de_vida.laudo_output_seed.json` | PR 3/4 devem manter compatibilidade |
| Output exemplo | Alinhado em PR 3 | Exemplo com 4 fotos rastreadas | `docs/family_schemas/nr35_inspecao_linha_de_vida.laudo_output_exemplo.json` | PR 6 prova manifesto auditavel com exemplo aprovado |
| Template master | Alinhado em PR 3 | Expor contrato PDF, fotos e auditoria | `docs/family_schemas/nr35_inspecao_linha_de_vida.template_master_seed.json` | PR 6 valida emissao a partir do JSON aprovado |
| Schema Pydantic IA | Existe | Manter como contrato de saida da IA, mas complementar com validacao estrita | `web/app/domains/chat/templates_ai.py::RelatorioNR35LinhaVida` | PR 2 deve criar validacao de negocio alem do Pydantic |
| Alias runtime | Existe | `nr35_linha_vida` permanece alias operacional | `web/app/domains/chat/normalization.py`; `web/app/domains/chat/templates_ai.py` | PR 2 deve garantir que alias nao troca familia |
| Validador NR35 | Existe em PR 2 | Aplicar validacao estrita antes de emissao oficial | `web/app/domains/chat/nr35_linha_vida_validation.py` | PR 3/4 devem conectar IA e revisao estruturada ao mesmo contrato |
| Report pack NR35 | Alinhado em PR 2 | Deve operar em `mesa_required` no piloto vendavel | `web/app/domains/chat/report_pack_helpers.py`; `web/app/domains/chat/report_pack_semantic_builders.py` | PR 6 congela evidencias aprovadas no pacote |
| Slots de imagem | Alinhado em PR 2 | 4 fotos obrigatorias no runtime | `_NR35_IMAGE_SLOTS` em `web/app/domains/chat/report_pack_semantic_builders.py` | PR 6 registra os 4 slots no manifesto oficial |
| Contrato PDF NR35 | Existe em PR 3 | Seções minimas, 4 fotos, versoes, Mesa e auditoria | `web/app/domains/chat/nr35_linha_vida_pdf_contract.py`; `web/app/domains/chat/catalog_pdf_family_projections/nr35.py` | PR 6 congela manifesto oficial |
| Prompt IA NR35 | Existe em PR 4 | IA preenche JSON sem inventar dados, cita fotos e mantem Mesa pendente | `web/app/domains/chat/nr35_linha_vida_prompt.py`; `web/nucleo/cliente_ia.py` | PR 5 expõe revisao estruturada do JSON gerado |
| Revisao estruturada NR35 | Existe em PR 5 | Humano edita JSON, justifica alteracoes, ve pendencias por bloco e revalida | `web/app/domains/chat/nr35_linha_vida_structured_review.py`; `web/app/domains/revisor/mesa_api.py` | PR 6 inclui changelog humano no pacote oficial |
| Projecao PDF NR35 | Alinhada em PR 3 | PDF oficial deve sair do JSON validado e citar evidencias | `web/app/domains/chat/catalog_pdf_family_projections/nr35.py` | PR 6 registra contrato no manifesto; render visual real segue sem reescrita |
| Gate de qualidade | Parcial | Deve bloquear PDF oficial se faltarem campos/evidencias | `web/app/domains/chat/gate_helpers.py`; `web/app/domains/chat/nr35_linha_vida_validation.py` | PR 5 expõe pendencias estruturadas no backend da Mesa |
| Finalizacao | Alinhada em PR 2 para NR35 | Para piloto, finalizacao encaminha para Mesa | `web/app/domains/chat/laudo_decision_services.py`; `web/app/domains/chat/report_pack_semantic_builders.py` | PR 6 consome snapshot aprovado no pacote oficial |
| Mesa | Alinhada em PR 5 | Mesa aprova apenas se o nivel `mesa` passar | `web/app/domains/revisor/mesa_api.py`; `web/app/domains/revisor/service_messaging.py` | PR 6 exige origem `mesa_humana` para emissao |
| Emissao oficial | Alinhada em PR 6 | Emissao registra template/schema/fotos/aprovacao | `web/app/domains/chat/laudo.py`; `web/app/shared/official_issue_package.py`; `web/app/domains/revisor/service_package.py`; `web/app/shared/db/models_review_governance.py` | PR 7 deve expor entrega no Portal Cliente |
| Portal Cliente | Alinhado em PR 7 | Cliente ve status final, hashes, versoes e baixa apenas PDF/pacote oficial aprovado | `web/app/domains/cliente/dashboard_bootstrap_support.py`; `web/app/domains/cliente/chat_routes.py`; `web/static/js/cliente/portal_documentos_surface.js` | PR 8 deve cobrir ponta a ponta |
| Testes NR35 | E2E PR 8 adicionado | Manter cobertura incremental do golden path | `web/tests/test_nr35_golden_path_official_issue_e2e.py`; `web/tests/test_nr35_official_pdf_issue.py`; `web/tests/test_cliente_portal_critico.py`; `web/tests/test_nr35_linha_vida_validation.py`; `web/tests/test_nr35_structured_review.py`; `web/tests/test_nr35_linha_vida_prompt.py`; `web/tests/test_nr35_template_pdf_contract.py` | Proximo recorte deve cobrir reemissao e auditoria de download |

## Aceite Do Golden Path

O piloto NR35 sera considerado funcionalmente completo quando:

- usuario criar ou abrir caso NR35;
- usuario anexar as 4 fotos obrigatorias;
- IA analisar as fotos e conversa;
- IA preencher JSON estruturado NR35;
- JSON passar em validacao estrita;
- humano conseguir revisar e editar;
- Mesa aprovar;
- PDF oficial for gerado a partir do JSON validado;
- PDF citar evidencias/fotos;
- Portal Cliente exibir status e permitir download;
- auditoria registrar template version, schema version, fotos, achados, aprovacao e emissao.

## Testes Necessarios

Testes de contrato e schema:

- schema NR35 declara `minimum_evidence.fotos = 4`;
- report pack, gate e documentacao concordam com 4 fotos obrigatorias;
- alias `nr35_linha_vida` resolve para `nr35_inspecao_linha_de_vida`;
- IA usa `RelatorioNR35LinhaVida` para `nr35_linha_vida`;
- prompt NR35 especializado e ativado apenas para `nr35_linha_vida`;
- IA mockada com 4 fotos gera JSON que passa no nivel `mesa`;
- IA mockada com 3 fotos gera pendencia estruturada e bloqueia PDF oficial;
- IA nao inventa ART, CREA, codigo interno, data ou aprovacao Mesa;
- revisao estruturada agrupa pendencias por bloco;
- edicao humana exige justificativa e registra diff;
- correcao humana revalida e remove pendencia;
- aprovacao Mesa falha se o nivel `mesa` ainda tiver pendencias;
- JSON sem campos obrigatorios falha validacao estrita;
- JSON sem 4 fotos falha validacao estrita;
- JSON com conclusao incoerente falha validacao estrita.

Testes de fluxo:

- caso NR35 criado preserva `catalog_family_key`;
- coleta com 3 fotos permanece bloqueada;
- coleta com 4 fotos e campos minimos segue para Mesa;
- Mesa consegue revisar/editar/aprovar;
- PDF oficial so e gerado apos aprovacao;
- PDF inclui referencias das fotos;
- Portal Cliente mostra emitido e permite download;
- auditoria registra versoes, fotos, achados e emissao.

Testes existentes relevantes:

- `web/tests/test_catalog_nr35_overlay.py`;
- `web/tests/test_templates_ia_nr35.py`;
- `web/tests/test_semantic_report_pack_nr35_autonomy.py`;
- `web/tests/test_catalog_pdf_templates.py`;
- `web/tests/test_regras_rotas_criticas.py`;
- `web/tests/test_material_reference_packages.py`;
- `web/tests/test_catalog_document_contract.py`;
- `web/tests/test_cliente_portal_critico.py`;
- `web/tests/test_guided_template_governance.py`;
- `web/tests/test_inspection_entry_mode_phase_d_mobile.py`.

## Plano De PRs Subsequentes

PR 2 - Validador NR35:

- criar validador estrito da familia;
- alinhar 4 fotos obrigatorias;
- bloquear PDF oficial quando faltar campo/evidencia;
- manter politica `mesa_required` para piloto vendavel.

PR 3 - Template e Contrato PDF NR35:

- fortalecer template JSON;
- explicitar 12 secoes minimas do PDF;
- ligar 4 fotos a campo JSON, achado e secao PDF;
- preservar auditoria e versoes.

PR 4 - Prompt IA NR35:

- separar prompt de analise NR35;
- exigir saida estruturada com evidencias citadas;
- registrar incerteza e pendencias;
- impedir preenchimento inventado.

PR 5 - Revisao Estruturada JSON:

- concluido localmente: expor JSON NR35 para humano/Mesa;
- concluido localmente: permitir correcao por caminho de campo;
- concluido localmente: registrar alteracoes, justificativas e pendencias resolvidas;
- pendente para UI futura: devolver para inspetor com pendencias acionaveis em tela dedicada.

PR 6 - PDF Auditavel NR35:

- concluido localmente: usar snapshot aprovado como fonte do JSON/report pack oficial;
- concluido localmente: congelar manifesto NR35 com 12 secoes, 4 fotos, versoes, Mesa, hash e changelog humano;
- concluido localmente: bloquear emissao se Mesa nao for humana, se faltar snapshot ou se o payload atual divergir do aprovado;
- gap restante: render visual final ainda usa motor atual de PDF/pacote; posicionamento visual refinado das imagens fica para evolucao posterior.

PR 7 - Portal Cliente Entrega Oficial:

- concluido localmente: exibir status final, Mesa, familia/template, versoes e hashes no payload `surface=documentos`;
- concluido localmente: permitir download do PDF e pacote oficial NR35 apenas com `EmissaoOficialLaudo` ativa e manifest `nr35_official_pdf`;
- concluido localmente: preservar rascunhos/em revisao sem links oficiais;
- concluido localmente: respeitar escopo de tenant nos endpoints de download.

PR 8 - E2E Golden Path NR35:

- concluido localmente: criar teste ponta a ponta NR35 controlado;
- concluido localmente: cobrir tenant governado, coleta, 4 fotos, IA fixture/mockada, validacao, revisao humana, Mesa humana, snapshot aprovado, PDF, emissao oficial, Portal Cliente, manifest/hash e tenant boundary;
- concluido localmente: cobrir negativos para PDF operacional nao oficial, 3 fotos, Mesa nao humana e ausencia de signatario governado;
- gap restante: reemissao, auditoria de download e polimento visual do Portal Cliente ficam para recortes posteriores.

## Fora De Escopo Nesta Tarefa

- implementar novo gerador de PDF;
- alterar mobile smoke, Maestro ou `human_ack`;
- alterar templates sem decisao explicita;
- alterar release gate;
- relaxar qualquer gate;
- habilitar autonomia sem Mesa para o piloto vendavel.
