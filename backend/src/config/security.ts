/** Largo mínimo del secreto JWT en producción (HS256 pide al menos 256 bits). */
export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * La documentación interactiva (Swagger) muestra toda la superficie de la API,
 * así que no se publica en producción (auditoría S1, H-13).
 */
export function isApiDocsEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}

/**
 * En producción el secreto JWT tiene que ser largo y no puede ser el valor de
 * ejemplo de `.env.example` (auditoría S1, H-01). En desarrollo no se exige,
 * para no complicar el arranque local.
 *
 * @throws Error si el secreto es débil y NODE_ENV es "production".
 */
export function assertStrongJwtSecret(
  secret: string,
  nodeEnv: string | undefined,
): void {
  if (nodeEnv !== 'production') return;
  if (secret.length < MIN_JWT_SECRET_LENGTH || /^CAMBIAR/i.test(secret)) {
    throw new Error(
      `JWT_SECRET débil: en producción debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres y no ser el valor de ejemplo`,
    );
  }
}
