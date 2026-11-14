import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operator } from './operator.entity';
import {
  ShiftAssignment,
  ShiftAssignmentStatus,
  ShiftType,
} from './shift-assignment.entity';

/** Datos necesarios para insertar una asignación. */
export interface NewAssignmentData {
  vehicleId: number;
  operatorId: number;
  shiftDate: string;
  shift: ShiftType;
  assignedById: number;
}

/** Patrón Repositorio: el servicio no depende de TypeORM (informe 3.1). */
@Injectable()
export class ShiftsRepository {
  constructor(
    @InjectRepository(Operator)
    private readonly operators: Repository<Operator>,
    @InjectRepository(ShiftAssignment)
    private readonly assignments: Repository<ShiftAssignment>,
  ) {}

  findOperators(): Promise<Operator[]> {
    return this.operators.find({ order: { fullName: 'ASC' } });
  }

  findOperatorById(id: number): Promise<Operator | null> {
    return this.operators.findOneBy({ id });
  }

  findOperatorByCode(employeeCode: string): Promise<Operator | null> {
    return this.operators.findOneBy({ employeeCode });
  }

  createOperator(fullName: string, employeeCode: string): Promise<Operator> {
    return this.operators.save(
      this.operators.create({ fullName, employeeCode }),
    );
  }

  /** Asignaciones vigentes (no canceladas) de una fecha y turno. */
  findActiveAssignments(
    shiftDate: string,
    shift: ShiftType,
  ): Promise<ShiftAssignment[]> {
    return this.assignments.findBy({
      shiftDate,
      shift,
      status: ShiftAssignmentStatus.ASSIGNED,
    });
  }

  findAssignmentById(id: number): Promise<ShiftAssignment | null> {
    return this.assignments.findOneBy({ id });
  }

  createAssignment(data: NewAssignmentData): Promise<ShiftAssignment> {
    return this.assignments.save(this.assignments.create(data));
  }

  saveAssignment(assignment: ShiftAssignment): Promise<ShiftAssignment> {
    return this.assignments.save(assignment);
  }
}
