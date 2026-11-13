import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehiclesTables1791939691656 implements MigrationInterface {
  name = 'CreateVehiclesTables1791939691656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."vehicles_status_enum" AS ENUM('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" SERIAL NOT NULL, "internal_code" character varying NOT NULL, "license_plate" character varying NOT NULL, "total_engine_hours" double precision NOT NULL DEFAULT '0', "status" "public"."vehicles_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "vehicle_type_id" integer NOT NULL, CONSTRAINT "UQ_95974f4a6c37b4b1df851519771" UNIQUE ("internal_code"), CONSTRAINT "UQ_7e9fab2e8625b63613f67bd706c" UNIQUE ("license_plate"), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_types" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "category" character varying NOT NULL, CONSTRAINT "PK_73d1e40f4add7f4f6947acad3a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_8c6922f37d6f8a496a4cabfe080" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_8c6922f37d6f8a496a4cabfe080"`,
    );
    await queryRunner.query(`DROP TABLE "vehicle_types"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TYPE "public"."vehicles_status_enum"`);
  }
}
