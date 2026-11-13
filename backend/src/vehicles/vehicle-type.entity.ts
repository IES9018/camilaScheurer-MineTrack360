import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Vehicle } from './vehicle.entity';

/**
 * Tipo de vehículo (ERD: VEHICLE_TYPE). Centraliza la categoría para no
 * repetirla en cada vehículo (3FN, informe sección 4.2).
 */
@Entity('vehicle_types')
export class VehicleType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  category: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.vehicleType)
  vehicles: Vehicle[];
}
