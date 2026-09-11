# Videos unificado

Un solo repositorio, dos destinos:

- `apps/web`: panel Vite que se despliega en Vercel.
- `apps/api`: API Node/Express que corre en el VPS y guarda/procesa videos allí.

## Vercel
Importa este mismo repositorio y configura Root Directory como `apps/web`.
Variable:
`VITE_API_URL=https://videos.loschuckys.com`

Los videos NO pasan por una Vercel Function: el navegador los envía directamente al VPS.

## VPS
La primera vez clona este mismo repositorio en `/root/videos-unificado`.
Conserva el `.env` únicamente en `/var/www/videos-app/backend-vps/.env`.

Para actualizar manualmente desde Git:
`REPO_DIR=/root/videos-unificado bash /root/videos-unificado/deploy-vps.sh`

## API pública
Otra web puede consumir:
- `GET https://videos.loschuckys.com/api/videos`
- archivos originales mediante `originalUrl`
- HLS mediante `hlsUrl`

## Seguridad
No subas `.env` ni credenciales MongoDB al repositorio.
