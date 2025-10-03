import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { PolicyValidationService } from './services/policy-validation.service';
import { RegulatoryProfileService } from './services/regulatory-profile.service';
import { CompliancePolicy } from './entities/compliance-policy.entity';
import { RegulatoryProfile } from './entities/regulatory-profile.entity';
import { ComplianceValidation } from './entities/compliance-validation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompliancePolicy,
      RegulatoryProfile,
      ComplianceValidation,
    ]),
  ],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    PolicyValidationService,
    RegulatoryProfileService,
  ],
  exports: [ComplianceService, PolicyValidationService],
})
export class ComplianceModule {}