# Riesgo aceptado — dependencias de producción

| Campo | Valor |
|---|---|
| Advisory | GHSA-fc5q-39xc-vjpf — ReDoS en `picomatch` con extglobs repetidos en una sola rama |
| Severidad | high |
| Paquete afectado | `picomatch` <= 4.0.7 (rango reportado por npm: `<=4.0.7`) |
| Versión parcheada | **no publicada** (`first_patched_version: null` en GitHub Advisories) |
| Cadena | `typeorm@1.1.3` → `tinyglobby@0.2.17` → `fdir@6.5.0` → `picomatch@4.0.7` |
| Alcance | dependencia de producción (por eso la detecta `npm audit --omit=dev`) |
| Único "fix" ofrecido por npm | `typeorm@0.3.31` (downgrade mayor, línea `legacy`) |
| Decisión | **Riesgo aceptado** y verificado por el gate `backend/scripts/audit-gate.mjs` |
| Justificación | No hay versión superior a 4.0.7 publicada: no existe actualización posible. El downgrade de TypeORM cambiaría la línea del ORM en un merge de cierre, sin garantías sobre CLI de migraciones ni carga de entidades, y sólo traslada el problema a `minimatch` (3 moderate). |
| Exposición evaluada | Baja: los patrones glob que llegan a `picomatch` en este proyecto son literales y fijos en `src/database/data-source.ts` (`join(__dirname, '..', '**', '*.entity.{ts,js}')`), no provienen de entrada de usuario. |
| Revisión | antes del 2026-12-15, o antes si `picomatch` publica versión superior a 4.0.7 |
