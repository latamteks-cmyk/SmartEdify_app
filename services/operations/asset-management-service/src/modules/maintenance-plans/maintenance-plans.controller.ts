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
import { MaintenancePlansService } from './maintenance-plans.service';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenancePlan } from './entities/maintenance-plan.entity';

@ApiTags('maintenance-plans')
@ApiBearerAuth()
@Controller('maintenance-plans')
export class MaintenancePlansController {
  constructor(private readonly maintenancePlansService: MaintenancePlansService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new maintenance plan',
    description: 'Creates a new maintenance plan for an asset or space',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Maintenance plan created successfully',
    type: MaintenancePlan,
  })
  async create(@Body() createMaintenancePlanDto: CreateMaintenancePlanDto): Promise<MaintenancePlan> {
    return this.maintenancePlansService.create(createMaintenancePlanDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List maintenance plans',
    description: 'Retrieves a paginated list of maintenance plans with filtering options',
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
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'COMPLETED'],
    description: 'Filter by plan status',
  })
  @ApiQuery({
    name: 'maintenance_type',
    required: false,
    enum: ['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'CONDITION_BASED'],
    description: 'Filter by maintenance type',
  })
  @ApiQuery({
    name: 'trigger_type',
    required: false,
    enum: ['TIME_BASED', 'USAGE_BASED', 'CONDITION_BASED'],
    description: 'Filter by trigger type',
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
    name: 'due_soon',
    required: false,
    type: Boolean,
    description: 'Filter plans due soon',
  })
  @ApiQuery({
    name: 'overdue',
    required: false,
    type: Boolean,
    description: 'Filter overdue plans',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of maintenance plans retrieved successfully',
    type: [MaintenancePlan],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('maintenance_type') maintenanceType?: string,
    @Query('trigger_type') triggerType?: string,
    @Query('asset_id') assetId?: string,
    @Query('space_id') spaceId?: string,
    @Query('due_soon') dueSoon?: boolean,
    @Query('overdue') overdue?: boolean,
  ) {
    return this.maintenancePlansService.findAll({
      page,
      limit,
      status,
      maintenanceType,
      triggerType,
      assetId,
      spaceId,
      dueSoon,
      overdue,
    });
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Get maintenance calendar',
    description: 'Retrieves maintenance plans in calendar format',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
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
    description: 'Maintenance calendar retrieved successfully',
  })
  async getCalendar(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('asset_id') assetId?: string,
    @Query('space_id') spaceId?: string,
  ) {
    return this.maintenancePlansService.getCalendar({ from, to, assetId, spaceId });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get maintenance plan by ID',
    description: 'Retrieves a specific maintenance plan by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plan retrieved successfully',
    type: MaintenancePlan,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MaintenancePlan> {
    return this.maintenancePlansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update maintenance plan',
    description: 'Updates an existing maintenance plan with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plan updated successfully',
    type: MaintenancePlan,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMaintenancePlanDto: UpdateMaintenancePlanDto,
  ): Promise<MaintenancePlan> {
    return this.maintenancePlansService.update(id, updateMaintenancePlanDto);
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activate maintenance plan',
    description: 'Activates a maintenance plan and schedules next execution',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plan activated successfully',
  })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenancePlansService.activate(id);
  }

  @Post(':id/suspend')
  @ApiOperation({
    summary: 'Suspend maintenance plan',
    description: 'Suspends a maintenance plan temporarily',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plan suspended successfully',
  })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() suspendDto: { reason: string; notes?: string },
  ) {
    return this.maintenancePlansService.suspend(id, suspendDto.reason, suspendDto.notes);
  }

  @Post(':id/execute')
  @ApiOperation({
    summary: 'Execute maintenance plan',
    description: 'Manually executes a maintenance plan and generates tasks',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plan executed successfully',
  })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() executeDto: { execution_date?: string; notes?: string },
  ) {
    const executionDate = executeDto.execution_date ? new Date(executeDto.execution_date) : new Date();
    return this.maintenancePlansService.execute(id, executionDate, executeDto.notes);
  }

  @Get(':id/calendar')
  @ApiOperation({
    summary: 'Get plan calendar',
    description: 'Retrieves calendar view for a specific maintenance plan',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan calendar retrieved successfully',
  })
  async getPlanCalendar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.maintenancePlansService.getPlanCalendar(id, { from, to });
  }

  @Get(':id/tasks')
  @ApiOperation({
    summary: 'Get plan tasks',
    description: 'Retrieves all tasks generated by this maintenance plan',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan tasks retrieved successfully',
  })
  async getPlanTasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenancePlansService.getPlanTasks(id);
  }

  @Post(':id/reschedule')
  @ApiOperation({
    summary: 'Reschedule maintenance plan',
    description: 'Reschedules the next execution of a maintenance plan',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Maintenance Plan UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance plan rescheduled successfully',
  })
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rescheduleDto: { new_date: string; reason: string; notes?: string },
  ) {
    return this.maintenancePlansService.reschedule(
      id, 
      new Date(rescheduleDto.new_date), 
      rescheduleDto.reason, 
      rescheduleDto.notes
    );
  }
}