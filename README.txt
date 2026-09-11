PROYECTO FINAL SIMPLIFICADO

VERCEL
------
Sube SOLO el contenido de la carpeta `vercel` a tu repositorio/proyecto.
No necesitas configurar Root Directory si esos archivos están en la raíz.

Vercel detectará:
- package.json
- vercel.json
- Vite
- npm install
- npm run build
- dist

Variable necesaria:
VITE_API_URL=https://videos.loschuckys.com


VPS
---
Sube la carpeta `vps` a tu servidor.
Dentro ejecuta:

chmod +x instalar.sh
sudo bash instalar.sh

El instalador instala automáticamente:
- Nginx
- FFmpeg
- Node.js
- npm
- PM2
- dependencias Node
- carpetas uploads/hls
- configuración Nginx
- arranque PM2

Después SOLO debes editar:
nano /var/www/videos-app/backend-vps/.env

y colocar:
- tu NUEVA MONGODB_URI
- la URL final del panel Vercel

Luego:
pm2 restart videos-api

IMPORTANTE:
La contraseña de MongoDB compartida anteriormente NO está incluida.
Debes rotarla y usar la nueva solo en el VPS.
