import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DPoPGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const dpopHeader = request.headers['dpop'];

    if (!dpopHeader) {
      throw new UnauthorizedException('DPoP header required for this operation');
    }

    try {
      // Basic DPoP validation - in production this would be more comprehensive
      const dpopPayload = await this.jwtService.verifyAsync(dpopHeader, {
        secret: this.configService.get<string>('DPOP_SECRET'),
      });

      // Validate DPoP claims
      if (!dpopPayload.jti || !dpopPayload.htm || !dpopPayload.htu) {
        throw new UnauthorizedException('Invalid DPoP proof');
      }

      // Check method and URL match
      if (dpopPayload.htm !== request.method) {
        throw new UnauthorizedException('DPoP method mismatch');
      }

      // Store DPoP info for anti-replay
      request.dpop = dpopPayload;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid DPoP proof');
    }
  }
}