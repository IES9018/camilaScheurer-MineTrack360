import { ApiProperty } from '@nestjs/swagger';
import { ShiftAssignmentStatus, ShiftType } from '../shift-assignment.entity';

export const VEHICLE_BLOCK_REASONS = [
  'NOT_ACTIVE',
  'CRITICAL_ALERT',
  'ALREADY_ASSIGNED',
] as const;
/** Por qué un vehículo no se puede asignar a un turno. */
export type VehicleBlockReason = (typeof VEHICLE_BLOCK_REASONS)[number];

export class VehicleAvailabilityDto {
  @ApiProperty() vehicleId: number;
  @ApiProperty({ example: 'CAM-021' }) internalCode: string;
  @ApiProperty({ example: 'Camión fuera de ruta' }) vehicleTypeName: string;
  @ApiProperty() available: boolean;
  @ApiProperty({ enum: VEHICLE_BLOCK_REASONS, nullable: true, type: String })
  reason: VehicleBlockReason | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Operador asignado en ese turno, si ya está asignado',
  })
  assignedTo: string | null;
}

export class OperatorAvailabilityDto {
  @ApiProperty() operatorId: number;
  @ApiProperty({ example: 'Juan Pérez' }) fullName: string;
  @ApiProperty({ example: 'OP-0001' }) employeeCode: string;
  @ApiProperty() available: boolean;
  @ApiProperty({ enum: ['ALREADY_ASSIGNED'], nullable: true, type: String })
  reason: 'ALREADY_ASSIGNED' | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Vehículo asignado en ese turno, si ya está asignado',
  })
  assignedTo: string | null;
}

/** Disponibilidad de vehículos y operadores para una fecha y turno (pantalla P2). */
export class ShiftAvailabilityDto {
  @ApiProperty({ example: '2026-11-13' }) date: string;
  @ApiProperty({ enum: ShiftType }) shift: ShiftType;
  @ApiProperty({ type: [VehicleAvailabilityDto] })
  vehicles: VehicleAvailabilityDto[];
  @ApiProperty({ type: [OperatorAvailabilityDto] })
  operators: OperatorAvailabilityDto[];
}

export class ShiftAssignmentDto {
  @ApiProperty() id: number;
  @ApiProperty() vehicleId: number;
  @ApiProperty() operatorId: number;
  @ApiProperty({ example: '2026-11-13' }) date: string;
  @ApiProperty({ enum: ShiftType }) shift: ShiftType;
  @ApiProperty({ enum: ShiftAssignmentStatus }) status: ShiftAssignmentStatus;
  @ApiProperty() assignedById: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ nullable: true, type: Date }) cancelledAt: Date | null;
}

export class OperatorDto {
  @ApiProperty() id: number;
  @ApiProperty({ example: 'Juan Pérez' }) fullName: string;
  @ApiProperty({ example: 'OP-0001' }) employeeCode: string;
  @ApiProperty() active: boolean;
}
