# SPEC-000: MineTrack360 — Gestión y Monitoreo de Flotas para Logística Minera

**Versión:** v2 (2026-11-13) — ver Changelog en la sección 8.

## 1. Contexto y Propósito
Las empresas mineras y de logística extractiva de mediana escala en Cuyo gestionan
sus flotas (camiones, palas, perforadoras) con planillas, partes en papel y radio,
lo que genera mantenimiento reactivo, baja disponibilidad de equipos y falta de
indicadores objetivos. MineTrack360 es una plataforma web que integra telemetría
IoT (posición GPS, velocidad, temperatura de motor, horas de uso), gestión de
mantenimiento preventivo con umbrales configurables, asignación de turnos y un
tablero de indicadores.

## 2. Requerimientos Funcionales

- [ ] **RF-01:** Autenticación de usuarios (usuario/contraseña) con emisión de token JWT.
- [ ] **RF-02:** Roles (Administrador, Supervisor, Mantenimiento, HSE, Lectura) con permisos diferenciados por módulo.
- [ ] **RF-03:** Ingesta y almacenamiento de telemetría vía MQTT (posición, velocidad, temperatura, horas de uso).
- [ ] **RF-04:** Mapa interactivo con posición y estado actual de cada vehículo.
- [ ] **RF-05:** Alertas automáticas de mantenimiento preventivo por umbrales de horas de uso configurables por tipo de vehículo.
- [ ] **RF-06:** Registro de intervenciones de mantenimiento (tipo, fecha, costo, repuestos, responsable).
- [ ] **RF-07:** Asignación de vehículos y operadores a turnos, evitando duplicados.
- [ ] **RF-08:** Eventos de incidente por exceso de velocidad según límite por zona.
- [ ] **RF-09:** Tablero de indicadores agregados (disponibilidad, horas operativas, incidentes) con filtros por período.
- [ ] **RF-10:** Exportación de reportes de mantenimiento e incidentes en PDF/CSV.
- [ ] **RF-11:** Auditoría de operaciones críticas (usuario, acción, fecha).

## 3. Non-Goals (Límites del Alcance)
- **NG-01:** No se integrará hardware IoT real: los datos de sensores se simulan con un generador de eventos software.
- **NG-02:** No se implementarán modelos de machine learning para mantenimiento predictivo (heurística por umbrales; ML es trabajo futuro).
- **NG-03:** No se certificará cumplimiento normativo minero provincial.
- **NG-04:** Sin soporte multi-idioma ni multi-moneda (operación Argentina únicamente).
- **NG-05:** La extracción del módulo de Telemetría como microservicio independiente queda fuera de esta etapa (el diseño modular lo preserva, no lo ejecuta).

## 4. Stack Tecnológico y Restricciones
- Backend: Node.js 20 LTS + TypeScript + NestJS, API REST documentada con OpenAPI/Swagger (la CI y las pruebas requieren Node ≥ 24.9; ver R-05 en la sección 7).
- Frontend: React 18 + TypeScript + Vite, TailwindCSS, Zustand, Leaflet/OpenStreetMap, Recharts.
- Persistencia: PostgreSQL 16 + TimescaleDB (hypertable para TELEMETRY_READING), ORM TypeORM; Redis (cache + BullMQ).
- Mensajería: MQTT (Eclipse Mosquitto), tópicos `telemetry/+/data`.
- Restricción de toolchain local: el motor IA (opencode) corre como binario nativo sin Node.js; el entorno de desarrollo Node se ejecutará en contenedor Docker (ver ADR-001).
- Git Flow institucional: `feature/*` → `develop` → `main`, con PR y 1 aprobación.

## 5. Contratos de Datos / Tipos
```typescript
// Entidades principales derivadas del modelo ER de PP2 (3FN)
interface Vehiculo { id: number; patente: string; tipoId: number; estado: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'; }
interface TipoVehiculo { id: number; categoria: string; }            // VEHICLE_TYPE
interface UmbralMantenimiento { tipoVehiculoId: number; intervaloHoras: number; }  // MAINTENANCE_THRESHOLD
interface LecturaTelemetria {                                        // TELEMETRY_READING (hypertable)
  vehicleId: number; timestamp: Date;
  latitud: number; longitud: number; velocidadKmh: number;
  temperaturaMotorC: number; horasUso: number;
}
interface RegistroMantenimiento { id: number; vehiculoId: number; tipo: string; fecha: Date; costo: number; repuestos: string; responsableId: number; }
interface AsignacionTurno { id: number; vehiculoId: number; operadorId: number; estado: string; }  // SHIFT_ASSIGNMENT
```
## 6. Criterios de Aceptación
- [ ] **CA-01:** Un usuario válido obtiene JWT y accede solo a los módulos de su rol (RF-01/02).
- [ ] **CA-02:** Un mensaje MQTT publicado en telemetry/+/data se persiste y su posición aparece en el mapa (RF-03/04).
- [ ] **CA-03:** Superado el 90%/100% del umbral de horas, el sistema genera alerta WARNING/CRITICAL (RF-05).
- [ ] **CA-04:** La ingesta soporta ≥ 50 msg/s con p95 < 300 ms en consultas principales (RNF-01/02).
- [ ] **CA-05:** Cobertura de pruebas backend ≥ 70% en módulos críticos (RNF-07).
- [ ] **CA-06:** Todo el stack levanta con docker compose up en un entorno limpio (RNF-08).

