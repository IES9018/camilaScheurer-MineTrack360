# MineTrack360

Sistema de gestión de flotas para logística minera con IoT y mantenimiento predictivo.

## Stack Tecnológico
- Backend: Node.js 24 LTS + TypeScript + NestJS
- Base de datos: PostgreSQL 16 + TimescaleDB
- Broker IoT: Eclipse Mosquitto (MQTT)
- Cache/Colas: Redis
- Frontend: React 18 + TypeScript + Vite + TailwindCSS + Zustand + Leaflet + Recharts
- Contenedores: Docker + Docker Compose

## Estado del proyecto
🚧 Sprint 2 en curso. Backend: autenticación y roles, vehículos, alertas de mantenimiento por umbral (RF-05) y asignación de turnos (RF-07). Frontend: base con login y rutas por rol; pantallas P1 (alertas de mantenimiento, RF-05) y P2 (asignación de turnos, RF-07) implementadas. Ver `SPEC.md` (requerimientos y changelog) y `docs/` (arquitectura, diseño y ADR).

## Cómo levantar el entorno de desarrollo
El toolchain Node corre en contenedores Docker (`backend-dev` y `frontend-dev`), no en tu computadora. Copiá `.env.example` a `.env` y completalo (el `.env` no se sube al repositorio).

```
docker compose up -d
```

### Backend
Dentro del contenedor (`docker compose exec backend-dev bash`), en `backend/`:
```
npm ci
npm run migration:run
USER_EMAIL=admin@minetrack360.com USER_PASSWORD='<elegí una clave>' USER_ROLE=admin npm run seed:user
npm run start:dev
```
El comando `seed:user` va en **una sola línea** y crea el primer usuario (también acepta `USER_NAME`). Swagger queda en <http://localhost:3000/api/docs>; para probar los endpoints, iniciá sesión en `POST /api/v1/auth/login` y usá **Authorize** con el `accessToken`. Tests: `npm test`.

### Frontend
Instrucciones en [`frontend/README.md`](frontend/README.md). La aplicación queda en <http://localhost:5173> y necesita el backend corriendo.
