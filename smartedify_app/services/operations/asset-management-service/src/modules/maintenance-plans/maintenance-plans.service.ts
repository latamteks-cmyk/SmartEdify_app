import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenancePlan, PlanStatus, TriggerType } from './entities/maintenance-plan.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Space } from '../spaces/entities/space.entity';
import { Task } from '../tasks/entities/task.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  status?: string;
  maintenanceType?: string;
  triggerType?: string;
  assetId?: string;
  spaceId?: string;
  dueSoon?: boolean;
  overdue?: boolean;
}

interface CalendarOptions {
  from?: string;
  to?: string;
  assetId?: string;
  spaceId?: string;
}

@Injectable()
export class MaintenancePlansService {
  private readonly logger = new Logger(MaintenancePlansService.name);

  constructor(
    @InjectRepository(MaintenancePlan)
    private readonly maintenancePlanRepository: Repository<MaintenancePlan>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createMaintenancePlanDto: CreateMaintenancePlanDto): Promise<MaintenancePlan> {
    // Validate that either asset_id or space_id is provided
    if (!createMaintenancePlanDto.asset_id && !createMaintenancePlanDto.space_id) {
      throw new BadRequestException('Either asset_id or space_id must be provided');
    }

    if (createMaintenancePlanDto.asset_id && createMaintenancePlanDto.space_id) {
      throw new BadRequestException('Cannot specify both asset_id and space_id');
    }

    // Validate related entities
    await this.validateRelatedEntities(createMaintenancePlanDto);

    const maintenancePlan = this.maintenancePlanRepository.create({
      ...createMaintenancePlanDto,
      // tenant_id will be set by tenant interceptor
    });

    // Calculate next execution if time-based
    if (maintenancePlan.isTimeBased) {
      maintenancePlan.next_execution = maintenancePlan.calculateNextExecution();
    }

    const savedPlan = await this.maintenancePlanRepository.save(maintenancePlan);

    // Emit event for other services
    this.eventEmitter.emit('maintenance_plan.created', {
      planId: savedPlan.id,
      tenantId: savedPlan.tenant_id,
      assetId: savedPlan.asset_id,
      spaceId: savedPlan.space_id,
      maintenanceType: savedPlan.maintenance_type,
      triggerType: savedPlan.trigger_type,
      nextExecution: savedPlan.next_execution,
      timestamp: new Date(),
    });

    this.logger.log(`Maintenance plan created: ${savedPlan.id} - ${savedPlan.name}`);
    return savedPlan;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, status, maintenanceType, triggerType, assetId, spaceId, dueSoon, overdue } = options;

    const queryBuilder = this.maintenancePlanRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.asset', 'asset')
      .leftJoinAndSelect('plan.space', 'space')
      .leftJoinAndSelect('plan.tasks', 'tasks')
      .where('plan.tenant_id = :tenantId', { tenantId: 'current_tenant' }); // TODO: Get from context

    if (status) {
      queryBuilder.andWhere('plan.status = :status', { status });
    }

    if (maintenanceType) {
      queryBuilder.andWhere('plan.maintenance_type = :maintenanceType', { maintenanceType });
    }

    if (triggerType) {
      queryBuilder.andWhere('plan.trigger_type = :triggerType', { triggerType });
    }

    if (assetId) {
      queryBuilder.andWhere('plan.asset_id = :assetId', { assetId });
    }

    if (spaceId) {
      queryBuilder.andWhere('plan.space_id = :spaceId', { spaceId });
    }

    if (dueSoon) {
      const dueSoonDate = new Date();
      dueSoonDate.setDate(dueSoonDate.getDate() + 7); // Next 7 days
      queryBuilder.andWhere('plan.next_execution <= :dueSoonDate', { dueSoonDate });
    }

    if (overdue) {
      queryBuilder.andWhere('plan.next_execution < :now', { now: new Date() });
    }

