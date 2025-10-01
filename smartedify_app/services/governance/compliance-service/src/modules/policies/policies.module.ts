import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { CompliancePolicy } from '../compliance/entities/compliance-policy.entity';
import { RegulatoryProfile } from '../compliance/entities/regulatory-profile.entity';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompliancePolicy,
      RegulatoryProfile,
    ]),
    ComplianceModule,
  ],
  controllers: [PoliciesController],
  providers: [
    PoliciesService,
    PolicyDecisionService,
  ],
  exports: [PoliciesService, PolicyDecisionService],
})
export class PoliciesModule {}