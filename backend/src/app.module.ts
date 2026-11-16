import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GLOBAL_THROTTLE } from './config/throttle';
import { DatabaseModule } from './database/database.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ShiftsModule } from './shifts/shifts.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    // isGlobal: ConfigService disponible en todos los módulos sin reimportar
    ConfigModule.forRoot({ isGlobal: true }),
    // Límite de pedidos por IP para toda la API (el login define uno propio)
    ThrottlerModule.forRoot([GLOBAL_THROTTLE]),
    DatabaseModule,
    AuthModule,
    VehiclesModule,
    MaintenanceModule,
    ShiftsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
