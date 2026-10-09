#!/usr/bin/env bash
# SQL-запрос к прод-базе. Запускается НА СЕРВЕРЕ.
#   scripts/db-query.sh "select count(*) from orders;"
#   scripts/db-query.sh                # интерактивный psql
set -uo pipefail

APP_DIR="${APP_DIR:-/var/www/cvetomarket}"
cd "$APP_DIR" || { echo "Нет каталога $APP_DIR"; exit 1; }

set -a; . ./.env; set +a
: "${DATABASE_URL:?DATABASE_URL не задан в .env}"

if [ $# -eq 0 ]; then
  exec psql "$DATABASE_URL"
fi

exec psql "$DATABASE_URL" -c "$*"
