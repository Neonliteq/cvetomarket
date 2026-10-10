#!/usr/bin/env bash
# Очистка диска от старых изображений. Запускается на сервере (по cron или вручную).
#
# Логика:
#   1. Смотрим заполнение диска с каталогом uploads. Ниже порога — выходим, ничего не трогаем.
#   2. Удаляем СТАРЫЕ ФОТО СБОРКИ ЗАКАЗОВ (orders.assembly_photo_url) у доставленных и
#      отменённых заказов старше ORDER_PHOTO_MAX_AGE_DAYS дней.
#   3. Опционально удаляем «осиротевшие» файлы, на которые нигде нет ссылок
#      (ORPHAN_MIN_AGE_DAYS > 0), — по умолчанию выключено.
#
# НИКОГДА не удаляются файлы, на которые ссылаются:
#   products.images, shops.logo_url/cover_url, users.avatar_url, messages.image_url,
#   order_items.product_image (это те же фото товаров) и черновики товаров.
#
# Переменные: APP_DIR, UPLOADS_DIR, THRESHOLD (%), ORDER_PHOTO_MAX_AGE_DAYS,
#             ORPHAN_MIN_AGE_DAYS (0 = выключено), DRY_RUN (1 = только показать),
#             NULL_DB_REFS (1 = обнулять ссылку в заказе после удаления файла)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/cvetomarket}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_DIR/uploads}"
THRESHOLD="${THRESHOLD:-85}"
ORDER_PHOTO_MAX_AGE_DAYS="${ORDER_PHOTO_MAX_AGE_DAYS:-30}"
ORPHAN_MIN_AGE_DAYS="${ORPHAN_MIN_AGE_DAYS:-0}"
DRY_RUN="${DRY_RUN:-0}"
NULL_DB_REFS="${NULL_DB_REFS:-1}"

cd "$APP_DIR" || { echo "Нет каталога $APP_DIR"; exit 1; }
[ -d "$UPLOADS_DIR" ] || { echo "Нет каталога $UPLOADS_DIR"; exit 1; }

set -a; . ./.env; set +a
: "${DATABASE_URL:?DATABASE_URL не задан в .env}"

