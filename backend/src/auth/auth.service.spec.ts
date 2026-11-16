import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { hashPassword } from './password.util';
import type { UserAccount } from './user-account.entity';
import { UsersRepository } from './users.repository';

const PASSWORD = 'ClaveDePrueba123';

describe('AuthService.login', () => {
  let service: AuthService;
  let found: UserAccount | null;
  let signed: unknown[];
  let user: UserAccount;

  beforeAll(async () => {
    const passwordHash = await hashPassword(PASSWORD);
    user = {
      id: 5,
      fullName: 'Ana Prueba',
      email: 'ana@t.local',
      passwordHash,
      active: true,
      role: { id: 2, name: 'supervisor' },
    } as unknown as UserAccount;
  });

  beforeEach(() => {
    found = user;
    signed = [];
    const repo = {
      findByEmailWithPasswordHash: () => Promise.resolve(found),
    } as unknown as UsersRepository;
    const jwt = {
      signAsync: (payload: unknown) => {
        signed.push(payload);
        return Promise.resolve('token-firmado');
      },
    } as unknown as JwtService;
    service = new AuthService(repo, jwt);
  });

  it('con credenciales válidas devuelve el token y los datos públicos', async () => {
    const result = await service.login({
      email: 'ana@t.local',
      password: PASSWORD,
    });

    expect(result).toEqual({
      accessToken: 'token-firmado',
      user: {
        id: 5,
        fullName: 'Ana Prueba',
        email: 'ana@t.local',
        role: 'supervisor',
      },
    });
    expect(signed).toEqual([
      { sub: 5, email: 'ana@t.local', role: 'supervisor' },
    ]);
    // El hash nunca sale en la respuesta
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('rechaza una contraseña incorrecta con el mensaje único', async () => {
    await expect(
      service.login({ email: 'ana@t.local', password: 'otra-clave' }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    expect(signed).toEqual([]);
  });

  it('rechaza un email inexistente con el mismo mensaje', async () => {
    found = null;

    await expect(
      service.login({ email: 'nadie@t.local', password: PASSWORD }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    expect(signed).toEqual([]);
  });

  it('rechaza a un usuario inactivo aunque la contraseña sea correcta', async () => {
    found = { ...user, active: false } as UserAccount;

    await expect(
      service.login({ email: 'ana@t.local', password: PASSWORD }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    expect(signed).toEqual([]);
  });
});
