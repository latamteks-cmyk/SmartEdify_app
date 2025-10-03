import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [TranscriptionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}