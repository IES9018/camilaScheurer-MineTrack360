# Changelog

Todos los cambios relevantes de MineTrack360 se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado, [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Script `docs/arquitectura/medir-p1-p2.cjs` y medición de P1 y P2 (LCP, TBT, CLS) en laboratorio emulado, registrada en `docs/arquitectura/presupuestos-rendimiento.md` (cierra parcialmente N-15).
- Script `docs/arquitectura/medir-movil.cjs`: verifica a 360 px que P1 y P2 no tengan scroll horizontal y que todos sus controles midan ≥ 48 px (RNF-14).

### Changed
- **P1 y P2 adaptadas a móvil** (cierra N-16): en pantallas angostas la tabla de P1 se muestra como tarjetas, el detalle ocupa toda la pantalla, los controles miden ≥ 48 px y el resumen con «Confirmar» de P2 queda fijo abajo. Solo cambian clases de Tailwind; no se agregan dependencias.

## [0.1.0] - 2026-11-17
Primera versión etiquetada: demostración local del núcleo del sistema (autenticación por roles, alertas de mantenimiento y asignación de turnos), con seguridad aplicada, contrato de API, CI y documentación de arquitectura. No incluye telemetría, mapa ni tablero (ver «Alcance de esta versión»).

### Added
- **Backend:** código base con autenticación JWT, roles y vehículos (#12).
- **RF-05, alertas de mantenimiento:** evaluación por umbral de horas (#14) y umbrales persistidos por tipo de vehículo (#24).
- **RF-07, asignación de turnos** sin duplicados, con índices únicos parciales (#26).
- **Frontend** React + Vite + TailwindCSS: base con login y rutas por rol (#28), pantalla P1 de alertas de mantenimiento (#30) y pantalla P2 de asignación de turno (#32), con accesibilidad por teclado y contraste AA (RF-12).
- **Sesión:** aviso en pantalla 5 minutos antes de que venza el token y vuelta al login (ADR-006, #62).
- **Contrato de API** OpenAPI 3.0.3 de los 5 endpoints críticos, con linter limpio (`docs/arquitectura/api-contracts.yaml`, #58).
- **Presupuesto de rendimiento:** comando `npm run check:bundle` (JavaScript inicial < 200 KB gzip) (#64).
- **Demo local:** guía de despliegue y scripts de datos de demostración (`docs/deploy/`, #66).
- **CI de GitHub Actions** (#13): tipado, lint, formato, pruebas con umbral de cobertura, build y auditoría de dependencias; gate de auditoría con excepciones documentadas (#70); lint del contrato OpenAPI y presupuesto de peso del JavaScript (este release).
- **Dependabot** agrupado por tipo de actualización (#53) y plantilla de PR del curso (#16).
- **Documentación:** arquitectura y ADR-001 a ADR-003 (#17), diseño de interfaz y ADR-004 (#20), ADR-005, modelo de amenazas STRIDE y SPEC v4 (#58), ADR-007, presupuestos de rendimiento, política de offline y wireframes móviles (#64), reporte de pruebas del Sprint 2 (#34), auditorías de los Sprints 1, 2 (#36) y 3 (#71), postmortem del cuatrimestre y SPEC final.

### Changed
- **Node 24** alineado en CI, contenedores de desarrollo y README (#22).
- **Sesión JWT:** el vencimiento por defecto baja de 8 h a 1 h (`JWT_EXPIRES_IN`, ADR-006, #62).
- **SPEC** pasa de v1 a la versión final, con sección de requisitos no funcionales, Non-Goals NG-06 y NG-07 y trazabilidad ADR ↔ restricciones.

### Fixed
- Dependencias de producción vulnerables actualizadas con `npm audit fix` y marcadores `CAMBIAR_...` en `.env.example` en lugar de un secreto de ejemplo utilizable (#36).
- Las versiones mayores de `@types/node` y una actualización de `@nestjs/jwt`, mergeadas por error, se revirtieron (#49, #50, #51).
- La guía de demo ahora indica aplicar las migraciones al actualizar el código (`9b4303b`).

### Security
- Límite global de 100 pedidos por minuto por IP; el login conserva 5 por minuto (#60).
- Registro de quién cancela una asignación (`cancelled_by_id`, migración `AddShiftCancelledBy`) (#60).
- Prueba `authorization-coverage.spec.ts`: falla si un endpoint nuevo queda sin control de rol (#60).
- Umbral mínimo de cobertura en CI (#60).
- Modelo de amenazas con 16 amenazas: 14 aplicadas, 1 mitigada parcialmente (T-06) y 1 pendiente (T-13).
- Auditoría de dependencias de producción en CI; una advertencia sin parche publicado (`picomatch`) queda como riesgo aceptado con fecha de revisión (#70, `docs/auditoria/dependencias-riesgo-aceptado.md`).

### Alcance de esta versión
No implementado: RF-03 (ingesta MQTT), RF-04 (mapa), RF-06 (registro de intervenciones), RF-08 (incidentes de velocidad), RF-09 (tablero), RF-10 (exportación) y RF-11 completo (auditoría de operaciones). Tampoco hay despliegue productivo (NG-07), cabeceras de seguridad (T-13) ni la versión móvil de P1 y P2 (RNF-14). El detalle y los motivos están en `SPEC.md` y en `docs/auditoria/auditoria-sprint3.md`.

[Unreleased]: https://github.com/IES9018/camilaScheurer-MineTrack360/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/IES9018/camilaScheurer-MineTrack360/releases/tag/v0.1.0
