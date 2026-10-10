# AGENTS.md — ЦветоМаркет (cveto.market)

Точка входа для агента и разработчика. **Читай этот файл первым**, затем нужный документ из `docs/`.
Цель — не исследовать репозиторий заново на каждой задаче.

Кратко: маркетплейс цветочных магазинов (продавцы размещают товары, покупатели заказывают с доставкой).
Прод: **https://cveto.market**.

---

## Стек

| Слой | Технологии |
|---|---|
| Фронтенд | React 18 + TypeScript + Vite, TanStack Query, **wouter** (роутинг), Tailwind CSS + shadcn/ui (Radix), PWA (service worker, web-push) |
| Бэкенд | Node.js + Express 5, TypeScript, сессии в cookie (`express-session` + `connect-pg-simple`), helmet (CSP выключен) |
| БД | PostgreSQL + Drizzle ORM (`drizzle-kit push`), схема в `shared/schema.ts` |
| Файлы | хранятся на диске сервера (`<APP_DIR>/uploads`); внешнего объектного хранилища нет (см. `docs/architecture.md`) |
| Платежи | **Robokassa** (карта) + оплата наличными при получении. Есть неиспользуемый `server/unitpay.ts` |
| Аналитика | своя (`/api/analytics/*`) + Яндекс.Метрика (счётчик `112737627`) |
| Прод | VPS Reg.ru, nginx (reverse proxy + кэш `/objects`), PM2 в режиме **cluster (2 воркера)** |

---

## Карта репозитория

```
client/            фронтенд (Vite root = client/, HTML-шелл = client/index.html)
  src/pages/       страницы (Catalog, ProductDetail, Checkout, Account, Admin, ShopDashboard, …)
  src/components/  UI-компоненты (Header, Footer, ProductCard, …)
  src/lib/         queryClient, auth, cart, analytics, utils
  src/sw.ts        service worker (Workbox, injectManifest)
server/
  index.ts         точка входа: миграции + сборка express-приложения + listen
  routes.ts        ВСЕ API-маршруты (~2400 строк) — основной файл бэкенда
  storage.ts       слой данных (Drizzle-запросы, IStorage)
  localObjectStore.ts  локальное зеркало загруженных файлов
  robokassa.ts     платёжная интеграция (подпись, URL оплаты)
  static.ts        раздача SPA-сборки
  seed.ts          сиды для локальной разработки
  migrate.ts       применение схемы при старте
  objectRoutes.ts  отдача /objects с диска (+ ресайз `?w=`)
shared/schema.ts   ЕДИНАЯ схема БД и типы (Drizzle) — источник правды
deploy/            deploy.sh, ecosystem.config.cjs (PM2), nginx.conf, .env.example, README (гайд по серверу)
scripts/           служебные скрипты (dev, deploy, verify, db-query, backup-db, backup-uploads)
docs/              документация: architecture, operations, development, troubleshooting, payments, changelog
```

---

## Команды

```bash
npm run dev      # локальный запуск (tsx server/index.ts; NODE_ENV=development)
npm run build    # сборка client → dist/public и server → dist/index.cjs
npm run start    # прод-запуск: node dist/index.cjs
npm run check    # tsc (типы)
npm test         # vitest (e2e исключены)
npm run test:e2e # playwright (браузеры нужно ставить: npx playwright install)
npm run db:push  # применить схему Drizzle к БД
```

Полезные скрипты из `scripts/`:
- `scripts/dev.ps1` — поднять всё локально одной командой (PG + миграции + dev-сервер).
- `scripts/deploy.ps1` — ветка → `main` → push → деплой на прод → автопроверка.
- `scripts/verify-prod.sh` — смоук-проверка прода (запускается на сервере).
- `scripts/db-query.sh` — SQL-запрос к прод-БД (запускается на сервере).

---

## Локальная разработка (кратко)

Полная инструкция — `docs/development.md`. Ключевое:
- Портативный PostgreSQL на порту **5433** (system PG на 5432 не используется).
- Если шелл запущен **с правами администратора**, PostgreSQL откажется стартовать — запускай его через ограниченный токен (`runas /trustlevel:0x20000 "…postgres.exe -D … -p 5433"`). Это уже учтено в `scripts/dev.ps1`.
- Локальный `.env` лежит в корне (в git не попадает). Пример — `.env.example`.
- Dev-сервер по умолчанию на `PORT=5000`. Если порт занят (например, чужим процессом) — выбери другой (`PORT=5055`).

