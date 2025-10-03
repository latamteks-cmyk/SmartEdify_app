import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionAttendee, ValidationMethod } from './entities/session-attendee.entity';
import { AssemblySession } from '../sessions/entities/assembly-session.entity';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { ValidateBiometricDto } from './dto/validate-biometric.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { RegisterAttendeeDto } from './dto/register-attendee.dto';
import { IdentityServiceClient } from '../../common/services/identity-service.client';
import { KafkaService } from '../../common/services/kafka.service';
import * as crypto from 'crypto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(SessionAttendee)
    private readonly attendeeRepository: Repository<SessionAttendee>,
    @InjectRepository(AssemblySession)
    private readonly sessionRepository: Repository<AssemblySession>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly identityServiceClient: IdentityServiceClient,
    private readonly kafkaService: KafkaService,
  ) {}

  async validateQr(
    sessionId: string,
    validateQrDto: ValidateQrDto,
    tenantId: string,
    userId: string,
    clientIp: string,
    userAgent: string,
  ): Promise<SessionAttendee> {
    this.logger.log(`Validating QR code for session ${sessionId}, user ${userId}`);

    // Validate session exists and is active
    const session = await this.validateSession(sessionId, tenantId);

    // Check if user is already registered
    await this.checkExistingAttendance(sessionId, userId, tenantId);

    // Delegate QR validation to identity-service
    const validationResult = await this.identityServiceClient.validateContextualToken({
      code: validateQrDto.code,
      sessionId,
      userId,
      tenantId,
    });

    if (!validationResult.valid) {
      throw new BadRequestException('Invalid QR code');
    }

    // Create attendance record
    const attendee = await this.createAttendeeRecord({
      sessionId,
      tenantId,
      userId,
      validationMethod: ValidationMethod.QR,
      validationHash: this.hashValidationData(validateQrDto.code),
      clientIp,
      userAgent,
      geolocation: validateQrDto.geolocation,
    });

    this.logger.log(`QR validation successful for user ${userId} in session ${sessionId}`);
    return attendee;
  }

  async validateBiometric(
    sessionId: string,
    validateBiometricDto: ValidateBiometricDto,
    tenantId: string,
    userId: string,
    clientIp: string,
    userAgent: string,
  ): Promise<SessionAttendee> {
    this.logger.log(`Validating biometric for session ${sessionId}, user ${userId}`);

    // Validate session exists and is active
    const session = await this.validateSession(sessionId, tenantId);

    // Check if user is already registered
    await this.checkExistingAttendance(sessionId, userId, tenantId);

    // Delegate biometric validation to identity-service
    const validationResult = await this.identityServiceClient.validateBiometric({
      biometricData: validateBiometricDto.biometricData,
      sessionId,
      userId,
      tenantId,
    });

    if (!validationResult.valid) {
      throw new BadRequestException('Biometric validation failed');
    }

    // Create attendance record (never store biometric data)
    const attendee = await this.createAttendeeRecord({
      sessionId,
      tenantId,
      userId,
      validationMethod: ValidationMethod.BIOMETRIC,
      validationHash: this.hashValidationData(`biometric-${userId}-${Date.now()}`),
      clientIp,
      userAgent,
    });

    this.logger.log(`Biometric validation successful for user ${userId} in session ${sessionId}`);
    return attendee;
  }

  async validateCode(
    sessionId: string,
    validateCodeDto: ValidateCodeDto,
    tenantId: string,
    userId: string,
    clientIp: string,
    userAgent: string,
  ): Promise<SessionAttendee> {
    this.logger.log(`Validating code for session ${sessionId}, user ${userId}`);

    // Validate session exists and is active
    const session = await this.validateSession(sessionId, tenantId);

    // Check if user is already registered
    await this.checkExistingAttendance(sessionId, userId, tenantId);

    // Delegate code validation to identity-service
    const validationResult = await this.identityServiceClient.validateCode({
      code: validateCodeDto.code,
      method: validateCodeDto.method, // 'sms' or 'email'
      sessionId,
      userId,
      tenantId,
    });

    if (!validationResult.valid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Create attendance record
    const validationMethod = validateCodeDto.method === 'sms' ? ValidationMethod.SMS : ValidationMethod.EMAIL;
    const attendee = await this.createAttendeeRecord({
      sessionId,
      tenantId,
      userId,
      validationMethod,
      validationHash: this.hashValidationData(validateCodeDto.code),
      clientIp,
      userAgent,
    });

    this.logger.log(`Code validation successful for user ${userId} in session ${sessionId}`);
    return attendee;
  }

  async registerAttendee(
    sessionId: string,
    registerAttendeeDto: RegisterAttendeeDto,
    tenantId: string,
    moderatorId: string,
    clientIp: string,
    userAgent: string,
  ): Promise<SessionAttendee> {
    this.logger.log(`Manual registration for session ${sessionId}, user ${registerAttendeeDto.userId} by moderator ${moderatorId}`);

    // Validate session exists and is active
    const session = await this.validateSession(sessionId, tenantId);

    // Check if user is already registered
    await this.checkExistingAttendance(sessionId, registerAttendeeDto.userId, tenantId);

    // Validate that the moderator has permission (this would be enhanced with proper RBAC)
    // For now, we assume the moderator token was validated by the JWT guard

    // Create attendance record
    const attendee = await this.createAttendeeRecord({
      sessionId,
      tenantId,
      userId: registerAttendeeDto.userId,
      validationMethod: ValidationMethod.MANUAL,
      validationHash: this.hashValidationData(`manual-${moderatorId}-${Date.now()}`),
      clientIp,
      userAgent,
      metadata: {
        moderatorId,
        notes: registerAttendeeDto.notes,
      },
    });

    this.logger.log(`Manual registration successful for user ${registerAttendeeDto.userId} in session ${sessionId}`);
    return attendee;
  }

  async getSessionAttendees(sessionId: string, tenantId: string): Promise<SessionAttendee[]> {
    return await this.attendeeRepository.find({
      where: { sessionId, tenantId } as FindOptionsWhere<SessionAttendee>,
      order: { validatedAt: 'ASC' },
    });
  }

  async markAttendeeAsLeft(sessionId: string, userId: string, tenantId: string): Promise<SessionAttendee> {
    const attendee = await this.attendeeRepository.findOne({
      where: { sessionId, userId, tenantId } as FindOptionsWhere<SessionAttendee>,
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    attendee.isPresent = false;
    const updatedAttendee = await this.attendeeRepository.save(attendee);

    // Emit event
    this.eventEmitter.emit('attendee.left', {
      sessionId,
      userId,
      tenantId,
      leftAt: new Date().toISOString(),
    });

    return updatedAttendee;
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

  private async checkExistingAttendance(sessionId: string, userId: string, tenantId: string): Promise<void> {
    const existingAttendee = await this.attendeeRepository.findOne({
      where: { sessionId, userId, tenantId } as FindOptionsWhere<SessionAttendee>,
    });

    if (existingAttendee) {
      throw new BadRequestException('User is already registered for this session');
    }
  }

  private async createAttendeeRecord(data: {
    sessionId: string;
    tenantId: string;
    userId: string;
    validationMethod: ValidationMethod;
    validationHash: string;
    clientIp: string;
    userAgent: string;
    geolocation?: { latitude?: number; longitude?: number; accuracy?: number };
    metadata?: Record<string, any>;
  }): Promise<SessionAttendee> {
    const attendee = this.attendeeRepository.create({
      ...data,
      validatedAt: new Date(),
      isPresent: true,
      validationIp: data.clientIp,
      validationUserAgent: data.userAgent,
    });

    const savedAttendee = await this.attendeeRepository.save(attendee);

    // Emit events
    this.eventEmitter.emit('attendance.validated', {
      sessionId: data.sessionId,
      userId: data.userId,
      tenantId: data.tenantId,
      validationMethod: data.validationMethod,
      validatedAt: savedAttendee.validatedAt.toISOString(),
    });

    await this.kafkaService.emit('attendance.validated.v1', {
      sessionId: data.sessionId,
      userId: data.userId,
      tenantId: data.tenantId,
      validationMethod: data.validationMethod,
      validatedAt: savedAttendee.validatedAt.toISOString(),
      isSecureMethod: savedAttendee.isValidatedBySecureMethod(),
    });

    return savedAttendee;
  }

  private hashValidationData(data: string): string {
    const salt = this.configService.get('VALIDATION_SALT', 'streaming-service-salt');
    return crypto.createHash('sha256').update(data + salt).digest('hex');
  }
}