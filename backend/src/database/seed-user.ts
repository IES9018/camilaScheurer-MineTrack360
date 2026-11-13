import 'reflect-metadata';
import { Role, ROLE_NAMES, RoleName } from '../auth/role.entity';
import { hashPassword } from '../auth/password.util';
import { UserAccount } from '../auth/user-account.entity';
import dataSource from './data-source';

/**
 * Crea un usuario desde la terminal (útil para el primer administrador).
 *
 * Uso (dentro del contenedor, desde backend/):
 *   USER_EMAIL=admin@minetrack360.com USER_PASSWORD='MiClaveSegura1' \
 *   USER_NAME='Administrador' USER_ROLE=admin npm run seed:user
 *
 * USER_NAME es opcional (por defecto "Administrador") y USER_ROLE también (por defecto "admin").
 * Si ya existe un usuario con ese email, no hace nada.
 */
async function main(): Promise<void> {
  const email = process.env.USER_EMAIL?.trim().toLowerCase();
  const password = process.env.USER_PASSWORD;
  const fullName = process.env.USER_NAME?.trim() || 'Administrador';
  const roleName = (process.env.USER_ROLE?.trim() || 'admin') as RoleName;

  if (!email || !email.includes('@')) {
    throw new Error('Falta USER_EMAIL (debe ser un email válido).');
  }
  if (!password || password.length < 8) {
    throw new Error('Falta USER_PASSWORD (mínimo 8 caracteres).');
  }
  if (!ROLE_NAMES.includes(roleName)) {
    throw new Error(
      `USER_ROLE inválido. Valores posibles: ${ROLE_NAMES.join(', ')}.`,
    );
  }

  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(UserAccount);

    if (await users.existsBy({ email })) {
      console.log(
        `Ya existe un usuario con el email ${email}. No se hizo nada.`,
      );
      return;
    }

    const role = await dataSource
      .getRepository(Role)
      .findOneBy({ name: roleName });
    if (!role) {
      throw new Error(
        `No existe el rol "${roleName}". ¿Corriste npm run migration:run?`,
      );
    }

    await users.save(
      users.create({
        fullName,
        email,
        passwordHash: await hashPassword(password),
        role,
      }),
    );
    console.log(`Usuario creado: ${email} (rol: ${roleName}).`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
