import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssignShiftDto } from './dto/assign-shift.dto';
import {
  ShiftAssignmentDto,
  ShiftAvailabilityDto,
} from './dto/shift-responses.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { ShiftsService } from './shifts.service';

/**
 * API REST de asignación de turnos (RF-07). Solo supervisores y administradores:
 * el rol "mantenimiento" no accede a este módulo (HU-07 del informe PP2).
 */
@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'supervisor')
@Controller('api/v1/shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('availability')
  @ApiOperation({
    summary:
      'Vehículos y operadores disponibles para una fecha y turno, con el motivo si no lo están',
  })
  @ApiOkResponse({ type: ShiftAvailabilityDto })
  getAvailability(@Query() query: SlotQueryDto): Promise<ShiftAvailabilityDto> {
    return this.shiftsService.getAvailability(query);
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Asignar un vehículo y un operador a un turno' })
  @ApiCreatedResponse({ type: ShiftAssignmentDto })
  @ApiNotFoundResponse({ description: 'El vehículo o el operador no existen' })
  @ApiConflictResponse({
    description:
      'Vehículo inactivo o con alerta crítica, operador inactivo, o ya asignado en ese turno',
  })
  assign(
    @Body() dto: AssignShiftDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ShiftAssignmentDto> {
    return this.shiftsService.assign(dto, user.sub);
  }

  @Patch('assignments/:id/cancel')
  @ApiOperation({ summary: 'Cancelar (deshacer) una asignación' })
  @ApiOkResponse({ type: ShiftAssignmentDto })
  @ApiNotFoundResponse({ description: 'La asignación no existe' })
  @ApiConflictResponse({ description: 'La asignación ya estaba cancelada' })
  cancel(@Param('id', ParseIntPipe) id: number): Promise<ShiftAssignmentDto> {
    return this.shiftsService.cancel(id);
  }
}
