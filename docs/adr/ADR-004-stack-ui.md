# ADR-004: Stack de interfaz — TailwindCSS sobre React + Vite

**Fecha:** 2026-11-13
**Estado:** Propuesto (pasa a Aceptado al aprobarse el PR)
**Relacionado:** [ADR-001](./ADR-001-stack-tecnologico.md) (React 18 + Vite); [ADR-002](./ADR-002-estilo-arquitectonico.md); `SPEC.md` §4, RF-12 y R-07.

## Contexto
El frontend (`frontend/`) todavía no existe. ADR-001 fijó React 18 + Vite y `SPEC.md` §4 nombra TailwindCSS, pero nunca se evaluó con criterios. Las reglas del arnés (R-07) exigen un ADR antes de incorporar una librería. Las 2 pantallas críticas del TP3 (`docs/diseno/wireframes/`) deben cumplir RF-12 (teclado y contraste AA) y ser legibles en tablet (≥ 768 px, RNF-06 del informe PP2). Desarrolla una sola persona.

## Decisión
**TailwindCSS** para el estilado, con **elementos HTML nativos** (`button`, `table`, `input type=radio`, `select`) como base de accesibilidad. No se agrega ninguna librería de componentes. Si más adelante hace falta una (por ejemplo, un diálogo o combo complejo), se evalúa en un ADR nuevo (R-07).

Instalación prevista (según la guía oficial de Tailwind para Vite): `npm install tailwindcss @tailwindcss/vite`, el plugin `tailwindcss()` en `vite.config.ts` y `@import "tailwindcss";` en el CSS. Se ejecuta dentro del contenedor de desarrollo (R-06). **La implementación no forma parte del TP3**: se hace en el PR del frontend de Sprint 2.

## Alternativas Descartadas
Criterios: (a) curva de aprendizaje, (b) ecosistema, (c) accesibilidad lista para usar, (d) compatibilidad con ADR-002, (e) control de contraste y foco.

| Criterio | Tailwind + HTML nativo (elegida) | Librería de componentes (p. ej. MUI) | CSS plano / CSS Modules |
|---|---|---|---|
| (a) Curva | Media: hay que aprender las clases, pero ya figura en el informe PP2 | Media-alta: API propia de cada componente | Baja al inicio, más trabajo repetido |
| (b) Ecosistema | Muy usado con React y Vite *(afirmación general, sin medir)* | Amplio, con componentes ya hechos | Sin dependencias |
| (c) Accesibilidad | **Ninguna por sí sola**: Tailwind solo estila; la accesibilidad viene del HTML semántico y de nuestras pruebas | *Supuesto, por verificar:* los componentes suelen traer manejo de teclado y ARIA | Ninguna por sí sola |
| (d) Compat. ADR-002 | Solo afecta al frontend; el monolito del backend no cambia | Idem | Idem |
| (e) Contraste y foco | Total: se definen tokens de color con contraste calculado (ver auditoría §3) | Se debe sobrescribir el tema para cumplir los colores propuestos | Total, pero sin tokens compartidos |

- **Librería de componentes (MUI):** descartada por ahora. Suma peso y una API propia para un alcance de 2 pantallas, y obliga a ajustar el tema para respetar la paleta con contraste verificado. Se reabre si los componentes nativos no alcanzan para RF-12.
- **CSS plano / Modules:** descartado por repetición de estilos y porque el informe PP2 ya definió Tailwind como sistema de diseño (§8.1).

## Consecuencias
- **Positivas:** control total del contraste y el foco; sin dependencias de UI adicionales; coherencia con el informe PP2.
- **Negativas / Riesgos:**
  - Tailwind no aporta accesibilidad: la responsabilidad recae en usar HTML semántico y en la verificación manual de RF-12.
  - El toolchain debe correr en contenedor (R-06) y el servicio `backend-dev` usa `node:20`: hay que definir un servicio o imagen para el frontend con aprobación explícita sobre `docker-compose.yml`. *Supuesto sin verificar:* el requisito de versión de Node de Vite/Tailwind (la guía de instalación no lo indica).
  - Clases largas en el JSX; mitigación: componentes pequeños reutilizables.

## Cuándo reabrir esta decisión
Si la verificación manual de RF-12 falla por falta de componentes accesibles, o si el tamaño del frontend supera lo que se puede mantener solo con HTML nativo.
