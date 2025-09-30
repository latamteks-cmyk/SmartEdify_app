import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, QueryFailedError, Repository } from 'typeorm';
import { DpopReplayProof } from '../entities/dpop-replay-proof.entity';
import { getDpopConfig } from '../../../config/dpop.config';

export interface ReplayRegistrationPayload {
  tenantId: string;
  jkt: string;
  jti: string;
  iat: number;
}

@Injectable()
export class JtiStoreService {
  private readonly ttlSeconds: number;
  private readonly backend: 'database' | 'redis';

  constructor(
    @InjectRepository(DpopReplayProof)
    private readonly repository: Repository<DpopReplayProof>,
  ) {
    const config = getDpopConfig();
    this.ttlSeconds = config.replay.ttlSeconds;
    this.backend = config.replay.backend;

    if (this.backend !== 'database') {
      throw new Error(
        `DPoP replay backend "${this.backend}" is not implemented in this service.`,
      );
    }
  }

  async register(payload: ReplayRegistrationPayload): Promise<void> {
    const { tenantId, jkt, jti, iat } = payload;

    if (!tenantId) {
      throw new UnauthorizedException('Missing tenant context for DPoP proof');
    }

    if (!jkt) {
      throw new UnauthorizedException('Missing DPoP key thumbprint binding');
    }

    if (!jti) {
      throw new UnauthorizedException('Missing DPoP proof identifier');
    }

    const expiresAt = new Date((iat + this.ttlSeconds) * 1000);

    await this.repository.delete({
      tenant_id: tenantId,
      jkt,
      jti,
      expires_at: LessThan(new Date()),
    });

    try {
      await this.repository.insert({
        tenant_id: tenantId,
        jkt,
        jti,
        expires_at: expiresAt,
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverErrorCode = (
          error as QueryFailedError & { driverError?: { code?: string } }
        ).driverError?.code;
        if (
          driverErrorCode === '23505' ||
          driverErrorCode === 'SQLITE_CONSTRAINT' ||
          driverErrorCode === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw new UnauthorizedException('DPoP proof replay detected');
        }
      }
      throw error;
    }
  }
}
