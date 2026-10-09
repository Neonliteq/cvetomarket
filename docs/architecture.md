# Архитектура

## Общая схема

```
Браузер (SPA)
   │  React + wouter + TanStack Query
   │  HTML-шелл: client/index.html (Яндекс.Метрика, PWA)
   ▼
nginx (прод)  ──►  Node.js / Express :5000  (PM2 cluster, 2 воркера)
   │                    │
   │                    ├── PostgreSQL (Drizzle ORM)
   │                    ├── /var/www/cvetomarket/uploads  (локальное зеркало файлов)
   │                    └── Reg.ru S3  (резерв/источник, используется редко)
   └── кэш /objects (proxy_cache, 10 ГБ, 45 дней)
```

- **Одна SPA-оболочка** `client/index.html` отдаётся на все маршруты (history API + wouter). Поэтому:
  - код счётчика Метрики, `<head>`-мета и PWA-манифест живут в одном файле;
  - «страницы» внутри SPA не перезагружают документ — просмотры Метрике отправляются вручную (`docs/payments.md` → фактически `client/src/lib/analytics.ts`).
- В dev-режиме Vite обслуживает фронтенд, в прод — собранные файлы из `dist/public` через `server/static.ts`.

## Основные потоки

### Аутентификация
- Сессии в cookie: `express-session` + `connect-pg-simple` (таблица сессий в PG). Роуты: `/api/auth/*`.
- Роли: `buyer`, `shop`, `worker`, `admin`; проверка — `requireAuth` / `requireRole` в `server/routes.ts`.
- Вход через ВКонтакте (VK ID) — отдельная ветка того же роутера.
- Пароли: `bcrypt`.

### Оформление заказа (`POST /api/orders`)
1. Сервер **сам пересчитывает** сумму по ценам из БД (`storage.getProduct`) и стоимость доставки (зоны магазина или тариф магазина).
2. Сверяет присланную клиентом сумму с серверной (±1 % или ±10 ₽), иначе 400.
3. Применяет **промокод** (тип percent/fixed, лимиты, срок, инкремент использования).
4. Создаёт заказ + позиции, считает комиссию платформы.
5. Для оплаты картой возвращает `paymentUrl` Robokassa; для наличных сразу уведомляет магазин.

### Оплата
- **Карта** — Robokassa. Подпись и URL формирует `server/robokassa.ts`; результат приходит на `POST /api/payment/robokassa/result`, заказ помечается `paid`, пишется `payment_id = robokassa:<InvId>`. Подробно — `docs/payments.md`.
- **Наличные** — `paymentStatus = cash`, платёжный шлюз не участвует.
- Управление кодом оплаты картой — флаг `CARD_PAYMENT_ENABLED` в `client/src/pages/Checkout.tsx` (можно временно скрыть карту).

### Файлы и изображения
- Загрузка: `POST /api/upload` (multer) → файл **сначала пишется локально** в `<APP_DIR>/uploads/<name>`, затем best-effort в S3. Ошибка S3 не ломает загрузку.
- Отдача: маршрут `/objects/uploads/<name>` (`server/replit_integrations/object_storage/routes.ts`):
  1. читает **локальный диск** (`server/localObjectStore.ts`);
  2. если файла нет — один раз тянет из S3 и сохраняет локально;
  3. если и S3 недоступен — отдаёт заглушку (`X-Accel-Expires: 0`, чтобы nginx её не закэшировал).
- Ресайз `?w=NNN` — sharp, в webp, с in-memory LRU-кэшем.
- Дозаполнение зеркала из S3: `npm run backfill:uploads`.

### Аналитика
- **Своя:** `client/src/lib/analytics.ts` → `POST /api/analytics/pageview` (+ длительность, события) → таблицы `page_views`, `analytics_events`; отчёты в админке.
- **Яндекс.Метрика** (счётчик `112737627`): сниппет в `client/index.html` с `defer:true`; просмотры SPA отправляются вручную на каждой смене маршрута, плюс цели `registration` и `payment_success`.
- UTM-метки: приоритет URL → кэш сессии → referrer.

### Уведомления
- Telegram-бот (`server/telegram.ts`), MAX-бот (`server/max.ts`), web-push (`server/webpush.ts`), e-mail через Resend (`server/resend.ts`).

## Ключевые таблицы БД (`shared/schema.ts`)

| Группа | Таблицы |
|---|---|
| Пользователи | `users`, `shops`, `shop_workers` |
| Каталог | `products`, `product_drafts`, `categories`, `cities` |
| Заказы | `orders`, `order_items`, `order_supplements` |
| Контент | `reviews`, `messages`, `notifications`, `notification_preferences` |
| Маркетинг | `promo_codes`, `page_views`, `analytics_events` |
| Push | `push_subscriptions`, `push_delivery_failures` |
| Настройки | `platform_settings` |
| **Легаси** | `bonus_transactions` — бонусная система удалена, таблица и колонки `users.bonus_balance` / `referral_code` / `referred_by` **оставлены для обратимости**. Код их не использует, но `deleteUser` чистит `bonus_transactions` (внешний ключ) |

## Ключевые файлы бэкенда

| Файл | Роль |
|---|---|
| `server/index.ts` | точка входа: миграции, express, listen |
| `server/routes.ts` | все API-маршруты (~2400 строк) — основной файл |
| `server/storage.ts` | слой данных (Drizzle), интерфейс `IStorage` |
| `server/robokassa.ts` | платёжная интеграция |
| `server/localObjectStore.ts` | локальное зеркало файлов |
| `server/static.ts` | раздача SPA |
| `server/migrate.ts` | применение схемы при старте |
| `server/seed.ts` | сиды для локальной разработки |

## Фронтенд

| Файл | Роль |
|---|---|
| `client/src/App.tsx` | маршруты (wouter), провайдеры, глобальные монтирования |
| `client/src/lib/queryClient.ts` | настройки React Query, `apiRequest`, `signal` для отмены запросов |
| `client/src/lib/auth.tsx`, `cart.tsx`, `cityContext.tsx` | контексты |
| `client/src/lib/analytics.ts` | своя аналитика + Метрика (хиты и цели) |
| `client/src/pages/*` | страницы; `Admin.tsx` и `ShopDashboard.tsx` — крупнейшие |
| `client/src/sw.ts` | service worker (Workbox, `injectManifest`), стратегия autoUpdate |
