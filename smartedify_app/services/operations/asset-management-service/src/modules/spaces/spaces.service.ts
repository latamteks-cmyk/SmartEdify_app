import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space } from './entities/space.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  category?: string;
  complexity?: string;
}

interface MetricsFilters {
  from?: string;
  to?: string;
}

@Injectable()
export class SpacesService {
  private readonly logger = new Logger(SpacesService.name);

  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createSpaceDto: CreateSpaceDto): Promise<Space> {
    const space = this.spaceRepository.create({
      ...createSpaceDto,
      // tenant_id will be set by tenant interceptor
    });

    const savedSpace = await this.spaceRepository.save(space);

    // Emit event for other services
    this.eventEmitter.emit('space.created', {
      spaceId: savedSpace.id,
      tenantId: savedSpace.tenant_id,
      category: savedSpace.category,
      complexity: savedSpace.complexity,
      totalArea: savedSpace.totalArea,
      timestamp: new Date(),
    });

    this.logger.log(`Space created: ${savedSpace.id} - ${savedSpace.name}`);
    return savedSpace;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, category, complexity } = options;

    const queryBuilder = this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.assets', 'assets')
      .where('space.tenant_id = :tenantId', { tenantId: 'current_tenant' }); // TODO: Get from context

    if (category) {
      queryBuilder.andWhere('space.category = :category', { category });
    }

    if (complexity) {
      queryBuilder.andWhere('space.complexity = :complexity', { complexity });
    }

    queryBuilder
      .orderBy('space.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Add calculated metrics to each space
    const spacesWithMetrics = data.map(space => ({
      ...space,
      total_area: space.totalArea,
      estimated_cleaning_time_minutes: space.estimatedCleaningTimeMinutes,
      complexity_multiplier: space.complexityMultiplier,
      requires_special_equipment: space.requiresSpecialEquipment,
    }));

    return {
      data: spacesWithMetrics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['assets', 'work_orders'],
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }

    return space;
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findOne(id);

    Object.assign(space, updateSpaceDto);
    const updatedSpace = await this.spaceRepository.save(space);

    // Emit event for other services
    this.eventEmitter.emit('space.updated', {
      spaceId: updatedSpace.id,
      tenantId: updatedSpace.tenant_id,
      changes: updateSpaceDto,
      timestamp: new Date(),
    });

    this.logger.log(`Space updated: ${updatedSpace.id} - ${updatedSpace.name}`);
    return updatedSpace;
  }

  async remove(id: string) {
    const space = await this.findOne(id);

    await this.spaceRepository.remove(space);

    // Emit event for other services
    this.eventEmitter.emit('space.deleted', {
      spaceId: space.id,
      tenantId: space.tenant_id,
      timestamp: new Date(),
    });

    this.logger.log(`Space deleted: ${space.id} - ${space.name}`);
    return { message: 'Space deleted successfully' };
  }

  async updateDimensions(id: string, dimensionsDto: any) {
    const space = await this.findOne(id);

    // Update dimensions
    if (dimensionsDto.usable_floor_area_m2 !== undefined) {
      space.usable_floor_area_m2 = dimensionsDto.usable_floor_area_m2;
    }
    if (dimensionsDto.perimeter_m !== undefined) {
      space.perimeter_m = dimensionsDto.perimeter_m;
    }
    if (dimensionsDto.wall_height_m !== undefined) {
      space.wall_height_m = dimensionsDto.wall_height_m;
    }

    const updatedSpace = await this.spaceRepository.save(space);

    // Emit event for analytics service
    this.eventEmitter.emit('space.dimensions_updated', {
      spaceId: updatedSpace.id,
      tenantId: updatedSpace.tenant_id,
      dimensions: {
        usable_floor_area_m2: updatedSpace.usable_floor_area_m2,
        perimeter_m: updatedSpace.perimeter_m,
        wall_height_m: updatedSpace.wall_height_m,
        wall_area_m2: updatedSpace.wall_area_m2,
        total_area: updatedSpace.totalArea,
      },
      timestamp: new Date(),
    });

    this.logger.log(`Space dimensions updated: ${updatedSpace.id}`);
    return {
      message: 'Space dimensions updated successfully',
      space: updatedSpace,
      calculated_metrics: {
        wall_area_m2: updatedSpace.wall_area_m2,
        total_area: updatedSpace.totalArea,
        estimated_cleaning_time_minutes: updatedSpace.estimatedCleaningTimeMinutes,
      },
    };
  }

  async getMetrics(id: string, filters: MetricsFilters) {
    const space = await this.findOne(id);

    // Calculate various metrics for the space
    const metrics = {
      space_info: {
        id: space.id,
        name: space.name,
        category: space.category,
        complexity: space.complexity,
      },
      dimensions: {
        usable_floor_area_m2: space.usable_floor_area_m2,
        perimeter_m: space.perimeter_m,
        wall_height_m: space.wall_height_m,
        wall_area_m2: space.wall_area_m2,
        total_area: space.totalArea,
      },
      maintenance_metrics: {
        estimated_cleaning_time_minutes: space.estimatedCleaningTimeMinutes,
        complexity_multiplier: space.complexityMultiplier,
        requires_special_equipment: space.requiresSpecialEquipment,
      },
      // TODO: Add historical metrics based on work orders
      performance_metrics: {
        total_work_orders: space.work_orders?.length || 0,
        // Add more metrics from work order history
      },
    };

    return metrics;
  }
}