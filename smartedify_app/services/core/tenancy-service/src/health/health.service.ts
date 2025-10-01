import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getServiceInfo() {
    return {
      service: 'tenancy-service',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}