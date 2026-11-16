import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auditoría S2, N-05 (RF-11): registrar quién cancela una asignación.
 * La columna admite NULL: las asignaciones activas y las canceladas antes de
 * este cambio no tienen ese dato. No se edita la migración CreateShifts
 * (ADR-003, migraciones aplicadas son inmutables).
 */
export class AddShiftCancelledBy1794877200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" ADD "cancelled_by_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" ADD CONSTRAINT "FK_shift_assignments_cancelled_by" FOREIGN KEY ("cancelled_by_id") REFERENCES "user_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" DROP CONSTRAINT "FK_shift_assignments_cancelled_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift_assignments" DROP COLUMN "cancelled_by_id"`,
    );
  }
}
