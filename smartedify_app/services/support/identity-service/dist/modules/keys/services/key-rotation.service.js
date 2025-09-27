"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var KeyRotationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyRotationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const signing_key_entity_1 = require("../entities/signing-key.entity");
const key_management_service_1 = require("./key-management.service");
let KeyRotationService = KeyRotationService_1 = class KeyRotationService {
    signingKeyRepository;
    keyManagementService;
    logger = new common_1.Logger(KeyRotationService_1.name);
    constructor(signingKeyRepository, keyManagementService) {
        this.signingKeyRepository = signingKeyRepository;
        this.keyManagementService = keyManagementService;
    }
    async handleCron() {
        this.logger.log('=== Starting daily key rotation check ===');
        const startTime = Date.now();
        try {
            await this.rotateExpiredActiveKeys();
            await this.expireRolledOverKeys();
            const duration = Date.now() - startTime;
            this.logger.log(`=== Daily key rotation completed successfully in ${duration}ms ===`);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`=== Daily key rotation failed after ${duration}ms ===`, error.stack);
            throw error;
        }
    }
    async rotateExpiredActiveKeys() {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        this.logger.debug(`Looking for ACTIVE keys created before: ${ninetyDaysAgo.toISOString()}`);
        const keysToRotate = await this.signingKeyRepository.find({
            select: ['kid', 'tenant_id', 'created_at', 'status'],
            where: {
                status: signing_key_entity_1.KeyStatus.ACTIVE,
                created_at: (0, typeorm_2.LessThanOrEqual)(ninetyDaysAgo),
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
                const newKey = await this.keyManagementService.generateNewKey(key.tenant_id);
                this.logger.log(`✅ Generated new ACTIVE key ${newKey.kid} for tenant ${key.tenant_id}`);
                const updateResult = await this.signingKeyRepository.update(key.kid, {
                    status: signing_key_entity_1.KeyStatus.ROLLED_OVER,
                    updated_at: new Date()
                });
                if (updateResult.affected === 1) {
                    this.logger.log(`✅ Key ${key.kid} successfully rolled over`);
                }
                else {
                    this.logger.warn(`⚠️ Key ${key.kid} update affected ${updateResult.affected} rows (expected 1)`);
                }
            }
            catch (error) {
                this.logger.error(`❌ Failed to rotate key ${key.kid} for tenant ${key.tenant_id}:`, error.message);
                throw error;
            }
        }
        this.logger.log(`✅ Successfully processed ${keysToRotate.length} key rotations`);
    }
    async expireRolledOverKeys() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        this.logger.debug(`Looking for ROLLED_OVER keys updated before: ${sevenDaysAgo.toISOString()}`);
        const keysToExpire = await this.signingKeyRepository.find({
            select: ['kid', 'tenant_id', 'updated_at', 'status'],
            where: {
                status: signing_key_entity_1.KeyStatus.ROLLED_OVER,
                updated_at: (0, typeorm_2.LessThanOrEqual)(sevenDaysAgo),
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
                    status: signing_key_entity_1.KeyStatus.EXPIRED,
                    updated_at: new Date()
                });
                if (updateResult.affected === 1) {
                    this.logger.log(`✅ Key ${key.kid} successfully expired`);
                }
                else {
                    this.logger.warn(`⚠️ Key ${key.kid} expiration affected ${updateResult.affected} rows (expected 1)`);
                }
            }
            catch (error) {
                this.logger.error(`❌ Failed to expire key ${key.kid} for tenant ${key.tenant_id}:`, error.message);
                throw error;
            }
        }
        this.logger.log(`✅ Successfully processed ${keysToExpire.length} key expirations`);
    }
};
exports.KeyRotationService = KeyRotationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KeyRotationService.prototype, "handleCron", null);
exports.KeyRotationService = KeyRotationService = KeyRotationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(signing_key_entity_1.SigningKey)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        key_management_service_1.KeyManagementService])
], KeyRotationService);
//# sourceMappingURL=key-rotation.service.js.map