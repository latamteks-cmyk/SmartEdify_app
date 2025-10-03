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
  UseInterceptors,
  UploadedFiles,
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
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { ClassifyIncidentDto } from './dto/classify-incident.dto';
import { Incident } from './entities/incident.entity';

@ApiTags('incidents')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('evidence', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Report a new incident',
    description: 'Creates a new incident report with optional evidence files',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Incident reported successfully',
    type: Incident,
  })
  async create(
    @Body() createIncidentDto: CreateIncidentDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<Incident> {
    return this.incidentsService.create(createIncidentDto, files);
  }

  @Get()
  @ApiOperation({
    summary: 'List incidents',
    description: 'Retrieves a paginated list of incidents with filtering options',
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
    enum: ['OPEN', 'CLASSIFIED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    description: 'Filter by incident status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    description: 'Filter by priority level',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    type: String,
    description: 'Filter by incident source',
  })
  @ApiQuery({
    name: 'asset_id',
    required: false,
    type: String,
    description: 'Filter by asset ID',
  })
  @ApiQuery({
    name: 'space_id',
    required: false,
    type: String,
    description: 'Filter by space ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of incidents retrieved successfully',
    type: [Incident],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('source') source?: string,
    @Query('asset_id') assetId?: string,
    @Query('space_id') spaceId?: string,
  ) {
    return this.incidentsService.findAll({
      page,
      limit,
      status,
      priority,
      source,
      assetId,
      spaceId,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get incident by ID',
    description: 'Retrieves a specific incident by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Incident retrieved successfully',
    type: Incident,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Incident> {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update incident',
    description: 'Updates an existing incident with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Incident updated successfully',
    type: Incident,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateIncidentDto: UpdateIncidentDto,
  ): Promise<Incident> {
    return this.incidentsService.update(id, updateIncidentDto);
  }

  @Post(':id/classify')
  @ApiOperation({
    summary: 'Classify incident',
    description: 'Classifies an incident and generates tasks based on classification',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Incident classified successfully',
  })
  async classify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() classifyDto: ClassifyIncidentDto,
  ) {
    return this.incidentsService.classify(id, classifyDto);
  }

  @Post(':id/request-llm-classification')
  @ApiOperation({
    summary: 'Request LLM classification',
    description: 'Sends incident to analytics service for LLM classification',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'LLM classification requested successfully',
  })
  async requestLlmClassification(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.requestLlmClassification(id);
  }

  @Get(':id/tasks')
  @ApiOperation({
    summary: 'Get incident tasks',
    description: 'Retrieves all tasks generated from this incident',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Incident tasks retrieved successfully',
  })
  async getTasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.getTasks(id);
  }

  @Post(':id/resolve')
  @ApiOperation({
    summary: 'Resolve incident',
    description: 'Marks an incident as resolved',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Incident resolved successfully',
  })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() resolveDto: { resolution_notes?: string },
  ) {
    return this.incidentsService.resolve(id, resolveDto.resolution_notes);
  }

  @Post(':id/close')
  @ApiOperation({
    summary: 'Close incident',
    description: 'Closes a resolved incident',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Incident UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Incident closed successfully',
  })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() closeDto: { closure_notes?: string },
  ) {
    return this.incidentsService.close(id, closeDto.closure_notes);
  }
}