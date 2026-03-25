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
DB_PASS="СМЕНИТЕ_ЭТОТ_ПАРОЛЬ"

echo "=========================================="
echo " Шаг 1: Обновление системы"
echo "=========================================="
apt-get update -y
apt-get upgrade -y

echo "=========================================="
echo " Шаг 2: Установка базовых зависимостей"
echo "=========================================="
apt-get install -y \
  curl \
  git \
  nginx \
  ufw \
  build-essential \
  gnupg \
  lsb-release \
  ca-certificates \
  apt-transport-https \
  snapd

echo "=========================================="
echo " Шаг 3: Установка Node.js 20 (LTS)"
echo "=========================================="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

echo "=========================================="
echo " Шаг 4: Установка PM2"
echo "=========================================="
npm install -g pm2
pm2 --version

echo "=========================================="
echo " Шаг 5: Установка PostgreSQL 15 (PGDG)"
echo "=========================================="
# Официальный репозиторий PostgreSQL (Ubuntu 22.04 по умолчанию даёт v14)
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-15 postgresql-client-15
systemctl enable postgresql
systemctl start postgresql
echo "PostgreSQL версия: $(psql --version)"

echo "Создаём пользователя и базу данных..."
# Создание пользователя (идемпотентно)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
EOF

# Создание БД (идемпотентно)
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" \
  | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "База данных '${DB_NAME}' готова."

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
echo " Шаг 8б: Настройка PM2 под пользователем ${APP_USER}"
echo "=========================================="
# PM2 autostart от имени пользователя приложения, не от root
sudo -u ${APP_USER} pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER} || true
env PATH=$PATH:/usr/bin pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER} | tail -1 | bash || true

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
echo "  ВАЖНО: смените пароль пользователя БД:"
echo "  sudo -u postgres psql -c \"ALTER USER ${DB_USER} WITH PASSWORD 'новый_пароль';\""
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
echo "3. Задайте DATABASE_URL в .env:"
echo "   DATABASE_URL=postgresql://${DB_USER}:ПАРОЛЬ@localhost:5432/${DB_NAME}"
echo ""
echo "4. Скопируйте конфиг Nginx:"
echo "   cp deploy/nginx.conf /etc/nginx/sites-available/cvetomarket"
echo "   nano /etc/nginx/sites-available/cvetomarket  # замените YOUR_DOMAIN"
echo "   ln -s /etc/nginx/sites-available/cvetomarket /etc/nginx/sites-enabled/"
echo "   rm -f /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "5. Запустите деплой:"
echo "   bash deploy/deploy.sh"
echo ""
echo "6. Настройте SSL:"
echo "   certbot --nginx -d ВАШ_ДОМЕН -d www.ВАШ_ДОМЕН"
echo ""
echo "Подробнее — в deploy/README.md"
