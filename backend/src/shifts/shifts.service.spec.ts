import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { FleetAlertDto } from '../maintenance/dto/fleet-alert.dto';
import { MaintenanceAlertsService } from '../maintenance/maintenance-alerts.service';
import type { FleetVehicleSnapshot } from '../vehicles/fleet-snapshot.interface';
import { VehicleStatus } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { Operator } from './operator.entity';
import {
  ShiftAssignment,
  ShiftAssignmentStatus,
  ShiftType,
} from './shift-assignment.entity';
import { NewAssignmentData, ShiftsRepository } from './shifts.repository';
import { ShiftsService } from './shifts.service';

const vehicle = (o: Partial<FleetVehicleSnapshot>): FleetVehicleSnapshot => ({
  id: 1,
  internalCode: 'CAM-001',
  vehicleTypeId: 1,
  vehicleTypeName: 'Camión',
  status: VehicleStatus.ACTIVE,
  totalEngineHours: 0,
  lastServiceHours: 0,
  ...o,
});

const operator = (o: Partial<Operator> = {}): Operator => ({
  id: 1,
  fullName: 'Juan Pérez',
  employeeCode: 'OP-1',
  active: true,
  createdAt: new Date('2026-11-14T00:00:00Z'),
  ...o,
});

const alert = (
  vehicleId: number,
  status: FleetAlertDto['status'],
): FleetAlertDto => ({
  vehicleId,
  internalCode: `V-${vehicleId}`,
  vehicleTypeName: 'Camión',
  vehicleStatus: 'ACTIVE',
  totalEngineHours: 0,
  lastServiceHours: 0,
  hoursSinceService: 0,
  intervalHours: 500,
  ratio: 0,
  status,
});

const assignment = (o: Partial<ShiftAssignment> = {}): ShiftAssignment => ({
  id: 1,
  vehicleId: 1,
  operatorId: 1,
  shiftDate: '2026-11-13',
  shift: ShiftType.AFTERNOON,
  status: ShiftAssignmentStatus.ASSIGNED,
  assignedById: 7,
  createdAt: new Date('2026-11-13T12:00:00Z'),
  cancelledAt: null,
  ...o,
});

const uniqueViolation = (constraint: string): QueryFailedError =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505', constraint }),
  );

