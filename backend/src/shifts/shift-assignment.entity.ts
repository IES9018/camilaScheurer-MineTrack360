import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ShiftType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
}

export enum ShiftAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  CANCELLED = 'CANCELLED',
}

const ONLY_ACTIVE = `"status" = 'ASSIGNED'`;

/**
 * Asignación de un vehículo y un operador a un turno (ERD: SHIFT_ASSIGNMENT).
 *
 * Los índices únicos parciales impiden la doble asignación (RF-07) aunque dos
 * pedidos lleguen a la vez. Las columnas `*Id` son simples: las claves foráneas
 * viven en la migración para no acoplar este módulo a entidades de otros
 * módulos (ADR-002, regla 1).
 */
@Entity('shift_assignments')
@Index(
  'UQ_shift_assignments_vehicle_slot',
  ['vehicleId', 'shiftDate', 'shift'],
  { unique: true, where: ONLY_ACTIVE },
)
@Index(
  'UQ_shift_assignments_operator_slot',
  ['operatorId', 'shiftDate', 'shift'],
  { unique: true, where: ONLY_ACTIVE },
)
export class ShiftAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  vehicleId: number;

  @Column({ type: 'integer' })
  operatorId: number;

  /** Fecha de inicio del turno, formato AAAA-MM-DD. */
  @Column({ type: 'date' })
  shiftDate: string;

  @Column({ type: 'enum', enum: ShiftType })
  shift: ShiftType;

  @Column({
    type: 'enum',
    enum: ShiftAssignmentStatus,
    default: ShiftAssignmentStatus.ASSIGNED,
  })
  status: ShiftAssignmentStatus;

  /** Id del usuario (supervisor o admin) que hizo la asignación. */
  @Column({ type: 'integer' })
  assignedById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;
}
