import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleType } from './vehicle-type.entity';

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

/**
 * Vehículo de la flota (ERD: VEHICLE). Basada en el fragmento de la
 * sección 6.4 del informe. La relación con MaintenanceRecord se agrega
 * cuando exista el módulo Maintenance.
 */
@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  internalCode: string;

  @Column({ unique: true })
  licensePlate: string;

  // eager: al cargar un vehículo, trae su tipo automáticamente
  @ManyToOne(() => VehicleType, (type) => type.vehicles, {
    eager: true,
    nullable: false,
  })
  vehicleType: VehicleType;

  @Column('float', { default: 0 })
  totalEngineHours: number;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
