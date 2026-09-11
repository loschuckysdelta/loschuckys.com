#!/usr/bin/env bash
set -e

echo "========================================"
echo " INSTALANDO SERVIDOR DE VIDEOS"
echo "========================================"

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecuta este script como root:"
  echo "sudo bash instalar-vps.sh"
  exit 1
fi

APP_DIR="/var/www/videos-app/backend-vps"

echo "[1/7] Actualizando paquetes..."
apt update

echo "[2/7] Instalando Nginx, FFmpeg, Node.js, npm y unzip..."
apt install -y nginx ffmpeg nodejs npm unzip

echo "[3/7] Instalando PM2..."
npm install -g pm2

echo "[4/7] Creando carpetas..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/uploads"
mkdir -p "$APP_DIR/hls"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$SCRIPT_DIR" != "$APP_DIR" ]; then
  echo "[5/7] Copiando backend a $APP_DIR ..."
  cp -r "$SCRIPT_DIR"/* "$APP_DIR"/
  cp -r "$SCRIPT_DIR"/.[!.]* "$APP_DIR"/ 2>/dev/null || true
fi

cd "$APP_DIR"

echo "[6/7] Instalando dependencias Node..."
npm install

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "IMPORTANTE:"
  echo "Se creó $APP_DIR/.env"
  echo "Debes editar MONGODB_URI y FRONTEND_URL antes de usar producción."
  echo ""
fi

echo "[7/7] Iniciando API con PM2..."
pm2 delete videos-api >/dev/null 2>&1 || true
pm2 start server.js --name videos-api
pm2 save

systemctl enable nginx
systemctl restart nginx

echo ""
echo "========================================"
echo " INSTALACIÓN BASE TERMINADA"
echo "========================================"
echo "Backend: $APP_DIR"
echo "Editar .env:"
echo "nano $APP_DIR/.env"
echo ""
echo "Probar API local:"
echo "curl http://127.0.0.1:3000/health"
echo ""
