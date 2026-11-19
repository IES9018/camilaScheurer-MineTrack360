# P1 — Estado de flota y alertas: versión móvil (< 400 px)

> **Estado:** diseño objetivo (TP5, ADR-007). **No está implementado**: la pantalla actual (`frontend/src/features/fleet-alerts`) muestra una tabla con scroll horizontal y botones de alto ≈ 34 px (estimado por las clases de Tailwind, no medido en un navegador). Versión de escritorio/tablet: [`p1-estado-flota-alertas.md`](./p1-estado-flota-alertas.md).
> **Requisitos:** RNF-14 (sin scroll horizontal de página y objetivos táctiles ≥ 48 px), RF-12 (teclado y contraste AA se mantienen).

## Lado a lado
```
ESCRITORIO / TABLET (≥ 768 px)                      MÓVIL (< 400 px, ancho de diseño 360 px)
+------------------------------------------+        +----------------------------+
| MineTrack360  Flota  Turnos   Ana M. [Salir]|     | MineTrack360               |
+------------------------------------------+        | Flota | Turnos   [Salir]   |  <- 48 px de alto
| Alertas de mantenimiento  Actualizado 14:32|      +----------------------------+
| Filtro:[Todos v] Orden:[Criticidad v]      |      | Alertas de mantenimiento   |
| 2 CRÍTICO · 3 ADVERTENCIA · 17 OK          |      | Actualizado 14:32 [Recargar]|
+------------------------------------------+        | 2 CRÍTICO · 3 ADV. · 17 OK |
| Estado    |Vehículo|Tipo |Horas   |%       |      | Filtro  [Todos           v]|  <- ancho completo, 48 px
|-----------+--------+-----+--------+--------|      | Orden   [Criticidad      v]|
| ⛔ CRÍTICO | CAM-014|Camión|505/500| 101 %  |      +----------------------------+
| ⛔ CRÍTICO | CAM-003|Camión|512/500| 102 %  |      | ⛔ CRÍTICO          101 %  |  <- cada vehículo es
| ⚠ ADVERT. | CAM-007|Camión|460/500|  92 %  |      | CAM-014 · Camión           |     una tarjeta tocable
| ✔ OK      | CAM-021|Camión|120/500|  24 %  |      | 505 / 500 h            [>] |     (≥ 48 px de alto)
+------------------------------------------+        +----------------------------+
 Detalle: panel lateral                              | ⛔ CRÍTICO          102 %  |
                                                     | CAM-003 · Camión           |
                                                     | 512 / 500 h            [>] |
                                                     +----------------------------+
                                                     Detalle: pantalla completa
                                                     +----------------------------+
                                                     | [< Volver]  CAM-014        |  <- 48 px
                                                     | ⛔ CRÍTICO · Camión        |
                                                     | 505 h de 500 h (101 %)     |
                                                     | Superó el intervalo por 5 h|
                                                     | [Registrar intervención]   |  <- deshabilitado (RF-06)
                                                     +----------------------------+
```

## Qué cambió y por qué
| Cambio | Motivo |
|---|---|
| La tabla de 5 columnas pasa a **tarjetas apiladas** | A 360 px una tabla de 5 columnas obliga a desplazar de costado y se pierde la columna de estado. Cada tarjeta conserva lo esencial: estado (ícono + texto + color), vehículo, tipo, horas y porcentaje |
| **Estado y porcentaje arriba**, a la vista sin desplazarse | La pregunta del usuario es «¿qué es urgente?»; el orden por criticidad se mantiene |
| Filtro y orden **a ancho completo** | Un selector angosto es difícil de tocar con el pulgar |
| Objetivos táctiles **≥ 48 px** (tarjeta, botones, selectores) | Recomendación de Material y web.dev (Apple HIG usa 44 pt). WCAG 2.2 exige un mínimo de 24 px; se apunta más alto por uso con guantes o en movimiento |
| Detalle en **pantalla completa** con «Volver» | Un panel lateral no entra en 360 px. Esc y el botón «Volver» cierran el detalle |
| **Resumen en una línea** (2 CRÍTICO · 3 ADV. · 17 OK) | Se recorta el texto para que entre en una línea |
| **Contenido recortado:** la columna «Tipo» se une a la línea del vehículo | Reduce el ancho sin perder el dato |

## Se mantiene igual
Estados «Cargando», «Error con datos previos», «Vacío» y «Sin permiso» (los mismos textos); colores con contraste AA verificado (`#166534`, `#92400e`, `#b91c1c`); operación completa con teclado y foco visible (RF-12); estado siempre con ícono + texto + color.
