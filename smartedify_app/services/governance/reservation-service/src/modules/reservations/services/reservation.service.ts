import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { Amenity } from '../entities/amenity.entity';
import { Blackout } from '../entities/blackout.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { ComplianceService } from '../../integrations/compliance.service';
import { FinanceService } from '../../integrations/finance.service';

export interface CreateReservationRequest {
  tenantId: string;
  condominiumId: string;
  amenityId: string;
  userId: string;
  createdBy: string;
  startTime: Date;
  endTime: Date;
  partySize: number;
  idempotencyKey: string;
}

export interface ReservationCreatedEvent {
  reservationId: string;
  tenantId: string;
  condominiumId: string;
  amenityId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  requiresApproval: boolean;
  feeAmount: number;
}

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    @InjectRepository(Blackout)
    private readonly blackoutRepository: Repository<Blackout>,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepository: Repository<IdempotencyKey>,
    private readonly complianceService: ComplianceService,
    private readonly financeService: FinanceService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async createReservation(request: CreateReservationRequest): Promise<Reservation> {
    // Check idempotency
    const existingKey = await this.idempotencyRepository.findOne({
      where: {
        tenantId: request.tenantId,
        route: 'POST /reservations',
        key: request.idempotencyKey,
      },
    });

    if (existingKey) {
      if (existingKey.responseStatus === 201 && existingKey.responseBody) {
        // Return existing successful response
        const existingReservation = await this.reservationRepository.findOne({
          where: { id: existingKey.responseBody.id },
        });
        if (existingReservation) {
          return existingReservation;
        }
      }
      throw new ConflictException('Idempotency key already used with different result');
    }

    return this.dataSource.transaction(async manager => {
      // Get amenity with lock
      const amenity = await manager.findOne(Amenity, {
        where: { id: request.amenityId, tenantId: request.tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!amenity || !amenity.active) {
        throw new BadRequestException('Amenity not found or inactive');
      }

      // Validate basic constraints
      this.validateReservationTime(request.startTime, request.endTime, amenity);

      // Check for conflicts
      await this.checkConflicts(
        request.tenantId,
        request.amenityId,
        request.startTime,
        request.endTime,
        manager,
      );

      // Evaluate policy with compliance service
      const policyDecision = await this.complianceService.evaluatePolicy({
        tenantId: request.tenantId,
        condominiumId: request.condominiumId,
        action: 'reservation:create',
        resource: `amenity:${amenity.localCode}`,
        subject: request.userId,
        context: {
          amenityId: request.amenityId,
          amenityType: amenity.rules.type || 'general',
          startTime: request.startTime.toISOString(),
          endTime: request.endTime.toISOString(),
          partySize: request.partySize,
          amenityCapacity: amenity.capacity,
          duration: (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60), // minutes
          advanceBooking: (request.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24), // days
        },
      });

      if (policyDecision.decision === 'DENY') {
        throw new BadRequestException(`Reservation denied: ${policyDecision.reason}`);
      }

      // Extract obligations
      const requiresApproval = policyDecision.obligations?.some(
        o => o.type === 'REQUIRES_APPROVAL'
      ) || false;

      const feeAmount = policyDecision.obligations?.find(
        o => o.type === 'FEE_REQUIRED'
      )?.value || amenity.feeAmount;

      // Create reservation
      const timeRange = `[${request.startTime.toISOString()},${request.endTime.toISOString()})`;
      
      const reservation = manager.create(Reservation, {
        tenantId: request.tenantId,
        condominiumId: request.condominiumId,
        amenityId: request.amenityId,
        userId: request.userId,
        createdBy: request.createdBy,
        time: timeRange,
        partySize: request.partySize,
        priceAmount: feeAmount,
        priceCurrency: amenity.feeCurrency,
        requiresApproval,
        status: feeAmount > 0 ? ReservationStatus.PENDING_UNPAID : 
                requiresApproval ? ReservationStatus.PENDING : 
                ReservationStatus.CONFIRMED,
        metadata: {
          policyDecision: {
            decision: policyDecision.decision,
            policyId: policyDecision.policyId,
            version: policyDecision.version,
            obligations: policyDecision.obligations,
          },
        },
      });

      const savedReservation = await manager.save(reservation);

      // Create order if fee is required
      if (feeAmount > 0) {
        const order = await this.financeService.createOrder({
          tenantId: request.tenantId,
          condominiumId: request.condominiumId,
          userId: request.userId,
          type: 'RESERVATION_FEE',
          amount: feeAmount,
          currency: amenity.feeCurrency,
          description: `Reservation fee for ${amenity.name}`,
          referenceId: savedReservation.id,
          referenceType: 'reservation',
          expirationMinutes: 30,
        }, request.idempotencyKey);

        if (order) {
          savedReservation.metadata = {
            ...savedReservation.metadata,
            orderId: order.id,
          };
          await manager.save(savedReservation);
        } else {
          this.logger.warn(`Failed to create order for reservation ${savedReservation.id}`);
        }
      }

      // Store idempotency key
      await manager.save(IdempotencyKey, {
        tenantId: request.tenantId,
        route: 'POST /reservations',
        key: request.idempotencyKey,
        responseStatus: 201,
        responseBody: { id: savedReservation.id },
      });

      // Emit event
      this.eventEmitter.emit('reservation.created', {
        reservationId: savedReservation.id,
        tenantId: savedReservation.tenantId,
        condominiumId: savedReservation.condominiumId,
        amenityId: savedReservation.amenityId,
        userId: savedReservation.userId,
        startTime: request.startTime,
        endTime: request.endTime,
        status: savedReservation.status,
        requiresApproval,
        feeAmount,
      } as ReservationCreatedEvent);

      this.logger.log(`Reservation created: ${savedReservation.id} for user ${request.userId}`);
      return savedReservation;
    });
  }

  private validateReservationTime(startTime: Date, endTime: Date, amenity: Amenity): void {
    const now = new Date();
    
    if (startTime <= now) {
      throw new BadRequestException('Reservation start time must be in the future');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('Reservation end time must be after start time');
    }

    const duration = endTime.getTime() - startTime.getTime();
    const minDuration = this.parseDuration(amenity.minDuration);
    const maxDuration = this.parseDuration(amenity.maxDuration);

    if (duration < minDuration) {
      throw new BadRequestException(`Minimum reservation duration is ${amenity.minDuration}`);
    }

    if (duration > maxDuration) {
      throw new BadRequestException(`Maximum reservation duration is ${amenity.maxDuration}`);
    }

    const advanceTime = startTime.getTime() - now.getTime();
    const minAdvance = this.parseDuration(amenity.advanceMin);
    const maxAdvance = this.parseDuration(amenity.advanceMax);

    if (advanceTime < minAdvance) {
      throw new BadRequestException(`Minimum advance booking is ${amenity.advanceMin}`);
    }

    if (advanceTime > maxAdvance) {
      throw new BadRequestException(`Maximum advance booking is ${amenity.advanceMax}`);
    }
  }

  private parseDuration(duration: string): number {
    // Simple parser for PostgreSQL interval format
    const match = duration.match(/(\d+)\s*(minute|hour|day)s?/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'minute': return value * 60 * 1000;
      case 'hour': return value * 60 * 60 * 1000;
      case 'day': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private async checkConflicts(
    tenantId: string,
    amenityId: string,
    startTime: Date,
    endTime: Date,
    manager: any,
  ): Promise<void> {
    const timeRange = `[${startTime.toISOString()},${endTime.toISOString()})`;

    // Check existing reservations
    const conflictingReservations = await manager
      .createQueryBuilder(Reservation, 'r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.amenity_id = :amenityId', { amenityId })
      .andWhere('r.status IN (:...statuses)', { 
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PENDING_UNPAID] 
      })
      .andWhere('r.time && :timeRange::tstzrange', { timeRange })
      .getCount();

    if (conflictingReservations > 0) {
      throw new ConflictException('Time slot is already reserved');
    }

    // Check blackouts
    const conflictingBlackouts = await manager
      .createQueryBuilder(Blackout, 'b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('(b.amenity_id = :amenityId OR b.amenity_id IS NULL)', { amenityId })
      .andWhere('b.time && :timeRange::tstzrange', { timeRange })
      .getCount();

    if (conflictingBlackouts > 0) {
      throw new ConflictException('Time slot is blocked');
    }
  }

  async getAvailability(
    tenantId: string,
    amenityId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Array<{ start: Date; end: Date; available: boolean }>> {
    // This would implement availability calculation
    // For now, return a simple implementation
    const slots = [];
    const current = new Date(fromDate);
    
    while (current < toDate) {
      const slotEnd = new Date(current.getTime() + 60 * 60 * 1000); // 1 hour slots
      
      const timeRange = `[${current.toISOString()},${slotEnd.toISOString()})`;
      
      const conflicts = await this.reservationRepository
        .createQueryBuilder('r')
        .where('r.tenant_id = :tenantId', { tenantId })
        .andWhere('r.amenity_id = :amenityId', { amenityId })
        .andWhere('r.status IN (:...statuses)', { 
          statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PENDING_UNPAID] 
        })
        .andWhere('r.time && :timeRange::tstzrange', { timeRange })
        .getCount();

      slots.push({
        start: new Date(current),
        end: new Date(slotEnd),
        available: conflicts === 0,
      });

      current.setHours(current.getHours() + 1);
    }

    return slots;
  }
}