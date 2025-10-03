import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlackoutService } from '../services/blackout.service';
import { Blackout, BlackoutSource } from '../entities/blackout.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { DPoPGuard } from '../../../common/guards/dpop.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Blackouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('blackouts')
export class BlackoutController {
  constructor(private readonly blackoutService: BlackoutService) {}

  @Post()
  @UseGuards(DPoPGuard, AdminGuard)
  @ApiOperation({ summary: 'Create blackout period' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Blackout created successfully' })
  async createBlackout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: {
      condominiumId: string;
      amenityId?: string;
      startTime: string;
      endTime: string;
      reason?: string;
      source: BlackoutSource;
    },
  ): Promise<Blackout> {
    return this.blackoutService.createBlackout({
      tenantId,
      condominiumId: body.condominiumId,
      amenityId: body.amenityId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      reason: body.reason,
      source: body.source,
      createdBy: user.sub,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get blackouts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blackouts retrieved successfully' })
  async getBlackouts(
    @CurrentTenant() tenantId: string,
    @Query('condominiumId') condominiumId?: string,
    @Query('amenityId') amenityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('source') source?: BlackoutSource,
  ): Promise<Blackout[]> {
    return this.blackoutService.getBlackouts({
      tenantId,
      condominiumId,
      amenityId,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      source,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blackout by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blackout retrieved successfully' })
  async getBlackout(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Blackout> {
    return this.blackoutService.getBlackout(tenantId, id);
  }

  @Delete(':id')
  @UseGuards(DPoPGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete blackout' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blackout deleted successfully' })
  async deleteBlackout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.blackoutService.deleteBlackout(tenantId, id, user.sub);
    return { message: 'Blackout deleted successfully' };
  }

  @Get('amenity/:amenityId/conflicts')
  @ApiOperation({ summary: 'Check for blackout conflicts with time range' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Conflict check completed' })
  async checkConflicts(
    @CurrentTenant() tenantId: string,
    @Param('amenityId', ParseUUIDPipe) amenityId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ): Promise<{ hasConflicts: boolean; conflicts: Blackout[] }> {
    const conflicts = await this.blackoutService.checkConflicts(
      tenantId,
      amenityId,
      new Date(startTime),
      new Date(endTime),
    );

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }
}