import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new tenant',
    description: 'Creates a new tenant organization (ADMINISTRADORA or JUNTA)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant created successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant with same legal name already exists',
  })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all tenants',
    description: 'Retrieves a paginated list of tenants with optional filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
    description: 'Filter by tenant status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['ADMINISTRADORA', 'JUNTA'],
    description: 'Filter by tenant type',
  })
  @ApiQuery({
    name: 'country_code',
    required: false,
    type: String,
    description: 'Filter by country code',
    example: 'PE',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tenants retrieved successfully',
    type: [Tenant],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('country_code') countryCode?: string,
  ): Promise<{
    data: Tenant[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.tenantsService.findAll({
      page,
      limit,
      status,
      type,
      countryCode,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tenant by ID',
    description: 'Retrieves a specific tenant by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant retrieved successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Tenant> {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Updates an existing tenant with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant updated successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Post(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate tenant',
    description: 'Deactivates a tenant and all its associated condominiums',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant deactivated successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant cannot be deactivated due to active dependencies',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<Tenant> {
    return this.tenantsService.deactivate(id);
  }

  @Get(':id/condominiums')
  @ApiOperation({
    summary: 'Get tenant condominiums',
    description: 'Retrieves all condominiums belonging to a specific tenant',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    description: 'Filter condominiums by status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant condominiums retrieved successfully',
  })
  async getCondominiums(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
  ) {
    return this.tenantsService.getCondominiums(id, status);
  }
}