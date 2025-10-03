import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserProfile, ProfileStatus } from './entities/user-profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createProfileDto: CreateProfileDto): Promise<UserProfile> {
    // Verificar si el email ya existe en el tenant
    const existingProfile = await this.profileRepository.findOne({
      where: {
        tenantId: createProfileDto.tenantId,
        email: createProfileDto.email,
      },
    });

    if (existingProfile) {
      throw new ConflictException(
        `Profile with email ${createProfileDto.email} already exists in this tenant`
      );
    }

    // Crear el perfil
    const profile = this.profileRepository.create({
      ...createProfileDto,
      status: ProfileStatus.PENDING_VERIFICATION,
    });

    const savedProfile = await this.profileRepository.save(profile);

    // Emitir evento
    this.eventEmitter.emit('profile.created', {
      tenantId: savedProfile.tenantId,
      profileId: savedProfile.id,
      email: savedProfile.email,
      timestamp: new Date(),
    });

    return savedProfile;
  }

  async findAll(
    paginationDto: PaginationDto,
    filters: {
      status?: string;
      search?: string;
      condominiumId?: string;
    } = {},
  ) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.memberships', 'membership')
      .leftJoinAndSelect('membership.condominium', 'condominium')
      .where('profile.deletedAt IS NULL');

    // Aplicar filtros
    if (filters.status) {
      queryBuilder.andWhere('profile.status = :status', { status: filters.status });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(profile.firstName ILIKE :search OR profile.lastName ILIKE :search OR profile.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.condominiumId) {
      queryBuilder.andWhere('membership.condominiumId = :condominiumId', {
        condominiumId: filters.condominiumId,
      });
    }

    // Paginación
    queryBuilder.skip(skip).take(limit);

    // Ordenamiento
    queryBuilder.orderBy('profile.createdAt', 'DESC');

    const [profiles, total] = await queryBuilder.getManyAndCount();

    return {
      data: profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['memberships', 'memberships.condominium'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  async update(id: string, updateProfileDto: UpdateProfileDto): Promise<UserProfile> {
    const profile = await this.findOne(id);

    // Si se está actualizando el email, verificar unicidad
    if (updateProfileDto.email && updateProfileDto.email !== profile.email) {
      const existingProfile = await this.profileRepository.findOne({
        where: {
          tenantId: profile.tenantId,
          email: updateProfileDto.email,
        },
      });

      if (existingProfile) {
        throw new ConflictException(
          `Profile with email ${updateProfileDto.email} already exists in this tenant`
        );
      }
    }

    // Actualizar campos
    Object.assign(profile, updateProfileDto);
    profile.updatedAt = new Date();

    const updatedProfile = await this.profileRepository.save(profile);

    // Emitir evento
    this.eventEmitter.emit('profile.updated', {
      tenantId: updatedProfile.tenantId,
      profileId: updatedProfile.id,
      changes: updateProfileDto,
      timestamp: new Date(),
    });

    return updatedProfile;
  }

  async remove(id: string): Promise<void> {
    const profile = await this.findOne(id);

    // Soft delete
    profile.deletedAt = new Date();
    profile.status = ProfileStatus.INACTIVE;

    await this.profileRepository.save(profile);

    // Emitir evento
    this.eventEmitter.emit('profile.deleted', {
      tenantId: profile.tenantId,
      profileId: profile.id,
      timestamp: new Date(),
    });
  }

  async getMemberships(id: string, includeInactive = false) {
    const profile = await this.findOne(id);

    const queryBuilder = this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.memberships', 'membership')
      .leftJoinAndSelect('membership.condominium', 'condominium')
      .leftJoinAndSelect('membership.unit', 'unit')
      .where('profile.id = :id', { id });

    if (!includeInactive) {
      queryBuilder.andWhere('membership.isActive = :isActive', { isActive: true });
    }

    const result = await queryBuilder.getOne();
    return result?.memberships || [];
  }

  async findByEmail(tenantId: string, email: string): Promise<UserProfile | null> {
    return this.profileRepository.findOne({
      where: {
        tenantId,
        email,
        deletedAt: null,
      },
    });
  }

  async findByIdentityId(identityId: string): Promise<UserProfile | null> {
    return this.profileRepository.findOne({
      where: {
        identityId,
        deletedAt: null,
      },
      relations: ['memberships', 'memberships.condominium'],
    });
  }

  async getProfileStats(tenantId: string) {
    const stats = await this.profileRepository
      .createQueryBuilder('profile')
      .select('profile.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('profile.tenantId = :tenantId', { tenantId })
      .andWhere('profile.deletedAt IS NULL')
      .groupBy('profile.status')
      .getRawMany();

    const result = {
      total: 0,
      byStatus: {} as Record<ProfileStatus, number>,
    };

    stats.forEach(stat => {
      result.byStatus[stat.status as ProfileStatus] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  }
}