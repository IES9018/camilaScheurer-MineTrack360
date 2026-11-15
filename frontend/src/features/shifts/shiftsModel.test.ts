import { describe, expect, it } from 'vitest';
import type { OperatorAvailability, VehicleAvailability } from './shiftsApi';
import {
  operatorStatusText,
  shiftLabel,
  shortDate,
  successText,
  todayIso,
  vehicleBlockText,
} from './shiftsModel';

const vehicle = (over: Partial<VehicleAvailability>): VehicleAvailability => ({
  vehicleId: 1,
  internalCode: 'CAM-021',
  vehicleTypeName: 'Camión',
  available: true,
  reason: null,
  assignedTo: null,
  ...over,
});

describe('shiftsModel', () => {
  it('todayIso usa la fecha local con ceros a la izquierda', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('shortDate muestra día/mes sin depender de la zona horaria', () => {
    expect(shortDate('2026-11-13')).toBe('13/11');
  });

  it('traduce cada turno', () => {
    expect(shiftLabel('MORNING')).toBe('Mañana');
    expect(shiftLabel('AFTERNOON')).toBe('Tarde');
    expect(shiftLabel('NIGHT')).toBe('Noche');
  });

  it('explica por qué un vehículo no está disponible', () => {
    expect(vehicleBlockText(vehicle({}))).toBeNull();
    expect(
      vehicleBlockText(vehicle({ reason: 'NOT_ACTIVE', available: false })),
    ).toBe('No disponible: no está activo');
    expect(
      vehicleBlockText(vehicle({ reason: 'CRITICAL_ALERT', available: false })),
    ).toBe('No disponible: alerta crítica de mantenimiento');
    expect(
      vehicleBlockText(
        vehicle({
          reason: 'ALREADY_ASSIGNED',
          available: false,
          assignedTo: 'Luis Gómez',
        }),
      ),
    ).toBe('No disponible: ya asignado a Luis Gómez');
  });

  it('describe el estado de un operador', () => {
    const op: OperatorAvailability = {
      operatorId: 1,
      fullName: 'Juan Pérez',
      employeeCode: 'OP-1',
      available: true,
      reason: null,
      assignedTo: null,
    };
    expect(operatorStatusText(op)).toBe('libre');
    expect(
      operatorStatusText({
        ...op,
        available: false,
        reason: 'ALREADY_ASSIGNED',
        assignedTo: 'CAM-009',
      }),
    ).toBe('ya asignado a CAM-009');
  });

  it('arma el mensaje de éxito', () => {
    expect(
      successText({
        vehicle: 'CAM-021',
        operator: 'Juan Pérez',
        shift: 'AFTERNOON',
        date: '2026-11-13',
      }),
    ).toBe('Asignado: CAM-021 a Juan Pérez, turno Tarde del 13/11.');
  });
});
