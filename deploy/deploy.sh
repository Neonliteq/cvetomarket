#!/bin/bash
set -e

# =============================================================================
# ЦветоМаркет — Скрипт обновления приложения
# =============================================================================

APP_DIR="/var/www/cvetomarket"
APP_NAME="cvetomarket"

cd "${APP_DIR}"

echo "=========================================="
echo " ЦветоМаркет — Деплой $(date +'%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo "[1/4] Получение последних изменений из Git..."
git pull origin main

# Stop the app before the memory-hungry build steps — on a 2GB box the
# running PM2 workers + npm ci/build can get OOM-killed, aborting the deploy.
pm2 stop "${APP_NAME}" 2>/dev/null || true

echo "[2/4] Установка зависимостей (включая devDependencies для сборки)..."
# Unset NODE_ENV so npm ci installs devDependencies needed for build
NODE_ENV=development npm ci

echo "[3/4] Сборка проекта..."
npm run build

echo "[4/4] Перезапуск PM2 (кластер, 2 воркера)..."
pm2 delete "${APP_NAME}" 2>/dev/null || true
set -a && source .env && set +a
pm2 start deploy/ecosystem.config.cjs
pm2 save

echo ""
echo "Деплой завершён успешно!"
pm2 status "${APP_NAME}"
