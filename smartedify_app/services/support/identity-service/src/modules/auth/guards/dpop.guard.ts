import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jose from 'jose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DpopReplayProof } from '../entities/dpop-replay-proof.entity';

interface DpopPayload {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  ath?: string; // Access token hash (nice-to-have)
}

@Injectable()
export class DpopGuard implements CanActivate {
  constructor(
    @InjectRepository(DpopReplayProof)
    private dpopReplayRepository: Repository<DpopReplayProof>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const dpopProof = request.headers['dpop'] as string;

    if (!dpopProof) {
      throw new UnauthorizedException('DPoP proof is required');
    }

    try {
      await this.validateDpopProof(dpopProof, request);
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid DPoP proof');
    }
  }

  private async validateDpopProof(
    dpopProof: string,
    request: Request,
  ): Promise<void> {
    let payload: DpopPayload;
    let jkt: string;

    try {
      // Parse JWT header to get jwk
      const [headerB64] = dpopProof.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      if (header.typ !== 'dpop+jwt') {
        throw new BadRequestException('Invalid DPoP proof type');
      }

      if (!header.jwk) {
        throw new BadRequestException('DPoP proof must contain jwk in header');
      }

      // Import public key from JWK
      const publicKey = await jose.importJWK(header.jwk);

      // Calculate JWK thumbprint (jkt)
      jkt = await jose.calculateJwkThumbprint(header.jwk);

      // Verify JWT signature
      const { payload: jwtPayload } = await jose.jwtVerify(
        dpopProof,
        publicKey,
        {
          typ: 'dpop+jwt',
        },
      );

      payload = jwtPayload as unknown as DpopPayload;
    } catch (error) {
      throw new BadRequestException('Invalid DPoP proof format or signature');
    }

    // Validate required claims
    if (!payload.jti || !payload.htm || !payload.htu || !payload.iat) {
      throw new BadRequestException('DPoP proof missing required claims');
    }

    // Validate HTTP method
    if (payload.htm !== request.method) {
      throw new BadRequestException(
        'DPoP htm claim does not match request method',
      );
    }

    // Validate HTTP URL (without query parameters for security)
    const requestUrl = `${request.protocol}://${request.get('host')}${request.path}`;
    if (payload.htu !== requestUrl) {
      throw new BadRequestException(
        'DPoP htu claim does not match request URL',
      );
    }

    // Validate timestamp (allow 60 seconds skew)
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 300; // 5 minutes
    if (payload.iat > now + 60 || payload.iat < now - maxAge) {
      throw new BadRequestException('DPoP proof timestamp is invalid');
    }

    // Check for replay attack
    const tenantId = this.extractTenantId(request);
    await this.checkReplayAttack(tenantId, jkt, payload.jti);

    // Validate access token hash if present (nice-to-have)
    if (payload.ath) {
      await this.validateAccessTokenHash(payload.ath, request);
    }
  }

  private async checkReplayAttack(
    tenantId: string,
    jkt: string,
    jti: string,
  ): Promise<void> {
    // Check if this jti has been used before for this jkt
    const existingProof = await this.dpopReplayRepository.findOne({
      where: { tenant_id: tenantId, jkt, jti },
    });

    if (existingProof) {
      throw new UnauthorizedException('DPoP proof replay detected');
    }

    // Store this proof to prevent replay (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const replayProof = this.dpopReplayRepository.create({
      tenant_id: tenantId,
      jkt,
      jti,
      expires_at: expiresAt,
    });

    await this.dpopReplayRepository.save(replayProof);

    // Clean up expired proofs
    await this.dpopReplayRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
  }

  private extractTenantId(request: Request): string {
    // Try to extract tenant_id from various sources
    const tenantId =
      (request.query.tenant_id as string) ||
      request.body?.tenant_id ||
      (request.headers['x-tenant-id'] as string) ||
      this.extractTenantFromToken(request);

    if (!tenantId) {
      throw new BadRequestException(
        'tenant_id is required for DPoP validation',
      );
    }

    return tenantId;
  }

  private extractTenantFromToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.substring(7);
      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString(),
      );
      return payload.tenant_id || null;
    } catch {
      return null;
    }
  }

  private async validateAccessTokenHash(
    ath: string,
    request: Request,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new BadRequestException(
        'Access token required when ath claim is present',
      );
    }

    const accessToken = authHeader.substring(7);

    // Calculate SHA-256 hash of access token
    const encoder = new TextEncoder();
    const data = encoder.encode(accessToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const expectedAth = Buffer.from(hashArray).toString('base64url');

    if (ath !== expectedAth) {
      throw new BadRequestException(
        'DPoP ath claim does not match access token hash',
      );
    }
  }
}
