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
- P1 y P2 están detrás del login, y la sesión vive en `sessionStorage`. Lighthouse por línea de comandos no entra solo: medirlas requiere un flujo con sesión (por ejemplo, un script de Playwright), que queda para la demo desplegada.

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
- LCP, TBT e INP de **P1 y P2**: requieren sesión y backend con datos.
- Mediciones sobre un dispositivo real o con una red real: Lighthouse simula la red y la CPU.
- El efecto de Leaflet (RF-04) y Recharts (RF-09), que aún no están en el bundle. Al sumarlos, el presupuesto de 200 KB se consume; `check:bundle` lo va a mostrar.

## 3. Cómo repetir las mediciones
```bash
cd frontend
npm ci && npm run build
npm run check:bundle                      # RNF-13 (falla con código 1 si se pasa)

npx vite preview --port 4173 &            # servir lo compilado
npx --yes lighthouse@12.8.2 http://localhost:4173/login \
  --chrome-flags="--headless=new" --only-categories=performance \
  --output=json --output-path=./lh.json  # RNF-11 (LCP) y TBT, solo /login
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
| LCP | RNF-11 | ADR-007 | Base de `/login` medida; P1/P2 sin medir |
| INP | RNF-12 | ADR-007 | Sin medir |
| JS inicial | RNF-13 | ADR-007 | **Cumple** (63,9 de 200 KB) |
