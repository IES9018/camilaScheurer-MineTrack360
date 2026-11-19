# ADR-007: Estrategia mobile — web responsive (la SPA actual), sin PWA ni app nativa por ahora

**Fecha:** 2026-11-16
**Estado:** Aceptado
**Relacionado:** [ADR-004](./ADR-004-stack-ui.md); [ADR-005](./ADR-005-estrategia-web.md); [ADR-006](./ADR-006-politica-de-sesion-jwt.md); [`presupuestos-rendimiento.md`](../arquitectura/presupuestos-rendimiento.md); [`offline-sync.md`](../arquitectura/offline-sync.md); [wireframes móviles](../diseno/wireframes/); `SPEC.md` (RNF-06, RNF-11 a RNF-14, NG-06, R-12).

> **Nota de numeración:** la consigna del TP5 nombra este archivo `ADR-006-estrategia-mobile.md`. El número 006 ya lo ocupa la política de sesión (PR #62, mergeado), y un ADR aprobado no se renumera, así que este es el ADR-007. Es una desviación deliberada de la consigna.

## Contexto
Hechos verificados en el repositorio:
- El frontend es una SPA React + Vite (ADR-005) con TailwindCSS. Hoy se compila a **un solo chunk de JavaScript de unos 64 KB gzip** (medido, ver presupuestos).
- RNF-06 del informe PP2 pide uso correcto en escritorio y **tablet (≥ 768 px)**. Nada exige hoy un teléfono.
- Las pantallas P1 y P2 se pensaron para escritorio y tablet (`docs/diseno/usuarios.md`). En la implementación, P1 muestra una tabla con scroll horizontal y P2 pasa a una columna por debajo de 768 px; los botones usan `py-1` (alto estimado por clases ≈ 34 px, no medido en navegador).
- Las posiciones de los vehículos vienen de dispositivos IoT (simulados, NG-01), no del teléfono: la app no necesita GPS ni cámara del aparato.
- Desarrolla una sola persona y el cierre de PP3 es inmediato (defensa el 19/11/2026).

**Supuestos, por confirmar:** (1) el informe PP2 supone conectividad intermitente en el yacimiento (§1.1), pero ese relevamiento es **simulado**; (2) la encuesta simulada del informe ubica la «aplicación móvil para choferes» última (3,6 de 5), y la SPEC dice que los choferes no inician sesión en esta etapa.

## Decisión
1. **Se mantiene la SPA responsive** como única entrega para dispositivos móviles. Se diseña mobile-first con los breakpoints por defecto de Tailwind (`md` = 768 px, tablet; por debajo, teléfono, con el diseño objetivo a < 400 px).
2. **No se hace PWA, app nativa ni híbrida en esta etapa.** La PWA queda como **evolución documentada**, con condiciones de reapertura (abajo).
3. **Los requisitos móviles son medibles** y están en `presupuestos-rendimiento.md` (RNF-11 a RNF-13) y en la SPEC v5 (RNF-14). El offline con escritura es un Non-Goal justificado (`offline-sync.md`, NG-06).

## Alternativas Descartadas
Criterios de **este** contexto. Puntaje cualitativo: ✔ favorece, ✖ perjudica, ➖ neutro.

| Criterio | Web responsive (SPA actual) — **elegida** | PWA (instalable + service worker) | Nativa (React Native / Flutter) | Híbrida (Capacitor sobre la SPA) |
|---|---|---|---|---|
| Costo de mantenimiento, 1 persona | ✔ Un solo código y un solo despliegue | ➖ Mismo código, más un service worker con su ciclo de caché y actualización | ✖ Segundo código, segundo toolchain, segundo despliegue | ➖ Mismo código web, pero suma proyectos Android/iOS y sus builds |
| Tiempo hasta el cierre de PP3 | ✔ Ajustes de CSS sobre lo existente | ➖ Manifest + service worker + HTTPS + pruebas de actualización | ✖ No entra en el plazo | ✖ Cuentas de tienda, firmas, builds de plataforma |
| ¿Offline necesario? | ✔ No: las escrituras necesitan al servidor (ver `offline-sync.md`) | ➖ Su ventaja principal (offline) no se usa | ➖ Idem | ➖ Idem |
| Acceso a hardware del teléfono | ✔ No se necesita: el GPS viene del IoT | ➖ No se necesita | ➖ Su ventaja (sensores, segundo plano) no se necesita | ➖ Idem |
| Reutiliza lo existente (ADR-005, P1/P2, pruebas) | ✔ Total | ✔ Total | ✖ Reescribe interfaz y pruebas | ✔ Casi total |
| Distribución y actualización | ✔ Una URL; todos ven la última versión | ✔ URL con instalación opcional | ✖ Tiendas o instalación manual | ✖ Tiendas |
| Superficie de seguridad (ADR-006) | ✔ La existente | ➖ Suma una caché local con datos de la sesión | ✖ Almacenamiento seguro propio del sistema operativo, otra revisión | ✖ Dos superficies |
| Notificaciones push / segundo plano | ✖ No | ✖ Limitadas (iOS) | ✔ Sí | ✔ Sí |

La web responsive gana en los cuatro criterios que fija la consigna (mantenimiento de 1 persona, offline, hardware, tiempo hasta el cierre). Pierde solo en notificaciones push, que ningún requisito vigente pide (HU-02 pide correo, no push).

## Consecuencias
- **Qué NO vamos a poder hacer** (escrito antes de sufrirlo):
  - Sin notificaciones push ni tareas en segundo plano.
  - Sin ícono instalable ni presencia en tiendas de aplicaciones.
  - Sin uso sin conexión: toda acción necesita al servidor.
  - Sin aprovechar sensores del teléfono (cámara, GPS propio).
  - Sin app dedicada para choferes (trabajo futuro del informe PP2, §11.2).
- **Riesgos y deuda declarada:**
  - **La implementación no sigue el diseño móvil al pie de la letra.** Actualización (2026-11-19): P1 y P2 ya están adaptadas y RNF-14 se verifica con `docs/arquitectura/medir-movil.cjs`; las desviaciones respecto de los wireframes están declaradas en `p1-movil.md` y `p2-movil.md`.
  - Los presupuestos de LCP e INP de P1 y P2 **todavía no se midieron**: solo se midió la página de login y el peso del JavaScript (ver presupuestos). La medición real llega con la demo desplegada.
  - Leaflet (RF-04) y Recharts (RF-09) aún no están en el bundle; al sumarlos consumirán el presupuesto de 200 KB, y el script `check:bundle` avisará.
- **Revisión:** se reabre este ADR a favor de la **PWA** si (a) se mide que los usuarios de campo quedan más de unos minutos sin conexión y piden ver datos, o (b) se pide instalar la aplicación en la pantalla de inicio. Se reabre a favor de **nativa/híbrida** solo si aparece un requisito de push, segundo plano o sensores.
