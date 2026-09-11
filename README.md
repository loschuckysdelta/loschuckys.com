# Videos CRUD final corregido

- `apps/web`: subir a Vercel.
- `apps/api`: instalar en el VPS.

No hay ninguna IP escrita en el código. La URL pública se crea con:
1. `PUBLIC_BASE_URL` si lo configuras.
2. Si queda vacío, el backend usa automáticamente el dominio/host por el que llegó la petición.

Vercel:
- Root Directory: `apps/web`
- Variable: `VITE_API_URL=https://TU-DOMINIO-DE-API`

VPS `.env`:
PORT=3000
MONGODB_URI=TU_URI
PUBLIC_BASE_URL=
FRONTEND_URL=https://TU-PANEL.vercel.app
MAX_UPLOAD_MB=5000

Para que la URL pública muestre un dominio, ese dominio/subdominio debe apuntar al VPS o estar delante mediante un proxy/CDN.
