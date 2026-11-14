import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { MaintenanceAlertsService } from './maintenance-alerts.service';
import { MaintenanceThreshold } from './maintenance-threshold.entity';
import { MaintenanceThresholdsRepository } from './maintenance-thresholds.repository';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    // AuthModule exporta JwtModule, necesario para JwtAuthGuard
    AuthModule,
    // Se consume VehiclesService (ADR-002, regla 1), no sus repositorios
    VehiclesModule,
    TypeOrmModule.forFeature([MaintenanceThreshold]),
  ],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceService,
    MaintenanceAlertsService,
    MaintenanceThresholdsRepository,
  ],
  exports: [MaintenanceService, MaintenanceAlertsService],
})
export class MaintenanceModule {}
