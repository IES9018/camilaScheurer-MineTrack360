import { Injectable, NotFoundException } from '@nestjs/common';
import { VehiclesService } from '../vehicles/vehicles.service';
import { FleetAlertDto, FleetAlertStatus } from './dto/fleet-alert.dto';
import { MaintenanceThresholdDto } from './dto/set-threshold.dto';
import { MaintenanceThresholdsRepository } from './maintenance-thresholds.repository';
import { MaintenanceService } from './maintenance.service';

/** Orden de las alertas: lo más urgente primero. */
const STATUS_RANK: Record<FleetAlertStatus, number> = {
  CRITICAL: 0,
  WARNING: 1,
  NO_THRESHOLD: 2,
  OK: 3,
};

/** Alertas de mantenimiento de la flota y configuración de umbrales (RF-05). */
@Injectable()
export class MaintenanceAlertsService {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly thresholdsRepository: MaintenanceThresholdsRepository,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  /**
   * Estado de mantenimiento de cada vehículo, ordenado por criticidad.
   * La regla del 90 % / 100 % se reutiliza de `evaluateThresholdStatus`.
   */
  async getFleetAlerts(): Promise<FleetAlertDto[]> {
    const [fleet, thresholds] = await Promise.all([
      this.vehiclesService.findFleetSnapshot(),
      this.thresholdsRepository.findAll(),
    ]);
    const intervalByType = new Map(
      thresholds.map((t) => [t.vehicleTypeId, t.intervalHours]),
    );

    const alerts = fleet.map((vehicle): FleetAlertDto => {
      const intervalHours = intervalByType.get(vehicle.vehicleTypeId) ?? null;
      const base = {
        vehicleId: vehicle.id,
        internalCode: vehicle.internalCode,
        vehicleTypeName: vehicle.vehicleTypeName,
        vehicleStatus: vehicle.status,
        totalEngineHours: vehicle.totalEngineHours,
        lastServiceHours: vehicle.lastServiceHours,
      };

      if (intervalHours === null) {
        return {
          ...base,
          hoursSinceService:
            Math.round(
              (vehicle.totalEngineHours - vehicle.lastServiceHours) * 10,
            ) / 10,
          intervalHours: null,
          ratio: null,
          status: 'NO_THRESHOLD',
        };
      }

      const evaluation = this.maintenanceService.evaluateThresholdStatus({
        totalEngineHours: vehicle.totalEngineHours,
        lastServiceHours: vehicle.lastServiceHours,
        intervalHours,
      });
      return {
        ...base,
        hoursSinceService: evaluation.hoursSinceService,
        intervalHours,
        ratio: evaluation.ratio,
        status: evaluation.status,
      };
    });

    return alerts.sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (b.ratio ?? -1) - (a.ratio ?? -1) ||
        a.internalCode.localeCompare(b.internalCode),
    );
  }

  /**
   * Define o actualiza el intervalo de servicio de un tipo de vehículo.
   * @throws NotFoundException si el tipo de vehículo no existe.
   */
  async setThreshold(
    vehicleTypeId: number,
    intervalHours: number,
  ): Promise<MaintenanceThresholdDto> {
    if (!(await this.vehiclesService.vehicleTypeExists(vehicleTypeId))) {
      throw new NotFoundException(
        `Tipo de vehículo con id ${vehicleTypeId} no encontrado`,
      );
    }
    const saved = await this.thresholdsRepository.upsert(
      vehicleTypeId,
      intervalHours,
    );
    return {
      vehicleTypeId: saved.vehicleTypeId,
      intervalHours: saved.intervalHours,
    };
  }
}
