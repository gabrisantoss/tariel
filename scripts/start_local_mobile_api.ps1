$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $root "web"
Set-Location $root

$logPath = Join-Path $root "local-mobile-api.log"
$runtimeDir = Join-Path $root ".test-artifacts\runtime"
$dbPath = (Join-Path $runtimeDir "tariel-mobile-dev.sqlite3").Replace("\", "/")
if (Test-Path $logPath) {
    Remove-Item $logPath -Force
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$env:AMBIENTE = "dev"
$env:DATABASE_URL = "sqlite:///$dbPath"
$env:DB_BOOTSTRAP_BLOCKING_STARTUP = "0"
$env:REVISOR_REALTIME_FAIL_CLOSED_ON_STARTUP = "0"
$env:PYTHONPATH = "."
$env:SEED_DEV_BOOTSTRAP = "1"

$pythonCandidates = @(
    (Join-Path $root ".venv\Scripts\python.exe"),
    (Join-Path $root "venv\Scripts\python.exe"),
    (Join-Path $webRoot ".venv\Scripts\python.exe"),
    (Join-Path $webRoot "venv\Scripts\python.exe")
)
$python = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not (Test-Path $python)) {
    throw "Python virtualenv nao encontrado em $($pythonCandidates -join ', ')"
}

if (-not (Test-Path $webRoot)) {
    throw "Pasta web nao encontrada em $webRoot"
}

try {
    $processosPorta = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($portaPid in $processosPorta) {
        if ($portaPid) {
            Stop-Process -Id $portaPid -Force -ErrorAction SilentlyContinue
        }
    }
    Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -eq "python.exe" -and
            $_.CommandLine -match "uvicorn\s+main:app" -and
            $_.CommandLine -match "--port\s+8000"
        } |
        ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
} catch {
}

Start-Sleep -Milliseconds 400

Push-Location $webRoot
try {
    & $python -m uvicorn main:app --app-dir . --host 0.0.0.0 --port 8000 *>> $logPath
} finally {
    Pop-Location
}
