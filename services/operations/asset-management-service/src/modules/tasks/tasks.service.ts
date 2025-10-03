import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ConsolidateTasksDto } from './dto/consolidate-tasks.dto';
import { ProposeSosDto } from './dto/propose-sos.dto';
import { Task, TaskStatus, TaskClassification } from './entities/task.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Space } from '../spaces/entities/space.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  classification?: string;
  assetId?: string;
  spaceId?: string;
  groupId?: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Validate related entities
    await this.validateRelatedEntities(createTaskDto);

    const task = this.taskRepository.create({
      ...createTaskDto,
      scheduled_for: createTaskDto.scheduled_for ? new Date(createTaskDto.scheduled_for) : null,
      // tenant_id will be set by tenant interceptor
    });

    const savedTask = await this.taskRepository.save(task);

    // Emit event for other services
    this.eventEmitter.emit('task.created', {
      taskId: savedTask.id,
      tenantId: savedTask.tenant_id,
      type: savedTask.type,
      classification: savedTask.classification,
      assetId: savedTask.asset_id,
      spaceId: savedTask.space_id,
      incidentId: savedTask.incident_id,
      timestamp: new Date(),
    });

    this.logger.log(`Task created: ${savedTask.id} - ${savedTask.title}`);
    return savedTask;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, status, type, classification, assetId, spaceId, groupId } = options;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.incident', 'incident')
      .leftJoinAndSelect('task.asset', 'asset')
      .leftJoinAndSelect('task.space', 'space')
      .leftJoinAndSelect('task.maintenance_plan', 'maintenance_plan')
      .leftJoinAndSelect('task.work_orders', 'work_orders')
      .where('task.tenant_id = :tenantId', { tenantId: 'current_tenant' }); // TODO: Get from context

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('task.type = :type', { type });
    }

    if (classification) {
      queryBuilder.andWhere('task.classification = :classification', { classification });
    }

    if (assetId) {
      queryBuilder.andWhere('task.asset_id = :assetId', { assetId });
    }

    if (spaceId) {
      queryBuilder.andWhere('task.space_id = :spaceId', { spaceId });
    }

    if (groupId) {
      queryBuilder.andWhere('task.group_id = :groupId', { groupId });
    }

    queryBuilder
      .orderBy('task.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Add computed properties
    const tasksWithExtras = data.map(task => ({
      ...task,
      is_generated: task.isGenerated,
      is_scheduled: task.isScheduled,
      is_consolidated: task.isConsolidated,
      is_urgent: task.isUrgent,
      is_programmable: task.isProgrammable,
      requires_special_skills: task.requiresSpecialSkills,
      is_high_risk: task.isHighRisk,
      can_be_consolidated: task.canBeConsolidated,
      estimated_cost: task.estimatedCost,
    }));

    return {
      data: tasksWithExtras,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['incident', 'asset', 'space', 'maintenance_plan', 'work_orders'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    // Validate related entities if being changed
    await this.validateRelatedEntities(updateTaskDto);

    // Convert date string to Date object
    if (updateTaskDto.scheduled_for) {
      updateTaskDto.scheduled_for = new Date(updateTaskDto.scheduled_for) as any;
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.taskRepository.save(task);

    // Emit event for other services
    this.eventEmitter.emit('task.updated', {
      taskId: updatedTask.id,
      tenantId: updatedTask.tenant_id,
      changes: updateTaskDto,
      timestamp: new Date(),
    });

    this.logger.log(`Task updated: ${updatedTask.id}`);
    return updatedTask;
  }

  async getGeneratedTasks() {
    const tasks = await this.taskRepository.find({
      where: { 
        status: TaskStatus.GENERATED,
        // tenant_id: 'current_tenant' // TODO: Get from context
      },
      relations: ['incident', 'asset', 'space'],
      order: { created_at: 'DESC' },
    });

    // Group by classification for better organization
    const groupedTasks = {
      urgent: tasks.filter(t => t.classification === TaskClassification.URGENT),
      ordinary: tasks.filter(t => t.classification === TaskClassification.ORDINARY),
      programmable: tasks.filter(t => t.classification === TaskClassification.PROGRAMMABLE),
      unclassified: tasks.filter(t => !t.classification),
    };

    return {
      tasks: groupedTasks,
      total: tasks.length,
      summary: {
        urgent: groupedTasks.urgent.length,
        ordinary: groupedTasks.ordinary.length,
        programmable: groupedTasks.programmable.length,
        unclassified: groupedTasks.unclassified.length,
      },
    };
  }

  async getConsolidationCandidates(areaId?: string, timeWindowHours: number = 24) {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.asset', 'asset')
      .leftJoinAndSelect('task.space', 'space')
      .where('task.status = :status', { status: TaskStatus.GENERATED })
      .andWhere('task.classification != :urgent', { urgent: TaskClassification.URGENT });

    if (areaId) {
      queryBuilder.andWhere('(task.space_id = :areaId OR asset.space_id = :areaId)', { areaId });
    }

    const tasks = await queryBuilder.getMany();

    // Group tasks by area and time compatibility
    const candidates = this.groupTasksForConsolidation(tasks, timeWindowHours);

    return {
      consolidation_groups: candidates,
      total_groups: candidates.length,
      total_tasks: tasks.length,
      time_window_hours: timeWindowHours,
    };
  }

  async consolidateTasks(consolidateDto: ConsolidateTasksDto) {
    const { task_ids, group_name, group_description, consolidation_reason, notes } = consolidateDto;

    // Validate all tasks exist and can be consolidated
    const tasks = await this.taskRepository.find({
      where: { id: In(task_ids) },
      relations: ['asset', 'space'],
    });

    if (tasks.length !== task_ids.length) {
      throw new BadRequestException('One or more tasks not found');
    }

    // Validate tasks can be consolidated
    const invalidTasks = tasks.filter(task => !task.canBeConsolidated);
    if (invalidTasks.length > 0) {
      throw new BadRequestException(
        `Tasks cannot be consolidated: ${invalidTasks.map(t => t.id).join(', ')}`
      );
    }

    // Generate group ID
    const groupId = uuidv4();

    // Update all tasks with group ID and status
    await this.taskRepository.update(
      { id: In(task_ids) },
      {
        group_id: groupId,
        status: TaskStatus.CONSOLIDATED,
        metadata: {
          consolidation: {
            group_name,
            group_description,
            consolidation_reason,
            notes,
            consolidated_at: new Date(),
            consolidated_by: 'current_user', // TODO: Get from context
          },
        },
      }
    );

    // Emit event for other services
    this.eventEmitter.emit('tasks.consolidated', {
      groupId,
      taskIds: task_ids,
      groupName: group_name,
      tenantId: tasks[0].tenant_id,
      timestamp: new Date(),
    });

    this.logger.log(`Tasks consolidated: ${task_ids.length} tasks in group ${groupId}`);

    return {
      message: 'Tasks consolidated successfully',
      group_id: groupId,
      group_name,
      consolidated_tasks: task_ids.length,
      tasks: await this.taskRepository.find({
        where: { group_id: groupId },
        relations: ['asset', 'space'],
      }),
    };
  }

  async proposeSos(groupId: string, proposeSosDto: ProposeSosDto) {
    // Get all tasks in the group
    const tasks = await this.taskRepository.find({
      where: { group_id: groupId },
      relations: ['asset', 'space', 'incident'],
    });

    if (tasks.length === 0) {
      throw new NotFoundException(`No tasks found for group ${groupId}`);
    }

    // Validate all tasks are consolidated
    const nonConsolidatedTasks = tasks.filter(task => task.status !== TaskStatus.CONSOLIDATED);
    if (nonConsolidatedTasks.length > 0) {
      throw new BadRequestException('All tasks must be consolidated before creating SOS proposal');
    }

    // Create SOS proposal structure
    const sosProposal = {
      id: uuidv4(),
      group_id: groupId,
      title: proposeSosDto.title,
      description: proposeSosDto.description,
      preferred_date: proposeSosDto.preferred_date ? new Date(proposeSosDto.preferred_date) : null,
      response_deadline: proposeSosDto.response_deadline ? new Date(proposeSosDto.response_deadline) : null,
      required_qualifications: proposeSosDto.required_qualifications || [],
      requirements: proposeSosDto.requirements || {},
      attachments: proposeSosDto.attachments || [],
      special_instructions: proposeSosDto.special_instructions,
      budget_info: proposeSosDto.budget_info || {},
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        type: task.type,
        estimated_duration_minutes: task.estimated_duration_minutes,
        required_skills: task.required_skills,
        required_tools: task.required_tools,
        required_consumables: task.required_consumables,
        safety_requirements: task.safety_requirements,
      })),
      summary: {
        total_tasks: tasks.length,
        technical_tasks: tasks.filter(t => t.type === 'technical_maintenance').length,
        service_tasks: tasks.filter(t => t.type === 'soft_service').length,
        estimated_total_duration: tasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0),
        areas_involved: [...new Set(tasks.map(t => t.space_id || t.asset?.space_id).filter(Boolean))],
        assets_involved: [...new Set(tasks.map(t => t.asset_id).filter(Boolean))],
      },
      created_at: new Date(),
      created_by: 'current_user', // TODO: Get from context
    };

    // Update tasks status to escalated
    await this.taskRepository.update(
      { group_id: groupId },
      { status: TaskStatus.ESCALATED_TO_SOS }
    );

    // TODO: Integrate with SOS service when implemented
    // For now, we'll emit an event and return the proposal

    // Emit event for other services
    this.eventEmitter.emit('sos.proposed', {
      sosProposalId: sosProposal.id,
      groupId,
      tenantId: tasks[0].tenant_id,
      taskCount: tasks.length,
      timestamp: new Date(),
    });

    this.logger.log(`SOS proposed for group ${groupId}: ${sosProposal.title}`);

    return {
      message: 'SOS proposal created successfully',
      sos_proposal: sosProposal,
      next_steps: [
        'Review and edit SOS details if needed',
        'Select providers to invite',
        'Set response deadline',
        'Publish SOS to selected providers',
      ],
    };
  }

  async scheduleTask(id: string, scheduledFor: Date, notes?: string) {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.GENERATED && task.status !== TaskStatus.CONSOLIDATED) {
      throw new BadRequestException('Only generated or consolidated tasks can be scheduled');
    }

    task.scheduled_for = scheduledFor;
    task.status = TaskStatus.SCHEDULED;
    
    if (notes) {
      task.metadata = {
        ...task.metadata,
        scheduling: {
          notes,
          scheduled_by: 'current_user', // TODO: Get from context
          scheduled_at: new Date(),
        },
      };
    }

    const scheduledTask = await this.taskRepository.save(task);

    // Emit event for other services
    this.eventEmitter.emit('task.scheduled', {
      taskId: scheduledTask.id,
      tenantId: scheduledTask.tenant_id,
      scheduledFor,
      timestamp: new Date(),
    });

    this.logger.log(`Task scheduled: ${scheduledTask.id} for ${scheduledFor}`);
    return scheduledTask;
  }

  async assignTask(id: string, assignedTo: string, assigneeType: string, notes?: string) {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.SCHEDULED && task.status !== TaskStatus.GENERATED) {
      throw new BadRequestException('Only scheduled or generated tasks can be assigned');
    }

    task.status = TaskStatus.ASSIGNED;
    task.metadata = {
      ...task.metadata,
      assignment: {
        assigned_to: assignedTo,
        assignee_type: assigneeType,
        notes,
        assigned_by: 'current_user', // TODO: Get from context
        assigned_at: new Date(),
      },
    };

    const assignedTask = await this.taskRepository.save(task);

    // Emit event for other services
    this.eventEmitter.emit('task.assigned', {
      taskId: assignedTask.id,
      tenantId: assignedTask.tenant_id,
      assignedTo,
      assigneeType,
      timestamp: new Date(),
    });

    this.logger.log(`Task assigned: ${assignedTask.id} to ${assignedTo}`);
    return assignedTask;
  }

  async cancelTask(id: string, reason: string, notes?: string) {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      throw new BadRequestException('Task is already completed or cancelled');
    }

    task.status = TaskStatus.CANCELLED;
    task.metadata = {
      ...task.metadata,
      cancellation: {
        reason,
        notes,
        cancelled_by: 'current_user', // TODO: Get from context
        cancelled_at: new Date(),
      },
    };

    const cancelledTask = await this.taskRepository.save(task);

    // Emit event for other services
    this.eventEmitter.emit('task.cancelled', {
      taskId: cancelledTask.id,
      tenantId: cancelledTask.tenant_id,
      reason,
      timestamp: new Date(),
    });

    this.logger.log(`Task cancelled: ${cancelledTask.id} - ${reason}`);
    return cancelledTask;
  }

  private async validateRelatedEntities(dto: Partial<CreateTaskDto>) {
    if (dto.incident_id) {
      const incident = await this.incidentRepository.findOne({
        where: { id: dto.incident_id },
      });
      if (!incident) {
        throw new NotFoundException(`Incident with ID ${dto.incident_id} not found`);
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

  private groupTasksForConsolidation(tasks: Task[], timeWindowHours: number) {
    const groups: Array<{
      area: string;
      area_name: string;
      tasks: Task[];
      compatibility_score: number;
      estimated_total_duration: number;
    }> = [];

    // Group by area (space or asset's space)
    const tasksByArea = new Map<string, Task[]>();

    tasks.forEach(task => {
      const areaId = task.space_id || task.asset?.space_id || 'unknown';
      if (!tasksByArea.has(areaId)) {
        tasksByArea.set(areaId, []);
      }
      tasksByArea.get(areaId)!.push(task);
    });

    // Create consolidation groups for areas with multiple tasks
    tasksByArea.forEach((areaTasks, areaId) => {
      if (areaTasks.length >= 2) {
        const areaName = areaTasks[0]?.space?.name || areaTasks[0]?.asset?.space?.name || 'Unknown Area';
        const totalDuration = areaTasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 60), 0);
        
        // Calculate compatibility score based on task types, skills, etc.
        const compatibilityScore = this.calculateCompatibilityScore(areaTasks);

        groups.push({
          area: areaId,
          area_name: areaName,
          tasks: areaTasks,
          compatibility_score: compatibilityScore,
          estimated_total_duration: totalDuration,
        });
      }
    });

    // Sort by compatibility score (higher is better)
    return groups.sort((a, b) => b.compatibility_score - a.compatibility_score);
  }

  private calculateCompatibilityScore(tasks: Task[]): number {
    let score = 0;

    // Same type tasks are more compatible
    const types = [...new Set(tasks.map(t => t.type))];
    if (types.length === 1) score += 30;

    // Similar skill requirements
    const allSkills = tasks.flatMap(t => t.required_skills || []);
    const uniqueSkills = [...new Set(allSkills)];
    const skillOverlap = (allSkills.length - uniqueSkills.length) / Math.max(allSkills.length, 1);
    score += skillOverlap * 20;

    // Similar safety requirements
    const riskLevels = tasks.map(t => t.safety_requirements?.risk_level || 'LOW');
    const uniqueRiskLevels = [...new Set(riskLevels)];
    if (uniqueRiskLevels.length === 1) score += 15;

    // Reasonable total duration (not too long)
    const totalDuration = tasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 60), 0);
    if (totalDuration <= 480) score += 20; // 8 hours or less
    else if (totalDuration <= 720) score += 10; // 12 hours or less

    // More tasks = better consolidation
    score += Math.min(tasks.length * 5, 15);

    return Math.round(score);
  }
}