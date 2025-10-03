import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { ClassifyIncidentDto } from './dto/classify-incident.dto';
import { Incident, IncidentStatus } from './entities/incident.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Space } from '../spaces/entities/space.entity';
import { Task } from '../tasks/entities/task.entity';

interface FindAllOptions {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  source?: string;
  assetId?: string;
  spaceId?: string;
}

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createIncidentDto: CreateIncidentDto,
    files?: Express.Multer.File[],
  ): Promise<Incident> {
    // Validate asset exists if provided
    if (createIncidentDto.asset_id) {
      const asset = await this.assetRepository.findOne({
        where: { id: createIncidentDto.asset_id },
      });
      if (!asset) {
        throw new NotFoundException(
          `Asset with ID ${createIncidentDto.asset_id} not found`,
        );
      }
    }

    // Validate space exists if provided
    if (createIncidentDto.space_id) {
      const space = await this.spaceRepository.findOne({
        where: { id: createIncidentDto.space_id },
      });
      if (!space) {
        throw new NotFoundException(
          `Space with ID ${createIncidentDto.space_id} not found`,
        );
      }
    }

    // Process evidence files
    const evidence = files ? await this.processEvidenceFiles(files) : [];

    const incident = this.incidentRepository.create({
      ...createIncidentDto,
      evidence,
      // tenant_id will be set by tenant interceptor
    });

    const savedIncident = await this.incidentRepository.save(incident);

    // Emit event for other services
    this.eventEmitter.emit('incident.created', {
      incidentId: savedIncident.id,
      tenantId: savedIncident.tenant_id,
      assetId: savedIncident.asset_id,
      spaceId: savedIncident.space_id,
      priority: savedIncident.priority,
      source: savedIncident.source,
      timestamp: new Date(),
    });

    // Request LLM classification if enabled
    if (this.configService.get<boolean>('app.enableLlmClassification')) {
      await this.requestLlmClassification(savedIncident.id);
    }

    this.logger.log(`Incident created: ${savedIncident.id} - ${savedIncident.title}`);
    return savedIncident;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, status, priority, source, assetId, spaceId } = options;

    const queryBuilder = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.asset', 'asset')
      .leftJoinAndSelect('incident.space', 'space')
      .leftJoinAndSelect('incident.tasks', 'tasks')
      .where('incident.tenant_id = :tenantId', { tenantId: 'current_tenant' }); // TODO: Get from context

    if (status) {
      queryBuilder.andWhere('incident.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('incident.priority = :priority', { priority });
    }

    if (source) {
      queryBuilder.andWhere('incident.source = :source', { source });
    }

    if (assetId) {
      queryBuilder.andWhere('incident.asset_id = :assetId', { assetId });
    }

    if (spaceId) {
      queryBuilder.andWhere('incident.space_id = :spaceId', { spaceId });
    }

    queryBuilder
      .orderBy('incident.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Add computed properties
    const incidentsWithExtras = data.map(incident => ({
      ...incident,
      is_critical: incident.isCritical,
      has_evidence: incident.hasEvidence,
      has_llm_classification: incident.hasLlmClassification,
      requires_warranty_check: incident.requiresWarrantyCheck,
      resolution_time_hours: incident.resolutionTimeHours,
    }));

    return {
      data: incidentsWithExtras,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['asset', 'space', 'tasks'],
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    return incident;
  }

  async update(id: string, updateIncidentDto: UpdateIncidentDto): Promise<Incident> {
    const incident = await this.findOne(id);

    // Validate asset if being changed
    if (updateIncidentDto.asset_id && updateIncidentDto.asset_id !== incident.asset_id) {
      const asset = await this.assetRepository.findOne({
        where: { id: updateIncidentDto.asset_id },
      });
      if (!asset) {
        throw new NotFoundException(
          `Asset with ID ${updateIncidentDto.asset_id} not found`,
        );
      }
    }

    // Validate space if being changed
    if (updateIncidentDto.space_id && updateIncidentDto.space_id !== incident.space_id) {
      const space = await this.spaceRepository.findOne({
        where: { id: updateIncidentDto.space_id },
      });
      if (!space) {
        throw new NotFoundException(
          `Space with ID ${updateIncidentDto.space_id} not found`,
        );
      }
    }

    Object.assign(incident, updateIncidentDto);
    const updatedIncident = await this.incidentRepository.save(incident);

    // Emit event for other services
    this.eventEmitter.emit('incident.updated', {
      incidentId: updatedIncident.id,
      tenantId: updatedIncident.tenant_id,
      changes: updateIncidentDto,
      timestamp: new Date(),
    });

    this.logger.log(`Incident updated: ${updatedIncident.id}`);
    return updatedIncident;
  }

  async classify(id: string, classifyDto: ClassifyIncidentDto) {
    const incident = await this.findOne(id);

    if (incident.status !== IncidentStatus.OPEN) {
      throw new BadRequestException('Only open incidents can be classified');
    }

    // Update incident with classification
    incident.asset_id = classifyDto.asset_id || incident.asset_id;
    incident.space_id = classifyDto.space_id || incident.space_id;
    incident.task_type = classifyDto.task_type;
    incident.task_classification = classifyDto.task_classification;
    incident.standardized_description = classifyDto.standardized_description || incident.standardized_description;
    incident.status = IncidentStatus.CLASSIFIED;

    await this.incidentRepository.save(incident);

    // Generate task based on classification
    const task = await this.generateTaskFromIncident(incident, classifyDto);

    // Emit event for other services
    this.eventEmitter.emit('incident.classified', {
      incidentId: incident.id,
      tenantId: incident.tenant_id,
      taskType: incident.task_type,
      classification: incident.task_classification,
      taskId: task.id,
      timestamp: new Date(),
    });

    this.logger.log(`Incident classified: ${incident.id} -> ${incident.task_type}/${incident.task_classification}`);

    return {
      message: 'Incident classified successfully',
      incident,
      task,
      next_steps: this.getNextStepsForClassification(incident.task_classification),
    };
  }

  async requestLlmClassification(id: string) {
    const incident = await this.findOne(id);

    // TODO: Integrate with analytics-service for LLM classification
    // For now, simulate the request
    const llmRequest = {
      incident_id: incident.id,
      title: incident.title,
      description: incident.description,
      evidence: incident.evidence,
      asset_type: incident.asset?.category,
      space_category: incident.space?.category,
    };

    this.logger.log(`Requesting LLM classification for incident: ${incident.id}`);

    // Simulate LLM response
    const mockLlmResponse = {
      suggested_asset_type: incident.asset?.category || 'unknown',
      suggested_failure_type: 'malfunction',
      suggested_task_type: 'technical_maintenance',
      suggested_classification: 'ORDINARY',
      confidence_score: 0.85,
      classification_timestamp: new Date().toISOString(),
    };

    // Update incident with LLM classification
    incident.llm_classification = mockLlmResponse;
    await this.incidentRepository.save(incident);

    return {
      message: 'LLM classification requested successfully',
      incident_id: incident.id,
      llm_classification: mockLlmResponse,
    };
  }

  async getTasks(id: string) {
    const incident = await this.findOne(id);

    const tasks = await this.taskRepository.find({
      where: { incident_id: id },
      order: { created_at: 'DESC' },
    });

    return {
      incident: {
        id: incident.id,
        title: incident.title,
        status: incident.status,
        classification: incident.task_classification,
      },
      tasks,
      total: tasks.length,
    };
  }

  async resolve(id: string, resolutionNotes?: string) {
    const incident = await this.findOne(id);

    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Incident is already closed');
    }

    incident.status = IncidentStatus.RESOLVED;
    incident.resolved_at = new Date();
    
    if (resolutionNotes) {
      incident.metadata = {
        ...incident.metadata,
        resolution_notes: resolutionNotes,
      };
    }

    const resolvedIncident = await this.incidentRepository.save(incident);

    // Emit event for other services
    this.eventEmitter.emit('incident.resolved', {
      incidentId: resolvedIncident.id,
      tenantId: resolvedIncident.tenant_id,
      resolutionTimeHours: resolvedIncident.resolutionTimeHours,
      timestamp: new Date(),
    });

    this.logger.log(`Incident resolved: ${resolvedIncident.id}`);
    return resolvedIncident;
  }

  async close(id: string, closureNotes?: string) {
    const incident = await this.findOne(id);

    if (incident.status !== IncidentStatus.RESOLVED) {
      throw new BadRequestException('Only resolved incidents can be closed');
    }

    incident.status = IncidentStatus.CLOSED;
    incident.closed_at = new Date();
    
    if (closureNotes) {
      incident.metadata = {
        ...incident.metadata,
        closure_notes: closureNotes,
      };
    }

    const closedIncident = await this.incidentRepository.save(incident);

    // Emit event for other services
    this.eventEmitter.emit('incident.closed', {
      incidentId: closedIncident.id,
      tenantId: closedIncident.tenant_id,
      timestamp: new Date(),
    });

    this.logger.log(`Incident closed: ${closedIncident.id}`);
    return closedIncident;
  }

  private async processEvidenceFiles(files: Express.Multer.File[]) {
    // TODO: Upload files to documents-service and get URLs
    return files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 
            file.mimetype.startsWith('video/') ? 'video' : 
            file.mimetype.startsWith('audio/') ? 'audio' : 'document',
      url: `https://cdn.smartedify.com/incidents/${Date.now()}_${file.originalname}`,
      filename: file.originalname,
      size: file.size,
      uploaded_at: new Date(),
    }));
  }

  private async generateTaskFromIncident(incident: Incident, classifyDto: ClassifyIncidentDto) {
    // TODO: This should integrate with TasksService
    // For now, create a basic task structure
    const task = this.taskRepository.create({
      tenant_id: incident.tenant_id,
      incident_id: incident.id,
      asset_id: incident.asset_id,
      space_id: incident.space_id,
      title: `Task from incident: ${incident.title}`,
      description: incident.description,
      type: classifyDto.task_type,
      classification: classifyDto.task_classification,
      // Additional task properties would be set based on classification
    });

    return await this.taskRepository.save(task);
  }

  private getNextStepsForClassification(classification: string) {
    switch (classification) {
      case 'URGENT':
        return [
          'Task will follow emergency workflow',
          'Immediate notification to on-call technician',
          'Consider creating emergency work order',
        ];
      case 'ORDINARY':
        return [
          'Task will be added to regular SOS workflow',
          'Can be consolidated with other tasks',
          'Standard provider selection process',
        ];
      case 'PROGRAMMABLE':
        return [
          'Task will be added to next scheduled maintenance',
          'Administrator can advance maintenance date if needed',
          'Will appear in maintenance planning dashboard',
        ];
      default:
        return ['Task created and ready for further processing'];
    }
  }
}