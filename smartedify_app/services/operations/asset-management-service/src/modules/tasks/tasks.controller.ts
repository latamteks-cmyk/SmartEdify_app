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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ConsolidateTasksDto } from './dto/consolidate-tasks.dto';
import { ProposeSosDto } from './dto/propose-sos.dto';
import { Task } from './entities/task.entity';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new task',
    description: 'Creates a new maintenance or service task',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task created successfully',
    type: Task,
  })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List tasks',
    description: 'Retrieves a paginated list of tasks with filtering options',
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
    type: String,
    description: 'Filter by task status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['technical_maintenance', 'soft_service'],
    description: 'Filter by task type',
  })
  @ApiQuery({
    name: 'classification',
    required: false,
    enum: ['URGENT', 'ORDINARY', 'PROGRAMMABLE'],
    description: 'Filter by task classification',
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
  @ApiQuery({
    name: 'group_id',
    required: false,
    type: String,
    description: 'Filter by group ID (consolidated tasks)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tasks retrieved successfully',
    type: [Task],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('classification') classification?: string,
    @Query('asset_id') assetId?: string,
    @Query('space_id') spaceId?: string,
    @Query('group_id') groupId?: string,
  ) {
    return this.tasksService.findAll({
      page,
      limit,
      status,
      type,
      classification,
      assetId,
      spaceId,
      groupId,
    });
  }

  @Get('generated')
  @ApiOperation({
    summary: 'Get generated tasks',
    description: 'Retrieves tasks in GENERATED status ready for review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generated tasks retrieved successfully',
  })
  async getGeneratedTasks() {
    return this.tasksService.getGeneratedTasks();
  }

  @Get('consolidation-candidates')
  @ApiOperation({
    summary: 'Get consolidation candidates',
    description: 'Retrieves tasks that can be consolidated together',
  })
  @ApiQuery({
    name: 'area_id',
    required: false,
    type: String,
    description: 'Filter by area/space ID',
  })
  @ApiQuery({
    name: 'time_window_hours',
    required: false,
    type: Number,
    description: 'Time window for consolidation in hours',
    example: 24,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Consolidation candidates retrieved successfully',
  })
  async getConsolidationCandidates(
    @Query('area_id') areaId?: string,
    @Query('time_window_hours') timeWindowHours: number = 24,
  ) {
    return this.tasksService.getConsolidationCandidates(areaId, timeWindowHours);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Retrieves a specific task by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task retrieved successfully',
    type: Task,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update task',
    description: 'Updates an existing task with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task updated successfully',
    type: Task,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Post('merge')
  @ApiOperation({
    summary: 'Consolidate tasks',
    description: 'Consolidates multiple tasks into a group for SOS creation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks consolidated successfully',
  })
  async consolidateTasks(@Body() consolidateDto: ConsolidateTasksDto) {
    return this.tasksService.consolidateTasks(consolidateDto);
  }

  @Post(':groupId/propose-sos')
  @ApiOperation({
    summary: 'Propose SOS from task group',
    description: 'Creates a SOS proposal from a consolidated task group',
  })
  @ApiParam({
    name: 'groupId',
    type: String,
    description: 'Task group UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SOS proposal created successfully',
  })
  async proposeSos(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() proposeSosDto: ProposeSosDto,
  ) {
    return this.tasksService.proposeSos(groupId, proposeSosDto);
  }

  @Post(':id/schedule')
  @ApiOperation({
    summary: 'Schedule task',
    description: 'Schedules a task for a specific date and time',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task scheduled successfully',
  })
  async scheduleTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() scheduleDto: { scheduled_for: string; notes?: string },
  ) {
    return this.tasksService.scheduleTask(id, new Date(scheduleDto.scheduled_for), scheduleDto.notes);
  }

  @Post(':id/assign')
  @ApiOperation({
    summary: 'Assign task',
    description: 'Assigns a task to a technician or team',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task assigned successfully',
  })
  async assignTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: { assigned_to: string; assignee_type: string; notes?: string },
  ) {
    return this.tasksService.assignTask(id, assignDto.assigned_to, assignDto.assignee_type, assignDto.notes);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel task',
    description: 'Cancels a task with reason',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task cancelled successfully',
  })
  async cancelTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: { reason: string; notes?: string },
  ) {
    return this.tasksService.cancelTask(id, cancelDto.reason, cancelDto.notes);
  }
}