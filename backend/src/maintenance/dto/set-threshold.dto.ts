import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max } from 'class-validator';

/** Cuerpo de PUT /api/v1/maintenance/thresholds/:vehicleTypeId. */
export class SetThresholdDto {
  @ApiProperty({
    example: 500,
    description: 'Horas de uso entre servicios (mayor a 0)',
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(100_000)
  intervalHours: number;
}

/** Umbral vigente de un tipo de vehículo. */
export class MaintenanceThresholdDto {
  @ApiProperty({ example: 1 })
  vehicleTypeId: number;

  @ApiProperty({ example: 500 })
  intervalHours: number;
}
