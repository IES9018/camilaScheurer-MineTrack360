import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    // isGlobal: ConfigService disponible en todos los módulos sin reimportar
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    VehiclesModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
