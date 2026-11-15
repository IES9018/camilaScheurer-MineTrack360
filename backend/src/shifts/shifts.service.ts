import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { MaintenanceAlertsService } from '../maintenance/maintenance-alerts.service';
import { VehicleStatus } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import {
  OperatorAvailabilityDto,
  ShiftAssignmentDto,
  ShiftAvailabilityDto,
  VehicleAvailabilityDto,
} from './dto/shift-responses.dto';
import {
  ShiftAssignment,
  ShiftAssignmentStatus,
} from './shift-assignment.entity';
import { ShiftsRepository } from './shifts.repository';

const UNIQUE_VIOLATION = '23505';

/** Nombre de la restricción única violada, o null si el error es otro. */
function violatedConstraint(error: unknown): string | null {
  if (!(error instanceof QueryFailedError)) return null;
  const driver = (error as { driverError?: unknown }).driverError;
  if (typeof driver !== 'object' || driver === null) return null;
  const { code, constraint } = driver as {
    code?: unknown;
    constraint?: unknown;
  };
  return code === UNIQUE_VIOLATION && typeof constraint === 'string'
    ? constraint
    : null;
}

const toDto = (a: ShiftAssignment): ShiftAssignmentDto => ({
  id: a.id,
  vehicleId: a.vehicleId,
  operatorId: a.operatorId,
  date: a.shiftDate,
  shift: a.shift,
  status: a.status,
  assignedById: a.assignedById,
  createdAt: a.createdAt,
  cancelledAt: a.cancelledAt,
});

/**
 * Asignación de vehículos y operadores a turnos (RF-07).
 * Consume los servicios exportados de Vehicles y Maintenance (ADR-002, regla 1).
 */
@Injectable()
export class ShiftsService {
  constructor(
    private readonly repository: ShiftsRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly alertsService: MaintenanceAlertsService,
  ) {}

  /**
   * Qué vehículos y operadores se pueden asignar en una fecha y turno, con el
   * motivo cuando no se puede (pantalla P2: se muestran, pero no se eligen).
   * Un vehículo bloqueado por varios motivos informa el primero de este orden:
   * NOT_ACTIVE, CRITICAL_ALERT, ALREADY_ASSIGNED.
   */
  async getAvailability(query: SlotQueryDto): Promise<ShiftAvailabilityDto> {
    const [fleet, alerts, operators, assignments] = await Promise.all([
      this.vehiclesService.findFleetSnapshot(),
      this.alertsService.getFleetAlerts(),
      this.repository.findOperators(),
      this.repository.findActiveAssignments(query.date, query.shift),
    ]);

    const criticalIds = new Set(
      alerts.filter((a) => a.status === 'CRITICAL').map((a) => a.vehicleId),
    );
    const operatorById = new Map(operators.map((o) => [o.id, o]));
    const vehicleById = new Map(fleet.map((v) => [v.id, v]));
    const byVehicle = new Map(assignments.map((a) => [a.vehicleId, a]));
    const byOperator = new Map(assignments.map((a) => [a.operatorId, a]));

    const vehicles = fleet.map((vehicle): VehicleAvailabilityDto => {
      const taken = byVehicle.get(vehicle.id);
      const reason =
        vehicle.status !== VehicleStatus.ACTIVE
          ? ('NOT_ACTIVE' as const)
          : criticalIds.has(vehicle.id)
            ? ('CRITICAL_ALERT' as const)
            : taken
              ? ('ALREADY_ASSIGNED' as const)
              : null;
      return {
        vehicleId: vehicle.id,
        internalCode: vehicle.internalCode,
        vehicleTypeName: vehicle.vehicleTypeName,
        available: reason === null,
        reason,
        assignedTo: taken
          ? (operatorById.get(taken.operatorId)?.fullName ?? null)
          : null,
      };
    });

    const activeOperators = operators
      .filter((o) => o.active)
      .map((operator): OperatorAvailabilityDto => {
        const taken = byOperator.get(operator.id);
        return {
          operatorId: operator.id,
          fullName: operator.fullName,
          employeeCode: operator.employeeCode,
          available: !taken,
          reason: taken ? 'ALREADY_ASSIGNED' : null,
          assignedTo: taken
            ? (vehicleById.get(taken.vehicleId)?.internalCode ?? null)
            : null,
        };
      });

    return {
      date: query.date,
      shift: query.shift,
      vehicles,
      operators: activeOperators,
    };
  }

  /**
   * Asigna un vehículo y un operador a un turno.
   * @throws NotFoundException si el vehículo o el operador no existen.
   * @throws ConflictException si el vehículo no está activo, tiene una alerta
   * crítica, el operador está inactivo, o alguno ya está asignado en ese turno.
   */
  async assign(
    dto: AssignShiftDto,
    assignedById: number,
  ): Promise<ShiftAssignmentDto> {
    const fleet = await this.vehiclesService.findFleetSnapshot();
    const vehicle = fleet.find((v) => v.id === dto.vehicleId);
    if (!vehicle) {
      throw new NotFoundException(
        `Vehículo con id ${dto.vehicleId} no encontrado`,
      );
    }
    const operator = await this.repository.findOperatorById(dto.operatorId);
    if (!operator) {
      throw new NotFoundException(
        `Operador con id ${dto.operatorId} no encontrado`,
      );
    }

    if (vehicle.status !== VehicleStatus.ACTIVE) {
      throw new ConflictException(
        `El vehículo ${vehicle.internalCode} no está activo (${vehicle.status})`,
      );
    }
    if (!operator.active) {
      throw new ConflictException(
        `El operador ${operator.fullName} no está activo`,
      );
    }
    const alert = (await this.alertsService.getFleetAlerts()).find(
      (a) => a.vehicleId === vehicle.id,
    );
    if (alert?.status === 'CRITICAL') {
      throw new ConflictException(
        `El vehículo ${vehicle.internalCode} tiene una alerta crítica de mantenimiento`,
      );
    }

    try {
      const saved = await this.repository.createAssignment({
        vehicleId: dto.vehicleId,
        operatorId: dto.operatorId,
        shiftDate: dto.date,
        shift: dto.shift,
        assignedById,
      });
      return toDto(saved);
    } catch (error) {
      // La base es la garantía final contra la doble asignación (RF-07),
      // también cuando dos pedidos llegan a la vez.
      const constraint = violatedConstraint(error);
      if (constraint?.includes('operator')) {
        throw new ConflictException(
          `El operador ${operator.fullName} ya está asignado a ese turno`,
        );
      }
      if (constraint) {
        throw new ConflictException(
          `El vehículo ${vehicle.internalCode} ya está asignado a ese turno`,
        );
      }
      throw error;
    }
  }

  /**
   * Cancela una asignación (queda como historial, no se borra).
   * @throws NotFoundException si no existe.
   * @throws ConflictException si ya estaba cancelada.
   */
  async cancel(id: number): Promise<ShiftAssignmentDto> {
    const assignment = await this.repository.findAssignmentById(id);
    if (!assignment) {
      throw new NotFoundException(`Asignación con id ${id} no encontrada`);
    }
    if (assignment.status === ShiftAssignmentStatus.CANCELLED) {
      throw new ConflictException('La asignación ya estaba cancelada');
    }
    assignment.status = ShiftAssignmentStatus.CANCELLED;
    assignment.cancelledAt = new Date();
    return toDto(await this.repository.saveAssignment(assignment));
  }
}
