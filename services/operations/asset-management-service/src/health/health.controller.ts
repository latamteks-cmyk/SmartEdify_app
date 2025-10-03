import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Performs a comprehensive health check of the service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
  })
  @HealthCheck()
  check() {
    return this.health.check([
      // Database connectivity
      () => this.db.pingCheck('database'),
      
      // Memory usage (should not exceed 1GB)
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),
      
      // RSS memory (should not exceed 2GB)
      () => this.memory.checkRSS('memory_rss', 2 * 1024 * 1024 * 1024),
      
      // Disk usage (should have at least 1GB free)
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9, // 90% threshold
      }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple liveness check for Kubernetes',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string', example: 'asset-management-service' },
      },
    },
  })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'asset-management-service',
      version: '1.0.0',
    };
  }

  @Get('readiness')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Readiness check including database connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      // TODO: Add Redis check when implemented
      // () => this.redis.pingCheck('redis'),
    ]);
  }
}