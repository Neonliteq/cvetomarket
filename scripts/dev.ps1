<#
.SYNOPSIS
    Поднимает локальное окружение ЦветоМаркет: портативный PostgreSQL + dev-сервер.

.DESCRIPTION
    Одной командой: проверяет PostgreSQL на заданном порту, при необходимости
    запускает его (учитывая, что из-под администратора PostgreSQL стартовать
    отказывается — используется ограниченный токен), проверяет .env и
    node_modules и запускает dev-сервер.

.EXAMPLE
    pwsh -File scripts/dev.ps1
    pwsh -File scripts/dev.ps1 -Port 5055
    pwsh -File scripts/dev.ps1 -SkipPostgres

.NOTES
    Пути можно переопределить переменными окружения:
      CV_PG_BIN, CV_PG_DATA, CV_PG_PORT
#>
param(
    [int]$Port = 5000,
    [int]$PgPort = 5433,
    [switch]$SkipPostgres
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

# ---------------------------------------------------------------------------
# Настройки портативного PostgreSQL (переопределяются переменными окружения)
# ---------------------------------------------------------------------------
$PgBin  = if ($env:CV_PG_BIN)  { $env:CV_PG_BIN }  else { 'G:\Deepseek\tools\pg\pgsql\bin' }
$PgData = if ($env:CV_PG_DATA) { $env:CV_PG_DATA } else { 'G:\Deepseek\pgdata' }
if ($env:CV_PG_PORT) { $PgPort = [int]$env:CV_PG_PORT }
$PgExe = Join-Path $PgBin 'postgres.exe'

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Test-Elevated {
    try { return ((whoami /groups 2>$null) -match 'S-1-16-12288') } catch { return $false }
}

function Start-Postgres {
    if (-not (Test-Path $PgExe)) {
        throw "Не найден postgres.exe: $PgExe (переопределите CV_PG_BIN)"
    }
    if (-not (Test-Path $PgData)) {
        throw "Не найден каталог данных PostgreSQL: $PgData (переопределите CV_PG_DATA)"
    }

    # Устаревший postmaster.pid от убитого процесса мешает старту
    $pidFile = Join-Path $PgData 'postmaster.pid'
    if (Test-Path $pidFile) {
        $stalePid = (Get-Content $pidFile -First 1).Trim()
        if ($stalePid -notmatch '^\d+$' -or -not (Get-Process -Id ([int]$stalePid) -ErrorAction SilentlyContinue)) {
            Write-Host "  убираю устаревший postmaster.pid" -ForegroundColor DarkYellow
            Remove-Item $pidFile -Force
        }
    }

    if (Test-Elevated) {
        # PostgreSQL отказывается работать с админ-токеном — запускаем с ограниченным
        Write-Host "  шелл с правами администратора → запускаю PostgreSQL через runas /trustlevel" -ForegroundColor DarkYellow
        $cmd = '"{0}" -D "{1}" -p {2}' -f $PgExe, $PgData, $PgPort
        Start-Process -FilePath 'runas' -ArgumentList '/trustlevel:0x20000', $cmd -WindowStyle Hidden
    } else {
        Start-Process -FilePath $PgExe -ArgumentList @('-D', $PgData, '-p', "$PgPort") -WindowStyle Hidden
    }

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-PortListening $PgPort) { return $true }
    }
    return $false
}

# ---------------------------------------------------------------------------
Write-Host "== ЦветоМаркет: локальный запуск ==" -ForegroundColor Cyan

if (-not $SkipPostgres) {
    if (Test-PortListening $PgPort) {
        Write-Host "PostgreSQL уже слушает :$PgPort" -ForegroundColor Green
    } else {
        Write-Host "PostgreSQL не запущен — стартую (порт $PgPort)…"
        if (-not (Start-Postgres)) {
            throw "Не удалось поднять PostgreSQL на порту $PgPort. Смотрите лог в $PgData\server.err.log"
        }
        Write-Host "PostgreSQL слушает :$PgPort" -ForegroundColor Green
    }
}

$envFile = Join-Path $repoRoot '.env'
if (-not (Test-Path $envFile)) {
    throw "Нет файла .env. Создайте его из .env.example (минимум DATABASE_URL и SESSION_SECRET)."
}

if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
    Write-Host "node_modules отсутствует — выполняю npm ci…" -ForegroundColor Yellow
    Push-Location $repoRoot; npm ci; Pop-Location
}

if (Test-PortListening $Port) {
    throw "Порт $Port уже занят. Укажите другой: pwsh -File scripts/dev.ps1 -Port 5055"
}

# Переменные из .env в окружение процесса
Get-Content $envFile | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($k, $v)
}
$env:NODE_ENV = 'development'
$env:PORT = "$Port"

Write-Host ""
Write-Host "Dev-сервер: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "(в dev-режиме фронтенд отдаёт Vite с hot reload; Ctrl+C — остановить)" -ForegroundColor DarkGray
Write-Host ""

Push-Location $repoRoot
try { npx tsx server/index.ts } finally { Pop-Location }
