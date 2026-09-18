# Auditoría Crítica de Código y Artefactos — MineTrack360

**Proyecto:** MineTrack360 — Sistema Integral de Gestión y Monitoreo de Flotas para Logística Minera
**Origen del artefacto auditado:** Informe de Práctica Profesionalizante II (PP2), Tecnicatura Superior en Desarrollo de Software
**Espacio curricular:** Práctica Profesionalizante III — Sprint 1 (PP3-2026-S1) · entrega `DEL-S1-03`
**Instrumento:** Rúbrica Determinista de Auditoría S1 (`docs/auditoria/RUBRICA_AUDITORIA_S1.md`)
**Estudiante:** Camila Scheurer
**Repositorio auditado:** IES9018/camilaScheurer-MineTrack360
**Fecha:** 2026-09-17 · **Rama de entrega:** `feature/auditoria-s1`
**Estado:** Propuesto — sujeto a revisión del docente (Capataz de Obra)

---

## 0. Alcance y método

Esta auditoría toma como material primario el **Informe de PP2 de MineTrack360** (documento Word, ~597 párrafos: secciones 2.8 requisitos, 3.x arquitectura, 4.x modelo de datos, 5.x implementación, 6.x pruebas y fragmentos de código, 7.x despliegue) y audita los artefactos técnicos que allí se declaran: fragmentos de código (`vehicle.entity.ts`, `vehicles.controller.ts`, `maintenance.service.ts`, `VehicleMarker.tsx`), configuración de infraestructura (`Dockerfile`, `docker-compose.yml`, `.env.example`), scripts de prueba (Jest, Supertest, Cypress, k6) y las métricas de calidad de la sección 8.3.

**Criterio de evidencia:** todo hallazgo cita la sección exacta del informe fuente. Cuando no puedo verificar algo contra el código real (porque el informe muestra fragmentos, no el repositorio completo), el hallazgo se marca explícitamente como **[SUPUESTO A VALIDAR]**. No se registra ningún hallazgo sin evidencia textual en el material del proyecto.

**Escala de severidad utilizada:**
| Nivel | Significado |
|---|---|
| **Crítica** | Compromete seguridad, integridad de datos o impide el funcionamiento; corregir antes de desplegar. |
| **Alta** | Defecto real de lógica o de contrato que produce comportamiento incorrecto o superficie de ataque. |
| **Media** | Deuda técnica o mala práctica con impacto acotado; corregir en el sprint siguiente. |
| **Baja** | Mejora de calidad, estilo o documentación. |

---

## 1. Resumen ejecutivo

Se auditó el proyecto **MineTrack360** (Node.js 20 + NestJS + PostgreSQL/TimescaleDB + React, ingesta IoT por MQTT). Se registraron **18 hallazgos**: **2 críticos/altos de seguridad**, **4 altos de lógica y consistencia de contrato**, **8 medios** y **4 bajos**, además de **3 deudas técnicas asumidas** y **4 fortalezas técnicas**.

Los hallazgos de mayor riesgo son:
1. **Credenciales de base de datos hardcodeadas y débiles** en `docker-compose.yml` (`minetrack/minetrack`), que contradicen el requisito RNF-04 y el criterio "Seguridad Base" (20% de la rúbrica del sprint).
2. **División sin guarda en `evaluateThresholdStatus`** (posible `Infinity` con `intervalHours = 0`), que puede disparar alertas falsas masivas (RF-05).
3. **Desalineación del contrato de "estado de vehículo"** entre backend (`ACTIVE/MAINTENANCE/OUT_OF_SERVICE`) y frontend (`MOVING/STOPPED/CRITICAL/OFFLINE`), que rompe el color del marcador en el mapa (RF-04).
4. **Métricas de calidad declaradas como simuladas** (§8.3), lo que debilita la trazabilidad verificable que exige la rúbrica.

Las correcciones se planificaron para el Sprint 2 (salvo las de seguridad, que deben aplicarse antes de cualquier despliegue); cada hallazgo incluye artefacto, evidencia, severidad, impacto, acción correctiva y trazabilidad.

