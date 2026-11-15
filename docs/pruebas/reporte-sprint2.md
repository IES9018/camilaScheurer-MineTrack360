# Reporte de pruebas — Sprint 2

**Proyecto:** MineTrack360 · **Alcance:** RF-05 (alertas de mantenimiento), RF-07 (asignación de turnos), RF-12 (accesibilidad de P1 y P2) · **Fecha:** 2026-11-14
**Estudiante:** Camila Scheurer · **Base:** rama `develop` con los PR #12 a #26 del backend y la interfaz (base, P1 y P2) integrados.

> Este reporte distingue lo que **se ejecutó y se vio** (con su resultado) de lo que **queda sin verificar**. No se declara cumplido nada que no tenga la evidencia indicada.

## 1. Entorno y método

| Elemento | Valor |
|---|---|
| Ejecución | Entorno Linux de desarrollo (no es Windows ni Docker Compose) |
| Node | 24.22.3 (el mismo major que CI y `docker-compose.yml`) |
| Base de datos | PostgreSQL 16 **sin** TimescaleDB; migraciones aplicadas (la migración `enable-timescaledb` no se pudo probar aquí) |
| Navegador | Chromium headless (Playwright), `es-AR`; interfaz servida por Vite con proxy a la API |
| Accesibilidad automática | axe-core 4 con reglas WCAG 2.0/2.1 A y AA |
| Datos de prueba | 4 vehículos (CAM-009, CAM-014, CAM-021, CAM-030), 2 operadores y un usuario por rol (`admin`, `supervisor`, `mantenimiento`, `hse`, `lectura`). Para el escenario del 92 % se ajustó CAM-009 a 460 h desde el último service |

Las verificaciones de navegador (secciones 4 y 6) se hicieron con un script externo que **no está versionado** en el repositorio: usa Playwright y axe-core, que no son dependencias del proyecto (R-07 pide un ADR antes de sumarlas). Por eso la sección 8 incluye el procedimiento manual para repetirlas.

## 2. Resumen

| Criterio | Resultado | Evidencia |
|---|---|---|
| CA-03 — alerta WARNING/CRITICAL al superar 90 %/100 % | **Cumplido** | Tests unitarios de límites + escenarios 1 a 3 de P1 en navegador con la API real (§3, §4) |
| CA-07 — P1 y P2 solo con teclado y contraste AA | **Cumplido con una salvedad** | Recorrido solo con teclado, axe sin violaciones, test de contraste (§6). **No se probó con lector de pantalla** |
| CA-05 — cobertura backend ≥ 70 % en módulos críticos | **Parcial, no se marca** | `maintenance` 84 % y `shifts` 86 %, pero `auth` 21 %, `vehicles` 58 % y total 57 % (§3.2) |
| CA-01 — JWT y acceso por rol | No se marca (es de Sprint 1) | La matriz de permisos de §5 es correcta, pero `auth.service` y `auth.controller` no tienen tests unitarios (§7) |
| CA-02, CA-04, CA-06 | Fuera del Sprint 2 | RF-03/RF-04 (MQTT y mapa) quedan pendientes; sin pruebas de carga ni de `docker compose up` en entorno limpio |

Defecto encontrado y corregido durante la verificación: **D-01** (§7).

## 3. Pruebas automatizadas del repositorio

### 3.1 Resultado

| Paquete | Suites | Pruebas | Resultado |
|---|---|---|---|
| Backend (Jest) | 8 | 103 | Todas pasan |
| Frontend (Vitest) | 9 archivos | 97 | Todas pasan; además `typecheck`, `lint:check`, `format:check` y `build` sin errores |

Qué cubren las pruebas de este sprint:
- **RF-05:** límites de umbral (460/500 → WARNING, 500 → CRITICAL, tipo sin umbral → `NO_THRESHOLD`), orden de alertas, validación de `lastServiceHours`, permisos por rol.
- **RF-07:** disponibilidad con los tres motivos (`NOT_ACTIVE`, `CRITICAL_ALERT`, `ALREADY_ASSIGNED`), asignación, conflicto 409, cancelación y permisos.
- **Interfaz:** modelo de orden/filtro/formato de P1 y P2, comportamiento de ambas pantallas (carga, vacío, error, 401, 403, 409, teclado), rutas por rol y contraste de los tokens de color.

