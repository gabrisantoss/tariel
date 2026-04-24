# 134 — Verticalização do Portal Cliente para o modelo WF

Atualizado em `2026-04-23`.

## Objetivo

Transformar o `portal admin-cliente` de console operacional transversal em portal verticalizado para cliente industrial, com leitura por:

- serviço contratado;
- ativo/local funcional;
- documento formal;
- recorrência/vencimento.

O alvo não é substituir o núcleo atual de `chat`, `mesa`, `auditoria` e `diagnóstico`.
O alvo é adicionar uma camada de negócio que um comprador como a `WF` espera encontrar.

## Princípios

1. Não quebrar o portal atual.
2. Reusar `tenant`, `laudo`, `auditoria` e pipeline documental existentes.
3. Introduzir novas superfícies como leitura orientada a negócio, não como cópia das telas já existentes.
4. Cada nova superfície precisa ter rota, payload e critério de pronto explícitos.

## Épico 1 — Serviços

### Pergunta de negócio

"Quais serviços a Tariel presta para a minha empresa, em que status cada um está, quais unidades estão cobertas e o que está pendente?"

### UI esperada

Aba principal `Serviços` com:

- grade de serviços contratados;
- cards por família de serviço;
- status por serviço;
- unidades cobertas;
- responsável técnico principal;
- atalhos para documentos, ativos e próximos vencimentos.

### Seções mínimas

- `Visão geral`
- `Serviços contratados`
- `Pendências por serviço`
- `Próximas entregas`

### Serviços iniciais sugeridos

- `RTI`
- `SPDA`
- `PIE`
- `LOTO`
- `NR12`
- `NR13`
- `NR33`
- `NR35`
- `AVCB`
- `END`

### Rotas sugeridas

- `GET /cliente/servicos`
- `GET /cliente/api/servicos/bootstrap`
- `GET /cliente/api/servicos/{service_key}`

### Payload inicial sugerido

```json
{
  "services": [
    {
      "service_key": "nr10_spda",
      "label": "SPDA",
      "status": "attention",
      "status_label": "Pendências abertas",
      "units_covered": 3,
      "assets_covered": 18,
      "open_findings": 6,
      "documents_ready": 4,
      "documents_total": 7,
      "next_due_at": "2026-06-15",
      "lead_engineer": {
        "name": "Gabriel Alves",
        "crea": "123456/SP"
      }
    }
  ]
}
```

### Critério de pronto

- o cliente entende o escopo contratado sem abrir laudo por laudo;
- cada serviço tem status, cobertura, pendências e próxima ação;
- o card do serviço aponta para ativos e documentos relacionados.

## Épico 2 — Ativos

### Pergunta de negócio

"Quais máquinas, linhas, vasos, painéis, linhas de vida e locais funcionais estão cobertos, em que estado estão e o que vence primeiro?"

### UI esperada

Aba `Ativos` com:

- lista por unidade/planta;
- agrupamento por local funcional;
- ativos/equipamentos;
- último laudo;
- última inspeção;
- próxima inspeção;
- pendências e criticidade.

### Seções mínimas

- `Mapa de unidades`
- `Locais funcionais`
- `Ativos críticos`
- `Histórico do ativo`

### Tipos iniciais sugeridos

- painel/instalação elétrica;
- máquina/equipamento;
- vaso de pressão;
- caldeira;
- tubulação;
- tanque;
- espaço confinado;
- linha de vida;
- ponto de ancoragem;
- edificação/área de risco.

### Rotas sugeridas

- `GET /cliente/ativos`
- `GET /cliente/api/ativos/bootstrap`
- `GET /cliente/api/ativos/{asset_id}`
- `GET /cliente/api/unidades/{unit_id}/ativos`

### Payload inicial sugerido

```json
{
  "units": [
    {
      "unit_id": "u-1",
      "label": "Planta Ribeirão Preto",
      "functional_locations": [
        {
          "location_id": "lf-12",
          "label": "Casa de caldeiras",
          "assets": [
            {
              "asset_id": "a-90",
              "asset_type": "boiler",
              "asset_label": "Caldeira CAL-01",
              "service_keys": ["nr13"],
              "health_status": "critical",
              "last_inspection_at": "2026-03-10",
              "next_due_at": "2026-05-10",
              "open_findings": 2,
              "latest_report_id": 812
            }
          ]
        }
      ]
    }
  ]
}
```

### Critério de pronto

- o cliente consegue localizar um ativo específico sem depender de busca textual em laudos;
- cada ativo mostra status, última entrega e próximo vencimento;
- ativos se conectam com serviços e documentos.