---

## 2. Trazabilidad con la rúbrica de auditoría del Sprint 1

| Criterio de la rúbrica S1 | Peso | Cómo esta auditoría lo evidencia |
|---|---|---|
| **Auditoría Crítica de Código** | 35% | Secciones 3 a 8: 18 hallazgos con evidencia, severidad y corrección documentada. |
| **Git Flow & Trazabilidad** | 25% | Cada hallazgo cita artefacto y sección del informe; el propio documento entra por PR `feature/auditoria-s1` con `Closes #N`. |
| **CI/CD & Automatización** | 20% | Hallazgos H-09/H-10/H-14 proponen aserciones y evidencia automatizada (Jest coverage, k6, npm audit). |
| **Seguridad Base** | 20% | Hallazgos H-01 a H-04, H-11, H-12, H-13, H-17 (secrets, exposición de puertos, validación de entradas, Swagger). |

---

## 3. Tabla maestra de hallazgos

| ID | Artefacto auditado | Hallazgo (resumen) | Severidad | Acción correctiva (resumen) | Sprint |
|---|---|---|---|---|---|
| H-01 | `docker-compose.yml` (§7.1) | Credenciales de DB hardcodeadas y débiles (`minetrack/minetrack`) | **Alta** | Parametrizar con `${POSTGRES_USER}`/`${POSTGRES_PASSWORD}`; `.env` fuera del repo; password aleatoria ≥16 chars | S2 (antes de desplegar) |
| H-02 | `docker-compose.yml` (§7.1) | Puerto PostgreSQL 5432 publicado al host sin necesidad | Media | Eliminar el mapeo `ports: "5432:5432"`; usar la red interna | S2 |
| H-03 | `docker-compose.yml` (§7.1) | Clave `version: "3.9"` obsoleta en Compose V2 | Baja | Eliminar la clave `version` | S2 |
| H-04 | `maintenance.service.ts` (§6.4) | División por `intervalHours` sin guarda (∞/NaN) | **Alta** | Validar `intervalHours > 0` en dominio + DTO; test unitario del caso 0/negativo | S2 |
| H-05 | `maintenance.service.ts` (§6.4) | Clase sin `@Injectable()` **[SUPUESTO A VALIDAR]** | Media | Confirmar; decorar o aislar como función pura de dominio | S2 |
| H-06 | `vehicle.entity.ts` (§6.4) | `totalEngineHours` como `float` (deriva acumulativa) | Media | Cambiar a `numeric(10,1)`; operar con decimal en el dominio | S2 |
| H-07 | enum backend vs `VehicleMarker.tsx` (§6.4) | Dos vocabularios distintos de "estado de vehículo" | **Alta** | Unificar contrato (`VehicleStatusDto`); separar estado administrativo de estado de criticidad | S1/S2 |
| H-08 | `VehicleMarker.tsx` (§6.4) | Acceso al diccionario de color sin fallback → `background: undefined` | Media | `statusColor[vehicle.status] ?? '#9ca3af'` + índice tipado | S2 |
| H-09 | `perf/telemetry-load.js` k6 (§6.3.4) | Host de API hardcodeado (`https://api.minetrack360.com`) | Media | Parametrizar `__ENV.BASE_URL` | S2 |
| H-10 | `perf/telemetry-load.js` k6 (§6.3.4) | Aserción débil (solo valida status 201) | Baja | Validar estructura/campos del cuerpo de respuesta | S2 |
| H-11 | `vehicles.controller.ts` (§6.4) | `+id` convierte a número sin `ParseIntPipe` | Media | `@Param('id', ParseIntPipe)` + validación de existencia | S2 |
| H-12 | DTOs / bootstrap NestJS | Validación de entrada no evidenciada **[SUPUESTO A VALIDAR]** | **Alta** | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` + `class-validator` | S1/S2 |
| H-13 | Documentación de API (§8.2) | Swagger `/api/docs` expuesto sin restricción en producción | Media | Deshabilitar en prod o proteger por rol | S2 |
| H-14 | Métricas de calidad (§8.3) | Métricas presentadas pero declaradas simuladas | Media | Ejecutar y adjuntar salida real (coverage HTML, reporte k6, npm audit) | S2 |
| H-15 | Modelo de datos (§4.2) | `parts_used` como texto libre en vez de tabla N:M | Baja | Registrar como deuda técnica; promover `MAINTENANCE_PART` si se explota RF-10 | S2+ |
| H-16 | `SPEC.md` ↔ código (§6.4) | Vocabulario del enum de estado distinto entre SPEC y código | Media | Alinear el contrato de datos de la SPEC al código (o refactorizar y documentar en ADR) | S1 |
| H-17 | `.env.example` (Anexo C) | JWT sin estrategia de refresco/rotación documentada | Media | Documentar refresh token con rotación o expiración corta + re-login | S2 |
| H-18 | Gestión del proyecto (§6.2) | PP2 declaraba GitHub Flow; la cátedra exige Git Flow | Media | Ya aplicado (rama `develop`); documentar la migración (este informe) | S1 |

---

## 4. Hallazgos detallados

### 4.1 Seguridad

#### H-01 — Credenciales de base de datos hardcodeadas y débiles
- **Artefacto:** `docker-compose.yml` (informe §7.1).
- **Evidencia (verbatim del informe):** `DATABASE_URL=postgres://minetrack:minetrack@db:5432/minetrack360` y, en el servicio `db`, `POSTGRES_USER: minetrack`, `POSTGRES_PASSWORD: minetrack`. Nota: `JWT_SECRET=${JWT_SECRET}` **sí** está correctamente parametrizado.
- **Severidad:** Alta.
- **Impacto:** usuario y contraseña triviales en el manifiesto del stack; cualquier persona con acceso al repositorio o a la red de desarrollo obtiene acceso directo a la base de flota. Contradice RNF-04 (canales cifrados/seguridad) y el criterio "Seguridad Base" (20%).
- **Acción correctiva:** reemplazar por variables de entorno (`${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${DATABASE_URL}`) resueltas desde un `.env` **no versionado**; contraseña aleatoria de ≥16 caracteres; verificar que `.env` esté en `.gitignore`.
- **Responsable / Sprint:** Estudiante / Sprint 2 (bloqueante antes de cualquier despliegue).

