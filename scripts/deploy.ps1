<#
.SYNOPSIS
    Выкатывает текущую ветку на прод: ветка → main → push → deploy.sh → проверка.

.DESCRIPTION
    Полный цикл деплоя без ручных шагов. Требует plink (PuTTY) и доступы к серверу.
    Доступы НЕ хранятся в репозитории — передаются параметрами или переменными окружения.

.PARAMETER Server
    Пользователь и хост, например root@203.0.113.10. Либо переменная CV_SERVER.

.PARAMETER Password
    Пароль SSH. Либо переменная CV_DEPLOY_PASSWORD.

.PARAMETER Branch
    Какую ветку выкатывать. По умолчанию — текущая.

.PARAMETER SkipVerify
    Не запускать смоук-проверку после деплоя.

.EXAMPLE
    $env:CV_SERVER='root@203.0.113.10'; $env:CV_DEPLOY_PASSWORD='...'
    pwsh -File scripts/deploy.ps1
#>
param(
    [string]$Server = $env:CV_SERVER,
    [string]$Password = $env:CV_DEPLOY_PASSWORD,
    [string]$Branch,
    [string]$Plink = 'C:\Program Files\PuTTY\plink.exe',
    [int]$TimeoutSec = 420,
    [string]$AppDir = '/var/www/cvetomarket',
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$git = if ($env:CV_GIT) { $env:CV_GIT } else { 'G:\Deepseek\tools\git\cmd\git.exe' }
if (-not (Test-Path $git)) { $git = 'git' }

# ---------------------------------------------------------------------------
# Хелперы (определены до использования)
# ---------------------------------------------------------------------------
function Invoke-Remote([string]$Command) {
    $out = & $Plink -ssh -batch -pw $Password $Server $Command 2>&1
    return $out
}

function Invoke-Git([string[]]$GitArgs) {
    $out = & $git -C $repoRoot @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("git {0} завершился с ошибкой: {1}" -f ($GitArgs -join ' '), ($out -join "`n"))
    }
    return $out
}

function Write-Step([string]$Text) { Write-Host "      $Text" }

# ---------------------------------------------------------------------------
if (-not $Server)   { throw 'Укажите сервер: -Server root@IP либо переменную CV_SERVER' }
if (-not $Password) { throw 'Укажите пароль: -Password ... либо переменную CV_DEPLOY_PASSWORD' }
if (-not (Test-Path $Plink)) { throw "Не найден plink: $Plink" }

if (-not $Branch) { $Branch = (Invoke-Git @('branch', '--show-current')).Trim() }
if (-not $Branch) { throw 'Не удалось определить текущую ветку' }

$dirty = Invoke-Git @('status', '--porcelain')
if ($dirty) { throw "В рабочем дереве есть незакоммиченные изменения:`n$($dirty -join "`n")" }

Write-Host "== Деплой ветки '$Branch' на $Server ==" -ForegroundColor Cyan

# --- 1. push ветки ----------------------------------------------------------
Write-Host '[1/4] Пуш ветки…'
$push = & $git -C $repoRoot push -u origin $Branch 2>&1
if ($LASTEXITCODE -ne 0) { throw "Не удалось запушить ветку $Branch`n$($push -join "`n")" }
$push | Select-Object -Last 2 | ForEach-Object { Write-Step $_ }

# --- 2. main fast-forward ---------------------------------------------------
Write-Host '[2/4] main → fast-forward ветки…'
& $git -C $repoRoot checkout main 2>&1 | Select-Object -Last 1 | ForEach-Object { Write-Step $_ }
$merge = & $git -C $repoRoot merge --ff-only $Branch 2>&1
if ($LASTEXITCODE -ne 0) { throw "main не удалось продвинуть fast-forward до $Branch`n$($merge -join "`n")" }
$pushMain = & $git -C $repoRoot push origin main 2>&1
if ($LASTEXITCODE -ne 0) { throw "Не удалось запушить main`n$($pushMain -join "`n")" }
$head = (& $git -C $repoRoot rev-parse --short HEAD).Trim()
Write-Step "main = $head"

# --- 3. деплой на сервере ---------------------------------------------------
Write-Host '[3/4] Запуск deploy.sh на сервере…'
$log = '/tmp/deploy.log'
Invoke-Remote "cd $AppDir && git pull --ff-only origin main && rm -f $log && nohup bash deploy/deploy.sh > $log 2>&1 & echo started" | Out-Null

$deadline = (Get-Date).AddSeconds($TimeoutSec)
$done = $false
$lastTail = ''
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 8
    $tail = ((Invoke-Remote "tail -n 3 $log 2>/dev/null") -join "`n").Trim()
    if ($tail -and $tail -ne $lastTail) {
        Write-Step "…$(($tail -split "`n")[-1])"
        $lastTail = $tail
    }
    if ($tail -match 'Деплой завершён успешно') { $done = $true; break }
    if ($tail -match 'npm ERR') { break }
}
if (-not $done) {
    Write-Host "Деплой не подтвердился за $TimeoutSec с. Последние строки лога:" -ForegroundColor Red
    Invoke-Remote "tail -n 40 $log" | ForEach-Object { "      $_" }
    throw 'Деплой не завершился успешно'
}
Write-Host '      деплой завершён' -ForegroundColor Green

# --- 4. проверка ------------------------------------------------------------
if ($SkipVerify) { Write-Host '[4/4] проверка пропущена (-SkipVerify)'; return }

Write-Host '[4/4] Смоук-проверка прода…'
Invoke-Remote "bash $AppDir/scripts/verify-prod.sh" | ForEach-Object { Write-Step $_ }

Write-Host ''
Write-Host "Готово: main = $head (ветка $Branch)" -ForegroundColor Green
