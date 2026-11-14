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
- [ ] **RF-12:** Accesibilidad básica de la interfaz: las pantallas críticas (estado de flota y alertas de mantenimiento; asignación de turno) se pueden operar solo con teclado y cumplen contraste WCAG AA (4,5:1 en texto, 3:1 en componentes).

## 3. Non-Goals (Límites del Alcance)
- **NG-01:** No se integrará hardware IoT real: los datos de sensores se simulan con un generador de eventos software.
- **NG-02:** No se implementarán modelos de machine learning para mantenimiento predictivo (heurística por umbrales; ML es trabajo futuro).
- **NG-03:** No se certificará cumplimiento normativo minero provincial.
- **NG-04:** Sin soporte multi-idioma ni multi-moneda (operación Argentina únicamente).
- **NG-05:** La extracción del módulo de Telemetría como microservicio independiente queda fuera de esta etapa (el diseño modular lo preserva, no lo ejecuta).

## 4. Stack Tecnológico y Restricciones
- Backend: Node.js 24 LTS + TypeScript + NestJS, API REST documentada con OpenAPI/Swagger (la CI y las pruebas requieren Node ≥ 24.9; ver R-05 en la sección 7).
- Frontend: React 18 + TypeScript + Vite, TailwindCSS, Zustand, Leaflet/OpenStreetMap, Recharts.
- Persistencia: PostgreSQL 16 + TimescaleDB (hypertable para TELEMETRY_READING), ORM TypeORM; Redis (cache + BullMQ).
- Mensajería: MQTT (Eclipse Mosquitto), tópicos `telemetry/+/data`.
- Restricción de toolchain local: el motor IA (opencode) corre como binario nativo sin Node.js; el entorno de desarrollo Node se ejecutará en contenedor Docker (ver ADR-001).
- Git Flow institucional: `feature/*` → `develop` → `main`, con PR y 1 aprobación.

## 5. Contratos de Datos / Tipos
```typescript
// Entidades principales derivadas del modelo ER de PP2 (3FN)
interface Vehiculo { id: number; patente: string; tipoId: number; estado: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'; horasUltimoServicio: number; }
interface TipoVehiculo { id: number; categoria: string; }            // VEHICLE_TYPE
interface UmbralMantenimiento { tipoVehiculoId: number; intervaloHoras: number; }  // MAINTENANCE_THRESHOLD
interface LecturaTelemetria {                                        // TELEMETRY_READING (hypertable)
  vehicleId: number; timestamp: Date;
  latitud: number; longitud: number; velocidadKmh: number;
  temperaturaMotorC: number; horasUso: number;
}
interface RegistroMantenimiento { id: number; vehiculoId: number; tipo: string; fecha: Date; costo: number; repuestos: string; responsableId: number; }
interface Operador { id: number; nombreCompleto: string; legajo: string; activo: boolean; }  // OPERATOR (chofer; no inicia sesión)
interface AsignacionTurno { id: number; vehiculoId: number; operadorId: number; fecha: string; turno: 'MORNING' | 'AFTERNOON' | 'NIGHT'; estado: 'ASSIGNED' | 'CANCELLED'; }  // SHIFT_ASSIGNMENT
```
## 6. Criterios de Aceptación
- [ ] **CA-01:** Un usuario válido obtiene JWT y accede solo a los módulos de su rol (RF-01/02).
- [ ] **CA-02:** Un mensaje MQTT publicado en telemetry/+/data se persiste y su posición aparece en el mapa (RF-03/04).
- [ ] **CA-03:** Superado el 90%/100% del umbral de horas, el sistema genera alerta WARNING/CRITICAL (RF-05).
- [ ] **CA-04:** La ingesta soporta ≥ 50 msg/s con p95 < 300 ms en consultas principales (RNF-01/02).
- [ ] **CA-05:** Cobertura de pruebas backend ≥ 70% en módulos críticos (RNF-07).
- [ ] **CA-06:** Todo el stack levanta con docker compose up en un entorno limpio (RNF-08).
- [ ] **CA-07:** Las pantallas P1 y P2 se operan solo con teclado y cumplen contraste AA (RF-12).

