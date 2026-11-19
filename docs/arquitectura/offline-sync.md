# Uso sin conexión — Non-Goal NG-06

**Fecha:** 2026-11-16 · **Relacionado:** [ADR-007](../adr/ADR-007-estrategia-mobile.md); `SPEC.md` (NG-06, RF-07); `api-contracts.yaml`.

## Decisión
**NG-06: la interfaz web no ofrece modo offline con escritura.** No hay cola de sincronización ni caché que permita asignar turnos sin conexión. La degradación que sí existe se describe abajo.

## Por qué no
1. **La asignación de turnos es una decisión del servidor.** RF-07 prohíbe la doble asignación y lo garantiza la base con dos índices únicos parciales (el error `23505` se traduce en `409`). Una asignación guardada en el teléfono y enviada horas después se aplicaría sobre un estado que cambió: habría que definir quién gana en cada conflicto. Eso es un diseño aparte, no una cola simple.
2. **Las alertas dependen de datos del servidor.** El estado OK/ADVERTENCIA/CRÍTICO de RF-05 se calcula en el backend con las horas desde el último servicio; un cliente sin conexión solo puede mostrar lo último que vio, con su hora.
3. **El problema de conectividad del informe PP2 está en otro lado.** El informe (§1.1 y §9) plantea la conexión intermitente en el yacimiento y propone *buffering* en el **gateway IoT**. Eso afecta a la ingesta (RF-03, aún no implementada), no a la interfaz web. Además, ese relevamiento es simulado: no hay una medición real de cortes de los usuarios.
4. **Costo.** Una persona, con el cierre de PP3 inmediato. Un service worker mal hecho muestra datos viejos sin avisar, que en alertas de mantenimiento es peor que mostrar un error.

## Qué pasa hoy sin conexión (degradación verificada en el código)
| Situación | Comportamiento | Dónde |
|---|---|---|
| P1: falla la actualización | «No se pudo actualizar. Se muestran datos de las HH:MM.» y se conservan los últimos datos, con botón para reintentar | `FleetAlertsPage.tsx` |
| P2: falla el guardado | «No se pudo guardar. No se perdió lo que elegiste.»; la selección se conserva | `ShiftsPage.tsx` |
| P2: falla la carga de disponibilidad | «No se pudo cargar la disponibilidad. Revisá la conexión.» con *Reintentar* | `ShiftsPage.tsx` |
| Sesión vencida (1 h, ADR-006) | Aviso previo y vuelta al login | `SessionExpiryNotice.tsx` |

## Qué reabriría esta decisión
- Una **medición real** de usuarios de campo que pasan más de unos minutos sin conexión y necesitan consultar alertas.
- Un pedido concreto de **ver** alertas sin conexión: se resolvería primero con una PWA de **solo lectura** (service worker que guarda la última respuesta de `GET /api/v1/maintenance/alerts`, con la hora visible). Es el paso mínimo y no necesita resolver conflictos.
- Offline con **escritura** solo con un ADR que defina la política de conflictos (por ejemplo, el servidor rechaza con 409 y el usuario reelige) y pruebas de ese caso.
