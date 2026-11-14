import { NotFoundException } from '@nestjs/common';
import type { FleetVehicleSnapshot } from '../vehicles/fleet-snapshot.interface';
import { VehicleStatus } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { MaintenanceAlertsService } from './maintenance-alerts.service';
import type { MaintenanceThreshold } from './maintenance-threshold.entity';
import { MaintenanceThresholdsRepository } from './maintenance-thresholds.repository';
import { MaintenanceService } from './maintenance.service';

const vehicle = (
  overrides: Partial<FleetVehicleSnapshot>,
): FleetVehicleSnapshot => ({
  id: 1,
  internalCode: 'CAM-001',
  vehicleTypeId: 1,
  vehicleTypeName: 'Camión',
  status: VehicleStatus.ACTIVE,
  totalEngineHours: 0,
  lastServiceHours: 0,
  ...overrides,
});

const threshold = (
  vehicleTypeId: number,
  intervalHours: number,
): MaintenanceThreshold => ({
  id: vehicleTypeId,
  vehicleTypeId,
  intervalHours,
});

describe('MaintenanceAlertsService', () => {
  let fleet: FleetVehicleSnapshot[];
  let thresholds: MaintenanceThreshold[];
  let typeExists: boolean;
  let upserted: Array<[number, number]>;
  let service: MaintenanceAlertsService;

  beforeEach(() => {
    fleet = [];
    thresholds = [];
    typeExists = true;
    upserted = [];

    const vehiclesService = {
      findFleetSnapshot: () => Promise.resolve(fleet),
      vehicleTypeExists: () => Promise.resolve(typeExists),
    } as unknown as VehiclesService;
    const repository = {
      findAll: () => Promise.resolve(thresholds),
      upsert: (vehicleTypeId: number, intervalHours: number) => {
        upserted.push([vehicleTypeId, intervalHours]);
        return Promise.resolve(threshold(vehicleTypeId, intervalHours));
      },
    } as unknown as MaintenanceThresholdsRepository;

    service = new MaintenanceAlertsService(
      vehiclesService,
      repository,
      new MaintenanceService(),
    );
  });

  describe('getFleetAlerts', () => {
    it('devuelve una lista vacía si no hay vehículos', async () => {
      await expect(service.getFleetAlerts()).resolves.toEqual([]);
    });

    it('calcula estado, horas y proporción con el intervalo del tipo (CA-03)', async () => {
      thresholds = [threshold(1, 500)];
      fleet = [
        vehicle({
          id: 1,
          internalCode: 'CAM-014',
          totalEngineHours: 1005,
          lastServiceHours: 500,
        }),
      ];

      const [alert] = await service.getFleetAlerts();

      expect(alert).toMatchObject({
        vehicleId: 1,
        internalCode: 'CAM-014',
        hoursSinceService: 505,
        intervalHours: 500,
        ratio: 1.01,
        status: 'CRITICAL',
      });
    });

    it.each([
      [450, 'WARNING'],
      [449, 'OK'],
      [500, 'CRITICAL'],
    ])(
      'con %d h desde el servicio sobre 500 devuelve %s',
      async (hours, expected) => {
        thresholds = [threshold(1, 500)];
        fleet = [vehicle({ totalEngineHours: hours })];

        const [alert] = await service.getFleetAlerts();

        expect(alert.status).toBe(expected);
      },
    );

    it('marca NO_THRESHOLD si el tipo no tiene intervalo, sin ocultar el vehículo', async () => {
      fleet = [
        vehicle({
          vehicleTypeId: 9,
          totalEngineHours: 120.34,
          lastServiceHours: 20,
        }),
      ];

      const [alert] = await service.getFleetAlerts();

      expect(alert).toMatchObject({
        status: 'NO_THRESHOLD',
        intervalHours: null,
        ratio: null,
        hoursSinceService: 100.3,
      });
    });

    it('ordena por criticidad: CRITICAL, WARNING, NO_THRESHOLD y OK', async () => {
      thresholds = [threshold(1, 100)];
      fleet = [
        vehicle({ id: 1, internalCode: 'A-OK', totalEngineHours: 10 }),
        vehicle({ id: 2, internalCode: 'B-SIN', vehicleTypeId: 7 }),
        vehicle({ id: 3, internalCode: 'C-WARN', totalEngineHours: 92 }),
        vehicle({ id: 4, internalCode: 'D-CRIT', totalEngineHours: 101 }),
      ];

      const codes = (await service.getFleetAlerts()).map((a) => a.internalCode);

      expect(codes).toEqual(['D-CRIT', 'C-WARN', 'B-SIN', 'A-OK']);
    });

    it('dentro del mismo estado, ordena por mayor consumo y luego por código', async () => {
      thresholds = [threshold(1, 100)];
      fleet = [
        vehicle({ id: 1, internalCode: 'CAM-002', totalEngineHours: 105 }),
        vehicle({ id: 2, internalCode: 'CAM-001', totalEngineHours: 105 }),
        vehicle({ id: 3, internalCode: 'CAM-003', totalEngineHours: 130 }),
      ];

      const codes = (await service.getFleetAlerts()).map((a) => a.internalCode);

      expect(codes).toEqual(['CAM-003', 'CAM-001', 'CAM-002']);
    });

    it('usa el intervalo propio de cada tipo de vehículo', async () => {
      thresholds = [threshold(1, 100), threshold(2, 1000)];
      fleet = [
        vehicle({
          id: 1,
          internalCode: 'CAM-001',
          vehicleTypeId: 1,
          totalEngineHours: 95,
        }),
        vehicle({
          id: 2,
          internalCode: 'PAL-001',
          vehicleTypeId: 2,
          totalEngineHours: 95,
        }),
      ];

      const byCode = Object.fromEntries(
        (await service.getFleetAlerts()).map((a) => [a.internalCode, a.status]),
      );

      expect(byCode).toEqual({ 'CAM-001': 'WARNING', 'PAL-001': 'OK' });
    });
  });

  describe('setThreshold', () => {
    it('guarda el intervalo y devuelve el umbral vigente', async () => {
      await expect(service.setThreshold(2, 750)).resolves.toEqual({
        vehicleTypeId: 2,
        intervalHours: 750,
      });
      expect(upserted).toEqual([[2, 750]]);
    });

    it('lanza NotFoundException si el tipo de vehículo no existe, sin guardar nada', async () => {
      typeExists = false;

      await expect(service.setThreshold(99, 500)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(upserted).toEqual([]);
    });
  });
});
