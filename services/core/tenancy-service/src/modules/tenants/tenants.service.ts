import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { Condominium } from '../condominiums/entities/condominium.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  countryCode?: string;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Condominium)
    private readonly condominiumRepository: Repository<Condominium>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Check if tenant with same legal name already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { legal_name: createTenantDto.legal_name },
    });

    if (existingTenant) {
      throw new ConflictException(
        `Tenant with legal name '${createTenantDto.legal_name}' already exists`,
      );
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      status: TenantStatus.ACTIVE,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Emit event for other services
    this.eventEmitter.emit('tenant.created', {
      tenantId: savedTenant.id,
      type: savedTenant.type,
      legalName: savedTenant.legal_name,
      countryCode: savedTenant.country_code,
      timestamp: new Date(),
    });

    return savedTenant;
  }

  async findAll(options: FindAllOptions): Promise<{
    data: Tenant[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, status, type, countryCode } = options;
    
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

    if (status) {
      queryBuilder.andWhere('tenant.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('tenant.type = :type', { type });
    }

    if (countryCode) {
      queryBuilder.andWhere('tenant.country_code = :countryCode', { countryCode });
    }

    queryBuilder
      .orderBy('tenant.created_at', 'DESC')
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

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['condominiums'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Check if legal name is being changed and if it conflicts
    if (updateTenantDto.legal_name && updateTenantDto.legal_name !== tenant.legal_name) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { legal_name: updateTenantDto.legal_name },
      });

      if (existingTenant && existingTenant.id !== id) {
        throw new ConflictException(
          `Tenant with legal name '${updateTenantDto.legal_name}' already exists`,
        );
      }
    }

    Object.assign(tenant, updateTenantDto);
    const updatedTenant = await this.tenantRepository.save(tenant);

    // Emit event for other services
    this.eventEmitter.emit('tenant.updated', {
      tenantId: updatedTenant.id,
      changes: updateTenantDto,
      timestamp: new Date(),
    });

    return updatedTenant;
  }

  async deactivate(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (tenant.status === TenantStatus.CANCELLED) {
      throw new BadRequestException('Tenant is already deactivated');
    }

    // Check if tenant has active condominiums
    const activeCondominiums = await this.condominiumRepository.count({
      where: {
        tenant_id: id,
        status: 'ACTIVE',
      },
    });

    if (activeCondominiums > 0) {
      throw new ConflictException(
        `Cannot deactivate tenant with ${activeCondominiums} active condominiums. ` +
        'Please deactivate all condominiums first.',
      );
    }

    tenant.status = TenantStatus.CANCELLED;
    const deactivatedTenant = await this.tenantRepository.save(tenant);

    // Emit event for other services
    this.eventEmitter.emit('tenant.deactivated', {
      tenantId: deactivatedTenant.id,
      timestamp: new Date(),
    });

    return deactivatedTenant;
  }

  async getCondominiums(tenantId: string, status?: string) {
    const tenant = await this.findOne(tenantId);

    const queryBuilder = this.condominiumRepository
      .createQueryBuilder('condominium')
      .where('condominium.tenant_id = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('condominium.status = :status', { status });
    }

    queryBuilder.orderBy('condominium.created_at', 'DESC');

    const condominiums = await queryBuilder.getMany();

    return {
      tenant: {
        id: tenant.id,
        legal_name: tenant.legal_name,
        type: tenant.type,
      },
      condominiums,
      total: condominiums.length,
    };
  }
}