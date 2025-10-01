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
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { ApproveWorkOrderDto } from './dto/approve-work-order.dto';
import { WorkOrder } from './entities/work-order.entity';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new work order',
    description: 'Creates a new work order manually or from a task',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Work order created successfully',
    type: WorkOrder,
  })
  async create(@Body() createWorkOrderDto: CreateWorkOrderDto): Promise<WorkOrder> {
    return this.workOrdersService.create(createWorkOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List work orders',
    description: 'Retrieves a paginated list of work orders with filtering options',
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
    description: 'Filter by work order status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by work order type',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    type: String,
    description: 'Filter by priority level',
  })
  @ApiQuery({
    name: 'assigned_to',
    required: false,
    type: String,
    description: 'Filter by assignee',
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
    name: 'overdue',
    required: false,
    type: Boolean,
    description: 'Filter overdue work orders',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of work orders retrieved successfully',
    type: [WorkOrder],
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('asset_id') assetId?: string,
    @Query('space_id') spaceId?: string,
    @Query('overdue') overdue?: boolean,
  ) {
    return this.workOrdersService.findAll({
      page,
      limit,
      status,
      type,
      priority,
      assignedTo,
      assetId,
      spaceId,
      overdue,
    });
  }

  @Get('mobile/assigned/:technicianId')
  @ApiOperation({
    summary: 'Get mobile work orders for technician',
    description: 'Retrieves work orders assigned to a specific technician for mobile app',
  })
  @ApiParam({
    name: 'technicianId',
    type: String,
    description: 'Technician ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mobile work orders retrieved successfully',
  })
  async getMobileWorkOrders(@Param('technicianId') technicianId: string) {
    return this.workOrdersService.getMobileWorkOrders(technicianId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get work order by ID',
    description: 'Retrieves a specific work order by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order retrieved successfully',
    type: WorkOrder,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WorkOrder> {
    return this.workOrdersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update work order',
    description: 'Updates an existing work order with partial data',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order updated successfully',
    type: WorkOrder,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkOrderDto: UpdateWorkOrderDto,
  ): Promise<WorkOrder> {
    return this.workOrdersService.update(id, updateWorkOrderDto);
  }

  @Post(':id/assign')
  @ApiOperation({
    summary: 'Assign work order',
    description: 'Assigns a work order to a technician or provider',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order assigned successfully',
  })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: { assigned_to: string; assignee_type: string; notes?: string },
  ) {
    return this.workOrdersService.assign(id, assignDto.assigned_to, assignDto.assignee_type, assignDto.notes);
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept work order',
    description: 'Technician accepts the assigned work order',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order accepted successfully',
  })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() acceptDto: { notes?: string },
  ) {
    return this.workOrdersService.accept(id, acceptDto.notes);
  }

  @Post(':id/start')
  @ApiOperation({
    summary: 'Start work order',
    description: 'Starts execution of a work order with location validation',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order started successfully',
  })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() startDto: { 
      qr_code_id?: string; 
      gps_coordinates?: { lat: number; lng: number };
      safety_checklist_completed?: boolean;
      notes?: string;
    },
  ) {
    return this.workOrdersService.start(id, startDto);
  }

  @Post(':id/complete')
  @UseInterceptors(FilesInterceptor('photos', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Complete work order',
    description: 'Completes a work order with report and photos',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order completed successfully',
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeDto: CompleteWorkOrderDto,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    return this.workOrdersService.complete(id, completeDto, photos);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve work order',
    description: 'Supervisor approves a completed work order',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order approved successfully',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approveDto: ApproveWorkOrderDto,
  ) {
    return this.workOrdersService.approve(id, approveDto);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject work order',
    description: 'Supervisor rejects a completed work order',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Work order rejected successfully',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rejectDto: { reason: string; notes?: string },
  ) {
    return this.workOrdersService.reject(id, rejectDto.reason, rejectDto.notes);
  }

  @Post(':id/resident-feedback')
  @ApiOperation({
    summary: 'Add resident feedback',
    description: 'Resident provides feedback on completed work order',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resident feedback added successfully',
  })
  async addResidentFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() feedbackDto: { rating: number; comments?: string; resident_id: string },
  ) {
    return this.workOrdersService.addResidentFeedback(id, feedbackDto);
  }

  @Get(':id/qr-code')
  @ApiOperation({
    summary: 'Generate QR code for work order',
    description: 'Generates a QR code for location validation',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'QR code generated successfully',
  })
  async generateQrCode(@Param('id', ParseUUIDPipe) id: string) {
    return this.workOrdersService.generateQrCode(id);
  }

  @Post(':id/sync-offline-data')
  @ApiOperation({
    summary: 'Sync offline data',
    description: 'Syncs offline work order data from mobile app',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work Order UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Offline data synced successfully',
  })
  async syncOfflineData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() offlineData: any,
  ) {
    return this.workOrdersService.syncOfflineData(id, offlineData);
  }
}