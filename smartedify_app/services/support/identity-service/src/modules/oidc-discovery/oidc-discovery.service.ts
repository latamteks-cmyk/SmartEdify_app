import { Injectable } from '@nestjs/common';

@Injectable()
export class OidcDiscoveryService {
  getOidcConfiguration(tenantId: string) {
    const issuer = `https://auth.smartedify.global/t/${tenantId}`;
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      jwks_uri: `https://auth.smartedify.global/.well-known/jwks.json?tenant_id=${tenantId}`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES256'],
      token_endpoint_auth_signing_alg_values_supported: ['ES256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: ['private_key_jwt', 'none'],
      claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'email', 'email_verified', 'name'],
      code_challenge_methods_supported: ['S256'],
      dpop_signing_alg_values_supported: ['ES256'],
    };
  }
}
