import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Cuerpo de POST /api/v1/operators. */
export class CreateOperatorDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'OP-0001', description: 'Legajo único' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  employeeCode: string;
}
