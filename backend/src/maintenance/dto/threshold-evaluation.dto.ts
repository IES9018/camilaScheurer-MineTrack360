import { ApiProperty } from '@nestjs/swagger';

export const THRESHOLD_STATUSES = ['OK', 'WARNING', 'CRITICAL'] as const;

/** Estado de un vehículo respecto de su umbral de mantenimiento (RF-05). */
export type ThresholdStatus = (typeof THRESHOLD_STATUSES)[number];

/** Resultado de evaluar las horas de uso contra el intervalo de servicio. */
export class ThresholdEvaluationDto {
  @ApiProperty({
    enum: THRESHOLD_STATUSES,
    description:
      'OK (< 90% del intervalo), WARNING (>= 90%) o CRITICAL (>= 100%)',
  })
  status: ThresholdStatus;

  @ApiProperty({
    example: 350.5,
    description: 'Horas transcurridas desde el último servicio',
  })
  hoursSinceService: number;

  @ApiProperty({
    example: 0.8763,
    description:
      'Proporción consumida del intervalo (hoursSinceService / interval)',
  })
  ratio: number;
}
