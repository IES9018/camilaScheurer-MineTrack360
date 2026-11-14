import { ApiProperty } from '@nestjs/swagger';

export const FLEET_ALERT_STATUSES = [
  'CRITICAL',
  'WARNING',
  'NO_THRESHOLD',
  'OK',
] as const;

/**
 * Estado de alerta de un vehículo. NO_THRESHOLD indica que su tipo todavía no
 * tiene un intervalo configurado: se informa en lugar de ocultar el vehículo.
 */
export type FleetAlertStatus = (typeof FLEET_ALERT_STATUSES)[number];

/** Una fila del listado de alertas de mantenimiento (RF-05, pantalla P1). */
export class FleetAlertDto {
  @ApiProperty({ example: 14 })
  vehicleId: number;

  @ApiProperty({ example: 'CAM-014' })
  internalCode: string;

  @ApiProperty({ example: 'Camión fuera de ruta' })
  vehicleTypeName: string;

  @ApiProperty({
    example: 'ACTIVE',
    description:
      'Estado operativo del vehículo (ACTIVE, MAINTENANCE, OUT_OF_SERVICE)',
  })
  vehicleStatus: string;

  @ApiProperty({ example: 1005 })
  totalEngineHours: number;

  @ApiProperty({ example: 500 })
  lastServiceHours: number;

  @ApiProperty({ example: 505, description: 'Horas desde el último servicio' })
  hoursSinceService: number;

  @ApiProperty({
    example: 500,
    nullable: true,
    type: Number,
    description: 'Intervalo del tipo de vehículo; null si no está configurado',
  })
  intervalHours: number | null;

  @ApiProperty({
    example: 1.01,
    nullable: true,
    type: Number,
    description: 'Proporción consumida del intervalo; null si no hay umbral',
  })
  ratio: number | null;

  @ApiProperty({ enum: FLEET_ALERT_STATUSES })
  status: FleetAlertStatus;
}
