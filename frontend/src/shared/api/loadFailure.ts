import { ApiError } from './client';

/**
 * Por qué falló una carga de datos:
 * - `forbidden`: el backend respondió 403 (el rol no alcanza);
 * - `server`: el backend respondió con otro error (500, 404, etc.): hay conexión, falla el servidor;
 * - `network`: no hubo respuesta (sin conexión, servidor caído, corte).
 */
export type LoadFailure = 'forbidden' | 'server' | 'network';

export function loadFailure(error: unknown): LoadFailure {
  if (error instanceof ApiError) {
    return error.status === 403 ? 'forbidden' : 'server';
  }
  return 'network';
}

/** Texto para un fallo de carga que no es de permisos. `what`: «las alertas», «la disponibilidad». */
export function loadFailureText(
  failure: 'server' | 'network',
  what: string,
): string {
  return failure === 'network'
    ? `No se pudo conectar con el servidor para cargar ${what}. Revisá la conexión.`
    : `El servidor no pudo cargar ${what}. Reintentá en unos minutos; si sigue fallando, avisá al administrador.`;
}
