import type {
  OperatorAvailability,
  ShiftType,
  VehicleAvailability,
} from './shiftsApi';

export const SHIFT_OPTIONS: ReadonlyArray<{ value: ShiftType; label: string }> =
  [
    { value: 'MORNING', label: 'Mañana' },
    { value: 'AFTERNOON', label: 'Tarde' },
    { value: 'NIGHT', label: 'Noche' },
  ];

export const shiftLabel = (shift: ShiftType): string =>
  SHIFT_OPTIONS.find((o) => o.value === shift)?.label ?? shift;

/** Fecha de hoy (hora local del navegador) como AAAA-MM-DD, el formato del API. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "2026-11-13" -> "13/11". Se parte el texto para no depender de la zona horaria. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** Motivo por el que un vehículo no se puede elegir, en lenguaje del usuario (H5). */
export function vehicleBlockText(v: VehicleAvailability): string | null {
  switch (v.reason) {
    case null:
      return null;
    case 'NOT_ACTIVE':
      return 'No disponible: no está activo';
    case 'CRITICAL_ALERT':
      return 'No disponible: alerta crítica de mantenimiento';
    case 'ALREADY_ASSIGNED':
      return v.assignedTo
        ? `No disponible: ya asignado a ${v.assignedTo}`
        : 'No disponible: ya asignado en este turno';
  }
}

export function operatorStatusText(o: OperatorAvailability): string {
  if (o.available) return 'libre';
  return o.assignedTo
    ? `ya asignado a ${o.assignedTo}`
    : 'ya asignado en este turno';
}

export const successText = (p: {
  vehicle: string;
  operator: string;
  shift: ShiftType;
  date: string;
}): string =>
  `Asignado: ${p.vehicle} a ${p.operator}, turno ${shiftLabel(p.shift)} del ${shortDate(p.date)}.`;
