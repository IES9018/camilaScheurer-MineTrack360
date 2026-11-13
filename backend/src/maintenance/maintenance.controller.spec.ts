import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type {
  AuthenticatedRequest,
  JwtPayload,
} from '../auth/jwt-payload.interface';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

/**
 * Reemplazo de JwtAuthGuard para no depender de JWT_SECRET ni de la base de
 * datos: el rol llega en la cabecera x-test-role. RolesGuard es el real.
 */
class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.headers['x-test-role'];
    if (typeof role !== 'string') {
      throw new UnauthorizedException('Token de acceso requerido');
    }
    req.user = { sub: 1, email: 'test@minetrack360.com', role } as JwtPayload;
    return true;
  }
}

describe('POST /api/v1/maintenance/threshold-evaluation', () => {
  let app: INestApplication<App>;
  const url = '/api/v1/maintenance/threshold-evaluation';
  const validBody = {
    totalEngineHours: 1850.5,
    lastServiceHours: 1500,
    intervalHours: 400,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [MaintenanceService],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication<INestApplication<App>>();
    // Misma configuración de validación que main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con el estado calculado para un rol habilitado', async () => {
    const res = await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'mantenimiento')
      .send(validBody)
      .expect(200);

    expect(res.body).toEqual({
      status: 'OK',
      hoursSinceService: 350.5,
      ratio: 0.8763,
    });
  });

  it('responde WARNING al alcanzar el 90 % del intervalo', async () => {
    const res = await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'supervisor')
      .send({ ...validBody, totalEngineHours: 1860 })
      .expect(200);

    expect((res.body as { status: string }).status).toBe('WARNING');
  });

  it('responde CRITICAL al superar el 100 % del intervalo', async () => {
    const res = await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'admin')
      .send({ ...validBody, totalEngineHours: 2000 })
      .expect(200);

    expect((res.body as { status: string }).status).toBe('CRITICAL');
  });

  it('responde 401 sin autenticación', async () => {
    await request(app.getHttpServer()).post(url).send(validBody).expect(401);
  });

  it.each(['hse', 'lectura'])('responde 403 para el rol %s', async (role) => {
    await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', role)
      .send(validBody)
      .expect(403);
  });

  it('responde 400 con intervalHours = 0', async () => {
    await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'admin')
      .send({ ...validBody, intervalHours: 0 })
      .expect(400);
  });

  it('responde 400 si falta un campo', async () => {
    await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'admin')
      .send({ totalEngineHours: 100, lastServiceHours: 0 })
      .expect(400);
  });

  it('responde 400 ante propiedades no declaradas en el DTO', async () => {
    await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'admin')
      .send({ ...validBody, extra: 'no permitido' })
      .expect(400);
  });

  it('responde 400 si el último servicio supera las horas acumuladas', async () => {
    await request(app.getHttpServer())
      .post(url)
      .set('x-test-role', 'admin')
      .send({ ...validBody, lastServiceHours: 5000 })
      .expect(400);
  });
});
