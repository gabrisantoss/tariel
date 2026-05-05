# Custos para sair da demo e operar em produção pequena no ecossistema Google

Data de referência: maio/2026.

Este documento estima o custo para tirar o Tariel da produção demo/local e colocar uma empresa pequena em produção real usando Google Cloud no lugar do Render. Os valores são estimativas para decisão inicial; antes de contratar, confirmar no Google Cloud Pricing Calculator com a região escolhida.

Conversão usada para leitura rápida: `US$ 1 ~= R$ 5,00`. O faturamento real varia por câmbio, imposto, região e uso.

## Premissas

- 1 empresa pequena em produção.
- 5 a 15 usuários.
- 50 a 150 laudos/mês no início.
- Uso inicial focado em NR35.
- Upload de fotos, PDFs e anexos.
- Sem alta disponibilidade completa no primeiro mês.
- Domínio próprio e HTTPS.
- Banco real separado da base demo/local.
- IA com limite de gasto mensal configurado.

## Arquitetura Google recomendada

| Função | Serviço Google | Observação |
|---|---|---|
| Backend Python/FastAPI | Cloud Run | Mais simples para container, autoescalável e com HTTPS. |
| Banco Postgres | Cloud SQL for PostgreSQL | Banco gerenciado, backups e upgrade controlado. |
| Arquivos/fotos/PDFs | Cloud Storage | Substitui armazenamento local para anexos e laudos. |
| Segredos | Secret Manager | Guarda API keys, OAuth secrets, senhas e session secret. |
| Build/deploy | Cloud Build + Artifact Registry | Build da imagem Docker e deploy no Cloud Run. |
| DNS | Cloud DNS ou DNS externo | Cloud DNS é barato; Registro.br/Cloudflare também servem. |
| Logs/monitoramento | Cloud Logging/Monitoring | Começa no básico, com alerta de erro e gasto. |
| Login Google | Google OAuth | Sem custo direto relevante para login básico. |
| Login Microsoft | Microsoft Entra App Registration | Pode continuar fora do Google; custo costuma ser zero no OAuth básico. |
| IA | OpenAI ou Gemini API | Hospedar no Google não obriga trocar IA. Gemini exige adaptação e validação. |

## Custo mensal estimado

### Cenário 1: piloto real econômico

Serve para validar com poucos usuários reais e NR35, sem prometer disponibilidade corporativa pesada.

| Item | Estimativa mensal |
|---|---:|
| Cloud Run com escala para zero | US$ 0 a US$ 15 |
| Cloud SQL Postgres pequeno/teste, sem HA | US$ 10 a US$ 20 |
| Cloud Storage para anexos e PDFs | US$ 0 a US$ 5 |
| Secret Manager | US$ 0 a US$ 2 |
| Cloud Build + Artifact Registry | US$ 0 a US$ 5 |
| Cloud DNS | US$ 0,20 a US$ 1 |
| Logs/monitoramento básico | US$ 0 a US$ 5 |
| E-mail transacional baixo volume | US$ 0 a US$ 20 |
| IA com limite mensal | US$ 30 a US$ 100 |
| **Total estimado** | **US$ 40 a US$ 170/mês** |
| **Total aproximado em reais** | **R$ 200 a R$ 850/mês** |

Minha recomendação para começar: colocar teto de IA em `US$ 50/mês` e revisar após 30 dias.

### Cenário 2: pequeno cliente em produção mais confortável

Serve quando a empresa já vai usar todo dia e você quer menos lentidão, mais margem e mais logs.

| Item | Estimativa mensal |
|---|---:|
| Cloud Run com instância mínima ou mais CPU/memória | US$ 15 a US$ 50 |
| Cloud SQL Postgres pequeno/médio sem HA | US$ 30 a US$ 70 |
| Cloud Storage + tráfego de arquivos | US$ 5 a US$ 20 |
| Secret Manager | US$ 1 a US$ 5 |
| Build, imagens e deploy | US$ 0 a US$ 10 |
| DNS/logs/alertas | US$ 5 a US$ 20 |
| E-mail transacional | US$ 0 a US$ 20 |
| IA com volume real | US$ 100 a US$ 250 |
| **Total estimado** | **US$ 160 a US$ 445/mês** |
| **Total aproximado em reais** | **R$ 800 a R$ 2.225/mês** |

Minha recomendação para cliente pagante pequeno: mirar neste cenário, mas começar com orçamento travado em `US$ 200/mês` e subir só quando houver uso medido.

### Cenário 3: produção com mais segurança

Serve quando já existe contrato, uso diário crítico, SLA informal e dados importantes.

| Item | Estimativa mensal |
|---|---:|
| Cloud Run com mínimo de instâncias e mais recursos | US$ 40 a US$ 120 |
| Cloud SQL com mais CPU/RAM, backups e possível HA | US$ 100 a US$ 300+ |
| Storage, logs e tráfego | US$ 20 a US$ 80 |
| E-mail, alertas e observabilidade | US$ 20 a US$ 80 |
| IA com mais laudos e revisões | US$ 250 a US$ 600 |
| **Total estimado** | **US$ 430 a US$ 1.180+/mês** |
| **Total aproximado em reais** | **R$ 2.150 a R$ 5.900+/mês** |

Eu não começaria aqui. Só faz sentido depois de validar cliente, preço e volume.

