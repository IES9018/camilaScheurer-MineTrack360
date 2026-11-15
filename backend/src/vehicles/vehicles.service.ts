import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { FleetVehicleSnapshot } from './fleet-snapshot.interface';
import { Vehicle } from './vehicle.entity';
import { VehiclesRepository } from './vehicles.repository';

/** Casos de uso del módulo Vehicles. */
@Injectable()
export class VehiclesService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  /** Lista todos los vehículos de la flota, ordenados por código interno. */
  findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.findAll();
  }

  /** @throws NotFoundException si no existe un vehículo con ese id. */
  async findOne(id: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehículo con id ${id} no encontrado`);
    }
    return vehicle;
  }

  /** Vista de la flota para otros módulos (ver `FleetVehicleSnapshot`). */
  async findFleetSnapshot(): Promise<FleetVehicleSnapshot[]> {
    const vehicles = await this.vehiclesRepository.findAll();
    return vehicles.map((vehicle) => ({
      id: vehicle.id,
      internalCode: vehicle.internalCode,
      vehicleTypeId: vehicle.vehicleType.id,
      vehicleTypeName: vehicle.vehicleType.name,
      status: vehicle.status,
      totalEngineHours: vehicle.totalEngineHours,
      lastServiceHours: vehicle.lastServiceHours,
    }));
  }

  /** Indica si existe un tipo de vehículo con ese id. */
  async vehicleTypeExists(id: number): Promise<boolean> {
    return (await this.vehiclesRepository.findVehicleTypeById(id)) !== null;
  }

  /**
   * Registra un vehículo nuevo.
   * @throws BadRequestException si el tipo de vehículo no existe o si las horas
   * del último servicio superan las horas acumuladas.
   * @throws ConflictException si el código interno o la patente ya están en uso.
   */
  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    if ((dto.lastServiceHours ?? 0) > (dto.totalEngineHours ?? 0)) {
      throw new BadRequestException(
        'Las horas del último servicio no pueden superar las horas acumuladas',
      );
    }

    const vehicleType = await this.vehiclesRepository.findVehicleTypeById(
      dto.vehicleTypeId,
    );
    if (!vehicleType) {
      throw new BadRequestException(
        `El tipo de vehículo con id ${dto.vehicleTypeId} no existe`,
      );
    }

    const duplicate = await this.vehiclesRepository.findByUniqueFields(
      dto.internalCode,
      dto.licensePlate,
    );
    if (duplicate) {
      throw new ConflictException(
        'Ya existe un vehículo con ese código interno o esa patente',
      );
    }

    const saved = await this.vehiclesRepository.create({
      internalCode: dto.internalCode,
      licensePlate: dto.licensePlate,
      vehicleType,
      totalEngineHours: dto.totalEngineHours,
      lastServiceHours: dto.lastServiceHours,
      status: dto.status,
    });

    // Se relee de la base para devolver el estado real (valores por defecto incluidos)
    return this.findOne(saved.id);
  }
}
