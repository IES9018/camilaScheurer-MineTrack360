# Despliegue y demostración

**Fecha:** 2026-11-16 · **Relacionado:** [ADR-005](../adr/ADR-005-estrategia-web.md), [ADR-006](../adr/ADR-006-politica-de-sesion-jwt.md), [ADR-007](../adr/ADR-007-estrategia-mobile.md), [`threat-model-lite.md`](../seguridad/threat-model-lite.md) (T-15), auditoría S2 (N-08), `SPEC.md` (RNF-08).

## 1. Qué se entrega y qué no
**Destino:** una **demostración local** en la computadora de la presentación (Docker Compose + los contenedores de desarrollo que ya existen). El destino de despliegue de PP3 nunca se definió; se asume que alcanza con «mostrar una demo».

| | Estado |
|---|---|
| Demo local reproducible con los pasos de abajo | **Sí** |
| Despliegue en un servidor o servicio en la nube | **No** (Non-Goal, sección 7) |
| Imágenes de producción (Dockerfile multi-stage) | **No** (Non-Goal, sección 7) |
| HTTPS | **No**: la demo usa HTTP en `localhost` |

## 2. Qué corre en la demo
```
Navegador (http://localhost:5173)
   │  /api/*  (el proxy de Vite lo reenvía: mismo origen para el navegador, sin CORS)
   ▼
frontend-dev (Vite, :5173)  ──►  backend-dev (NestJS, :3000)  ──►  db (PostgreSQL 16 + TimescaleDB)
                                  redis y mosquitto levantan, pero el backend todavía no los usa
```
Todos los puertos se publican **solo en `127.0.0.1`**. `backend-dev` y `frontend-dev` son contenedores de desarrollo (`node:24`): el código se ejecuta con `npm run start:dev` y `npm run dev`, no con una imagen empaquetada.

## 3. Requisitos
Docker Desktop (o Docker Engine con Compose v2) y Git. Nada más: Node, PostgreSQL y el resto corren en contenedores.

## 4. Puesta en marcha (una sola vez)
Usá tres terminales abiertas en la raíz del repositorio. Reemplazá `<clave-demo>` por una clave tuya de **8 caracteres o más**; no la subas al repositorio.

**1. Variables de entorno.** Copiá `.env.example` a `.env` y reemplazá los dos `CAMBIAR_...`:
```
# genera un valor aleatorio sin instalar nada más (sirve para la clave de la base y para JWT_SECRET)
docker run --rm node:24-bookworm node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- `POSTGRES_PASSWORD` y la misma clave dentro de `DATABASE_URL`.
- `JWT_SECRET`: otro valor aleatorio. `JWT_EXPIRES_IN` queda en `1h` (ADR-006).

**2. Levantar los contenedores.**
```
docker compose up -d
docker compose ps        # db debe figurar como "healthy"
```

**3. Backend: dependencias, migraciones y usuarios** (terminal 1).
```
docker compose exec backend-dev bash
cd backend
npm ci
npm run migration:run
USER_EMAIL=admin@minetrack360.com USER_PASSWORD='<clave-demo>' USER_NAME='Administrador' USER_ROLE=admin npm run seed:user
USER_EMAIL=supervisor@minetrack360.com USER_PASSWORD='<clave-demo>' USER_NAME='Ana Martínez' USER_ROLE=supervisor npm run seed:user
USER_EMAIL=mantenimiento@minetrack360.com USER_PASSWORD='<clave-demo>' USER_NAME='Marcos Ruiz' USER_ROLE=mantenimiento npm run seed:user
```
Cada `seed:user` va en **una sola línea**. Hay 6 migraciones; la primera habilita TimescaleDB y por eso la base tiene que ser la imagen `timescale/timescaledb` del compose (con PostgreSQL común esa migración falla).

**4. Tipos de vehículo** (la API no tiene endpoint para crearlos). Desde otra terminal, en la raíz del repositorio:
```
# Linux / macOS / Git Bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docs/deploy/demo-tipos-vehiculo.sql
# PowerShell
Get-Content docs/deploy/demo-tipos-vehiculo.sql | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
Debe responder `INSERT 0 1` dos veces (si lo repetís, `INSERT 0 0`).

