import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Extract tenant_id from JWT token or header
    const tenantId = this.extractTenantId(request);
    
    if (tenantId) {
      // Store tenant_id in request for later use
      request['tenantId'] = tenantId;
      
      // Set PostgreSQL session variable for RLS
      // This would be handled by a database interceptor in a real implementation
      request['dbContext'] = {
        tenant_id: tenantId,
      };
    }

    return next.handle().pipe(
      tap(() => {
        // Log tenant context for observability
        const method = request.method;
        const url = request.url;
        const userAgent = request.get('User-Agent');
        
        console.log(`[TenantInterceptor] ${method} ${url} - Tenant: ${tenantId} - UA: ${userAgent}`);
      }),
    );
  }

  private extractTenantId(request: Request): string | null {
    // Priority 1: X-Tenant-ID header (for service-to-service calls)
    const headerTenantId = request.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      return headerTenantId;
    }

    // Priority 2: JWT token payload (for user requests)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // In a real implementation, you would decode and validate the JWT
        // For now, we'll assume the token contains tenant_id
        const payload = this.decodeJWT(token);
        return payload?.tenant_id || null;
      } catch (error) {
        console.warn('Failed to decode JWT token:', error.message);
        return null;
      }
    }

    // Priority 3: Query parameter (for development/testing)
    const queryTenantId = request.query.tenant_id as string;
    if (queryTenantId) {
      return queryTenantId;
    }

    return null;
  }

  private decodeJWT(token: string): any {
    try {
      // Simple base64 decode for demo purposes
      // In production, use a proper JWT library with signature verification
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new BadRequestException('Invalid JWT token');
    }
  }
}