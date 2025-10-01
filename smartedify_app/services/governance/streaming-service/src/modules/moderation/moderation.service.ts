import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SpeechRequest, SpeechRequestStatus, SpeechRequestPriority } from './entities/speech-request.entity';
import { AssemblySession } from '../sessions/entities/assembly-session.entity';
import { CreateSpeechRequestDto } from './dto/create-speech-request.dto';
import { UpdateSpeechRequestDto } from './dto/update-speech-request.dto';
import { KafkaService } from '../../common/services/kafka.service';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(SpeechRequest)
    private readonly speechRequestRepository: Repository<SpeechRequest>,
    @InjectRepository(AssemblySession)
    private readonly sessionRepository: Repository<AssemblySession>,
    private readonly eventEmitter: EventEmitter2,
    private readonly kafkaService: KafkaService,
  ) {}

  async requestSpeech(
    sessionId: string,
    createSpeechRequestDto: CreateSpeechRequestDto,
    tenantId: string,
    userId: string,
  ): Promise<SpeechRequest> {
    this.logger.log(`Speech request from user ${userId} for session ${sessionId}`);

    // Validate session exists and is active
    const session = await this.validateSession(sessionId, tenantId);

    // Check if user already has a pending request
    const existingRequest = await this.speechRequestRepository.findOne({
      where: {
        sessionId,
        userId,
        tenantId,
        status: SpeechRequestStatus.PENDING,
      } as FindOptionsWhere<SpeechRequest>,
    });

    if (existingRequest) {
      throw new BadRequestException('User already has a pending speech request');
    }

    // Create speech request
    const speechRequest = this.speechRequestRepository.create({
      ...createSpeechRequestDto,
      sessionId,
      tenantId,
      userId,
      status: SpeechRequestStatus.PENDING,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
    });

    const savedRequest = await this.speechRequestRepository.save(speechRequest);

    // Emit events
    this.eventEmitter.emit('speech.requested', {
      requestId: savedRequest.id,
      sessionId,
      userId,
      tenantId,
      priority: savedRequest.priority,
    });

    await this.kafkaService.emit('speech.requested.v1', {
      requestId: savedRequest.id,
      sessionId,
      userId,
      tenantId,
      priority: savedRequest.priority,
      requestedAt: savedRequest.requestedAt.toISOString(),
    });

    this.logger.log(`Speech request created: ${savedRequest.id}`);
    return savedRequest;
  }

  async approveSpeechRequest(
    requestId: string,
    tenantId: string,
    moderatorId: string,
    notes?: string,
  ): Promise<SpeechRequest> {
    const request = await this.findSpeechRequest(requestId, tenantId);

    if (request.status !== SpeechRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    if (request.isExpired()) {
      throw new BadRequestException('Speech request has expired');
    }

    request.status = SpeechRequestStatus.APPROVED;
    request.moderatorId = moderatorId;
    request.moderatorNotes = notes;
    request.respondedAt = new Date();

    const updatedRequest = await this.speechRequestRepository.save(request);

    // Emit events
    this.eventEmitter.emit('speech.approved', {
      requestId: updatedRequest.id,
      sessionId: request.sessionId,
      userId: request.userId,
      tenantId,
      moderatorId,
    });

    this.logger.log(`Speech request approved: ${requestId} by moderator ${moderatorId}`);
    return updatedRequest;
  }

  async denySpeechRequest(
    requestId: string,
    tenantId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<SpeechRequest> {
    const request = await this.findSpeechRequest(requestId, tenantId);

    if (request.status !== SpeechRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be denied');
    }

    request.status = SpeechRequestStatus.DENIED;
    request.moderatorId = moderatorId;
    request.moderatorNotes = reason;
    request.respondedAt = new Date();

    const updatedRequest = await this.speechRequestRepository.save(request);

    // Emit events
    this.eventEmitter.emit('speech.denied', {
      requestId: updatedRequest.id,
      sessionId: request.sessionId,
      userId: request.userId,
      tenantId,
      moderatorId,
      reason,
    });

    this.logger.log(`Speech request denied: ${requestId} by moderator ${moderatorId}`);
    return updatedRequest;
  }

  async startSpeaking(requestId: string, tenantId: string): Promise<SpeechRequest> {
    const request = await this.findSpeechRequest(requestId, tenantId);

    if (request.status !== SpeechRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can start speaking');
    }

    request.status = SpeechRequestStatus.SPEAKING;
    request.speakingStartedAt = new Date();

    const updatedRequest = await this.speechRequestRepository.save(request);

    // Emit events
    this.eventEmitter.emit('speech.started', {
      requestId: updatedRequest.id,
      sessionId: request.sessionId,
      userId: request.userId,
      tenantId,
      startedAt: updatedRequest.speakingStartedAt.toISOString(),
    });

    this.logger.log(`User ${request.userId} started speaking in session ${request.sessionId}`);
    return updatedRequest;
  }

  async stopSpeaking(requestId: string, tenantId: string): Promise<SpeechRequest> {
    const request = await this.findSpeechRequest(requestId, tenantId);

    if (request.status !== SpeechRequestStatus.SPEAKING) {
      throw new BadRequestException('Only speaking requests can be stopped');
    }

    request.status = SpeechRequestStatus.COMPLETED;
    request.speakingEndedAt = new Date();

    const updatedRequest = await this.speechRequestRepository.save(request);

    // Emit events
    this.eventEmitter.emit('speech.completed', {
      requestId: updatedRequest.id,
      sessionId: request.sessionId,
      userId: request.userId,
      tenantId,
      duration: updatedRequest.getSpeakingDuration(),
    });

    this.logger.log(`User ${request.userId} finished speaking in session ${request.sessionId}`);
    return updatedRequest;
  }

  async getSessionSpeechRequests(
    sessionId: string,
    tenantId: string,
    status?: SpeechRequestStatus,
  ): Promise<SpeechRequest[]> {
    const queryBuilder = this.speechRequestRepository
      .createQueryBuilder('request')
      .where('request.sessionId = :sessionId', { sessionId })
      .andWhere('request.tenantId = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    return await queryBuilder
      .orderBy('request.priority', 'DESC')
      .addOrderBy('request.requestedAt', 'ASC')
      .getMany();
  }

  async muteUser(sessionId: string, userId: string, tenantId: string, moderatorId: string): Promise<void> {
    this.logger.log(`Muting user ${userId} in session ${sessionId} by moderator ${moderatorId}`);

    // In a real implementation, this would interact with the video provider
    // to actually mute the user's audio

    // Emit event for WebSocket clients
    this.eventEmitter.emit('user.muted', {
      sessionId,
      userId,
      tenantId,
      moderatorId,
      mutedAt: new Date().toISOString(),
    });
  }

  async unmuteUser(sessionId: string, userId: string, tenantId: string, moderatorId: string): Promise<void> {
    this.logger.log(`Unmuting user ${userId} in session ${sessionId} by moderator ${moderatorId}`);

    // In a real implementation, this would interact with the video provider
    // to actually unmute the user's audio

    // Emit event for WebSocket clients
    this.eventEmitter.emit('user.unmuted', {
      sessionId,
      userId,
      tenantId,
      moderatorId,
      unmutedAt: new Date().toISOString(),
    });
  }

  async expireOldRequests(): Promise<void> {
    const expiredRequests = await this.speechRequestRepository
      .createQueryBuilder('request')
      .where('request.status = :status', { status: SpeechRequestStatus.PENDING })
      .andWhere('request.expiresAt < :now', { now: new Date() })
      .getMany();

    for (const request of expiredRequests) {
      request.status = SpeechRequestStatus.EXPIRED;
      await this.speechRequestRepository.save(request);

      this.eventEmitter.emit('speech.expired', {
        requestId: request.id,
        sessionId: request.sessionId,
        userId: request.userId,
        tenantId: request.tenantId,
      });
    }

    if (expiredRequests.length > 0) {
      this.logger.log(`Expired ${expiredRequests.length} old speech requests`);
    }
  }

  private async validateSession(sessionId: string, tenantId: string): Promise<AssemblySession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, tenantId } as FindOptionsWhere<AssemblySession>,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.isActive()) {
      throw new BadRequestException('Session is not active');
    }

    return session;
  }

  private async findSpeechRequest(requestId: string, tenantId: string): Promise<SpeechRequest> {
    const request = await this.speechRequestRepository.findOne({
      where: { id: requestId, tenantId } as FindOptionsWhere<SpeechRequest>,
    });

    if (!request) {
      throw new NotFoundException('Speech request not found');
    }

    return request;
  }
}