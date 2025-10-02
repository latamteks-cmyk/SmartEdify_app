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
import { RoleService } from '../services/role.service';
import { UserRole, RoleType } from '../entities/user-role.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Role assigned successfully' })
  async assignRole(
    @CurrentTenant() tenantId: string,
    @Body() roleData: Partial<UserRole>,
  ): Promise<UserRole> {
    return this.roleService.assignRole({
      ...roleData,
      tenantId,
    });
  }

  @Put(':roleId')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role updated successfully' })
  async updateRole(
    @CurrentTenant() tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() updateData: Partial<UserRole>,
  ): Promise<UserRole> {
    return this.roleService.updateRole(roleId, tenantId, updateData);
  }

  @Delete(':roleId')
  @ApiOperation({ summary: 'Revoke a role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role revoked successfully' })
  async revokeRole(
    @CurrentTenant() tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<UserRole> {
    return this.roleService.revokeRole(roleId, tenantId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User roles retrieved successfully' })
  async getUserRoles(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('active') activeOnly?: boolean,
  ): Promise<UserRole[]> {
    if (activeOnly) {
      return this.roleService.getActiveRoles(tenantId, userId);
    }
    return this.roleService.getUserRoles(tenantId, userId);
  }

  @Get('condominium/:condominiumId')
  @ApiOperation({ summary: 'Get roles by condominium' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Condominium roles retrieved successfully' })
  async getRolesByCondominium(
    @CurrentTenant() tenantId: string,
    @Param('condominiumId', ParseUUIDPipe) condominiumId: string,
  ): Promise<UserRole[]> {
    return this.roleService.getRolesByCondominium(tenantId, condominiumId);
  }

  @Get('type/:roleType')
  @ApiOperation({ summary: 'Get roles by type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roles by type retrieved successfully' })
  async getRolesByType(
    @CurrentTenant() tenantId: string,
    @Param('roleType') roleType: RoleType,
  ): Promise<UserRole[]> {
    return this.roleService.getRolesByType(tenantId, roleType);
  }

  @Get('condominium/:condominiumId/administrative')
  @ApiOperation({ summary: 'Get administrative roles for a condominium' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Administrative roles retrieved successfully' })
  async getAdministrativeRoles(
    @CurrentTenant() tenantId: string,
    @Param('condominiumId', ParseUUIDPipe) condominiumId: string,
  ): Promise<UserRole[]> {
    return this.roleService.getAdministrativeRoles(tenantId, condominiumId);
  }

  @Get('user/:userId/permissions')
  @ApiOperation({ summary: 'Get user permissions from roles' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User permissions retrieved successfully' })
  async getUserPermissions(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ permissions: string[] }> {
    const permissions = await this.roleService.getUserPermissions(tenantId, userId);
    return { permissions };
  }

  @Post('user/:userId/has-role')
  @ApiOperation({ summary: 'Check if user has a specific role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role check completed successfully' })
  async hasRole(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { roleType: RoleType; condominiumId?: string },
  ): Promise<{ hasRole: boolean }> {
    const hasRole = await this.roleService.hasRole(
      tenantId,
      userId,
      body.roleType,
      body.condominiumId,
    );
    return { hasRole };
  }
}