import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  onModuleInit() {
    // Start collecting default metrics (e.g., CPU, memory, event loop lag)
    collectDefaultMetrics();
  }

  async getMetrics() {
    return register.metrics();
  }

  getPrometheusContentType() {
    return register.contentType;
  }
}
