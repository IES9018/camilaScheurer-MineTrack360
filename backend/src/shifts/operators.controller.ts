import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorDto } from './dto/shift-responses.dto';
import { OperatorsService } from './operators.service';

/** API REST de operadores (choferes) que se asignan a los turnos. */
@ApiTags('operators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Listar operadores' })
  @ApiOkResponse({ type: [OperatorDto] })
  findAll(): Promise<OperatorDto[]> {
    return this.operatorsService.findAll();
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Registrar un operador (solo administradores)' })
  @ApiCreatedResponse({ type: OperatorDto })
  @ApiConflictResponse({ description: 'El legajo ya existe' })
  create(@Body() dto: CreateOperatorDto): Promise<OperatorDto> {
    return this.operatorsService.create(dto);
  }
}
