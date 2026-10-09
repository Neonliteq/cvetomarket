#!/usr/bin/env bash
# Смоук-проверка прода. Запускается НА СЕРВЕРЕ из каталога приложения:
#   bash /var/www/cvetomarket/scripts/verify-prod.sh
# Возвращает ненулевой код, если что-то не прошло.
set -uo pipefail

APP_DIR="${APP_DIR:-/var/www/cvetomarket}"
BASE="${BASE:-http://127.0.0.1:5000}"
DOMAIN="${DOMAIN:-https://cveto.market}"

cd "$APP_DIR" || { echo "Нет каталога $APP_DIR"; exit 1; }

pass=0; fail=0
ok()    { printf '  PASS  %s\n' "$1"; pass=$((pass+1)); }
bad()   { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }
check() { # check "название" "получено" "ожидалось"
  if [ "$2" = "$3" ]; then ok "$1 = $2"; else bad "$1: получено '$2', ожидалось '$3'"; fi
}

echo "== Смоук-проверка прода =="

echo "-- репозиторий --"
echo "  коммит: $(git rev-parse --short HEAD)"
echo "  ветка:  $(git rev-parse --abbrev-ref HEAD)"

echo "-- pm2 --"
online=$(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);console.log(a.filter(p=>p.name==="cvetomarket"&&p.pm2_env&&p.pm2_env.status==="online").length)}catch(e){console.log(0)}})')
check "воркеров online" "$online" "2"

echo "-- HTTP (Node напрямую) --"
for path in / /api/products /oferta /checkout /payment/success /legal-info; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")
  check "GET $path" "$code" "200"
done

echo "-- Robokassa --"
if command -v npx >/dev/null 2>&1; then
  set -a; . ./.env 2>/dev/null; set +a
  rk=$(npx tsx -e 'import("./server/robokassa.ts").then(m=>{const u=new URL(m.buildPaymentUrl({account:1,sum:1,desc:"probe"}));console.log(m.isRobokassaConfigured()+"|"+u.searchParams.get("MrchLogin")+"|"+u.searchParams.get("IsTest"))}).catch(e=>console.log("ERR"))' 2>/dev/null | tail -1)
  echo "  configured|login|IsTest = $rk"
  case "$rk" in
    true\|*\|0) ok "Robokassa настроена, режим боевой" ;;
    true\|*\|1) ok "Robokassa настроена, режим ТЕСТОВЫЙ" ;;
    *)          bad "Robokassa: не настроена или ошибка ($rk)" ;;
  esac
fi

echo "-- локальное зеркало изображений --"
files=$(ls uploads 2>/dev/null | wc -l | tr -d ' ')
size=$(du -sh uploads 2>/dev/null | cut -f1)
echo "  файлов: $files, размер: ${size:-0}"
if [ "${files:-0}" -gt 0 ]; then ok "зеркало uploads заполнено"; else bad "каталог uploads пуст"; fi

echo "-- логи --"
for f in /var/log/cvetomarket/out.log /var/log/cvetomarket/error.log; do
  if [ -f "$f" ]; then ok "лог на месте: $f"; else bad "нет лога: $f"; fi
done

echo "-- диск --"
echo "  $(df -h / | tail -1)"

echo ""
echo "== Итог: $pass успешно, $fail с ошибками =="
[ "$fail" -eq 0 ]
