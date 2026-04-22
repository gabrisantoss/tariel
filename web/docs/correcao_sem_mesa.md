# Correção de laudo sem Mesa

Resumo operacional para o portal do inspetor quando o tenant não usa `Mesa avaliadora`.

## Decisão

O `Chat` continua sendo a superfície principal de coleta e geração do laudo.

As correções devem acontecer em uma aba própria de `Correções`, e não:

- no mesmo feed principal do chat;
- em um editor livre estilo `Word`;
- em um segundo chat sem contexto visual do documento.

## Regra prática

Na aba `Correções`, o usuário precisa enxergar:

- o laudo atual;
- a versão atual;
- as fotos vinculadas por slot;
- os blocos corrigíveis;
- as alterações pendentes;
- a ação de reemitir quando o documento já tiver sido emitido.

## Tipos de correção aceitos

- substituir foto;
- adicionar foto;
- remover foto;
- reclassificar foto;
- corrigir checklist;
- corrigir observação;
- corrigir status;
- corrigir conclusão;
- reabrir e reemitir.

## Regra de emissão

- antes da emissão: altera o rascunho atual;
- depois da emissão: reabre e gera nova versão.

## Regra para evidência nova

Foto nova enviada em `Correções`:

- não entra automaticamente no PDF;
- vira evidência candidata;
- precisa ser aplicada a um bloco ou slot específico.

## Documento de referência maior

- `docs/restructuring-roadmap/133_inspetor_correcoes_sem_mesa.md`
