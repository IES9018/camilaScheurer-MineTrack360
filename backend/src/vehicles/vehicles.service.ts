import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
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

  /**
   * Registra un vehículo nuevo.
   * @throws BadRequestException si el tipo de vehículo no existe.
   * @throws ConflictException si el código interno o la patente ya están en uso.
   */
  async create(dto: CreateVehicleDto): Promise<Vehicle> {
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
      status: dto.status,
    });

    // Se relee de la base para devolver el estado real (valores por defecto incluidos)
    return this.findOne(saved.id);
  }
}