**5. Arrancar el backend** (terminal 1, ya dentro de `backend/`):
```
npm run start:dev
```
Espera «Nest application successfully started». Swagger queda en <http://localhost:3000/api/docs> (solo fuera de producción).

**6. Arrancar el frontend** (terminal 2):
```
docker compose exec frontend-dev npm ci
docker compose exec frontend-dev npm run dev
```

**7. Cargar los datos de demo** (terminal 3). Usa la API real, con el usuario admin:
```
docker compose exec -e ADMIN_EMAIL=admin@minetrack360.com -e ADMIN_PASSWORD='<clave-demo>' backend-dev node docs/deploy/cargar-datos-demo.mjs
```
Crea 6 vehículos, 3 operadores, el umbral de 500 h para los dos tipos y una asignación de ejemplo (CAM-009 a Luis Gómez, turno **tarde**). Es repetible. **Ojo con la fecha:** la asignación se crea para «hoy» según la zona horaria del contenedor, que suele ser UTC; de noche en Argentina eso es el día siguiente. Si la fecha que muestra la pantalla P2 no coincide con la que imprime el script, volvé a correrlo con `-e DEMO_DATE=AAAA-MM-DD` (la fecha local).

El login admite 5 intentos por minuto por IP; no repitas el script en ráfaga.

## 5. Comprobación rápida
| Qué | Cómo | Resultado esperado |
|---|---|---|
| Base y migraciones | `npm run migration:show` | las 6 migraciones marcadas como ejecutadas |
| Backend | abrir <http://localhost:3000/api/docs> | carga Swagger |
| Frontend | abrir <http://localhost:5173> | pantalla de inicio de sesión |
| Datos | entrar como supervisor → **Alertas de mantenimiento** | 2 CRÍTICO, 1 ADVERTENCIA, 3 OK |
| Asignación | **Turnos**, turno tarde de la fecha de la asignación | CAM-009 «ya asignado»; CAM-014 y CAM-003 bloqueados por alerta crítica |

## 6. Guion corto de la demo
1. **Supervisor** (`supervisor@minetrack360.com`): P1 (**Alertas de mantenimiento**) muestra el semáforo y el orden por criticidad.
2. P2: elegir CAM-021 y un operador libre, confirmar, y probar **Deshacer**. Mostrar que CAM-014 y CAM-003 aparecen bloqueados con su motivo, y CAM-009 como ya asignado.
3. **Mantenimiento** (`mantenimiento@minetrack360.com`): ve P1; en P2 no tiene permiso (HU-07).
4. Mostrar el aviso de sesión (ADR-006) con un token que vence en minutos: bajar `JWT_EXPIRES_IN` a `6m`, reiniciar el backend y entrar de nuevo.
5. Cerrar con `/api/docs` (contrato real) y la CI en GitHub.

## 7. Non-Goal: despliegue productivo con contenedores
**NG-07** (registrado en la SPEC): no se publica un despliegue productivo ni imágenes de producción en esta etapa.

Motivos:
1. **El objetivo es una demostración**, no un servicio con usuarios.
2. **Hoy no existe Dockerfile.** `docker-compose.yml` declara solo entornos de desarrollo y lo dice en su nota final. Escribir uno sin poder construirlo y probarlo de punta a punta sería entregar algo no verificado.
3. **Faltan decisiones previas** (proxy inverso, TLS, secretos de producción, dónde corre) que dependen de un destino que nadie definió.
4. **Plazo:** el cierre de PP3 es el 17–19/11/2026 y hay otros entregables.

Consecuencia: RNF-08 queda **«Parcial»** (SPEC v5): el entorno de desarrollo es reproducible con `docker compose up`, pero no hay empaquetado para producción.

**Lo que haría falta para producción** (trabajo futuro, en este orden): Dockerfile multi-stage para el backend y para el frontend (estáticos detrás de un servidor web); un proxy inverso con TLS que sirva SPA y API en el mismo origen; secretos fuera del repositorio; una plataforma elegida (el informe PP2 §7.2 sugiere Render, Railway o Netlify, sin decisión tomada); y los pendientes de seguridad de la sección 8.

