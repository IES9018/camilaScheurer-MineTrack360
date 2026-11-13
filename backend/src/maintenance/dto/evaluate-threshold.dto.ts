import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

/**
 * Cuerpo esperado por POST /api/v1/maintenance/threshold-evaluation (RF-05).
 * Las reglas de class-validator se aplican con el ValidationPipe global (main.ts).
 */
export class EvaluateThresholdDto {
  @ApiProperty({
    example: 1850.5,
    description: 'Horas de motor acumuladas del vehículo',
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  totalEngineHours: number;

  @ApiProperty({
    example: 1500,
    description: 'Horas de motor registradas en el último servicio',
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  lastServiceHours: number;

  @ApiProperty({
    example: 400,
    description: 'Intervalo de mantenimiento en horas (debe ser mayor a 0)',
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  intervalHours: number;
}
