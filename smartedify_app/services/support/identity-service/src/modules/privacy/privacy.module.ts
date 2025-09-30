import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { DpopReplayProof } from '../auth/entities/dpop-replay-proof.entity';

@Module({
  imports: [
    HttpModule,
    ComplianceModule,
    TypeOrmModule.forFeature([DpopReplayProof]),
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
