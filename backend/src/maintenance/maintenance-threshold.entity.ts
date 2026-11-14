import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Intervalo de servicio por tipo de vehículo (ERD: MAINTENANCE_THRESHOLD).
 * Evita repetir el umbral en cada vehículo (3FN, informe sección 4.2).
 *
 * `vehicleTypeId` es una columna simple: la clave foránea hacia `vehicle_types`
 * vive en la migración, y así este módulo no importa entidades de Vehicles
 * (ADR-002, regla 1).
 */
@Entity('maintenance_thresholds')
@Unique('UQ_maintenance_thresholds_vehicle_type', ['vehicleTypeId'])
@Check('CHK_maintenance_thresholds_interval', '"interval_hours" > 0')
export class MaintenanceThreshold {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  vehicleTypeId: number;

  @Column('float')
  intervalHours: number;
}
