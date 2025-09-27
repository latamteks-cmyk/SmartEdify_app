import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import { SigningKey, KeyStatus } from '../src/modules/keys/entities/signing-key.entity';
import { KeyRotationService } from '../src/modules/keys/services/key-rotation.service';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';
import { TestDataBuilder } from './utils/test-data.builder';

describe('Key Rotation (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let keyRotationService: KeyRotationService;
  let signingKeyRepository: Repository<SigningKey>;
  const tenantId = TEST_CONSTANTS.DEFAULT_TENANT_ID;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'Key rotation test module initialization'
    );
    app = setup.app;
    keyRotationService = setup.keyRotationService;
    signingKeyRepository = setup.signingKeyRepository;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.cleanDatabase(setup),
      TEST_CONSTANTS.DATABASE_OPERATION_TIMEOUT,
      'Database cleanup'
    );
  });

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Test module cleanup'
    );
  });

  describe('Key Rotation Flow', () => {
    it('should correctly rotate and expire keys', async () => {
      const oldKeyData = await TestDataBuilder.createOldActiveKey(tenantId, 91);
      const savedOldKey = await signingKeyRepository.save(oldKeyData);

      const initialKeys = await signingKeyRepository.find({ where: { tenant_id: tenantId } });
      expect(initialKeys).toHaveLength(1);
      expect(initialKeys[0].status).toBe(KeyStatus.ACTIVE);

      await keyRotationService.handleCron();

      const keysAfterRotation = await signingKeyRepository.find({ 
        where: { tenant_id: tenantId }, 
        order: { created_at: 'ASC' } 
      });
      
      expect(keysAfterRotation).toHaveLength(2);
      expect(keysAfterRotation[0].status).toBe(KeyStatus.ROLLED_OVER);
      expect(keysAfterRotation[1].status).toBe(KeyStatus.ACTIVE);
      expect(keysAfterRotation[0].kid).toBe(savedOldKey.kid);

      const jwksResponse = await request(app.getHttpServer())
        .get('/.well-known/jwks.json')
        .query({ tenant_id: tenantId });
      
      expect(jwksResponse.status).toBe(200);
      expect(jwksResponse.body.keys).toHaveLength(2);

      const rolledOverKey = keysAfterRotation[0];
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      await signingKeyRepository.update(rolledOverKey.kid, { updated_at: eightDaysAgo });

      await keyRotationService.handleCron();

      const keysAfterExpiration = await signingKeyRepository.find({ where: { tenant_id: tenantId } });
      
      expect(keysAfterExpiration.find(k => k.status === KeyStatus.EXPIRED)).toBeDefined();
      expect(keysAfterExpiration.find(k => k.status === KeyStatus.ROLLED_OVER)).toBeUndefined();
      expect(keysAfterExpiration.find(k => k.status === KeyStatus.ACTIVE)).toBeDefined();

      const finalJwksResponse = await request(app.getHttpServer())
        .get('/.well-known/jwks.json')
        .query({ tenant_id: tenantId });
      
      expect(finalJwksResponse.status).toBe(200);
      expect(finalJwksResponse.body.keys).toHaveLength(1);
    }, TEST_CONSTANTS.TEST_TIMEOUT);
  });

  describe('Edge Cases', () => {
    it('should handle no keys to rotate', async () => {
      await keyRotationService.handleCron();
      
      const keys = await signingKeyRepository.find({ where: { tenant_id: tenantId } });
      expect(keys).toHaveLength(0);
    });

    it('should handle keys that are not old enough to rotate', async () => {
      const newKeyData = await TestDataBuilder.createSigningKey({ tenantId, daysOld: 30 });
      await signingKeyRepository.save(newKeyData);
      
      await keyRotationService.handleCron();
      
      const keys = await signingKeyRepository.find({ where: { tenant_id: tenantId } });
      expect(keys).toHaveLength(1);
      expect(keys[0].status).toBe(KeyStatus.ACTIVE);
    });
  });
});
