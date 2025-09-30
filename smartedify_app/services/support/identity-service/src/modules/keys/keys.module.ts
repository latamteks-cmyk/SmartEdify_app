import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SigningKey } from './entities/signing-key.entity';
import { KeyManagementService } from './services/key-management.service';
import { JwksController } from './controllers/jwks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SigningKey])],
  controllers: [JwksController],
  providers: [KeyManagementService],
  exports: [KeyManagementService],
})
export class KeysModule {}
