# Платежи (Robokassa)

## Что используется

- **Картой онлайн** — Robokassa.
- **Наличными при получении** — платёжный шлюз не участвует (`paymentStatus = cash`).
- `server/unitpay.ts` — интеграция с UnitPay присутствует, но **не подключена** к маршрутам; не используется.

## Переменные окружения

```dotenv
ROBOKASSA_LOGIN=<мерчант-логин>
ROBOKASSA_PASSWORD1=<пароль №1 — подпись платежа>
ROBOKASSA_PASSWORD2=<пароль №2 — проверка уведомления>
ROBOKASSA_TEST=false          # или ROBOKASSA_IS_TEST — код читает оба имени
```

Флаг тестового режима принимает `true/1/yes/on` (включает `IsTest=1`); `false/0/пусто` — боевой режим.
> Раньше код сравнивал значение строго со строкой `"true"`, поэтому `ROBOKASSA_IS_TEST=1` молча работал как **боевой**. Исправлено.

## Как устроен платёж

1. `POST /api/orders` (способ оплаты `card`) создаёт заказ и возвращает `paymentUrl`:
   - `MrchLogin` = `ROBOKASSA_LOGIN`
   - `OutSum` = сумма заказа
   - `InvId` = `order.orderNumber` (целое)
   - `SignatureValue` = `md5(login:outSum:invId:password1)`
   - `IsTest` = 0/1 по флагу
2. Покупатель оплачивает на стороне Robokassa.
3. Robokassa вызывает **Result URL**: `POST /api/payment/robokassa/result` с `OutSum`, `InvId`, `SignatureValue`.
4. Сервер проверяет `md5(outSum:invId:password2)`, помечает заказ `payment_status = paid`, пишет `payment_id = robokassa:<InvId>` и отвечает `OK<InvId>` (иначе Robokassa повторяет уведомление).
5. Покупатель возвращается на **Success URL** (`/payment/success`) → редирект в личный кабинет; там же отправляется цель Метрики `payment_success`.

Код: `server/robokassa.ts` (подпись и URL), `server/routes.ts` (`/api/orders`, `/api/payment/robokassa/result`).

## Что настроить в личном кабинете Robokassa

| Параметр | Значение |
|---|---|
| Result URL (URL для уведомлений) | `https://cveto.market/api/payment/robokassa/result`, метод **POST** |
| Success URL | `https://cveto.market/payment/success` |
| Fail URL | `https://cveto.market/payment/fail` |
| Фискализация (54-ФЗ) | СНО / ОФД / ИНН организации — **чеки формирует Robokassa** (код данные чека не передаёт) |

Мерчант привязан к организации-получателю платежей. Смена организации = новый магазин в Robokassa → новые `LOGIN`/`PASSWORD1`/`PASSWORD2` → правка `.env` → перезапуск PM2.

## Временное отключение оплаты картой

Флаг в `client/src/pages/Checkout.tsx`:

```ts
const CARD_PAYMENT_ENABLED = false;   // скрывает карту, дефолт — наличные
```

Полезно, когда мерчант ещё не активирован или у провайдера сбой. Вернуть — `true`.

## Проверка (после настройки/смены мерчанта)

```bash
# 1. Какие креды и режим видит приложение
cd /var/www/cvetomarket && set -a && . ./.env && set +a
npx tsx -e 'import("./server/robokassa.ts").then(m=>{console.log("configured:",m.isRobokassaConfigured());const u=new URL(m.buildPaymentUrl({account:1,sum:1,desc:"t"}));console.log("login:",u.searchParams.get("MrchLogin"),"IsTest:",u.searchParams.get("IsTest"))})'

# 2. Пришло ли уведомление
grep -a "robokassa/result" /var/log/cvetomarket/out*.log | tail -5

# 3. Статус заказа
bash scripts/db-query.sh "select order_number, total_amount, payment_status, payment_id from orders order by created_at desc limit 5;"
```

Ожидаемая строка в логе: `[robokassa/result] body: {... "InvId":"34" ...}` и затем `POST /api/payment/robokassa/result 200`.

## Частые проблемы

| Симптом | Причина |
|---|---|
| `invalid signature` | неверный `PASSWORD2` в `.env` |
| Уведомление не приходит | Result URL не настроен / метод не POST / домен недоступен извне |
| `order not found for InvId` | `InvId` не соответствует `order_number` |
| Оплата проходит, заказ не меняется | сервер не ответил `OK<InvId>` либо упал на проверке подписи |

## Связь с аналитикой

Цель Метрики `payment_success` отправляется при возврате на страницу успеха; `registration` — при регистрации. В интерфейсе Метрики нужно создать цели типа «JavaScript-событие» с этими идентификаторами, чтобы построить воронку до оплаты.
