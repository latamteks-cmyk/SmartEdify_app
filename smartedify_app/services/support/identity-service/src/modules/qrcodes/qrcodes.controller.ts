import { Controller, Post, Body } from '@nestjs/common';
import { QrcodesService } from './qrcodes.service';

@Controller('qrcodes')
export class QrcodesController {
  constructor(private readonly qrcodesService: QrcodesService) {}

  @Post('generate')
  async generate(@Body() payload: any) {
    const qrCodeDataUrl = await this.qrcodesService.generateQrCode(payload);
    return { qrCodeDataUrl };
  }

  @Post('validate')
  async validate(@Body('token') token: string) {
    const isValid = await this.qrcodesService.validateQrCode(token);
    return { isValid };
  }
}