### 3.2 Cobertura del backend (`npm run test:cov`)

| Módulo | Sentencias | Comentario |
|---|---|---|
| `maintenance` | 84,3 % | Servicios y controlador al 100 %; el repositorio (63,6 %) se ejercita contra base de datos real |
| `shifts` | 86,2 % | `shifts.service` 98,7 %; `shifts.repository` 44,4 % por lo mismo |
| `vehicles` | 58,2 % | `vehicles.controller` en 0 % |
| `auth` | 21,0 % | `auth.service` y `auth.controller` en 0 % |
| **Total** | **57,4 %** | |

## 4. Escenarios de interfaz de la SPEC §6.1

Resultado de cada escenario ejecutado en el navegador contra la API y la base reales.

| # | Escenario | Resultado | Observado |
|---|---|---|---|
| P1-1 | El supervisor ve primero lo más urgente | ✅ | Con rol `mantenimiento`: orden Crítico (CAM-014), Advertencia (CAM-009), OK (CAM-021), OK (CAM-030); cada estado con ícono, texto y color |
| P1-2 | Alerta al 90 % | ✅ | CAM-009: «⚠ Advertencia · 460 / 500 h · 92 %» |
| P1-3 | Alerta crítica al superar el intervalo | ✅ | CAM-014: «⛔ Crítico · 505 / 500 h · 101 %»; el detalle dice «Superó el intervalo por 5 h. Programar service.» |
| P1-4 | Rol sin permiso | ✅ | Con rol `hse` en `/alertas`: «No tenés permiso para ver esta sección.» (y la API responde 403) |
| P2-1 | Asignación exitosa | ✅ | Tarde, CAM-009 y Gómez, Luis: «Asignado: CAM-009 a Gómez, Luis, turno Tarde del 14/11.» con «Deshacer»; al deshacer, el vehículo vuelve a quedar disponible |
| P2-2 | Doble asignación bloqueada | ✅ con ajuste | Los datos de prueba asignan CAM-009 al turno **Mañana**, no a Tarde: aparece «No disponible: ya asignado a Gómez, Luis» y el botón no se puede elegir. El mismo motivo para el turno Tarde lo cubre `shifts.service.spec` |
| P2-3 | Vehículo con alerta crítica | ✅ | CAM-014: «No disponible: alerta crítica de mantenimiento», no seleccionable |
| P2-4 | Rol sin permiso de asignación | ✅ (tras corregir D-01) | Con rol `mantenimiento` en `/turnos`: «Permisos insuficientes para asignar turnos.»; el enlace «Turnos» no aparece en el menú |
| RF12-1 | Operación solo con teclado | ✅ | Ver §6.2 |
| RF12-2 | Contraste AA | ✅ | Ver §6.1 |

Además se verificó que un vehículo en mantenimiento (CAM-030) aparece como «No disponible: no está activo» y que `hse` en la raíz ve «Sin secciones disponibles».

## 5. Permisos de la API por rol

Códigos HTTP observados contra la API real (sin token: 401).

| Rol | `GET /maintenance/alerts` | `GET /shifts/availability` | `GET /operators` | `POST /operators` (cuerpo vacío) |
|---|---|---|---|---|
| admin | 200 | 200 | 200 | 400 (validación; tiene permiso) |
| supervisor | 200 | 200 | 200 | 403 |
| mantenimiento | 200 | 403 | 403 | 403 |
| hse | 403 | 403 | 403 | 403 |
| lectura | 403 | 403 | 403 | 403 |

Coincide con los `@Roles(...)` de los controladores y con el espejo de la interfaz (`roles.ts`). También se observó el límite de intentos de login: tras 5 logins en un minuto, el sexto respondió 429.

## 6. Accesibilidad (RF-12, CA-07)

### 6.1 Contraste

El test `styles.contrast.test.ts` lee los colores de `styles.css` y falla si un par baja del mínimo. Valores calculados:

