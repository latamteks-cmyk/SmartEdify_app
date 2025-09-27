import { Injectable } from '@nestjs/common';
import * as qrcode from 'qrcode';
import { KeyManagementService } from '../keys/services/key-management.service';
import * as jose from 'node-jose';

@Injectable()
export class QrcodesService {
  constructor(private readonly keysService: KeyManagementService) {}

  async generateQrCode(payload: any): Promise<string> {
    const signingKey = await this.keysService.getActiveSigningKey('default'); // Assuming a default tenant
    const key = await jose.JWK.asKey(signingKey.private_key_pem, 'pem');
    
    const jws = await jose.JWS.createSign({ format: 'compact', fields: { kid: signingKey.kid } }, key)
      .update(JSON.stringify(payload))
      .final();

    return qrcode.toDataURL(jws);
  }

  async validateQrCode(token: string): Promise<boolean> {
    try {
      const { header } = jose.JWS.split(token);
      const kid = header.kid;
      const signingKey = await this.keysService.findKeyById(kid);

      if (!signingKey) {
        return false;
      }

      const key = await jose.JWK.asKey(signingKey.public_key_jwk);
      const verifier = jose.JWS.createVerify(key);
      await verifier.verify(token);
      return true;
    } catch (error) {
      return false;
    }
  }
}