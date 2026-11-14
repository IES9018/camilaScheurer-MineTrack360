import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from './vehicle-type.entity';
import { Vehicle, VehicleStatus } from './vehicle.entity';

/** Datos necesarios para insertar un vehículo. */
export interface NewVehicleData {
  internalCode: string;
  licensePlate: string;
  vehicleType: VehicleType;
  totalEngineHours?: number;
  lastServiceHours?: number;
  status?: VehicleStatus;
}

/**
 * Patrón Repositorio (informe, sección 3.1): el servicio depende de esta clase
 * y no de TypeORM, lo que permite reemplazarla por un mock en las pruebas.
 */
@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypes: Repository<VehicleType>,
  ) {}

  findAll(): Promise<Vehicle[]> {
    return this.vehicles.find({ order: { internalCode: 'ASC' } });
  }

  findById(id: number): Promise<Vehicle | null> {
    return this.vehicles.findOneBy({ id });
  }

  /** Busca un vehículo que ya use ese código interno O esa patente. */
  findByUniqueFields(
    internalCode: string,
    licensePlate: string,
  ): Promise<Vehicle | null> {
    return this.vehicles.findOne({
      where: [{ internalCode }, { licensePlate }],
    });
  }

  findVehicleTypeById(id: number): Promise<VehicleType | null> {
    return this.vehicleTypes.findOneBy({ id });
  }

  create(data: NewVehicleData): Promise<Vehicle> {
    return this.vehicles.save(this.vehicles.create(data));
  }
}
