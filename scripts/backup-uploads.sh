#!/usr/bin/env bash
# Архив локального зеркала изображений (uploads/) с ротацией.
#
# Зачем: изображения хранятся ТОЛЬКО на диске сервера (внешнего хранилища нет),
# поэтому нужна страховка от случайного удаления/порчи файлов.
# Запускается на сервере:
#   bash scripts/backup-uploads.sh
#
# Переменные: APP_DIR, BACKUP_DIR, RETAIN_COPIES
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/cvetomarket}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/cvetomarket}"
RETAIN_COPIES="${RETAIN_COPIES:-3}"

cd "$APP_DIR" || { echo "Нет каталога $APP_DIR"; exit 1; }
[ -d uploads ] || { echo "Нет каталога uploads — нечего архивировать"; exit 1; }

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/uploads-$(date +%F).tar.gz"

tar -czf "$file" uploads
echo "$(date '+%F %T') архив: $file ($(du -h "$file" | cut -f1)), файлов: $(ls uploads | wc -l)"

# Ротация: оставляем RETAIN_COPIES последних архивов
mapfile -t old < <(ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +$((RETAIN_COPIES + 1)))
if [ "${#old[@]}" -gt 0 ]; then
  rm -f "${old[@]}"
  echo "$(date '+%F %T') удалено старых архивов: ${#old[@]}"
fi

echo "$(date '+%F %T') всего архивов: $(ls -1 "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | wc -l), каталог: $(du -sh "$BACKUP_DIR" | cut -f1)"
