import { ConflictException } from '@nestjs/common';
import type { Operator } from './operator.entity';
import { OperatorsService } from './operators.service';
import { ShiftsRepository } from './shifts.repository';

describe('OperatorsService', () => {
  let stored: Operator[];
  let service: OperatorsService;

  beforeEach(() => {
    stored = [];
    const repository = {
      findOperators: () => Promise.resolve(stored),
      findOperatorByCode: (code: string) =>
        Promise.resolve(stored.find((o) => o.employeeCode === code) ?? null),
      createOperator: (fullName: string, employeeCode: string) => {
        const op: Operator = {
          id: stored.length + 1,
          fullName,
          employeeCode,
          active: true,
          createdAt: new Date(),
        };
        stored.push(op);
        return Promise.resolve(op);
      },
    } as unknown as ShiftsRepository;
    service = new OperatorsService(repository);
  });

  it('crea un operador activo y no expone la fecha de alta', async () => {
    await expect(
      service.create({ fullName: '  Juan Pérez ', employeeCode: ' OP-1 ' }),
    ).resolves.toEqual({
      id: 1,
      fullName: 'Juan Pérez',
      employeeCode: 'OP-1',
      active: true,
    });
  });

  it('rechaza un legajo repetido, aunque tenga espacios alrededor', async () => {
    await service.create({ fullName: 'Juan', employeeCode: 'OP-1' });

    await expect(
      service.create({ fullName: 'Otro', employeeCode: ' OP-1 ' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stored).toHaveLength(1);
  });

  it('lista los operadores', async () => {
    await service.create({ fullName: 'Juan', employeeCode: 'OP-1' });

    await expect(service.findAll()).resolves.toEqual([
      { id: 1, fullName: 'Juan', employeeCode: 'OP-1', active: true },
    ]);
  });
});
