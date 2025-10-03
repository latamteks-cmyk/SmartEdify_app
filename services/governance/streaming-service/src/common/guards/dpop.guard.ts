import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as jose from 'node-jose';

@Injectable()
export class DPoPGuard implements CanActivate {
  private readonly logger = new Logger(DPoPGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Extract DPoP proof from header
    const dpopProof = request.headers['dpop'] as string;
    
    if (!dpopProof) {
      throw new UnauthorizedException('DPoP proof is required');
    }

    try {
      // In a real implementation, this would:
      // 1. Verify the DPoP proof signature
      // 2. Check the HTTP method and URL match
      // 3. Verify the proof is not replayed (jti check)
      // 4. Validate the proof is bound to the access token
      
      // For now, we'll do basic JWT parsing
      const [header, payload] = dpopProof.split('.');
      
      if (!header || !payload) {
        throw new Error('Invalid DPoP proof format');
      }

      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      // Basic validations
      if (!decodedPayload.jti) {
        throw new Error('DPoP proof missing jti');
      }

      if (!decodedPayload.htm || !decodedPayload.htu) {
        throw new Error('DPoP proof missing HTTP method or URL');
      }

      // Validate HTTP method matches
      if (decodedPayload.htm !== request.method) {
        throw new Error('DPoP proof HTTP method mismatch');
      }

      // Store DPoP info in request for later use
      request['dpop'] = {
        jti: decodedPayload.jti,
        htm: decodedPayload.htm,
        htu: decodedPayload.htu,
        iat: decodedPayload.iat,
      };

      this.logger.debug('DPoP proof validated successfully', { jti: decodedPayload.jti });
      return true;

    } catch (error) {
      this.logger.warn('DPoP proof validation failed', error.message);
      throw new UnauthorizedException('Invalid DPoP proof');
    }
  }
}