#!/bin/bash
set -e

# =============================================================================
# ЦветоМаркет — Скрипт первоначальной настройки сервера (Ubuntu 22.04)
# =============================================================================
# Запускайте от root или через sudo:
#   bash setup.sh
# =============================================================================

if [ "$(id -u)" -ne 0 ]; then
  echo "Ошибка: скрипт должен запускаться от root (sudo bash setup.sh)" >&2
  exit 1
fi

APP_USER="cvetomarket"
APP_DIR="/var/www/cvetomarket"
DB_NAME="cvetomarket"
DB_USER="cvetomarket"

echo "=========================================="
echo " Шаг 1: Обновление системы"
echo "=========================================="
apt-get update -y
apt-get upgrade -y

echo "=========================================="
echo " Шаг 2: Установка зависимостей"
echo "=========================================="
apt-get install -y \
  curl \
  git \
  nginx \
  ufw \
  build-essential

echo "=========================================="
echo " Шаг 3: Установка Node.js 20 (LTS)"
echo "=========================================="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node.js версия: $(node --version)"
echo "npm версия: $(npm --version)"

echo "=========================================="
echo " Шаг 4: Установка PM2"
echo "=========================================="
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "PM2 версия: $(pm2 --version)"

echo "=========================================="
echo " Шаг 5: Установка PostgreSQL 15"
echo "=========================================="
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo "Создаём базу данных и пользователя..."
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD 'СМЕНИТЕ_ЭТОТ_ПАРОЛЬ';
  END IF;
END
\$\$;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF
echo "База данных '${DB_NAME}' и пользователь '${DB_USER}' созданы."
echo ""
echo "  ВАЖНО: смените пароль пользователя БД:"
echo "  sudo -u postgres psql -c \"ALTER USER ${DB_USER} WITH PASSWORD 'новый_пароль';\""

echo "=========================================="
echo " Шаг 6: Установка Certbot (SSL)"
echo "=========================================="
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

echo "=========================================="
echo " Шаг 7: Создание системного пользователя"
echo "=========================================="
if ! id -u "${APP_USER}" &>/dev/null; then
  useradd -r -s /bin/bash -m -d /home/${APP_USER} ${APP_USER}
  echo "Пользователь '${APP_USER}' создан."
fi

echo "=========================================="
echo " Шаг 8: Создание директории приложения"
echo "=========================================="
mkdir -p "${APP_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"

echo "=========================================="
echo " Шаг 9: Настройка брандмауэра (ufw)"
echo "=========================================="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo ""
echo "=========================================="
echo " Следующие шаги"
echo "=========================================="
echo ""
echo "1. Клонируйте репозиторий:"
echo "   cd ${APP_DIR}"
echo "   git clone https://github.com/ВАШ-АККАУНТ/cvetomarket.git ."
echo "   chown -R ${APP_USER}:${APP_USER} ${APP_DIR}"
echo ""
echo "2. Скопируйте и настройте переменные окружения:"
echo "   cp deploy/.env.example .env"
echo "   nano .env"
echo ""
echo "3. Настройте DATABASE_URL в .env:"
echo "   DATABASE_URL=postgresql://${DB_USER}:ПАРОЛЬ@localhost:5432/${DB_NAME}"
echo ""
echo "4. Скопируйте конфиг Nginx:"
echo "   cp deploy/nginx.conf /etc/nginx/sites-available/cvetomarket"
echo "   nano /etc/nginx/sites-available/cvetomarket  # замените YOUR_DOMAIN"
echo "   ln -s /etc/nginx/sites-available/cvetomarket /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "5. Запустите деплой:"
echo "   bash deploy/deploy.sh"
echo ""
echo "6. Настройте SSL:"
echo "   certbot --nginx -d ВАШ_ДОМЕН"
echo ""
echo "Готово! Подробнее — в deploy/README.md"
