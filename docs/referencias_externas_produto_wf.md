# Referências Externas Para o Produto WF

Atualizado em `2026-04-23`.

Objetivo: registrar, com base em fontes oficiais e documentação de mercado, o que um cliente industrial como a `WF` tenderia a esperar de um sistema que promete inspeção, conformidade, laudos, ART, adequações e gestão recorrente.

Este documento não redefine o produto sozinho.
Ele funciona como base técnica para:

- backlog de produto;
- testes `xfail` de contrato futuro;
- priorização de superfícies no `admin-cliente`;
- defesa comercial do que já existe e do que ainda falta.

## Resumo executivo

Pelas fontes oficiais e de mercado consultadas, um sistema vendável para esse domínio deveria cobrir pelo menos seis camadas:

1. carteira de serviços por norma e por escopo contratado;
2. cadastro operacional de ativos, locais, linhas, máquinas e unidades/planta;
3. gestão documental rastreável com `ART`, `PIE`, relatórios, inspeções, certificados e pacotes de entrega;
4. agenda de recorrência com próxima inspeção, vencimento e plano preventivo;
5. trilha de conformidade com evidências, fotos, pendências, permissões e responsáveis;
6. contexto de treinamento, resgate, risco e impedimentos quando a norma exigir isso.

Hoje o repositório já cobre bem a camada operacional transversal de:

- `admin-cliente`;
- equipe;
- chat/caso/laudo;
- mesa;
- auditoria;
- diagnóstico.

O gap principal continua sendo a verticalização do portal para o cliente industrial.

## Fontes oficiais e o que elas implicam

### NR-10 e PIE

Fonte:

- `gov.br` NR-10: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-10.pdf

Leitura relevante:

- `10.2.3`: a empresa deve manter esquemas unifilares atualizados;
- `10.2.4` e `10.2.6`: estabelecimentos com carga instalada superior a `75 kW` devem constituir e manter `Prontuário de Instalações Elétricas`;
- o prontuário inclui procedimentos, documentação de inspeções e medições de `SPDA` e aterramento, especificações de EPC/EPI e ferramental, e deve permanecer atualizado e disponível.

Implicação de produto:

- o sistema precisa suportar `PIE` como entidade documental viva, não só PDF final;
- deve haver vínculo entre instalação, `SPDA`, aterramento, inspeções, medições, diagramas e responsáveis;
- o cliente espera visualizar status documental, última revisão, próxima revisão e documentos anexos.

### NR-12 e máquinas/equipamentos

Fonte:

- `gov.br` NR-12: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-12-atualizada-2024.pdf

Leitura relevante:

- `12.1.1.1`: a fase de utilização abrange transporte, montagem, instalação, ajuste, operação, limpeza, manutenção, inspeção, desativação e desmonte;
- `12.13`: máquinas e equipamentos devem possuir manual com informações de segurança;
- `12.13.4`: os manuais devem conter dados de identificação, normas observadas, diagramas, riscos, medidas de segurança e procedimentos de emergência;
- anexos e trechos específicos também exigem planejamento formal, análise de risco e `ART` em cenários especiais.

Implicação de produto:

- o sistema deve tratar `máquina/equipamento` como ativo técnico com ciclo de vida;
- cada ativo deveria concentrar laudos, manuais, diagramas, riscos, pendências e histórico de inspeção;
- o portal cliente precisa de visão por equipamento, não apenas por laudo isolado.

### NR-13 e integridade de caldeiras, vasos, tubulações e tanques

Fonte:

- `gov.br` NR-13: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-13-atualizada-2023.pdf

Leitura relevante:

- `13.4.1.5` e `13.5.1.5`: prontuário, registro de segurança, projeto, relatórios e certificados devem estar atualizados;
- `13.4.1.6` e `13.5.1.6`: prontuário extraviado deve ser reconstituído com responsabilidade técnica;
- `13.6.2`: tubulações passam por inspeções iniciais, periódicas e extraordinárias;
- `13.6.2.5`: relatório deve conter identificação, fluidos, testes, anomalias, registro fotográfico/localização, recomendações, parecer conclusivo, data da próxima inspeção e identificação do profissional;
- `13.7`: tanques também exigem programa/plano de inspeção e documentação atualizada.

