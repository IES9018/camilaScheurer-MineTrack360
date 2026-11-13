import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { VehicleType } from './vehicle-type.entity';
import { Vehicle } from './vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';

@Module({
  // AuthModule exporta JwtModule, necesario para JwtAuthGuard
  imports: [TypeOrmModule.forFeature([Vehicle, VehicleType]), AuthModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository],
  exports: [TypeOrmModule, VehiclesService],
})
export class VehiclesModule {}
