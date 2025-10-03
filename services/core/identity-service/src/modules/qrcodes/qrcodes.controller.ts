import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QrcodesService } from './qrcodes.service';

import { DpopGuard } from '../auth/guards/dpop.guard';

interface GenerateContextualTokenDto {
  event_id: string;
  location: string;
  audience: string;
  expires_in?: number; // seconds, default 300 (5 min)
}

interface ValidateContextualTokenDto {
  token: string;
  audience: string;
}

@ApiTags('Contextual Tokens')
@Controller('/identity/v2/contextual-tokens')
@UseGuards(DpopGuard)
@ApiBearerAuth()
export class QrcodesController {
  constructor(private readonly qrcodesService: QrcodesService) {}

  @Post()
  @ApiOperation({ summary: 'Generate contextual token (QR)' })
  async generateContextualToken(@Body() request: GenerateContextualTokenDto) {
    // Crear payload con claims requeridos por especificación
    const payload = {
      iss: `https://auth.smartedify.global/t/${request.audience}`, // TODO: Extract tenant from request
      aud: request.audience,
      sub: 'contextual-access', // TODO: Extract from authenticated user
      jti: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (request.expires_in || 300), // 5 min default
      event_id: request.event_id,
      location: request.location,
      // cnf: {} // TODO: Add Proof-of-Possession if needed
    };

    const qrCodeDataUrl = await this.qrcodesService.generateQrCode(request.audience, payload);
    return {
      qr_code: qrCodeDataUrl,
      token: payload, // Return token info for debugging
      expires_at: new Date(payload.exp * 1000).toISOString(),
    };
  }

  @Post('/validate')
  @ApiOperation({ summary: 'Validate contextual token' })
  async validateContextualToken(@Body() request: ValidateContextualTokenDto) {
    try {
      const payload = await this.qrcodesService.validateQrCode(request.token);

      // Validar claims según especificación
      const now = Math.floor(Date.now() / 1000);

      if ((payload as any).exp && (payload as any).exp < now) {
        throw new Error('Token expired');
      }

      if ((payload as any).nbf && (payload as any).nbf > now) {
        throw new Error('Token not yet valid');
      }

      if ((payload as any).aud !== request.audience) {
        throw new Error('Invalid audience');
      }

      return {
        valid: true,
        payload,
        message: 'Token is valid',
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
        message: 'Token validation failed',
      };
    }
  }
}
