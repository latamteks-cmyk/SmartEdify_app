import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { AssemblySession } from './entities/assembly-session.entity';
import { VideoProvidersModule } from '../video-providers/video-providers.module';
import { RecordingModule } from '../recording/recording.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssemblySession]),
    VideoProvidersModule,
    RecordingModule,
    CommonModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}