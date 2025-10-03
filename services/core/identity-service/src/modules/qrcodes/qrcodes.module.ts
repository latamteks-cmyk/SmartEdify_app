import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrcodesService } from './qrcodes.service';
import { QrcodesController } from './qrcodes.controller';
import { KeysModule } from '../keys/keys.module';
import { DpopReplayProof } from '../auth/entities/dpop-replay-proof.entity';

@Module({
  imports: [KeysModule, TypeOrmModule.forFeature([DpopReplayProof])],
  providers: [QrcodesService],
  controllers: [QrcodesController],
})
export class QrcodesModule {}
