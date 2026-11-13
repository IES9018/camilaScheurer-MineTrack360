# ADR-002: Estilo arquitectónico — monolito modular

**Fecha:** 2026-11-13
**Estado:** Aceptado
**Relacionado:** formaliza lo decidido en [ADR-001](./ADR-001-stack-tecnologico.md) (no lo reemplaza); `SPEC.md` NG-05 y §7; [ADR-003](./ADR-003-persistencia.md).

## Contexto
MineTrack360 debe cubrir 11 requerimientos funcionales (autenticación y roles, telemetría MQTT, mapa,
mantenimiento, turnos, incidentes, tablero, reportes y auditoría) con una ingesta de ≥ 50 msg/s
(CA-04). Lo desarrolla **una sola persona** (el proyecto es individual desde PP2) dentro del plazo de
PP3, y debe poder levantarse con `docker compose up` (CA-06).

Estado actual verificado en `backend/src/`: un único proyecto NestJS con módulos separados por dominio
(`auth`, `vehicles`, `maintenance`, `database`). `MaintenanceModule` ya expone solo su servicio
(`exports: [MaintenanceService]`) y no accede a repositorios de otros módulos.

## Decisión
**Monolito modular:** un único proceso desplegable (la API NestJS) organizado en módulos por dominio con
fronteras explícitas. Reglas que se derivan:

1. **Un módulo no usa los repositorios ni las entidades de otro:** solo consume el servicio que el otro
   exporta.
2. **Un solo servicio de aplicación (`api`)** en el despliegue; sin orquestación entre servicios propios.
3. **Telemetría (RF-03) queda como módulo aislado** (sin dependencias cruzadas más allá de su
   servicio), de modo que pueda extraerse como servicio independiente más adelante. Esa extracción
   está fuera del alcance de esta etapa (NG-05).

## Alternativas Descartadas
Criterios: (a) capacidad de una sola persona, (b) complejidad operativa, (c) encaje con una conexión MQTT
sostenida (RF-03), (d) plazo de PP3, (e) reproducibilidad con Docker Compose.

| Criterio | Monolito modular (elegida) | Microservicios | Serverless (funciones) |
|---|---|---|---|
| (a) 1 persona | Un repo, un proceso, un despliegue | Varios servicios, repos o pipelines que mantener | Funciones sueltas, pero con configuración propia del proveedor |
| (b) Complejidad operativa | Baja: un contenedor de aplicación | Alta: descubrimiento de servicios, trazas distribuidas, versionado de contratos entre servicios | Media: límites de ejecución y arranque en frío |
| (c) Conexión MQTT sostenida | Natural: el proceso mantiene la suscripción a `telemetry/+/data` | Natural, pero obliga a un servicio de ingesta dedicado desde el día 1 | Mal encaje: las funciones son efímeras y no sostienen una suscripción permanente al broker |
| (d) Plazo PP3 | Compatible | Riesgo alto de no llegar | Compatible para endpoints sueltos, no para ingesta |
| (e) `docker compose up` | Un servicio `api` + db, redis y mosquitto | Un servicio más por cada microservicio | No aplica: depende de una plataforma externa |

- **Microservicios completos:** descartados por YAGNI. El volumen del prototipo no justifica la
  orquestación ni el tracing distribuido, y aumentan el costo de mantenimiento de un equipo de una persona.
  Ya estaba descartada en ADR-001; acá se justifica con los criterios de la tabla.
- **Serverless (FaaS):** descartado porque RF-03 necesita un suscriptor MQTT permanente y el modelo de
  ejecución por invocación no lo sostiene, y porque CA-06 pide levantar todo en local con Docker Compose.

## Consecuencias
- **Positivas:** un único artefacto que construir, probar y desplegar; la CI actual (typecheck, lint,
  tests y build del backend) cubre todo el sistema; transacciones y validaciones compartidas sin red de
  por medio; la extracción futura de Telemetría sigue abierta.
- **Negativas / Riesgos:**
  - Si los módulos se acoplan (por ejemplo, una consulta directa a la tabla de otro dominio), la
    extracción futura se encarece. Mitigación: la regla 1 y una revisión de imports en cada PR.
  - Un fallo en el proceso afecta a todos los módulos, incluida la ingesta.
  - La API y la ingesta comparten recursos: si CA-04 (≥ 50 msg/s) no se cumple, es la primera señal
    para extraer Telemetría.

## Cuándo reabrir esta decisión
Si CA-04 no se alcanza con un solo proceso, o si se levanta NG-05. En ese caso se escribe un ADR nuevo que
supersede a este.
