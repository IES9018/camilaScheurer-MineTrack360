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
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

/** Reemplazo de JwtAuthGuard: el rol llega en x-test-role. RolesGuard es el real. */
class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.headers['x-test-role'];
    if (typeof role !== 'string') {
      throw new UnauthorizedException('Token de acceso requerido');
    }
    req.user = { sub: 42, email: 'test@minetrack360.com', role } as JwtPayload;
    return true;
  }
}

const calls: Array<[string, unknown[]]> = [];
const shiftsStub = {
  getAvailability: (q: unknown) => {
    calls.push(['availability', [q]]);
    return Promise.resolve({
      date: '2026-11-13',
      shift: 'AFTERNOON',
      vehicles: [],
      operators: [],
    });
  },
  assign: (dto: unknown, userId: number) => {
    calls.push(['assign', [dto, userId]]);
    return Promise.resolve({ id: 9 });
  },
  cancel: (id: number) => {
    calls.push(['cancel', [id]]);
    return Promise.resolve({ id, status: 'CANCELLED' });
  },
};
const operatorsStub = {
  findAll: () => Promise.resolve([]),
  create: (dto: { employeeCode: string }) =>
    Promise.resolve({
      id: 1,
      fullName: 'X',
      employeeCode: dto.employeeCode,
      active: true,
    }),
};

describe('API de turnos y operadores (roles y validación)', () => {
  let app: INestApplication<App>;
  const slot = '?date=2026-11-13&shift=AFTERNOON';
  const body = {
    vehicleId: 1,
    operatorId: 2,
    date: '2026-11-13',
    shift: 'AFTERNOON',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ShiftsController, OperatorsController],
      providers: [
        { provide: ShiftsService, useValue: shiftsStub },
        { provide: OperatorsService, useValue: operatorsStub },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    calls.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/shifts/availability', () => {
    it.each(['admin', 'supervisor'])(
      'responde 200 para el rol %s',
      async (role) => {
        await request(app.getHttpServer())
          .get(`/api/v1/shifts/availability${slot}`)
          .set('x-test-role', role)
          .expect(200);
      },
    );

    it.each(['mantenimiento', 'hse', 'lectura'])(
      'responde 403 para el rol %s (HU-07 del informe PP2)',
      async (role) => {
        await request(app.getHttpServer())
          .get(`/api/v1/shifts/availability${slot}`)
          .set('x-test-role', role)
          .expect(403);
      },
    );

    it('responde 401 sin autenticación', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/shifts/availability${slot}`)
        .expect(401);
    });

    it.each([
      ['fecha con formato inválido', '?date=13-11-2026&shift=NIGHT'],
      ['fecha inexistente', '?date=2026-02-30&shift=NIGHT'],
      ['turno desconocido', '?date=2026-11-13&shift=TARDE'],
      ['sin parámetros', ''],
    ])('responde 400 con %s', async (_name, query) => {
      await request(app.getHttpServer())
        .get(`/api/v1/shifts/availability${query}`)
        .set('x-test-role', 'supervisor')
        .expect(400);
    });
  });

  describe('POST /api/v1/shifts/assignments', () => {
    it('responde 201 y pasa el id del usuario autenticado al servicio', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shifts/assignments')
        .set('x-test-role', 'supervisor')
        .send(body)
        .expect(201);

      expect(calls).toEqual([['assign', [body, 42]]]);
    });

    it('responde 403 para el rol mantenimiento', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shifts/assignments')
        .set('x-test-role', 'mantenimiento')
        .send(body)
        .expect(403);
      expect(calls).toEqual([]);
    });

    it.each([
      ['vehicleId = 0', { ...body, vehicleId: 0 }],
      ['operatorId no numérico', { ...body, operatorId: 'abc' }],
      ['turno inválido', { ...body, shift: 'TARDE' }],
      ['fecha inválida', { ...body, date: '2026-13-01' }],
      ['campo no declarado', { ...body, assignedById: 1 }],
    ])('responde 400 con %s', async (_name, payload) => {
      await request(app.getHttpServer())
        .post('/api/v1/shifts/assignments')
        .set('x-test-role', 'admin')
        .send(payload)
        .expect(400);
      expect(calls).toEqual([]);
    });
  });

  describe('PATCH /api/v1/shifts/assignments/:id/cancel', () => {
    it('responde 200 para supervisor', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/shifts/assignments/5/cancel')
        .set('x-test-role', 'supervisor')
        .expect(200);
      expect(calls).toEqual([['cancel', [5]]]);
    });

    it('responde 403 para hse y 400 si el id no es numérico', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/shifts/assignments/5/cancel')
        .set('x-test-role', 'hse')
        .expect(403);
      await request(app.getHttpServer())
        .patch('/api/v1/shifts/assignments/abc/cancel')
        .set('x-test-role', 'admin')
        .expect(400);
    });
  });

  describe('operadores', () => {
    it('GET: admin y supervisor pueden listar; lectura no', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/operators')
        .set('x-test-role', 'supervisor')
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/operators')
        .set('x-test-role', 'lectura')
        .expect(403);
    });

    it('POST: solo admin crea operadores', async () => {
      const payload = { fullName: 'Juan Pérez', employeeCode: 'OP-1' };
      await request(app.getHttpServer())
        .post('/api/v1/operators')
        .set('x-test-role', 'admin')
        .send(payload)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/operators')
        .set('x-test-role', 'supervisor')
        .send(payload)
        .expect(403);
    });

    it('POST responde 400 con legajo vacío', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/operators')
        .set('x-test-role', 'admin')
        .send({ fullName: 'Juan', employeeCode: '' })
        .expect(400);
    });
  });
});
