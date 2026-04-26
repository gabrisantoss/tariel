# Artifacts Locais Web

Este diretório reserva espaço para outputs operacionais gerados por validações web, Playwright, screenshots, traces e relatórios auxiliares.

Regras:

- artefatos gerados dentro de `web/artifacts/` são locais e não devem ser versionados;
- apenas este `README.md` e o `.gitignore` ficam versionados;
- esses arquivos existem para preservar a pasta e satisfazer o contrato de `make hygiene-check`;
- quando uma evidência precisar ser durável, promova um resumo humano para `docs/` em vez de commitar o payload bruto.
