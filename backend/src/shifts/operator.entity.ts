import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Operador de vehículo (chofer). No es un usuario del sistema: no inicia
 * sesión, por eso no usa los roles de RF-02.
 */
@Entity('operators')
@Unique('UQ_operators_employee_code', ['employeeCode'])
export class Operator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  /** Legajo o código interno del operador. */
  @Column()
  employeeCode: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
