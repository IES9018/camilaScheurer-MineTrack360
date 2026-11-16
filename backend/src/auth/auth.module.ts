import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { assertStrongJwtSecret } from '../config/security';
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
      useFactory: (config: ConfigService) => {
        // getOrThrow: si falta JWT_SECRET, la app no arranca
        const secret = config.getOrThrow<string>('JWT_SECRET');
        // En producción tampoco arranca con un secreto corto o de ejemplo (H-01)
        assertStrongJwtSecret(secret, config.get<string>('NODE_ENV'));
        return {
          secret,
          signOptions: {
            algorithm: 'HS256' as const,
            expiresIn: config.get<string>(
              'JWT_EXPIRES_IN',
              '8h',
            ) as JwtSignOptions['expiresIn'],
          },
          // Solo se aceptan tokens firmados con HS256
          verifyOptions: { algorithms: ['HS256' as const] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository],
  exports: [TypeOrmModule, JwtModule],
})
export class AuthModule {}
