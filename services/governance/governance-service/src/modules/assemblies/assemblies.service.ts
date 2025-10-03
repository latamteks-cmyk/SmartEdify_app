import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Assembly } from './entities/assembly.entity';
import { CreateAssemblyDto } from './dto/create-assembly.dto';
import { UpdateAssemblyDto } from './dto/update-assembly.dto';
import { AssemblyStatus, AssemblyType } from './enums/assembly.enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AssembliesService {
  constructor(
    @InjectRepository(Assembly)
    private readonly assemblyRepository: Repository<Assembly>,
  ) {}

  async create(createAssemblyDto: CreateAssemblyDto, tenantId: string): Promise<Assembly> {
    // Validate assembly dates
    if (createAssemblyDto.startDate >= createAssemblyDto.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check for overlapping assemblies of the same type
    const overlapping = await this.assemblyRepository
      .createQueryBuilder('assembly')
      .where('assembly.tenantId = :tenantId', { tenantId })
      .andWhere('assembly.type = :type', { type: createAssemblyDto.type })
      .andWhere('assembly.status != :status', { status: AssemblyStatus.CANCELLED })
      .andWhere(
        '(assembly.startDate <= :endDate AND assembly.endDate >= :startDate)',
        {
          startDate: createAssemblyDto.startDate,
          endDate: createAssemblyDto.endDate,
        }
      )
      .getOne();

    if (overlapping) {
      throw new ConflictException('Assembly dates overlap with existing assembly');
    }

    const assembly = this.assemblyRepository.create({
      ...createAssemblyDto,
      tenantId,
      status: AssemblyStatus.DRAFT,
    });

    return await this.assemblyRepository.save(assembly);
  }

  async findAll(
    tenantId: string,
    paginationDto: PaginationDto,
    filters?: {
      status?: AssemblyStatus;
      type?: AssemblyType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ data: Assembly[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.assemblyRepository
      .createQueryBuilder('assembly')
      .where('assembly.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      queryBuilder.andWhere('assembly.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      queryBuilder.andWhere('assembly.type = :type', { type: filters.type });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('assembly.startDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('assembly.endDate <= :endDate', { endDate: filters.endDate });
    }

    const [data, total] = await queryBuilder
      .orderBy('assembly.startDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Assembly> {
    const assembly = await this.assemblyRepository.findOne({
      where: { id, tenantId } as FindOptionsWhere<Assembly>,
      relations: ['sessions', 'votes'],
    });

    if (!assembly) {
      throw new NotFoundException(`Assembly with ID ${id} not found`);
    }

    return assembly;
  }

  async update(id: string, updateAssemblyDto: UpdateAssemblyDto, tenantId: string): Promise<Assembly> {
    const assembly = await this.findOne(id, tenantId);

    // Prevent updates to active or completed assemblies
    if (assembly.status === AssemblyStatus.ACTIVE || assembly.status === AssemblyStatus.COMPLETED) {
      throw new ForbiddenException('Cannot update active or completed assembly');
    }

    // Validate dates if provided
    if (updateAssemblyDto.startDate && updateAssemblyDto.endDate) {
      if (updateAssemblyDto.startDate >= updateAssemblyDto.endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    Object.assign(assembly, updateAssemblyDto);
    return await this.assemblyRepository.save(assembly);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const assembly = await this.findOne(id, tenantId);

    // Only allow deletion of draft assemblies
    if (assembly.status !== AssemblyStatus.DRAFT) {
      throw new ForbiddenException('Only draft assemblies can be deleted');
    }

    await this.assemblyRepository.remove(assembly);
  }

  async activate(id: string, tenantId: string): Promise<Assembly> {
    const assembly = await this.findOne(id, tenantId);

    if (assembly.status !== AssemblyStatus.DRAFT) {
      throw new BadRequestException('Only draft assemblies can be activated');
    }

    if (new Date() > assembly.startDate) {
      throw new BadRequestException('Cannot activate assembly with past start date');
    }

    assembly.status = AssemblyStatus.ACTIVE;
    return await this.assemblyRepository.save(assembly);
  }

  async cancel(id: string, tenantId: string): Promise<Assembly> {
    const assembly = await this.findOne(id, tenantId);

    if (assembly.status === AssemblyStatus.COMPLETED || assembly.status === AssemblyStatus.CANCELLED) {
      throw new BadRequestException('Cannot cancel completed or already cancelled assembly');
    }

    assembly.status = AssemblyStatus.CANCELLED;
    return await this.assemblyRepository.save(assembly);
  }

  async complete(id: string, tenantId: string): Promise<Assembly> {
    const assembly = await this.findOne(id, tenantId);

    if (assembly.status !== AssemblyStatus.ACTIVE) {
      throw new BadRequestException('Only active assemblies can be completed');
    }

    assembly.status = AssemblyStatus.COMPLETED;
    return await this.assemblyRepository.save(assembly);
  }

  async getAssemblyStats(tenantId: string): Promise<{
    total: number;
    byStatus: Record<AssemblyStatus, number>;
    byType: Record<AssemblyType, number>;
  }> {
    const assemblies = await this.assemblyRepository.find({
      where: { tenantId } as FindOptionsWhere<Assembly>,
    });

    const byStatus = assemblies.reduce((acc, assembly) => {
      acc[assembly.status] = (acc[assembly.status] || 0) + 1;
      return acc;
    }, {} as Record<AssemblyStatus, number>);

    const byType = assemblies.reduce((acc, assembly) => {
      acc[assembly.type] = (acc[assembly.type] || 0) + 1;
      return acc;
    }, {} as Record<AssemblyType, number>);

    return {
      total: assemblies.length,
      byStatus,
      byType,
    };
  }
}