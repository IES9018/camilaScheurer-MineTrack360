import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { GLOBAL_THROTTLE } from '../config/throttle';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

const logins: unknown[] = [];
const authStub = {
  login: (dto: { email: string; password: string }) => {
    logins.push(dto);
    if (dto.password !== 'correcta') {
      return Promise.reject(
        new UnauthorizedException('Credenciales inválidas'),
      );
    }
    return Promise.resolve({ accessToken: 't', user: { id: 1 } });
  },
};

describe('AuthController (HTTP)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    logins.length = 0;
    const moduleRef = await Test.createTestingModule({
      // Misma configuración que AppModule: guard global con el límite real
      imports: [ThrottlerModule.forRoot([GLOBAL_THROTTLE])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  const login = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);

  it('responde 200 con credenciales válidas y normaliza el email', async () => {
    await login({ email: '  ANA@T.Local ', password: 'correcta' }).expect(200);
    expect(logins).toEqual([{ email: 'ana@t.local', password: 'correcta' }]);
  });

  it('responde 401 con credenciales inválidas', async () => {
    await login({ email: 'ana@t.local', password: 'mala' }).expect(401);
  });

  it('responde 400 si el cuerpo es inválido, sin llamar al servicio', async () => {
    await login({ email: 'no-es-email', password: 'x' }).expect(400);
    await login({ email: 'ana@t.local' }).expect(400);
    await login({ email: 'ana@t.local', password: 'x', extra: 1 }).expect(400);
    await login({
      email: 'ana@t.local',
      password: 'a'.repeat(73),
    }).expect(400);
    expect(logins).toEqual([]);
  });

  it('responde 429 en el 6.º intento dentro del mismo minuto', async () => {
    for (let i = 0; i < 5; i++) {
      await login({ email: 'ana@t.local', password: 'mala' }).expect(401);
    }
    await login({ email: 'ana@t.local', password: 'mala' }).expect(429);
  });
});
