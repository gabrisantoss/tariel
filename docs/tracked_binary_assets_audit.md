# Auditoria de binarios rastreados

Snapshot local em 2026-04-24:

- Arquivos binarios rastreados: 159
- Tamanho total rastreado: 614.2 MiB
- Maiores ofensores: PDFs e ZIPs em `docs/portfolio_empresa_*_material_real/**/coleta_entrada/` e `pacote_referencia/pdf/`
- Politica imediata: manter manifestos e fixtures pequenas no Git; mover pacotes fonte pesados para Git LFS ou storage externo versionado em uma janela propria de migracao

Comando operacional:

```bash
make binary-assets-audit
```

Modo estrito para uma migracao futura:

```bash
python3 scripts/audit_tracked_binaries.py --strict --threshold-mb 10
```

Regras de migracao:

- Nao reescrever historico nesta arvore sem janela explicita, backup e alinhamento com quem consome o repositorio.
- Para cada PDF/ZIP removido do Git, manter um manifesto pequeno com checksum, tamanho, origem e destino do asset.
- Assets essenciais de runtime, como icones mobile e fontes servidas em producao, podem permanecer no Git se forem pequenos e versionados.
- O alvo preferencial para os pacotes fonte e `Git LFS` ou storage externo com manifesto no repositorio.
