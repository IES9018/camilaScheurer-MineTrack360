# P2 — Asignación de turno (RF-07, HU-04)

> **Versión:** v1 (corregida tras la auditoría). Hallazgos H-P2-n en [`../auditoria-heuristica.md`](../auditoria-heuristica.md).
> **Backend (Sprint 2):** la tabla `shift_assignments`, `GET /api/v1/shifts/availability`, `POST /api/v1/shifts/assignments` y `PATCH /api/v1/shifts/assignments/:id/cancel` ya existen. Los motivos de bloqueo del API (`NOT_ACTIVE`, `CRITICAL_ALERT`, `ALREADY_ASSIGNED`) corresponden a los mensajes de esta pantalla. Falta implementar la interfaz web.
> **Acceso:** rol `supervisor` y `admin`. `mantenimiento` recibe "permisos insuficientes" (HU-07 del informe).

## Versión inicial (v0)
```
+----------------------------------------+
| Asignar turno                          |
| Vehículo: [____]  Operador: [____]     |
| Turno: [____]                          |
|                         [Guardar]      |
+----------------------------------------+
```
Problemas: campos de texto libre, no muestra disponibilidad, el error de doble asignación aparece recién al guardar, sin confirmación del resultado.

## Versión corregida (v1)
```
+--------------------------------------------------------------------------+
| MineTrack360   Estado de flota      Turnos ◂ (actual)     Ana M. ▾        |
+--------------------------------------------------------------------------+
| Asignación de turno                                                       |
| Fecha: [13/11/2026 v]   Turno: ( ) Mañana  (•) Tarde  ( ) Noche           |   <- opciones visibles, no texto libre (H6, H-P2-02)
+--------------------------------------------------------------------------+
| 1. Vehículo                          | 2. Operador                        |
|  (•) CAM-021  Disponible             |  [ Buscar operador…        v ]     |
|  ( ) PAL-003  Disponible             |   Pérez, Juan  — libre             |
|  ( ) CAM-007  ⚠ Advertencia          |   Gómez, Luis  — ya asignado a CAM-009 (Tarde) |
|  ( ) CAM-014  ⛔ No disponible:       |                                    |
|        alerta crítica de mantenimiento|                                   |   <- bloqueo con motivo (H5, H-P2-03)
|  ( ) CAM-009  ⛔ No disponible:       |                                    |
|        ya asignado (Tarde)           |                                    |
+--------------------------------------------------------------------------+
| Resumen: CAM-021 · Pérez, Juan · 13/11 Tarde                              |
|                     [Cancelar]   [Confirmar asignación]                   |
+--------------------------------------------------------------------------+
```
### Mensajes
| Situación | Mensaje | Heurística |
|---|---|---|
| Éxito | "Asignado: CAM-021 a Pérez, Juan, turno Tarde del 13/11. [Deshacer]" | H1, H3 |
| Doble asignación (conflicto detectado en el servidor aunque la lista estuviera vieja) | "CAM-021 ya fue asignado a ese turno. Elegí otro vehículo." (la lista se refresca) | H9 |
| Rol sin permiso | "Permisos insuficientes para asignar turnos." | H1, H5 |
| Error de red | "No se pudo guardar. No se perdió lo que elegiste. [Reintentar]" | H9 |

### Reglas de interfaz
- Los vehículos no disponibles se **muestran** (con motivo) pero no son seleccionables.
- "Confirmar" queda deshabilitado hasta elegir vehículo y operador; no se pierde el avance al cancelar un error.
- **Deshacer** disponible tras confirmar (libertad del usuario, H3).
- Teclado: Tab/Shift+Tab entre grupos; flechas dentro del grupo de opciones; Enter confirma; Esc cancela. Foco visible (RF-12).
