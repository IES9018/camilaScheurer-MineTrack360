# P2 — Asignación de turno: versión móvil (< 400 px)

> **Estado:** diseño objetivo (TP5, ADR-007). **No está implementado**: la pantalla actual (`frontend/src/features/shifts`) ya pasa a una columna por debajo de 768 px (`md:grid-cols-2`), pero sus botones tienen alto ≈ 34 px (estimado por clases, no medido) y el botón de confirmar no queda fijo. Versión de escritorio/tablet: [`p2-asignacion-turno.md`](./p2-asignacion-turno.md).
> **Requisitos:** RNF-14 (sin scroll horizontal y objetivos táctiles ≥ 48 px), RF-07, RF-12.

## Lado a lado
```
ESCRITORIO / TABLET (≥ 768 px)                      MÓVIL (< 400 px, ancho de diseño 360 px)
+--------------------------------------------+      +----------------------------+
| MineTrack360  Flota  Turnos ◂   Ana M.     |      | MineTrack360               |
+--------------------------------------------+      | Flota | Turnos   [Salir]   |
| Asignación de turno                        |      +----------------------------+
| Fecha:[13/11 v]  Turno:( )Mañana (•)Tarde  |      | Asignación de turno        |
|                       ( )Noche             |      | Fecha  [13/11/2026      v] |  <- 48 px
+--------------------------------------------+      | Turno                      |
| 1. Vehículo        | 2. Operador           |      | ( ) Mañana  (•) Tarde      |  <- filas de 48 px
| (•) CAM-021 Disp.  | [Buscar operador… v]  |      | ( ) Noche                  |
| ( ) CAM-007 ⚠ Adv. |  Pérez, Juan — libre  |      +----------------------------+
| ( ) CAM-014 ⛔ No  |  Gómez, Luis — asig.  |      | 1. Vehículo                |
|     disponible:    |   a CAM-009 (Tarde)   |      | (•) CAM-021  Disponible    |  <- fila de 48 px
|     alerta crítica |                       |      | ( ) CAM-007  ⚠ Advertencia |
| ( ) CAM-009 ⛔ No  |                       |      | ( ) CAM-014  ⛔ No disp.   |
|     disponible: ya |                       |      |     alerta crítica         |
|     asignado       |                       |      | ( ) CAM-009  ⛔ No disp.   |
+--------------------------------------------+      |     ya asignado (Tarde)    |
| Resumen: CAM-021 · Pérez · 13/11 Tarde     |      +----------------------------+
|        [Cancelar] [Confirmar asignación]   |      | 2. Operador                |
+--------------------------------------------+      | [Pérez, Juan — libre    v] |  <- lista, 48 px
                                                     +----------------------------+
                                                     | CAM-021 · Pérez · Tarde    |  <- barra fija abajo
                                                     | [Cancelar] [Confirmar]     |     (48 px)
                                                     +----------------------------+
```

## Qué cambió y por qué
| Cambio | Motivo |
|---|---|
| Dos columnas (vehículo / operador) pasan a **un solo flujo vertical** de 3 pasos | A 360 px no caben dos columnas; el orden fecha/turno → vehículo → operador sigue el del escritorio |
| Opciones de turno y de vehículo como **filas de 48 px** | Objetivo táctil de 48 px (Material/web.dev; Apple HIG: 44 pt) y menos toques fallidos |
| El motivo del bloqueo (**«alerta crítica»**, **«ya asignado»**) sigue visible en la fila | Un vehículo no disponible se muestra, con motivo, pero no se puede elegir (escenario Gherkin de la SPEC) |
| **Barra fija inferior** con el resumen y «Confirmar» | El botón de confirmar queda al alcance del pulgar sin recorrer toda la lista; «Confirmar» sigue deshabilitado hasta elegir vehículo y operador |
| Selector de operador como **lista de opciones**, sin buscador | Es lo que ya hace la implementación; un buscador con teclado en pantalla taparía la lista |
| **Contenido recortado:** el resumen reduce la fecha a «13/11» | Entra en una línea junto a los botones |
| Mensajes de éxito y error **sobre la barra fija**, con «Deshacer» de 48 px | Se ven sin desplazarse; el usuario puede deshacer (libertad del usuario) |

## Se mantiene igual
Roles y mensaje «Permisos insuficientes para asignar turnos.»; manejo de conflicto 409 con refresco de la lista; «No se pudo guardar. No se perdió lo que elegiste.»; teclado y foco visible (RF-12); contraste AA.
