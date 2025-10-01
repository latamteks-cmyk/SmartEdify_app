import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole, RoleStatus, RoleType } from '../entities/user-role.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(UserRole)
    private readonly roleRepository: Repository<UserRole>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async assignRole(roleData: Partial<UserRole>): Promise<UserRole> {
    // Validate profile exists
    const profile = await this.profileRepository.findOne({
      where: { id: roleData.profileId, tenantId: roleData.tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check for existing active role of same type in same scope
    const existingRole = await this.roleRepository.findOne({
      where: {
        tenantId: roleData.tenantId,
        profileId: roleData.profileId,
        roleType: roleData.roleType,
        condominiumId: roleData.condominiumId,
        buildingId: roleData.buildingId,
        status: RoleStatus.ACTIVE,
      },
    });

    if (existingRole) {
      throw new BadRequestException('Active role of this type already exists in this scope');
    }

    // Validate role-specific business rules
    await this.validateRoleAssignment(roleData);

    const role = this.roleRepository.create(roleData);
    const savedRole = await this.roleRepository.save(role);

    // Invalidate cache
    await this.cacheService.invalidateUserRoles(roleData.tenantId, profile.userId);

    // Emit event
    this.eventEmitter.emit('role.assigned', {
      tenantId: roleData.tenantId,
      profileId: roleData.profileId,
      roleId: savedRole.id,
      roleType: savedRole.roleType,
      scope: savedRole.scope,
    });

    return savedRole;
  }

  async updateRole(
    roleId: string,
    tenantId: string,
    updateData: Partial<UserRole>,
  ): Promise<UserRole> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenantId },
      relations: ['profile'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    Object.assign(role, updateData);
    const updatedRole = await this.roleRepository.save(role);

    // Invalidate cache
    await this.cacheService.invalidateUserRoles(tenantId, role.profile.userId);

    // Emit event
    this.eventEmitter.emit('role.updated', {
      tenantId,
      profileId: role.profileId,
      roleId: role.id,
      changes: updateData,
    });

    return updatedRole;
  }

  async revokeRole(roleId: string, tenantId: string): Promise<UserRole> {
    return this.updateRole(roleId, tenantId, {
      status: RoleStatus.INACTIVE,
      endDate: new Date(),
    });
  }

  async getUserRoles(tenantId: string, userId: string): Promise<UserRole[]> {
    // Try cache first
    const cached = await this.cacheService.getUserRoles(tenantId, userId);
    if (cached) {
      return cached;
    }

    // Get profile first
    const profile = await this.profileRepository.findOne({
      where: { tenantId, userId },
    });

    if (!profile) {
      return [];
    }

    const roles = await this.roleRepository.find({
      where: { tenantId, profileId: profile.id },
      order: { createdAt: 'DESC' },
    });

    // Cache the result
    await this.cacheService.cacheUserRoles(tenantId, userId, roles);

    return roles;
  }

  async getActiveRoles(tenantId: string, userId: string): Promise<UserRole[]> {
    const roles = await this.getUserRoles(tenantId, userId);
    return roles.filter(role => 
      role.status === RoleStatus.ACTIVE && 
      (!role.endDate || role.endDate > new Date())
    );
  }

  async getRolesByCondominium(tenantId: string, condominiumId: string): Promise<UserRole[]> {
    return this.roleRepository.find({
      where: { tenantId, condominiumId },
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRolesByType(tenantId: string, roleType: RoleType): Promise<UserRole[]> {
    return this.roleRepository.find({
      where: { tenantId, roleType, status: RoleStatus.ACTIVE },
      relations: ['profile'],
    });
  }

  async getAdministrativeRoles(tenantId: string, condominiumId: string): Promise<UserRole[]> {
    const adminRoles = [
      RoleType.ADMIN,
      RoleType.PRESIDENT,
      RoleType.SECRETARY,
      RoleType.TREASURER,
      RoleType.COUNCIL_MEMBER,
      RoleType.MANAGER,
    ];

    return this.roleRepository.find({
      where: {
        tenantId,
        condominiumId,
        roleType: { $in: adminRoles } as any,
        status: RoleStatus.ACTIVE,
      },
      relations: ['profile'],
    });
  }

  async hasRole(
    tenantId: string,
    userId: string,
    roleType: RoleType,
    condominiumId?: string,
  ): Promise<boolean> {
    const profile = await this.profileRepository.findOne({
      where: { tenantId, userId },
    });

    if (!profile) {
      return false;
    }

    const whereCondition: any = {
      tenantId,
      profileId: profile.id,
      roleType,
      status: RoleStatus.ACTIVE,
    };

    if (condominiumId) {
      whereCondition.condominiumId = condominiumId;
    }

    const role = await this.roleRepository.findOne({ where: whereCondition });
    
    return !!role && (!role.endDate || role.endDate > new Date());
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    const roles = await this.getActiveRoles(tenantId, userId);
    
    const permissions = new Set<string>();
    roles.forEach(role => {
      role.permissions.forEach(permission => permissions.add(permission));
    });

    return Array.from(permissions);
  }

  private async validateRoleAssignment(roleData: Partial<UserRole>): Promise<void> {
    // Validate that only one president exists per condominium
    if (roleData.roleType === RoleType.PRESIDENT && roleData.condominiumId) {
      const existingPresident = await this.roleRepository.findOne({
        where: {
          tenantId: roleData.tenantId,
          condominiumId: roleData.condominiumId,
          roleType: RoleType.PRESIDENT,
          status: RoleStatus.ACTIVE,
        },
      });

      if (existingPresident) {
        throw new BadRequestException('A president already exists for this condominium');
      }
    }

    // Validate that administrative roles have proper scope
    const adminRoles = [RoleType.PRESIDENT, RoleType.SECRETARY, RoleType.TREASURER];
    if (adminRoles.includes(roleData.roleType) && !roleData.condominiumId) {
      throw new BadRequestException('Administrative roles require a condominium scope');
    }

    // Add more validation rules as needed
  }
}