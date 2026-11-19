# Arquitectura — contrato de la API

`api-contracts.yaml` es el contrato OpenAPI 3.0.3 de MineTrack360 (decisión en [ADR-005](../adr/ADR-005-estrategia-web.md)). Los tipos de la `SPEC.md` §5 remiten a los nombres de sus `components.schemas`.

## Cómo validarlo
Desde la raíz del repositorio (requiere Node; usar el contenedor de desarrollo, R-06):

```bash
npx --yes @redocly/cli@2.77.0 lint docs/arquitectura/api-contracts.yaml
```

Resultado esperado: sin errores ni advertencias. `@redocly/cli` **no** es dependencia del proyecto: se ejecuta con `npx` y la versión queda fijada en el comando.

## Endpoints cubiertos (13)
Los primeros 5 son los críticos de los journeys del TP3; los 8 últimos se incorporaron después (N-14).

| Operación | Método y ruta | Roles | Respuestas declaradas |
|---|---|---|---|
| `login` | `POST /api/v1/auth/login` | público | 200, 400, 401, 429, 500 |
| `getFleetAlerts` | `GET /api/v1/maintenance/alerts` | admin, supervisor, mantenimiento | 200, 401, 403, 429, 500 |
| `getShiftAvailability` | `GET /api/v1/shifts/availability` | admin, supervisor | 200, 400, 401, 403, 429, 500 |
| `assignShift` | `POST /api/v1/shifts/assignments` | admin, supervisor | 201, 400, 401, 403, 404, 409, 429, 500 |
| `cancelShiftAssignment` | `PATCH /api/v1/shifts/assignments/{id}/cancel` | admin, supervisor | 200, 400, 401, 403, 404, 409, 429, 500 |
| `getCurrentUser` | `GET /api/v1/auth/me` | admin, supervisor, mantenimiento, hse, lectura | 200, 401, 429, 500 |
| `listVehicles` | `GET /api/v1/vehicles` | admin, supervisor, mantenimiento, hse, lectura | 200, 401, 403, 429, 500 |
| `createVehicle` | `POST /api/v1/vehicles` | admin | 201, 400, 401, 403, 409, 429, 500 |
| `getVehicle` | `GET /api/v1/vehicles/{id}` | admin, supervisor, mantenimiento, hse, lectura | 200, 400, 401, 403, 404, 429, 500 |
| `evaluateThreshold` | `POST /api/v1/maintenance/threshold-evaluation` | admin, supervisor, mantenimiento | 200, 400, 401, 403, 429, 500 |
| `setMaintenanceThreshold` | `PUT /api/v1/maintenance/thresholds/{vehicleTypeId}` | admin | 200, 400, 401, 403, 404, 429, 500 |
| `listOperators` | `GET /api/v1/operators` | admin, supervisor | 200, 401, 403, 429, 500 |
| `createOperator` | `POST /api/v1/operators` | admin | 201, 400, 401, 403, 409, 429, 500 |

Solo se declaran los códigos que el endpoint puede devolver (por ejemplo, `login` no declara 403). Desde el Sprint 3 todos pueden devolver **429** por el límite global (100 pedidos por minuto por IP; el login mantiene 5).

## Evidencia de conformidad (reproducible, no forma parte de la CI)
Se levantó el backend real con PostgreSQL 16 y se ejecutaron 27 pedidos contra los 5 endpoints. Cada respuesta se validó con `ajv` contra el esquema del contrato y se buscaron campos o códigos no documentados.

| Resultado | Valor |
|---|---|
| Pedidos ejecutados | 27 |
| Diferencias con el contrato | 0 |
| Respuestas documentadas ejercitadas | 23 de 32 |
| Respuestas observadas y no documentadas | 0 |

Las 9 respuestas no ejercitadas son los 5 **500** (no se provocaron a propósito) y los 4 **429** de los endpoints que no son el login. Ese 429 global se observó aparte sobre `GET /api/v1/vehicles` (el pedido 101 de un minuto), que no es uno de los 5 endpoints del contrato. La comprobación se repitió en el Sprint 3, con el campo nuevo `cancelledById`: 27 pedidos, 0 diferencias. El script de comprobación está fuera del repositorio; incorporarlo a la CI queda como mejora (no verificado en CI).

### Los 8 endpoints incorporados (2026-11-19)
Se ejecutaron 24 pedidos contra el backend real (PostgreSQL 16) sobre los 8 endpoints nuevos: la respuesta exitosa, los errores de validación, la duplicación (409), el recurso inexistente (404) y los roles sin permiso (403). Cada respuesta exitosa se validó con `jsonschema` de Python contra el esquema del contrato y se buscaron propiedades no declaradas, y cada código observado se contrastó con los declarados. Resultado: **24 pedidos, 0 diferencias**. Con un contrato roto a propósito (una propiedad faltante, un tipo equivocado y un 409 sin declarar) el mismo script detectó 6 diferencias. Esta vez no se usó `ajv` como en la comprobación anterior. Tampoco se ejercitaron los 500 ni los 429. El script está fuera del repositorio (no verificado en CI).

## Honestidad sobre el orden
Este contrato se escribió **después** de implementar los endpoints del Sprint 2, por lo que no es API-first puro. Los 8 endpoints restantes se declararon el 2026-11-19, también después de implementarse. Desde el arnés v3, todo endpoint nuevo debe estar aquí antes de implementarse.
