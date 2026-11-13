import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAccount } from './user-account.entity';

/**
 * Patrón Repositorio (informe, sección 3.1): acceso a datos de usuarios,
 * desacoplado del servicio de autenticación.
 */
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserAccount)
    private readonly users: Repository<UserAccount>,
  ) {}

  /**
   * Busca un usuario por email INCLUYENDO su hash de contraseña (que por defecto
   * está oculto con select: false) y su rol. Solo debe usarse para validar el login.
   */
  findByEmailWithPasswordHash(email: string): Promise<UserAccount | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email })
      .getOne();
  }
}
