import { BadRequestException, Injectable } from '@nestjs/common';
import { EvaluateThresholdDto } from './dto/evaluate-threshold.dto';
import {
  ThresholdEvaluationDto,
  ThresholdStatus,
} from './dto/threshold-evaluation.dto';

/** Proporción del intervalo a partir de la cual se emite WARNING (CA-03). */
export const WARNING_RATIO = 0.9;
/** Proporción del intervalo a partir de la cual se emite CRITICAL (CA-03). */
export const CRITICAL_RATIO = 1;

/** Casos de uso del módulo Maintenance. */
@Injectable()
export class MaintenanceService {
  /**
   * Evalúa cuánto del intervalo de servicio ya se consumió (RF-05, CA-03).
   *
   * @throws BadRequestException si alguna cifra no es finita, si el intervalo
   * no es mayor a 0 (evita dividir por cero) o si el último servicio es
   * posterior a las horas acumuladas.
   */
  evaluateThresholdStatus(input: EvaluateThresholdDto): ThresholdEvaluationDto {
    const { totalEngineHours, lastServiceHours, intervalHours } = input;

    if (
      ![totalEngineHours, lastServiceHours, intervalHours].every(
        Number.isFinite,
      )
    ) {
      throw new BadRequestException('Las horas deben ser números finitos');
    }
    if (intervalHours <= 0) {
      throw new BadRequestException(
        'El intervalo de mantenimiento debe ser mayor a 0',
      );
    }
    if (totalEngineHours < 0 || lastServiceHours < 0) {
      throw new BadRequestException('Las horas no pueden ser negativas');
    }
    if (lastServiceHours > totalEngineHours) {
      throw new BadRequestException(
        'Las horas del último servicio no pueden superar las horas acumuladas',
      );
    }

    // Se redondea a 1 decimal para evitar la deriva del punto flotante
    // (p. ej. 1000.3 - 900.1) al comparar contra los umbrales.
    const hoursSinceService =
      Math.round((totalEngineHours - lastServiceHours) * 10) / 10;
    const ratio = hoursSinceService / intervalHours;

    return {
      status: this.statusFor(ratio),
      hoursSinceService,
      ratio: Math.round(ratio * 10_000) / 10_000,
    };
  }

  private statusFor(ratio: number): ThresholdStatus {
    if (ratio >= CRITICAL_RATIO) return 'CRITICAL';
    if (ratio >= WARNING_RATIO) return 'WARNING';
    return 'OK';
  }
}