Implicação de produto:

- a plataforma deveria ter `ativos NR-13` com programa de inspeção, relatório, anomalias, fotos, próximos vencimentos e documentação de integridade;
- faz sentido existir uma central de prontuários reconstituídos, registros de segurança e certificados;
- relatórios e próximos vencimentos precisam ficar visíveis por ativo e por linha/sistema.

### NR-33 e espaço confinado

Fonte:

- `gov.br` NR-33: https://www.gov.br/participamaisbrasil/nr-33-seguranca-e-saude-nos-trabalhos-em-espacos-confinados

Leitura relevante:

- toda entrada deve ser precedida de `Permissão de Entrada e Trabalho`;
- a permissão deve identificar espaço, objetivo, perigos e medidas de controle;
- as permissões devem ser rastreáveis, arquivadas por `5 anos` e ter validade limitada a uma jornada;
- há exigência de sinalização, avaliação atmosférica, vigia e capacitação.

Implicação de produto:

- o sistema deveria ter gestão explícita de `PET`, com número, validade, encerramento, arquivo e rastreabilidade;
- espaço confinado pede workflow próprio de emissão, vigência, encerramento e arquivamento;
- o portal cliente deve permitir localizar PETs e seu histórico por espaço/unidade.

### NR-35 e trabalho em altura / linha de vida

Fonte:

- `gov.br` NR-35: https://www.gov.br/participamaisbrasil/consulta-publica-nr-35

Leitura relevante:

- exige capacitação inicial, periódica e eventual;
- o treinamento inicial tem carga horária mínima e contempla normas aplicáveis, análise de risco e condições impeditivas;
- para cada frente de trabalho deve haver plano de resgate;
- certas condições impedem a continuidade da atividade.

Implicação de produto:

- linhas de vida, ancoragens e frentes de trabalho deveriam expor treinamento, plano de resgate, condições impeditivas e histórico de inspeção;
- há valor claro em uma superfície de `treinamentos e resgates` vinculada à unidade, frente e ativo.

### ART e responsabilidade técnica

Fonte:

- `Confea` ART: https://www.confea.org.br/servicos-prestados/anotacao-de-responsabilidade-tecnica-art

Leitura relevante:

- a `ART` é obrigatória nos contratos de execução de obra ou prestação de serviço técnico abrangido pelo Sistema `Confea/Crea`;
- deve ser registrada antes do início da atividade;
- a consulta/certidão da ART é parte da rastreabilidade formal.

Implicação de produto:

- o sistema deveria tratar `ART` como documento de primeira classe;
- o cliente tende a esperar número, status, profissional, data, baixa, certidão e vínculo com o serviço/laudo;
- uma central de documentos sem `ART` visível fica aquém do esperado para esse mercado.

### AVCB e segurança contra incêndio

Fonte:

- Decreto estadual SP `69.118/2024`: https://www.al.sp.gov.br/repositorio/legislacao/decreto/2024/decreto-69118-09.12.2024.html

Leitura relevante:

- o `AVCB` certifica que a edificação ou área de risco atende às exigências de segurança contra incêndio no ato da vistoria;
- o regulamento também conecta instalações elétricas e `SPDA` à conformidade com normas técnicas oficiais.

Implicação de produto:

- para ofertas de `Bombeiros` e `AVCB`, faz sentido uma carteira documental por edificação/unidade, com situação atual, validade, pendências e anexos;
- o cliente vai esperar saber rapidamente o que está regular, vencendo ou pendente.

## Referências de mercado e o que elas reforçam

### IBM Maximo

Fonte:

- IBM Preventive Maintenance: https://www.ibm.com/docs/en/masv-and-l/maximo-manage/cd?topic=module-preventive-maintenance

