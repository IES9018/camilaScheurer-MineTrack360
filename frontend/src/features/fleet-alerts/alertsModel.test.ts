import { describe, expect, it } from 'vitest';
import type { FleetAlert } from './alertsApi';
import {
  detailMessage,
  filterAlerts,
  formatPercent,
  sortAlerts,
  summarize,
} from './alertsModel';

const alert = (over: Partial<FleetAlert>): FleetAlert => ({
  vehicleId: 1,
  internalCode: 'CAM-001',
  vehicleTypeName: 'Camión',
  vehicleStatus: 'ACTIVE',
  totalEngineHours: 1000,
  lastServiceHours: 500,
  hoursSinceService: 505,
  intervalHours: 500,
  ratio: 1.01,
  status: 'CRITICAL',
  ...over,
});

const sample = [
  alert({
    vehicleId: 1,
    internalCode: 'CAM-010',
    status: 'OK',
    ratio: 0.24,
    hoursSinceService: 120,
  }),
  alert({
    vehicleId: 2,
    internalCode: 'CAM-002',
    status: 'CRITICAL',
    ratio: 1.02,
    hoursSinceService: 512,
  }),
  alert({
    vehicleId: 3,
    internalCode: 'CAM-001',
    status: 'CRITICAL',
    ratio: 1.01,
  }),
  alert({
    vehicleId: 4,
    internalCode: 'CAM-007',
    status: 'WARNING',
    ratio: 0.92,
    hoursSinceService: 460,
  }),
  alert({
    vehicleId: 5,
    internalCode: 'PAL-001',
    status: 'NO_THRESHOLD',
    ratio: null,
    intervalHours: null,
  }),
];

describe('alertsModel', () => {
  it('ordena por criticidad: crítico (mayor % primero), advertencia, sin umbral, OK', () => {
    expect(
      sortAlerts(sample, 'criticality').map((a) => a.internalCode),
    ).toEqual(['CAM-002', 'CAM-001', 'CAM-007', 'PAL-001', 'CAM-010']);
  });

  it('ordena por vehículo de forma natural (CAM-2 antes que CAM-10)', () => {
    expect(sortAlerts(sample, 'vehicle').map((a) => a.internalCode)).toEqual([
      'CAM-001',
      'CAM-002',
      'CAM-007',
      'CAM-010',
      'PAL-001',
    ]);
  });

  it('no modifica el arreglo original', () => {
    const copy = [...sample];
    sortAlerts(sample, 'criticality');
    expect(sample).toEqual(copy);
  });

  it('filtra por estado y "Todos" no filtra', () => {
    expect(filterAlerts(sample, 'CRITICAL')).toHaveLength(2);
    expect(filterAlerts(sample, 'ALL')).toHaveLength(5);
  });

  it('cuenta por estado', () => {
    expect(summarize(sample)).toEqual({
      CRITICAL: 2,
      WARNING: 1,
      NO_THRESHOLD: 1,
      OK: 1,
    });
  });

  it('el porcentaje se redondea hacia abajo y sin umbral muestra guion', () => {
    expect(formatPercent(1.01)).toBe('101 %');
    expect(formatPercent(0.29)).toBe('29 %');
    expect(formatPercent(0.999)).toBe('99 %');
    expect(formatPercent(null)).toBe('—');
  });

  it('el mensaje de detalle usa lenguaje del usuario', () => {
    expect(detailMessage(alert({}))).toBe(
      'Superó el intervalo por 5 h. Programar service.',
    );
    expect(detailMessage(alert({ hoursSinceService: 500 }))).toBe(
      'Alcanzó el intervalo. Programar service.',
    );
    expect(
      detailMessage(alert({ status: 'WARNING', hoursSinceService: 460 })),
    ).toBe('Faltan 40 h para el intervalo. Planificar service.');
    expect(detailMessage(alert({ status: 'OK', hoursSinceService: 120 }))).toBe(
      'Faltan 380 h para el próximo service.',
    );
    expect(
      detailMessage(alert({ status: 'NO_THRESHOLD', intervalHours: null })),
    ).toMatch(/no tiene un intervalo/);
  });
});
