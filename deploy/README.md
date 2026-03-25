# Развёртывание ЦветоМаркет на Reg.ru

Это руководство описывает полный процесс публикации приложения на VPS от Reg.ru с использованием Reg.ru Object Storage для хранения файлов и домена Reg.ru.

---

## Содержание

1. [Требования](#требования)
2. [Аренда VPS на Reg.ru](#1-аренда-vps-на-regru)
3. [Создание бакета Object Storage](#2-создание-бакета-object-storage)
4. [Регистрация домена и настройка DNS](#3-регистрация-домена-и-настройка-dns)
5. [Начальная настройка сервера](#4-начальная-настройка-сервера)
6. [Клонирование кода](#5-клонирование-кода)
7. [Настройка переменных окружения](#6-настройка-переменных-окружения)
8. [Настройка Nginx](#7-настройка-nginx)
9. [Первый запуск приложения](#8-первый-запуск-приложения)
10. [SSL-сертификат (HTTPS)](#9-ssl-сертификат-https)
11. [Обновление приложения](#10-обновление-приложения)
12. [Полезные команды](#полезные-команды)

---

## Требования

- Аккаунт на [Reg.ru](https://www.reg.ru/)
- VPS с Ubuntu 22.04 LTS (рекомендуется минимум 2 CPU, 2 GB RAM)
- Зарегистрированный домен
- Аккаунт в [ROBOKASSA](https://robokassa.com/) (для приёма платежей)
- Аккаунт на [Resend](https://resend.com/) (для отправки email)
- Telegram Bot Token от [@BotFather](https://t.me/BotFather)
- Ключ Яндекс Карт от [developer.tech.yandex.ru](https://developer.tech.yandex.ru/)

---

## 1. Аренда VPS на Reg.ru

1. Перейдите на [reg.ru/vps](https://www.reg.ru/vps/)
2. Выберите тариф: рекомендуется **Стартовый** или выше (2 CPU, 2 GB RAM)
3. Операционная система: **Ubuntu 22.04 LTS**
4. Создайте VPS и запомните выданный IP-адрес и root-пароль

Подключитесь к серверу:

```bash
ssh root@ВАШ_IP
```

---

## 2. Создание бакета Object Storage

1. В панели Reg.ru перейдите в раздел **Облачное хранилище** (Object Storage)
   - Ссылка: [reg.ru/panel/storage](https://www.reg.ru/panel/storage/)
2. Создайте новый бакет — задайте понятное имя, например `cvetomarket-files`
3. В настройках бакета создайте пару **Access Key / Secret Key**
4. Сохраните:
   - `Access Key`
   - `Secret Key`
   - Имя бакета
   - Эндпоинт: `https://s3.regru.ru`
   - Регион: `ru-1`

---

## 3. Регистрация домена и настройка DNS

Если домен ещё не куплен:
1. [reg.ru](https://www.reg.ru/) → Регистрация домена → Выберите имя
2. После покупки перейдите в **Управление DNS**

Создайте A-записи для вашего домена:

| Тип | Имя          | Значение    | TTL  |
|-----|--------------|-------------|------|
| A   | @            | ВАШ_IP      | 300  |
| A   | www          | ВАШ_IP      | 300  |

DNS-записи распространяются от 15 минут до нескольких часов.

---

## 4. Начальная настройка сервера

Подключитесь к VPS и запустите скрипт установки:

```bash
ssh root@ВАШ_IP
apt-get update && apt-get install -y git
git clone https://github.com/ВАШ-АККАУНТ/cvetomarket.git /tmp/cvetomarket-deploy
bash /tmp/cvetomarket-deploy/deploy/setup.sh
```

Скрипт установит: Node.js 20, PostgreSQL 15, Nginx, PM2, Certbot (SSL).

**Обязательно** смените пароль пользователя БД после установки:

```bash
sudo -u postgres psql -c "ALTER USER cvetomarket WITH PASSWORD 'ВАШ_НАДЁЖНЫЙ_ПАРОЛЬ';"
```

---

## 5. Клонирование кода

```bash
cd /var/www/cvetomarket
git clone https://github.com/ВАШ-АККАУНТ/cvetomarket.git .
chown -R cvetomarket:cvetomarket /var/www/cvetomarket
```

---

## 6. Настройка переменных окружения

```bash
cp deploy/.env.example .env
nano .env
```

Заполните все значения:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://cvetomarket:ВАШ_ПАРОЛЬ@localhost:5432/cvetomarket
SESSION_SECRET=СЛУЧАЙНАЯ_СТРОКА_32_СИМВОЛА

# Reg.ru Object Storage
REGRU_S3_ACCESS_KEY=ВАШ_ACCESS_KEY
REGRU_S3_SECRET_KEY=ВАШ_SECRET_KEY
REGRU_S3_BUCKET=cvetomarket-files
REGRU_S3_ENDPOINT=https://s3.regru.ru
REGRU_S3_REGION=ru-1

# Telegram
TELEGRAM_BOT_TOKEN=ВАШИ_ДАННЫЕ

# Яндекс Карты
VITE_YANDEX_MAPS_API_KEY=ВАШИ_ДАННЫЕ

# ROBOKASSA
ROBOKASSA_LOGIN=ВАШИ_ДАННЫЕ
ROBOKASSA_PASSWORD1=ВАШИ_ДАННЫЕ
ROBOKASSA_PASSWORD2=ВАШИ_ДАННЫЕ
ROBOKASSA_IS_TEST=0

# Resend (email)
RESEND_API_KEY=re_XXXXXXXXXX
```

Генерация `SESSION_SECRET`:
```bash
openssl rand -hex 32
```

---

## 7. Настройка Nginx

```bash
# Скопируйте конфиг
cp deploy/nginx.conf /etc/nginx/sites-available/cvetomarket

# Замените YOUR_DOMAIN на ваш реальный домен
sed -i 's/YOUR_DOMAIN/ВАШ_ДОМЕН/g' /etc/nginx/sites-available/cvetomarket

# Активируйте сайт
ln -s /etc/nginx/sites-available/cvetomarket /etc/nginx/sites-enabled/

# Отключите дефолтный сайт
rm -f /etc/nginx/sites-enabled/default

# Проверьте конфиг и перезагрузите
nginx -t && systemctl reload nginx
```

---

## 8. Первый запуск приложения

```bash
cd /var/www/cvetomarket
bash deploy/deploy.sh
```

Скрипт выполнит:
1. `npm ci` — установка зависимостей
2. `npm run build` — сборка приложения
3. `npm run db:push` — создание таблиц в БД
4. `pm2 start` — запуск в production-режиме

Проверьте статус:
```bash
pm2 status cvetomarket
pm2 logs cvetomarket --lines 50
```

Откройте в браузере: `http://ВАШ_ДОМЕН`

---

## 9. SSL-сертификат (HTTPS)

После того, как DNS-записи распространились и сайт открывается по HTTP:

```bash
certbot --nginx -d ВАШ_ДОМЕН -d www.ВАШ_ДОМЕН
```

Следуйте инструкциям Certbot. Сертификат обновляется автоматически.

После получения SSL обновите cookie в приложении — в `.env` можно ничего не менять, Express автоматически обнаружит HTTPS через заголовки от Nginx (`X-Forwarded-Proto`).

---

## 10. Обновление приложения

При выходе новых версий:

```bash
cd /var/www/cvetomarket
bash deploy/deploy.sh
```

---

## Полезные команды

```bash
# Статус приложения
pm2 status cvetomarket

# Логи в реальном времени
pm2 logs cvetomarket

# Перезапуск вручную
pm2 restart cvetomarket

# Статус Nginx
systemctl status nginx

# Тест конфига Nginx
nginx -t

# Подключение к БД
sudo -u postgres psql -d cvetomarket

# Продление SSL вручную
certbot renew

# Просмотр логов Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## Настройка ROBOKASSA

В личном кабинете ROBOKASSA нужно указать URL-адреса вашего приложения:

- **Result URL** (POST): `https://ВАШ_ДОМЕН/api/payment/robokassa/result`
- **Success URL** (GET): `https://ВАШ_ДОМЕН/api/payment/robokassa/success`
- **Fail URL** (GET): `https://ВАШ_ДОМЕН/api/payment/robokassa/fail`

---

## Настройка Telegram Webhook

После первого запуска зарегистрируйте webhook для Telegram-бота.
Откройте в браузере (замените значения):

```
https://api.telegram.org/botВАШ_ТОКЕН/setWebhook?url=https://ВАШ_ДОМЕН/api/telegram/webhook
```

---

## Структура файлов деплоя

```
deploy/
├── setup.sh           # Первоначальная настройка сервера (Ubuntu 22.04)
├── deploy.sh          # Скрипт обновления приложения
├── nginx.conf         # Шаблон конфигурации Nginx
├── ecosystem.config.js # Конфигурация PM2
├── .env.example       # Шаблон переменных окружения
└── README.md          # Это руководство
```