### 6.1 Escenarios de interfaz (Gherkin)

> Wireframes y auditoría: [`docs/diseno/`](docs/diseno/). Verificación manual sobre la implementación en Sprint 2. Pantallas: **P1** estado de flota y alertas (RF-05), **P2** asignación de turno (RF-07).

```gherkin
Feature: P1 — Estado de flota y alertas de mantenimiento (RF-05)

  Scenario: El supervisor ve primero lo más urgente
    Given un usuario autenticado con rol "mantenimiento"
    And existen vehículos con estado CRITICAL, WARNING y OK
    When abre "Estado de flota"
    Then ve los vehículos ordenados por criticidad
    And cada estado se muestra con ícono, texto y color

  Scenario: Alerta al 90 % del intervalo
    Given un vehículo con 460 horas desde el último service y un intervalo de 500
    When se muestra la lista
    Then su estado es "ADVERTENCIA" y muestra "92 %"

  Scenario: Alerta crítica al superar el intervalo
    Given un vehículo con 505 horas desde el último service y un intervalo de 500
    When se muestra la lista
    Then su estado es "CRÍTICO"

  Scenario: Rol sin permiso
    Given un usuario autenticado con rol "hse"
    When intenta abrir "Estado de flota"
    Then ve el mensaje "No tenés permiso para ver esta sección."

Feature: P2 — Asignación de turno (RF-07)

  Scenario: Asignación exitosa
    Given un usuario con rol "supervisor" y un vehículo disponible en el turno "Tarde"
    When elige el vehículo y un operador libre y confirma
    Then ve el mensaje de éxito con vehículo, operador y turno
    And puede deshacer la asignación

  Scenario: Doble asignación bloqueada
    Given el vehículo "CAM-009" ya está asignado al turno "Tarde"
    When el supervisor abre la asignación del turno "Tarde"
    Then "CAM-009" aparece como no disponible con el motivo "ya asignado"
    And no se puede seleccionar

  Scenario: Vehículo con alerta crítica
    Given el vehículo "CAM-014" tiene estado CRITICAL
    When el supervisor abre la asignación de turno
    Then "CAM-014" aparece como no disponible con el motivo "alerta crítica de mantenimiento"

  Scenario: Rol sin permiso de asignación
    Given un usuario con rol "mantenimiento"
    When intenta abrir "Turnos"
    Then ve el mensaje "Permisos insuficientes para asignar turnos."

Feature: Accesibilidad básica de P1 y P2 (RF-12)

  Scenario: Operación solo con teclado
    Given el usuario no usa mouse
    When recorre P1 y P2 con Tab, flechas, Enter y Esc
    Then puede completar todas las acciones y el foco siempre es visible

  Scenario: Contraste AA
    Given los colores definidos para estados y texto
    When se mide el contraste contra su fondo
    Then es al menos 4,5:1 en texto y 3:1 en componentes de interfaz
```

**Dependencias y riesgos del diseño**
- P1 cuenta con `MAINTENANCE_THRESHOLD` y `GET /api/v1/maintenance/alerts`; P2 cuenta con `operators`, `shift_assignments` y los endpoints de `/api/v1/shifts` y `/api/v1/operators` (Sprint 2). Falta la interfaz web de ambas pantallas.
- El permiso actual de `threshold-evaluation` excluye a `hse` y `lectura`; el escenario "Rol sin permiso" asume mantenerlo.
- El estado "no disponible por alerta crítica" en P2 usa el estado de RF-05 por vehículo (HU-04 del informe PP2): lo informa `GET /api/v1/shifts/availability` con el motivo `CRITICAL_ALERT`.
- Decisión de modelado: los operadores son una tabla propia (`operators`), no usuarios con rol, porque los roles de RF-02 no incluyen "operador" y los choferes no inician sesión en esta etapa.

## 7. Restricciones Arquitectónicas