## IA: manter OpenAI ou migrar para Gemini?

### Opção A: Google Cloud para infraestrutura, OpenAI para IA

É o caminho mais rápido porque o sistema já está preparado para `OPENAI_API_KEY`.

Vantagens:
- Menos alteração no código agora.
- Menor risco de regressão nos laudos.
- Dá para ir para produção piloto mais rápido.

Desvantagem:
- Não fica 100% Google.
- O custo de IA fica na OpenAI.

### Opção B: Google Cloud + Gemini API

É o caminho mais alinhado com ecossistema Google, mas exige implementação e validação.

O que muda:
- Criar adapter de IA para Gemini.
- Validar prompts de NR35.
- Comparar laudos gerados por OpenAI vs Gemini.
- Ajustar parsing de JSON, limites, respostas longas e imagens.
- Definir fallback caso Gemini falhe.

Estimativa técnica: 1 a 3 dias para primeira troca funcional; mais tempo para validação real de laudos.

Custos Gemini de referência:
- Gemini 3.1 Flash-Lite Preview: entrada a partir de `US$ 0,25 / 1M tokens`, saída `US$ 1,50 / 1M tokens`.
- Gemini 3 Flash Preview: entrada `US$ 0,50 / 1M tokens`, saída `US$ 3,00 / 1M tokens`.
- Gemini 3.1 Pro Preview: entrada `US$ 2,00 / 1M tokens`, saída `US$ 12,00 / 1M tokens`.

Recomendação: não trocar tudo de uma vez. Colocar Gemini como segundo provedor, testar em paralelo com NR35 e só depois decidir.

## Custos de implantação única

Mesmo que a mensalidade seja baixa, existe custo de preparação.

| Trabalho | Estimativa |
|---|---:|
| Criar projeto Google Cloud, billing, orçamento e alertas | 2 a 4 horas |
| Docker/Cloud Run/Cloud Build/Artifact Registry | 4 a 8 horas |
| Cloud SQL, migração, backup e seed inicial | 4 a 8 horas |
| Cloud Storage para fotos/PDFs/anexos | 4 a 12 horas |
| Secret Manager e variáveis de produção | 2 a 4 horas |
| OAuth Google/Microsoft com domínio real | 2 a 6 horas |
| Logs, healthcheck e alertas | 2 a 6 horas |
| Testes reais NR35 e ajustes | 1 a 3 dias |
| Migração para Gemini, se escolhida | 1 a 3 dias extras |

Se transformar isso em custo contratado, eu separaria:

- Implantação Google Cloud sem trocar IA: `R$ 2.000 a R$ 6.000` de esforço técnico, dependendo do acabamento.
- Implantação Google Cloud + migração para Gemini: `R$ 4.000 a R$ 12.000`, porque entra validação de qualidade dos laudos.

## O que precisa estar pago/configurado antes de cliente real

- Conta Google Cloud com billing ativo.
- Budget/alerta de gasto configurado antes de subir produção.
- Cloud SQL com backup.
- Cloud Storage para anexos e PDFs.
- Secret Manager com secrets reais.
- Domínio e DNS.
- OAuth Google com redirect da URL real.
- OAuth Microsoft se for manter Microsoft.
- Limite de gasto da IA.
- Política clara: PDF operacional vs emissão oficial.
- Usuário responsável técnico para validar laudos reais.

## Minha recomendação de caminho

Para uma empresa pequena, eu faria assim:

1. Subir Google Cloud com Cloud Run + Cloud SQL + Cloud Storage.
2. Manter OpenAI por enquanto, para não misturar infraestrutura nova com IA nova.
3. Configurar budget mensal de `US$ 150` no primeiro mês.
4. Rodar 20 a 50 laudos NR35 reais assistidos.
5. Medir custo por laudo.
6. Só depois testar Gemini em paralelo.

Meta inicial saudável:

- Custo mensal de infraestrutura: `US$ 30 a US$ 80`.
- Custo mensal de IA: `US$ 50 a US$ 150`.
- Custo total esperado no começo: `US$ 80 a US$ 230/mês`, aproximadamente `R$ 400 a R$ 1.150/mês`.

## Pontos de atenção

- Cloud SQL é o custo fixo mais importante; se escolher instância grande ou HA cedo demais, a conta sobe.
- Cloud Run com escala para zero é barato, mas pode ter cold start. Para demo não importa; para produção pode incomodar.
- Fotos e PDFs não devem ficar no disco local do container.
- IA precisa de teto de gasto. Sem limite, uma chave vazada ou loop pode gerar conta alta.
- Google Cloud cobra por uso. Criar alerta não substitui revisar a fatura nos primeiros dias.
- Trocar OpenAI por Gemini pode baixar custo, mas só vale se a qualidade técnica dos laudos NR35 continuar boa.

## Fontes consultadas

- Google Cloud Run pricing: https://cloud.google.com/run/pricing
- Google Cloud SQL PostgreSQL pricing: https://cloud.google.com/sql/docs/postgres/pricing
- Google Cloud SQL pricing examples: https://cloud.google.com/sql/docs/pricing-examples
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Google Secret Manager pricing: https://cloud.google.com/secret-manager/pricing
- Google Cloud DNS pricing: https://cloud.google.com/dns/pricing
- Google Cloud Build pricing: https://cloud.google.com/build/pricing
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
