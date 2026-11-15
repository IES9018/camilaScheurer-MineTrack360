# Modelo de amenazas (versión ligera, STRIDE)

**Fecha:** 2026-11-15 · **Alcance:** los 5 endpoints críticos de [`api-contracts.yaml`](../arquitectura/api-contracts.yaml) · **Relacionado:** [ADR-005](../adr/ADR-005-estrategia-web.md), [`auditoria-sprint2.md`](../auditoria/auditoria-sprint2.md)

## 1. Qué se protege y quién ataca
- **Activos:** cuentas de usuario y su token JWT; datos de la flota (alertas de mantenimiento); asignaciones de turno (integridad: sin doble asignación y con trazabilidad).
- **Actores considerados:** persona sin cuenta que llega a internet; usuario autenticado con rol insuficiente; usuario que intenta romper la integridad de turnos; dueño de un token robado.
- **Fuera del alcance:** MQTT, Redis y telemetría (RF-03 aún no implementado); la infraestructura de despliegue (sin definir).

## 2. Endpoints y controles de partida
| Endpoint | Acceso | Controles existentes (verificados en el código) |
|---|---|---|
| `POST /auth/login` | público | `ThrottlerGuard` 5/min por IP; mensaje único «Credenciales inválidas»; bcrypt costo 12 con hash ficticio |
| `GET /maintenance/alerts` | admin, supervisor, mantenimiento | `JwtAuthGuard` + `RolesGuard` |
| `GET /shifts/availability` | admin, supervisor | ídem + `SlotQueryDto` (fecha ISO y turno enumerado) |
| `POST /shifts/assignments` | admin, supervisor | ídem + `AssignShiftDto`; índices únicos parciales; `23505` → 409 |
| `PATCH /shifts/assignments/{id}/cancel` | admin, supervisor | ídem + validación del `id` |

Validación global: `ValidationPipe` con `whitelist`, `forbidNonWhitelisted` y `transform`.

## 3. Tabla STRIDE
Estado: **Aplicada** = existe y fue verificada (código o ejecución); **Pendiente** = identificada y sin resolver.

| ID | STRIDE | Endpoint | Amenaza concreta | Mitigación y dónde se aplica | Estado |
|---|---|---|---|---|---|
| T-01 | Spoofing | `login` | Fuerza bruta de contraseñas | `@UseGuards(ThrottlerGuard) @Throttle(5/60 s)` en `auth.controller.ts`; el 6.º intento responde 429 (observado) | Aplicada (solo por IP; sin bloqueo por cuenta) |
| T-02 | Spoofing / Info. disclosure | `login` | Enumerar cuentas por mensaje o por tiempo de respuesta | Mensaje único y comparación contra `DUMMY_PASSWORD_HASH` en `auth.service.ts`; usuario inactivo también da 401 | Aplicada |
| T-03 | Spoofing | todos | JWT firmado con un secreto débil o por defecto | `assertStrongJwtSecret` en `backend/src/config/security.ts` (solo en producción) | Aplicada |
| T-04 | Elevation of privilege | `alerts`, `availability`, `assignments`, `cancel` | Rol insuficiente invoca operaciones restringidas | `@Roles(...)` + `RolesGuard`; responde 403 (verificado con los 5 roles) | Aplicada |
| T-05 | Elevation of privilege | todos | Endpoint nuevo sin `@Roles` queda abierto a **cualquier** usuario autenticado (el guard no deniega por defecto) | Revisión en el PR; falta una prueba o regla que lo detecte | **Pendiente** |
| T-06 | Elevation of privilege | todos | Token con rol viejo o de usuario desactivado sigue válido hasta expirar (8 h): el guard no consulta la base (H-17) | Ninguna aún; decidir en un ADR (expiración corta + refresh, o riesgo aceptado) | **Pendiente** |
| T-07 | Tampering | `assignments`, `availability` | Cuerpo o consulta manipulados (campos extra, fecha o turno inválidos, tipos erróneos) | `AssignShiftDto` y `SlotQueryDto` (regex, `IsISO8601`, enum) + `ValidationPipe` en `main.ts`; 400 (verificado) | Aplicada |
| T-08 | Tampering | todos | Inyección SQL | TypeORM con parámetros; el único `createQueryBuilder` (`users.repository.ts`) usa `:email` enlazado | Aplicada |
| T-09 | Tampering | `assignments` | Doble asignación de vehículo u operador en un mismo turno (carrera entre dos pedidos) | Índices únicos parciales `UQ_shift_assignments_vehicle_slot` y `..._operator_slot` (migración `CreateShifts`); `23505` → 409 en `shifts.service.ts` | Aplicada |
| T-10 | Repudiation | `assignments` | Un supervisor niega haber asignado | `assignedById` se guarda en `shift_assignments` | Aplicada |
| T-11 | Repudiation | `cancel` | No se sabe quién canceló (N-05) | Falta la columna `cancelledById` (migración nueva, ADR-003) | **Pendiente** |
| T-12 | Info. disclosure | todos | Detalles internos en errores o documentación de la API | Respuestas de error con la forma de `ErrorResponse` (400/401/403/404/409 observadas; el 500 no se provocó); Swagger deshabilitado en producción (`isApiDocsEnabled`); el contrato declara `ErrorResponse` sin datos internos | Aplicada |
| T-13 | Info. disclosure | todos | Robo del token por XSS (guardado en `sessionStorage`) | React escapa por defecto (ADR-004/005); sin `helmet` ni CSP (N-01) | **Pendiente** (parcial) |
| T-14 | Denial of service | todos | Cuerpos enormes | Límite por defecto de Express: un cuerpo de ~200 kB devolvió 413 (observado) | Aplicada |
| T-15 | Denial of service | `alerts`, `availability`, `assignments`, `cancel` | Inundación de pedidos autenticados (no hay límite global, N-06) | Ninguna aún; extender `ThrottlerGuard` de forma global | **Pendiente** |
| T-16 | Tampering (cadena de suministro) | todos | Dependencias vulnerables en producción (N-03) | `npm audit --omit=dev --audit-level=high` en la CI; Dependabot agrupado | Aplicada (CI no verificada por mí) |

## 4. Riesgos que quedan y prioridad
| Prioridad | Pendiente | Acción prevista |
|---|---|---|
| 1 | T-15 límite global | `ThrottlerGuard` global (ya es dependencia del proyecto) |
| 2 | T-06 sesión JWT | ADR de sesión (H-17) antes de desplegar |
| 3 | T-13 cabeceras | ADR + `helmet` (R-07) |
| 4 | T-11 quién cancela | migración con `cancelledById` |
| 5 | T-05 `@Roles` ausente | prueba que recorra los controladores y falle si falta |

## 5. Límites de este documento
Es un modelo ligero: parte de lo que el código hace hoy y de ejecuciones puntuales, no de una prueba de penetración. «Aplicada» significa que el control existe y se observó funcionar, no que sea infalible.
