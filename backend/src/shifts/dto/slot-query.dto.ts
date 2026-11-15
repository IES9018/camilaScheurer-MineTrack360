import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsISO8601, Matches } from 'class-validator';
import { ShiftType } from '../shift-assignment.entity';

/** Fecha y turno de una consulta (GET /api/v1/shifts/availability). */
export class SlotQueryDto {
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
