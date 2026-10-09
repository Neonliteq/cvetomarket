# Локальная разработка

## Требования

- **Node.js 20+** и npm
- **git**
- **PostgreSQL** (локально; в текущем окружении используется портативный сервер на порту **5433**)

## Первичная настройка

```bash
git clone <репозиторий> cvetomarket-git
cd cvetomarket-git
npm ci
cp .env.example .env          # затем заполнить значения (см. ниже)
npm run db:push               # применить схему Drizzle к локальной БД
npm run dev                   # миграции + сиды выполняются автоматически при старте
```

Dev-сервер поднимется на `PORT` (по умолчанию **5000**): http://127.0.0.1:5000

> В режиме разработки (`NODE_ENV=development`) фронтенд отдаёт **Vite** (hot reload, код берётся из `client/src`), а не из `dist/public`. Поэтому проверять правки клиента можно сразу, без сборки.

### Минимально необходимый `.env`

```dotenv
DATABASE_URL=postgresql://user:pass@localhost:5433/cvetomarket
SESSION_SECRET=<случайная строка>
```

Опционально (зависят от задачи): `VITE_YANDEX_MAPS_API_KEY`, `REGRU_S3_*`, `ROBOKASSA_*`, `TELEGRAM_BOT_TOKEN`, `MAX_BOT_TOKEN`, `RESEND_API_KEY`, `VAPID_*`.
Полный список с пояснениями — `deploy/.env.example`.

### Полезно знать про `.env`

- Файл в git не попадает (`.gitignore`).
- `server/index.ts` читает переменные через `process.env`; на проде их подгружает `deploy/ecosystem.config.cjs` (парсит `.env` при старте PM2).
- Домен для регистрации вебхуков Telegram/MAX берётся из переменной **`APP_DOMAIN`** (легаси-имя `REPLIT_DOMAINS` тоже поддерживается) — на проде она задана.

## Сиды

`server/seed.ts` вызывается на **каждом** старте приложения (и в dev, и на проде), но выполняется только если таблица `users` **пуста** (`if (existingUsers.length > 0) return;`).

| Логин | Пароль | Роль |
|---|---|---|
| `admin@cveto.ru` | `admin123` | администратор |
| `roses@cveto.ru` | `password123` | магазин «Розарий» |
| `bloomy@cveto.ru` | `password123` | магазин «Bloomy Studio» |
| `tulips@cveto.ru` | `password123` | магазин «Тюльпан Экспресс» |

> На **production** сиды автоматически пропускаются (`NODE_ENV=production`), чтобы на чистой боевой БД не появился администратор с известным паролем. Принудительно создать демо-данные можно переменной `SEED_DEMO_DATA=true`.

## Тесты

```bash
npm test           # vitest, e2e исключены (server/__tests__ + client/src/**/*.test.ts)
npm run check      # только типы (tsc)
npm run test:e2e   # playwright; перед первым запуском: npx playwright install chromium
```

## Типовые задачи

### Новая страница
1. Создать `client/src/pages/MyPage.tsx`.
2. В `client/src/App.tsx`: `const MyPage = lazy(() => import("@/pages/MyPage"));` и `<Route path="/my-page" component={MyPage} />`.
3. При необходимости — ссылка в `client/src/components/Header.tsx` / `Footer.tsx`.

### Новый API-маршрут
1. Добавить обработчик в `server/routes.ts` (`app.get/post/patch/delete`), при необходимости — `requireAuth` / `requireRole("admin" | "shop")`.
2. Данные брать через `storage` (`server/storage.ts`); для нового запроса — добавить метод в `IStorage` и реализацию.
3. Клиент: `useQuery`/`useMutation` (React Query) или `apiRequest` из `client/src/lib/queryClient.ts`.

### Изменение схемы БД
1. Правка `shared/schema.ts`.
2. Локально: `npm run db:push`.
3. Типы подтягиваются автоматически (`typeof table.$inferSelect`).
4. На проде схема применяется при старте (`server/migrate.ts`). **Данные не удаляйте**: бонусные таблицы/колонки намеренно оставлены (см. `docs/changelog.md`).

### Работа с файлами
- Загрузка: `POST /api/upload` (поле `images`, до 10 файлов) — пишет локально в `uploads/` и best-effort в S3, возвращает `/objects/uploads/<name>`.
- Отдача: `/objects/uploads/<name>` (+ `?w=NNN` для webp-ресайза) — сначала с диска, потом S3, потом заглушка.

### Проверка перед коммитом

```bash
npx tsc && npm test && npm run build
```

## Текущее локальное окружение (эта машина)

| Что | Где |
|---|---|
| Клон репозитория | `G:\Deepseek\cvetomarket-git` |
| git | `G:\Deepseek\tools\git\cmd\git.exe` (MinGit) |
| PostgreSQL (портативный) | `G:\Deepseek\tools\pg\pgsql\bin`, данные `G:\Deepseek\pgdata`, порт **5433** |
| Запуск PG при админ-шелле | `runas /trustlevel:0x20000 "…\postgres.exe -D G:\Deepseek\pgdata -p 5433"` |
| Локальное зеркало картинок | `G:\Deepseek\cvetomarket-git\uploads` (в git не попадает) |
| Быстрый старт | `scripts/dev.ps1` |

## Удалённые ветки и уборка

```bash
git fetch --prune origin
git branch -vv | grep gone          # локальные ветки, удалённые на remote
```
