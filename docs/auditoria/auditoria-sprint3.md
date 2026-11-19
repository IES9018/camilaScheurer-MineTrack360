# Auditoría crítica — Sprint 3

**Proyecto:** MineTrack360 · **Estudiante:** Camila Scheurer · **Fecha:** 2026-11-17 · **Entregable:** DEL-S3-05
**Base auditada:** rama `develop` en el commit `9b4303b` (PR #58, #60, #62, #64 y #66 integrados).
**Documentos anteriores:** [`auditoria-sprint1.md`](auditoria-sprint1.md) (H-01 a H-18) y [`auditoria-sprint2.md`](auditoria-sprint2.md) (N-01 a N-10).
**Qué pide el checklist del Sprint 3:** «incidentes IA + correcciones + estado de seguridad». Esas son las secciones 4, 5 y 7.

> Cada afirmación de estado se contrastó con el código del repositorio o con la salida de un comando ejecutado el 2026-11-17. Lo que no se pudo comprobar figura como **no verificado**. La rúbrica determinista del Sprint 3 no estaba disponible al redactar esto; el documento sigue la estructura de las auditorías anteriores.

## 1. Resumen ejecutivo

| Indicador | Valor |
|---|---|
| Entregables formales del sprint (DEL-S3-01 a 05) | 3 completos, 1 con una parte pendiente, 1 completo con una verificación pendiente (sección 3) |
| Ítems del checklist del sprint sin cumplir | 2: presupuestos de P1 y P2 **sin medir** y pantallas **sin adaptar** a móvil (N-15, N-16) |
| Hallazgos de auditorías anteriores resueltos en este sprint | 4 (H-17 parcialmente, N-05, N-06, N-07) y 1 resuelto como decisión (N-08) |
| Hallazgos de auditorías anteriores que siguen abiertos | H-06, N-01, N-04, N-09 |
| Hallazgos nuevos | 8 (N-11 a N-18), todos de severidad baja o media |
| Amenazas del modelo STRIDE (16) | 14 aplicadas, 1 mitigada parcialmente (T-06), 1 pendiente (T-13) |
| Dependencias de producción con vulnerabilidades | Backend: **1 advertencia alta sin parche publicado** (`picomatch`, GHSA-fc5q-39xc-vjpf), riesgo aceptado hasta 2026-12-15 (corrección del 2026-11-17, ver I-08). Frontend: 0 (`npm audit --omit=dev`) |
| Pruebas | Backend **152 de 152** y frontend **102 de 102** en verde; cobertura backend 69,3 % de sentencias |
| Hallazgo más importante | **N-15 y N-16:** el sprint pide presupuestos *medidos* y pantallas *adaptadas* a móvil; hoy solo hay presupuestos definidos, medición de `/login` y del peso del JavaScript, y wireframes móviles |

Conclusión: la parte de **seguridad** del sprint está cumplida y verificada (amenazas con mitigación en el código, contrato válido, sesión acotada, auditoría de dependencias en CI). La parte de **evidencia medible móvil** está incompleta y se declara así. No hay bloqueantes de seguridad para la demostración local; sí los hay para un despliegue real (cabeceras, `trust proxy`, autenticación del broker).

## 2. Alcance y método

| Qué se hizo | Cómo |
|---|---|
| Estado de cada hallazgo anterior | Búsqueda en `backend/src` (`helmet`, `enableCors`, `trust proxy`, tipos `float`, `cancelledById`), lectura de `app.module.ts`, `auth.module.ts`, `auth.controller.ts`, `jest.config.ts`, `docker-compose.yml`, `mosquitto.conf`, `.github/workflows/ci.yml`, `.github/dependabot.yml` |
| Pruebas y calidad | `npm run test:cov` del backend con Node 24, `tsc --noEmit`, ESLint del backend, y `vitest run` del frontend |
| Dependencias | `npm audit --omit=dev` y `npm audit` en `backend/` y `frontend/` |
| Contrato | `npx --yes @redocly/cli@2.77.0 lint docs/arquitectura/api-contracts.yaml` (herramienta ejecutada con `npx`, no es dependencia del proyecto, R-07) |
| Incidentes | Historial de Git (`git log`), contenido de los PR #53 a #66 y lo reportado por la estudiante al probar la demo |

**No verificado:** los resultados de los workflows de CI en GitHub, la protección de ramas, y los comportamientos que dependen de Docker (no hubo daemon de Docker en el entorno de la auditoría). La estudiante levantó la demo con Docker y reportó que funcionaba tras aplicar la migración (N-12); eso es su observación, no una prueba mía.

## 3. Estado de los entregables del sprint

| ID | Entregable | Estado | Evidencia |
|---|---|---|---|
| DEL-S3-01 | API según contrato OpenAPI, linter limpio | **Completo para los 5 endpoints críticos** | `api-contracts.yaml` declara los 5 endpoints críticos y el linter responde «valid». Hay 13 endpoints bajo `/api/v1`; los otros 8 no están en el contrato (N-14, SPEC R-09) |
| DEL-S3-02 | Threat model con mitigaciones aplicadas | **Completo** | `docs/seguridad/threat-model-lite.md`: 16 amenazas; la consigna pedía al menos 5 y las mitigaciones aplicadas están en el código (sección 7) |
| DEL-S3-03 | Presupuestos de rendimiento **medidos** | **Parcial** | Definidos en `presupuestos-rendimiento.md`. Medido: JavaScript inicial (63,9 de 200 KB) y LCP/TBT/CLS de `/login`. **No medido:** LCP e INP de P1 y P2 (N-15) |
| DEL-S3-04 | Despliegue funcional accesible | **Completo, con una verificación pendiente** | `docs/deploy/deploy.md` documenta un artefacto reproducible paso a paso (demo local) y el Non-Goal NG-07. Verificado con PostgreSQL y backend; la corrida con Docker la hizo la estudiante (sección 2) |
| DEL-S3-05 | Informe de auditoría crítica | **Completo** | Este documento |

**Checklist del sprint, ítems de las fases 3 y 5 sin cumplir:**
- «Pantallas críticas adaptadas a breakpoint móvil (targets táctiles ≥ 48 px)»: **no cumplido**. Solo existen los wireframes (`p1-movil.md`, `p2-movil.md`) y ADR-007; el código no se adaptó (N-16).
- «Presupuestos **medidos** con evidencia registrada»: **parcial** (N-15).

## 4. Incidentes con IA y correcciones

Un «incidente» es un error, riesgo o desvío introducido o no detectado en trabajo asistido por IA, que se encontró y se corrigió. Solo figuran los que tienen evidencia en el repositorio o en lo observado al probar. Los incidentes del Sprint 2 están en [`auditoria-sprint2.md`](auditoria-sprint2.md) y no se repiten.

| ID | Qué pasó | Cómo se detectó | Corrección | Evidencia | Regla o aprendizaje |
|---|---|---|---|---|---|
| I-01 | **Configuración inicial de Dependabot demasiado ruidosa** (generada con asistencia de IA): abrió muchos PR sueltos, y se mergearon por error actualizaciones de versión mayor (`@types/node` 24 → 26 en backend y frontend, `#40` y `#43`; el proyecto fija Node 24 y `@types/node` debe seguir en 24). También se revirtió `#42` (`@nestjs/jwt` 12.0.3 → 12.0.4); el motivo no quedó registrado en el repositorio | Revisión posterior a los merges (las reversiones son del mismo día) | Tres reversiones (`#49`, `#50`, `#51`) y una nueva configuración **agrupada**, con las versiones mayores ignoradas (`#53`) | Commits `ccd32b6`, `64edd23`, `345e60f`, `c6d26bc` | Una automatización de dependencias se configura agrupada y sin versiones mayores; ninguna actualización de versión mayor se mergea sin PR propio y pruebas |
| I-02 | **`deploy.md` omitía un paso que la demo necesita:** volver a aplicar las migraciones al actualizar el código. Con una base sin la migración `AddShiftCancelledBy`, la pantalla de Turnos falló con `column ShiftAssignment.cancelled_by_id does not exist` | La estudiante lo vio al probar la demo y compartió el error | Se documentó el comando en el commit `9b4303b` | Commit `9b4303b`; captura del error compartida en la sesión (no versionada) | Una guía «desde cero» también tiene que cubrir la **actualización**; la prueba de la guía debe hacerse sobre una base ya existente, no solo sobre una vacía |
| I-03 | **Script de datos con fecha ambigua:** `cargar-datos-demo.mjs` creaba la asignación de ejemplo para «hoy» según la zona horaria de la máquina. En un contenedor (UTC), de noche en Argentina, es el día siguiente y P2 no mostraba «ya asignado» | Prueba propia antes de entregar: la disponibilidad consultada con la fecha local no coincidía con la del script | Variable `DEMO_DATE` y mensaje con la fecha usada | `docs/deploy/cargar-datos-demo.mjs` (PR #66) | Las fechas «de hoy» en datos de demo son un riesgo; se imprime la fecha elegida y se permite fijarla |
| I-04 | **Orden de los tipos de vehículo no garantizado:** una primera versión del SQL insertaba ambos tipos en una sola sentencia y la pala quedó con id 1 y el camión con id 2, al revés de lo que asumía el script | Prueba propia: el listado de la base | Dos `INSERT` separados y en orden, repetibles | `docs/deploy/demo-tipos-vehiculo.sql` (PR #66) | Un script que depende de ids generados debe fijar el orden de inserción y decirlo |
| I-05 | **Artefacto de origen desconocido:** apareció un script de datos (`seed-demo.sh`) sin versionar en la copia de trabajo, que no habían escrito ni la estudiante (probablemente de otra sesión) ni la sesión actual | Estado de Git: archivo sin seguimiento | No se ejecutó ni se subió; se escribió uno propio y verificado (I-03, I-04) | No está en el repositorio | Un archivo cuyo origen no se puede explicar no entra al historial ni se ejecuta contra la API |
| I-06 | **SPEC con referencias sin definición y desactualizada:** los criterios CA-04, CA-05 y CA-06 citaban RNF que la SPEC no definía, y ADR-006 (sesión) se mergeó sin reflejarse en la SPEC | Revisión cruzada al hacer TP5 | SPEC v5: sección de RNF (RNF-01 a RNF-14) y reglas R-11 y R-12 | PR #64 | Cada ADR nuevo se refleja en la SPEC en el mismo PR; las referencias cruzadas se verifican |
| I-07 | **Numeración de ADR desviada de la consigna:** la consigna nombra `ADR-006-estrategia-mobile`, pero el número 006 ya estaba ocupado por la sesión | Revisión de la consigna antes de escribir | La estrategia móvil quedó como ADR-007 y la desviación se declaró en el ADR y en el PR | `docs/adr/ADR-007-estrategia-mobile.md` (PR #64) | Se decide y se **declara** la desviación en vez de renumerar un ADR ya aprobado |
| I-08 | **Esta auditoría afirmó «0 vulnerabilidades de producción» y el CI la contradijo:** el paso `npm audit` del job Backend falló por 4 entradas altas, correspondientes a una sola advertencia sin parche (`picomatch`). No se puede determinar si la advertencia se publicó después de la medición o si la lectura fue incorrecta; la afirmación quedó desactualizada en ambos casos | El CI en rojo y una nueva ejecución de `npm audit --omit=dev` en el backend | `scripts/audit-gate.mjs` con excepción documentada y fecha de revisión; corrección de esta auditoría | Commits `9bdfe2a`, `f976196`, `c6de253`; PR #70 y #71 | Todo número de seguridad se escribe con el comando que lo produjo y se vuelve a ejecutar antes de cerrar; una cifra «0» sin fecha no es evidencia |

**Observación sobre el método:** I-03, I-04 y I-05 se encontraron **antes de entregar** porque el trabajo se probó contra una base de datos y una API reales. I-02 llegó hasta la estudiante porque la guía solo se había probado sobre una base vacía y sin Docker. La lección es la misma: lo que no se ejecutó no está verificado.

## 5. Estado de los hallazgos anteriores

### Del Sprint 1

| ID | Estado | Evidencia |
|---|---|---|
| H-06 | **Abierto** | `vehicle.entity.ts` (dos columnas) y `maintenance-threshold.entity.ts` siguen con `@Column('float')`. El dominio redondea a 1 decimal; falta migrar a `numeric(10,1)` con una migración nueva (ADR-003) |
| H-07, H-08 | **Sin objeto todavía** | No existe el mapa (RF-04): no hay archivos `*Marker*` ni `*Map*` en `frontend/src` |
| H-09, H-10 | **Sin objeto todavía** | No existe `perf/`; la prueba de carga no se escribió |
| H-14 | **Parcial** | Mediciones reales hoy: 152 pruebas en backend y 102 en frontend; cobertura del backend 69,31 % de sentencias, 72,56 % de ramas, 52,84 % de funciones y 68,15 % de líneas. Siguen faltando p95, throughput y complejidad ciclomática |
| H-15 | **Sin objeto todavía** | `parts_used` no existe en el código (RF-06 y RF-10 no están implementados) |
| H-17 | **Mitigado parcialmente** (ADR-006) | `JWT_EXPIRES_IN` por defecto en `1h` (`auth.module.ts`, `.env.example`), aviso previo y re-login en el frontend. **Sigue sin revocación**: un token con rol viejo vale hasta 1 h (T-06) |

### Del Sprint 2

| ID | Estado | Evidencia |
|---|---|---|
| N-01 | **Abierto** | La búsqueda de `helmet` en `backend/src` y `package.json` no devuelve nada. Requiere ADR por R-07 (T-13) |
| N-04 | **Abierto (mitigado en desarrollo)** | Los puertos siguen publicados solo en `127.0.0.1` (`docker-compose.yml`); `mosquitto.conf` mantiene `allow_anonymous true`. Se resuelve con RF-03 |
| N-05 | **Resuelto** (PR #60) | `shifts.service.ts` guarda `cancelledById` al cancelar; migración `AddShiftCancelledBy`. Las canceladas antes del cambio quedan con valor nulo |
| N-06 | **Resuelto** (PR #60) | `ThrottlerGuard` como `APP_GUARD` en `app.module.ts` (100 pedidos por minuto por IP); el login conserva `@Throttle` de 5 por minuto y ya no repite el guard (`auth.controller.ts`) |
| N-07 | **Resuelto** (PR #60) | Existen `auth.service.spec.ts`, `auth.controller.spec.ts` y `authorization-coverage.spec.ts`; `jest.config.ts` fija un `coverageThreshold` global (65 / 65 / 50 / 65). Cobertura por módulo hoy: `auth` 72,2 %, `maintenance` 84,3 %, `shifts` 86,4 %, `vehicles` 71,4 % (sentencias) |
| N-08 | **Resuelto como decisión** (PR #66) | `deploy.md`, sección 8: mismo origen con proxy inverso, sin CORS. **Sin implementar**: no hay proxy |
| N-09 | **Abierto (solo desarrollo)** | `npm audit` completo: backend 32 (2 bajas, 28 moderadas, 2 altas, 0 críticas), frontend 7 moderadas. En producción: frontend 0; backend **1 advertencia alta sin parche (`picomatch`)**, aceptada hasta 2026-12-15 en [`dependencias-riesgo-aceptado.md`](dependencias-riesgo-aceptado.md) *(corregido el 2026-11-17: la versión original decía 0 en ambos; ver I-08)*. Antes había una crítica en el backend; ya no aparece |
| N-02, N-03, N-10 | **Siguen resueltos** | `.github/dependabot.yml` existe; `ci.yml` audita las dependencias de producción en los dos jobs (frontend con `npm audit --omit=dev --audit-level=high`; backend con `node scripts/audit-gate.mjs`, que agrupa por advertencia y admite la excepción documentada de `picomatch`); `.env.example` usa marcadores `CAMBIAR_...` |

## 6. Hallazgos nuevos del Sprint 3

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| N-11 | **La interfaz de Turnos culpa a la conexión ante cualquier error que no sea 403.** `ShiftsPage.tsx` (rama `failure === 'network'`, líneas 71 y 255) muestra «Revisá la conexión» incluso cuando el servidor responde 500 (como en el incidente I-02). `FleetAlertsPage.tsx` (línea 148) muestra un texto parecido para las alertas. El mensaje enmascara errores del servidor y dificulta el diagnóstico | Baja | **Abierto** |
| N-12 | **Las migraciones pendientes no se detectan al arrancar.** El backend inicia con la base desactualizada y falla recién en la primera consulta afectada (I-02) | Baja | **Mitigado** con documentación (`deploy.md`); sin control automático |
| N-13 | **`trust proxy` sin configurar.** `main.ts` no lo define; detrás de un proxy inverso, el límite global de 100 pedidos por minuto vería la IP del proxy y todos los usuarios compartirían el cupo | Media (solo con proxy) | **Abierto**; no afecta la demo local. Decidido en `deploy.md`, sección 8 |
| N-14 | **El contrato cubre 5 de 13 endpoints.** Sin contrato: `GET /auth/me`, `GET` y `POST /vehicles`, `GET /vehicles/{id}`, `POST /maintenance/threshold-evaluation`, `PUT /maintenance/thresholds/{vehicleTypeId}`, `GET` y `POST /operators` | Baja | **Abierto** (SPEC R-09) |
| N-15 | **Presupuestos de P1 y P2 sin medir.** El sprint exige medidas con evidencia; no hay LCP, INP ni TBT de las pantallas críticas, solo de `/login` y del peso del JavaScript | **Media** | **Resuelto parcialmente el 2026-11-18:** LCP y TBT de P1 y P2 medidos en laboratorio emulado (P1 1,11 s, P2 1,09 s; no es Lighthouse ni un dispositivo real). INP queda como indicio, sin medición de campo. Ver `presupuestos-rendimiento.md` §2.1 |
| N-16 | **Pantallas críticas sin adaptar a móvil.** Los botones miden unas 34 px según las clases de Tailwind (estimado, no medido), contra los 48 px pedidos; P1 usa una tabla con scroll horizontal. RNF-14 figura como «Diseñado, no implementado» | **Media** | **Resuelto el 2026-11-19:** P1 y P2 adaptadas; a 360 px no hay scroll horizontal y todos los controles miden ≥ 48 px (`docs/arquitectura/medir-movil.cjs`, laboratorio; no se probó en un dispositivo real). Desviaciones y límites en `p1-movil.md` y `p2-movil.md` |
| N-17 | **El pipeline no ejecuta el lint del contrato ni el presupuesto de peso.** `ci.yml` no tiene `redocly lint` ni `npm run check:bundle`; además faltan el badge del README y los comentarios de justificación de las actions (TP6) | Baja | **Abierto** (se resuelve con TP6) |
| N-18 | **La SPEC v5 quedó desactualizada en un punto.** RNF-07 figura como «No cumplido… no se midió por módulo crítico», pero hoy se midió: los cuatro módulos de la aplicación superan el 70 % de sentencias (sección 5, N-07); el global es 69,3 % | Baja | **Abierto** (se corrige en la SPEC final) |

### Lo que se buscó y no se encontró
- Secretos en el repositorio: el arranque en producción rechaza un `JWT_SECRET` débil o de ejemplo (`src/config/security.ts`); las claves de la demo las elige quien la ejecuta.
- Un segundo `ThrottlerGuard` en el login que duplique el conteo (verificado: solo `@Throttle` en el login y el guard global).
- Endpoints sin control de rol: `authorization-coverage.spec.ts` falla si aparece un controlador nuevo sin revisar y lista sus únicas excepciones (`getHello`, `login`, `me`).

## 7. Estado de seguridad

| Estado | Amenazas | Detalle |
|---|---|---|
| **Aplicada** (14) | T-01 a T-05, T-07 a T-12, T-14, T-15, T-16 | El control existe y se observó funcionando. T-01 es solo por IP (sin bloqueo por cuenta). T-16 depende de la CI de GitHub, que no se verificó desde aquí |
| **Mitigada parcialmente** (1) | T-06 (token sin revocación) | Vencimiento de 1 h y aviso previo (ADR-006); sigue habiendo una ventana de hasta 1 h con rol viejo |
| **Pendiente** (1) | T-13 (robo del token por XSS, sin cabeceras ni CSP) | Requiere `helmet` y un ADR (R-07); el token vive en `sessionStorage` (ADR-004) |

**Riesgos abiertos, por prioridad:**

| Prioridad | Riesgo | Cuándo atenderlo |
|---|---|---|
| 1 | T-13 / N-01: cabeceras de seguridad y CSP | Antes de cualquier despliegue real |
| 2 | T-06 residual: revocación de tokens (refresh token o consulta al estado del usuario) | Antes de cualquier despliegue real |
| 3 | N-13: `trust proxy` | Al introducir un proxy |
| 4 | N-04: broker MQTT y Redis sin autenticación | Con RF-03 |

La demostración local no queda bloqueada por ninguno: los puertos escuchan solo en `127.0.0.1` y no se expone a la red (`deploy.md`, sección 9).

## 8. Plan para lo que queda

| Prioridad | Pendiente | Qué hacer | Cuándo |
|---|---|---|---|
| 1 | N-15: medir P1 y P2 | Flujo con sesión (Playwright) sobre el frontend y datos de demo: LCP y TBT con Lighthouse, INP con DevTools; registrar la salida en `presupuestos-rendimiento.md` | Antes de la defensa |
| 2 | N-16: adaptar P1 y P2 a móvil | Implementar los wireframes móviles (tarjetas, objetivos de 48 px) y verificarlo con Playwright a 360 px | Antes de la defensa, si el tiempo alcanza; si no, declarar RNF-14 como deuda en el informe final |
| 3 | N-17: TP6 | Lint del contrato, `check:bundle`, badge y comentarios en `ci.yml`; `CHANGELOG`; tag `v0.1.0` | Cierre del 17/11 |
| 4 | N-18: SPEC final | Actualizar RNF-07 y consolidar la trazabilidad | Cierre del 17/11 |
| 5 | N-11: mensajes de error | Distinguir 5xx de fallas de red en P1 y P2 | Después de la defensa |
| 6 | N-14: contrato de los 8 endpoints restantes | Declararlos en `api-contracts.yaml` antes de tocarlos | Después de la defensa |
| 7 | T-13, T-06, N-13, N-04, H-06 | Un ADR y un PR por tema (ver sección 7) | Antes de un despliegue real |
| 8 | Protección de ramas | Confirmar en GitHub PR obligatorio y los checks `Backend` y `Frontend` como requeridos | Ahora (manual) |

## 9. Riesgos residuales

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Presentar presupuestos o pantallas móviles como cumplidos sin estarlo (N-15, N-16) | Media | Alto | Estado explícito en SPEC y en este informe; medir o declarar la deuda |
| Un token robado utilizable hasta 1 h (T-06) | Media | Alto | Vencimiento corto hoy; revocación antes de desplegar |
| Despliegue real sin cabeceras, `trust proxy` ni autenticación del broker | Baja | Alto | NG-07: no hay despliegue real; la lista de requisitos previos está en `deploy.md` |
| Base de datos desactualizada tras actualizar el código (I-02, N-12) | Media | Bajo | Paso documentado; considerar un chequeo de migraciones pendientes al arrancar |
| Nueva vulnerabilidad en dependencias | Alta (continuo) | Medio | `npm audit` en CI y Dependabot agrupado |

## 10. Fortalezas verificadas
- **Seguridad aplicada con evidencia ejecutable:** 14 de 16 amenazas con control observado y una prueba que falla si un endpoint nuevo queda sin control de rol.
- **Contrato válido y sin documentar respuestas inexistentes** para los 5 endpoints críticos, con el linter limpio.
- **Cadena de calidad en CI:** typecheck, lint, formato, pruebas con umbral de cobertura, build y auditoría de dependencias de producción.
- **Honestidad en el estado:** los requisitos no medidos figuran como «No verificado» (SPEC v5) y las desviaciones (ADR-007, NG-06, NG-07) están declaradas con sus motivos.
- **Decisiones trazables:** siete ADR, SPEC con historial y una auditoría por sprint.

## 11. Cierre del Sprint 3 — Definition of Done

| Entregable | Ruta | Estado |
|---|---|---|
| API según contrato (5 endpoints críticos, linter limpio) | `docs/arquitectura/api-contracts.yaml` | ✅ |
| Threat model con mitigaciones aplicadas | `docs/seguridad/threat-model-lite.md` | ✅ |
| Presupuestos de rendimiento definidos | `docs/arquitectura/presupuestos-rendimiento.md` | ✅ |
| Presupuestos de P1 y P2 medidos | `docs/arquitectura/presupuestos-rendimiento.md` | ⏳ N-15 |
| Pantallas críticas adaptadas a móvil | `frontend/` | ⏳ N-16 |
| Guía de despliegue | `docs/deploy/deploy.md` | ✅ |
| Auditoría del Sprint 3 | `docs/auditoria/auditoria-sprint3.md` | ✅ Este documento |
| Pipeline de CI, `CHANGELOG`, tag `v0.1.0`, informe final | — | ⏳ Cierre (TP6) |