log() { echo "$(date '+%F %T') $*"; }
disk_usage() { df -P "$UPLOADS_DIR" | awk 'NR==2 {gsub("%","",$5); print $5}'; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

usage="$(disk_usage)"
log "диск с uploads занят на ${usage}% (порог ${THRESHOLD}%)"
if [ "$usage" -lt "$THRESHOLD" ]; then
  log "порог не достигнут — очистка не требуется"
  exit 0
fi

# --- 1. Список ЗАЩИЩЁННЫХ файлов (никогда не удаляем) -----------------------
psql "$DATABASE_URL" -t -A -c "
  select distinct regexp_replace(u, '^/objects/uploads/', '')
  from (
    select unnest(images) as u from products where images is not null
    union all select logo_url from shops where logo_url is not null
    union all select cover_url from shops where cover_url is not null
    union all select avatar_url from users where avatar_url is not null
    union all select image_url from messages where image_url is not null
    union all select product_image from order_items where product_image is not null
    union all select jsonb_array_elements_text(payload->'images') from product_drafts
                where payload ? 'images' and jsonb_typeof(payload->'images') = 'array'
  ) t
  where u like '/objects/uploads/%'" | sort -u > "$tmp/protected.txt"
log "защищённых файлов (карточки товаров, логотипы, аватары, чаты, черновики): $(wc -l < "$tmp/protected.txt")"

deleted_files=0
freed_any=0

# --- 2. Старые фото сборки заказов -----------------------------------------
psql "$DATABASE_URL" -t -A -F$'\t' -c "
  select assembly_photo_url, regexp_replace(assembly_photo_url, '^/objects/uploads/', '')
  from orders
  where assembly_photo_url like '/objects/uploads/%'
    and status in ('delivered','cancelled')
    and coalesce(created_at, now()) < now() - interval '${ORDER_PHOTO_MAX_AGE_DAYS} days'
  order by created_at" > "$tmp/candidates.tsv"

# Отбрасываем всё, что есть в защищённом списке
awk -F'\t' 'NR==FNR{p[$1]=1; next} !($2 in p)' "$tmp/protected.txt" "$tmp/candidates.tsv" > "$tmp/todelete.tsv"
count=$(wc -l < "$tmp/todelete.tsv")
log "фото сборки старых заказов к удалению: $count"

if [ "$count" -gt 0 ]; then
  : > "$tmp/urls.txt"
  while IFS=$'\t' read -r url name; do
    [ -n "$name" ] || continue
    file="$UPLOADS_DIR/$name"
    if [ -f "$file" ]; then
      if [ "$DRY_RUN" = "1" ]; then
        log "  [dry-run] удалил бы: $name"
      else
        rm -f "$file"
        log "  удалён: $name"
      fi
      deleted_files=$((deleted_files + 1))
      printf '%s\n' "$url" >> "$tmp/urls.txt"
    fi
  done < "$tmp/todelete.tsv"

  # Обнуляем ссылку в заказе, чтобы не осталось «битых» картинок
  if [ "$NULL_DB_REFS" = "1" ] && [ "$DRY_RUN" != "1" ] && [ -s "$tmp/urls.txt" ]; then
    quoted=$(sed "s/'/''/g; s/^/'/; s/$/'/" "$tmp/urls.txt" | paste -sd, -)
    psql "$DATABASE_URL" -q -c "update orders set assembly_photo_url = null where assembly_photo_url in ($quoted)"
    log "  ссылки в заказах обнулены: $(wc -l < "$tmp/urls.txt")"
  fi
  freed_any=1
fi

# --- 3. Осиротевшие файлы (по умолчанию выключено) --------------------------
if [ "$ORPHAN_MIN_AGE_DAYS" -gt 0 ]; then
  find "$UPLOADS_DIR" -maxdepth 1 -type f -mtime +"$ORPHAN_MIN_AGE_DAYS" -printf '%f\n' \
    | sort -u > "$tmp/onDisk.txt"
  awk 'NR==FNR{p[$1]=1; next} !($1 in p)' "$tmp/protected.txt" "$tmp/onDisk.txt" > "$tmp/orphans.txt"
  # исключаем те, что уже удалены как фото заказов
  [ -f "$tmp/urls.txt" ] && sed 's|.*/||' "$tmp/urls.txt" | sort -u > "$tmp/gone.txt" || : > "$tmp/gone.txt"
  awk 'NR==FNR{g[$1]=1; next} !($1 in g)' "$tmp/gone.txt" "$tmp/orphans.txt" > "$tmp/orphans2.txt"
  ocount=$(wc -l < "$tmp/orphans2.txt")
  log "осиротевших файлов старше ${ORPHAN_MIN_AGE_DAYS} дн. к удалению: $ocount"
  while read -r name; do
    [ -n "$name" ] || continue
    if [ "$DRY_RUN" = "1" ]; then
      log "  [dry-run] удалил бы (сирота): $name"
    else
      rm -f "$UPLOADS_DIR/$name"
      log "  удалён (сирота): $name"
    fi
    deleted_files=$((deleted_files + 1))
  done < "$tmp/orphans2.txt"
  [ "$ocount" -gt 0 ] && freed_any=1
fi

# --- 4. Временные файлы от прерванных загрузок ------------------------------
tmpcount=$(find "$UPLOADS_DIR" -maxdepth 1 -type f -name '*.tmp-*' -mtime +1 | wc -l | tr -d ' ')
if [ "$tmpcount" -gt 0 ] && [ "$DRY_RUN" != "1" ]; then
  find "$UPLOADS_DIR" -maxdepth 1 -type f -name '*.tmp-*' -mtime +1 -delete
  log "удалено временных файлов: $tmpcount"
  freed_any=1
fi

log "итого удалено файлов: $deleted_files"
if [ "$freed_any" = "1" ]; then
  log "диск теперь занят на $(disk_usage)%"
else
  log "удалять было нечего — рассмотрите ORPHAN_MIN_AGE_DAYS или расширение диска"
fi
