import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset, AssetStatus } from './entities/asset.entity';
import { MaintenancePlan } from '../maintenance-plans/entities/maintenance-plan.entity';
import { WorkOrder } from '../work-orders/entities/work-order.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  type?: string;
  category?: string;
  status?: string;
  criticality?: string;
  spaceId?: string;
  warrantyStatus?: string;
}

interface WorkOrderFilters {
  status?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(MaintenancePlan)
    private readonly maintenancePlanRepository: Repository<MaintenancePlan>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    // TODO: Validate space_id exists in tenancy-service
    
    const asset = this.assetRepository.create({
      ...createAssetDto,
      // tenant_id will be set by tenant interceptor
      installation_date: createAssetDto.installation_date ? new Date(createAssetDto.installation_date) : null,
      warranty_until: createAssetDto.warranty_until ? new Date(createAssetDto.warranty_until) : null,
    });

    const savedAsset = await this.assetRepository.save(asset);

    // Emit event for other services
    this.eventEmitter.emit('asset.created', {
      assetId: savedAsset.id,
      tenantId: savedAsset.tenant_id,
      type: savedAsset.type,
      category: savedAsset.category,
      criticality: savedAsset.criticality,
      spaceId: savedAsset.space_id,
      timestamp: new Date(),
    });

    this.logger.log(`Asset created: ${savedAsset.id} - ${savedAsset.name}`);
    return savedAsset;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, type, category, status, criticality, spaceId, warrantyStatus } = options;

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.space', 'space')
      .leftJoinAndSelect('asset.maintenance_plans', 'maintenance_plans')
      .where('asset.tenant_id = :tenantId', { tenantId: 'current_tenant' }); // TODO: Get from context

    if (type) {
      queryBuilder.andWhere('asset.type = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('asset.category = :category', { category });
    }

    if (status) {
      queryBuilder.andWhere('asset.status = :status', { status });
    }

    if (criticality) {
      queryBuilder.andWhere('asset.criticality = :criticality', { criticality });
    }

    if (spaceId) {
      queryBuilder.andWhere('asset.space_id = :spaceId', { spaceId });
    }

    if (warrantyStatus) {
      const now = new Date();
      switch (warrantyStatus) {
        case 'active':
          queryBuilder.andWhere('asset.warranty_until > :now', { now });
          break;
        case 'expired':
          queryBuilder.andWhere('asset.warranty_until <= :now', { now });
          break;
        case 'unknown':
          queryBuilder.andWhere('asset.warranty_until IS NULL');
          break;
      }
    }

    queryBuilder
      .orderBy('asset.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Add warranty status to each asset
    const assetsWithWarranty = data.map(asset => ({
      ...asset,
      warranty_status: asset.warrantyStatus,
      is_under_warranty: asset.isUnderWarranty,
    }));

    return {
      data: assetsWithWarranty,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['space', 'maintenance_plans', 'work_orders'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return asset;
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);

    // Convert date strings to Date objects
    if (updateAssetDto.installation_date) {
      updateAssetDto.installation_date = new Date(updateAssetDto.installation_date) as any;
    }
    if (updateAssetDto.warranty_until) {
      updateAssetDto.warranty_until = new Date(updateAssetDto.warranty_until) as any;
    }

    Object.assign(asset, updateAssetDto);
    const updatedAsset = await this.assetRepository.save(asset);

    // Emit event for other services
    this.eventEmitter.emit('asset.updated', {
      assetId: updatedAsset.id,
      tenantId: updatedAsset.tenant_id,
      changes: updateAssetDto,
      timestamp: new Date(),
    });

    this.logger.log(`Asset updated: ${updatedAsset.id} - ${updatedAsset.name}`);
    return updatedAsset;
  }

  async remove(id: string) {
    const asset = await this.findOne(id);

    // Soft delete by setting status to DECOMMISSIONED
    asset.status = AssetStatus.DECOMMISSIONED;
    await this.assetRepository.save(asset);

    // Emit event for other services
    this.eventEmitter.emit('asset.decommissioned', {
      assetId: asset.id,
      tenantId: asset.tenant_id,
      timestamp: new Date(),
    });

    this.logger.log(`Asset decommissioned: ${asset.id} - ${asset.name}`);
    return { message: 'Asset decommissioned successfully' };
  }

  async uploadPhotos(id: string, files: Express.Multer.File[]) {
    const asset = await this.findOne(id);

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // TODO: Upload files to documents-service and get URLs
    const photoUrls = files.map(file => `https://cdn.smartedify.com/assets/${asset.id}/${file.filename}`);

    // Add new photos to existing ones
    asset.fotos = [...(asset.fotos || []), ...photoUrls];
    await this.assetRepository.save(asset);

    this.logger.log(`Photos uploaded for asset: ${asset.id} - ${files.length} files`);
    return {
      message: 'Photos uploaded successfully',
      photos: photoUrls,
      total_photos: asset.fotos.length,
    };
  }

  async getMaintenancePlans(id: string) {
    const asset = await this.findOne(id);

    const plans = await this.maintenancePlanRepository.find({
      where: { asset_id: id },
      order: { created_at: 'DESC' },
    });

    return {
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        category: asset.category,
      },
      maintenance_plans: plans,
      total: plans.length,
    };
  }

  async getWorkOrders(id: string, filters: WorkOrderFilters) {
    const asset = await this.findOne(id);

    const queryBuilder = this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.asset_id = :assetId', { assetId: id })
      .orderBy('wo.created_at', 'DESC');

    if (filters.status) {
      queryBuilder.andWhere('wo.status = :status', { status: filters.status });
    }

    if (filters.from) {
      queryBuilder.andWhere('wo.created_at >= :from', { from: new Date(filters.from) });
    }

    if (filters.to) {
      queryBuilder.andWhere('wo.created_at <= :to', { to: new Date(filters.to) });
    }

    const workOrders = await queryBuilder.getMany();

    return {
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        category: asset.category,
      },
      work_orders: workOrders,
      total: workOrders.length,
      filters,
    };
  }

  async getWarrantyStatus(id: string) {
    const asset = await this.findOne(id);

    const warrantyStatus = asset.warrantyStatus;
    let daysRemaining: number | null = null;
    let alertLevel: 'none' | 'warning' | 'critical' = 'none';

    if (asset.warranty_until) {
      const now = new Date();
      const diffTime = asset.warranty_until.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (warrantyStatus === 'active') {
        if (daysRemaining <= 30) {
          alertLevel = 'critical';
        } else if (daysRemaining <= 90) {
          alertLevel = 'warning';
        }
      }
    }

    return {
      asset_id: asset.id,
      asset_name: asset.name,
      warranty_status: warrantyStatus,
      warranty_until: asset.warranty_until,
      days_remaining: daysRemaining,
      alert_level: alertLevel,
      is_under_warranty: asset.isUnderWarranty,
    };
  }

  async createMaintenancePlan(id: string, createPlanDto: any) {
    const asset = await this.findOne(id);

    // TODO: Implement maintenance plan creation
    // This would integrate with the maintenance-plans service

    this.logger.log(`Maintenance plan creation requested for asset: ${asset.id}`);
    return {
      message: 'Maintenance plan creation initiated',
      asset_id: asset.id,
      // TODO: Return created plan details
    };
  }
}