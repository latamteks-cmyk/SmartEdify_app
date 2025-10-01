import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipService } from '../services/membership.service';
import { UserMembership } from '../entities/user-membership.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new membership' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Membership created successfully' })
  async createMembership(
    @CurrentTenant() tenantId: string,
    @Body() membershipData: Partial<UserMembership>,
  ): Promise<UserMembership> {
    return this.membershipService.createMembership({
      ...membershipData,
      tenantId,
    });
  }

  @Put(':membershipId')
  @ApiOperation({ summary: 'Update a membership' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Membership updated successfully' })
  async updateMembership(
    @CurrentTenant() tenantId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() updateData: Partial<UserMembership>,
  ): Promise<UserMembership> {
    return this.membershipService.updateMembership(membershipId, tenantId, updateData);
  }

  @Delete(':membershipId')
  @ApiOperation({ summary: 'Deactivate a membership' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Membership deactivated successfully' })
  async deactivateMembership(
    @CurrentTenant() tenantId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ): Promise<UserMembership> {
    return this.membershipService.deactivateMembership(membershipId, tenantId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user memberships' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User memberships retrieved successfully' })
  async getUserMemberships(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('active') activeOnly?: boolean,
  ): Promise<UserMembership[]> {
    if (activeOnly) {
      return this.membershipService.getActiveMemberships(tenantId, userId);
    }
    return this.membershipService.getUserMemberships(tenantId, userId);
  }

  @Get('condominium/:condominiumId')
  @ApiOperation({ summary: 'Get memberships by condominium' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Condominium memberships retrieved successfully' })
  async getMembershipsByCondominium(
    @CurrentTenant() tenantId: string,
    @Param('condominiumId', ParseUUIDPipe) condominiumId: string,
  ): Promise<UserMembership[]> {
    return this.membershipService.getMembershipsByCondominium(tenantId, condominiumId);
  }

  @Get('unit/:unitId')
  @ApiOperation({ summary: 'Get memberships by unit' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unit memberships retrieved successfully' })
  async getMembershipsByUnit(
    @CurrentTenant() tenantId: string,
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ): Promise<UserMembership[]> {
    return this.membershipService.getMembershipsByUnit(tenantId, unitId);
  }

  @Get('condominium/:condominiumId/voting-members')
  @ApiOperation({ summary: 'Get voting members for a condominium' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Voting members retrieved successfully' })
  async getVotingMembers(
    @CurrentTenant() tenantId: string,
    @Param('condominiumId', ParseUUIDPipe) condominiumId: string,
  ): Promise<UserMembership[]> {
    return this.membershipService.getVotingMembers(tenantId, condominiumId);
  }

  @Get('condominium/:condominiumId/ownership-percentage')
  @ApiOperation({ summary: 'Get total ownership percentage for a condominium' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Total ownership percentage retrieved successfully' })
  async getTotalOwnershipPercentage(
    @CurrentTenant() tenantId: string,
    @Param('condominiumId', ParseUUIDPipe) condominiumId: string,
  ): Promise<{ totalPercentage: number }> {
    const totalPercentage = await this.membershipService.getTotalOwnershipPercentage(
      tenantId,
      condominiumId,
    );
    return { totalPercentage };
  }

  @Post('condominium/:condominiumId/validate-quorum')
  @ApiOperation({ summary: 'Validate quorum eligibility' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quorum validation completed successfully' })
  async validateQuorumEligibility(
    @CurrentTenant() tenantId: string,
    @Param('condominiumId', ParseUUIDPipe) condominiumId: string,
    @Body() body: { userIds: string[] },
  ): Promise<{ eligible: boolean; totalPercentage: number; details: any[] }> {
    return this.membershipService.validateQuorumEligibility(
      tenantId,
      condominiumId,
      body.userIds,
    );
  }
}