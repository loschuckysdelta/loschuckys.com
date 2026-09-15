# Gestor de Recursos VPS

Aplicación web de una sola página para subir imágenes y videos a un VPS, generar enlaces públicos y guardar el catálogo en MongoDB.

## Características

- Node.js + Express
- MongoDB + Mongoose
- Multer para subida de archivos
- Imágenes: JPG, JPEG, PNG, WEBP y GIF
- Videos: MP4, WEBM y MOV
- Drag & drop
- Vista previa
- Progreso de subida
- Copiar URL pública
- Abrir recurso
- Buscar y filtrar
- Eliminar archivo del disco y de MongoDB
- Interfaz responsive
- Preparado para PM2 y Nginx

## 1. Requisitos

- Ubuntu
- Node.js 18 o superior
- MongoDB local o MongoDB Atlas
- Nginx
- PM2
- Un dominio o subdominio apuntando a la IP de tu VPS

## 2. Instalación

```bash
unzip gestor-recursos-vps.zip
cd gestor-recursos-vps
npm install
cp .env.example .env
nano .env
```

Ejemplo de `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/recursos
BASE_URL=https://recursos.midominio.com
MAX_FILE_SIZE_MB=200
```

Importante: `BASE_URL` debe ser el dominio real desde el que quieres obtener los enlaces públicos.

## 3. Iniciar

Modo normal:

```bash
npm start
```

Con PM2:

```bash
npm install -g pm2
pm2 start server.js --name recursos-vps
pm2 save
pm2 startup
```

Después sigue el comando que PM2 muestre en pantalla.

## 4. Nginx

Crea:

```bash
sudo nano /etc/nginx/sites-available/recursos.midominio.com
```

Configuración:

```nginx
server {
    listen 80;
    server_name recursos.midominio.com;

    client_max_body_size 200M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Activa el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/recursos.midominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 5. HTTPS con Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d recursos.midominio.com
```

## 6. MongoDB

Los archivos NO se guardan dentro de MongoDB.

Los archivos se guardan físicamente en:

```text
uploads/
```

MongoDB guarda:

```json
{
  "nombreOriginal": "foto.jpg",
  "nombreArchivo": "1723456789-abc123.jpg",
  "tipo": "image",
  "mimeType": "image/jpeg",
  "size": 204845,
  "url": "https://recursos.midominio.com/uploads/1723456789-abc123.jpg",
  "fechaCreacion": "..."
}
```

## 7. API

### Subir

```http
POST /api/resources
```

Campo `multipart/form-data`:

```text
archivo
```

### Listar

```http
GET /api/resources
```

Opcionales:

```text
?search=foto
?tipo=image
?tipo=video
?page=1
?limit=50
```

### Obtener uno

```http
GET /api/resources/:id
```

### Eliminar

```http
DELETE /api/resources/:id
```

### Estado

```http
GET /api/health
```

## Importante para producción

Actualmente la interfaz no tiene inicio de sesión. No expongas el panel de administración públicamente sin agregar autenticación.

También conviene realizar copias de seguridad de:

- MongoDB
- carpeta `uploads/`

Si reinstalas el VPS y pierdes `uploads/`, las URLs guardadas en MongoDB dejarán de funcionar.
