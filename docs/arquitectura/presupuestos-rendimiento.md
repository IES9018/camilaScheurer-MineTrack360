# Presupuestos de rendimiento (móvil)

**Fecha:** 2026-11-16 · **Relacionado:** [ADR-007](../adr/ADR-007-estrategia-mobile.md); `SPEC.md` (RNF-11 a RNF-13); pantallas críticas P1 (estado de flota y alertas) y P2 (asignación de turno), ver [`docs/diseno/wireframes/`](../diseno/wireframes/).

## 1. Presupuestos
Aplican a las dos pantallas críticas del TP3, en un teléfono de gama media con conexión 4G.

| ID | Métrica | Presupuesto | Herramienta concreta | ¿Corre en CI? |
|---|---|---|---|---|
| RNF-11 | LCP móvil (pintado del elemento mayor) | < 2,5 s | `lighthouse@12.8.2` con su perfil móvil por defecto (red y CPU simuladas) | Opcional (TP6), solo sobre páginas sin sesión |
| RNF-12 | INP (respuesta a un toque) | < 200 ms | Panel *Performance* de Chrome DevTools (interacciones), con emulación móvil. En laboratorio, Lighthouse da **TBT** (< 200 ms) como indicador indirecto | No |
| RNF-13 | JavaScript inicial | < 200 KB gzip | `npm run check:bundle` (`frontend/scripts/check-bundle-size.mjs`) | **Sí**: un paso tras `npm run build` |

Límites que conviene decir de entrada:
- **Lighthouse no mide INP** en una carga de página: INP necesita interacciones reales. Por eso RNF-12 se verifica a mano con DevTools y, como indicio, con TBT. No se agrega la librería `web-vitals` porque exigiría un ADR (R-07).
- La herramienta citada por la consigna para el peso (`source-map-explorer`) no se usa para el control: `check:bundle` no necesita dependencias y falla si se pasa del límite. `source-map-explorer` puede usarse con `npx` solo para diagnosticar *qué* pesa.
- P1 y P2 están detrás del login, y la sesión vive en `sessionStorage`. Lighthouse por línea de comandos no entra solo, por eso se miden con un script de Playwright que inicia la sesión (sección 2.1). Ese script **aproxima** el perfil móvil de Lighthouse; no es Lighthouse.

## 2. Línea base medida (2026-11-16)
Compilación de producción de `frontend/` (Vite 8), sin cambios de código además de este PR.

| Medición | Resultado | Cómo se obtuvo |
|---|---|---|
| JavaScript inicial | **63,9 KB gzip** (un solo chunk, sin separación por rutas) | `npm run build && npm run check:bundle` |
| CSS inicial | 3,25 KB gzip | Salida de `vite build` |
| LCP de `/login` (móvil) | 1,5 s · 1,4 s · 1,4 s | `lighthouse@12.8.2`, 3 corridas, contra `vite preview` |
| TBT de `/login` | 20 ms · 0 ms · 0 ms | Ídem |
| CLS de `/login` | 0 | Ídem |

**Qué NO se midió** (y por lo tanto no se afirma):
- Mediciones sobre un dispositivo real o con una red real: Lighthouse simula la red y la CPU.
- El efecto de Leaflet (RF-04) y Recharts (RF-09), que aún no están en el bundle. Al sumarlos, el presupuesto de 200 KB se consume; `check:bundle` lo va a mostrar.

## 2.1 Medición de P1 y P2 (2026-11-18)
**Entorno:** build de producción de `frontend/` servido con `vite preview` (con el proxy `/api` hacia el backend), backend compilado y PostgreSQL 16 con los datos de demo (6 vehículos, alertas 2 CRÍTICO, 1 ADVERTENCIA, 3 OK), usuario con rol supervisor. **Método:** Chromium de Playwright emulando un Moto G4, CPU 4 veces más lenta, red de 1,6 Mbps con 150 ms de latencia, sesión inyectada en `sessionStorage`; 5 corridas por pantalla (script: [`medir-p1-p2.cjs`](medir-p1-p2.cjs)).

