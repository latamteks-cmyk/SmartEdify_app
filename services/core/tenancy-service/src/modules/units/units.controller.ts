import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { Unit } from './entities/unit.entity';

@ApiTags('units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new unit',
    description: 'Creates a new unit (private or common area) in a condominium',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Unit created successfully',
    type: Unit,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Unit with same local_code already exists in condominium',
  })
  async create(@Body() createUnitDto: CreateUnitDto): Promise<Unit> {
    return this.unitsService.create(createUnitDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List units',
    description: 'Retrieves a paginated list of units with filtering options',
  })
  @ApiQuery({
    name: 'condominium_id',
    required: false,
    type: String,
    description: 'Filter by condominium ID',
  })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: ['PRIVATE', 'COMMON'],
    description: 'Filter by unit kind',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    description: 'Filter by unit status',
  })
  @ApiQuery({
    name: 'building_id',
    required: false,
    type: String,
    description: 'Filter by building ID',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of units retrieved successfully',
    type: [Unit],
  })
  async findAll(
    @Query('condominium_id') condominiumId?: string,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('building_id') buildingId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.unitsService.findAll({
      condominiumId,
      kind,
      status,
      buildingId,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get unit by ID',
    description: 'Retrieves a specific unit by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unit UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unit retrieved successfully',
    type: Unit,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Unit not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Unit> {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update unit',
    description: 'Updates an existing unit with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unit UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unit updated successfully',
    type: Unit,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Unit not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ): Promise<Unit> {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Post(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate unit',
    description: 'Deactivates a unit (sets status to INACTIVE)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unit UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unit deactivated successfully',
    type: Unit,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Unit not found',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<Unit> {
    return this.unitsService.deactivate(id);
  }

  @Post('bulk/validate')
  @ApiOperation({
    summary: 'Validate bulk unit creation',
    description: 'Validates a bulk unit creation request without persisting data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed',
  })
  async validateBulkCreate(@Body() bulkCreateDto: BulkCreateUnitsDto) {
    return this.unitsService.validateBulkCreate(bulkCreateDto);
  }

  @Post('bulk/execute')
  @ApiOperation({
    summary: 'Execute bulk unit creation',
    description: 'Creates multiple units in a single transaction',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Units created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation errors in bulk data',
  })
  async executeBulkCreate(@Body() bulkCreateDto: BulkCreateUnitsDto) {
    return this.unitsService.executeBulkCreate(bulkCreateDto);
  }
}