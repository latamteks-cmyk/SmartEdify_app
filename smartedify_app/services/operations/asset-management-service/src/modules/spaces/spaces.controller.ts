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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space } from './entities/space.entity';

@ApiTags('spaces')
@ApiBearerAuth()
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new space',
    description: 'Creates a new space/area in the system',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Space created successfully',
    type: Space,
  })
  async create(@Body() createSpaceDto: CreateSpaceDto): Promise<Space> {
    return this.spacesService.create(createSpaceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List spaces',
    description: 'Retrieves a paginated list of spaces with filtering options',
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
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by space category',
  })
  @ApiQuery({
    name: 'complexity',
    required: false,
    enum: ['L', 'M', 'H'],
    description: 'Filter by complexity level',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of spaces retrieved successfully',
    type: [Space],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
    @Query('complexity') complexity?: string,
  ) {
    return this.spacesService.findAll({
      page,
      limit,
      category,
      complexity,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get space by ID',
    description: 'Retrieves a specific space by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Space UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Space retrieved successfully',
    type: Space,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Space> {
    return this.spacesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update space',
    description: 'Updates an existing space with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Space UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Space updated successfully',
    type: Space,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
  ): Promise<Space> {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete space',
    description: 'Deletes a space from the system',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Space UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Space deleted successfully',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.spacesService.remove(id);
  }

  @Patch(':id/dimensions')
  @ApiOperation({
    summary: 'Update space dimensions',
    description: 'Updates the physical dimensions of a space',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Space UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Space dimensions updated successfully',
  })
  async updateDimensions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dimensionsDto: any, // TODO: Create proper DTO
  ) {
    return this.spacesService.updateDimensions(id, dimensionsDto);
  }

  @Get(':id/metrics')
  @ApiOperation({
    summary: 'Get space metrics',
    description: 'Retrieves calculated metrics for a space',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Space UUID',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date for metrics (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date for metrics (ISO 8601)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Space metrics retrieved successfully',
  })
  async getMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.spacesService.getMetrics(id, { from, to });
  }
}