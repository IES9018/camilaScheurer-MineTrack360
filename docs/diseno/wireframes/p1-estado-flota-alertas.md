# P1 — Estado de flota y alertas de mantenimiento (RF-05, HU-02)

> **Versión:** v1 (corregida tras la auditoría, ver [`../auditoria-heuristica.md`](../auditoria-heuristica.md)). Los hallazgos citados (H-P1-n) se resuelven en este wireframe.
> **Datos disponibles hoy:** el backend ya calcula `status` (`OK`/`WARNING`/`CRITICAL`), `hoursSinceService` y `ratio` (endpoint `POST /api/v1/maintenance/threshold-evaluation`). Lo demás (lista por vehículo con su umbral) depende de tablas aún no implementadas (`MAINTENANCE_THRESHOLD`) → **dependencia declarada**.

## Versión inicial (v0) — antes de la auditoría
```
+------------------------------------------------------------+
| MineTrack360                          [usuario v]          |
+------------------------------------------------------------+
| Vehículos                                                  |
|  CAM-014   ●(rojo)       CAM-021   ●(verde)                |
|  CAM-007   ●(amarillo)   PAL-003   ●(verde)                |
|  ...                                                       |
+------------------------------------------------------------+
```
Problemas: el estado se expresa **solo con color**, no dice cuánto falta, no está ordenado, sin estado de carga/error.

## Versión corregida (v1)
```
+--------------------------------------------------------------------------+
| MineTrack360   Estado de flota      Turnos          Mantenimiento ▸ Ana M. |   <- navegación con la sección actual marcada (H-P1-04)
+--------------------------------------------------------------------------+
| Alertas de mantenimiento                       Actualizado: 14:32 [Recargar]|   <- visibilidad del estado del sistema (H-P1-01)
| Filtro: [Todos v]  Ordenar por: [Criticidad v]      Resumen: 2 CRÍTICO · 3 ADVERTENCIA · 17 OK |
+--------------------------------------------------------------------------+
| Estado        | Vehículo | Tipo     | Horas desde service | % intervalo   |
|---------------+----------+----------+---------------------+---------------|
| ⛔ CRÍTICO     | CAM-014  | Camión   | 505 / 500 h         | 101 %         |   <- ícono + texto + color (H-P1-02)
| ⛔ CRÍTICO     | CAM-003  | Camión   | 512 / 500 h         | 102 %         |
| ⚠ ADVERTENCIA | CAM-007  | Camión   | 460 / 500 h         |  92 %         |
| ✔ OK          | CAM-021  | Camión   | 120 / 500 h         |  24 %         |
+--------------------------------------------------------------------------+
| ▸ Seleccionar una fila abre el detalle (Enter o clic)                     |
+--------------------------------------------------------------------------+
```
### Detalle de un vehículo (panel lateral)
```
CAM-014 · Camión              Estado: ⛔ CRÍTICO
Horas desde el último service: 505 h  (intervalo: 500 h)
Mensaje: "Superó el intervalo por 5 h. Programar service."          <- lenguaje del usuario (H-P1-05)
[Registrar intervención]  (habilitado cuando exista RF-06)  [Cerrar (Esc)]
```
### Estados de la pantalla
| Estado | Qué muestra | Heurística |
|---|---|---|
| Cargando | Texto "Cargando alertas…" (sin tabla vacía) | H1 |
| Error de red | "No se pudo actualizar. Se muestran datos de las 14:32. [Reintentar]" | H1, H9 |
| Vacío | "No hay vehículos cargados." | H1 |
| Sin permiso (rol `hse`/`lectura`) | "No tenés permiso para ver esta sección." | H1, H5 |

### Reglas de interfaz
- Umbrales visibles al usuario: ADVERTENCIA desde 90 % del intervalo, CRÍTICO desde 100 % (RF-05, coherente con el backend).
- Orden por defecto: criticidad descendente.
- Teclado: Tab recorre filtro → orden → filas → botón; Enter abre el detalle; Esc lo cierra. Foco visible (RF-12).
- Colores (contraste verificado, ver `auditoria-heuristica.md` §3): texto de estado `#166534` (OK), `#92400e` (ADVERTENCIA), `#b91c1c` (CRÍTICO) sobre blanco.