> Restricciones vigentes que condicionan el diseño. Cada una remite a la decisión que la respalda.
> Diagramas: [`docs/arquitectura/C4-contexto.md`](docs/arquitectura/C4-contexto.md) y [`docs/arquitectura/C4-contenedores.md`](docs/arquitectura/C4-contenedores.md).

| ID | Restricción | Decisión | Estado |
|---|---|---|---|
| R-01 | Estilo **monolito modular**: un único servicio de aplicación (`api`) con módulos por dominio; un módulo solo consume el servicio exportado por otro | [ADR-002](docs/adr/ADR-002-estilo-arquitectonico.md) | Vigente |
| R-02 | El módulo de **Telemetría** (RF-03) se mantiene aislado para poder extraerlo; su extracción queda fuera de esta etapa | ADR-002 y NG-05 | Vigente (módulo aún no implementado) |
| R-03 | **PostgreSQL 16 + TimescaleDB** como único motor; todo cambio de esquema por migración TypeORM versionada, sin editar migraciones ya aplicadas | [ADR-003](docs/adr/ADR-003-persistencia.md) | Vigente (hypertable pendiente) |
| R-04 | Stack declarado: NestJS + TypeScript `strict` en el backend; React + Vite en el frontend; MQTT con Mosquitto; Redis para cache y colas | [ADR-001](docs/adr/ADR-001-stack-tecnologico.md) | Vigente (frontend, MQTT y Redis pendientes de implementar) |
| R-05 | La CI, las pruebas y el contenedor de desarrollo usan **Node 24** (Jest 30 con `@nestjs/testing` requiere ≥ 24.9) | `.github/workflows/ci.yml`; `docker-compose.yml` (`node:24-bookworm`); [ADR-001](docs/adr/ADR-001-stack-tecnologico.md) (actualización) | Vigente (alineado) |
| R-06 | El toolchain Node de desarrollo corre en contenedor Docker, no en el host | ADR-001 | Vigente |
| R-07 | No se introducen frameworks, bases de datos ni servicios externos sin un ADR aprobado | `.opencoderules` (v2) | Vigente |
| R-08 | Estilado del frontend con **TailwindCSS** y HTML nativo; ninguna librería de componentes sin un ADR nuevo | [ADR-004](docs/adr/ADR-004-stack-ui.md) | Vigente (frontend pendiente) |

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
| v3 | 2026-11-13 | Nuevo RF-12 (accesibilidad básica) y CA-07 | TP3: la accesibilidad debe ser verificable; RF-12 evita citar un RNF aún no definido |
| v3 | 2026-11-13 | Nueva sección 6.1: escenarios Gherkin de P1 (RF-05), P2 (RF-07) y RF-12, con dependencias y riesgos | TP3: criterios de aceptación de interfaz |
| v3 | 2026-11-13 | Sección 7: agregada R-08 (TailwindCSS) que cita ADR-004 | TP3: decisión de stack de UI |
| v3 | 2026-11-13 | Sección 4 y R-05: Node 24 alineado en CI, `docker-compose.yml` y README; R-05 pasa a «Vigente (alineado)» | Sprint 2: cerrar la inconsistencia Node 20 vs 24 |
| v3 | 2026-11-14 | Sección 5: `Vehiculo` agrega `horasUltimoServicio` (columna `last_service_hours`); `UmbralMantenimiento` pasa a estar implementado (`maintenance_thresholds`). Sección 6.1: P1 ya cuenta con su endpoint de alertas | Sprint 2: RF-05 persistido. Las horas del último servicio no existían y RF-05 las necesita; RF-06 las actualizará |
| v3 | 2026-11-14 | Sección 5: nuevo contrato `Operador`; `AsignacionTurno` agrega `fecha` y `turno` y fija `estado` en `ASSIGNED`/`CANCELLED`. Sección 6.1: P2 ya cuenta con sus endpoints | Sprint 2: RF-07 (asignación de turnos sin duplicados). El informe PP2 nombra `operator_id` pero no define a qué entidad apunta; se modela como tabla propia |
