import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserMembership, MembershipStatus } from '../entities/user-membership.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(UserMembership)
    private readonly membershipRepository: Repository<UserMembership>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createMembership(membershipData: Partial<UserMembership>): Promise<UserMembership> {
    // Validate profile exists
    const profile = await this.profileRepository.findOne({
      where: { id: membershipData.profileId, tenantId: membershipData.tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check for existing active membership
    const existingMembership = await this.membershipRepository.findOne({
      where: {
        tenantId: membershipData.tenantId,
        profileId: membershipData.profileId,
        condominiumId: membershipData.condominiumId,
        unitId: membershipData.unitId,
        membershipType: membershipData.membershipType,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Active membership already exists for this profile and unit');
    }

    const membership = this.membershipRepository.create(membershipData);
    const savedMembership = await this.membershipRepository.save(membership);

    // Invalidate cache
    await this.cacheService.invalidateUserMemberships(
      membershipData.tenantId,
      profile.userId,
    );

    // Emit event
    this.eventEmitter.emit('membership.created', {
      tenantId: membershipData.tenantId,
      profileId: membershipData.profileId,
      membershipId: savedMembership.id,
      membershipType: savedMembership.membershipType,
    });

    return savedMembership;
  }

  async updateMembership(
    membershipId: string,
    tenantId: string,
    updateData: Partial<UserMembership>,
  ): Promise<UserMembership> {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, tenantId },
      relations: ['profile'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    Object.assign(membership, updateData);
    const updatedMembership = await this.membershipRepository.save(membership);

    // Invalidate cache
    await this.cacheService.invalidateUserMemberships(
      tenantId,
      membership.profile.userId,
    );

    // Emit event
    this.eventEmitter.emit('membership.updated', {
      tenantId,
      profileId: membership.profileId,
      membershipId: membership.id,
      changes: updateData,
    });

    return updatedMembership;
  }

  async deactivateMembership(membershipId: string, tenantId: string): Promise<UserMembership> {
    return this.updateMembership(membershipId, tenantId, {
      status: MembershipStatus.TERMINATED,
      endDate: new Date(),
    });
  }

  async getUserMemberships(tenantId: string, userId: string): Promise<UserMembership[]> {
    // Try cache first
    const cached = await this.cacheService.getUserMemberships(tenantId, userId);
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

    const memberships = await this.membershipRepository.find({
      where: { tenantId, profileId: profile.id },
      order: { createdAt: 'DESC' },
    });

    // Cache the result
    await this.cacheService.cacheUserMemberships(tenantId, userId, memberships);

    return memberships;
  }

  async getActiveMemberships(tenantId: string, userId: string): Promise<UserMembership[]> {
    const memberships = await this.getUserMemberships(tenantId, userId);
    return memberships.filter(membership => membership.status === MembershipStatus.ACTIVE);
  }

  async getMembershipsByCondominium(tenantId: string, condominiumId: string): Promise<UserMembership[]> {
    return this.membershipRepository.find({
      where: { tenantId, condominiumId },
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMembershipsByUnit(tenantId: string, unitId: string): Promise<UserMembership[]> {
    return this.membershipRepository.find({
      where: { tenantId, unitId },
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async getVotingMembers(tenantId: string, condominiumId: string): Promise<UserMembership[]> {
    return this.membershipRepository.find({
      where: {
        tenantId,
        condominiumId,
        votingRights: true,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['profile'],
    });
  }

  async getTotalOwnershipPercentage(tenantId: string, condominiumId: string): Promise<number> {
    const result = await this.membershipRepository
      .createQueryBuilder('membership')
      .select('SUM(membership.ownership_percentage)', 'total')
      .where('membership.tenant_id = :tenantId', { tenantId })
      .andWhere('membership.condominium_id = :condominiumId', { condominiumId })
      .andWhere('membership.status = :status', { status: MembershipStatus.ACTIVE })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async validateQuorumEligibility(
    tenantId: string,
    condominiumId: string,
    userIds: string[],
  ): Promise<{ eligible: boolean; totalPercentage: number; details: any[] }> {
    const profiles = await this.profileRepository.find({
      where: { tenantId, userId: { $in: userIds } as any },
    });

    const profileIds = profiles.map(p => p.id);

    const memberships = await this.membershipRepository.find({
      where: {
        tenantId,
        condominiumId,
        profileId: { $in: profileIds } as any,
        votingRights: true,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['profile'],
    });

    const totalPercentage = memberships.reduce(
      (sum, membership) => sum + membership.ownershipPercentage,
      0,
    );

    const details = memberships.map(membership => ({
      userId: membership.profile.userId,
      profileId: membership.profileId,
      membershipId: membership.id,
      ownershipPercentage: membership.ownershipPercentage,
      membershipType: membership.membershipType,
    }));

    return {
      eligible: totalPercentage >= 50, // Basic quorum threshold
      totalPercentage,
      details,
    };
  }
}