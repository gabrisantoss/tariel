# Auditoria de binarios rastreados

Snapshot local em 2026-04-24 apos migracao inicial:

- 12 PDFs/ZIPs acima de 10 MiB foram removidos da arvore rastreada.
- Manifesto de restauracao: `docs/binary_asset_manifests/oversized_assets_2026-04-24.json`
- Peso removido do Git futuro: 499076640 bytes / 475.9 MiB
- Politica imediata: manter manifestos e fixtures pequenas no Git; mover pacotes fonte pesados para Git LFS ou storage externo versionado.

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
- Testes devem aceitar asset fisico local ou entrada correspondente no manifesto de migracao.
