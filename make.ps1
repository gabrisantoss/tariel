param(
    [string]$Target = "help",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$script:Root = $PSScriptRoot
$script:WebRoot = Join-Path $script:Root "web"
$script:AndroidRoot = Join-Path $script:Root "android"

$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

foreach ($key in @("JAVA_HOME", "ANDROID_HOME", "ANDROID_SDK_ROOT")) {
    if (-not [System.Environment]::GetEnvironmentVariable($key, "Process")) {
        $value = [System.Environment]::GetEnvironmentVariable($key, "User")
        if (-not $value) {
            $value = [System.Environment]::GetEnvironmentVariable($key, "Machine")
        }
        if ($value) {
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

if (-not $env:ANDROID_HOME -and $env:ANDROID_SDK_ROOT) {
    $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
}

if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if (-not $env:AMBIENTE) {
    $env:AMBIENTE = "dev"
}

function Resolve-WebPython {
    $candidates = @(
        (Join-Path $script:WebRoot ".venv\Scripts\python.exe"),
        (Join-Path $script:WebRoot "venv\Scripts\python.exe"),
        (Join-Path $script:Root ".venv\Scripts\python.exe"),
        (Join-Path $script:Root "venv\Scripts\python.exe")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }

    return "python"
}

function Resolve-Bash {
    $bash = Get-Command "bash" -ErrorAction SilentlyContinue
    if ($bash) {
        return $bash.Source
    }

    $gitBash = "C:\Program Files\Git\bin\bash.exe"
    if (Test-Path $gitBash) {
        return $gitBash
    }

    throw "bash nao encontrado. Instale Git for Windows ou rode o alvo equivalente PowerShell."
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Action
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$Arguments = @()
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Comando falhou ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
    }
}

function Invoke-WithEnv {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Variables,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    $previous = @{}
    foreach ($key in $Variables.Keys) {
        $previous[$key] = [System.Environment]::GetEnvironmentVariable($key, "Process")
        [System.Environment]::SetEnvironmentVariable($key, [string]$Variables[$key], "Process")
    }

    try {
        & $Action
    }
    finally {
        foreach ($key in $Variables.Keys) {
            [System.Environment]::SetEnvironmentVariable($key, $previous[$key], "Process")
        }
    }
}

function Invoke-WithLocalProductionOpsEnv {
    param([Parameter(Mandatory = $true)][scriptblock]$Action)

    $dbPath = (Join-Path $script:Root ".test-artifacts\runtime\tariel-production-ops-check.db").Replace("\", "/")
    New-Item -ItemType Directory -Path (Split-Path $dbPath) -Force | Out-Null

    Invoke-WithEnv @{
        AMBIENTE = "production"
        DATABASE_URL = "sqlite:///$dbPath"
        PASTA_UPLOADS_PERFIS = "/opt/render/project/src/web/static/uploads/perfis"
        PASTA_ANEXOS_MESA = "/opt/render/project/src/web/static/uploads/mesa_anexos"
        PASTA_APRENDIZADOS_VISUAIS_IA = "/opt/render/project/src/web/static/uploads/aprendizados_ia"
        TARIEL_UPLOADS_STORAGE_MODE = "persistent_disk"
        TARIEL_UPLOADS_CLEANUP_ENABLED = "1"
        TARIEL_UPLOADS_CLEANUP_GRACE_DAYS = "14"
        TARIEL_UPLOADS_CLEANUP_INTERVAL_HOURS = "24"
        TARIEL_UPLOADS_CLEANUP_MAX_DELETIONS_PER_RUN = "200"
        TARIEL_UPLOADS_BACKUP_REQUIRED = "1"
        TARIEL_UPLOADS_RESTORE_DRILL_REQUIRED = "1"
        DB_BOOTSTRAP_RUN_MIGRATIONS = "1"
        SESSAO_FAIL_CLOSED_ON_DB_ERROR = "1"
    } $Action
}

function Invoke-WebPython {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    $python = Resolve-WebPython
    Push-Location $script:WebRoot
    try {
        Invoke-WithEnv @{ PYTHONPATH = "." } {
            Invoke-Native $python $Arguments
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-RootPython {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    $python = Resolve-WebPython
    Push-Location $script:Root
    try {
        Invoke-Native $python $Arguments
    }
    finally {
        Pop-Location
    }
}

function Invoke-PrepareLocalProductionOpsDatabase {
    Invoke-WebPython -c "import app.shared.database as banco_dados; banco_dados.inicializar_banco()"
}

function Invoke-Npm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    Push-Location $script:AndroidRoot
    try {
        Invoke-Native "npm" $Arguments
    }
    finally {
        Pop-Location
    }
}

function Invoke-BashScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        [string[]]$Arguments = @()
    )

    $bash = Resolve-Bash
    Push-Location $script:Root
    try {
        Invoke-Native $bash (@($ScriptPath) + $Arguments)
    }
    finally {
        Pop-Location
    }
}

function Remove-GeneratedPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $absolute = Join-Path $script:Root $Path
    Remove-Item -LiteralPath $absolute -Recurse -Force -ErrorAction SilentlyContinue
}

function Get-DotEnvValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $envPath = Join-Path $script:WebRoot ".env"
    if (-not (Test-Path $envPath)) {
        return ""
    }

    $line = Get-Content -Path $envPath -Encoding UTF8 |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -First 1
    if (-not $line) {
        return ""
    }

    return (($line -replace "^\s*$([regex]::Escape($Name))\s*=", "").Trim() -replace '^["'']|["'']$', "")
}

function Ensure-LocalRedisIfConfigured {
    $redisUrl = if ($env:REDIS_URL) { $env:REDIS_URL } else { Get-DotEnvValue "REDIS_URL" }
    if (-not $redisUrl) {
        return
    }

    $uri = try { [Uri]$redisUrl } catch { $null }
    if (-not $uri -or $uri.Host -notin @("127.0.0.1", "localhost")) {
        return
    }

    $port = if ($uri.Port -gt 0) { $uri.Port } else { 6379 }
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        return
    }

    $redisServer = Get-Command "redis-server" -ErrorAction SilentlyContinue
    $redisPath = if ($redisServer) { $redisServer.Source } else { "C:\Program Files\Redis\redis-server.exe" }
    if (-not (Test-Path $redisPath)) {
        throw "REDIS_URL aponta para $redisUrl, mas redis-server nao foi encontrado."
    }

    $redisConf = Join-Path (Split-Path $redisPath -Parent) "redis.windows.conf"
    $arguments = if (Test-Path $redisConf) { @($redisConf) } else { @() }
    Start-Process -FilePath $redisPath -ArgumentList $arguments -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 2

    if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
        throw "Redis nao iniciou em $redisUrl."
    }
}

