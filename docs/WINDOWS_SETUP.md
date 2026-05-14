# Setup Windows local

Data do preparo desta maquina: `2026-05-08`.

Este projeto nasceu com comandos Linux/Bash no `Makefile`. No Windows, use o
launcher PowerShell da raiz:

```powershell
.\make.ps1 help
.\make.ps1 doctor
.\make.ps1 verify
```

## Ferramentas instaladas nesta maquina

- Git for Windows `2.54.0`
- Python `3.12.10`
- Node.js LTS `24.15.0` com npm `11.12.1`
- Eclipse Temurin JDK `17.0.19`
- Android Studio `2025.3.4.7`
- Android command-line tools `20.0`
- Android SDK `platform-tools`, `emulator`, `platforms;android-36`, `build-tools;36.0.0`
- System image `system-images;android-36;google_apis;x86_64`
- AVD local `tariel_api36`
- Maestro CLI `2.5.1`
- Redis on Windows `3.0.504`, rodando em `127.0.0.1:6379`
- Playwright Chromium baixado via `python -m playwright install chromium`

Observacao: Docker Desktop nao foi instalado porque nao e necessario para
rodar o web, mobile, smoke mobile ou `release-verify` local. Ele so e exigido
pelo alvo opcional `public-repo-secret-scan`, que roda o Gitleaks em container.

## Variaveis de ambiente

As variaveis persistentes configuradas no usuario foram:

```powershell
ANDROID_HOME=$env:LOCALAPPDATA\Android\Sdk
ANDROID_SDK_ROOT=$env:LOCALAPPDATA\Android\Sdk
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
```

Tambem foram adicionados ao `PATH` do usuario:

```text
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin
%USERPROFILE%\.maestro\bin
```

Abra um novo terminal para herdar essas variaveis sem precisar recarregar o
ambiente manualmente.

## Dependencias do repositorio

Web:

```powershell
python -m venv web\.venv
.\web\.venv\Scripts\python.exe -m pip install --upgrade pip
.\web\.venv\Scripts\python.exe -m pip install -r web\requirements.txt
.\web\.venv\Scripts\python.exe -m playwright install chromium
```

Mobile:

```powershell
cd android
npm ci
```

## Ambiente `.env` rapido

Para rodar o backend sem PostgreSQL/Redis local, use SQLite e realtime em
memoria:

```powershell
cd web
Copy-Item .env.example .env
(Get-Content .env) `
  -replace '^DATABASE_URL=.*', 'DATABASE_URL=sqlite:///./tariel_dev.sqlite3' `
  -replace '^REVISOR_REALTIME_BACKEND=.*', 'REVISOR_REALTIME_BACKEND=memory' `
  -replace '^REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP=.*', 'REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP=0' |
  Set-Content .env -Encoding UTF8
```

Para subir o web:

```powershell
.\make.ps1 web-dev
```

Esse alvo usa `DB_BOOTSTRAP_BLOCKING_STARTUP=0` para permitir que o servidor
suba enquanto o bootstrap do banco local roda em background.

## Gates principais no Windows

```powershell
.\make.ps1 doctor
.\make.ps1 web-ci
.\make.ps1 mobile-ci
.\make.ps1 mesa-smoke
.\make.ps1 verify
```

Lanes reais como `smoke-mobile`, `release-gate-real` e `release-verify` ainda
dependem de emulador/dispositivo, ADB, APK/dev client e Maestro. O AVD
`tariel_api36` ja foi criado; para iniciar manualmente:

```powershell
emulator -avd tariel_api36
```

## Fontes oficiais usadas

- Android command-line tools: <https://developer.android.com/studio>
- Maestro CLI Windows: <https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli>