---

## Рабочий процесс (важно)

1. **Ветка** от `main`: `feature/*`, `fix/*`, `ops/*`, `content/*`, `docs/*`.
2. Реализация + **локальная проверка**: `npx tsc` → `npm test` → `npm run build`. Крупные изменения — проверить в браузере на dev-сервере.
3. **Прод не трогать без явного подтверждения пользователя.** Сначала тест, затем спросить «выкатывать?».
4. После подтверждения: `feature` → `main` (**fast-forward**, без merge-коммитов) → push.
5. **Деплой**: `scripts/deploy.ps1` (или вручную `deploy/deploy.sh` на сервере через SSH).
6. **Проверка после деплоя**: голова репо = нужный коммит, PM2 `online`, health-эндпоинты, ключевые маршруты.

Документация и тексты (без изменений рантайма) деплоя не требуют — достаточно влить в `main`.

---

## Правила и запреты

- **Никогда не коммитить `.env`** и любые секреты (`.gitignore` уже настроен).
- **Не деплоить на прод без подтверждения.**
- **Не удалять бонусные таблицы/колонки в БД** — они оставлены для обратимости (функциональность удалена, см. `docs/changelog.md`).
- Изменения схемы БД — только через `shared/schema.ts` + `npm run db:push`; на старте приложение применяет схему (`migrate.ts`).
- PM2-конфиг обязан быть **`.cjs`** — у проекта `"type": "module"`, `.js` не сработает.
- Коммиты на русском/английском по схеме `тип(scope): краткое описание`; тело — что и зачем.

---

## Грабли (проверено на практике)

| Симптом | Причина / решение |
|---|---|
| Прод не поднялся после деплоя, PM2 падает | Конфиг PM2 был `.js` — нужен `.cjs` (ESM-проект) |
| `npm ci` на сервере падает по памяти | 2 ГБ RAM: `deploy.sh` сначала делает `pm2 stop`, потом ставит зависимости |
| Фото товаров «битые» | Файла нет в `<APP_DIR>/uploads` (хранилище только локальное). Проверить `ls uploads`, восстановить из архива `scripts/backup-uploads.sh` |
| PostgreSQL не стартует локально | Шелл с правами админа → запускать через `runas /trustlevel` (см. `docs/troubleshooting.md`) |
| Порт 5000 занят | На машине могут висеть чужие dev-серверы; используй другой `PORT` |
| Изменения не видны в браузере | PWA кэширует оболочку — Ctrl+F5 (или инкогнито) |
| Логи на проде не растут / растут бесконтрольно | PM2 пишет в `/var/log/cvetomarket/{out,error}.log` (merge_logs). Старый `~/.pm2/logs/*` — легаси |
| Флаг тестового режима Robokassa не работает | Код читает `ROBOKASSA_TEST` **или** `ROBOKASSA_IS_TEST`, значения `true/1/yes/on` |
| Оплата не помечается оплаченной | Проверить Result URL в ЛК Robokassa (POST на `/api/payment/robokassa/result`) и логи `[robokassa/result]` |
| На пустой боевой БД появился админ `admin@cveto.ru` | Сиды пропускаются при `NODE_ENV=production`; принудительно — `SEED_DEMO_DATA=true` |
| Вебхуки Telegram/MAX не регистрируются | Домен берётся из `APP_DOMAIN` (легаси-имя `REPLIT_DOMAINS` тоже поддерживается) |
| Бэкапы БД | `scripts/backup-db.sh` + cron 03:30 → `/var/backups/cvetomarket` (см. `docs/operations.md`) |

Подробнее — `docs/troubleshooting.md`.

---

## Где смотреть дальше

| Документ | О чём |
|---|---|
| `docs/architecture.md` | архитектура, потоки (заказ, оплата, картинки, аналитика), таблицы БД |
| `docs/operations.md` | прод: сервер, PM2, nginx, логи и ротация, деплой/откат, диск, бэкапы |
| `docs/development.md` | локальный запуск, типовые задачи, работа со схемой БД |
| `docs/troubleshooting.md` | таблица «симптом → причина → решение» |
| `docs/payments.md` | Robokassa: настройка, режимы, проверка оплаты |
| `docs/changelog.md` | что уже сделано в проекте (важно для контекста) |
| `deploy/README.md` | первичная настройка сервера (Reg.ru, nginx, SSL) |
| `deploy/.env.example` | полный список переменных окружения с пояснениями |
