import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsService } from '../events.service';

@Injectable()
export class TenancyEventListener {
  private readonly logger = new Logger(TenancyEventListener.name);

  constructor(private readonly eventsService: EventsService) {}

  @OnEvent('tenant.created')
  async handleTenantCreated(payload: any) {
    this.logger.log('Handling tenant.created event', payload);
    
    await this.eventsService.publishEvent('TenantCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      type: payload.type,
      legal_name: payload.legalName,
      country_code: payload.countryCode,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('tenant.updated')
  async handleTenantUpdated(payload: any) {
    this.logger.log('Handling tenant.updated event', payload);
    
    await this.eventsService.publishEvent('TenantUpdated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      changes: payload.changes,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('tenant.deactivated')
  async handleTenantDeactivated(payload: any) {
    this.logger.log('Handling tenant.deactivated event', payload);
    
    await this.eventsService.publishEvent('TenantDeactivated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('unit.created')
  async handleUnitCreated(payload: any) {
    this.logger.log('Handling unit.created event', payload);
    
    await this.eventsService.publishEvent('UnitCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      condominium_id: payload.condominiumId,
      unit_id: payload.unitId,
      local_code: payload.localCode,
      kind: payload.kind,
      common_type: payload.commonType,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('unit.updated')
  async handleUnitUpdated(payload: any) {
    this.logger.log('Handling unit.updated event', payload);
    
    await this.eventsService.publishEvent('UnitUpdated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      condominium_id: payload.condominiumId,
      unit_id: payload.unitId,
      changes: payload.changes,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('unit.deactivated')
  async handleUnitDeactivated(payload: any) {
    this.logger.log('Handling unit.deactivated event', payload);
    
    await this.eventsService.publishEvent('UnitDeactivated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      condominium_id: payload.condominiumId,
      unit_id: payload.unitId,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('units.bulk_created')
  async handleUnitsBulkCreated(payload: any) {
    this.logger.log('Handling units.bulk_created event', payload);
    
    await this.eventsService.publishEvent('UnitsBulkCreated', {
      event_id: this.generateEventId(),
      units: payload.units,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTraceId(): string {
    // In a real implementation, this would extract from request context
    return `trace_${Date.now()}`;
  }
}