#### H-02 — Puerto PostgreSQL publicado al host
- **Artefacto:** `docker-compose.yml` (§7.1). **Evidencia:** `db: ports: - "5432:5432"`.
- **Severidad:** Media. **Impacto:** aumenta la superficie de ataque; en producción el backend accede a `db:5432` por la red interna de Compose, por lo que publicar el puerto es innecesario.
- **Acción correctiva:** eliminar el bloque `ports` del servicio `db` (o usar `expose: ["5432"]`).

#### H-03 — Clave `version` obsoleta
- **Artefacto:** `docker-compose.yml` (§7.1). **Evidencia:** `version: "3.9"`.
- **Severidad:** Baja. **Impacto:** Compose V2 ignora la clave y emite advertencia; no rompe, pero es señal de configuración desactualizada (afecta RNF-08, portabilidad).
- **Acción correctiva:** eliminar la línea `version`.

#### H-11 — Coerción `+id` sin validación
- **Artefacto:** `vehicles.controller.ts` (§6.4). **Evidencia:** `getStatus(@Param('id') id: string) { return this.vehiclesService.getRealtimeStatus(+id); }`.
- **Severidad:** Media. **Impacto:** un `id` no numérico produce `NaN` propagado a la consulta, con errores poco claros y superficie para abuso.
- **Acción correctiva:** `@Param('id', ParseIntPipe)` y validación de existencia del vehículo.

#### H-12 — Validación de entrada no evidenciada **[SUPUESTO A VALIDAR]**
- **Artefacto:** DTOs (`CreateVehicleDto`) y bootstrap de NestJS. **Evidencia:** el informe referencia `CreateVehicleDto` (§6.4) pero no documenta `class-validator` ni un `ValidationPipe` global.
- **Severidad:** Alta (si se confirma la ausencia). **Impacto:** el checklist de PR de la cátedra exige "validar las entradas de datos contra vulnerabilidades de inyección"; sin validación en el borde, los DTOs aceptan payloads arbitrarios.
- **Acción correctiva:** registrar `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` y decorar los DTOs; cubrir con tests de entrada inválida.

