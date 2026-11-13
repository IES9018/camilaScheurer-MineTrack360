import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL no está definida. Ejecutá este comando dentro del contenedor backend-dev.',
  );
}

// IMPORTANTE: un solo export (default). La CLI de TypeORM exige exactamente un DataSource exportado.
export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  // La CLI no pasa por NestJS, así que busca las entidades y migraciones por patrón
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  // Propiedades camelCase en el código -> columnas snake_case en la base (ERD)
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
});
