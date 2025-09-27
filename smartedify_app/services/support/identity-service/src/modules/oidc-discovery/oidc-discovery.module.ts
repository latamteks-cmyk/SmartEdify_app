import { Module } from '@nestjs/common';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { OidcDiscoveryController } from './oidc-discovery.controller';

@Module({
  providers: [OidcDiscoveryService],
  controllers: [OidcDiscoveryController],
})
export class OidcDiscoveryModule {}