#### H-13 — Swagger expuesto en producción
- **Artefacto:** documentación de la API (§8.2). **Evidencia:** "accesible en el endpoint `/api/docs` del backend desplegado".
- **Severidad:** Media. **Impacto:** revela la superficie completa de la API a usuarios no autenticados.
- **Acción correctiva:** deshabilitar Swagger cuando `NODE_ENV=production` o restringirlo por rol.

#### H-17 — JWT sin estrategia de refresco documentada
- **Artefacto:** `.env.example` (Anexo C). **Evidencia:** `JWT_EXPIRES_IN=8h`; no se menciona refresh token ni revocación.
- **Severidad:** Media. **Impacto:** ventana de 8 h sin mecanismo de revocación ante robo de token.
- **Acción correctiva:** documentar y decidir una estrategia (refresh token con rotación, o expiración corta + re-login) y registrarla en un ADR.

---

### 4.2 Calidad de código y lógica

#### H-04 — División por `intervalHours` sin guarda
- **Artefacto:** `maintenance.service.ts` (§6.4).
- **Evidencia (verbatim):** `const hoursSinceService = totalEngineHours - lastServiceHours; const ratio = hoursSinceService / intervalHours;` seguido de `if (ratio >= 1) return 'CRITICAL';`.
- **Severidad:** Alta.
- **Impacto:** si `intervalHours` es 0 (umbral mal configurado para un tipo de vehículo) el resultado es `Infinity` → **todos** los vehículos se reportan `CRITICAL`; valores negativos o `NaN` producen estados incoherentes. Afecta directamente RF-05 (el requisito de mayor prioridad funcional).
- **Acción correctiva:** validar `intervalHours > 0` (y finito) antes de dividir; lanzar error de dominio o devolver estado `UNKNOWN`; añadir test unitario que cubra 0, negativo y `NaN`.

#### H-05 — `MaintenanceService` sin decorador de inyección **[SUPUESTO A VALIDAR]**
- **Artefacto:** `maintenance.service.ts` (§6.4). **Evidencia:** `export class MaintenanceService { evaluateThresholdStatus(...) {...} }` — sin `@Injectable()` ni otros decoradores en el fragmento mostrado.
- **Severidad:** Media (a validar).
- **Impacto:** si se registra como provider de NestJS sin `@Injectable()`, el contenedor de DI puede fallar al resolverlo; si es una clase utilitaria pura, el diseño es correcto. El informe solo muestra un fragmento, por lo que **no puedo confirmar** el uso real.
- **Acción correctiva:** confirmar contra el código; si corresponde, decorar con `@Injectable()`; en cualquier caso, extraer la función pura a un módulo de dominio para testearla aislada.

#### H-06 — `totalEngineHours` como `float`
- **Artefacto:** `vehicle.entity.ts` (§6.4). **Evidencia:** `@Column('float', { default: 0 }) totalEngineHours: number;`.
- **Severidad:** Media. **Impacto:** el acumulado de horas en punto flotante sufre deriva; comparaciones contra umbrales pueden producir falsos `WARNING`/`CRITICAL` (RF-05).
- **Acción correctiva:** usar `numeric(10,1)` (TypeORM: `{ type: 'numeric', precision: 10, scale: 1 }`) y operar con decimal en el dominio.

#### H-08 — Fallback ausente en el diccionario de colores
- **Artefacto:** `VehicleMarker.tsx` (§6.4). **Evidencia:** `` html: `<div style="background:${statusColor[vehicle.status]}" ...` `` — acceso directo sin valor por defecto.
- **Severidad:** Media. **Impacto:** ante un estado no contemplado, el `style` queda `background:undefined` y el marcador se renderiza sin color (bug visual en el mapa).
- **Acción correctiva:** `statusColor[vehicle.status] ?? '#9ca3af'` y tipar el índice del diccionario.

