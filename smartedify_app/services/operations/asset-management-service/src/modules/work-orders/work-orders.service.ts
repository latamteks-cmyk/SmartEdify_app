import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { ApproveWorkOrderDto } from './dto/approve-work-order.dto';
import { WorkOrder, WorkOrderStatus } from './entities/work-order.entity';
import { Task } from '../tasks/entities/task.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Space } from '../spaces/entities/space.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  priority?: string;
  assignedTo?: string;
  assetId?: string;
  spaceId?: string;
  overdue?: boolean;
}

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async create(createWorkOrderDto: CreateWorkOrderDto): Promise<WorkOrder> {
    // Validate related entities
    await this.validateRelatedEntities(createWorkOrderDto);

    // Generate work order number
    const workOrderNumber = await this.generateWorkOrderNumber();

    const workOrder = this.workOrderRepository.create({
      ...createWorkOrderDto,
      work_order_number: workOrderNumber,
      scheduled_start: createWorkOrderDto.scheduled_start ? new Date(createWorkOrderDto.scheduled_start) : null,
      scheduled_end: createWorkOrderDto.scheduled_end ? new Date(createWorkOrderDto.scheduled_end) : null,
      due_date: createWorkOrderDto.due_date ? new Date(createWorkOrderDto.due_date) : null,
      // tenant_id will be set by tenant interceptor
    });

    const savedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.created', {
      workOrderId: savedWorkOrder.id,
      workOrderNumber: savedWorkOrder.work_order_number,
      tenantId: savedWorkOrder.tenant_id,
      assetId: savedWorkOrder.asset_id,
      spaceId: savedWorkOrder.space_id,
      type: savedWorkOrder.type,
      priority: savedWorkOrder.priority,
      assignedTo: savedWorkOrder.assigned_to,
      timestamp: new Date(),
    });

    this.logger.log(`Work order created: ${savedWorkOrder.work_order_number} - ${savedWorkOrder.title}`);
    return savedWorkOrder;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, status, type, priority, assignedTo, assetId, spaceId, overdue } = options;

    const queryBuilder = this.workOrderRepository
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.task', 'task')
      .leftJoinAndSelect('wo.asset', 'asset')
      .leftJoinAndSelect('wo.space', 'space')
      .where('wo.tenant_id = :tenantId', { tenantId: 'current_tenant' }); // TODO: Get from context

    if (status) {
      queryBuilder.andWhere('wo.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('wo.type = :type', { type });
    }

    if (priority) {
      queryBuilder.andWhere('wo.priority = :priority', { priority });
    }

    if (assignedTo) {
      queryBuilder.andWhere('wo.assigned_to = :assignedTo', { assignedTo });
    }

    if (assetId) {
      queryBuilder.andWhere('wo.asset_id = :assetId', { assetId });
    }

    if (spaceId) {
      queryBuilder.andWhere('wo.space_id = :spaceId', { spaceId });
    }

    if (overdue) {
      queryBuilder.andWhere('wo.due_date < :now AND wo.status NOT IN (:...completedStatuses)', {
        now: new Date(),
        completedStatuses: [WorkOrderStatus.COMPLETED, WorkOrderStatus.APPROVED, WorkOrderStatus.CANCELLED],
      });
    }

    queryBuilder
      .orderBy('wo.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Add computed properties
    const workOrdersWithExtras = data.map(wo => ({
      ...wo,
      is_overdue: wo.isOverdue,
      is_critical: wo.isCritical,
      is_emergency: wo.isEmergency,
      requires_safety_checklist: wo.requiresSafetyChecklist,
      safety_checklist_completed: wo.safetyChecklistCompleted,
      location_validated: wo.locationValidated,
      has_completion_report: wo.hasCompletionReport,
      is_supervisor_approved: wo.isSupervisorApproved,
      has_resident_feedback: wo.hasResidentFeedback,
      actual_duration_hours: wo.actualDurationHours,
      estimated_duration_hours: wo.estimatedDurationHours,
      duration_variance_percentage: wo.durationVariancePercentage,
      can_start: wo.canStart,
      can_complete: wo.canComplete,
    }));

    return {
      data: workOrdersWithExtras,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findOne({
      where: { id },
      relations: ['task', 'asset', 'space'],
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found`);
    }

    return workOrder;
  }

  async update(id: string, updateWorkOrderDto: UpdateWorkOrderDto): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);

    // Validate related entities if being changed
    await this.validateRelatedEntities(updateWorkOrderDto);

    // Convert date strings to Date objects
    if (updateWorkOrderDto.scheduled_start) {
      updateWorkOrderDto.scheduled_start = new Date(updateWorkOrderDto.scheduled_start) as any;
    }
    if (updateWorkOrderDto.scheduled_end) {
      updateWorkOrderDto.scheduled_end = new Date(updateWorkOrderDto.scheduled_end) as any;
    }
    if (updateWorkOrderDto.due_date) {
      updateWorkOrderDto.due_date = new Date(updateWorkOrderDto.due_date) as any;
    }

    Object.assign(workOrder, updateWorkOrderDto);
    const updatedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.updated', {
      workOrderId: updatedWorkOrder.id,
      workOrderNumber: updatedWorkOrder.work_order_number,
      tenantId: updatedWorkOrder.tenant_id,
      changes: updateWorkOrderDto,
      timestamp: new Date(),
    });

    this.logger.log(`Work order updated: ${updatedWorkOrder.work_order_number}`);
    return updatedWorkOrder;
  }

  async getMobileWorkOrders(technicianId: string) {
    const workOrders = await this.workOrderRepository.find({
      where: { 
        assigned_to: technicianId,
        status: In([
          WorkOrderStatus.ASSIGNED,
          WorkOrderStatus.ACCEPTED,
          WorkOrderStatus.IN_PROGRESS,
        ]),
      },
      relations: ['asset', 'space'],
      order: { scheduled_start: 'ASC' },
    });

    // Format for mobile consumption
    const mobileWorkOrders = workOrders.map(wo => ({
      id: wo.id,
      work_order_number: wo.work_order_number,
      title: wo.title,
      description: wo.description,
      type: wo.type,
      priority: wo.priority,
      status: wo.status,
      scheduled_start: wo.scheduled_start,
      scheduled_end: wo.scheduled_end,
      due_date: wo.due_date,
      estimated_duration_minutes: wo.estimated_duration_minutes,
      instructions: wo.instructions,
      safety_requirements: wo.safety_requirements,
      required_tools: wo.required_tools,
      location: {
        asset_name: wo.asset?.name,
        space_name: wo.space?.name,
        qr_code_id: wo.location_validation?.qr_code_id,
      },
      can_start: wo.canStart,
      requires_safety_checklist: wo.requiresSafetyChecklist,
      safety_checklist_completed: wo.safetyChecklistCompleted,
      offline_sync_enabled: this.configService.get<boolean>('app.enableOfflineMode'),
    }));

    return {
      technician_id: technicianId,
      work_orders: mobileWorkOrders,
      total: mobileWorkOrders.length,
      sync_timestamp: new Date(),
    };
  }

  async assign(id: string, assignedTo: string, assigneeType: string, notes?: string) {
    const workOrder = await this.findOne(id);

    if (workOrder.status !== WorkOrderStatus.CREATED) {
      throw new BadRequestException('Only created work orders can be assigned');
    }

    workOrder.assigned_to = assignedTo;
    workOrder.assignee_type = assigneeType as any;
    workOrder.status = WorkOrderStatus.ASSIGNED;
    
    if (notes) {
      workOrder.metadata = {
        ...workOrder.metadata,
        assignment: {
          notes,
          assigned_by: 'current_user', // TODO: Get from context
          assigned_at: new Date(),
        },
      };
    }

    const assignedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.assigned', {
      workOrderId: assignedWorkOrder.id,
      workOrderNumber: assignedWorkOrder.work_order_number,
      tenantId: assignedWorkOrder.tenant_id,
      assignedTo,
      assigneeType,
      timestamp: new Date(),
    });

    this.logger.log(`Work order assigned: ${assignedWorkOrder.work_order_number} to ${assignedTo}`);
    return assignedWorkOrder;
  }

  async accept(id: string, notes?: string) {
    const workOrder = await this.findOne(id);

    if (workOrder.status !== WorkOrderStatus.ASSIGNED) {
      throw new BadRequestException('Only assigned work orders can be accepted');
    }

    workOrder.status = WorkOrderStatus.ACCEPTED;
    
    if (notes) {
      workOrder.metadata = {
        ...workOrder.metadata,
        acceptance: {
          notes,
          accepted_by: workOrder.assigned_to,
          accepted_at: new Date(),
        },
      };
    }

    const acceptedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.accepted', {
      workOrderId: acceptedWorkOrder.id,
      workOrderNumber: acceptedWorkOrder.work_order_number,
      tenantId: acceptedWorkOrder.tenant_id,
      timestamp: new Date(),
    });

    this.logger.log(`Work order accepted: ${acceptedWorkOrder.work_order_number}`);
    return acceptedWorkOrder;
  }

  async start(id: string, startDto: any) {
    const workOrder = await this.findOne(id);

    if (!workOrder.canStart) {
      throw new BadRequestException('Work order cannot be started. Check status and safety requirements.');
    }

    // Validate location if required
    if (startDto.qr_code_id || startDto.gps_coordinates) {
      workOrder.location_validation = {
        ...workOrder.location_validation,
        qr_code_scanned: !!startDto.qr_code_id,
        qr_code_id: startDto.qr_code_id,
        gps_coordinates: startDto.gps_coordinates,
        location_confirmed_at: new Date(),
      };
    }

    // Validate safety checklist if required
    if (workOrder.requiresSafetyChecklist && startDto.safety_checklist_completed) {
      workOrder.safety_requirements = {
        ...workOrder.safety_requirements,
        safety_checklist_completed: true,
        safety_checklist_completed_at: new Date(),
        safety_checklist_completed_by: workOrder.assigned_to,
      };
    }

    workOrder.status = WorkOrderStatus.IN_PROGRESS;
    workOrder.actual_start = new Date();
    
    if (startDto.notes) {
      workOrder.metadata = {
        ...workOrder.metadata,
        start: {
          notes: startDto.notes,
          started_by: workOrder.assigned_to,
          started_at: workOrder.actual_start,
        },
      };
    }

    const startedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.started', {
      workOrderId: startedWorkOrder.id,
      workOrderNumber: startedWorkOrder.work_order_number,
      tenantId: startedWorkOrder.tenant_id,
      actualStart: startedWorkOrder.actual_start,
      timestamp: new Date(),
    });

    this.logger.log(`Work order started: ${startedWorkOrder.work_order_number}`);
    return startedWorkOrder;
  }

  async complete(id: string, completeDto: CompleteWorkOrderDto, photos?: Express.Multer.File[]) {
    const workOrder = await this.findOne(id);

    if (!workOrder.canComplete) {
      throw new BadRequestException('Work order cannot be completed. Check status and location validation.');
    }

    // Process photos
    const photoUrls = photos ? await this.processPhotos(photos, workOrder.id) : [];

    // Calculate actual duration
    const actualEnd = new Date();
    const actualDurationMinutes = workOrder.actual_start 
      ? Math.round((actualEnd.getTime() - workOrder.actual_start.getTime()) / (1000 * 60))
      : null;

    workOrder.status = WorkOrderStatus.COMPLETED;
    workOrder.actual_end = actualEnd;
    workOrder.actual_duration_minutes = actualDurationMinutes;
    workOrder.consumables_used = completeDto.consumables_used || {};
    workOrder.completion_report = {
      work_performed: completeDto.work_performed,
      issues_found: completeDto.issues_found || [],
      recommendations: completeDto.recommendations || [],
      quality_rating: completeDto.quality_rating,
      completion_notes: completeDto.completion_notes,
      time_breakdown: completeDto.time_breakdown || {},
      safety_incidents: completeDto.safety_incidents || [],
      photos: photoUrls,
      completed_by: workOrder.assigned_to,
      completed_at: actualEnd,
    };

    const completedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.completed', {
      workOrderId: completedWorkOrder.id,
      workOrderNumber: completedWorkOrder.work_order_number,
      tenantId: completedWorkOrder.tenant_id,
      actualDurationMinutes,
      completionReport: completedWorkOrder.completion_report,
      timestamp: new Date(),
    });

    this.logger.log(`Work order completed: ${completedWorkOrder.work_order_number}`);
    return completedWorkOrder;
  }

  async approve(id: string, approveDto: ApproveWorkOrderDto) {
    const workOrder = await this.findOne(id);

    if (workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed work orders can be approved');
    }

    workOrder.status = WorkOrderStatus.APPROVED;
    workOrder.supervisor_approval = {
      approved_by: approveDto.approved_by,
      approved_at: new Date(),
      approval_notes: approveDto.approval_notes,
      quality_score: approveDto.quality_score,
      technician_feedback: approveDto.technician_feedback,
      follow_up_actions: approveDto.follow_up_actions,
    };

    const approvedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.approved', {
      workOrderId: approvedWorkOrder.id,
      workOrderNumber: approvedWorkOrder.work_order_number,
      tenantId: approvedWorkOrder.tenant_id,
      approvedBy: approveDto.approved_by,
      qualityScore: approveDto.quality_score,
      timestamp: new Date(),
    });

    this.logger.log(`Work order approved: ${approvedWorkOrder.work_order_number} by ${approveDto.approved_by}`);
    return approvedWorkOrder;
  }

  async reject(id: string, reason: string, notes?: string) {
    const workOrder = await this.findOne(id);

    if (workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed work orders can be rejected');
    }

    workOrder.status = WorkOrderStatus.REJECTED;
    workOrder.supervisor_approval = {
      rejected_by: 'current_user', // TODO: Get from context
      rejected_at: new Date(),
      rejection_reason: reason,
      rejection_notes: notes,
    };

    const rejectedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.rejected', {
      workOrderId: rejectedWorkOrder.id,
      workOrderNumber: rejectedWorkOrder.work_order_number,
      tenantId: rejectedWorkOrder.tenant_id,
      reason,
      timestamp: new Date(),
    });

    this.logger.log(`Work order rejected: ${rejectedWorkOrder.work_order_number} - ${reason}`);
    return rejectedWorkOrder;
  }

  async addResidentFeedback(id: string, feedbackDto: any) {
    const workOrder = await this.findOne(id);

    if (workOrder.status !== WorkOrderStatus.APPROVED) {
      throw new BadRequestException('Only approved work orders can receive resident feedback');
    }

    workOrder.resident_feedback = {
      feedback_provided: true,
      rating: feedbackDto.rating,
      comments: feedbackDto.comments,
      resident_id: feedbackDto.resident_id,
      feedback_date: new Date(),
    };

    const updatedWorkOrder = await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.resident_feedback', {
      workOrderId: updatedWorkOrder.id,
      workOrderNumber: updatedWorkOrder.work_order_number,
      tenantId: updatedWorkOrder.tenant_id,
      rating: feedbackDto.rating,
      timestamp: new Date(),
    });

    this.logger.log(`Resident feedback added: ${updatedWorkOrder.work_order_number} - Rating: ${feedbackDto.rating}`);
    return updatedWorkOrder;
  }

  async generateQrCode(id: string) {
    const workOrder = await this.findOne(id);

    // TODO: Integrate with identity-service to generate QR code
    const qrCodeId = `WO_${workOrder.work_order_number}_${Date.now()}`;
    const qrCodeUrl = `https://api.smartedify.com/qr/${qrCodeId}`;

    // Update work order with QR code info
    workOrder.location_validation = {
      ...workOrder.location_validation,
      qr_code_id: qrCodeId,
      qr_code_url: qrCodeUrl,
      qr_code_generated_at: new Date(),
    };

    await this.workOrderRepository.save(workOrder);

    this.logger.log(`QR code generated for work order: ${workOrder.work_order_number}`);

    return {
      work_order_id: workOrder.id,
      work_order_number: workOrder.work_order_number,
      qr_code_id: qrCodeId,
      qr_code_url: qrCodeUrl,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  async syncOfflineData(id: string, offlineData: any) {
    const workOrder = await this.findOne(id);

    // Process offline data and merge with existing data
    const syncResult = {
      work_order_id: workOrder.id,
      sync_timestamp: new Date(),
      conflicts: [],
      merged_data: {},
    };

    // Handle different types of offline data
    if (offlineData.completion_report) {
      // Merge completion report
      workOrder.completion_report = {
        ...workOrder.completion_report,
        ...offlineData.completion_report,
        synced_from_offline: true,
        offline_sync_timestamp: new Date(),
      };
      syncResult.merged_data['completion_report'] = true;
    }

    if (offlineData.consumables_used) {
      // Merge consumables data
      workOrder.consumables_used = {
        ...workOrder.consumables_used,
        ...offlineData.consumables_used,
      };
      syncResult.merged_data['consumables_used'] = true;
    }

    if (offlineData.photos) {
      // Handle offline photos
      const existingPhotos = workOrder.completion_report?.photos || [];
      const newPhotos = await this.processOfflinePhotos(offlineData.photos, workOrder.id);
      
      workOrder.completion_report = {
        ...workOrder.completion_report,
        photos: [...existingPhotos, ...newPhotos],
      };
      syncResult.merged_data['photos'] = newPhotos.length;
    }

    await this.workOrderRepository.save(workOrder);

    // Emit event for other services
    this.eventEmitter.emit('work_order.offline_synced', {
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.work_order_number,
      tenantId: workOrder.tenant_id,
      syncResult,
      timestamp: new Date(),
    });

    this.logger.log(`Offline data synced for work order: ${workOrder.work_order_number}`);
    return syncResult;
  }

  private async validateRelatedEntities(dto: Partial<CreateWorkOrderDto>) {
    if (dto.task_id) {
      const task = await this.taskRepository.findOne({
        where: { id: dto.task_id },
      });
      if (!task) {
        throw new NotFoundException(`Task with ID ${dto.task_id} not found`);
      }
    }

    if (dto.asset_id) {
      const asset = await this.assetRepository.findOne({
        where: { id: dto.asset_id },
      });
      if (!asset) {
        throw new NotFoundException(`Asset with ID ${dto.asset_id} not found`);
      }
    }

    if (dto.space_id) {
      const space = await this.spaceRepository.findOne({
        where: { id: dto.space_id },
      });
      if (!space) {
        throw new NotFoundException(`Space with ID ${dto.space_id} not found`);
      }
    }
  }

  private async generateWorkOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;
    
    // Get the last work order number for this year
    const lastWorkOrder = await this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.work_order_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('wo.work_order_number', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastWorkOrder) {
      const lastNumber = parseInt(lastWorkOrder.work_order_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  private async processPhotos(files: Express.Multer.File[], workOrderId: string): Promise<string[]> {
    // TODO: Upload files to documents-service and get URLs
    return files.map(file => 
      `https://cdn.smartedify.com/work-orders/${workOrderId}/${Date.now()}_${file.originalname}`
    );
  }

  private async processOfflinePhotos(photos: any[], workOrderId: string): Promise<string[]> {
    // TODO: Process base64 encoded photos from offline data
    return photos.map((photo, index) => 
      `https://cdn.smartedify.com/work-orders/${workOrderId}/offline_${Date.now()}_${index}.jpg`
    );
  }
}