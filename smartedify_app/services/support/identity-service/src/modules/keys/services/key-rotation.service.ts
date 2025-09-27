import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { SigningKey, KeyStatus } from '../entities/signing-key.entity';
import { KeyManagementService } from './key-management.service';

@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);

  constructor(
    @InjectRepository(SigningKey)
    private readonly signingKeyRepository: Repository<SigningKey>,
    private readonly keyManagementService: KeyManagementService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('=== Starting daily key rotation check ===');
    const startTime = Date.now();
    
    try {
      await this.rotateExpiredActiveKeys();
      await this.expireRolledOverKeys();
      
      const duration = Date.now() - startTime;
      this.logger.log(`=== Daily key rotation completed successfully in ${duration}ms ===`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`=== Daily key rotation failed after ${duration}ms ===`, error.stack);
      throw error;
    }
  }

  private async rotateExpiredActiveKeys() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    this.logger.debug(`Looking for ACTIVE keys created before: ${ninetyDaysAgo.toISOString()}`);

    const keysToRotate = await this.signingKeyRepository.find({
      select: ['kid', 'tenant_id', 'created_at', 'status'],
      where: {
        status: KeyStatus.ACTIVE,
        created_at: LessThanOrEqual(ninetyDaysAgo),
      },
    });

    this.logger.log(`Found ${keysToRotate.length} ACTIVE keys to rotate`);
    
    if (keysToRotate.length === 0) {
      this.logger.debug('No keys need rotation at this time');
      return;
    }

    for (const key of keysToRotate) {
      this.logger.log(`🔄 Rotating key ${key.kid} for tenant ${key.tenant_id} (created: ${key.created_at?.toISOString()})`);
      
      try {
        // 1. Generate a new key for the tenant
        const newKey = await this.keyManagementService.generateNewKey(key.tenant_id);
        this.logger.log(`✅ Generated new ACTIVE key ${newKey.kid} for tenant ${key.tenant_id}`);

        // 2. Mark the old key as rolled over
        const updateResult = await this.signingKeyRepository.update(key.kid, { 
          status: KeyStatus.ROLLED_OVER,
          updated_at: new Date()
        });
        
        if (updateResult.affected === 1) {
          this.logger.log(`✅ Key ${key.kid} successfully rolled over`);
        } else {
          this.logger.warn(`⚠️ Key ${key.kid} update affected ${updateResult.affected} rows (expected 1)`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to rotate key ${key.kid} for tenant ${key.tenant_id}:`, error.message);
        throw error;
      }
    }
    
    this.logger.log(`✅ Successfully processed ${keysToRotate.length} key rotations`);
  }

  private async expireRolledOverKeys() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    this.logger.debug(`Looking for ROLLED_OVER keys updated before: ${sevenDaysAgo.toISOString()}`);

    const keysToExpire = await this.signingKeyRepository.find({
      select: ['kid', 'tenant_id', 'updated_at', 'status'],
      where: {
        status: KeyStatus.ROLLED_OVER,
        updated_at: LessThanOrEqual(sevenDaysAgo), // Check based on when it was rolled over
      },
    });

    this.logger.log(`Found ${keysToExpire.length} ROLLED_OVER keys to expire`);
    
    if (keysToExpire.length === 0) {
      this.logger.debug('No rolled over keys need expiration at this time');
      return;
    }

    for (const key of keysToExpire) {
      this.logger.log(`🗑️ Expiring key ${key.kid} for tenant ${key.tenant_id} (rolled over: ${key.updated_at?.toISOString()})`);
      
      try {
        const updateResult = await this.signingKeyRepository.update(key.kid, { 
          status: KeyStatus.EXPIRED,
          updated_at: new Date()
        });
        
        if (updateResult.affected === 1) {
          this.logger.log(`✅ Key ${key.kid} successfully expired`);
        } else {
          this.logger.warn(`⚠️ Key ${key.kid} expiration affected ${updateResult.affected} rows (expected 1)`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to expire key ${key.kid} for tenant ${key.tenant_id}:`, error.message);
        throw error;
      }
    }
    
    this.logger.log(`✅ Successfully processed ${keysToExpire.length} key expirations`);
  }
}
