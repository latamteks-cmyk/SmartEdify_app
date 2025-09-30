import { Controller, Post, Body } from '@nestjs/common';
import { QrcodesService } from './qrcodes.service';

@Controller('identity/v2/contextual-tokens')
export class QrcodesController {
  constructor(private readonly qrcodesService: QrcodesService) {}

  @Post('generate')
  async generate(@Body() payload: unknown) {
    const qrCodeDataUrl = await this.qrcodesService.generateQrCode(payload);
    return { qrCodeDataUrl };
  }

  @Post('validate')
  async validate(@Body('token') token: string) {
    const isValid: unknown = await this.qrcodesService.validateQrCode(token);
    return { isValid };
  }
}
