# SPEC-000: MineTrack360 — Gestión y Monitoreo de Flotas para Logística Minera

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
- Backend: Node.js 20 LTS + TypeScript + NestJS, API REST documentada con OpenAPI/Swagger.
- Frontend: React 18 + TypeScript + Vite, TailwindCSS, Zustand, Leaflet/OpenStreetMap, Recharts.
- Persistencia: PostgreSQL 16 + TimescaleDB (hypertable para TELEMETRY_READING), ORM TypeORM; Redis (cache + BullMQ).
- Mensajería: MQTT (Eclipse Mosquitto), tópicos `telemetry/+/data`.
- Restricción de toolchain local: el motor IA (opencode) corre como binario nativo sin Node.js; el entorno de desarrollo Node se ejecutará en contenedor Docker (ver ADR-001 y ADR-002).
- Git Flow institucional: `feature/*` → `develop` → `main`, con PR y 1 aprobación.

## 5. Contratos de Datos / Tipos
```typescript
// Entidades principales derivadas del modelo ER de PP2 (3FN)
interface Vehiculo { id: number; patente: string; tipoId: number; estado: 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO'; }
interface TipoVehiculo { id: number; categoria: string; }            // VEHICLE_TYPE
interface UmbralMantenimiento { tipoVehiculoId: number; intervaloHoras: number; }  // MAINTENANCE_THRESHOLD
interface LecturaTelemetria {                                        // TELEMETRY_READING (hypertable)
  vehicleId: number; timestamp: Date;
  latitud: number; longitud: number; velocidadKmh: number;
  temperaturaMotorC: number; horasUso: number;
}
interface RegistroMantenimiento { id: number; vehiculoId: number; tipo: string; fecha: Date; costo: number; repuestos: string; responsableId: number; }
interface AsignacionTurno { id: number; vehiculoId: number; operadorId: number; estado: string; }  // SHIFT_ASSIGNMENT

## 6. Criterios de Aceptación
- [ ] **CA-01:** Un usuario válido obtiene JWT y accede solo a los módulos de su rol (RF-01/02).
- [ ] **CA-02:** Un mensaje MQTT publicado en telemetry/+/data se persiste y su posición aparece en el mapa (RF-03/04).
- [ ] **CA-03:** Superado el 90%/100% del umbral de horas, el sistema genera alerta WARNING/CRITICAL (RF-05).
- [ ] **CA-04:** La ingesta soporta ≥ 50 msg/s con p95 < 300 ms en consultas principales (RNF-01/02).
- [ ] **CA-05:** Cobertura de pruebas backend ≥ 70% en módulos críticos (RNF-07).
- [ ] **CA-06:** Todo el stack levanta con docker compose up en un entorno limpio (RNF-08).