| Pantalla | LCP (mín. · mediana · máx.) | TBT (mediana, máx.) | CLS | Evento de toque (máx.) | Datos descargados |
|---|---|---|---|---|---|
| P1 `/alertas` | 1,06 · 1,11 · 1,50 s | 25 ms, 185 ms | 0 | 48 ms (mediana), 72 ms (máx.) | 70 KB |
| P2 `/turnos` | 1,06 · 1,09 · 1,14 s | 5 ms, 27 ms | 0 | 16 ms (mediana), 24 ms (máx.) | 70 KB |

**Repetición:** la medición se corrió dos veces (2026-11-18) con 5 corridas cada una; la tabla muestra la segunda. Los valores varían entre corridas: en la primera, el TBT máximo de P1 fue 116 ms y el evento de toque máximo, 56 ms. Con el TBT máximo de P1 en 185 ms, el margen contra 200 ms es **estrecho**.

**Lectura frente a los presupuestos:** LCP de P1 y P2 **por debajo de 2,5 s** (RNF-11); TBT de la **mediana** por debajo de 200 ms (indicio de RNF-12); el peso del JavaScript sigue en 63,9 KB (RNF-13).

**Límites de esta medición (no se afirma más de lo que muestra):**
- **No es Lighthouse** y no es un teléfono real: es Chromium de escritorio con CPU y red emuladas. Con un dispositivo real los números pueden ser peores.
- **No es INP de campo.** La columna «evento de toque» es la duración de los eventos `pointerdown`/`pointerup`/`click` de **un** clic (en P1, abrir el detalle de una alerta; en P2, elegir un vehículo), lanzado con el mouse de Playwright y no con un toque. Un valor de 0 en una corrida significa que quedó bajo el umbral de 16 ms del navegador. RNF-12 queda **«Indicio favorable», no verificado**.
- **Una trampa que se encontró y se descartó:** en una primera corrida, el «INP» daba 216–240 ms. Eran los eventos de movimiento del mouse (`pointerover`/`mouseover`) del primer desplazamiento de Playwright, que cuestan ~200 ms aun sin ralentizar la CPU; no son interacciones del usuario ni código de la aplicación. Se separó el toque de ese movimiento.
- Un solo entorno, un solo conjunto de datos de demo (6 vehículos): con más filas, P1 tardaría más.

## 3. Cómo repetir las mediciones
```bash
cd frontend
npm ci && npm run build
npm run check:bundle                      # RNF-13 (falla con código 1 si se pasa)

npx vite preview --port 4173 &            # servir lo compilado
npx --yes lighthouse@12.8.2 http://localhost:4173/login \
  --chrome-flags="--headless=new" --only-categories=performance \
  --output=json --output-path=./lh.json  # RNF-11 (LCP) y TBT, solo /login

# P1 y P2 (con sesión): backend y datos de demo en marcha, `playwright` instalado fuera del proyecto
MEDIR_EMAIL=<supervisor> MEDIR_PASSWORD=<clave> node ../docs/arquitectura/medir-p1-p2.cjs
```
`lighthouse@12.8.2` se ejecuta con `npx` y **no** es dependencia del proyecto (R-07): queda declarado acá y en el PR.

## 4. Paso opcional de CI (TP6)
Dentro del job `frontend` de `.github/workflows/ci.yml`, después de **Build**:
```yaml
      - name: Presupuesto de peso del JavaScript (RNF-13)
        run: npm run check:bundle
```
El archivo `ci.yml` lo edita la estudiante a mano. El paso de Lighthouse sobre `/login` es un extra de TP6 y no es parte de este PR.

## 5. Trazabilidad
| Presupuesto | Requisito (SPEC v5) | Decisión | Estado |
|---|---|---|---|
| LCP | RNF-11 | ADR-007 | Cumple en P1 y P2 en laboratorio emulado (sección 2.1) |
| INP | RNF-12 | ADR-007 | Indicio favorable en laboratorio (sección 2.1); sin medición de campo |
| JS inicial | RNF-13 | ADR-007 | **Cumple** (64,2 de 200 KB al 2026-11-19) |
