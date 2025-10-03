import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './entities/asset.entity';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new asset',
    description: 'Creates a new asset (hard or soft) in the system',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Asset created successfully',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createAssetDto: CreateAssetDto): Promise<Asset> {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List assets',
    description: 'Retrieves a paginated list of assets with filtering options',
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
    name: 'type',
    required: false,
    enum: ['HARD', 'SOFT'],
    description: 'Filter by asset type',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by asset category',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_ORDER', 'DECOMMISSIONED'],
    description: 'Filter by asset status',
  })
  @ApiQuery({
    name: 'criticality',
    required: false,
    enum: ['A', 'B', 'C'],
    description: 'Filter by criticality level',
  })
  @ApiQuery({
    name: 'space_id',
    required: false,
    type: String,
    description: 'Filter by space/area',
  })
  @ApiQuery({
    name: 'warranty_status',
    required: false,
    enum: ['active', 'expired', 'unknown'],
    description: 'Filter by warranty status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assets retrieved successfully',
    type: [Asset],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('criticality') criticality?: string,
    @Query('space_id') spaceId?: string,
    @Query('warranty_status') warrantyStatus?: string,
  ) {
    return this.assetsService.findAll({
      page,
      limit,
      type,
      category,
      status,
      criticality,
      spaceId,
      warrantyStatus,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get asset by ID',
    description: 'Retrieves a specific asset by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset retrieved successfully',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Asset> {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update asset',
    description: 'Updates an existing asset with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset updated successfully',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<Asset> {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete asset',
    description: 'Soft deletes an asset (sets status to DECOMMISSIONED)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }

  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload asset photos',
    description: 'Uploads photos for an asset',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Photos uploaded successfully',
  })
  async uploadPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.assetsService.uploadPhotos(id, files);
  }

  @Get(':id/maintenance-plans')
  @ApiOperation({
    summary: 'Get asset maintenance plans',
    description: 'Retrieves all maintenance plans for a specific asset',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plans retrieved successfully',
  })
  async getMaintenancePlans(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getMaintenancePlans(id);
  }

  @Get(':id/work-orders')
  @ApiOperation({
    summary: 'Get asset work orders',
    description: 'Retrieves work order history for a specific asset',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by work order status',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date filter (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date filter (ISO 8601)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work orders retrieved successfully',
  })
  async getWorkOrders(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.assetsService.getWorkOrders(id, { status, from, to });
  }

  @Get(':id/warranty-status')
  @ApiOperation({
    summary: 'Check asset warranty status',
    description: 'Returns detailed warranty information for an asset',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warranty status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        asset_id: { type: 'string' },
        warranty_status: { type: 'string', enum: ['active', 'expired', 'unknown'] },
        warranty_until: { type: 'string', format: 'date' },
        days_remaining: { type: 'number' },
        alert_level: { type: 'string', enum: ['none', 'warning', 'critical'] },
      },
    },
  })
  async getWarrantyStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getWarrantyStatus(id);
  }

  @Post(':id/maintenance-plans')
  @ApiOperation({
    summary: 'Create maintenance plan for asset',
    description: 'Creates a new maintenance plan for the specified asset',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Maintenance plan created successfully',
  })
  async createMaintenancePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createPlanDto: any, // TODO: Create proper DTO
  ) {
    return this.assetsService.createMaintenancePlan(id, createPlanDto);
  }
}