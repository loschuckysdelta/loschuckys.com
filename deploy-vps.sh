#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="${REPO_DIR:-/root/videos-unificado}"
API_SRC="$REPO_DIR/apps/api"
APP="/var/www/videos-app/backend-vps"

cd "$REPO_DIR"
git pull --ff-only

mkdir -p "$APP/uploads" "$APP/hls"
rsync -a --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude uploads \
  --exclude hls \
  "$API_SRC/" "$APP/"

cd "$APP"
npm install --omit=dev
pm2 restart videos-api --update-env || pm2 start server.js --name videos-api
pm2 save
nginx -t
systemctl reload nginx
echo "OK: backend actualizado"
