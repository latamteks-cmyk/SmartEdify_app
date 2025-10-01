import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private static isInitialized = false;

  onModuleInit() {
    // Prevenir inicialización múltiple, pero permitir en tests E2E
    if (!MetricsService.isInitialized) {
      collectDefaultMetrics();
      MetricsService.isInitialized = true;
    }
  }

  async getMetrics() {
    return register.metrics();
  }

  getPrometheusContentType() {
    return register.contentType;
  }
}
