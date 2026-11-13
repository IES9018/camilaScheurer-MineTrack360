import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1793063543069 implements MigrationInterface {
  name = 'CreateAuthTables1793063543069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_accounts" ("id" SERIAL NOT NULL, "full_name" character varying NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "role_id" integer NOT NULL, CONSTRAINT "UQ_df3802ec9c31dd9491e3589378d" UNIQUE ("email"), CONSTRAINT "PK_125e915cf23ad1cfb43815ce59b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_accounts" ADD CONSTRAINT "FK_d17e21f468588fd08e977a020fa" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Datos de referencia: los 5 roles del sistema (RF-02 y HU-07 del informe).
    // Los nombres deben coincidir con los usados en @Roles('admin', ...).
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description") VALUES
        ('admin', 'Administrador: gestiona usuarios, roles, tipos de vehículo y umbrales de mantenimiento'),
        ('supervisor', 'Supervisor de Turno: visualiza la flota y asigna vehículos y operadores'),
        ('mantenimiento', 'Personal de Mantenimiento: gestiona alertas e intervenciones de mantenimiento'),
        ('hse', 'Responsable de HSE: consulta incidentes de seguridad y exporta reportes'),
        ('lectura', 'Solo lectura: consulta información sin posibilidad de modificarla')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_accounts" DROP CONSTRAINT "FK_d17e21f468588fd08e977a020fa"`,
    );
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "user_accounts"`);
  }
}
