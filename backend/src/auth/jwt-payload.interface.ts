import type { Request } from 'express';
import type { RoleName } from './role.entity';

/** Datos que viajan firmados dentro del token JWT. */
export interface JwtPayload {
  /** Id del usuario (claim estándar "sub"). */
  sub: number;
  email: string;
  role: RoleName;
}

/** Request de Express una vez que JwtAuthGuard validó el token. */
export type AuthenticatedRequest = Request & { user: JwtPayload };
