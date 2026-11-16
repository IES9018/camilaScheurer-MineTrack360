/** Aviso previo al vencimiento de la sesión (ADR-006): 5 minutos antes. */
export const WARNING_BEFORE_MS = 5 * 60 * 1000;

/**
 * Lee el vencimiento (`exp`, en segundos) del payload del JWT y lo devuelve en
 * milisegundos. Solo sirve para avisar en pantalla: no valida la firma y el
 * backend es quien decide si el token vale. Devuelve null si no se puede leer.
 */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}
