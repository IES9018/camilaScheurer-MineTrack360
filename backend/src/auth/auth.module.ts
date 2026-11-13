import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from './role.entity';
import { UserAccount } from './user-account.entity';
import { UsersRepository } from './users.repository';

/**
 * Módulo Auth: login con JWT, guards de autenticación y de roles.
 * Exporta JwtModule para que otros módulos puedan usar JwtAuthGuard.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserAccount]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // getOrThrow: si falta JWT_SECRET, la app no arranca
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '8h',
          ) as JwtSignOptions['expiresIn'],
        },
        // Solo se aceptan tokens firmados con HS256
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    // Configuración base del límite de tasa; el login define el suyo con @Throttle
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository],
  exports: [TypeOrmModule, JwtModule],
})
export class AuthModule {}