## Épico 3 — Documentos

### Pergunta de negócio

"Onde estão meus laudos, ARTs, PIEs, prontuários, PETs, certificados e AVCBs, e quais estão vigentes, pendentes ou vencidos?"

### UI esperada

Aba `Documentos` com:

- biblioteca documental filtrável;
- chips por tipo de documento;
- status de vigência;
- vínculo com unidade, ativo, serviço e responsável técnico;
- download e verificação de emissão.

### Tipos documentais prioritários

- `laudo`
- `ART`
- `PIE`
- `prontuario`
- `PET`
- `certificado`
- `AVCB/CLCB`
- `plano_resgate`
- `analise_risco`

### Rotas sugeridas

- `GET /cliente/documentos`
- `GET /cliente/api/documentos/bootstrap`
- `GET /cliente/api/documentos/{document_id}`
- `GET /cliente/api/documentos/{document_id}/download`

### Payload inicial sugerido

```json
{
  "documents": [
    {
      "document_id": "d-400",
      "document_type": "art",
      "label": "ART 2026-00155",
      "service_key": "nr35_linha_vida",
      "asset_id": "a-22",
      "unit_label": "Moega 02",
      "status": "valid",
      "issued_at": "2026-04-01",
      "valid_until": "2027-04-01",
      "engineer": {
        "name": "Gabriel Alves",
        "crea": "123456/SP"
      },
      "download_url": "/cliente/api/documentos/d-400/download"
    }
  ]
}
```

### Critério de pronto

- documentos formais deixam de ficar escondidos apenas no fluxo do caso;
- o cliente consegue localizar `ART`, laudo e prontuário por filtro;
- vigência, ativo vinculado e responsável técnico ficam visíveis.

## Épico 4 — Recorrência

### Pergunta de negócio

"O que vence quando, o que precisa de reinspeção, qual plano preventivo está ativo e o que já está atrasado?"

### UI esperada

Aba `Recorrência` com:

- agenda por mês/semana;
- fila de próximos vencimentos;
- lista de atrasados;
- agrupamento por ativo, unidade e serviço;
- CTA para abrir o caso ou documento relacionado.

### Seções mínimas

- `Próximos 30 dias`
- `Atrasados`
- `Planos preventivos`
- `Histórico de execução`

### Rotas sugeridas

- `GET /cliente/recorrencia`
- `GET /cliente/api/recorrencia/bootstrap`
- `GET /cliente/api/recorrencia/eventos`

### Payload inicial sugerido

```json
{
  "schedule": {
    "upcoming": [
      {
        "event_id": "ev-11",
        "kind": "inspection_due",
        "service_key": "nr13",
        "asset_id": "a-90",
        "asset_label": "Caldeira CAL-01",
        "unit_label": "Planta Ribeirão Preto",
        "due_at": "2026-05-10",
        "priority": "high",
        "source_document_id": "d-812"
      }
    ],
    "overdue": [],
    "plans": [
      {
        "plan_id": "pm-7",
        "label": "Plano preventivo NR13 CAL-01",
        "frequency_label": "Bimestral",
        "next_due_at": "2026-05-10"
      }
    ]
  }
}
```

### Critério de pronto

- o cliente consegue operar por data e criticidade;
- próximos vencimentos não dependem de leitura manual de PDF;
- cada evento aponta para ativo, serviço e documento de origem.

## Dependências técnicas

### Dependências já existentes

- `tenant` e políticas do `admin-cliente`;
- `laudos` e pipeline documental;
- `auditoria`;
- `diagnóstico`;
- `chat` e `mesa`.

### Lacunas a preencher

- modelo canônico de `service portfolio`;
- modelo canônico de `asset registry`;
- modelo canônico de `document index`;
- modelo canônico de `recurrence schedule`.

## Sequência recomendada

1. `Documentos`
2. `Serviços`
3. `Ativos`
4. `Recorrência`

### Racional

- `Documentos` reaproveita melhor o que já existe;
- `Serviços` pode nascer como projeção agregada dos documentos e laudos;
- `Ativos` exige modelagem adicional;
- `Recorrência` depende de datas bem modeladas em documentos e ativos.

## Relação com testes

Cada épico deve sair com:

- `1` teste E2E `xfail` inicial;
- `1` payload exemplar documentado;
- `1` rota bootstrap;
- `1` tela SSR ou shell equivalente.

## Resultado esperado

Quando esses quatro épicos estiverem ativos, o portal cliente deixará de parecer apenas uma camada administrativa da Tariel e passará a parecer um produto comprado por uma indústria.
