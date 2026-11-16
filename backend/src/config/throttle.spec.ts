import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { GLOBAL_THROTTLE } from './throttle';

@Controller('ping')
class PingController {
  @Get()
  ping(): string {
    return 'ok';
  }
}

describe('límite global de pedidos (T-15)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([GLOBAL_THROTTLE])],
      controllers: [PingController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  it('fija 100 pedidos por minuto', () => {
    expect(GLOBAL_THROTTLE.limit).toBe(100);
    expect(GLOBAL_THROTTLE.ttl).toBe(60_000);
  });

  it('acepta el pedido 100 y rechaza el 101 con 429', async () => {
    for (let i = 0; i < GLOBAL_THROTTLE.limit; i++) {
      await request(app.getHttpServer()).get('/ping').expect(200);
    }
    await request(app.getHttpServer()).get('/ping').expect(429);
  });
});
