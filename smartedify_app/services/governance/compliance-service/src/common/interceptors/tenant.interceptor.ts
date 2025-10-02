import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extract tenant ID from JWT token
    const tenantId = this.extractTenantId(request);
    
    if (tenantId) {
      request.tenantId = tenantId;
      // Set tenant context for RLS
      request.headers['x-tenant-id'] = tenantId;
    }

    return next.handle();
  }

  private extractTenantId(request: any): string | null {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      const decoded = this.decodeJWT(token);
      
      return decoded?.tenant_id || null;
    } catch (error) {
      return null;
    }
  }

  private decodeJWT(token: string): any {
    try {
      // Decode without verification for tenant extraction
      // Verification should be done by the auth guard
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}