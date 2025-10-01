import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SigningKey } from './entities/signing-key.entity';
import { KeyManagementService } from './services/key-management.service';
import { KeyRotationService } from './services/key-rotation.service';
import { JwksController } from './controllers/jwks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SigningKey])],
  controllers: [JwksController],
  providers: [KeyManagementService, KeyRotationService],
  exports: [KeyManagementService, KeyRotationService],
})
export class KeysModule {}
