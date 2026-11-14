import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, Matches, Min } from 'class-validator';
import { ShiftType } from '../shift-assignment.entity';

/** Cuerpo de POST /api/v1/shifts/assignments. */
export class AssignShiftDto {
  @ApiProperty({ example: 21 })
  @IsInt()
  @Min(1)
  vehicleId: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  operatorId: number;

  @ApiProperty({ example: '2026-11-13', description: 'Fecha AAAA-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato AAAA-MM-DD',
  })
  @IsISO8601({ strict: true }, { message: 'date no es una fecha válida' })
  date: string;

  @ApiProperty({ enum: ShiftType, example: ShiftType.AFTERNOON })
  @IsEnum(ShiftType)
  shift: ShiftType;
}
