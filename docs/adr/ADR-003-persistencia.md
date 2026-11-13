# ADR-003: Persistencia — PostgreSQL 16 + TimescaleDB como motor único

**Fecha:** 2026-11-13
**Estado:** Aceptado
**Relacionado:** profundiza la elección de base de datos de [ADR-001](./ADR-001-stack-tecnologico.md); [ADR-002](./ADR-002-estilo-arquitectonico.md); `SPEC.md` §5.

## Contexto
La decisión se justifica con el **modelo de datos real**, no con preferencias:

**Ya implementado** (migraciones en `backend/src/database/migrations/`):

| Tabla | Relaciones y restricciones |
|---|---|
| `roles` | `name` único; 5 filas sembradas (RF-02) |
| `user_accounts` | FK `role_id` → `roles`; `email` único |
| `vehicle_types` | Referenciada por `vehicles` |
| `vehicles` | FK `vehicle_type_id` → `vehicle_types`; `internal_code` y `license_plate` únicos; estado como `ENUM` nativo (`ACTIVE`, `MAINTENANCE`, `OUT_OF_SERVICE`) |

**Declarado en la SPEC §5, todavía sin implementar:** `UmbralMantenimiento` (`MAINTENANCE_THRESHOLD`),
`RegistroMantenimiento`, `AsignacionTurno` (`SHIFT_ASSIGNMENT`) y `LecturaTelemetria`
(`TELEMETRY_READING`). Todas referencian por identificador a vehículos, tipos de vehículo o usuarios.

**Exigencias que condicionan el motor:**
- **Integridad referencial y unicidad:** RF-07 pide asignar vehículos y operadores a turnos "evitando
  duplicados".
- **Consultas entre tablas:** RF-06 (mantenimiento con responsable y costos) y RF-09 (indicadores por
  período) cruzan vehículos, intervenciones, incidentes y turnos.
- **Volumen de telemetría:** CA-04 exige ≥ 50 msg/s. Si esa tasa fuera sostenida, serían hasta
  ~4,3 millones de filas por día (50 × 86.400), como cota superior de diseño.
- **Concurrencia:** la ingesta MQTT escribe mientras la API atiende consultas.

La extensión TimescaleDB ya se habilita en la migración `1791060600000-enable-timescaledb.ts`, que la
describe como prerrequisito de la hypertable `TELEMETRY_READING`. **Esa tabla todavía no existe.**

## Decisión
**PostgreSQL 16 con la extensión TimescaleDB como único motor de datos:**
- tablas relacionales normalizadas con claves foráneas y restricciones `UNIQUE` para las entidades de negocio;
- `TELEMETRY_READING` como hypertable, para las series temporales de RF-03;
- todo cambio de esquema mediante **migraciones TypeORM versionadas**, nunca editando una migración ya aplicada.

## Alternativas Descartadas
Criterios: (a) integridad referencial, (b) consultas entre tablas, (c) escritura concurrente sostenida,
(d) series temporales, (e) operación para una sola persona.

| Criterio | PostgreSQL + TimescaleDB (elegida) | MongoDB | SQLite |
|---|---|---|---|
| (a) Integridad referencial | Claves foráneas y `UNIQUE` en la base | Solo por lógica de aplicación | Posee claves foráneas, pero hay que activarlas en cada conexión |
| (b) Consultas entre tablas | `JOIN` nativo | `$lookup` y pipelines de agregación | `JOIN` nativo |
| (c) Escritura concurrente | Múltiples escritores concurrentes | Buena | **Un solo escritor a la vez**: la ingesta bloquearía a la API |
| (d) Series temporales | Hypertables y particionado por tiempo | Colecciones de series temporales, con menos madurez | Sin soporte específico |
| (e) Operación | Un contenedor (ya definido en `docker-compose.yml`) | Otro motor y otro modelo mental | Cero operación, pero sin servidor |

- **MongoDB (NoSQL documental):** descartado. El modelo es relacional (todas las entidades se
  vinculan por clave foránea) y RF-07 requiere garantizar unicidad; con documentos esa garantía pasaría a
  ser lógica de aplicación. Ya descartado en ADR-001; acá se contrasta con las tablas reales.
- **SQLite (base embebida):** descartado por el criterio (c). Escribe un solo proceso a la vez, y la ingesta
  de ≥ 50 msg/s (CA-04) compite con las escrituras y lecturas de la API. Tampoco cubre el caso de series
  temporales y no encaja con el esquema multicontenedor de CA-06.
- **PostgreSQL sin TimescaleDB:** viable, pero obligaría a particionar la tabla de telemetría a mano.
  Como la extensión ya está habilitada por migración y el contenedor `timescale/timescaledb` ya figura en
  `docker-compose.yml`, el costo adicional es nulo.

## Consecuencias
- **Positivas:** un solo motor simplifica backup y operación (ADR-001); la integridad la garantiza la base;
  los esquemas quedan versionados y reproducibles con las migraciones.
- **Negativas / Riesgos:**
  - **La hypertable no existe todavía:** hasta crearla (RF-03), CA-04 no se puede medir.
  - TimescaleDB tiene menos hosting gratuito que PostgreSQL puro (ya señalado en ADR-001).
  - Deuda conocida de la auditoría del Sprint 1: `vehicles.total_engine_hours` es `double precision`
    (hallazgo H-06, propuesta: `numeric(10,1)`). Un cambio de tipo requiere una migración nueva.
  - El cambio de esquema exige disciplina: una migración aplicada no se edita, se agrega otra.

## Cuándo reabrir esta decisión
Si la medición de CA-04 sobre la hypertable no alcanza el objetivo, o si aparecen datos sin esquema
(por ejemplo, payloads heterogéneos de sensores) que no se puedan modelar como columnas. Se registraría
con un ADR nuevo que supersede a este.
