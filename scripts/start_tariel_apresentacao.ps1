param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendLauncher = Join-Path $root "scripts\start_local_mobile_api_background.ps1"
$readyUrl = "http://127.0.0.1:8000/ready"
$presentationUrl = "http://127.0.0.1:8000/"

if (-not (Test-Path $backendLauncher)) {
    throw "Launcher do backend nao encontrado em $backendLauncher"
}

Write-Host "Subindo servidor local do Tariel..." -ForegroundColor Cyan
& $backendLauncher

$ready = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri $readyUrl -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
    }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    throw "Servidor nao respondeu com 200 em $readyUrl"
}

Write-Host "Tariel pronto em $presentationUrl" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Process $presentationUrl
}
