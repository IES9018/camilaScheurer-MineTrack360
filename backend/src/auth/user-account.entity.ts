import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.entity';

/** Cuenta de usuario del sistema (ERD: USER_ACCOUNT). */
@Entity('user_accounts')
export class UserAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  // select: false -> el hash NUNCA se incluye en las consultas por defecto.
  // Solo se pide explícitamente al validar el login.
  @Column({ select: false })
  passwordHash: string;

  // eager: al cargar un usuario, trae su rol automáticamente
  @ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: false })
  role: Role;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
