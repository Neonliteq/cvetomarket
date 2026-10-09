#!/usr/bin/env bash
# Бэкап базы данных: pg_dump | gzip в каталог с ротацией.
# Запускается на сервере (по cron или вручную):
#   bash scripts/backup-db.sh
#
# Переменные: APP_DIR, BACKUP_DIR, RETAIN_DAYS
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/cvetomarket}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/cvetomarket}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

cd "$APP_DIR" || { echo "Нет каталога $APP_DIR"; exit 1; }

set -a; . ./.env; set +a
: "${DATABASE_URL:?DATABASE_URL не задан в .env}"

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/db-$(date +%F_%H-%M).sql.gz"

pg_dump "$DATABASE_URL" | gzip -9 > "$file"

size=$(du -h "$file" | cut -f1)
echo "$(date '+%F %T') backup: $file ($size)"

# Ротация: удаляем дампы старше RETAIN_DAYS дней
deleted=$(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sql.gz' -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
[ "$deleted" -gt 0 ] && echo "$(date '+%F %T') удалено старых дампов: $deleted"

# Сводка по каталогу
echo "$(date '+%F %T') всего дампов: $(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sql.gz' | wc -l), размер: $(du -sh "$BACKUP_DIR" | cut -f1)"
