import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-07: operadores y asignación de vehículos a turnos.
 *
 * "No duplicar" lo garantiza la base con dos índices únicos parciales: un
 * mismo vehículo, o un mismo operador, no puede tener dos asignaciones
 * ASSIGNED en la misma fecha y turno. Las canceladas quedan como historial.
 * Las claves foráneas hacia `vehicles` y `user_accounts` se declaran solo acá
 * (ADR-002, regla 1; ADR-003).
 */
export class CreateShifts1794790800000 implements MigrationInterface {
  name = 'CreateShifts1794790800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "operators" ("id" SERIAL NOT NULL, "full_name" character varying NOT NULL, "employee_code" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_operators" PRIMARY KEY ("id"), CONSTRAINT "UQ_operators_employee_code" UNIQUE ("employee_code"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_assignments_shift_enum" AS ENUM('MORNING', 'AFTERNOON', 'NIGHT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_assignments_status_enum" AS ENUM('ASSIGNED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift_assignments" ("id" SERIAL NOT NULL, "vehicle_id" integer NOT NULL, "operator_id" integer NOT NULL, "shift_date" date NOT NULL, "shift" "public"."shift_assignments_shift_enum" NOT NULL, "status" "public"."shift_assignments_status_enum" NOT NULL DEFAULT 'ASSIGNED', "assigned_by_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_shift_assignments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shift_assignments_vehicle_slot" ON "shift_assignments" ("vehicle_id", "shift_date", "shift") WHERE "status" = 'ASSIGNED'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shift_assignments_operator_slot" ON "shift_assignments" ("operator_id", "shift_date", "shift") WHERE "status" = 'ASSIGNED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" ADD CONSTRAINT "FK_shift_assignments_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" ADD CONSTRAINT "FK_shift_assignments_operator" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" ADD CONSTRAINT "FK_shift_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "user_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shift_assignments"`);
    await queryRunner.query(
      `DROP TYPE "public"."shift_assignments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."shift_assignments_shift_enum"`,
    );
    await queryRunner.query(`DROP TABLE "operators"`);
  }
}
