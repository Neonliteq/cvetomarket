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

### Бэкапы БД

Дампы делает `scripts/backup-db.sh` (pg_dump → gzip в `/var/backups/cvetomarket`, хранение 14 дней):

```bash
cd /var/www/cvetomarket && bash scripts/backup-db.sh        # вручную
ls -lh /var/backups/cvetomarket                             # список дампов
```

Настроен cron — ежедневно в 03:30, лог пишется в `/var/log/cvetomarket/backup.log`:

```bash
crontab -l | grep backup-db
tail -n 20 /var/log/cvetomarket/backup.log
```

Восстановление:

```bash
gunzip -c /var/backups/cvetomarket/db-<дата>.sql.gz | psql "$DATABASE_URL"
```

> Дампы лежат **локально на том же сервере**. Для устойчивости к потере сервера стоит выгружать их во внешнее хранилище (облако) — можно добавить в тот же скрипт.

## Диск и файлы

Изображения хранятся только на диске сервера, внешнего хранилища нет — поэтому важны и место, и резервные копии.

```bash
df -h /                                     # свободное место
du -sh /var/www/cvetomarket/uploads         # размер каталога с файлами
ls /var/www/cvetomarket/uploads | wc -l     # количество файлов
```

### Архив изображений

`scripts/backup-uploads.sh` делает tar.gz-архив `uploads/` в `/var/backups/cvetomarket` и хранит 3 последних копии:

```bash
cd /var/www/cvetomarket && bash scripts/backup-uploads.sh
ls -lh /var/backups/cvetomarket/uploads-*.tar.gz
```

Восстановление: `tar -xzf /var/backups/cvetomarket/uploads-<дата>.tar.gz -C /var/www/cvetomarket`

> Архив лежит на том же диске — это защита от случайного удаления, но не от потери сервера. Для полной защиты нужна выгрузка за пределы сервера.

### Очистка диска

`scripts/cleanup-uploads.sh` срабатывает **только когда диск заполнен выше порога** (`THRESHOLD`, по умолчанию 85 %):

```bash
cd /var/www/cvetomarket
THRESHOLD=70 DRY_RUN=1 bash scripts/cleanup-uploads.sh   # посмотреть, что удалилось бы
bash scripts/cleanup-uploads.sh                          # реальная очистка
```

**Удаляется:**
- **старые фото сборки заказов** (`orders.assembly_photo_url`) — только у доставленных и отменённых заказов старше `ORDER_PHOTO_MAX_AGE_DAYS` дней (по умолчанию 30). Ссылка в заказе обнуляется, чтобы не осталось «битых» картинок;
- временные файлы `*.tmp-*` от прерванных загрузок;
- опционально «осиротевшие» файлы, если задать `ORPHAN_MIN_AGE_DAYS > 0` (по умолчанию выключено).

**Никогда не удаляется** (скрипт сверяется с БД): фото товаров (`products.images`), логотипы и обложки магазинов, аватары, изображения в чатах, фото товаров в позициях заказов, изображения черновиков товаров.

Настроен cron — ежедневно в **04:10**, лог в `/var/log/cvetomarket/cleanup.log`.

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
| Архив изображений | `bash scripts/backup-uploads.sh` |
| Очистка диска (только выше порога) | `bash scripts/cleanup-uploads.sh` |
| Бэкап БД | `bash scripts/backup-db.sh` |
| Проверить конфиг Robokassa | `scripts/verify-prod.sh` (раздел «Robokassa») |
| Почистить кэш nginx `/objects` | `rm -rf /var/cache/nginx/cveto_objects/*` + `systemctl reload nginx` |
| Перезапустить приложение | `pm2 restart cvetomarket` |
