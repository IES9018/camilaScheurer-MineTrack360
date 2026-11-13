import { BadRequestException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService.evaluateThresholdStatus', () => {
  let service: MaintenanceService;

  // intervalo de 100 h y último servicio en 0 h: las horas de uso == % consumido
  const evaluate = (hoursUsed: number, intervalHours = 100) =>
    service.evaluateThresholdStatus({
      totalEngineHours: hoursUsed,
      lastServiceHours: 0,
      intervalHours,
    });

  beforeEach(() => {
    service = new MaintenanceService();
  });

  describe('estados según el umbral (CA-03)', () => {
    it.each([
      [0, 'OK'],
      [50, 'OK'],
      [89.9, 'OK'],
      [90, 'WARNING'],
      [99.9, 'WARNING'],
      [100, 'CRITICAL'],
      [150, 'CRITICAL'],
    ])('con %d h consumidas de 100 devuelve %s', (hours, expected) => {
      expect(evaluate(hours).status).toBe(expected);
    });
  });

  it('calcula las horas desde el último servicio y la proporción', () => {
    const result = service.evaluateThresholdStatus({
      totalEngineHours: 1850.5,
      lastServiceHours: 1500,
      intervalHours: 400,
    });

    expect(result).toEqual({
      status: 'OK',
      hoursSinceService: 350.5,
      ratio: 0.8763,
    });
  });

  it('no sufre deriva de punto flotante en el límite del 90 %', () => {
    // 1000.3 - 900.1 = 100.19999999999993 sin redondeo
    const result = service.evaluateThresholdStatus({
      totalEngineHours: 1000.3,
      lastServiceHours: 900.1,
      intervalHours: 111.3,
    });

    expect(result.hoursSinceService).toBe(100.2);
    expect(result.status).toBe('WARNING');
  });

  describe('entradas inválidas', () => {
    it.each([
      ['intervalo 0 (evita Infinity)', 0],
      ['intervalo negativo', -10],
      ['intervalo NaN', NaN],
      ['intervalo Infinity', Infinity],
    ])('rechaza %s', (_label, interval) => {
      expect(() => evaluate(50, interval)).toThrow(BadRequestException);
    });

    it('rechaza horas acumuladas no finitas', () => {
      expect(() => evaluate(NaN)).toThrow(BadRequestException);
    });

    it('rechaza horas negativas', () => {
      expect(() =>
        service.evaluateThresholdStatus({
          totalEngineHours: -1,
          lastServiceHours: 0,
          intervalHours: 100,
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza un último servicio posterior a las horas acumuladas', () => {
      expect(() =>
        service.evaluateThresholdStatus({
          totalEngineHours: 100,
          lastServiceHours: 200,
          intervalHours: 100,
        }),
      ).toThrow(BadRequestException);
    });
  });
});
