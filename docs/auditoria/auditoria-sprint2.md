# Auditoría crítica — Sprint 2

**Proyecto:** MineTrack360 · **Estudiante:** Camila Scheurer · **Fecha:** 2026-11-15
**Base auditada:** rama `develop` en el commit `68fd37e` (PR #12 a #34 integrados) más las remediaciones de este PR.
**Documento anterior:** [`auditoria-sprint1.md`](auditoria-sprint1.md) (18 hallazgos, H-01 a H-18).

> Cada afirmación de estado se contrastó con el código del repositorio o con la salida de un comando. Lo que no se pudo comprobar está marcado como **no verificado**. La rúbrica de evaluación del Sprint 2 no se incorporó a este documento; se mantiene la estructura de la auditoría del Sprint 1.

## 1. Resumen ejecutivo

| Indicador | Valor |
|---|---|
| Hallazgos del Sprint 1 resueltos antes de este PR | 7 (H-03, H-04, H-05, H-11, H-12, H-16, H-18) |
| Hallazgos del Sprint 1 resueltos o mitigados en este PR | 3 (H-01, H-02, H-13) |
| Hallazgos del Sprint 1 abiertos / parciales / deuda aceptada | 2 abiertos (H-06, H-17), 1 parcial (H-14) y 1 deuda aceptada (H-15) |
| Hallazgos del Sprint 1 sin objeto todavía | 4 (H-07, H-08, H-09, H-10: dependen de RF-04 y de la prueba de carga, fuera del Sprint 2) |
| Hallazgos nuevos | 10 (N-01 a N-10): 4 resueltos o mitigados en este PR (N-02, N-03, N-04, N-10), 6 abiertos |
| Hallazgo más importante | **N-03:** `npm audit` marcaba 4 vulnerabilidades (3 altas) en dependencias de **producción** del backend. Corregido en este PR y bloqueado a futuro en CI |

Conclusión: el código funcional del Sprint 2 (RF-05, RF-07, P1, P2) respeta las reglas de arquitectura y seguridad del proyecto. Los riesgos que quedan son de **endurecimiento previo al despliegue** (cabeceras, autenticación del broker, sesión JWT) y de **cobertura de pruebas** del login. Ninguno bloquea el cierre del Sprint 2; los de seguridad deben resolverse antes de cualquier despliegue.

## 2. Alcance y método

| Qué se hizo | Cómo |
|---|---|
| Revisión de código y configuración | Lectura de `docker-compose.yml`, `.env.example`, `.github/`, `backend/src/main.ts`, módulos `auth`, `vehicles`, `maintenance`, `shifts`, entidades y migraciones, `SPEC.md`, ADR y `frontend/src` |
| Búsqueda de patrones riesgosos | `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `localStorage` (sin resultados en el frontend), `helmet`, `enableCors`, `ThrottlerGuard`, `NODE_ENV` |
| Dependencias | `npm audit` y `npm audit --omit=dev` en `backend/` y `frontend/`, antes y después de las correcciones |
| Verificación de las correcciones | Typecheck, lint, tests con cobertura, build y arranque real de la API (con base de datos PostgreSQL de prueba) en modo desarrollo y en modo producción |

**No verificado** (fuera de mi alcance): la configuración de protección de ramas y los checks requeridos en GitHub, el resultado de los workflows de CI para este PR, Docker en Windows, y el despliegue.

## 3. Estado de los hallazgos del Sprint 1

| ID | Hallazgo (resumen) | Estado | Evidencia en el código |
|---|---|---|---|
| H-01 | Credenciales de DB hardcodeadas y débiles | **Resuelto en este PR** | `docker-compose.yml` ya usa `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}` y `.env` está en `.gitignore`. Faltaba el valor de ejemplo: `.env.example` traía `minetrack/minetrack` y un secreto JWT de ejemplo usable. Ahora son marcadores `CAMBIAR_...` y, en producción, la API **no arranca** con un `JWT_SECRET` de menos de 32 caracteres o de ejemplo (`src/config/security.ts`, con tests) |
| H-02 | Puerto 5432 publicado al host | **Mitigado en este PR** | Se mantiene publicado porque el desarrollo lo usa, pero solo en `127.0.0.1` (igual para Redis, MQTT, API y Vite). Ya no es alcanzable desde la red local |
| H-03 | `version: "3.9"` obsoleta | **Resuelto** (PR #28) | `docker-compose.yml` no tiene la clave `version` |
| H-04 | División por `intervalHours` sin guarda | **Resuelto** | `maintenance.service.ts` valida finitud, `intervalHours > 0`, no negativos y `lastServiceHours <= totalEngineHours`. Tests: intervalo 0, negativo, NaN e Infinity en `maintenance.service.spec.ts`. Además, el umbral tiene `CHECK (interval_hours > 0)` en la base |
| H-05 | `MaintenanceService` sin `@Injectable()` | **Resuelto** | La clase está decorada con `@Injectable()` |
| H-06 | `totalEngineHours` como `float` | **Abierto (mitigado en el dominio)** | La entidad y las migraciones siguen usando `double precision` (`total_engine_hours`, `last_service_hours`, `interval_hours`). El servicio redondea las horas a 1 decimal antes de comparar y hay un test del límite del 90 %. Falta migrar a `numeric(10,1)` (ver §6) |
| H-07 | Dos vocabularios de estado de vehículo | **Mitigado por diseño; re-verificar con RF-04** | El API separa el estado administrativo (`vehicleStatus`: `ACTIVE`, `MAINTENANCE`, `OUT_OF_SERVICE`) del estado de criticidad (`status`: `CRITICAL`, `WARNING`, `NO_THRESHOLD`, `OK`) en el mismo DTO. El mapa (RF-04) no existe todavía |
| H-08 | Diccionario de colores sin fallback | **Sin objeto todavía** | `VehicleMarker.tsx` no existe. En P1 los estados se definen en `STATUS_META: Record<AlertStatus, ...>`, que el compilador obliga a completar para cada estado |
| H-09 | Host hardcodeado en la prueba k6 | **Sin objeto todavía** | No existe el directorio `perf/`; la prueba de carga (CA-04) quedó fuera del Sprint 2 |
| H-10 | Aserción débil en la prueba k6 | **Sin objeto todavía** | Idem H-09 |
| H-11 | `+id` sin `ParseIntPipe` | **Resuelto** | `vehicles.controller.ts` usa `@Param('id', ParseIntPipe)` y `findOne` lanza `NotFoundException` si no existe |
| H-12 | Validación de entrada no evidenciada | **Resuelto** | `main.ts` registra `ValidationPipe` con `whitelist`, `forbidNonWhitelisted` y `transform`. Observado en ejecución: un cuerpo `{"x":1}` en `POST /shifts/assignments` responde 400 con «property x should not exist» y los errores de `vehicleId` y `operatorId` |
| H-13 | Swagger expuesto en producción | **Resuelto en este PR** | `main.ts` solo publica `/api/docs` si `NODE_ENV` no es `production`. Observado: desarrollo 200; producción 404 con la API respondiendo 401 sin token |
| H-14 | Métricas de calidad simuladas | **Parcial** | Hay medición real de tests (103 backend, 97 frontend), cobertura (57,4 % de sentencias) y `npm audit` (§4, N-03 y N-09). Faltan p95, throughput y complejidad ciclomática, que dependen de la prueba de carga; la tabla simulada del informe PP2 sigue fuera del repositorio |
| H-15 | `parts_used` como texto libre | **Deuda aceptada** | Sin cambios; RF-10 no entró en el Sprint 2 |
| H-16 | Vocabulario del enum SPEC vs código | **Resuelto** | `SPEC.md` (contrato `Vehiculo`) usa `'ACTIVE' \| 'MAINTENANCE' \| 'OUT_OF_SERVICE'`, igual que `vehicle.entity.ts` |
| H-17 | JWT sin refresco ni revocación | **Abierto** | `JWT_EXPIRES_IN` por defecto 8 h; no hay refresh token ni revocación, y el frontend guarda el token en `sessionStorage` (compromiso documentado en ADR-004). Ver §6 |
| H-18 | GitHub Flow vs Git Flow | **Resuelto** | Todo el trabajo entra por PR `feature/*` → `develop`. La protección de ramas y la aprobación requerida **no se pudieron verificar** desde aquí |

## 4. Hallazgos nuevos del Sprint 2

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| N-01 | **No hay cabeceras de seguridad HTTP.** El informe PP2 (§6.3.5) citaba `helmet`; el backend no lo tiene (`package.json` solo declara `@nestjs/throttler` entre las defensas) | Media | **Abierto** |
| N-02 | **Dependabot ausente.** El informe PP2 lo daba por presente; no existe `.github/dependabot.yml` | Baja | **Resuelto en este PR** |
| N-03 | **Vulnerabilidades altas en dependencias de producción del backend.** `npm audit --omit=dev`: 4 (3 altas: `@nestjs/platform-express`/`multer`, `body-parser`; 1 moderada: `qs`). `body-parser` interviene en el análisis de cada cuerpo JSON (riesgo de denegación de servicio); `multer` atiende subidas de archivos, que el proyecto no usa (no hay `FileInterceptor` en el código) | **Alta** | **Resuelto en este PR** |
| N-04 | **Servicios auxiliares publicados y sin autenticación.** Redis (6379) sin contraseña y Mosquitto (1883) con `allow_anonymous true`, ambos publicados en todas las interfaces. El propio `mosquitto.conf` lo declara como decisión del prototipo | Media en desarrollo; Alta si se despliega así | **Mitigado en este PR** (solo `127.0.0.1`). La autenticación y TLS del broker quedan para RF-03 |
| N-05 | **La cancelación de una asignación no registra quién la hizo.** `shift_assignments` guarda `assignedById` y `cancelledAt`, pero no `cancelledById`; afecta la trazabilidad pedida por RF-11 | Media | **Abierto** |
| N-06 | **Límite de intentos solo en el login.** `ThrottlerGuard` se aplica únicamente en `auth.controller.ts` (5 por minuto, observado: el sexto login responde 429); el resto de los endpoints no tiene límite | Baja | **Abierto** |
| N-07 | **Cobertura insuficiente en autenticación y sin umbral en CI.** `auth.service` y `auth.controller` tienen 0 % (módulo `auth` 21 %, total 57,4 %) y `jest.config.ts` no define `coverageThreshold` | Media | **Abierto** (ver T-01 del reporte de pruebas) |
| N-08 | **Estrategia de origen para producción sin definir.** En desarrollo no hace falta CORS porque Vite reenvía `/api`; el backend no habilita CORS ni hay proxy inverso definido para producción | Baja (informativa) | **Abierto** (se resuelve al diseñar el despliegue) |
| N-09 | **Advertencias de `npm audit` solo en dependencias de desarrollo.** Backend: 36 restantes (1 crítica en `handlebars`, 2 altas en `tmp` y `undici`, que arrastra `@nestjs/mau`; la corrección de estas dos exige un cambio mayor). Frontend: 7 moderadas en la cadena de `typescript-eslint`. Ninguna entra en el código que se despliega | Baja | **Abierto** (Dependabot las irá proponiendo) |
| N-10 | **Secreto JWT de ejemplo utilizable.** `.env.example` traía `una_clave_secreta_larga_y_aleatoria`, que alguien podía dejar sin cambiar en producción | Media | **Resuelto en este PR** (ver H-01) |

### Lo que se buscó y no se encontró

- Ninguna pantalla usa `dangerouslySetInnerHTML`, `innerHTML` ni `eval`: React escapa todo el texto que viene de la API.
- El frontend no usa `localStorage`; el token vive en `sessionStorage` y solo se envía al propio origen (`/api/v1`).
- Las consultas pasan por TypeORM (parametrizadas) y la doble asignación de turnos la garantiza la base de datos con índices únicos parciales, no la interfaz.
- Los módulos nuevos cumplen ADR-002 regla 1: consumen solo el servicio exportado de otro módulo.

## 5. Remediaciones incluidas en este PR

| Cambio | Hallazgos | Verificación realizada |
|---|---|---|
| `backend/package-lock.json`: `npm audit fix` solo sobre producción (`@nestjs/platform-express` 12.1.2 → 12.5.0, `express` 5.2.1 → 5.3.0, `body-parser` 2.3.0 → 2.4.0, `multer` 2.4.0 → 2.5.0, `qs` y dependencias menores). `package.json` no cambia | N-03 | `npm audit --omit=dev`: de 4 a 0. Typecheck, lint, 113 tests y build correctos. API arrancada con el lockfile nuevo: login, alertas, disponibilidad y vehículos responden 200 |
| `.github/workflows/ci.yml`: paso `npm audit --omit=dev --audit-level=high` en los jobs de backend y frontend | N-03 | Frontend: 0 vulnerabilidades en producción. La verificación del paso en GitHub Actions queda para el CI de este PR |
| `src/config/security.ts` (+ tests): Swagger apagado en producción y rechazo de `JWT_SECRET` débil en producción | H-13, H-01, N-10 | 10 tests nuevos. En ejecución real: producción con secreto fuerte, `/api/docs` 404; producción con `CAMBIAR_corto`, la API no arranca y registra el motivo; desarrollo, `/api/docs` 200 |
| `docker-compose.yml`: puertos publicados solo en `127.0.0.1` | H-02, N-04 | Sintaxis YAML válida. **No probado** con Docker en Windows (es una opción estándar de Compose) |
| `.env.example`: marcadores `CAMBIAR_...` | H-01, N-10 | Revisión. Tu `.env` actual no cambia |
| `.github/dependabot.yml`: npm (backend y frontend, semanal) y GitHub Actions (mensual), hacia `develop` | N-02 | Sintaxis YAML válida; se activa al integrarse en `develop` |
| `README.md` y `SPEC.md` (nota y fila de changelog) | — | Revisión |

## 6. Plan para lo que queda abierto

| Prioridad | Pendiente | Qué hacer | Cuándo |
|---|---|---|---|
| 1 | N-07 / T-01: tests del login | Tests unitarios de `auth.service` y `auth.controller`; después fijar un `coverageThreshold` en `jest.config.ts` que el CI haga cumplir | Sprint 3 |
| 2 | H-17: sesión JWT | Decidir y registrar en un ADR: expiración corta con refresh token rotativo, o 8 h con re-login y riesgo aceptado. Considerar cookie `HttpOnly` en lugar de `sessionStorage` | Antes de desplegar |
| 3 | N-01: cabeceras de seguridad | Agregar `helmet`. Es una dependencia nueva: requiere ADR (regla R-07) | Antes de desplegar |
| 4 | N-05: quién cancela | Migración con `cancelled_by_id` y registro en `shifts.service` al cancelar (RF-11) | Sprint 3 |
| 5 | H-06: columnas `numeric` | Migración nueva (las aplicadas no se editan, ADR-003) a `numeric(10,1)` con transformador de TypeORM, porque `numeric` llega como texto | Sprint 3 |
| 6 | N-04: broker MQTT | Contraseñas y TLS en Mosquitto al implementar RF-03; Redis con contraseña si se usa | Con RF-03 |
| 7 | N-06: límite de intentos | Aplicar `ThrottlerGuard` de forma global y revisar la IP real detrás de un proxy | Antes de desplegar |
| 8 | H-09 / H-10 / H-14: prueba de carga | Crear `perf/telemetry-load.js` con `BASE_URL` por variable y aserciones sobre el cuerpo; adjuntar la salida real | Con RF-03 |
| 9 | N-08: origen en producción | Proxy inverso del mismo origen o CORS con lista explícita | Con el despliegue |
| 10 | Branch protection | Confirmar en GitHub: `develop` y `main` con PR obligatorio, 1 aprobación y los checks `Backend` y `Frontend` como requeridos | Ahora (manual) |

## 7. Riesgos residuales

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Token robado utilizable hasta 8 h (H-17) | Media | Alto | Decisión de sesión antes de desplegar; ninguna pantalla renderiza HTML de la API |
| Despliegue con broker o Redis sin autenticación (N-04) | Baja | Alto | Bloquear el despliegue hasta resolver RF-03; hoy solo escuchan en `127.0.0.1` |
| Regresión en el login sin que los tests avisen (N-07) | Media | Alto | Tests del login (prioridad 1) |
| Nueva vulnerabilidad en dependencias | Alta (continuo) | Medio | Auditoría en CI y Dependabot (este PR) |
| Cambios de Compose no probados en Windows | Baja | Bajo | Probar `docker compose up -d` tras el merge; revertir las líneas `127.0.0.1:` si fallara |

## 8. Fortalezas verificadas

- **Control de acceso por rol en capas:** `JwtAuthGuard` + `RolesGuard` + `@Roles` en cada controlador, y la misma matriz reflejada en la interfaz. Los 5 roles se probaron contra la API real (reporte de pruebas §5).
- **Integridad garantizada en la base de datos:** `CHECK` de horas e intervalos, índices únicos parciales contra la doble asignación y mapeo del error 23505 a 409.
- **Arranque seguro por defecto:** la API no inicia sin `JWT_SECRET` y solo acepta tokens HS256.
- **Cadena de calidad automática:** CI con typecheck, lint, formato, tests, build y ahora auditoría de dependencias; hook de pre-commit en el backend.
- **Decisiones trazables:** cuatro ADR, SPEC con historial de cambios y reportes por sprint.

## 9. Cierre del Sprint 2 — Definition of Done

| Entregable | Ruta | Estado |
|---|---|---|
| RF-05 y RF-07 en backend, con tests | `backend/src/maintenance`, `backend/src/shifts` | ✅ |
| Frontend base y pantallas P1 y P2 | `frontend/` | ✅ |
| Reporte de pruebas del Sprint 2 | `docs/pruebas/reporte-sprint2.md` | ✅ |
| Auditoría del Sprint 2 | `docs/auditoria/auditoria-sprint2.md` | ✅ Este documento |
| RF-03 (MQTT) y RF-04 (mapa) | — | ⏳ Fuera del Sprint 2, declarados pendientes en la SPEC |
| PR final `develop` → `main` | — | ⏳ Siguiente paso |
