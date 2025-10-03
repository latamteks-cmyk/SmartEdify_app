import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { KafkaService } from './services/kafka.service';
import { IdentityServiceClient } from './services/identity-service.client';
import { GovernanceServiceClient } from './services/governance-service.client';
import { TenancyServiceClient } from './services/tenancy-service.client';

@Module({
  imports: [
    JwtModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [
    KafkaService,
    IdentityServiceClient,
    GovernanceServiceClient,
    TenancyServiceClient,
  ],
  exports: [
    KafkaService,
    IdentityServiceClient,
    GovernanceServiceClient,
    TenancyServiceClient,
  ],
})
export class CommonModule {}