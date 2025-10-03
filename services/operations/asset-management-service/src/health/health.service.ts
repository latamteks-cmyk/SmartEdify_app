import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getServiceInfo() {
    return {
      service: 'asset-management-service',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      features: {
        asset_management: true,
        maintenance_planning: true,
        work_orders: true,
        incident_tracking: true,
        space_management: true,
        offline_support: process.env.ENABLE_OFFLINE_MODE === 'true',
        llm_classification: process.env.ENABLE_LLM_CLASSIFICATION === 'true',
        predictive_maintenance: process.env.ENABLE_PREDICTIVE_MAINTENANCE === 'true',
      },
    };
  }
}