import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EvaluateThresholdDto } from './dto/evaluate-threshold.dto';
import { ThresholdEvaluationDto } from './dto/threshold-evaluation.dto';
import { MaintenanceService } from './maintenance.service';

/**
 * API REST de mantenimiento preventivo (RF-05).
 * Exige un token JWT válido y uno de los roles habilitados.
 */
@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('threshold-evaluation')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'supervisor', 'mantenimiento')
  @ApiOperation({
    summary:
      'Evaluar el estado de mantenimiento (OK / WARNING / CRITICAL) según las horas de uso',
  })
  @ApiOkResponse({ type: ThresholdEvaluationDto })
  evaluate(@Body() dto: EvaluateThresholdDto): ThresholdEvaluationDto {
    return this.maintenanceService.evaluateThresholdStatus(dto);
  }
}
