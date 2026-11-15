import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../vehicle.entity';

/**
 * Cuerpo esperado por POST /api/v1/vehicles.
 * Las reglas de class-validator se aplican con el ValidationPipe global (main.ts).
 */
export class CreateVehicleDto {
  @ApiProperty({ example: 'CAM-001', description: 'Código interno único' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  internalCode: string;

  @ApiProperty({ example: 'AB123CD', description: 'Patente única' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  licensePlate: string;

  @ApiProperty({ example: 1, description: 'Id del tipo de vehículo' })
  @IsInt()
  @Min(1)
  vehicleTypeId: number;

  @ApiPropertyOptional({ example: 0, description: 'Horas de motor acumuladas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalEngineHours?: number;

  @ApiPropertyOptional({
    example: 0,
    description:
      'Horas de motor en el último servicio (no puede superar las acumuladas)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lastServiceHours?: number;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
