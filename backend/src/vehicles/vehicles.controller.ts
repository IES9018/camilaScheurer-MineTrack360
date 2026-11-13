import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { Vehicle } from './vehicle.entity';
import { VehiclesService } from './vehicles.service';

/**
 * API REST de vehículos (informe, sección 6.4).
 * Todos los endpoints exigen un token JWT válido (JwtAuthGuard) y verifican
 * el rol del usuario (RolesGuard + @Roles).
 */
@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles('admin', 'supervisor', 'mantenimiento', 'hse', 'lectura')
  @ApiOperation({ summary: 'Listar todos los vehículos' })
  findAll(): Promise<Vehicle[]> {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'mantenimiento', 'hse', 'lectura')
  @ApiOperation({ summary: 'Obtener un vehículo por id' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Vehicle> {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Registrar un vehículo nuevo (solo administradores)',
  })
  create(@Body() dto: CreateVehicleDto): Promise<Vehicle> {
    return this.vehiclesService.create(dto);
  }
}
