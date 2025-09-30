import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { OidcDiscoveryController } from './oidc-discovery.controller';

@Module({
  imports: [HttpModule],
  providers: [OidcDiscoveryService],
  controllers: [OidcDiscoveryController],
  exports: [OidcDiscoveryService],
})
export class OidcDiscoveryModule {}
