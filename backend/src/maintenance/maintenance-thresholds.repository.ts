import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceThreshold } from './maintenance-threshold.entity';

/** Patrón Repositorio: el servicio no depende de TypeORM (informe 3.1). */
@Injectable()
export class MaintenanceThresholdsRepository {
  constructor(
    @InjectRepository(MaintenanceThreshold)
    private readonly thresholds: Repository<MaintenanceThreshold>,
  ) {}

  findAll(): Promise<MaintenanceThreshold[]> {
    return this.thresholds.find();
  }

  /** Crea el umbral del tipo o actualiza el existente (uno por tipo). */
  async upsert(
    vehicleTypeId: number,
    intervalHours: number,
  ): Promise<MaintenanceThreshold> {
    await this.thresholds.upsert({ vehicleTypeId, intervalHours }, [
      'vehicleTypeId',
    ]);
    return this.thresholds.findOneByOrFail({ vehicleTypeId });
  }
}
