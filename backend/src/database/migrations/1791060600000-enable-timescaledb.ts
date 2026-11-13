import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita la extensión TimescaleDB (informe, secciones 3.3 y 4.3).
 * Es prerrequisito para crear luego la hypertable TELEMETRY_READING.
 */
export class EnableTimescaledb1791060600000 implements MigrationInterface {
  name = 'EnableTimescaledb1791060600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS timescaledb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ojo: fallará si ya existen hypertables que dependan de la extensión.
    await queryRunner.query('DROP EXTENSION IF EXISTS timescaledb');
  }
}
