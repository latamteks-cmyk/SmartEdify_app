import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MtlsGuard implements CanActivate {
  private readonly logger = new Logger(MtlsGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // In a real implementation, this would validate mTLS certificates
    // For now, we'll check for a specific header that indicates internal service communication
    const internalServiceHeader = request.headers['x-internal-service'];
    const serviceId = request.headers['x-service-id'];

    if (!internalServiceHeader || !serviceId) {
      this.logger.warn('Missing internal service headers', {
        headers: request.headers,
        url: request.url,
      });
      throw new UnauthorizedException('Internal service authentication required');
    }

    // Validate that the service ID is from an allowed internal service
    const allowedServices = ['governance-service', 'identity-service'];
    if (!allowedServices.includes(serviceId as string)) {
      this.logger.warn(`Unauthorized service attempted access: ${serviceId}`);
      throw new UnauthorizedException('Service not authorized for internal communication');
    }

    // Extract tenant ID from headers for internal services
    const tenantId = request.headers['x-tenant-id'];
    if (tenantId) {
      request['tenantId'] = tenantId;
    }

    this.logger.debug(`Internal service ${serviceId} authenticated successfully`);
    return true;
  }
}