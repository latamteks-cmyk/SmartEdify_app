import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AssembliesService } from './assemblies.service';
import { CreateAssemblyDto } from './dto/create-assembly.dto';
import { UpdateAssemblyDto } from './dto/update-assembly.dto';
import { AssemblyFiltersDto } from './dto/assembly-filters.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Assembly } from './entities/assembly.entity';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Assemblies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('assemblies')
export class AssembliesController {
  constructor(private readonly assembliesService: AssembliesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new assembly' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assembly created successfully',
    type: Assembly,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Assembly dates overlap with existing assembly',
  })
  async create(
    @Body() createAssemblyDto: CreateAssemblyDto,
    @TenantId() tenantId: string,
  ): Promise<Assembly> {
    return await this.assembliesService.create(createAssemblyDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assemblies with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assemblies retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'active', 'completed', 'cancelled'] })
  @ApiQuery({ name: 'type', required: false, enum: ['general', 'extraordinary', 'board', 'committee'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query() filtersDto: AssemblyFiltersDto,
    @TenantId() tenantId: string,
  ): Promise<{ data: Assembly[]; total: number; page: number; limit: number }> {
    return await this.assembliesService.findAll(tenantId, paginationDto, filtersDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get assembly statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assembly statistics retrieved successfully',
  })
  async getStats(@TenantId() tenantId: string) {
    return await this.assembliesService.getAssemblyStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assembly by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assembly retrieved successfully',
    type: Assembly,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assembly not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Assembly> {
    return await this.assembliesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update assembly' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assembly updated successfully',
    type: Assembly,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assembly not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot update active or completed assembly',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssemblyDto: UpdateAssemblyDto,
    @TenantId() tenantId: string,
  ): Promise<Assembly> {
    return await this.assembliesService.update(id, updateAssemblyDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete assembly' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Assembly deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assembly not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only draft assemblies can be deleted',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    return await this.assembliesService.remove(id, tenantId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate assembly' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assembly activated successfully',
    type: Assembly,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only draft assemblies can be activated or start date is in the past',
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Assembly> {
    return await this.assembliesService.activate(id, tenantId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel assembly' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assembly cancelled successfully',
    type: Assembly,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel completed or already cancelled assembly',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Assembly> {
    return await this.assembliesService.cancel(id, tenantId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete assembly' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assembly completed successfully',
    type: Assembly,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only active assemblies can be completed',
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Assembly> {
    return await this.assembliesService.complete(id, tenantId);
  }
}