## 8. Decisiones de origen y de proxy (N-08 y T-15)
| Tema | Decisión | Estado |
|---|---|---|
| **N-08: origen y CORS** | En la demo, el navegador siempre habla con `:5173` y Vite reenvía `/api`: mismo origen, **no hace falta CORS**. En un despliegue real, servir SPA y API desde el **mismo origen** con un proxy inverso y **no** habilitar CORS. Si algún día hay que separarlos, CORS con lista explícita de orígenes, nunca `*` | Decidido y documentado; sin implementar (no hay proxy) |
| **T-15: `trust proxy`** | `main.ts` no lo configura. Detrás de un proxy, el límite global de 100 pedidos por minuto por IP vería la IP del proxy y **todos los usuarios compartirían el mismo cupo**. Al introducir el proxy hay que configurar `trust proxy` con el salto exacto, y probarlo | **Pendiente para el despliegue real**; no afecta la demo local |
| **T-13: cabeceras** | Sin `helmet`/CSP: requiere un ADR (R-07) | Pendiente (PR aparte) |

## 9. Seguridad de la demo
- Los puertos están ligados a `127.0.0.1`; **no los abras a la red** (la demo corre con Swagger habilitado y en modo desarrollo).
- `.env` no se sube al repositorio. Las claves de demo son tuyas y descartables.
- Con `NODE_ENV=production` el backend exige un `JWT_SECRET` de al menos 32 caracteres y distinto del valor de ejemplo, y no publica Swagger. La demo no usa ese modo.

## 10. Verificado y no verificado
**Verificado el 2026-11-16** (PostgreSQL 16 común y el backend compilado, en un entorno sin Docker):
- Las migraciones aplican en el orden esperado: 5 de 6 (la de TimescaleDB no, porque la extensión no estaba instalada en ese entorno).
- `seed:user` crea los usuarios por rol; sin la tabla de tipos de vehículo cargada, `vehicle_types` está vacía (por eso el paso 4).
- El backend **arranca sin Redis ni Mosquitto**.
- `demo-tipos-vehiculo.sql` es repetible y deja camión = 1, pala = 2.
- `cargar-datos-demo.mjs` corre dos veces sin errores; las alertas dan **2 CRÍTICO, 1 ADVERTENCIA, 3 OK** y la disponibilidad marca CAM-009 como `ALREADY_ASSIGNED` (Luis Gómez) y CAM-003/CAM-014 como `CRITICAL_ALERT`.

**No verificado** (no tuve Docker en el entorno de prueba):
- `docker compose up` y el estado `healthy` de la base.
- La migración de TimescaleDB con la imagen real.
- `npm run start:dev` y `npm run dev` dentro de los contenedores, y el proxy de Vite.
- Los pasos con PowerShell y todo en Windows.
- Los textos y el comportamiento de las pantallas P1 y P2 durante el guion (solo se comprobó la API).

## 11. Apagar y limpiar
```
docker compose down        # apaga; los datos se conservan en el volumen
docker compose down -v     # apaga y BORRA la base de datos y los volúmenes
```

## 12. Problemas frecuentes
| Síntoma | Causa probable |
|---|---|
| `DATABASE_URL no está definida` | El comando se corrió fuera del contenedor `backend-dev` |
| `EnableTimescaledb` falla | La base no es la imagen `timescale/timescaledb` del compose |
| Login responde 429 | Más de 5 intentos por minuto: esperá ~1 minuto |
| El script de datos dice «No se pudo iniciar sesión» | Usuario o clave distintos de los del `seed:user` |
| P2 no muestra «ya asignado» | La fecha de la asignación no es la que mira P2 (ver `DEMO_DATE`, paso 7) |
| El frontend no llega al backend | `backend-dev` no está corriendo `npm run start:dev` |
| P2 o la API fallan con `column ... does not exist` | Hay migraciones nuevas sin aplicar tras actualizar el código: corré `npm run migration:run` en `backend/` |