#### H-16 — Vocabulario del enum de estado desalineado entre SPEC y código
- **Artefacto:** `SPEC.md` (borrador del Sprint 1) ↔ `vehicle.entity.ts` (§6.4).
- **Evidencia:** el contrato de datos del borrador de SPEC usó `'OPERATIVO' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO'`, mientras el código de PP2 usa `VehicleStatus { ACTIVE, MAINTENANCE, OUT_OF_SERVICE }`.
- **Severidad:** Media (trazabilidad SPEC↔código).
- **Impacto:** dos vocabularios para el mismo concepto; quien lea la SPEC y luego el código no encuentra correspondencia directa.
- **Acción correctiva:** alinear la SPEC al vocabulario real del código (o decidir el definitivo y refactorizar), y registrarlo en un ADR para dejar la decisión trazable.

---

### 4.3 Consistencia de contrato (frontend ↔ backend)

#### H-07 — Dos enums distintos para "estado de vehículo"
- **Artefacto:** `vehicle.entity.ts` vs `VehicleMarker.tsx` (§6.4).
- **Evidencia:** backend: `VehicleStatus { ACTIVE='ACTIVE', MAINTENANCE='MAINTENANCE', OUT_OF_SERVICE='OUT_OF_SERVICE' }`; frontend: `statusColor = { MOVING, STOPPED, CRITICAL, OFFLINE }`.
- **Severidad:** Alta.
- **Impacto:** `statusColor[vehicle.status]` no encuentra coincidencia para los valores del backend → color `undefined` y, peor, se están mezclando dos conceptos distintos: el **estado administrativo** del vehículo (`ACTIVE/MAINTENANCE/OUT_OF_SERVICE`) con el **estado de movimiento/criticidad** (`MOVING/STOPPED/CRITICAL/OFFLINE`). La prueba Cypress de §6.3.3 espera la clase `marker-critical`, lo que sugiere que el contrato visual depende de un valor que el backend no emite con ese nombre.
- **Acción correctiva:** definir un `VehicleStatusDto` único como fuente de verdad; modelar por separado `estadoAdministrativo` y `estadoTelemetria`; mapear explícitamente en el frontend y cubrir con test E2E la correspondencia de cada estado.

---

### 4.4 Pruebas y métricas

#### H-09 — Host de API hardcodeado en la prueba de carga
- **Artefacto:** `perf/telemetry-load.js` (k6, §6.3.4). **Evidencia:** `http.post('https://api.minetrack360.com/api/v1/telemetry', payload, {...})` — la URL no proviene de variable de entorno (el token **sí** usa `__ENV.DEVICE_TOKEN`, lo cual es correcto).
- **Severidad:** Media. **Impacto:** prueba no reproducible entre entornos; riesgo de apuntar accidentalmente a un host productivo; acopla el script a un dominio que puede no existir.
- **Acción correctiva:** parametrizar `__ENV.BASE_URL`; mantener el token por variable.

#### H-10 — Aserción débil en la prueba de rendimiento
- **Artefacto:** `perf/telemetry-load.js` (§6.3.4). **Evidencia:** `check(res, { 'status es 201': (r) => r.status === 201 });` — no valida el cuerpo de la respuesta.
- **Severidad:** Baja. **Impacto:** una respuesta `201` con cuerpo vacío o erróneo pasaría la prueba; la métrica de throughput podría medir un éxito ficticio.
- **Acción correctiva:** validar campos del JSON devuelto (el informe ya lo hace bien en la prueba de integración con Supertest, §6.3.2: `expect(response.body.message).toContain('speedKmh')`).

