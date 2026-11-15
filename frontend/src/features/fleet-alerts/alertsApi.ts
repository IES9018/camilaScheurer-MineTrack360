import { apiFetch } from '../../shared/api/client';

export type AlertStatus = 'CRITICAL' | 'WARNING' | 'NO_THRESHOLD' | 'OK';

/** Una fila de GET /api/v1/maintenance/alerts (FleetAlertDto del backend). */
export interface FleetAlert {
  vehicleId: number;
  internalCode: string;
  vehicleTypeName: string;
  vehicleStatus: string;
  totalEngineHours: number;
  lastServiceHours: number;
  hoursSinceService: number;
  intervalHours: number | null;
  ratio: number | null;
  status: AlertStatus;
}

export const fetchFleetAlerts = (): Promise<FleetAlert[]> =>
  apiFetch<FleetAlert[]>('/maintenance/alerts');
