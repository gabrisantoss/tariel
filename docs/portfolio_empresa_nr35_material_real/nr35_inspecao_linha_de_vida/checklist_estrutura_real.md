# Checklist Estrutural Real · NR35 Linha de Vida

Data de consolidacao: `2026-04-22`
Familia: `nr35_inspecao_linha_de_vida`

## Fonte usada

- 3 laudos reais em `xlsx + fotos`, cobrindo `Aprovado`, `Pendente` e `Reprovado`
- norma recebida localmente: `NR35 (TRABALHO EM ALTURA).pdf`
- contrato canonico atual da familia em `docs/family_schemas/nr35_inspecao_linha_de_vida.*`

## Objetivo

Transformar a estrutura recorrente do laudo real em um checklist objetivo para orientar:

- schema da familia
- schema da IA
- report pack guiado
- renderizacao do PDF final

## Regra de uso

- usar este checklist como referencia estrutural da familia
- nao copiar literalmente os textos do cliente para o produto
- tratar a norma e os exemplos reais como base para contrato e nao como prompt solto

## Estrutura valida do laudo real

Os exemplos reais mostraram um esqueleto estavel:

1. identificacao documental e capa
2. sumario
3. consideracoes iniciais
4. identificacao da vistoria
5. objeto da inspecao
6. registros fotograficos
7. metodologia
8. instrumentos utilizados
9. aviso importante
10. conclusao
11. proxima inspecao periodica
12. observacoes

## Campos obrigatorios

### Identificacao documental

- `unidade`
  origem real: cabecalho e identificacao
  binding atual sugerido: `identificacao.unidade_operacional`
- `local`
  origem real: cabecalho e cidade/UF
  binding atual sugerido: `identificacao.localizacao`
- `numero_laudo_fabricante`
  binding atual: `identificacao.numero_laudo_fabricante`
- `numero_laudo_inspecao`
  binding atual: `identificacao.numero_laudo_inspecao`
- `art_numero`
  binding atual: `identificacao.art_numero`
- `contratante`
  binding atual: `identificacao.contratante`
- `contratada`
  binding atual: `identificacao.contratada`
- `engenheiro_responsavel`
  binding atual: `identificacao.engenheiro_responsavel`
- `inspetor_lider`
  binding atual: `identificacao.inspetor_lider`
- `data_vistoria`
  binding atual: `identificacao.data_vistoria`

### Identificacao do objeto

- `objeto_principal`
  exemplo real: tag + descricao da linha
  binding atual: `identificacao.objeto_principal`
- `tipo_linha_de_vida`
  valores validos: `Vertical`, `Horizontal`, `Ponto de Ancoragem`
  binding atual: `objeto_inspecao.tipo_linha_de_vida`
- `escopo_inspecao`
  binding atual: `objeto_inspecao.descricao_escopo`

### Checklist tecnico

Cada item deve ser preenchido com `C`, `NC` ou `NA`.

- `fixacao_dos_pontos`
- `condicao_cabo_aco`
- `condicao_esticador`
- `condicao_sapatilha`
- `condicao_olhal`
- `condicao_grampos`

Bindings atuais:

- `checklist_componentes.fixacao_dos_pontos.condicao`
- `checklist_componentes.condicao_cabo_aco.condicao`
- `checklist_componentes.condicao_esticador.condicao`
- `checklist_componentes.condicao_sapatilha.condicao`
- `checklist_componentes.condicao_olhal.condicao`
- `checklist_componentes.condicao_grampos.condicao`

### Conclusao final

- `status_final`
  valores validos: `Aprovado`, `Reprovado`, `Pendente`
  binding atual: `conclusao.status`
- `observacao_final`
  binding atual: `conclusao.observacoes` e `conclusao.conclusao_tecnica`
- `proxima_inspecao_periodica`
  binding atual: `conclusao.proxima_inspecao_periodica`

## Campos opcionais, mas recorrentes

### Registros fotograficos

