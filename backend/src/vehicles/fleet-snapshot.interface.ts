import type { VehicleStatus } from './vehicle.entity';

/**
 * Datos de un vehículo que otros módulos pueden consumir (ADR-002, regla 1:
 * un módulo usa el servicio exportado, no las entidades ni los repositorios
 * del otro).
 */
export interface FleetVehicleSnapshot {
  id: number;
  internalCode: string;
  vehicleTypeId: number;
  vehicleTypeName: string;
  status: VehicleStatus;
  totalEngineHours: number;
  lastServiceHours: number;
}
