import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

import { Attendance, CheckInMethod } from '../entities/attendance.entity';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';

export interface CheckInRequest {
  tenantId: string;
  reservationId: string;
  userId: string;
  method: CheckInMethod;
  payload?: string;
  location?: { lat: number; lng: number };
  bySub: string;
}

export interface CheckOutRequest {
  tenantId: string;
  reservationId: string;
  userId: string;
  method: CheckInMethod;
  payload?: string;
  bySub: string;
}

export interface AttendanceEvent {
  type: 'CHECK_IN' | 'CHECK_OUT';
  tenantId: string;
  reservationId: string;
  userId: string;
  method: CheckInMethod;
  timestamp: Date;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async checkIn(request: CheckInRequest): Promise<Attendance> {
    // Validate reservation exists and belongs to user
    const reservation = await this.reservationRepository.findOne({
      where: {
        id: request.reservationId,
        tenantId: request.tenantId,
        userId: request.userId,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Reservation must be confirmed for check-in');
    }

    // Check if already checked in
    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        reservationId: request.reservationId,
        tenantId: request.tenantId,
      },
    });

    if (existingAttendance?.checkInAt) {
      throw new BadRequestException('Already checked in');
    }

    // Validate check-in window
    const now = new Date();
    const reservationStart = this.parseTimeRange(reservation.time).start;
    const checkInWindow = 15 * 60 * 1000; // 15 minutes in milliseconds

    if (now < new Date(reservationStart.getTime() - checkInWindow)) {
      throw new BadRequestException('Check-in window not yet open');
    }

    if (now > new Date(reservationStart.getTime() + checkInWindow)) {
      throw new BadRequestException('Check-in window has closed');
    }

    // Validate check-in method
    await this.validateCheckInMethod(request);

    // Create or update attendance record
    const attendance = existingAttendance || this.attendanceRepository.create({
      reservationId: request.reservationId,
      tenantId: request.tenantId,
      method: request.method,
      bySub: request.bySub,
    });

    attendance.checkInAt = now;
    attendance.validationHash = this.generateValidationHash(request.payload);

    const savedAttendance = await this.attendanceRepository.save(attendance);

    // Emit event
    this.eventEmitter.emit('attendance.checked-in', {
      type: 'CHECK_IN',
      tenantId: request.tenantId,
      reservationId: request.reservationId,
      userId: request.userId,
      method: request.method,
      timestamp: now,
    } as AttendanceEvent);

    this.logger.log(`User ${request.userId} checked in to reservation ${request.reservationId}`);
    return savedAttendance;
  }

  async checkOut(request: CheckOutRequest): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: {
        reservationId: request.reservationId,
        tenantId: request.tenantId,
      },
    });

    if (!attendance || !attendance.checkInAt) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.checkOutAt) {
      throw new BadRequestException('Already checked out');
    }

    const now = new Date();
    attendance.checkOutAt = now;

    const savedAttendance = await this.attendanceRepository.save(attendance);

    // Emit event
    this.eventEmitter.emit('attendance.checked-out', {
      type: 'CHECK_OUT',
      tenantId: request.tenantId,
      reservationId: request.reservationId,
      userId: request.userId,
      method: request.method,
      timestamp: now,
    } as AttendanceEvent);

    this.logger.log(`User ${request.userId} checked out from reservation ${request.reservationId}`);
    return savedAttendance;
  }

  async getAttendance(tenantId: string, reservationId: string): Promise<Attendance | null> {
    return this.attendanceRepository.findOne({
      where: {
        tenantId,
        reservationId,
      },
    });
  }

  private async validateCheckInMethod(request: CheckInRequest): Promise<void> {
    switch (request.method) {
      case CheckInMethod.QR:
        await this.validateQRCode(request);
        break;
      case CheckInMethod.BIOMETRIC:
        await this.validateBiometric(request);
        break;
      case CheckInMethod.SMS:
        await this.validateSMSCode(request);
        break;
      case CheckInMethod.MANUAL:
        // Manual check-in by staff - no additional validation needed
        break;
      default:
        throw new BadRequestException('Invalid check-in method');
    }
  }

  private async validateQRCode(request: CheckInRequest): Promise<void> {
    if (!request.payload) {
      throw new BadRequestException('QR code payload required');
    }

    try {
      // Delegate to identity-service for QR validation
      const identityServiceUrl = this.configService.get<string>('services.identity.url');
      const response = await firstValueFrom(
        this.httpService.post(`${identityServiceUrl}/v2/contextual-tokens/validate`, {
          token: request.payload,
          context: {
            type: 'RESERVATION_CHECK_IN',
            reservationId: request.reservationId,
            tenantId: request.tenantId,
          },
        }),
      );

      if (!response.data.valid) {
        throw new BadRequestException('Invalid QR code');
      }
    } catch (error) {
      this.logger.error(`QR validation failed: ${error.message}`);
      throw new BadRequestException('QR code validation failed');
    }
  }

  private async validateBiometric(request: CheckInRequest): Promise<void> {
    if (!request.payload) {
      throw new BadRequestException('Biometric data required');
    }

    // Check if biometric check-in is enabled
    const biometricEnabled = this.configService.get<boolean>('features.biometricCheckIn');
    if (!biometricEnabled) {
      throw new BadRequestException('Biometric check-in not enabled');
    }

    try {
      // Delegate to identity-service for biometric validation
      const identityServiceUrl = this.configService.get<string>('services.identity.url');
      const response = await firstValueFrom(
        this.httpService.post(`${identityServiceUrl}/v2/biometric/validate`, {
          biometricData: request.payload,
          userId: request.userId,
          tenantId: request.tenantId,
        }),
      );

      if (!response.data.valid) {
        throw new BadRequestException('Biometric validation failed');
      }
    } catch (error) {
      this.logger.error(`Biometric validation failed: ${error.message}`);
      throw new BadRequestException('Biometric validation failed');
    }
  }

  private async validateSMSCode(request: CheckInRequest): Promise<void> {
    if (!request.payload) {
      throw new BadRequestException('SMS code required');
    }

    try {
      // Delegate to identity-service for SMS code validation
      const identityServiceUrl = this.configService.get<string>('services.identity.url');
      const response = await firstValueFrom(
        this.httpService.post(`${identityServiceUrl}/v2/sms/validate`, {
          code: request.payload,
          userId: request.userId,
          tenantId: request.tenantId,
          context: 'RESERVATION_CHECK_IN',
        }),
      );

      if (!response.data.valid) {
        throw new BadRequestException('Invalid SMS code');
      }
    } catch (error) {
      this.logger.error(`SMS validation failed: ${error.message}`);
      throw new BadRequestException('SMS code validation failed');
    }
  }

  private generateValidationHash(payload?: string): string {
    if (!payload) return '';
    
    const salt = this.configService.get<string>('VALIDATION_SALT', 'default-salt');
    return crypto.createHash('sha256').update(payload + salt).digest('hex');
  }

  private parseTimeRange(timeRange: string): { start: Date; end: Date } {
    // Parse PostgreSQL tstzrange format: [start,end)
    const match = timeRange.match(/\[([^,]+),([^)]+)\)/);
    if (!match) {
      throw new Error('Invalid time range format');
    }

    return {
      start: new Date(match[1]),
      end: new Date(match[2]),
    };
  }
}