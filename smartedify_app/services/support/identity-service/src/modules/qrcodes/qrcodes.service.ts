import { Injectable } from '@nestjs/common';
import * as qrcode from 'qrcode';
import * as jose from 'node-jose';
import { KeyManagementService } from '../keys/services/key-management.service';

@Injectable()
export class QrcodesService {
  constructor(private readonly keyManagementService: KeyManagementService) {}

  async generateQrCode(payload: Record<string, unknown>): Promise<string> {
    const signingKeyEntity =
      await this.keyManagementService.getActiveSigningKey('default');
    const key = await jose.JWK.asKey(signingKeyEntity.private_key_pem, 'pem');

    const options = {
      format: 'compact' as const,
      fields: {
        alg: 'ES256',
        kid: signingKeyEntity.kid,
      },
    };

    const jwsResult = await jose.JWS.createSign(options, key)
      .update(JSON.stringify(payload))
      .final();
    // @ts-expect-error: Type 'CreateSignResult' is not assignable to type 'string | QRCodeSegment[]'.
    return await qrcode.toDataURL(jwsResult); // Corrected: jwsResult directly
  }

  async validateQrCode(token: string): Promise<Record<string, unknown>> {
    try {
      // Manually parse the header to get the kid before verification
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }
      const headerBase64 = parts[0];
      const header = JSON.parse(
        Buffer.from(headerBase64, 'base64url').toString(),
      ) as { kid?: string };
      const kid = header.kid;

      if (!kid) {
        throw new Error('Missing kid in JWS header');
      }

      const signingKeyEntity = await this.keyManagementService.findKeyById(kid); // Corrected: findKeyById
      if (!signingKeyEntity) {
        throw new Error(`Signing key with kid ${kid} not found`);
      }
      const publicKey = await jose.JWK.asKey(signingKeyEntity.public_key_jwk); // Convert to jose.JWK.Key

      const verifier = jose.JWS.createVerify(publicKey);
      const verified = await verifier.verify(token);

      // Ensure the kid from the verified header matches the one used for lookup
      if ((verified.protected as { kid?: string }).kid !== kid) {
        // Explicit cast for type inference workaround
        throw new Error('JWS header kid mismatch');
      }

      return JSON.parse(verified.payload.toString()) as Record<string, unknown>;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid QR Code: ${errorMsg}`);
    }
  }
}
