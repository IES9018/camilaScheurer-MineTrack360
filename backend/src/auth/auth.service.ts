import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';
import { verifyPassword } from './password.util';
import { RoleName } from './role.entity';
import { UsersRepository } from './users.repository';

/**
 * Hash bcrypt (costo 12) de una contraseña ficticia. Se usa para que el login
 * tarde lo mismo cuando el email NO existe, y así no revelar qué emails están registrados.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$j.ijNlqEUodv.Wyp1IyZCuARuvZpU.JJLHWxaVaK9El43zRhDoBtm';

/** Respuesta de un login exitoso. */
export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: RoleName;
  };
}

/** Casos de uso de autenticación (RF-01 del informe). */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida usuario y contraseña y emite un token JWT.
   * @throws UnauthorizedException con un mensaje único para cualquier falla
   *         (email inexistente, contraseña incorrecta o usuario inactivo).
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersRepository.findByEmailWithPasswordHash(
      dto.email,
    );

    // Siempre se compara contra algún hash, exista o no el usuario
    const passwordMatches = await verifyPassword(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
      },
    };
  }
}
