import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Blackout, BlackoutSource } from '../entities/blackout.entity';

export interface CreateBlackoutRequest {
  tenantId: string;
  condominiumId: string;
  amenityId?: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
  source: BlackoutSource;
  createdBy: string;
}

export interface GetBlackoutsRequest {
  tenantId: string;
  condominiumId?: string;
  amenityId?: string;
  fromDate?: Date;
  toDate?: Date;
  source?: BlackoutSource;
}

export interface BlackoutCreatedEvent {
  blackoutId: string;
  tenantId: string;
  condominiumId: string;
  amenityId?: string;
  startTime: Date;
  endTime: Date;
  source: BlackoutSource;
  createdBy: string;
}

@Injectable()
export class BlackoutService {
  private readonly logger = new Logger(BlackoutService.name);

  constructor(
    @InjectRepository(Blackout)
    private readonly blackoutRepository: Repository<Blackout>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createBlackout(request: CreateBlackoutRequest): Promise<Blackout> {
    // Validate time range
    if (request.endTime <= request.startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping blackouts (optional - might want to allow overlaps)
    const timeRange = `[${request.startTime.toISOString()},${request.endTime.toISOString()})`;
    
    const blackout = this.blackoutRepository.create({
      tenantId: request.tenantId,
      condominiumId: request.condominiumId,
      amenityId: request.amenityId,
      time: timeRange,
      reason: request.reason,
      source: request.source,
      metadata: {
        createdBy: request.createdBy,
        createdAt: new Date().toISOString(),
      },
    });

    const savedBlackout = await this.blackoutRepository.save(blackout);

    // Emit event
    this.eventEmitter.emit('blackout.created', {
      blackoutId: savedBlackout.id,
      tenantId: savedBlackout.tenantId,
      condominiumId: savedBlackout.condominiumId,
      amenityId: savedBlackout.amenityId,
      startTime: request.startTime,
      endTime: request.endTime,
      source: savedBlackout.source,
      createdBy: request.createdBy,
    } as BlackoutCreatedEvent);

    this.logger.log(`Blackout created: ${savedBlackout.id} for ${request.amenityId || 'all amenities'}`);
    return savedBlackout;
  }

  async getBlackouts(request: GetBlackoutsRequest): Promise<Blackout[]> {
    const queryBuilder = this.blackoutRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId: request.tenantId });

    if (request.condominiumId) {
      queryBuilder.andWhere('b.condominium_id = :condominiumId', {
        condominiumId: request.condominiumId,
      });
    }

    if (request.amenityId) {
      queryBuilder.andWhere('(b.amenity_id = :amenityId OR b.amenity_id IS NULL)', {
        amenityId: request.amenityId,
      });
    }

    if (request.source) {
      queryBuilder.andWhere('b.source = :source', { source: request.source });
    }

    if (request.fromDate && request.toDate) {
      const timeRange = `[${request.fromDate.toISOString()},${request.toDate.toISOString()})`;
      queryBuilder.andWhere('b.time && :timeRange::tstzrange', { timeRange });
    } else if (request.fromDate) {
      queryBuilder.andWhere('upper(b.time) > :fromDate', { fromDate: request.fromDate });
    } else if (request.toDate) {
      queryBuilder.andWhere('lower(b.time) < :toDate', { toDate: request.toDate });
    }

    queryBuilder.orderBy('lower(b.time)', 'ASC');

    return queryBuilder.getMany();
  }

  async getBlackout(tenantId: string, id: string): Promise<Blackout> {
    const blackout = await this.blackoutRepository.findOne({
      where: { id, tenantId },
    });

    if (!blackout) {
      throw new NotFoundException('Blackout not found');
    }

    return blackout;
  }

  async deleteBlackout(tenantId: string, id: string, deletedBy: string): Promise<void> {
    const blackout = await this.getBlackout(tenantId, id);

    // Only allow deletion of ADMIN blackouts, not MAINTENANCE or SYSTEM
    if (blackout.source !== BlackoutSource.ADMIN) {
      throw new BadRequestException('Cannot delete system or maintenance blackouts');
    }

    await this.blackoutRepository.delete({ id, tenantId });

    // Emit event
    this.eventEmitter.emit('blackout.deleted', {
      blackoutId: id,
      tenantId,
      condominiumId: blackout.condominiumId,
      amenityId: blackout.amenityId,
      deletedBy,
    });

    this.logger.log(`Blackout deleted: ${id} by ${deletedBy}`);
  }

  async checkConflicts(
    tenantId: string,
    amenityId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Blackout[]> {
    const timeRange = `[${startTime.toISOString()},${endTime.toISOString()})`;

    return this.blackoutRepository
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('(b.amenity_id = :amenityId OR b.amenity_id IS NULL)', { amenityId })
      .andWhere('b.time && :timeRange::tstzrange', { timeRange })
      .getMany();
  }

  async createMaintenanceBlackout(
    tenantId: string,
    condominiumId: string,
    amenityId: string,
    startTime: Date,
    endTime: Date,
    workOrderId: string,
    reason: string,
  ): Promise<Blackout> {
    return this.createBlackout({
      tenantId,
      condominiumId,
      amenityId,
      startTime,
      endTime,
      reason: `Maintenance: ${reason}`,
      source: BlackoutSource.MAINTENANCE,
      createdBy: 'system',
    });
  }

  async deleteMaintenanceBlackouts(
    tenantId: string,
    workOrderId: string,
  ): Promise<void> {
    await this.blackoutRepository
      .createQueryBuilder()
      .delete()
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('source = :source', { source: BlackoutSource.MAINTENANCE })
      .andWhere("metadata->>'workOrderId' = :workOrderId", { workOrderId })
      .execute();

    this.logger.log(`Maintenance blackouts deleted for work order: ${workOrderId}`);
  }
}