import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as jose from 'node-jose';
import { ClientStoreService } from '../../clients/client-store.service';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private readonly clientStore: ClientStoreService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { client_assertion, client_assertion_type } = req.body;

    if (!client_assertion || client_assertion_type !== 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer') {
      throw new BadRequestException('Invalid client authentication method.');
    }

    try {
      // 1. Decode header to get kid and client_id (iss)
      const parts = client_assertion.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const { kid } = header;
      const clientId = payload.iss;

      if (!kid || !clientId) {
        throw new UnauthorizedException('Missing kid or iss in client assertion');
      }

      // 2. Find client and their public key
      const client = await this.clientStore.findClientById(clientId);
      if (!client) {
        throw new UnauthorizedException(`Unknown client: ${clientId}`);
      }

      const jwk = client.jwks.keys.find(k => k.kid === kid);
      if (!jwk) {
        throw new UnauthorizedException('Unknown key identifier (kid)');
      }

      const key = await jose.JWK.asKey(jwk);

      // 3. Verify the JWT signature
      const verifier = jose.JWS.createVerify(key);
      const verified = await verifier.verify(client_assertion);
      const verifiedPayload = JSON.parse(verified.payload.toString());

      // 4. Verify claims
      const now = Math.floor(Date.now() / 1000);
      if (verifiedPayload.exp < now) {
        throw new UnauthorizedException('Client assertion has expired');
      }

      // The audience must be the token endpoint URL
      const tokenEndpointUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      if (verifiedPayload.aud !== tokenEndpointUrl) {
        throw new UnauthorizedException('Invalid audience for client assertion');
      }

      // The issuer and subject must be the client_id
      if (verifiedPayload.iss !== clientId || verifiedPayload.sub !== clientId) {
        throw new UnauthorizedException('Invalid issuer or subject for client assertion');
      }

      return true;

    } catch (error) {
      throw new UnauthorizedException(`Client assertion validation failed: ${error.message}`);
    }
  }
}