Leitura relevante:

- manutenção preventiva é tratada como agenda recorrente;
- há `PM records`, `job plans`, cronograma por ativo ou local e geração periódica de ordens.

Implicação de produto:

- o mercado espera recorrência por `ativo` ou `local`;
- não basta ter laudo histórico, é esperado ter `próxima execução`, frequência e plano associado.

### SAP Asset Management

Fontes:

- SAP Maintenance Item: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/c3476657290ba57ae10000000a4450e5.html
- SAP Technical Objects: https://help.sap.com/docs/service-asset-manager/sap-service-and-asset-manager-user-guide-maintenance-persona/working-with-technical-objects?version=2505

Leitura relevante:

- tarefas preventivas regulares ficam ligadas a `maintenance items/plans`;
- objetos técnicos são `equipment` e `functional locations`.

Implicação de produto:

- para vender bem para indústria, o portal cliente deveria tratar ao menos:
  - `unidade/planta`;
  - `local funcional`;
  - `equipamento/ativo`;
  - `plano de inspeção/manutenção`;
  - `histórico e próxima intervenção`.

## Tradução prática para backlog de produto

### Camada 1: Serviços contratados

Espera-se ver:

- catálogo da empresa por `RTI`, `SPDA`, `PIE`, `LOTO`, `NR12`, `NR13`, `NR33`, `NR35`, `AVCB`, `END`;
- status por serviço;
- unidades cobertas;
- responsável técnico;
- documentação principal vinculada.

### Camada 2: Ativos e unidades

Espera-se ver:

- unidades/planta;
- áreas e locais funcionais;
- ativos/equipamentos;
- família normativa aplicável;
- último laudo, última inspeção, próxima inspeção e pendências.

### Camada 3: Central documental

Espera-se ver:

- laudos emitidos;
- `ARTs`;
- `PIE`;
- prontuários;
- `PETs`;
- certificados de inspeção/teste;
- `AVCB/CLCB`;
- fotos, anexos e trilha de revisão.

### Camada 4: Recorrência e vencimentos

Espera-se ver:

- agenda de inspeções periódicas;
- vencimentos documentais;
- próximos serviços;
- alertas por criticidade;
- histórico de execução por ativo/local.

### Camada 5: Conformidade operacional

Espera-se ver:

- pendências abertas;
- anomalias por ativo;
- parecer conclusivo e próxima ação;
- responsáveis;
- evidências e rastreabilidade.

### Camada 6: Treinamentos e resgates

Espera-se ver:

- capacitações exigidas;
- validade dos treinamentos;
- plano de resgate por frente;
- bloqueios ou condições impeditivas.

## Leitura honesta do estado atual do Tariel

### Já existe e ajuda a vender

- `admin-cliente` com governança por tenant;
- equipe e onboarding;
- chat/caso/laudo;
- mesa;
- auditoria;
- diagnóstico exportável;
- trilha operacional multiportal.

### Existe parcialmente

- catálogo de templates/famílias normativas;
- famílias técnicas e pipeline documental;
- algumas estruturas de laudo por `NR10`, `NR12`, `NR13`, `NR33`, `NR35`.

### Ainda falta para atender melhor o comprador industrial

- portal por `serviço contratado`;
- visão por `ativo/equipamento/local funcional`;
- central documental com `ART` como entidade visível;
- agenda de recorrência e vencimento;
- gestão explícita de `PET`, `PIE`, prontuários e certificados;
- trilha de treinamento/resgate/condições impeditivas exposta ao cliente.

## Relação com os testes do repositório

Os testes E2E futuros devem refletir este contrato de produto, especialmente nas seguintes superfícies:

- `Serviços`;
- `Ativos`;
- `Documentos`;
- `Recorrência`;
- `Conformidade`;
- `Treinamentos e Resgate`.

O teste atual `xfail` do comprador futuro deve ser tratado como primeiro marcador desse contrato, e pode ser desdobrado em cenários menores conforme a implementação avançar.