| Par | Contraste | Mínimo |
|---|---|---|
| Texto principal sobre blanco / sobre fondo de página | 17,7 / 16,1 | 4,5 |
| Texto secundario sobre blanco / sobre fondo de página | 7,6 / 6,9 | 4,5 |
| Texto blanco sobre botón principal (normal / activo) | 6,7 / 8,7 | 4,5 |
| OK: verde sobre su fondo | 6,5 | 4,5 |
| Advertencia: ámbar sobre su fondo | 6,4 | 4,5 |
| Crítico: rojo sobre su fondo | 6,8 | 4,5 |
| Borde de componentes sobre blanco | 4,8 | 3 |
| Enlace/anillo de foco (azul) sobre blanco | 6,7 | 3 |

### 6.2 Teclado y herramienta automática

| Verificación | Resultado |
|---|---|
| axe-core (WCAG 2.0/2.1 A y AA) en la pantalla de sin permiso, P1 (lista y detalle) y P2 (inicial y con selección) | 0 violaciones en las 5 revisiones (la pantalla de login no se revisó con axe) |
| P1 solo con teclado | Tab recorre enlace «Ir al contenido», menú, «Cerrar sesión», «Recargar», filtro, orden y cada vehículo; Enter abre el detalle y mueve el foco a él; Esc lo cierra y devuelve el foco al vehículo |
| P2 solo con teclado | Flechas cambian el turno; Tab y Espacio eligen vehículo y operador; Enter confirma; Deshacer funciona con Enter. Esc como descarte de la selección lo cubre un test de la pantalla, no se repitió en el navegador |
| Foco visible | Se midió el estilo calculado del elemento enfocado: contorno presente de al menos 2 px en las 11 paradas de P1 y en la parada medida de P2 (el primer vehículo). El CSS define 3 px para todo elemento enfocado; en P2 no se midió cada parada |

**Salvedad:** axe detecta solo una parte de los problemas de accesibilidad. No se probó con lector de pantalla ni con zoom/alto contraste del sistema, por lo que la verificación manual de §8 queda como confirmación final.

## 7. Defectos y deuda detectados

| Id | Tipo | Descripción | Estado |
|---|---|---|---|
| D-01 | Defecto | Con rol `mantenimiento`, `/turnos` mostraba «No tenés permiso para ver esta sección.» y la SPEC (escenario P2-4) y el wireframe P2 piden «Permisos insuficientes para asignar turnos.» | **Corregido** en este PR: `RequireRole` admite un mensaje propio y P2 usa el de la SPEC. Tests agregados para ambos mensajes |
| T-01 | Deuda | `auth.service` y `auth.controller` (login) no tienen tests unitarios (0 %): el login se probó solo de forma manual y en el navegador | Abierta. Cubrirla acerca CA-05 y respalda CA-01 |
| T-02 | Deuda | Los repositorios (acceso a base) tienen baja cobertura porque necesitan base real; sus consultas, el índice único contra doble asignación y la concurrencia se verificaron a mano contra PostgreSQL, sin pruebas repetibles en el repositorio | Abierta. Propuesta: pruebas de integración con PostgreSQL como servicio en CI |
| T-03 | Limitación | La migración con TimescaleDB, Docker Compose en Windows y el job de CI del frontend no se ejecutaron en este entorno | Abierta. Los resultados de CI se consultan en GitHub Actions |
| T-04 | Limitación | El script de navegador no está en el repositorio | Abierta. Si se agregan pruebas end to end, requieren un ADR (R-07) |

## 8. Procedimiento manual para repetir la verificación (≈ 10 minutos)

Con el backend y `frontend-dev` levantados (ver README), cargar al menos un vehículo cercano al umbral (p. ej. 460 h desde el service con intervalo 500).

1. **P1 con teclado:** ingresar como supervisor, usar solo Tab, Shift+Tab, Enter y Esc. Comprobar que todo se alcanza, que el foco se ve en cada elemento y que Esc cierra el detalle.
2. **P2 con teclado:** en Turnos, cambiar el turno con las flechas, elegir vehículo y operador con Tab y Espacio, confirmar con Enter y deshacer.
3. **Permisos:** con `mantenimiento`, abrir `/turnos` y leer el mensaje; con `hse`, abrir `/alertas`.
4. **Zoom:** a 200 % de zoom no debe aparecer scroll horizontal en la página (la tabla de P1 puede desplazarse dentro de su caja).
5. **Lector de pantalla** (NVDA en Windows): recorrer la tabla de P1 y los grupos de opciones de P2 y confirmar que anuncia estado, motivos de bloqueo y mensajes de éxito o error.
