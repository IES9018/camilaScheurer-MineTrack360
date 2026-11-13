import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-payload.interface';
import { RoleName } from './role.entity';
import { ROLES_KEY } from './roles.decorator';

/**
 * Guard de autorización por rol (RF-02 y HU-07). Debe usarse DESPUÉS de
 * JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      RoleName[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // Sin @Roles, basta con estar autenticado
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !requiredRoles.includes(user.role)) {
      // HU-07: "el sistema deniega el acceso y muestra un mensaje de permisos insuficientes"
      throw new ForbiddenException(
        'Permisos insuficientes para acceder a este recurso',
      );
    }
    return true;
  }
}
