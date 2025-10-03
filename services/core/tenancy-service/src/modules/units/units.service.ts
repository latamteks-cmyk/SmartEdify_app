import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { Unit, UnitStatus, UnitKind } from './entities/unit.entity';
import { Condominium } from '../condominiums/entities/condominium.entity';
import { Building } from '../buildings/entities/building.entity';

interface FindAllOptions {
  condominiumId?: string;
  kind?: string;
  status?: string;
  buildingId?: string;
  page: number;
  limit: number;
}

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Condominium)
    private readonly condominiumRepository: Repository<Condominium>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createUnitDto: CreateUnitDto): Promise<Unit> {
    // Validate condominium exists
    const condominium = await this.condominiumRepository.findOne({
      where: { id: createUnitDto.condominium_id },
    });

    if (!condominium) {
      throw new NotFoundException(
        `Condominium with ID ${createUnitDto.condominium_id} not found`,
      );
    }

    // Validate building exists if provided
    if (createUnitDto.building_id) {
      const building = await this.buildingRepository.findOne({
        where: {
          id: createUnitDto.building_id,
          condominium_id: createUnitDto.condominium_id,
        },
      });

      if (!building) {
        throw new NotFoundException(
          `Building with ID ${createUnitDto.building_id} not found in condominium`,
        );
      }
    }

    // Check if unit with same local_code already exists in condominium
    const existingUnit = await this.unitRepository.findOne({
      where: {
        condominium_id: createUnitDto.condominium_id,
        local_code: createUnitDto.local_code,
      },
    });

    if (existingUnit) {
      throw new ConflictException(
        `Unit with local code '${createUnitDto.local_code}' already exists in condominium`,
      );
    }

    // Validate common area type is provided for COMMON units
    if (createUnitDto.kind === UnitKind.COMMON && !createUnitDto.common_type) {
      throw new BadRequestException(
        'common_type is required for COMMON units',
      );
    }

    const unit = this.unitRepository.create({
      ...createUnitDto,
      tenant_id: condominium.tenant_id,
      status: UnitStatus.ACTIVE,
    });

    const savedUnit = await this.unitRepository.save(unit);

    // Emit event for other services
    this.eventEmitter.emit('unit.created', {
      unitId: savedUnit.id,
      tenantId: savedUnit.tenant_id,
      condominiumId: savedUnit.condominium_id,
      localCode: savedUnit.local_code,
      kind: savedUnit.kind,
      commonType: savedUnit.common_type,
      timestamp: new Date(),
    });

    return savedUnit;
  }

  async findAll(options: FindAllOptions) {
    const { condominiumId, kind, status, buildingId, page, limit } = options;

    const queryBuilder = this.unitRepository
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.condominium', 'condominium')
      .leftJoinAndSelect('unit.building', 'building');

    if (condominiumId) {
      queryBuilder.andWhere('unit.condominium_id = :condominiumId', {
        condominiumId,
      });
    }

    if (kind) {
      queryBuilder.andWhere('unit.kind = :kind', { kind });
    }

    if (status) {
      queryBuilder.andWhere('unit.status = :status', { status });
    }

    if (buildingId) {
      queryBuilder.andWhere('unit.building_id = :buildingId', { buildingId });
    }

    queryBuilder
      .orderBy('unit.local_code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { id },
      relations: ['condominium', 'building'],
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    return unit;
  }

  async update(id: string, updateUnitDto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.findOne(id);

    // Check if local_code is being changed and if it conflicts
    if (updateUnitDto.local_code && updateUnitDto.local_code !== unit.local_code) {
      const existingUnit = await this.unitRepository.findOne({
        where: {
          condominium_id: unit.condominium_id,
          local_code: updateUnitDto.local_code,
        },
      });

      if (existingUnit && existingUnit.id !== id) {
        throw new ConflictException(
          `Unit with local code '${updateUnitDto.local_code}' already exists in condominium`,
        );
      }
    }

    // Validate building if being changed
    if (updateUnitDto.building_id && updateUnitDto.building_id !== unit.building_id) {
      const building = await this.buildingRepository.findOne({
        where: {
          id: updateUnitDto.building_id,
          condominium_id: unit.condominium_id,
        },
      });

      if (!building) {
        throw new NotFoundException(
          `Building with ID ${updateUnitDto.building_id} not found in condominium`,
        );
      }
    }

    Object.assign(unit, updateUnitDto);
    const updatedUnit = await this.unitRepository.save(unit);

    // Emit event for other services
    this.eventEmitter.emit('unit.updated', {
      unitId: updatedUnit.id,
      tenantId: updatedUnit.tenant_id,
      condominiumId: updatedUnit.condominium_id,
      changes: updateUnitDto,
      timestamp: new Date(),
    });

    return updatedUnit;
  }

  async deactivate(id: string): Promise<Unit> {
    const unit = await this.findOne(id);

    if (unit.status === UnitStatus.INACTIVE) {
      throw new BadRequestException('Unit is already deactivated');
    }

    unit.status = UnitStatus.INACTIVE;
    const deactivatedUnit = await this.unitRepository.save(unit);

    // Emit event for other services
    this.eventEmitter.emit('unit.deactivated', {
      unitId: deactivatedUnit.id,
      tenantId: deactivatedUnit.tenant_id,
      condominiumId: deactivatedUnit.condominium_id,
      timestamp: new Date(),
    });

    return deactivatedUnit;
  }

  async validateBulkCreate(bulkCreateDto: BulkCreateUnitsDto) {
    const { units } = bulkCreateDto;
    const errors: any[] = [];
    const warnings: any[] = [];

    // Group units by condominium for validation
    const unitsByCondominium = new Map<string, CreateUnitDto[]>();
    units.forEach((unit, index) => {
      if (!unitsByCondominium.has(unit.condominium_id)) {
        unitsByCondominium.set(unit.condominium_id, []);
      }
      unitsByCondominium.get(unit.condominium_id)!.push({ ...unit, index });
    });

    // Validate each condominium group
    for (const [condominiumId, condominiumUnits] of unitsByCondominium) {
      // Check if condominium exists
      const condominium = await this.condominiumRepository.findOne({
        where: { id: condominiumId },
      });

      if (!condominium) {
        errors.push({
          condominium_id: condominiumId,
          error: 'Condominium not found',
          affected_units: condominiumUnits.map((u: any) => u.index),
        });
        continue;
      }

      // Check for duplicate local_codes within the batch
      const localCodes = new Set<string>();
      const duplicates: string[] = [];

      condominiumUnits.forEach((unit: any) => {
        if (localCodes.has(unit.local_code)) {
          duplicates.push(unit.local_code);
        } else {
          localCodes.add(unit.local_code);
        }
      });

      if (duplicates.length > 0) {
        errors.push({
          condominium_id: condominiumId,
          error: 'Duplicate local_codes in batch',
          duplicates,
        });
      }

      // Check for existing local_codes in database
      const existingUnits = await this.unitRepository.find({
        where: {
          condominium_id: condominiumId,
        },
        select: ['local_code'],
      });

      const existingCodes = new Set(existingUnits.map(u => u.local_code));
      const conflicts = condominiumUnits
        .filter((unit: any) => existingCodes.has(unit.local_code))
        .map((unit: any) => unit.local_code);

      if (conflicts.length > 0) {
        errors.push({
          condominium_id: condominiumId,
          error: 'Local codes already exist',
          conflicts,
        });
      }

      // Calculate aliquot sum
      const totalAliquot = condominiumUnits.reduce(
        (sum: number, unit: any) => sum + (unit.aliquot || 0),
        0,
      );

      if (totalAliquot > 1) {
        warnings.push({
          condominium_id: condominiumId,
          warning: 'Total aliquot exceeds 1.0',
          total_aliquot: totalAliquot,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total_units: units.length,
        condominiums_affected: unitsByCondominium.size,
        private_units: units.filter(u => u.kind === UnitKind.PRIVATE).length,
        common_units: units.filter(u => u.kind === UnitKind.COMMON).length,
      },
    };
  }

  async executeBulkCreate(bulkCreateDto: BulkCreateUnitsDto) {
    // First validate the bulk operation
    const validation = await this.validateBulkCreate(bulkCreateDto);
    
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Bulk validation failed',
        errors: validation.errors,
      });
    }

    const { units } = bulkCreateDto;
    const createdUnits: Unit[] = [];

    // Execute in transaction
    await this.dataSource.transaction(async (manager) => {
      for (const unitDto of units) {
        // Get condominium for tenant_id
        const condominium = await manager.findOne(Condominium, {
          where: { id: unitDto.condominium_id },
        });

        const unit = manager.create(Unit, {
          ...unitDto,
          tenant_id: condominium!.tenant_id,
          status: UnitStatus.ACTIVE,
        });

        const savedUnit = await manager.save(unit);
        createdUnits.push(savedUnit);
      }
    });

    // Emit bulk event
    this.eventEmitter.emit('units.bulk_created', {
      units: createdUnits.map(u => ({
        unitId: u.id,
        tenantId: u.tenant_id,
        condominiumId: u.condominium_id,
        localCode: u.local_code,
        kind: u.kind,
      })),
      timestamp: new Date(),
    });

    return {
      success: true,
      created_count: createdUnits.length,
      units: createdUnits,
      warnings: validation.warnings,
    };
  }
}