import { SigningKey, KeyStatus } from '../../src/modules/keys/entities/signing-key.entity';
import * as jose from 'node-jose';

export class TestDataBuilder {
  /**
   * Crea una llave de firma para testing con datos realistas
   */
  static async createSigningKey(options: {
    tenantId: string;
    status?: KeyStatus;
    daysOld?: number;
    algorithm?: string;
  }): Promise<Partial<SigningKey>> {
    const { tenantId, status = KeyStatus.ACTIVE, daysOld = 0, algorithm = 'ES256' } = options;
    
    // Calcular fechas basadas en daysOld
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysOld);
    
    const updatedAt = new Date(createdAt);
    
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 días de expiración

    // Generar llave JWK real para testing
    const key = await jose.JWK.createKey('EC', 'P-256', { alg: algorithm, use: 'sig' });

    return {
      tenant_id: tenantId,
      status,
      created_at: createdAt,
      updated_at: updatedAt,
      expires_at: expiresAt,
      public_key_jwk: key.toJSON(),
      private_key_pem: await key.toPEM(true), // true para private key
      algorithm,
    };
  }

  /**
   * Crea una llave ACTIVE antigua (para tests de rotación)
   */
  static async createOldActiveKey(tenantId: string, daysOld: number): Promise<Partial<SigningKey>> {
    return this.createSigningKey({
      tenantId,
      status: KeyStatus.ACTIVE,
      daysOld,
    });
  }

  /**
   * Crea una llave ROLLED_OVER (para tests de expiración)
   */
  static async createRolledOverKey(tenantId: string, daysOld: number): Promise<Partial<SigningKey>> {
    return this.createSigningKey({
      tenantId,
      status: KeyStatus.ROLLED_OVER,
      daysOld,
    });
  }

  /**
   * Crea múltiples llaves para tests complejos
   */
  static async createMultipleKeys(
    tenantId: string,
    configurations: Array<{ status: KeyStatus; daysOld: number }>
  ): Promise<Array<Partial<SigningKey>>> {
    const keys: Array<Partial<SigningKey>> = [];
    
    for (const config of configurations) {
      const key = await this.createSigningKey({
        tenantId,
        status: config.status,
        daysOld: config.daysOld,
      });
      keys.push(key);
    }
    
    return keys;
  }

  /**
   * Crea un escenario típico de rotación: 1 llave activa vieja + 1 nueva
   */
  static async createRotationScenario(tenantId: string): Promise<{
    oldActiveKey: Partial<SigningKey>;
    expectedNewActiveKey: Partial<SigningKey>;
  }> {
    const oldActiveKey = await this.createOldActiveKey(tenantId, 91); // 91 días = debe rotar
    const expectedNewActiveKey = await this.createSigningKey({ 
      tenantId, 
      status: KeyStatus.ACTIVE, 
      daysOld: 0 
    });

    return { oldActiveKey, expectedNewActiveKey };
  }

  /**
   * Crea un escenario de expiración: llave rolled over antigua
   */
  static async createExpirationScenario(tenantId: string): Promise<Partial<SigningKey>> {
    return this.createRolledOverKey(tenantId, 8); // 8 días como ROLLED_OVER = debe expirar
  }
}

// Datos constantes para testing
export const TEST_DATA_CONSTANTS = {
  DEFAULT_ALGORITHM: 'ES256',
  ROTATION_THRESHOLD_DAYS: 90,
  EXPIRATION_THRESHOLD_DAYS: 7,
  FUTURE_EXPIRY_DAYS: 90,
} as const;