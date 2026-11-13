import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

/**
 * Módulo de infraestructura: configura la conexión a PostgreSQL/TimescaleDB.
 * Las entidades de cada módulo de dominio se registran solas gracias a
 * `autoLoadEntities` cuando declaran TypeOrmModule.forFeature([...]).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        // getOrThrow: si falta la variable, la app no arranca (falla rápido)
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Informe 7.3: el esquema se gestiona SOLO con migraciones versionadas
        synchronize: false,
        // Debe ser idéntica a la de data-source.ts
        namingStrategy: new SnakeNamingStrategy(),
        logging: ['error', 'warn'],
      }),
    }),
  ],
})
export class DatabaseModule {}
