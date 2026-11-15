import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-05 persistido: umbral de mantenimiento por tipo de vehículo y horas del
 * último servicio por vehículo.
 *
 * La clave foránea maintenance_thresholds -> vehicle_types se declara solo acá
 * (ADR-003: la integridad la garantiza la base). La entidad no define la
 * relación para no acoplar el módulo Maintenance a la entidad de Vehicles
 * (ADR-002, regla 1).
 */
export class CreateMaintenanceThresholds1794703200000 implements MigrationInterface {
  name = 'CreateMaintenanceThresholds1794703200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "maintenance_thresholds" ("id" SERIAL NOT NULL, "vehicle_type_id" integer NOT NULL, "interval_hours" double precision NOT NULL, CONSTRAINT "PK_maintenance_thresholds" PRIMARY KEY ("id"), CONSTRAINT "UQ_maintenance_thresholds_vehicle_type" UNIQUE ("vehicle_type_id"), CONSTRAINT "CHK_maintenance_thresholds_interval" CHECK ("interval_hours" > 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_thresholds" ADD CONSTRAINT "FK_maintenance_thresholds_vehicle_type" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "last_service_hours" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "CHK_vehicles_last_service_hours" CHECK ("last_service_hours" >= 0 AND "last_service_hours" <= "total_engine_hours")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "CHK_vehicles_last_service_hours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "last_service_hours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_thresholds" DROP CONSTRAINT "FK_maintenance_thresholds_vehicle_type"`,
    );
    await queryRunner.query(`DROP TABLE "maintenance_thresholds"`);
  }
}
