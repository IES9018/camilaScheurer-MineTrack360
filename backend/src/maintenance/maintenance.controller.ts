import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EvaluateThresholdDto } from './dto/evaluate-threshold.dto';
import { FleetAlertDto } from './dto/fleet-alert.dto';
import {
  MaintenanceThresholdDto,
  SetThresholdDto,
} from './dto/set-threshold.dto';
import { ThresholdEvaluationDto } from './dto/threshold-evaluation.dto';
import { MaintenanceAlertsService } from './maintenance-alerts.service';
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
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly alertsService: MaintenanceAlertsService,
  ) {}

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

  @Get('alerts')
  @Roles('admin', 'supervisor', 'mantenimiento')
  @ApiOperation({
    summary:
      'Alertas de mantenimiento de toda la flota, ordenadas por criticidad',
  })
  @ApiOkResponse({ type: [FleetAlertDto] })
  getAlerts(): Promise<FleetAlertDto[]> {
    return this.alertsService.getFleetAlerts();
  }

  @Put('thresholds/:vehicleTypeId')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Definir o actualizar el intervalo de servicio de un tipo de vehículo',
  })
  @ApiOkResponse({ type: MaintenanceThresholdDto })
  @ApiNotFoundResponse({ description: 'El tipo de vehículo no existe' })
  setThreshold(
    @Param('vehicleTypeId', ParseIntPipe) vehicleTypeId: number,
    @Body() dto: SetThresholdDto,
  ): Promise<MaintenanceThresholdDto> {
    return this.alertsService.setThreshold(vehicleTypeId, dto.intervalHours);
  }
}
