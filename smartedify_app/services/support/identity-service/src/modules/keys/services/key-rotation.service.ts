import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async handleCron(): Promise<void> {
    // Buscar todas las llaves activas
    const activeKeys = await this.signingKeyRepository.find({ where: { status: KeyStatus.ACTIVE } });
    for (const key of activeKeys) {
      // Si la llave es "antigua" (más de 90 días), rotar
      const now = new Date();
      const created = new Date(key.created_at);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 90) {
        // Marcar la llave como ROLLED_OVER
        key.status = KeyStatus.ROLLED_OVER;
        await this.signingKeyRepository.save(key);
        // Crear nueva llave activa para el mismo tenant
        await this.keyManagementService.generateNewKey(key.tenant_id);
      }
    }
    // Expirar llaves ROLLED_OVER con más de 90 días (usando updated_at o created_at)
    const rolledOverKeys = await this.signingKeyRepository.find({ where: { status: KeyStatus.ROLLED_OVER } });
    for (const key of rolledOverKeys) {
      const now = new Date();
      // Usar updated_at si existe, sino created_at
      const refDate = key.updated_at ? new Date(key.updated_at) : new Date(key.created_at);
      const diffDays = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 90) {
        key.status = KeyStatus.EXPIRED;
        await this.signingKeyRepository.save(key);
      }
    }
    this.logger.log('Key rotation cron executed');
  }
}
