import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { MfaModule } from '../mfa/mfa.module';
import { ComplianceJob } from './entities/compliance-job.entity';
import { ComplianceJobService } from './entities/compliance-job-service.entity';
import { SessionsModule } from '../sessions/sessions.module';
import {
  ComplianceEventsProducer,
  kafkaClientConfig,
} from './services/compliance-events.producer';
import { COMPLIANCE_KAFKA_CLIENT } from './tokens/compliance.tokens';

@Module({
  imports: [
    MfaModule,
    SessionsModule,
    TypeOrmModule.forFeature([ComplianceJob, ComplianceJobService]),
    ClientsModule.register([
      {
        name: COMPLIANCE_KAFKA_CLIENT,
        ...kafkaClientConfig(),
      },
    ]),
  ],
  providers: [ComplianceService, ComplianceEventsProducer],
  controllers: [ComplianceController],
})
export class ComplianceModule {}