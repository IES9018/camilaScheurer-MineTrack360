# Frontend de MineTrack360

React 18 + TypeScript (`strict`) + Vite + TailwindCSS. Decisiones en [ADR-004](../docs/adr/ADR-004-stack-ui.md).

El toolchain Node corre en el contenedor `frontend-dev` (SPEC R-06), no en tu computadora.

## Primer uso

Desde la raíz del repositorio:

```
docker compose up -d
docker compose exec frontend-dev npm ci
docker compose exec frontend-dev npm run dev
```

La aplicación queda en <http://localhost:5173>. El backend tiene que estar corriendo (`npm run start:dev` en `backend/`, dentro de `backend-dev`): Vite reenvía `/api` hacia él.

## Comandos (dentro de `frontend/`)

| Comando                                   | Qué hace                                                     |
| ----------------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                             | Servidor de desarrollo con recarga                           |
| `npm run typecheck`                       | Chequeo de tipos                                             |
| `npm run lint:check`                      | ESLint, incluida la revisión de accesibilidad (`jsx-a11y`)   |
| `npm run format:check` / `npm run format` | Verifica / aplica Prettier                                   |
| `npm test`                                | Tests (Vitest), incluido el contraste WCAG AA de los colores |
| `npm run build`                           | Chequeo de tipos y build de producción en `dist/`            |

## Estructura

```
src/
  app/          rutas de la aplicación
  features/     una carpeta por funcionalidad (auth, fleet-alerts, shifts)
  shared/       cliente de la API, componentes y hooks comunes
  styles.css    tokens de color (con contraste verificado por test)
```

## Accesibilidad (RF-12)

Navegación por teclado, foco visible, enlace "Ir al contenido" y colores con contraste AA. Los tokens de `styles.css` están verificados por `styles.contrast.test.ts`: si cambiás un color, el test te avisa.
