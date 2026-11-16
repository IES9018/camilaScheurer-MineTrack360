# ADR-006: Política de sesión — JWT de 1 hora con aviso previo y nuevo inicio de sesión

**Fecha:** 2026-11-16
**Estado:** Propuesto (pasa a Aceptado al aprobarse el PR)
**Relacionado:** [ADR-004](./ADR-004-stack-ui.md) (token en `sessionStorage`); [ADR-005](./ADR-005-estrategia-web.md); [`threat-model-lite.md`](../seguridad/threat-model-lite.md) (T-06); hallazgo H-17 de [`auditoria-sprint1.md`](../auditoria/auditoria-sprint1.md) y [`auditoria-sprint2.md`](../auditoria/auditoria-sprint2.md).

## Contexto
Hechos verificados en el código:
- `JwtAuthGuard` es *stateless*: valida firma (HS256) y vencimiento, y toma el rol del token; **no consulta la base**. Un token con rol viejo, o de un usuario desactivado, sigue valiendo hasta que vence (T-06 / H-17).
- El vencimiento por defecto era de 8 horas (`JWT_EXPIRES_IN`).
- No hay refresh token ni revocación.
- El frontend guarda el token en `sessionStorage` y, ante un 401 con sesión abierta, la cierra.

## Decisión
1. **Vencimiento de 1 hora** (`JWT_EXPIRES_IN=1h` por defecto en `auth.module.ts` y en `.env.example`). Sigue siendo configurable por variable de entorno.
2. **Aviso en pantalla 5 minutos antes** de que venza: el frontend lee el `exp` del propio token (solo para avisar; no valida firma, el backend es quien decide) y muestra un aviso con el botón «Volver a iniciar sesión».
3. **Al vencer, la sesión se cierra** y la aplicación vuelve al login. Como no hay refresh token, la forma de continuar es **iniciar sesión de nuevo**.
4. No se agregan librerías (R-07): el `exp` se lee con `atob` y `JSON.parse`.

## Alternativas Descartadas
| Alternativa | Por qué no |
|---|---|
| Mantener 8 h (riesgo aceptado) | Deja una ventana de 8 h para un token robado o con rol desactualizado; sin otro control, es lo que H-17 señala. |
| Access token corto + **refresh token** (rotación y revocación) | Es la solución más completa, pero exige una tabla de refresh tokens, un endpoint nuevo, su contrato y pruebas. Para el alcance y el plazo de PP3 es desproporcionado. Queda como evolución futura. |
| Consultar la base en cada pedido (estado y rol vigentes) | Resolvería T-06 casi por completo, pero agrega una consulta por pedido y cambia el diseño del guard; se deja para una iteración posterior. |
| Cookie `HttpOnly` | Exige cambios en el backend (cookies, CSRF); ya considerada como alternativa futura en ADR-004. |

## Consecuencias
- **Positivas:** la ventana de exposición de un token baja de 8 h a 1 h sin código de servidor nuevo; el usuario no pierde el trabajo por sorpresa porque recibe el aviso.
- **Negativas / riesgos:**
  - **T-06 se reduce, no se elimina:** durante la hora restante un token con rol viejo o de usuario desactivado sigue siendo válido.
  - Hay que iniciar sesión cada hora; en una jornada de turno largo es una molestia. Si molesta en la práctica, se reabre este ADR a favor del refresh token.
  - Un script con XSS aún puede leer el token (ver ADR-005 y T-13); la política acorta el daño, no lo evita.
  - El aviso depende del reloj del navegador; si está mal, el aviso sale antes o después, pero el backend sigue rechazando el token vencido (401).
- **Revisión:** se reabre si aparece un requisito de sesiones largas o de revocación inmediata.
