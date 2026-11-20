# MineTrack360

[![CI](https://github.com/IES9018/camilaScheurer-MineTrack360/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/IES9018/camilaScheurer-MineTrack360/actions/workflows/ci.yml)

Sistema de gestión de flotas para logística minera con IoT y mantenimiento predictivo.

## Stack Tecnológico
- Backend: Node.js 24 LTS + TypeScript + NestJS
- Base de datos: PostgreSQL 16 + TimescaleDB
- Broker IoT: Eclipse Mosquitto (MQTT)
- Cache/Colas: Redis
- Frontend: React 18 + TypeScript + Vite + TailwindCSS + Zustand + Leaflet + Recharts
- Contenedores: Docker + Docker Compose

## Estado del proyecto
**Versión 0.1.1** (cierre de PP3/ADI 2026). Ver [`CHANGELOG.md`](CHANGELOG.md).

- **Implementado:** autenticación JWT con sesión de 1 hora y aviso de vencimiento, roles, vehículos, alertas de mantenimiento por umbral (RF-05), asignación de turnos (RF-07) y las pantallas P1 y P2 (adaptadas a móvil desde la v0.1.1), con mitigaciones de seguridad (límite de pedidos, validación, contrato OpenAPI) y CI.
- **No implementado:** telemetría MQTT y mapa (RF-03, RF-04), resto de los requisitos listados en el CHANGELOG, despliegue productivo (NG-07) y cabeceras de seguridad (T-13).
- **Documentación:** [`SPEC.md`](SPEC.md) (requisitos y changelog), `docs/adr/`, `docs/auditoria/`, [`docs/deploy/deploy.md`](docs/deploy/deploy.md) (demo local paso a paso) y [`docs/postmortem-cuatrimestre.md`](docs/postmortem-cuatrimestre.md).

## Cómo levantar el entorno de desarrollo
El toolchain Node corre en contenedores Docker (`backend-dev` y `frontend-dev`), no en tu computadora. Copiá `.env.example` a `.env` y reemplazá los valores `CAMBIAR_...` (el `.env` no se sube al repositorio). Los puertos del stack solo se publican en `127.0.0.1`.

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
El comando `seed:user` va en **una sola línea** y crea el primer usuario (también acepta `USER_NAME`). Swagger queda en <http://localhost:3000/api/docs> (solo en desarrollo: con `NODE_ENV=production` no se publica); para probar los endpoints, iniciá sesión en `POST /api/v1/auth/login` y usá **Authorize** con el `accessToken`. Tests: `npm test`.

### Frontend
Instrucciones en [`frontend/README.md`](frontend/README.md). La aplicación queda en <http://localhost:5173> y necesita el backend corriendo.
