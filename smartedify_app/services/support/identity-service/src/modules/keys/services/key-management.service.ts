import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SigningKey, KeyStatus } from '../entities/signing-key.entity';
import * as jose from 'node-jose';
import { generateKeyPairSync } from 'crypto';

@Injectable()
export class KeyManagementService {
  private readonly logger = new Logger(KeyManagementService.name);

  constructor(
    @InjectRepository(SigningKey)
    private readonly signingKeyRepository: Repository<SigningKey>,
  ) {}

  async generateNewKey(tenantId: string): Promise<SigningKey> {
    this.logger.log(`Generating new key for tenant ${tenantId}`);

    // Generate a new ECDSA key pair using Node.js crypto
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });

    // Convert to PEM format
    const privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;

    const publicKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;

    // Create JWK from the public key for JWKS endpoint
    const jwk = await jose.JWK.asKey(publicKeyPem, 'pem');
    const publicKeyJwk = jwk.toJSON() as {
      alg?: string;
      use?: string;
      kid?: string;
      kty: string;
      crv: string;
      x: string;
      y: string;
    };

    // Ensure proper algorithm and use fields
    publicKeyJwk.alg = 'ES256';
    publicKeyJwk.use = 'sig';

    // Create the signing key entity
    const signingKey: SigningKey = this.signingKeyRepository.create({
      tenant_id: tenantId,
      status: KeyStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      public_key_jwk: publicKeyJwk,
      private_key_pem: privateKeyPem,
      algorithm: 'ES256',
    });

    const savedKey: SigningKey =
      await this.signingKeyRepository.save(signingKey);
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
      this.logger.warn(
        `No active key found for tenant ${tenantId}, generating new one`,
      );
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
        const publicJwk = jwk.toJSON() as Record<string, unknown>;
        const keyJwk = key.public_key_jwk as Record<string, unknown>;
        jwksKeys.push({
          ...publicJwk,
          // Usar el kid del JWK, no el de la base de datos
          kid: (keyJwk.kid as string) || (publicJwk.kid as string),
          use: 'sig',
          alg: key.algorithm,
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to process key ${key.kid} for JWKS:`,
          errorMsg,
        );
      }
    }

    return { keys: jwksKeys };
  }
}
