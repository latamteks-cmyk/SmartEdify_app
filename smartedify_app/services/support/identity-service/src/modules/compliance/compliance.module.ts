import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [MfaModule],
  providers: [ComplianceService],
  controllers: [ComplianceController],
})
export class ComplianceModule {}