Os exemplos reais mostram recorrencia forte destes slots:

- `vista_geral`
- `ponto_superior`
- `ponto_inferior`

Slots opcionais recorrentes:

- `panoramica`
- `tag_identificacao`
- `identificacao_do_silo` ou outro contexto de restricao de acesso
- `detalhe_achado_principal`

Bindings atuais:

- `registros_fotograficos.referencias_texto`
- `registros_fotograficos.descricao`
- `evidencias_e_anexos.evidencia_principal`
- `evidencias_e_anexos.evidencia_complementar`

### Observacoes complementares

- `informacoes_de_campo`
  origem: relato da equipe em campo
  binding atual sugerido: `execucao_servico.condicoes_observadas`
- `recomendacoes`
  binding atual: `recomendacoes.texto`
- `observacoes_documentais`
  binding atual: `documentacao_e_registros.observacoes_documentais`

## Campos derivados

Esses campos nao devem depender so de texto livre; o sistema pode ou deve derivar parte deles.

- `status_operacional`
  esperado:
  - `aprovado` -> `liberado`
  - `reprovado` -> `bloqueio`
  - `pendente` -> `aguardando_reinspecao`
- `ha_pontos_de_atencao`
  derivado do checklist e da conclusao
- `resumo_componentes_avaliados`
  derivado do checklist preenchido
- `resumo_executivo`
  derivado de objeto + checklist + conclusao
- `liberado_para_uso`
  esperado:
  - `Aprovado` -> `sim`
  - `Reprovado` -> `nao`
  - `Pendente` -> `nao_avaliavel`

## Semantica obrigatoria dos estados

### Aprovado

- linha em conformidade com a `NR35`
- acessorios necessarios presentes
- condicao segura de uso
- checklist predominantemente `C`

### Reprovado

- irregularidade material confirmada
- ausencia, dano, inadequacao ou montagem incorreta de componente
- sistema sem condicao segura de uso
- existe motivo tecnico direto para reprovar

### Pendente

- inspeção inconclusiva
- acesso impossibilitado ou ativo nao totalmente verificavel
- nao deve ser tratado como simples `NC`
- exige condicao previa e reinspecao posterior
- checklist pode conter muitos `NA` legitimamente

## Regras operacionais que devem entrar no contrato

- `pendente` precisa carregar motivo de limitacao de inspecao
- `NA` em componentes nao implica automaticamente conformidade
- foto de contexto pode ser evidencia principal em caso pendente
- observacao final precisa explicar o porquê do status
- conclusao precisa ser coerente com checklist e fotos
- numero do laudo, referencia do fabricante e ART sao recorrentes demais para ficarem soltos

## Gaps atuais no contrato do projeto

### Schema da IA

O schema da IA de `NR35` ainda esta mais curto que o contrato documental real.

Falta aproximar melhor:

- `documentacao_e_registros`
- `metodologia_e_recursos`
- `nao_conformidades_ou_lacunas`
- `status_operacional`
- `limitacoes_de_inspecao`

### Report pack

Hoje o report pack ainda depende demais de inferencia por texto para:

- status final
- leitura de `C`, `NC`, `NA`
- observacao de conclusao

O alvo correto e consumir mais dado estruturado do guided draft e menos regex.

### Slots fotograficos

Hoje os slots base cobrem bem:

- `vista_geral`
- `ponto_superior`
- `ponto_inferior`

Mas o contrato deveria prever melhor:

- `tag_identificacao`
- `contexto_operacional`
- `achado_principal`
- `limitacao_de_acesso`

## Checklist de implementacao recomendado

1. alinhar o schema da IA de `NR35` ao contrato canonico da familia
2. explicitar `pendente` e `limitacao_de_inspecao` no `laudo_output`
3. ampliar os slots fotograficos opcionais da familia
4. reduzir inferencia textual no builder do report pack
5. recalibrar o `laudo_output_exemplo` com a linguagem real recorrente
6. so depois ajustar o template final e o PDF
