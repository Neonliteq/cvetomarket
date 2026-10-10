# Известные проблемы и решения

## Локальная разработка

### PostgreSQL не стартует: «cannot be run as … administrator»
**Причина:** шелл запущен с повышенными правами, а PostgreSQL отказывается работать из-под администратора.
**Решение:** запустить через ограниченный токен:

```powershell
runas /trustlevel:0x20000 "G:\Deepseek\tools\pg\pgsql\bin\postgres.exe -D G:\Deepseek\pgdata -p 5433"
```

Задачи через `schtasks /rl LIMITED` **не помогают** — процесс всё равно получает админ-токен. Учтено в `scripts/dev.ps1`.

### Устаревший `postmaster.pid`
Если сервер был убит, в `pgdata` может остаться `postmaster.pid` от мёртвого процесса — удалите файл и запустите заново (убедившись, что процесс не жив).

### Порт 5000 занят
На машине могут висеть чужие dev-серверы (в том числе от других проектов). Проверить и выбрать другой порт:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object OwningProcess
$env:PORT='5055'; npx tsx server/index.ts
```

### Dev-сервер не подхватывает правки сервера
`tsx server/index.ts` без `--watch` загружает код один раз — после правок бэкенда перезапустите процесс. Правки клиента Vite подхватывает сам (HMR).

### `npm ci` падает / не хватает памяти на сервере
На проде 2 ГБ RAM: `deploy/deploy.sh` сначала делает `pm2 stop cvetomarket`, и только потом `npm ci`. Вручную — та же последовательность.

## Прод

### Приложение не поднялось после деплоя
1. `pm2 logs cvetomarket --lines 100 --nostream` → `/var/log/cvetomarket/error.log`.
2. Проверить, что PM2-конфиг **`.cjs`** (при `.js` ESM-проект падает).
3. `git -C /var/www/cvetomarket rev-parse --short HEAD` — тот ли коммит.
4. Откат: `git reset --hard <предыдущий коммит> && bash deploy/deploy.sh`.

### Фото товаров не грузятся / «битые» картинки
**Причина:** файла нет в каталоге `uploads/` на диске сервера (изображения хранятся только там; внешнего хранилища нет). Маршрут `/objects/...` в этом случае отдаёт заглушку.

```bash
cd /var/www/cvetomarket
ls uploads | wc -l ; du -sh uploads            # что вообще есть
ls -la uploads | grep <имя-из-URL>             # есть ли конкретный файл
curl -sI http://127.0.0.1:5000/objects/uploads/<имя> | head -3
```

Если файл потерян — восстановите из архива: `tar -xzf /var/backups/cvetomarket/uploads-<дата>.tar.gz -C /var/www/cvetomarket` (см. `docs/operations.md`).

### Плата прошла, но заказ остался «Ожидает оплаты»
1. Result URL в ЛК Robokassa должен быть `https://cveto.market/api/payment/robokassa/result`, метод **POST**.
2. Проверить логи: `grep -a "robokassa/result" /var/log/cvetomarket/out*.log`
   - нет строки — Robokassa не достучалась (URL/метод/доступность);
   - `invalid signature` — неверный **пароль #2** в `.env`;
   - `order not found for InvId` — InvId не совпадает с `order_number`.
3. Убедиться, что сервер отвечает `200` (мы возвращаем `OK<InvId>`, иначе Robokassa повторяет уведомление).

### Тестовый режим Robokassa не включается
Код читает `ROBOKASSA_TEST` **или** `ROBOKASSA_IS_TEST`; значения `true/1/yes/on` включают тест. Значение `false/0/пусто` — боевой.
Проверка текущего режима (на сервере):

```bash
cd /var/www/cvetomarket && set -a && . ./.env && set +a
npx tsx -e 'import("./server/robokassa.ts").then(m=>{const u=new URL(m.buildPaymentUrl({account:1,sum:1,desc:"t"}));console.log("login:",u.searchParams.get("MrchLogin"),"IsTest:",u.searchParams.get("IsTest"))})'
```

### Логи на проде
- Актуальные: `/var/log/cvetomarket/out.log`, `error.log` (общие для обоих воркеров, `merge_logs: true`).
- Ротация: `pm2-logrotate` (50 МБ, 5 файлов, сжатие).
- Каталог `~/.pm2/logs/` — легаси, не используется.
- Если после деплоя появились новые `out-N.log` — значит в `ecosystem.config.cjs` пропал `merge_logs: true`.

### Диск заполняется
```bash
df -h /
du -sh /var/www/cvetomarket/uploads /var/cache/nginx/cveto_objects /var/log/cvetomarket
```
Типовые потребители: зеркало изображений, кэш nginx `/objects`, логи PM2, снапшоты/дампы БД.

### Изменения не видны пользователям
PWA: сервис-воркер кэширует оболочку. Новый бандл подхватывается сам (`autoUpdate`), но иногда нужно 1–2 обновления страницы; на устройстве — Ctrl+F5 или инкогнито.

## Приложение

### Ошибка `delete from "users"` при удалении пользователя
Была вызвана внешними ключами (`notifications`, `notification_preferences`, `push_subscriptions`, `bonus_transactions`) — исправлено: `storage.deleteUser` чистит их перед удалением.
Если появляется снова — проверьте, не добавились ли новые таблицы с FK на `users(id)` и `ON DELETE NO ACTION`:

```sql
select tc.table_name, kcu.column_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name = 'users';
```

### Кнопка «глаз» (скрыть/показать товар) не срабатывает со второго раза
Была гонка в React Query: фоновый refetch перезаписывал оптимистичное обновление. Исправлено: `queryFn` передаёт `AbortSignal` (отмена работает), а мутация пишет в кэш ответ сервера. Если повторяется — проверьте, что в `client/src/lib/queryClient.ts` `fetch` вызывается с `signal`.

### Метрика не считает переходы внутри SPA
Счётчик инициализируется с `defer: true`, поэтому просмотры нужно отправлять вручную. Проверьте, что `client/src/lib/analytics.ts` вызывает `ym(ID, 'hit', …)` на смене маршрута (хук `useAnalytics` смонтирован в `App.tsx`).

### Цели Метрики не отображаются
`reachGoal` отправляется, но в отчётах пусто, пока цели **не созданы в интерфейсе** Метрики: Настройка → Цели → «JavaScript-событие» с идентификатором `registration` / `payment_success`.
