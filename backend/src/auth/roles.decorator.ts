import { SetMetadata } from '@nestjs/common';
import { RoleName } from './role.entity';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint (o un controlador entero) a ciertos roles.
 * Uso: @Roles('admin', 'supervisor'). Lo aplica RolesGuard.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