#### H-14 — Métricas de calidad declaradas como simuladas
- **Artefacto:** métricas de calidad (§8.3). **Evidencia (verbatim):** "Los valores de 'prototipo' corresponden a mediciones simuladas representativas del comportamiento esperado del sistema en el entorno de evaluación académica, documentadas con fines demostrativos…". Los valores incluyen cobertura Jest 76%, p95 214 ms, throughput 68 msg/s, 0 vulnerabilidades, complejidad ciclomática 6.2 y 0 errores de tipado.
- **Severidad:** Media (integridad de evidencia). **Impacto:** la rúbrica privilegia métricas **verificables**; presentarlas en una tabla de "valor obtenido" cuando son objetivos simulados debilita la trazabilidad y puede leerse como evidencia no reproducible.
- **Acción correctiva:** en Sprint 2, ejecutar realmente y adjuntar como artefactos en el repositorio: reporte HTML de `jest --coverage`, salida de `k6`, salida de `npm audit` y de `tsc --noEmit`; rotular la tabla como "objetivo" hasta contar con la medición real.

---

### 4.5 Infraestructura y modelo de datos

#### H-15 — `parts_used` como texto libre (deuda técnica asumida)
- **Artefacto:** modelo de datos (§4.2). **Evidencia:** "se documenta como campo de texto libre (`parts_used`) solo para el detalle descriptivo, mientras que, en una evolución del modelo, los repuestos individuales se modelarían en una tabla MAINTENANCE_PART asociada en relación muchos-a-muchos".
- **Severidad:** Baja (decisión consciente ya documentada). **Impacto:** impide reportes agregados por repuesto (afectaría RF-10 en su evolución) y complica el cálculo de costos por insumo.
- **Acción correctiva:** mantener como deuda técnica registrada; promover a tabla N:M cuando se implementen reportes por repuesto.

---

### 4.6 Gestión del proyecto y trazabilidad

#### H-18 — Cambio de GitHub Flow (PP2) a Git Flow (cátedra PP3)
- **Artefacto:** estrategia de control de versiones (§6.2 del informe PP2) ↔ `README.md` de `proyecto-pp3-2026`.
- **Evidencia:** el informe de PP2 declara "rama `main` representa siempre código desplegable" (GitHub Flow, sin `develop`), mientras la cátedra exige `feature/* → develop → main` con PR y 1 aprobación.
- **Severidad:** Media (gestión). **Impacto:** si no se documenta la migración, la auditoría observa una desviación entre lo declarado en PP2 y el flujo exigido en PP3.
- **Acción correctiva:** **ya aplicado** en la Fase 2 (rama `develop` creada y protegida); esta misma auditoría deja registrada la migración y su justificación.

---

## 5. Deuda técnica registrada (asumida conscientemente)

| # | Deuda | Origen en el informe | Decisión |
|---|---|---|---|
| DT-01 | `parts_used` como texto libre en lugar de tabla `MAINTENANCE_PART` (N:M) | §4.2 | Aceptada para el prototipo; promover al implementar reportes por repuesto. |
| DT-02 | Monolito modular en lugar de microservicios completos | §3.1 (YAGNI) | Aceptada; el diseño modular preserva la extracción futura del módulo Telemetría. |
| DT-03 | Métricas de calidad simuladas en lugar de medidas reales | §8.3 | Corregir en Sprint 2 con evidencia ejecutada y adjunta al repositorio. |

---

## 6. Riesgos residuales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Credenciales de DB filtradas antes de corregir H-01 | Media | Alto | Corregir H-01 **antes** de cualquier despliegue público. |
| Alertas falsas masivas por H-04 | Media | Alto | Guarda de validación + test unitario. |
| Bug visual/inconsistencia por H-07 en la demo | Alta | Medio | Mapeo explícito de estados + test E2E. |
| Evidencia de calidad no reproducible por H-14 en la defensa | Media | Medio | Ejecutar y adjuntar salidas reales antes de la presentación. |

---

## 7. Fortalezas verificadas (no todo es hallazgo)

- **Dockerfile multi-stage** (§7.1): separa build y runtime con `node:20-alpine` y `npm ci --omit=dev`; buena práctica de tamaño y superficie.
- **Seguridad de base ya presente** (§6.3.5): `helmet`, `@nestjs/throttler` en autenticación, `npm audit` + Dependabot, y consultas parametrizadas vía TypeORM (mitiga inyección SQL).
- **Pirámide de pruebas completa** (§6.3): unitarias (Jest), integración (Supertest), E2E (Cypress), rendimiento (k6) y seguridad.
- **Diseño de datos sólido** (§4.2): normalización justificada hasta 3FN y uso correcto de TimescaleDB para series temporales, con políticas de compresión/retención alineadas a RNF-09.

