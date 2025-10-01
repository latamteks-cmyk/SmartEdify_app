import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssemblySession, SessionStatus, SessionModality } from './entities/assembly-session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { VideoProvidersService } from '../video-providers/video-providers.service';
import { RecordingService } from '../recording/recording.service';
import { KafkaService } from '../../common/services/kafka.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(AssemblySession)
    private readonly sessionRepository: Repository<AssemblySession>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly videoProvidersService: VideoProvidersService,
    private readonly recordingService: RecordingService,
    private readonly kafkaService: KafkaService,
  ) {}

  async create(createSessionDto: CreateSessionDto, tenantId: string): Promise<AssemblySession> {
    this.logger.log(`Creating session for assembly ${createSessionDto.assemblyId} in tenant ${tenantId}`);

    // Validate tenant session limits
    await this.validateTenantLimits(tenantId);

    // Create video conference link based on provider
    const videoConferenceLink = await this.videoProvidersService.createSession(
      createSessionDto.videoProvider || 'webrtc',
      {
        assemblyId: createSessionDto.assemblyId,
        tenantId,
        maxParticipants: createSessionDto.maxParticipants || 500,
      }
    );

    const session = this.sessionRepository.create({
      ...createSessionDto,
      tenantId,
      videoConferenceLink,
      status: SessionStatus.SCHEDULED,
      currentParticipants: 0,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Emit session created event
    this.eventEmitter.emit('session.created', {
      sessionId: savedSession.id,
      assemblyId: savedSession.assemblyId,
      tenantId,
      modality: savedSession.modality,
    });

    // Send Kafka event
    await this.kafkaService.emit('session.created.v1', {
      sessionId: savedSession.id,
      assemblyId: savedSession.assemblyId,
      tenantId,
      modality: savedSession.modality,
      videoProvider: savedSession.videoProvider,
      createdAt: savedSession.createdAt.toISOString(),
    });

    this.logger.log(`Session ${savedSession.id} created successfully`);
    return savedSession;
  }

  async findAll(
    tenantId: string,
    filters?: {
      assemblyId?: string;
      status?: SessionStatus;
      modality?: SessionModality;
    }
  ): Promise<AssemblySession[]> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('session.attendees', 'attendees')
      .leftJoinAndSelect('session.speechRequests', 'speechRequests');

    if (filters?.assemblyId) {
      queryBuilder.andWhere('session.assemblyId = :assemblyId', { assemblyId: filters.assemblyId });
    }

    if (filters?.status) {
      queryBuilder.andWhere('session.status = :status', { status: filters.status });
    }

    if (filters?.modality) {
      queryBuilder.andWhere('session.modality = :modality', { modality: filters.modality });
    }

    return await queryBuilder
      .orderBy('session.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, tenantId: string): Promise<AssemblySession> {
    const session = await this.sessionRepository.findOne({
      where: { id, tenantId } as FindOptionsWhere<AssemblySession>,
      relations: ['attendees', 'speechRequests'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, tenantId: string): Promise<AssemblySession> {
    const session = await this.findOne(id, tenantId);

    if (!session.canBeModified()) {
      throw new ForbiddenException('Cannot update active or completed session');
    }

    Object.assign(session, updateSessionDto);
    const updatedSession = await this.sessionRepository.save(session);

    this.eventEmitter.emit('session.updated', {
      sessionId: updatedSession.id,
      tenantId,
      changes: updateSessionDto,
    });

    return updatedSession;
  }

  async start(id: string, tenantId: string): Promise<AssemblySession> {
    const session = await this.findOne(id, tenantId);

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be started');
    }

    session.status = SessionStatus.ACTIVE;
    session.startedAt = new Date();

    const updatedSession = await this.sessionRepository.save(session);

    // Start recording if enabled
    if (session.recordingEnabled) {
      await this.recordingService.startRecording(session.id, tenantId);
    }

    // Emit events
    this.eventEmitter.emit('session.started', {
      sessionId: updatedSession.id,
      assemblyId: updatedSession.assemblyId,
      tenantId,
      startedAt: updatedSession.startedAt.toISOString(),
    });

    await this.kafkaService.emit('session.started.v1', {
      sessionId: updatedSession.id,
      assemblyId: updatedSession.assemblyId,
      tenantId,
      modality: updatedSession.modality,
      startedAt: updatedSession.startedAt.toISOString(),
    });

    this.logger.log(`Session ${id} started successfully`);
    return updatedSession;
  }

  async end(id: string, tenantId: string, governanceData?: {
    merkleRoot: string;
    commitHeight: number;
  }): Promise<AssemblySession> {
    const session = await this.findOne(id, tenantId);

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Only active sessions can be ended');
    }

    session.status = SessionStatus.COMPLETED;
    session.endedAt = new Date();

    // Add governance data if provided
    if (governanceData) {
      session.merkleRoot = governanceData.merkleRoot;
      session.commitHeight = governanceData.commitHeight;
    }

    // Stop recording and generate audit proof
    if (session.recordingEnabled) {
      const recordingData = await this.recordingService.stopRecording(session.id, tenantId);
      session.recordingUrl = recordingData.url;
      session.recordingHashSha256 = recordingData.hash;
      
      // Generate cryptographic seal
      if (governanceData) {
        session.quorumSeal = await this.recordingService.generateAuditProof(
          session.id,
          recordingData.hash,
          governanceData.merkleRoot,
          governanceData.commitHeight,
          tenantId
        );
      }
    }

    const updatedSession = await this.sessionRepository.save(session);

    // Emit events
    this.eventEmitter.emit('session.ended', {
      sessionId: updatedSession.id,
      assemblyId: updatedSession.assemblyId,
      tenantId,
      endedAt: updatedSession.endedAt.toISOString(),
      duration: updatedSession.getDuration(),
    });

    await this.kafkaService.emit('session.ended.v1', {
      sessionId: updatedSession.id,
      assemblyId: updatedSession.assemblyId,
      tenantId,
      endedAt: updatedSession.endedAt.toISOString(),
      duration: updatedSession.getDuration(),
      attendeeCount: updatedSession.attendees?.length || 0,
    });

    this.logger.log(`Session ${id} ended successfully`);
    return updatedSession;
  }

  async cancel(id: string, tenantId: string, reason?: string): Promise<AssemblySession> {
    const session = await this.findOne(id, tenantId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed session');
    }

    session.status = SessionStatus.CANCELLED;
    if (reason) {
      session.metadata = { ...session.metadata, cancellationReason: reason };
    }

    const updatedSession = await this.sessionRepository.save(session);

    this.eventEmitter.emit('session.cancelled', {
      sessionId: updatedSession.id,
      tenantId,
      reason,
    });

    return updatedSession;
  }

  async getAuditProof(id: string): Promise<{
    sessionId: string;
    recordingHashSha256?: string;
    merkleRoot?: string;
    commitHeight?: number;
    quorumSeal?: string;
    signingKid?: string;
    timestamp: string;
  }> {
    // This endpoint is public, so we don't filter by tenant
    const session = await this.sessionRepository.findOne({
      where: { id },
      select: [
        'id',
        'recordingHashSha256',
        'merkleRoot',
        'commitHeight',
        'quorumSeal',
        'signingKid',
        'endedAt',
      ],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return {
      sessionId: session.id,
      recordingHashSha256: session.recordingHashSha256,
      merkleRoot: session.merkleRoot,
      commitHeight: session.commitHeight,
      quorumSeal: session.quorumSeal,
      signingKid: session.signingKid,
      timestamp: session.endedAt?.toISOString() || new Date().toISOString(),
    };
  }

  private async validateTenantLimits(tenantId: string): Promise<void> {
    const maxSessions = this.configService.get('MAX_SESSIONS_PER_TENANT', 10);
    
    const activeSessionsCount = await this.sessionRepository.count({
      where: {
        tenantId,
        status: SessionStatus.ACTIVE,
      },
    });

    if (activeSessionsCount >= maxSessions) {
      throw new ForbiddenException(`Maximum number of active sessions (${maxSessions}) reached for tenant`);
    }
  }
}