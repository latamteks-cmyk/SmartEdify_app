import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsService } from '../events.service';

@Injectable()
export class AssetEventListener {
  private readonly logger = new Logger(AssetEventListener.name);

  constructor(private readonly eventsService: EventsService) {}

  @OnEvent('asset.created')
  async handleAssetCreated(payload: any) {
    this.logger.log('Handling asset.created event', payload);
    
    await this.eventsService.publishEvent('AssetCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      asset_id: payload.assetId,
      asset_type: payload.type,
      asset_category: payload.category,
      criticality: payload.criticality,
      space_id: payload.spaceId,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('asset.updated')
  async handleAssetUpdated(payload: any) {
    this.logger.log('Handling asset.updated event', payload);
    
    await this.eventsService.publishEvent('AssetUpdated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      asset_id: payload.assetId,
      changes: payload.changes,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('asset.decommissioned')
  async handleAssetDecommissioned(payload: any) {
    this.logger.log('Handling asset.decommissioned event', payload);
    
    await this.eventsService.publishEvent('AssetDecommissioned', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      asset_id: payload.assetId,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('space.created')
  async handleSpaceCreated(payload: any) {
    this.logger.log('Handling space.created event', payload);
    
    await this.eventsService.publishEvent('SpaceCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      space_id: payload.spaceId,
      category: payload.category,
      complexity: payload.complexity,
      total_area: payload.totalArea,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('space.dimensions_updated')
  async handleSpaceDimensionsUpdated(payload: any) {
    this.logger.log('Handling space.dimensions_updated event', payload);
    
    await this.eventsService.publishEvent('SpaceDimensionsUpdated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      space_id: payload.spaceId,
      dimensions: payload.dimensions,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('incident.created')
  async handleIncidentCreated(payload: any) {
    this.logger.log('Handling incident.created event', payload);
    
    await this.eventsService.publishEvent('IncidentCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      incident_id: payload.incidentId,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      priority: payload.priority,
      source: payload.source,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('incident.classified')
  async handleIncidentClassified(payload: any) {
    this.logger.log('Handling incident.classified event', payload);
    
    await this.eventsService.publishEvent('IncidentClassified', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      incident_id: payload.incidentId,
      task_type: payload.taskType,
      classification: payload.classification,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('incident.created')
  async handleIncidentCreated(payload: any) {
    this.logger.log('Handling incident.created event', payload);
    
    await this.eventsService.publishEvent('IncidentCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      incident_id: payload.incidentId,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      priority: payload.priority,
      source: payload.source,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('incident.classified')
  async handleIncidentClassified(payload: any) {
    this.logger.log('Handling incident.classified event', payload);
    
    await this.eventsService.publishEvent('IncidentClassified', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      incident_id: payload.incidentId,
      task_type: payload.taskType,
      classification: payload.classification,
      task_id: payload.taskId,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('task.created')
  async handleTaskCreated(payload: any) {
    this.logger.log('Handling task.created event', payload);
    
    await this.eventsService.publishEvent('TaskCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      task_id: payload.taskId,
      type: payload.type,
      classification: payload.classification,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      incident_id: payload.incidentId,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('tasks.consolidated')
  async handleTasksConsolidated(payload: any) {
    this.logger.log('Handling tasks.consolidated event', payload);
    
    await this.eventsService.publishEvent('TasksConsolidated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      group_id: payload.groupId,
      group_name: payload.groupName,
      task_ids: payload.taskIds,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('work_order.created')
  async handleWorkOrderCreated(payload: any) {
    this.logger.log('Handling work_order.created event', payload);
    
    await this.eventsService.publishEvent('WorkOrderCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      work_order_id: payload.workOrderId,
      work_order_number: payload.workOrderNumber,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      type: payload.type,
      priority: payload.priority,
      assigned_to: payload.assignedTo,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('work_order.completed')
  async handleWorkOrderCompleted(payload: any) {
    this.logger.log('Handling work_order.completed event', payload);
    
    await this.eventsService.publishEvent('WorkOrderCompleted', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      work_order_id: payload.workOrderId,
      work_order_number: payload.workOrderNumber,
      actual_duration_minutes: payload.actualDurationMinutes,
      completion_report: payload.completionReport,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('work_order.approved')
  async handleWorkOrderApproved(payload: any) {
    this.logger.log('Handling work_order.approved event', payload);
    
    await this.eventsService.publishEvent('WorkOrderApproved', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      work_order_id: payload.workOrderId,
      work_order_number: payload.workOrderNumber,
      approved_by: payload.approvedBy,
      quality_score: payload.qualityScore,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('maintenance_plan.created')
  async handleMaintenancePlanCreated(payload: any) {
    this.logger.log('Handling maintenance_plan.created event', payload);
    
    await this.eventsService.publishEvent('MaintenancePlanCreated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      plan_id: payload.planId,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      maintenance_type: payload.maintenanceType,
      trigger_type: payload.triggerType,
      next_execution: payload.nextExecution,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('maintenance_plan.activated')
  async handleMaintenancePlanActivated(payload: any) {
    this.logger.log('Handling maintenance_plan.activated event', payload);
    
    await this.eventsService.publishEvent('MaintenancePlanActivated', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      plan_id: payload.planId,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      next_execution: payload.nextExecution,
      occurred_at: payload.timestamp,
      trace_id: this.getTraceId(),
    });
  }

  @OnEvent('maintenance_plan.due')
  async handleMaintenancePlanDue(payload: any) {
    this.logger.log('Handling maintenance_plan.due event', payload);
    
    await this.eventsService.publishEvent('MaintenancePlanDue', {
      event_id: this.generateEventId(),
      tenant_id: payload.tenantId,
      plan_id: payload.planId,
      asset_id: payload.assetId,
      space_id: payload.spaceId,
      due_date: payload.dueDate,
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