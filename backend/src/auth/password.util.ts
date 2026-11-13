import * as bcrypt from 'bcrypt';

/**
 * Factor de costo de bcrypt. El informe lo fija en 12 (sección 5.1)
 * y el requisito RNF-03 exige un mínimo de 10.
 */
export const BCRYPT_COST = 12;

/** Genera el hash bcrypt de una contraseña en texto plano. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/** Compara una contraseña en texto plano contra un hash bcrypt. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
