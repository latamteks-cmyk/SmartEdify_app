import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitingService, RateLimitConfig } from '../rate-limiting.service';
import { Rfc7807Exception } from '../../../exceptions/rfc7807.exception';

// Decorator to set rate limit for a route
export const RateLimit = Reflector.createDecorator<RateLimitConfig>();

@Injectable()
export class RateLimitingGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitingGuard.name);

  constructor(
    private readonly rateLimitingService: RateLimitingService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get rate limit config from decorator or use default
    const rateLimitConfig = this.reflector.get(RateLimit, context.getHandler()) || undefined;
    
    // Generate rate limit key based on request
    const rateLimitKey = this.generateRateLimitKey(request);
    
    if (!rateLimitKey) {
      // If we can't generate a key, allow the request
      this.logger.warn('Unable to generate rate limit key for request, allowing request');
      return true;
    }
    
    // Check rate limit
    const rateLimitInfo = await this.rateLimitingService.checkRateLimit(
      rateLimitKey,
      rateLimitConfig,
    );
    
    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitInfo.totalRequests + rateLimitInfo.remainingRequests);
    response.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingRequests);
    response.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime.toISOString());
    
    // If rate limited, throw exception
    if (rateLimitInfo.isRateLimited) {
      this.logger.warn(
        `Rate limit exceeded for key: ${rateLimitKey}. Requests: ${rateLimitInfo.totalRequests}/${rateLimitInfo.totalRequests + rateLimitInfo.remainingRequests}`,
      );
      
      // Set retry-after header
      const retryAfter = Math.ceil(
        (rateLimitInfo.resetTime.getTime() - Date.now()) / 1000,
      );
      response.setHeader('Retry-After', retryAfter.toString());
      
      // Throw RFC 7807 formatted exception
      throw Rfc7807Exception.tooManyRequests(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        `${request.method} ${request.url}`,
      );
    }
    
    return true;
  }

  private generateRateLimitKey(request: any): string | null {
    // Try to get client IP address
    const ip = this.getClientIp(request);
    
    // Try to get authenticated client ID
    const clientId = this.getAuthenticatedClientId(request);
    
    // Try to get authenticated user ID
    const userId = this.getAuthenticatedUserId(request);
    
    // Generate key based on available information
    if (userId) {
      // Most specific - user-based rate limiting
      return `user:${userId}:${request.method}:${request.route?.path || request.url}`;
    } else if (clientId) {
      // Client-based rate limiting
      return `client:${clientId}:${request.method}:${request.route?.path || request.url}`;
    } else if (ip) {
      // IP-based rate limiting (least specific)
      return `ip:${ip}:${request.method}:${request.route?.path || request.url}`;
    }
    
    // If we can't identify the requester, return null
    return null;
  }

  private getClientIp(request: any): string | null {
    // Check various headers for client IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }
    
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }
    
    // Fall back to connection remote address
    if (request.connection && request.connection.remoteAddress) {
      return request.connection.remoteAddress;
    }
    
    if (request.socket && request.socket.remoteAddress) {
      return request.socket.remoteAddress;
    }
    
    if (request.info && request.info.remoteAddress) {
      return request.info.remoteAddress;
    }
    
    return null;
  }

  private getAuthenticatedClientId(request: any): string | null {
    // Check if there's client authentication information
    // This could come from various sources depending on implementation
    
    // Check for client assertion (OAuth 2.0 client authentication)
    if (request.body && request.body.client_assertion) {
      try {
        // Parse JWT to get client ID
        const parts = request.body.client_assertion.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          if (payload.iss) {
            return payload.iss; // Client ID is typically in the 'iss' claim
          }
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
    
    // Check for basic auth (client_id:client_secret)
    if (request.headers && request.headers.authorization) {
      const authHeader = request.headers.authorization;
      if (authHeader.startsWith('Basic ')) {
        try {
          const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
          const [clientId] = credentials.split(':');
          if (clientId) {
            return clientId;
          }
        } catch (error) {
          // Ignore decoding errors
        }
      }
    }
    
    // Check for custom client ID header
    if (request.headers && request.headers['x-client-id']) {
      return request.headers['x-client-id'];
    }
    
    return null;
  }

  private getAuthenticatedUserId(request: any): string | null {
    // Check if there's user authentication information
    // This depends on the authentication mechanism used
    
    // Check for user object attached by authentication middleware
    if (request.user && request.user.id) {
      return request.user.id;
    }
    
    // Check for custom user ID header
    if (request.headers && request.headers['x-user-id']) {
      return request.headers['x-user-id'];
    }
    
    return null;
  }
}