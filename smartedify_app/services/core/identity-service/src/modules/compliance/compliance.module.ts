import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { MfaModule } from '../mfa/mfa.module';
import { ComplianceJob } from './entities/compliance-job.entity';
import { ComplianceJobService } from './entities/compliance-job-service.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { ComplianceEventsProducer } from './services/compliance-events.producer';
import { COMPLIANCE_KAFKA_CLIENT } from './tokens/compliance.tokens';

@Module({
  imports: [
    MfaModule,
    SessionsModule,
    TypeOrmModule.forFeature([ComplianceJob, ComplianceJobService]),
  ],
  providers: [
    ComplianceService,
    {
      provide: COMPLIANCE_KAFKA_CLIENT,
      useValue: {
        connect: () => Promise.resolve(),
        emit: () => ({ subscribe: () => ({}) }),
        close: () => Promise.resolve(),
      },
    },
    ComplianceEventsProducer,
  ],
  controllers: [ComplianceController],
  exports: [ComplianceService],
})
export class ComplianceModule {}
