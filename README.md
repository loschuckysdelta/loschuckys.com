# CRUD VIDEOS COMPLETO — VERCEL + VPS + MONGODB + NGINX + HLS

## Qué hace

- Panel administrador en Vercel.
- Backend Node.js/Express en tu VPS.
- MongoDB guarda:
  - título
  - descripción
  - vistas
  - likes
  - estado
  - fijado
  - posición
- El archivo original se guarda en:
  `/var/www/videos-app/backend-vps/uploads/`
- FFmpeg genera HLS en:
  `/var/www/videos-app/backend-vps/hls/<ID>/`
- Nginx sirve los videos, no Node.js.
- Permite videos largos; la rapidez depende del bitrate, la red del VPS y la red del usuario.

---

## Estructura

```text
CRUD-VIDEOS-HLS-VPS-VERCEL/
├── frontend-vercel/
└── backend-vps/
    ├── uploads/
    ├── hls/
    ├── models/
    ├── server.js
    ├── package.json
    ├── .env.example
    └── nginx-videos.conf
```

---

# 1. PREPARAR VPS

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nginx ffmpeg nodejs npm
sudo npm install -g pm2
```

Comprueba:

```bash
node -v
npm -v
ffmpeg -version
nginx -v
```

---

# 2. SUBIR BACKEND AL VPS

Crea la carpeta:

```bash
sudo mkdir -p /var/www/videos-app
sudo chown -R $USER:$USER /var/www/videos-app
```

Sube la carpeta `backend-vps` dentro de:

```text
/var/www/videos-app/backend-vps
```

Después:

```bash
cd /var/www/videos-app/backend-vps
npm install
cp .env.example .env
nano .env
```

Ejemplo:

```env
PORT=3000
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@cluster0.example.mongodb.net/videos_db?retryWrites=true&w=majority
PUBLIC_BASE_URL=https://videos.tudominio.com
FRONTEND_URL=https://tu-panel.vercel.app
MAX_UPLOAD_MB=5000
FFMPEG_PATH=ffmpeg
```

No pongas tu contraseña MongoDB dentro del frontend.

---

# 3. ARRANCAR NODE

```bash
cd /var/www/videos-app/backend-vps
pm2 start server.js --name videos-api
pm2 save
pm2 startup
```

Ejecuta también el comando que PM2 muestre después de `pm2 startup`.

Prueba localmente:

```bash
curl http://127.0.0.1:3000/health
```

Debe salir:

```json
{"ok":true}
```

---

# 4. CONFIGURAR NGINX

Edita:

```bash
sudo nano /etc/nginx/sites-available/videos
```

Pega el contenido de `nginx-videos.conf`.

Cambia:

```text
videos.tudominio.com
```

por tu dominio/subdominio real.

Activa:

```bash
sudo ln -s /etc/nginx/sites-available/videos /etc/nginx/sites-enabled/videos
sudo nginx -t
sudo systemctl reload nginx
```

---

# 5. HTTPS

Apunta un registro DNS tipo A de tu dominio/subdominio a la IP del VPS.

Después:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d videos.tudominio.com
```

Tu API quedará:

```text
https://videos.tudominio.com/api/videos
```

Los MP4 originales:

```text
https://videos.tudominio.com/media/archivo.mp4
```

Los HLS:

```text
https://videos.tudominio.com/hls/ID/master.m3u8
```

---

# 6. SUBIR FRONTEND A VERCEL

Sube `frontend-vercel` a GitHub.

En Vercel importa el repositorio.

En:

```text
Project → Settings → Environment Variables
```

crea:

```text
VITE_API_URL=https://videos.tudominio.com
```

Luego haz Redeploy.

---

# 7. CÓMO SE SUBE UN VIDEO

Desde tu panel de Vercel:

1. Pulsa `+ Nuevo`.
2. Selecciona el video.
3. Escribe título y descripción.
4. Configura vistas y likes si deseas.
5. Opcionalmente activa `Fijar video`.
6. Pon posición 1, 2, 3...
7. Pulsa `Subir video`.

El navegador hace:

```text
Vercel → POST /api/videos → VPS
```

El VPS guarda primero:

```text
/var/www/videos-app/backend-vps/uploads/
```

Después FFmpeg genera HLS en:

```text
/var/www/videos-app/backend-vps/hls/
```

MongoDB guarda los datos del registro.

---

# 8. VIDEOS LARGOS

Un video de 2 o 3 horas puede funcionar correctamente.

HLS divide el video en segmentos de aproximadamente 6 segundos.

Pero la velocidad real depende de:

- bitrate del archivo
- velocidad de subida del VPS
- ancho de banda del proveedor del VPS
- número de usuarios simultáneos
- conexión del espectador

Un video de 3 horas a 2 Mbps consume mucho menos ancho de banda que un video de 3 horas a 15 Mbps.

Para producción grande, después puedes agregar múltiples calidades HLS:
360p / 720p / 1080p.

---

# 9. IMPORTANTE SOBRE MONGODB

La URI de MongoDB debe estar únicamente en:

```text
backend-vps/.env
```

Nunca en:

```text
frontend-vercel/
```

Si una contraseña de MongoDB fue compartida públicamente, rótala antes de usar el proyecto.
