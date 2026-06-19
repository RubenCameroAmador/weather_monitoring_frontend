# Production Deployment Guide

## 1. Prerequisites

| Requirement | Detail |
|---|---|
| **Server** | EC2 instance with Docker and Docker Compose installed |
| **Backend** | Already running (your Flask API + Nginx on port 80 with `web:5000` upstream) |
| **Domain** | A domain pointing to the EC2's public IP |
| **Subdomain** | `weather_monitoring.tudominio.com` (DNS A record → EC2 IP) |
| **Git** | `git` installed on the server |

## 2. Architecture Overview

```
Internet (port 443)
    │
    ▼
Frontend Nginx (weather_monitoring.tudominio.com)
    ├── /            → sirve static files (SPA)
    ├── /api/        → proxy_pass al backend Flask
    └── /socket.io/  → proxy_pass WebSocket al backend
              │
              ▼
        Backend Nginx (existing, port 5000 interno)
              │
              ├── web:5000 (API Flask)
              └── mcp:8000 (MCP)
```

El frontend y backend corren en **la misma máquina**. El frontend Nginx recibe tráfico del usuario, sirve los archivos estáticos y reenvía `/api/` y `/socket.io/` al backend.

---

## 3. DNS Configuration

Crea un registro A en tu proveedor DNS:

| Type | Name | Value |
|---|---|---|
| A | `weather_monitoring` | `{IP_DEL_EC2}` |

Ejemplo con `midominio.com`:
- `weather_monitoring.midominio.com` → `54.123.45.67`

Esto funciona para ambos: el frontend se sirve en la raíz de ese subdominio, y el API se llama a `https://weather_monitoring.midominio.com/api/...` desde el navegador (mismo origen, sin CORS).

---

## 4. Clone y configuración inicial

```bash
# Conectarse al servidor
ssh ec2-user@54.123.45.67

# Ir al directorio donde corren los servicios
cd /opt  # o el directorio que uses para tus proyectos

# Clonar el repositorio
git clone https://github.com/tu-usuario/weather_monitoring_frontend.git
cd weather_monitoring_frontend
```

---

## 5. Variables de entorno (`.env`)

Crea o edita el archivo `.env` en la raíz del proyecto:

```bash
# .env
VITE_API_BASE=https://weather_monitoring.midominio.com/api
```

**¿Por qué esta URL?**
- El navegador necesita una URL **pública** para llamar al API
- Como el frontend se sirve en `weather_monitoring.midominio.com`, y el Nginx del frontend proxyberá `/api/` al backend, la URL pública es `https://weather_monitoring.midominio.com/api`
- `VITE_API_BASE` se incrusta en el bundle en **build time** (al correr `npm run build` o `docker compose build`)

> ⚠️ Si cambias la URL después, debes reconstruir la imagen Docker. No se puede cambiar en caliente.

---

## 6. Nginx del frontend (producción con SSL)

El proyecto incluye un `nginx.conf` para entorno de desarrollo (proxy a IP privada). Para producción necesitas uno que:
- Use el subdominio como `server_name`
- Escuche en puerto 443 con SSL
- Proxyber `/api/` y `/socket.io/` al backend usando **su contenedor Docker** o **su IP interna**

### Opción A: Backend en Docker (misma red)

Si tu backend corre en Docker con un `docker-compose.yml`, puedes crear una red compartida y referenciar el contenedor por nombre:

```nginx
# nginx.prod.conf
server {
    listen 443 ssl;
    server_name weather_monitoring.midominio.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy al backend (misma red Docker)
    location /api/ {
        proxy_pass http://api:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://api:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 80;
    server_name weather_monitoring.midominio.com;
    return 301 https://$host$request_uri;
}
```

### Opción B: Backend expuesto en puerto del host

Si tu backend ya publica puertos en el host (ej: `ports: "5000:5000"` en su compose):

```nginx
# nginx.prod.conf
server {
    listen 443 ssl;
    server_name weather_monitoring.midominio.com;
    # ...ssl config...

    location /api/ {
        proxy_pass http://host.docker.internal:5000/api/;
    }

    location /socket.io/ {
        proxy_pass http://host.docker.internal:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

o usa `--network="host"` en el contenedor frontend y proxy a `http://localhost:5000`.

---

## 7. Docker Compose (producción)

Modifica el `docker-compose.yml` para producción:

