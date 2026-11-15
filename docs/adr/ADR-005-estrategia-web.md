# ADR-005: Estrategia web — SPA (React + Vite) que consume la API REST contra un contrato OpenAPI

**Fecha:** 2026-11-15
**Estado:** Propuesto (pasa a Aceptado al aprobarse el PR)
**Relacionado:** [ADR-001](./ADR-001-stack-tecnologico.md) (React 18 + Vite); [ADR-002](./ADR-002-estilo-arquitectonico.md); [ADR-004](./ADR-004-stack-ui.md); [`api-contracts.yaml`](../arquitectura/api-contracts.yaml); [`threat-model-lite.md`](../seguridad/threat-model-lite.md); `SPEC.md` §4, §5 y §7.

## Contexto
El sistema ya tiene un backend NestJS que expone una API REST en `/api/v1` y un frontend React + Vite (`frontend/`) con las pantallas P1 y P2, ambos implementados en el Sprint 2. Hasta ahora nunca se comparó, con criterios, **cómo se entrega la web** (SPA, SSR, MPA o solo API). Este ADR deja por escrito esa decisión y fija el contrato `api-contracts.yaml` como frontera entre ambos lados.

Datos del contexto, verificados en el repositorio:
- Las pantallas son de uso interno (supervisores, mantenimiento, HSE) y exigen iniciar sesión; no hay páginas públicas.
- El frontend usa Zustand y `react-router`; el token JWT se guarda en `sessionStorage` y se envía como `Authorization: Bearer`.
- En desarrollo, Vite reenvía `/api` al backend (`vite.config.ts`, proxy), de modo que el navegador habla con un único origen.
- Desarrolla una sola persona.

**Supuesto, por confirmar:** el destino de despliegue de PP3 todavía no está definido en el repositorio (no hay `docs/deploy/`). Este ADR no depende de un proveedor concreto; si el destino impone otra cosa, se revisa.

## Decisión
1. **SPA**: se mantiene React + Vite como aplicación de una sola página que consume la API REST. No se agrega SSR ni un segundo servidor de renderizado.
2. **El contrato va primero**: `docs/arquitectura/api-contracts.yaml` (OpenAPI 3.0.3) es la fuente de verdad de la frontera frontend↔backend. Todo endpoint nuevo se declara ahí **antes** de implementarse (regla del arnés v3). El contrato se valida con un linter (`docs/arquitectura/README.md`).
3. **Mismo origen en producción**: se sirve el frontend compilado y `/api` bajo el mismo origen (proxy inverso), como ya ocurre en desarrollo con el proxy de Vite. Con eso no se habilita CORS abierto. El detalle de la configuración de producción se cierra en la guía de despliegue (pendiente; hallazgo N-08 de la auditoría del Sprint 2).
4. **Seguridad del cliente**: el token vive en `sessionStorage` (se borra al cerrar la pestaña) y la API es la que decide los permisos; el frontend solo oculta o explica, nunca autoriza. Las amenazas y mitigaciones se registran en el modelo de amenazas.

## Alternativas Descartadas
Criterios: (a) SEO, (b) complejidad del estado del cliente, (c) destino de despliegue de PP3, (d) tamaño del equipo, (e) compatibilidad con ADR-002 y con lo ya implementado.

| Criterio | SPA + API REST (elegida) | SSR (p. ej. Next.js) | MPA clásica (HTML renderizado en el servidor) | Solo API + frontend existente de otro proyecto |
|---|---|---|---|---|
| (a) SEO | **No aplica**: todo está tras el login, sin páginas públicas que indexar | Su ventaja principal (HTML indexable) no se aprovecha | Ídem | No aplica |
| (b) Estado del cliente | Adecuado: P2 mantiene selección, confirmación y deshacer entre pasos; Zustand lo cubre | También lo resuelve, pero suma la frontera servidor/cliente | Cada acción recarga la página; el deshacer y la selección múltiple se complican | Depende de ese frontend |
| (c) Destino de PP3 | Solo requiere servir archivos estáticos y un proxy a `/api` *(supuesto, destino sin definir)* | Exige un proceso Node adicional en producción | Exige plantillas en el backend | No hay un frontend existente que reutilizar |
| (d) Equipo de una persona | Es lo que ya está construido y probado; costo de cambio nulo | Reescritura parcial y un framework nuevo (R-07 pide ADR) | Reescribir P1 y P2 | No aplica |
| (e) Compat. ADR-002 / lo existente | Total: el monolito modular no cambia | El backend sigue igual, pero se duplica la capa de datos | Mezcla vistas con el backend, contra ADR-002 | El requisito RF-12 y las pruebas de P1/P2 se perderían |

## Consecuencias
- **Positivas:** cero reescritura; el contrato permite probar el frontend contra datos simulados sin el backend; la API queda reutilizable por una futura app móvil (TP5).
- **Negativas / riesgos:**
  - La SPA descarga todo el JavaScript antes de mostrar algo; se vigila con el presupuesto de rendimiento del TP5.
  - Un token en `sessionStorage` es legible por cualquier script de la página (riesgo XSS). Se mitiga con React (escapa por defecto) y con cabeceras de seguridad, **aún pendientes** (hallazgo N-01, requiere su propio ADR por ser una librería nueva, R-07).
  - **El contrato se escribió después de implementar los 5 endpoints críticos** del Sprint 2, no antes. No es API-first puro; se compensó contrastando el contrato contra la API real (ver `docs/arquitectura/README.md`). Desde el arnés v3 el orden pasa a ser obligatorio.
  - `@redocly/cli` se usa vía `npx` y no es dependencia del proyecto; queda declarado aquí y en el PR (R-07).
- **Revisión:** se reabre este ADR si aparece una página pública que necesite SEO o si el destino de despliegue no admite servir estáticos con proxy.
