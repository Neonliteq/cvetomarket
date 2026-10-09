# Эксплуатация прода

> Доступы (IP, SSH-логин, пароль) **намеренно не хранятся в репозитории**. Держите их в локальных заметках.
> Ниже `SERVER` = `root@<IP_прод-сервера>`, `APP_DIR` = `/var/www/cvetomarket`, `APP_NAME` = `cvetomarket`.

## Сервер

| Параметр | Значение |
|---|---|
| Хостинг | VPS Reg.ru, Ubuntu 22.04 |
| Ресурсы | 2 CPU, 2 ГБ RAM, 40 ГБ SSD |
| Node.js | 20 |
| Веб-сервер | nginx (reverse proxy, HTTP/2, кэш `/objects`) |
| Процесс-менеджер | PM2, режим **cluster, 2 воркера** |
| Каталог приложения | `/var/www/cvetomarket` |
| Порт приложения | `127.0.0.1:5000` |
| БД | PostgreSQL на том же сервере, строка в `.env` (`DATABASE_URL`) |
| Файлы | `/var/www/cvetomarket/uploads` (локальное зеркало, ~1.4 ГБ) |
| Домен | https://cveto.market |

## Деплой

Скрипт `deploy/deploy.sh` (запускается на сервере из `APP_DIR`):

1. `git pull origin main`
2. `pm2 stop cvetomarket` — **до** сборки, иначе на 2 ГБ RAM `npm ci` ловит OOM
3. `NODE_ENV=development npm ci` (devDependencies нужны для сборки)
4. `npm run build`
5. `pm2 delete cvetomarket` → `set -a && source .env` → `pm2 start deploy/ecosystem.config.cjs` → `pm2 save`

**Из локального окружения:** `scripts/deploy.ps1` делает всё это сам (push ветки → fast-forward `main` → push → запуск `deploy.sh` → ожидание → `scripts/verify-prod.sh`).

**Вручную через SSH:**

```bash
cd /var/www/cvetomarket && nohup bash deploy/deploy.sh > /tmp/deploy.log 2>&1 & echo $!
tail -f /tmp/deploy.log            # ждать «Деплой завершён успешно!»
bash scripts/verify-prod.sh        # смоук-проверка
```

### Откат

```bash
cd /var/www/cvetomarket
git log --oneline -5               # найти предыдущий коммит
git reset --hard <commit> && bash deploy/deploy.sh
```
Откат **не трогает БД**. Если правка меняла схему — откатывайте схему осознанно (`shared/schema.ts` + `npm run db:push`).

## PM2

```bash
pm2 status cvetomarket             # состояние воркеров
pm2 logs cvetomarket --lines 100   # логи (см. пути ниже)
pm2 restart cvetomarket            # перезапуск без сборки
pm2 describe cvetomarket | grep -i "log path"
```

Конфиг — `deploy/ecosystem.config.cjs` (обязательно **`.cjs`**: у проекта `"type": "module"`).
Ключевые параметры: `instances: 2`, `exec_mode: cluster`, `max_memory_restart: 512M`, `merge_logs: true`.

### Логи и ротация

- Актуальные логи: **`/var/log/cvetomarket/out.log`** и **`/var/log/cvetomarket/error.log`** (общие для обоих воркеров, благодаря `merge_logs: true`).
- Установлен **`pm2-logrotate`**: `max_size 50M`, `retain 5`, `compress true`, ежедневная ротация.
- Легаси-каталог `~/.pm2/logs/` больше не используется (файлы от старой конфигурации удалены).
- Просмотр: `tail -f /var/log/cvetomarket/out.log`, поиск по коду оплаты — `grep -a "robokassa/result" /var/log/cvetomarket/out*.log`.

## nginx

Конфиг сайта — `/etc/nginx/sites-enabled/cvetomarket` (эталон в репозитории: `deploy/nginx.conf`):

- `location /` → `proxy_pass http://127.0.0.1:5000` (WebSocket-заголовки, `proxy_buffering off`).
- `location ^~ /objects` → проксирование + `proxy_cache cveto_objects`.
- Статика (`js|css|png|…`) → `expires 1y; immutable` (имена файлов хэшированные).
- Кэш `/objects`: `proxy_cache_path /var/cache/nginx/cveto_objects … max_size=10g inactive=45d` (в `/etc/nginx/nginx.conf`).

```bash
nginx -t && systemctl reload nginx
du -sh /var/cache/nginx/cveto_objects     # текущий размер кэша
```

## База данных

```bash
cd /var/www/cvetomarket && set -a && . ./.env && set +a
psql "$DATABASE_URL" -c "select count(*) from orders;"
bash scripts/db-query.sh "select order_number, payment_status, payment_id from orders order by created_at desc limit 5;"
```

Бэкап (пример):

```bash
pg_dump "$DATABASE_URL" | gzip > /root/backup-$(date +%F).sql.gz
```

> Регулярные бэкапы **не настроены** — при необходимости добавьте cron и выгрузку во внешнее хранилище.

## Диск и файлы

```bash
df -h /                        # свободное место
du -sh /var/www/cvetomarket/uploads        # локальное зеркало картинок
ls /var/www/cvetomarket/uploads | wc -l
npm run backfill:uploads        # дозаполнить зеркало из S3 (повторный запуск безопасен)
```

Зеркало `uploads` — основной источник изображений (S3 — резерв при сбоях). Если добавлялись файлы в обход сайта, дозаполните зеркало.

## Проверка после деплоя (чек-лист)

1. `git -C /var/www/cvetomarket rev-parse --short HEAD` — нужный коммит.
2. `pm2 status cvetomarket` — 2 воркера `online`, `restarts` не растёт.
3. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/` → `200`.
4. `curl -s -o /dev/null -w "%{http_code}" -L https://cveto.market/` → `200`.
5. Проверить изменённую функциональность (маршрут API / наличие строки в собранном бандле).
6. `bash scripts/verify-prod.sh` — автоматический смоук.

## Регулярные операции

| Задача | Команда |
|---|---|
| Дозаполнить зеркало картинок | `npm run backfill:uploads` |
| Проверить конфиг Robokassa | `scripts/verify-prod.sh` (раздел «Robokassa») |
| Почистить кэш nginx `/objects` | `rm -rf /var/cache/nginx/cveto_objects/*` + `systemctl reload nginx` |
| Перезапустить приложение | `pm2 restart cvetomarket` |
