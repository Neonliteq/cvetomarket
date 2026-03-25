#!/bin/bash
set -e

# =============================================================================
# ЦветоМаркет — Скрипт обновления приложения
# =============================================================================
# Запускайте из директории приложения /var/www/cvetomarket:
#   bash deploy/deploy.sh
# =============================================================================

APP_DIR="/var/www/cvetomarket"
LOG_DIR="/var/log/cvetomarket"
APP_NAME="cvetomarket"

cd "${APP_DIR}"

echo "=========================================="
echo " ЦветоМаркет — Деплой $(date +'%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo "[1/6] Получение последних изменений из Git..."
git pull origin main

echo "[2/6] Установка зависимостей..."
npm ci --omit=dev

echo "[3/6] Сборка приложения..."
npm run build

echo "[4/6] Применение миграций базы данных..."
npm run db:push

echo "[5/6] Создание директории для логов..."
mkdir -p "${LOG_DIR}"

echo "[6/6] Перезапуск PM2..."
if pm2 list | grep -q "${APP_NAME}"; then
  pm2 reload "${APP_NAME}" --update-env
else
  pm2 start deploy/ecosystem.config.js
  pm2 save
fi

echo ""
echo "Деплой завершён успешно!"
echo "Статус:"
pm2 status "${APP_NAME}"
