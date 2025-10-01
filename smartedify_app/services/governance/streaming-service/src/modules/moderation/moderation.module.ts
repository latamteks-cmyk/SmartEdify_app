import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationService } from './moderation.service';
import { ModerationGateway } from './moderation.gateway';
import { SpeechRequest } from './entities/speech-request.entity';
import { AssemblySession } from '../sessions/entities/assembly-session.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeechRequest, AssemblySession]),
    CommonModule,
  ],
  providers: [ModerationService, ModerationGateway],
  exports: [ModerationService],
})
export class ModerationModule {}