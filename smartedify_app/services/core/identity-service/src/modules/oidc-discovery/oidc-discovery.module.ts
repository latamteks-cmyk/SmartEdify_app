import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { OidcDiscoveryController } from './oidc-discovery.controller';
import { KeysModule } from '../keys/keys.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SigningKey } from '../keys/entities/signing-key.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([SigningKey]),
  KeysModule,
  ],
  providers: [OidcDiscoveryService],
  controllers: [OidcDiscoveryController],
  exports: [OidcDiscoveryService],
})
export class OidcDiscoveryModule {}
