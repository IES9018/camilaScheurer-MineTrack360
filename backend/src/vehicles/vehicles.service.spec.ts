import { BadRequestException, ConflictException } from '@nestjs/common';
import { VehicleType } from './vehicle-type.entity';
import { Vehicle, VehicleStatus } from './vehicle.entity';
import { NewVehicleData, VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';

const type: VehicleType = {
  id: 3,
  name: 'Camión fuera de ruta',
  category: 'Transporte',
  vehicles: [],
};

const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 10,
  internalCode: 'CAM-010',
  licensePlate: 'AB123CD',
  vehicleType: type,
  totalEngineHours: 800,
  lastServiceHours: 500,
  status: VehicleStatus.ACTIVE,
  createdAt: new Date('2026-11-14T00:00:00Z'),
  ...overrides,
});

describe('VehiclesService', () => {
  let stored: Vehicle[];
  let typeFound: VehicleType | null;
  let duplicate: Vehicle | null;
  let created: NewVehicleData[];
  let service: VehiclesService;

  beforeEach(() => {
    stored = [];
    typeFound = type;
    duplicate = null;
    created = [];

    const repository = {
      findAll: () => Promise.resolve(stored),
      findById: (id: number) =>
        Promise.resolve(stored.find((v) => v.id === id) ?? null),
      findVehicleTypeById: () => Promise.resolve(typeFound),
      findByUniqueFields: () => Promise.resolve(duplicate),
      create: (data: NewVehicleData) => {
        created.push(data);
        const saved = vehicle({ id: 99, ...data });
        stored.push(saved);
        return Promise.resolve(saved);
      },
    } as unknown as VehiclesRepository;

    service = new VehiclesService(repository);
  });

  describe('findFleetSnapshot', () => {
    it('expone solo los datos que necesita otro módulo, sin la entidad', async () => {
      stored = [vehicle()];

      await expect(service.findFleetSnapshot()).resolves.toEqual([
        {
          id: 10,
          internalCode: 'CAM-010',
          vehicleTypeId: 3,
          vehicleTypeName: 'Camión fuera de ruta',
          status: VehicleStatus.ACTIVE,
          totalEngineHours: 800,
          lastServiceHours: 500,
        },
      ]);
    });
  });

  describe('vehicleTypeExists', () => {
    it('devuelve true si el tipo existe y false si no', async () => {
      await expect(service.vehicleTypeExists(3)).resolves.toBe(true);
      typeFound = null;
      await expect(service.vehicleTypeExists(3)).resolves.toBe(false);
    });
  });

  describe('create', () => {
    const dto = {
      internalCode: 'CAM-099',
      licensePlate: 'ZZ999ZZ',
      vehicleTypeId: 3,
    };

    it('rechaza horas de último servicio mayores a las acumuladas', async () => {
      await expect(
        service.create({
          ...dto,
          totalEngineHours: 100,
          lastServiceHours: 150,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(created).toEqual([]);
    });

    it('rechaza lastServiceHours > 0 si no se informan horas acumuladas', async () => {
      await expect(
        service.create({ ...dto, lastServiceHours: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda lastServiceHours cuando es coherente con las horas acumuladas', async () => {
      await service.create({
        ...dto,
        totalEngineHours: 200,
        lastServiceHours: 150,
      });

      expect(created[0]).toMatchObject({
        totalEngineHours: 200,
        lastServiceHours: 150,
      });
    });

    it('rechaza un tipo de vehículo inexistente', async () => {
      typeFound = null;

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza código interno o patente duplicados', async () => {
      duplicate = vehicle();

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