function Show-Help {
    @"
Tariel Windows tasks

Usage:
  .\make.ps1 <target>

Core:
  doctor                    Mostra ferramentas do ambiente
  bootstrap                 Instala dependencias JS e confere venv web
  verify                    web-ci + mobile-ci + mesa-smoke
  release-verify-local      Gate forte local
  release-verify            Gate completo, incluindo lanes reais
  ci                        Gate hospedado modelado

Web:
  web-dev                   Sobe FastAPI local com SQLite no Windows
  web-lint                  Ruff
  web-typecheck             Mypy
  web-test                  Suite critica web
  web-ci                    Lint + typecheck + testes
  mesa-smoke                Gate local da Mesa SSR
  mesa-acceptance           E2E Playwright da Mesa
  smoke-web                 Smoke critico do inspetor

Mobile:
  mobile-install            npm ci
  mobile-lint               ESLint
  mobile-typecheck          TypeScript
  mobile-test               Jest baseline
  mobile-format-check       Prettier check
  mobile-ci                 Baseline mobile
  smoke-mobile              Lane real com Android/Emulador/Maestro

Ops:
  hygiene-check
  security-audit
  production-ops-check
  uploads-restore-drill
  clean-generated
"@
}

function Invoke-Target {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [string[]]$ArgsForTarget = @()
    )

    switch ($Name) {
        "help" { Show-Help }
        "doctor" {
            Invoke-Checked "doctor" {
                $tools = @("git", "python", "node", "npm", "java", "adb", "emulator", "maestro", "redis-server", "docker")
                foreach ($tool in $tools) {
                    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
                    if ($cmd) {
                        $version = try { (& $tool --version 2>&1 | Select-Object -First 1) -join "" } catch { "version unavailable" }
                        "{0}: {1} ({2})" -f $tool, $version, $cmd.Source
                    }
                    else {
                        "{0}: missing" -f $tool
                    }
                }
                "web python: $(Resolve-WebPython)"
                "ANDROID_HOME: $env:ANDROID_HOME"
            }
        }
        "bootstrap" {
            Invoke-Target "mobile-install"
            Write-Host "web: use web/.venv com .\web\.venv\Scripts\python.exe -m pip install -r web\requirements.txt" -ForegroundColor Yellow
        }
        "hooks-install" {
            Invoke-Checked "hooks-install" { Invoke-RootPython -m pre_commit install --hook-type pre-commit --hook-type pre-push }
        }
        "web-lint" {
            Invoke-Checked "web-lint" { Invoke-WebPython -m ruff check . }
        }
        "web-dev" {
            Invoke-Checked "web-dev" {
                Ensure-LocalRedisIfConfigured
                $runtimeDir = Join-Path $script:Root ".test-artifacts\runtime"
                New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
                $dbPath = (Join-Path $runtimeDir "tariel-windows-dev.sqlite3").Replace("\", "/")
                Invoke-WithEnv @{
                    AMBIENTE = "dev"
                    DATABASE_URL = "sqlite:///$dbPath"
                    DB_BOOTSTRAP_BLOCKING_STARTUP = "0"
                    REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP = "0"
                } {
                    Invoke-WebPython -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
                }
            }
        }
        "run-web" { Invoke-Target "web-dev" }
        "web-typecheck" {
            Invoke-Checked "web-typecheck" { Invoke-WebPython -m mypy --config-file pyproject.toml }
        }
        "web-test" {
            Invoke-Checked "web-test smoke/regra/dominio/memoria" {
                Invoke-WebPython -m pytest -q tests/test_smoke.py tests/test_regras_rotas_criticas.py tests/test_inspetor_comandos_dominio.py tests/test_inspetor_confianca_dominio.py tests/test_operational_memory.py
            }
            Invoke-Checked "web-test tenant access" { Invoke-WebPython -m pytest -q tests/test_tenant_access.py }
        }
        "web-ci" {
            Invoke-Target "web-lint"
            Invoke-Target "web-typecheck"
            Invoke-Target "web-test"
        }
        "mesa-smoke" {
            Invoke-Checked "mesa-smoke" {
                Ensure-LocalRedisIfConfigured
                Invoke-WebPython -m pytest -q `
                    tests/test_reviewer_panel_boot_hotfix.py `
                    tests/test_revisor_command_handlers.py `
                    tests/test_revisor_command_side_effects.py `
                    tests/test_revisor_mesa_api_side_effects.py `
                    tests/test_revisor_realtime.py `
                    tests/test_revisor_ws.py `
                    tests/test_template_publish_contract.py `
                    tests/test_v2_reviewdesk_projection.py `
                    tests/test_v2_review_queue_projection.py `
                    tests/test_mesa_mobile_sync.py
            }
        }
        "mesa-acceptance" {
            Invoke-Checked "mesa-acceptance" {
                Invoke-WithEnv @{ RUN_E2E = "1" } {
                    Invoke-WebPython -m pytest -q `
                        tests/e2e/test_portais_playwright.py::test_e2e_revisor_ui_responde_e_inspetor_recebe `
                        tests/e2e/test_portais_playwright.py::test_e2e_revisor_exibe_painel_operacional_da_mesa `
                        tests/e2e/test_portais_playwright.py::test_e2e_revisor_mesa_ignora_respostas_atrasadas_ao_trocar_de_laudo `
                        --browser chromium `
                        --tracing retain-on-failure `
                        --video retain-on-failure `
                        --screenshot only-on-failure `
                        --output test-results/playwright-mesa `
                        -s
                }
            }
        }
        "document-acceptance" { Invoke-Checked "document-acceptance" { Invoke-RootPython scripts/run_document_phase_acceptance.py } }
        "document-pdf-qa" { Invoke-Checked "document-pdf-qa" { Invoke-RootPython scripts/run_document_pdf_qa.py --profile quick } }
        "document-pdf-qa-full" { Invoke-Checked "document-pdf-qa-full" { Invoke-RootPython scripts/run_document_pdf_qa.py --profile full } }
        "observability-acceptance" { Invoke-Checked "observability-acceptance" { Invoke-RootPython scripts/run_observability_phase_acceptance.py } }
        "hygiene-check" { Invoke-Checked "hygiene-check" { Invoke-RootPython scripts/check_workspace_hygiene.py } }
        "binary-assets-audit" { Invoke-Checked "binary-assets-audit" { Invoke-RootPython scripts/audit_tracked_binaries.py } }
        "binary-assets-audit-strict" { Invoke-Checked "binary-assets-audit-strict" { Invoke-RootPython scripts/audit_tracked_binaries.py --strict --threshold-mb 10 } }
        "hygiene-acceptance" { Invoke-Checked "hygiene-acceptance" { Invoke-RootPython scripts/run_hygiene_phase_acceptance.py } }
        "v2-acceptance" { Invoke-Checked "v2-acceptance" { Invoke-RootPython scripts/run_v2_phase_acceptance.py } }
        "post-plan-benchmarks" { Invoke-Checked "post-plan-benchmarks" { Invoke-RootPython scripts/run_post_plan_benchmarks.py } }
        "contract-check" {
            Invoke-Checked "contract-check" { Invoke-WebPython -m pytest -q tests/test_transaction_contract.py tests/test_tenant_access.py tests/test_v2_android_public_contract.py tests/test_v2_admin_contract_catalogs.py }
        }
        "document-contract-check" {
            $documentContractRuntimeDir = Join-Path $script:Root ".test-artifacts\runtime\document-contract-check"
            $documentContractProfileDir = Join-Path $documentContractRuntimeDir "perfis"
            $documentContractMesaDir = Join-Path $documentContractRuntimeDir "mesa_anexos"
            $documentContractLearningDir = Join-Path $documentContractRuntimeDir "aprendizados_ia"
            New-Item -ItemType Directory -Path $documentContractProfileDir -Force | Out-Null
            New-Item -ItemType Directory -Path $documentContractMesaDir -Force | Out-Null
            New-Item -ItemType Directory -Path $documentContractLearningDir -Force | Out-Null
            Invoke-Checked "document-contract-check import pypdf" {
                Invoke-WithEnv @{
                    AMBIENTE = "dev"
                    TARIEL_UPLOADS_STORAGE_MODE = "local_fs"
                    PASTA_UPLOADS_PERFIS = $documentContractProfileDir
                    PASTA_ANEXOS_MESA = $documentContractMesaDir
                    PASTA_APRENDIZADOS_VISUAIS_IA = $documentContractLearningDir
                } {
                    Invoke-WebPython -c "import importlib.util, sys; modulo = importlib.util.find_spec('pypdf'); print('pypdf: ok' if modulo else 'pypdf: missing'); sys.exit(0 if modulo else 1)"
                }
            }
            Invoke-Checked "document-contract-check pytest" {
                Invoke-WithEnv @{
                    AMBIENTE = "dev"
                    TARIEL_UPLOADS_STORAGE_MODE = "local_fs"
                    PASTA_UPLOADS_PERFIS = $documentContractProfileDir
                    PASTA_ANEXOS_MESA = $documentContractMesaDir
                    PASTA_APRENDIZADOS_VISUAIS_IA = $documentContractLearningDir
                } {
                    Invoke-WebPython -m pytest -q tests/test_free_chat_report_pdf.py
                }
            }
        }
        "smoke-web" {
            Invoke-Checked "smoke-web" { Invoke-WebPython -m pytest -q tests/test_smoke.py tests/test_regras_rotas_criticas.py }
        }
        "demo-local-reset" {
            Invoke-Checked "demo-local-reset" { Invoke-WebPython scripts/seed_local_demo_company.py --reset }
        }
        "full-regression-audit" { Invoke-Checked "full-regression-audit" { Invoke-RootPython scripts/run_full_regression_audit.py --profile broad } }
        "full-regression-audit-critical" { Invoke-Checked "full-regression-audit-critical" { Invoke-RootPython scripts/run_full_regression_audit.py --profile critical } }
        "full-regression-audit-hosted" {
            Invoke-Checked "full-regression-audit-hosted" {
                $url = if ($env:TARIEL_AUDIT_BASE_URL) { $env:TARIEL_AUDIT_BASE_URL } else { "https://tariel-web-free.onrender.com" }
                Invoke-WithEnv @{ TARIEL_AUDIT_BASE_URL = $url } { Invoke-RootPython scripts/run_full_regression_audit.py --profile broad }
            }
        }
        "full-regression-audit-human" {
            Invoke-Checked "full-regression-audit-human" {
                $url = if ($env:TARIEL_AUDIT_BASE_URL) { $env:TARIEL_AUDIT_BASE_URL } else { "https://tariel-web-free.onrender.com" }
                Invoke-WithEnv @{ TARIEL_AUDIT_BASE_URL = $url } { Invoke-RootPython scripts/run_full_regression_audit.py --profile exhaustive --human-paced }
            }
        }
        "full-regression-audit-exhaustive" { Invoke-Checked "full-regression-audit-exhaustive" { Invoke-RootPython scripts/run_full_regression_audit.py --profile exhaustive } }
        "full-regression-audit-exhaustive-hosted" {
            Invoke-Checked "full-regression-audit-exhaustive-hosted" {
                $url = if ($env:TARIEL_AUDIT_BASE_URL) { $env:TARIEL_AUDIT_BASE_URL } else { "https://tariel-web-free.onrender.com" }
                Invoke-WithEnv @{ TARIEL_AUDIT_BASE_URL = $url } { Invoke-RootPython scripts/run_full_regression_audit.py --profile exhaustive }
            }
        }
        "full-regression-audit-exhaustive-human" {
            Invoke-Checked "full-regression-audit-exhaustive-human" {
                $url = if ($env:TARIEL_AUDIT_BASE_URL) { $env:TARIEL_AUDIT_BASE_URL } else { "https://tariel-web-free.onrender.com" }
                Invoke-WithEnv @{ TARIEL_AUDIT_BASE_URL = $url } { Invoke-RootPython scripts/run_full_regression_audit.py --profile exhaustive --human-paced }
            }
        }
        "mobile-install" {
            Invoke-Checked "mobile-install" { Invoke-Npm ci }
        }
        "mobile-lint" { Invoke-Checked "mobile-lint" { Invoke-Npm run lint } }
        "mobile-typecheck" { Invoke-Checked "mobile-typecheck" { Invoke-Npm run typecheck } }
        "mobile-test" { Invoke-Checked "mobile-test" { Invoke-Npm run test:baseline } }
        "mobile-format-check" { Invoke-Checked "mobile-format-check" { Invoke-Npm run format:check } }
        "mobile-baseline" {
            Invoke-Target "mobile-typecheck"
            Invoke-Target "mobile-lint"
            Invoke-Target "mobile-format-check"
            Invoke-Target "mobile-test"
        }
        "mobile-preview" { Invoke-Checked "mobile-preview" { Invoke-Npm run android:preview } }
        "mobile-wifi" { Invoke-Checked "mobile-wifi" { Invoke-BashScript "./scripts/dev/run_mobile_wifi.sh" } }
        "mobile-native-preflight" { Invoke-Checked "mobile-native-preflight" { Invoke-RootPython scripts/run_mobile_native_preflight.py } }
        "mobile-acceptance" {
            Invoke-Target "mobile-native-preflight"
            Invoke-Checked "mobile-acceptance" { Invoke-RootPython scripts/run_mobile_pilot_runner.py }
        }
        "mobile-ci" { Invoke-Target "mobile-baseline" }
        "smoke-mobile" {
            Invoke-Target "mobile-native-preflight"
            Invoke-Target "mobile-acceptance"
        }
        "python-security-audit" { Invoke-Checked "python-security-audit" { Invoke-RootPython scripts/run_python_security_audit.py } }
        "mobile-security-audit" { Invoke-Checked "mobile-security-audit" { Invoke-Npm audit --omit=dev --audit-level=high } }
        "public-repo-secret-scan" {
            Invoke-Checked "public-repo-secret-scan" {
                New-Item -ItemType Directory -Path (Join-Path $script:Root "artifacts\security") -Force | Out-Null
                Push-Location $script:Root
                try {
                    Invoke-Native "docker" @(
                        "run",
                        "--rm",
                        "-v",
                        "${script:Root}:/repo",
                        "zricethezav/gitleaks:latest",
                        "detect",
                        "--source=/repo",
                        "--redact",
                        "--report-format=json",
                        "--report-path=/repo/artifacts/security/gitleaks_report.json"
                    )
                }
                finally {
                    Pop-Location
                }
            }
        }
        "security-audit" {
            Invoke-Target "python-security-audit"
            Invoke-Target "mobile-security-audit"
        }
        "verify" {
            Invoke-Target "web-ci"
            Invoke-Target "mobile-ci"
            Invoke-Target "mesa-smoke"
        }
        "release-verify-local" {
            Invoke-Target "verify"
            Invoke-Target "contract-check"
            Invoke-Target "hygiene-check"
            Invoke-Target "security-audit"
            Invoke-Target "binary-assets-audit-strict"
            Invoke-Target "production-ops-check-strict"
            Invoke-Target "uploads-restore-drill"
            Invoke-Target "document-contract-check"
        }
        "production-ops-check" {
            Invoke-Checked "production-ops-check" { Invoke-RootPython scripts/run_production_ops_check.py --json }
        }
        "production-ops-check-strict" {
            Invoke-Checked "production-ops-check-strict" {
                Invoke-WithLocalProductionOpsEnv {
                    Invoke-RootPython scripts/run_production_ops_check.py --json --strict
                }
            }
        }
        "uploads-restore-drill" { Invoke-Checked "uploads-restore-drill" { Invoke-RootPython scripts/run_uploads_restore_drill.py --json } }
        "uploads-cleanup-check" {
            Invoke-Checked "uploads-cleanup-check" {
                Invoke-WithLocalProductionOpsEnv {
                    Invoke-PrepareLocalProductionOpsDatabase
                    Invoke-RootPython scripts/run_uploads_cleanup.py --json --strict
                }
            }
        }
        "uploads-cleanup-apply" {
            Invoke-Checked "uploads-cleanup-apply" {
                Invoke-WithLocalProductionOpsEnv {
                    Invoke-PrepareLocalProductionOpsDatabase
                    Invoke-RootPython scripts/run_uploads_cleanup.py --apply --json --strict
                }
            }
        }
        "post-deploy-cleanup-observation" { Invoke-Checked "post-deploy-cleanup-observation" { Invoke-RootPython scripts/run_post_deploy_cleanup_observation.py --json --strict } }
        "release-gate-hosted" {
            Invoke-Target "verify"
            Invoke-Target "mesa-acceptance"
            Invoke-Target "document-acceptance"
            Invoke-Target "observability-acceptance"
        }
        "release-gate-real" {
            Invoke-Target "release-gate-hosted"
            Invoke-Target "smoke-mobile"
            Invoke-Target "production-ops-check-strict"
            Invoke-Target "uploads-restore-drill"
            Invoke-Target "uploads-cleanup-check"
        }
        "release-verify" {
            Invoke-Target "release-verify-local"
            Invoke-Target "release-gate-real"
        }
        "release-gate" { Invoke-Target "release-gate-real" }
        "final-product-stamp" {
            Invoke-Target "release-gate"
            Invoke-Target "post-deploy-cleanup-observation"
        }
        "clean-generated" {
            Invoke-Checked "clean-generated" {
                @(
                    "web\.pytest_cache",
                    "web\.ruff_cache",
                    "web\.mypy_cache",
                    "web\htmlcov",
                    "web\.coverage",
                    "android\.expo",
                    "android\.turbo",
                    "android\dist",
                    "android\android\build",
                    ".test-artifacts",
                    "_tmp_pdf_preview",
                    ".tmp_online\baseline",
                    "local-mobile-api.log",
                    "local-mobile-api.error.log",
                    "local-mobile-api.pid",
                    "android\expo-mobile.log",
                    "android\expo-mobile.pid"
                ) | ForEach-Object { Remove-GeneratedPath $_ }
            }
        }
        "baseline-snapshot" { Invoke-Checked "baseline-snapshot" { Invoke-BashScript "./scripts/dev/write_baseline_snapshot.sh" } }
        "ci" { Invoke-Target "release-gate-hosted" }
        default {
            throw "Alvo desconhecido: $Name. Rode .\make.ps1 help."
        }
    }
}

Invoke-Target $Target $ExtraArgs
