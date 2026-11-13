import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserAccount } from './user-account.entity';

/**
 * Nombres de rol del sistema (RF-02, HU-07 del informe). Son los mismos
 * valores que se usan en el decorador @Roles('admin', 'supervisor', ...).
 */
export const ROLE_NAMES = [
  'admin',
  'supervisor',
  'mantenimiento',
  'hse',
  'lectura',
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

/** Rol de usuario (ERD: ROLE). */
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: RoleName;

  @Column()
  description: string;

  @OneToMany(() => UserAccount, (user) => user.role)
  users: UserAccount[];
}
