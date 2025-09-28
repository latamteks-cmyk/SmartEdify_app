import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { MfaModule } from '../mfa/mfa.module';
import { JobsModule } from '../jobs/jobs.module';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [MfaModule, JobsModule, KafkaModule],
  providers: [ComplianceService],
  controllers: [ComplianceController],
})
export class ComplianceModule {}