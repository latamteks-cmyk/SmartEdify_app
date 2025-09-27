import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SigningKey, KeyStatus } from '../entities/signing-key.entity';
import * as jose from 'node-jose';

@Injectable()
export class KeyManagementService {
  private readonly logger = new Logger(KeyManagementService.name);

  constructor(
    @InjectRepository(SigningKey)
    private readonly signingKeyRepository: Repository<SigningKey>,
  ) {}

  async generateNewKey(tenantId: string): Promise<SigningKey> {
    this.logger.log(`Generating new key for tenant ${tenantId}`);
    
    // Generate a new ECDSA key pair using P-256 curve
    const key = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    
    // Create the signing key entity
    const signingKey = this.signingKeyRepository.create({
      tenant_id: tenantId,
      status: KeyStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      public_key_jwk: key.toJSON(),
      private_key_pem: await key.toPEM(true), // true for private key
      algorithm: 'ES256',
    });
    
    const savedKey = await this.signingKeyRepository.save(signingKey);
    this.logger.log(`New key generated with kid: ${savedKey.kid}`);
    
    return savedKey;
  }

  async getActiveSigningKey(tenantId: string): Promise<SigningKey> {
    const activeKey = await this.signingKeyRepository.findOne({
      where: {
        tenant_id: tenantId,
        status: KeyStatus.ACTIVE,
      },
      order: {
        created_at: 'DESC',
      },
    });
    
    if (!activeKey) {
      this.logger.warn(`No active key found for tenant ${tenantId}, generating new one`);
      return this.generateNewKey(tenantId);
    }
    
    return activeKey;
  }

  async findKeyById(kid: string): Promise<SigningKey | null> {
    return this.signingKeyRepository.findOne({ where: { kid } });
  }

  async getJwksForTenant(tenantId: string): Promise<{ keys: object[] }> {
    const validKeys = await this.signingKeyRepository.find({
      where: {
        tenant_id: tenantId,
        status: In([KeyStatus.ACTIVE, KeyStatus.ROLLED_OVER]),
      },
    });

    const jwksKeys: object[] = [];
    for (const key of validKeys) {
      try {
        const jwk = await jose.JWK.asKey(key.public_key_jwk);
        const publicJwk = jwk.toJSON();
        jwksKeys.push(publicJwk);
      } catch (error) {
        this.logger.error(`Failed to process key ${key.kid} for JWKS:`, error.message);
      }
    }

    return { keys: jwksKeys };
  }
}