    queryBuilder
      .orderBy('plan.next_execution', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Add computed properties
    const plansWithExtras = data.map(plan => ({
      ...plan,
      is_active: plan.isActive,
      is_time_based: plan.isTimeBased,
      is_usage_based: plan.isUsageBased,
      is_condition_based: plan.isConditionBased,
      is_due: plan.isDue,
      is_overdue: plan.isOverdue,
      days_until_due: plan.daysUntilDue,
      frequency_description: plan.frequencyDescription,
      requires_approval: plan.requiresApproval,
      auto_generates_tasks: plan.autoGeneratesTasks,
    }));

    return {
      data: plansWithExtras,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<MaintenancePlan> {
    const plan = await this.maintenancePlanRepository.findOne({
      where: { id },
      relations: ['asset', 'space', 'tasks'],
    });

    if (!plan) {
      throw new NotFoundException(`Maintenance plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: string, updateMaintenancePlanDto: UpdateMaintenancePlanDto): Promise<MaintenancePlan> {
    const plan = await this.findOne(id);

    // Validate related entities if being changed
    await this.validateRelatedEntities(updateMaintenancePlanDto);

    Object.assign(plan, updateMaintenancePlanDto);

    // Recalculate next execution if frequency changed
    if (plan.isTimeBased && (updateMaintenancePlanDto.frequency_value || updateMaintenancePlanDto.frequency_unit)) {
      plan.next_execution = plan.calculateNextExecution();
    }

    const updatedPlan = await this.maintenancePlanRepository.save(plan);

    // Emit event for other services
    this.eventEmitter.emit('maintenance_plan.updated', {
      planId: updatedPlan.id,
      tenantId: updatedPlan.tenant_id,
      changes: updateMaintenancePlanDto,
      nextExecution: updatedPlan.next_execution,
      timestamp: new Date(),
    });

    this.logger.log(`Maintenance plan updated: ${updatedPlan.id}`);
    return updatedPlan;
  }

  async activate(id: string) {
    const plan = await this.findOne(id);

    if (plan.status === PlanStatus.ACTIVE) {
      throw new BadRequestException('Plan is already active');
    }

    plan.status = PlanStatus.ACTIVE;

    // Calculate next execution if not set
    if (!plan.next_execution && plan.isTimeBased) {
      plan.next_execution = plan.calculateNextExecution();
    }

    const activatedPlan = await this.maintenancePlanRepository.save(plan);

    // Emit event for other services
    this.eventEmitter.emit('maintenance_plan.activated', {
      planId: activatedPlan.id,
      tenantId: activatedPlan.tenant_id,
      assetId: activatedPlan.asset_id,
      spaceId: activatedPlan.space_id,
      nextExecution: activatedPlan.next_execution,
      timestamp: new Date(),
    });

    this.logger.log(`Maintenance plan activated: ${activatedPlan.id}`);
    return activatedPlan;
  }

  async suspend(id: string, reason: string, notes?: string) {
    const plan = await this.findOne(id);

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException('Only active plans can be suspended');
    }

    plan.status = PlanStatus.SUSPENDED;
    plan.metadata = {
      ...plan.metadata,
      suspension: {
        reason,
        notes,
        suspended_by: 'current_user', // TODO: Get from context
        suspended_at: new Date(),
      },
    };

    const suspendedPlan = await this.maintenancePlanRepository.save(plan);

    // Emit event for other services
    this.eventEmitter.emit('maintenance_plan.suspended', {
      planId: suspendedPlan.id,
      tenantId: suspendedPlan.tenant_id,
      reason,
      timestamp: new Date(),
    });

    this.logger.log(`Maintenance plan suspended: ${suspendedPlan.id} - ${reason}`);
    return suspendedPlan;
  }

  async execute(id: string, executionDate: Date, notes?: string) {
    const plan = await this.findOne(id);

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException('Only active plans can be executed');
    }

    // Generate task proposal (not automatic task creation)
    const taskProposal = await this.generateTaskProposal(plan, executionDate, notes);

    // Update plan execution tracking
    plan.last_execution = executionDate;
    
    // Calculate next execution
    if (plan.isTimeBased) {
      plan.next_execution = plan.calculateNextExecution();
    }

    plan.metadata = {
      ...plan.metadata,
      last_execution: {
        executed_at: executionDate,
        executed_by: 'current_user', // TODO: Get from context
        notes,
        task_proposal_id: taskProposal.id,
      },
    };

    const executedPlan = await this.maintenancePlanRepository.save(plan);

    // Emit event for other services
    this.eventEmitter.emit('maintenance_plan.executed', {
      planId: executedPlan.id,
      tenantId: executedPlan.tenant_id,
      executionDate,
      taskProposalId: taskProposal.id,
      nextExecution: executedPlan.next_execution,
      timestamp: new Date(),
    });

    this.logger.log(`Maintenance plan executed: ${executedPlan.id}`);

    return {
      message: 'Maintenance plan executed successfully',
      plan: executedPlan,
      task_proposal: taskProposal,
      next_execution: executedPlan.next_execution,
    };
  }

  async getCalendar(options: CalendarOptions) {
    const { from, to, assetId, spaceId } = options;

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const queryBuilder = this.maintenancePlanRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.asset', 'asset')
      .leftJoinAndSelect('plan.space', 'space')
      .where('plan.status = :status', { status: PlanStatus.ACTIVE })
      .andWhere('plan.next_execution BETWEEN :fromDate AND :toDate', { fromDate, toDate });

    if (assetId) {
      queryBuilder.andWhere('plan.asset_id = :assetId', { assetId });
    }

    if (spaceId) {
      queryBuilder.andWhere('plan.space_id = :spaceId', { spaceId });
    }

    const plans = await queryBuilder
      .orderBy('plan.next_execution', 'ASC')
      .getMany();

    // Format for calendar view
    const calendarEvents = plans.map(plan => ({
      id: plan.id,
      title: plan.name,
      start: plan.next_execution,
      end: plan.next_execution, // Single point in time
      type: 'maintenance_plan',
      maintenance_type: plan.maintenance_type,
      trigger_type: plan.trigger_type,
      asset: plan.asset ? {
        id: plan.asset.id,
        name: plan.asset.name,
        category: plan.asset.category,
      } : null,
      space: plan.space ? {
        id: plan.space.id,
        name: plan.space.name,
        category: plan.space.category,
      } : null,
      estimated_duration_minutes: plan.estimated_duration_minutes,
      is_due: plan.isDue,
      is_overdue: plan.isOverdue,
      days_until_due: plan.daysUntilDue,
    }));

    return {
      calendar_events: calendarEvents,
      period: { from: fromDate, to: toDate },
      total_events: calendarEvents.length,
    };
  }

  async getPlanCalendar(id: string, options: { from?: string; to?: string }) {
    const plan = await this.findOne(id);
    const { from, to } = options;

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Generate future executions based on plan frequency
    const futureExecutions = this.generateFutureExecutions(plan, fromDate, toDate);

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        maintenance_type: plan.maintenance_type,
        trigger_type: plan.trigger_type,
        frequency_description: plan.frequencyDescription,
      },
      executions: futureExecutions,
      period: { from: fromDate, to: toDate },
      total_executions: futureExecutions.length,
    };
  }

  async getPlanTasks(id: string) {
    const plan = await this.findOne(id);

    const tasks = await this.taskRepository.find({
      where: { plan_id: id },
      relations: ['work_orders'],
      order: { created_at: 'DESC' },
    });

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        maintenance_type: plan.maintenance_type,
      },
      tasks,
      total: tasks.length,
      summary: {
        generated: tasks.filter(t => t.status === 'GENERATED').length,
        scheduled: tasks.filter(t => t.status === 'SCHEDULED').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
      },
    };
  }

  async reschedule(id: string, newDate: Date, reason: string, notes?: string) {
    const plan = await this.findOne(id);

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException('Only active plans can be rescheduled');
    }

    const oldDate = plan.next_execution;
    plan.next_execution = newDate;
    plan.metadata = {
      ...plan.metadata,
      reschedule: {
        old_date: oldDate,
        new_date: newDate,
        reason,
        notes,
        rescheduled_by: 'current_user', // TODO: Get from context
        rescheduled_at: new Date(),
      },
    };

    const rescheduledPlan = await this.maintenancePlanRepository.save(plan);

    // Emit event for other services
    this.eventEmitter.emit('maintenance_plan.rescheduled', {
      planId: rescheduledPlan.id,
      tenantId: rescheduledPlan.tenant_id,
      oldDate,
      newDate,
      reason,
      timestamp: new Date(),
    });

    this.logger.log(`Maintenance plan rescheduled: ${rescheduledPlan.id} from ${oldDate} to ${newDate}`);
    return rescheduledPlan;
  }

  // Cron job to check for due maintenance plans
  @Cron(CronExpression.EVERY_HOUR)
  async checkDuePlans() {
    const duePlans = await this.maintenancePlanRepository.find({
      where: {
        status: PlanStatus.ACTIVE,
        next_execution: Between(new Date(Date.now() - 60 * 60 * 1000), new Date()), // Last hour
      },
      relations: ['asset', 'space'],
    });

    for (const plan of duePlans) {
      if (plan.autoGeneratesTasks) {
        await this.generateTaskProposal(plan, new Date(), 'Auto-generated from scheduled maintenance');
      }

      // Emit notification event
      this.eventEmitter.emit('maintenance_plan.due', {
        planId: plan.id,
        tenantId: plan.tenant_id,
        assetId: plan.asset_id,
        spaceId: plan.space_id,
        dueDate: plan.next_execution,
        timestamp: new Date(),
      });
    }

    if (duePlans.length > 0) {
      this.logger.log(`Processed ${duePlans.length} due maintenance plans`);
    }
  }

  private async validateRelatedEntities(dto: Partial<CreateMaintenancePlanDto>) {
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

  private async generateTaskProposal(plan: MaintenancePlan, executionDate: Date, notes?: string) {
    // Create a task proposal (not an actual task)
    const taskProposal = this.taskRepository.create({
      tenant_id: plan.tenant_id,
      plan_id: plan.id,
      asset_id: plan.asset_id,
      space_id: plan.space_id,
      title: `${plan.name} - ${executionDate.toLocaleDateString()}`,
      description: plan.description || `Maintenance task generated from plan: ${plan.name}`,
      type: plan.asset_id ? 'technical_maintenance' : 'soft_service',
      scheduled_for: executionDate,
      estimated_duration_minutes: plan.estimated_duration_minutes,
      required_skills: plan.required_skills,
      required_tools: plan.required_tools,
      required_consumables: plan.standard_consumables,
      instructions: plan.checklist,
      safety_requirements: plan.safety_requirements,
      metadata: {
        generated_from_plan: true,
        plan_id: plan.id,
        execution_date: executionDate,
        notes,
        requires_approval: plan.requiresApproval,
      },
    });

    return await this.taskRepository.save(taskProposal);
  }

  private generateFutureExecutions(plan: MaintenancePlan, fromDate: Date, toDate: Date) {
    const executions = [];
    let currentDate = plan.next_execution || fromDate;

    while (currentDate <= toDate && executions.length < 50) { // Limit to 50 executions
      if (currentDate >= fromDate) {
        executions.push({
          date: new Date(currentDate),
          is_past_due: currentDate < new Date(),
          estimated_duration_minutes: plan.estimated_duration_minutes,
          maintenance_type: plan.maintenance_type,
        });
      }

      // Calculate next execution
      if (plan.isTimeBased) {
        const nextExecution = plan.calculateNextExecution();
        if (nextExecution) {
          currentDate = nextExecution;
        } else {
          break;
        }
      } else {
        break; // Non-time-based plans don't have predictable future executions
      }
    }

    return executions;
  }
}