import { Module } from '@nestjs/common';
import { QrcodesService } from './qrcodes.service';
import { QrcodesController } from './qrcodes.controller';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [KeysModule],
  providers: [QrcodesService],
  controllers: [QrcodesController],
})
export class QrcodesModule {}
