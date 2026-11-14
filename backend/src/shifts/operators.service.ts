import { ConflictException, Injectable } from '@nestjs/common';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorDto } from './dto/shift-responses.dto';
import { Operator } from './operator.entity';
import { ShiftsRepository } from './shifts.repository';

const toDto = (operator: Operator): OperatorDto => ({
  id: operator.id,
  fullName: operator.fullName,
  employeeCode: operator.employeeCode,
  active: operator.active,
});

/** Casos de uso de operadores (choferes). */
@Injectable()
export class OperatorsService {
  constructor(private readonly repository: ShiftsRepository) {}

  async findAll(): Promise<OperatorDto[]> {
    return (await this.repository.findOperators()).map(toDto);
  }

  /** @throws ConflictException si el legajo ya está en uso. */
  async create(dto: CreateOperatorDto): Promise<OperatorDto> {
    const employeeCode = dto.employeeCode.trim();
    if (await this.repository.findOperatorByCode(employeeCode)) {
      throw new ConflictException('Ya existe un operador con ese legajo');
    }
    return toDto(
      await this.repository.createOperator(dto.fullName.trim(), employeeCode),
    );
  }
}
