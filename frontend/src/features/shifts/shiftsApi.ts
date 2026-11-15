import { apiFetch } from '../../shared/api/client';

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type VehicleBlockReason =
  'NOT_ACTIVE' | 'CRITICAL_ALERT' | 'ALREADY_ASSIGNED';

export interface VehicleAvailability {
  vehicleId: number;
  internalCode: string;
  vehicleTypeName: string;
  available: boolean;
  reason: VehicleBlockReason | null;
  /** Operador ya asignado en ese turno, si lo hay. */
  assignedTo: string | null;
}

export interface OperatorAvailability {
  operatorId: number;
  fullName: string;
  employeeCode: string;
  available: boolean;
  reason: 'ALREADY_ASSIGNED' | null;
  /** Vehículo ya asignado en ese turno, si lo hay. */
  assignedTo: string | null;
}

/** GET /api/v1/shifts/availability */
export interface ShiftAvailability {
  date: string;
  shift: ShiftType;
  vehicles: VehicleAvailability[];
  operators: OperatorAvailability[];
}

/** POST /api/v1/shifts/assignments y PATCH .../cancel */
export interface ShiftAssignment {
  id: number;
  vehicleId: number;
  operatorId: number;
  date: string;
  shift: ShiftType;
  status: 'ASSIGNED' | 'CANCELLED';
}

export const fetchAvailability = (
  date: string,
  shift: ShiftType,
): Promise<ShiftAvailability> =>
  apiFetch<ShiftAvailability>(
    `/shifts/availability?date=${encodeURIComponent(date)}&shift=${shift}`,
  );

export const createAssignment = (body: {
  vehicleId: number;
  operatorId: number;
  date: string;
  shift: ShiftType;
}): Promise<ShiftAssignment> =>
  apiFetch<ShiftAssignment>('/shifts/assignments', {
    method: 'POST',
    body,
  });

export const cancelAssignment = (id: number): Promise<ShiftAssignment> =>
  apiFetch<ShiftAssignment>(`/shifts/assignments/${id}/cancel`, {
    method: 'PATCH',
  });
