import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { AppController } from '../app.controller';
import { MaintenanceController } from '../maintenance/maintenance.controller';
import { OperatorsController } from '../shifts/operators.controller';
import { ShiftsController } from '../shifts/shifts.controller';
import { VehiclesController } from '../vehicles/vehicles.controller';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

/**
 * Modelo de amenazas, T-05: RolesGuard deja pasar a cualquier usuario
 * autenticado si un endpoint no tiene @Roles. Esta prueba falla si aparece un
 * endpoint nuevo sin @Roles que no esté en la lista de excepciones, o un
 * controlador nuevo que no esté en la lista de controladores revisados.
 */
const CONTROLLERS = [
  AppController,
  AuthController,
  VehiclesController,
  MaintenanceController,
  ShiftsController,
  OperatorsController,
];

/** Endpoints sin @Roles a propósito. Cada uno con su motivo. */
const WITHOUT_ROLES: Record<string, string> = {
  'AppController.getHello': 'público: mensaje de estado',
  'AuthController.login': 'público: es el inicio de sesión',
  'AuthController.me':
    'solo requiere token: devuelve los datos del propio token',
};

const PUBLIC = new Set(['AppController.getHello', 'AuthController.login']);

interface Handler {
  key: string;
  controller: new (...args: never[]) => unknown;
  name: string;
}

const handlers: Handler[] = CONTROLLERS.flatMap((controller) =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter(
      (name) =>
        name !== 'constructor' &&
        Reflect.hasMetadata(
          METHOD_METADATA,
          controller.prototype[name as never],
        ),
    )
    .map((name) => ({
      key: `${controller.name}.${name}`,
      controller: controller as Handler['controller'],
      name,
    })),
);

const rolesOf = (h: Handler): unknown[] | undefined =>
  (Reflect.getMetadata(ROLES_KEY, h.controller.prototype[h.name as never]) ??
    Reflect.getMetadata(ROLES_KEY, h.controller)) as unknown[] | undefined;

const guardsOf = (h: Handler): unknown[] => [
  ...((Reflect.getMetadata(GUARDS_METADATA, h.controller) as unknown[]) ?? []),
  ...((Reflect.getMetadata(
    GUARDS_METADATA,
    h.controller.prototype[h.name as never],
  ) as unknown[]) ?? []),
];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });

describe('cobertura de autorización de los endpoints (T-05)', () => {
  it('revisa todos los controladores del código fuente', () => {
    const declared = sourceFiles(join(__dirname, '..'))
      .filter((f) => f.endsWith('.controller.ts'))
      .filter((f) => /@Controller\(/.test(readFileSync(f, 'utf8')));

    expect(declared).toHaveLength(CONTROLLERS.length);
  });

  it('encuentra los 14 endpoints esperados', () => {
    expect(handlers).toHaveLength(14);
  });

  it.each(handlers)(
    '$key tiene @Roles o está en la lista de excepciones',
    (h) => {
      const roles = rolesOf(h);
      if (roles && roles.length > 0) {
        expect(WITHOUT_ROLES[h.key]).toBeUndefined();
      } else {
        expect(WITHOUT_ROLES[h.key]).toBeDefined();
      }
    },
  );

  it.each(handlers.filter((h) => !PUBLIC.has(h.key)))(
    '$key exige autenticación (JwtAuthGuard) y, con @Roles, RolesGuard',
    (h) => {
      const guards = guardsOf(h);
      expect(guards).toContain(JwtAuthGuard);
      if ((rolesOf(h) ?? []).length > 0) {
        expect(guards).toContain(RolesGuard);
      }
    },
  );

  it('las excepciones listadas existen (sin entradas obsoletas)', () => {
    const keys = new Set(handlers.map((h) => h.key));
    for (const key of Object.keys(WITHOUT_ROLES)) {
      expect(keys.has(key)).toBe(true);
    }
  });
});