describe('ShiftsService', () => {
  const slot = { date: '2026-11-13', shift: ShiftType.AFTERNOON };
  const dto = { vehicleId: 1, operatorId: 1, ...slot };

  let fleet: FleetVehicleSnapshot[];
  let alerts: FleetAlertDto[];
  let operators: Operator[];
  let active: ShiftAssignment[];
  let created: NewAssignmentData[];
  let insertError: unknown;
  let saved: ShiftAssignment[];
  let service: ShiftsService;

  beforeEach(() => {
    fleet = [vehicle({ id: 1 })];
    alerts = [];
    operators = [operator()];
    active = [];
    created = [];
    insertError = null;
    saved = [];

    const repository = {
      findOperators: () => Promise.resolve(operators),
      findOperatorById: (id: number) =>
        Promise.resolve(operators.find((o) => o.id === id) ?? null),
      findActiveAssignments: () => Promise.resolve(active),
      findAssignmentById: (id: number) =>
        Promise.resolve(active.find((a) => a.id === id) ?? null),
      createAssignment: (data: NewAssignmentData) => {
        if (insertError) return Promise.reject(insertError as Error);
        created.push(data);
        return Promise.resolve(assignment({ ...data, id: 50 }));
      },
      saveAssignment: (a: ShiftAssignment) => {
        saved.push({ ...a });
        return Promise.resolve(a);
      },
    } as unknown as ShiftsRepository;
    const vehiclesService = {
      findFleetSnapshot: () => Promise.resolve(fleet),
    } as unknown as VehiclesService;
    const alertsService = {
      getFleetAlerts: () => Promise.resolve(alerts),
    } as unknown as MaintenanceAlertsService;

    service = new ShiftsService(repository, vehiclesService, alertsService);
  });

  describe('assign', () => {
    it('crea la asignación y registra quién la hizo', async () => {
      const result = await service.assign(dto, 7);

      expect(created).toEqual([
        {
          vehicleId: 1,
          operatorId: 1,
          shiftDate: '2026-11-13',
          shift: 'AFTERNOON',
          assignedById: 7,
        },
      ]);
      expect(result).toMatchObject({
        id: 50,
        date: '2026-11-13',
        status: 'ASSIGNED',
        assignedById: 7,
      });
    });

    it('lanza NotFoundException si el vehículo no existe', async () => {
      await expect(
        service.assign({ ...dto, vehicleId: 99 }, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(created).toEqual([]);
    });

    it('lanza NotFoundException si el operador no existe', async () => {
      await expect(
        service.assign({ ...dto, operatorId: 99 }, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([VehicleStatus.MAINTENANCE, VehicleStatus.OUT_OF_SERVICE])(
      'rechaza un vehículo en estado %s',
      async (status) => {
        fleet = [vehicle({ id: 1, status })];

        await expect(service.assign(dto, 7)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(created).toEqual([]);
      },
    );

    it('rechaza un vehículo con alerta crítica de mantenimiento (HU-04)', async () => {
      alerts = [alert(1, 'CRITICAL')];

      await expect(service.assign(dto, 7)).rejects.toThrow(/alerta crítica/);
      expect(created).toEqual([]);
    });

    it('acepta un vehículo en advertencia o sin umbral: solo lo crítico bloquea', async () => {
      alerts = [alert(1, 'WARNING')];
      await expect(service.assign(dto, 7)).resolves.toMatchObject({ id: 50 });

      alerts = [alert(1, 'NO_THRESHOLD')];
      await expect(service.assign(dto, 7)).resolves.toMatchObject({ id: 50 });
    });

    it('rechaza un operador inactivo', async () => {
      operators = [operator({ active: false })];

      await expect(service.assign(dto, 7)).rejects.toThrow(/no está activo/);
    });

    it('traduce la violación de unicidad del vehículo en ConflictException (doble asignación)', async () => {
      insertError = uniqueViolation('UQ_shift_assignments_vehicle_slot');

      await expect(service.assign(dto, 7)).rejects.toThrow(
        /vehículo CAM-001 ya está asignado/,
      );
    });

    it('traduce la violación de unicidad del operador en ConflictException', async () => {
      insertError = uniqueViolation('UQ_shift_assignments_operator_slot');

      await expect(service.assign(dto, 7)).rejects.toThrow(
        /operador Juan Pérez ya está asignado/,
      );
    });

    it('no oculta errores de base de datos que no son de unicidad', async () => {
      insertError = new Error('conexión perdida');

      await expect(service.assign(dto, 7)).rejects.toThrow('conexión perdida');
    });
  });

  describe('cancel', () => {
    it('marca la asignación como cancelada y registra la fecha', async () => {
      active = [assignment({ id: 3 })];

      const result = await service.cancel(3);

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(saved).toHaveLength(1);
    });

    it('lanza NotFoundException si no existe', async () => {
      await expect(service.cancel(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza ConflictException si ya estaba cancelada, sin volver a guardar', async () => {
      active = [assignment({ id: 3, status: ShiftAssignmentStatus.CANCELLED })];

      await expect(service.cancel(3)).rejects.toBeInstanceOf(ConflictException);
      expect(saved).toEqual([]);
    });
  });

  describe('getAvailability', () => {
    beforeEach(() => {
      fleet = [
        vehicle({ id: 1, internalCode: 'CAM-021' }),
        vehicle({ id: 2, internalCode: 'CAM-009' }),
        vehicle({ id: 3, internalCode: 'CAM-014' }),
        vehicle({
          id: 4,
          internalCode: 'CAM-030',
          status: VehicleStatus.MAINTENANCE,
        }),
      ];
      operators = [
        operator({ id: 1, fullName: 'Pérez, Juan' }),
        operator({ id: 2, fullName: 'Gómez, Luis', employeeCode: 'OP-2' }),
        operator({
          id: 3,
          fullName: 'Baja, Ana',
          employeeCode: 'OP-3',
          active: false,
        }),
      ];
      alerts = [alert(3, 'CRITICAL')];
      active = [assignment({ vehicleId: 2, operatorId: 2 })];
    });

    it('marca disponible solo al vehículo activo, sin alerta crítica y sin asignar', async () => {
      const { vehicles } = await service.getAvailability(slot);

      expect(
        vehicles.map((v) => [v.internalCode, v.available, v.reason]),
      ).toEqual([
        ['CAM-021', true, null],
        ['CAM-009', false, 'ALREADY_ASSIGNED'],
        ['CAM-014', false, 'CRITICAL_ALERT'],
        ['CAM-030', false, 'NOT_ACTIVE'],
      ]);
    });

    it('informa a quién está asignado un vehículo y a qué vehículo un operador', async () => {
      const result = await service.getAvailability(slot);

      expect(result.vehicles[1].assignedTo).toBe('Gómez, Luis');
      expect(result.operators.find((o) => o.operatorId === 2)).toMatchObject({
        available: false,
        reason: 'ALREADY_ASSIGNED',
        assignedTo: 'CAM-009',
      });
    });

    it('no lista operadores inactivos', async () => {
      const { operators: listed } = await service.getAvailability(slot);

      expect(listed.map((o) => o.operatorId)).toEqual([1, 2]);
    });

    it('devuelve la fecha y el turno consultados', async () => {
      await expect(service.getAvailability(slot)).resolves.toMatchObject(slot);
    });

    it('con NOT_ACTIVE y CRITICAL a la vez informa NOT_ACTIVE (orden documentado)', async () => {
      alerts = [alert(4, 'CRITICAL')];

      const { vehicles } = await service.getAvailability(slot);

      expect(vehicles.find((v) => v.vehicleId === 4)?.reason).toBe(
        'NOT_ACTIVE',
      );
    });
  });
});