---

## 8. Cierre del Sprint 1 — Definition of Done

| Entregable / objetivo | Ruta | Estado |
|---|---|---|
| Repositorio individual en `IES9018`, público, sin fork | `<alumno>-minetrack360` | ✅ Cumplido (Fase 2) |
| Ramas `main` + `develop` creadas y protegidas | — | ✅ Cumplido |
| `SPEC.md` con RF, Non-Goals y contratos de datos | raíz | ✅ / ⚠️ alinear enum (H-16) |
| `docs/adr/ADR-001-stack-tecnologico.md` con ≥2 alternativas | `docs/adr/` | ✅ Cumplido |
| `.opencoderules` con reglas propias | raíz | ✅ Cumplido |
| Plantilla de PR (`DEL-S1-02`) | `.github/PULL_REQUEST_TEMPLATE.md` | ✅ Cumplido |
| Informe de auditoría crítica (`DEL-S1-03`) | `docs/auditoria/auditoria-sprint1.md` | ✅ Este documento |
| Proyecto vinculado al tablero Kanban | GitHub Projects | ✅ Cumplido |
| PR de entrega mergeado con 1 aprobación | `feature/auditoria-s1 → develop` | ⏳ Pendiente |

---

## 9. Conclusiones

MineTrack360 es un proyecto de **diseño sólido**: arquitectura modular justificada, modelo de datos normalizado, pirámide de pruebas completa y decisiones tecnológicas documentadas. La auditoría **no encontró defectos estructurales**, sino una serie de **problemas acotados y corregibles** concentrados en tres frentes: (a) **seguridad de credenciales y entradas** (H-01, H-02, H-11, H-12, H-13, H-17), (b) **robustez de la lógica de negocio y consistencia de contratos** (H-04, H-06, H-07, H-08, H-16) y (c) **verificabilidad de la evidencia de calidad** (H-09, H-10, H-14).

Ningún hallazgo invalida el proyecto; los de severidad Alta (H-01, H-04, H-07, H-12) deben resolverse **antes** del despliegue de demostración o del Sprint 2. El resto constituye deuda técnica planificada.

## 10. Recomendaciones para el Sprint 2

1. **Endurecimiento de seguridad primero:** resolver H-01, H-02, H-12 y H-13 y agregar un `.env.example` sin valores reales, dejando `.env` en `.gitignore`.
2. **Suites de prueba como contrato:** corregir H-09/H-10 y convertir la tabla de métricas (§8.3) en evidencia ejecutada y versionada.
3. **Un solo contrato de tipos:** implementar `VehicleStatusDto` (H-07/H-16) y documentar la decisión en un ADR, cerrando el lazo SPEC↔ADR↔código.
4. **Robustez numérica:** cambiar `totalEngineHours` a `numeric` (H-06) y añadir pruebas de borde de umbrales (H-04).
5. **Observabilidad:** incorporar los logs estructurados (RNF-10) y el stack de monitoreo ya recomendado en §7.3.

---

## Anexo — Índice de evidencia citada (informe de PP2)

| Sección del informe | Contenido usado como evidencia |
|---|---|
| §2.8.1 / §2.8.2 | RF-01…RF-11 y RNF-01…RNF-10 |
| §3.1 / §3.3 | Patrones arquitectónicos y tabla de decisiones tecnológicas |
| §4.2 | Normalización y simplificación de `parts_used` |
| §6.2 / §6.3 / §6.4 | Git Flow declarado, estrategias de prueba y fragmentos de código |
| §7.1 / §7.2 / §7.3 | Dockerfile, docker-compose, plataformas y mantenimiento |
| §8.2 / §8.3 | Documentación de API (Swagger) y métricas de calidad |
| Anexo C | `.env.example` y variables de entorno |