## 7. Restricciones Arquitectónicas

> Restricciones vigentes que condicionan el diseño. Cada una remite a la decisión que la respalda.
> Diagramas: [`docs/arquitectura/C4-contexto.md`](docs/arquitectura/C4-contexto.md) y [`docs/arquitectura/C4-contenedores.md`](docs/arquitectura/C4-contenedores.md).

| ID | Restricción | Decisión | Estado |
|---|---|---|---|
| R-01 | Estilo **monolito modular**: un único servicio de aplicación (`api`) con módulos por dominio; un módulo solo consume el servicio exportado por otro | [ADR-002](docs/adr/ADR-002-estilo-arquitectonico.md) | Vigente |
| R-02 | El módulo de **Telemetría** (RF-03) se mantiene aislado para poder extraerlo; su extracción queda fuera de esta etapa | ADR-002 y NG-05 | Vigente (módulo aún no implementado) |
| R-03 | **PostgreSQL 16 + TimescaleDB** como único motor; todo cambio de esquema por migración TypeORM versionada, sin editar migraciones ya aplicadas | [ADR-003](docs/adr/ADR-003-persistencia.md) | Vigente (hypertable pendiente) |
| R-04 | Stack declarado: NestJS + TypeScript `strict` en el backend; React + Vite en el frontend; MQTT con Mosquitto; Redis para cache y colas | [ADR-001](docs/adr/ADR-001-stack-tecnologico.md) | Vigente (frontend, MQTT y Redis pendientes de implementar) |
| R-05 | La CI y las pruebas requieren **Node ≥ 24.9** (Jest 30 con `@nestjs/testing`); `ADR-001`, el README y el servicio `backend-dev` de `docker-compose.yml` todavía indican Node 20 | `.github/workflows/ci.yml` | Pendiente de alinear (requiere aprobación para tocar `docker-compose.yml`) |
| R-06 | El toolchain Node de desarrollo corre en contenedor Docker, no en el host | ADR-001 | Vigente |
| R-07 | No se introducen frameworks, bases de datos ni servicios externos sin un ADR aprobado | `.opencoderules` (v2) | Vigente |

## 8. Changelog

| Versión | Fecha | Cambios | Motivo |
|---|---|---|---|
| v1 | 2026-09-16 | Especificación inicial: RF-01 a RF-11, NG-01 a NG-05, contratos de datos y CA-01 a CA-06 | TP1 |
| v2 | 2026-11-13 | Agregada la sección 7 (Restricciones Arquitectónicas) que cita ADR-001, ADR-002 y ADR-003 | TP2: hacer visibles las restricciones |
| v2 | 2026-11-13 | Corregida la referencia de la sección 4: la toolchain Docker se justifica en ADR-001; ADR-002 pasa a ser el estilo arquitectónico | La referencia original apuntaba a un ADR con otro tema |
| v2 | 2026-11-13 | Sección 5: el estado de `Vehiculo` pasa a `ACTIVE`/`MAINTENANCE`/`OUT_OF_SERVICE` | Hallazgo H-16 de `auditoria-sprint1.md`: alinear el contrato con el código implementado |
| v2 | 2026-11-13 | Sección 4: nota sobre Node ≥ 24.9 para la CI y las pruebas | Las pruebas fallan en Node 22 y pasan en Node 24 (verificado en la línea base del PR #13) |
| v2 | 2026-11-13 | Revisión de Non-Goals: se mantienen NG-01 a NG-05 sin cambios. NG-01 coincide con el simulador del C4 y NG-05 con ADR-002 | TP2: revisar el alcance |
| v2 | 2026-11-13 | Sin cambios: los CA-04, CA-05 y CA-06 citan RNF-01/02/07/08, que se definirán en la sección de Requisitos No Funcionales de la SPEC v5 | Alcance del TP5 |
