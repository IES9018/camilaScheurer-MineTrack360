import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { Operator } from './operator.entity';
import { ShiftAssignment } from './shift-assignment.entity';
import { ShiftsController } from './shifts.controller';
import { ShiftsRepository } from './shifts.repository';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [
    // AuthModule exporta JwtModule, necesario para JwtAuthGuard
    AuthModule,
    // Se consumen los servicios exportados de Vehicles y Maintenance (ADR-002, regla 1)
    VehiclesModule,
    MaintenanceModule,
    TypeOrmModule.forFeature([Operator, ShiftAssignment]),
  ],
  controllers: [ShiftsController, OperatorsController],
  providers: [ShiftsService, OperatorsService, ShiftsRepository],
})
export class ShiftsModule {}