```yaml
services:
  weather-frontend:
    build:
      context: .
      dockerfile: Dockerfile.prod  # o un dockerfile que use el nginx.prod.conf
    container_name: weather-monitoring-frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/nginx/certs:ro
    restart: unless-stopped
    networks:
      - default
      - backend_network  # misma red del backend para resolver "api" por nombre

networks:
  backend_network:
    external: true
    name: nombre_de_la_red_del_backend
```

> Para saber el nombre de la red del backend: en el servidor corre `docker network ls` y busca la red que usan tus contenedores del backend.

### Dockerfile para producción

Crea `Dockerfile.prod` (o modifica el `Dockerfile` existente):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

---

## 8. SSL con Let's Encrypt (Certbot)

### En el servidor (Nginx del sistema):

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian

# Obtener certificado (certbot configura temporalmente el nginx)
sudo certbot certonly --nginx \
  -d weather_monitoring.midominio.com \
  --non-interactive \
  --agree-tos \
  -m tu-email@example.com
```

Los certificados se guardan en `/etc/letsencrypt/live/weather_monitoring.midominio.com/`.

### Montarlos en el contenedor:

En el `docker-compose.yml` se montan como volúmenes (ya incluido arriba).

### Renovación automática:

```bash
# Certbot crea un timer systemd automático
sudo systemctl status certbot.timer

# Para probar la renovación:
sudo certbot renew --dry-run
```

Si el frontend corre en Docker con los certificados montados, la renovación funciona automáticamente porque los archivos se actualizan en `/etc/letsencrypt` y el contenedor los lee al arrancar. Si necesitas recargar nginx tras renovar, añade un hook:

```bash
# /etc/letsencrypt/renewal-hooks/post/restart-frontend.sh
#!/bin/bash
docker exec weather-monitoring-frontend nginx -s reload
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/restart-frontend.sh
```

---

## 9. Build y deploy

```bash
# Parar el contenedor actual si existe
docker compose down

# Reconstruir con la nueva config
docker compose build --no-cache

# Iniciar
docker compose up -d

# Ver logs
docker compose logs -f
```

---

## 10. Probar que todo funciona

### Frontend
```bash
curl -s -o /dev/null -w "%{http_code}" https://weather_monitoring.midominio.com
# Debería devolver 200 (el index.html)
```

### API
```bash
curl -s https://weather_monitoring.midominio.com/api/measurements/latest
# Debería devolver JSON con mediciones
```

### WebSocket
Abre el navegador en `https://weather_monitoring.midominio.com` y verifica que el indicador muestre "Live" (conexión WebSocket activa).

### Sensor endpoint
El endpoint que envía datos desde el sensor sigue yendo directamente al backend (no cambia). El frontend solo **consume** datos, no los recibe del sensor.

---

## 11. Resumen de archivos a crear/modificar

| Archivo | Acción | Propósito |
|---|---|---|
| `.env` | Crear/editar | `VITE_API_BASE=https://weather_monitoring.midominio.com/api` |
| `nginx.prod.conf` | **Crear** | Config de Nginx con SSL, subdominio, proxy al backend |
| `Dockerfile.prod` | **Crear** (opcional) | Build multi-stage que usa `nginx.prod.conf` |
| `docker-compose.yml` | Modificar | Añadir puerto 443, volúmenes SSL, red del backend |

O puedes optar por sobreescribir el `nginx.conf` existente y usar el `Dockerfile` actual — solo asegúrate de que el `nginx.conf` apunte al backend correcto.

---

## 12. Troubleshooting

| Problema | Causa | Solución |
|---|---|---|
| `502 Bad Gateway` en `/api/` | Nginx no encuentra el backend | Verifica que `proxy_pass` apunte al host/puerto correcto. Si usas nombre de contenedor (`api:5000`), asegúrate de que estén en la misma red Docker |
| WebSocket no conecta ("Reconnecting...") | Proxy WebSocket no configurado | Verifica que `/socket.io/` tenga `proxy_http_version 1.1`, `Upgrade` y `Connection "upgrade"` |
| El frontend carga pero el API da `404` | `VITE_API_BASE` incorrecto | Verifica que `.env` tenga la URL completa incluyendo `/api` al final |
| Certificado SSL no encontrado | Ruta incorrecta en el volumen | Verifica que `/etc/letsencrypt` exista en el host y que la ruta montada coincida con `ssl_certificate` en el nginx.conf |
| CORS error en el navegador | El API se llama a origen distinto | La URL en `VITE_API_BASE` debe ser el mismo subdominio donde se sirve el frontend. Al usar proxy Nginx, es el mismo origen — no debería haber CORS |
