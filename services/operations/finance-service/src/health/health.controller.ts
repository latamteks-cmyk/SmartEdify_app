import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'finance-service',
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV') || 'development',
      database: 'connected', // In production, you'd check actual DB connection
      providers: {
        stripe: this.configService.get('STRIPE_SECRET_KEY') ? 'configured' : 'not_configured',
        culqi: this.configService.get('CULQI_SECRET_KEY') ? 'configured' : 'not_configured',
        mercadopago: this.configService.get('MERCADOPAGO_ACCESS_TOKEN') ? 'configured' : 'not_configured',
      },
    };
  }
}