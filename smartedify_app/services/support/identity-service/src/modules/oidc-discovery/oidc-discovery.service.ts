import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OidcDiscoveryService {
  constructor(private readonly httpService: HttpService) {}

  async getOidcConfiguration(tenantId: string) {
    // Validar tenant_id contra tenancy-service
    await this.validateTenant(tenantId);

    const issuer = `https://auth.smartedify.global/t/${tenantId}`;
    return {
      issuer,
      authorization_endpoint: `https://auth.smartedify.global/authorize`,
      token_endpoint: `https://auth.smartedify.global/oauth/token`,
      userinfo_endpoint: `https://auth.smartedify.global/userinfo`,
      jwks_uri: `https://auth.smartedify.global/.well-known/jwks.json?tenant_id=${tenantId}`,
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: [
        'authorization_code',
        'refresh_token',
        'urn:ietf:params:oauth:grant-type:device_code',
      ],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES256', 'EdDSA'],
      token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'private_key_jwt',
        'tls_client_auth',
      ],
      code_challenge_methods_supported: ['S256'],
      dpop_signing_alg_values_supported: ['ES256', 'EdDSA'],
      require_pushed_authorization_requests: false,
      pushed_authorization_request_endpoint: `https://auth.smartedify.global/oauth/par`,
      revocation_endpoint: `https://auth.smartedify.global/oauth/revoke`,
      introspection_endpoint: `https://auth.smartedify.global/oauth/introspect`,
      device_authorization_endpoint: `https://auth.smartedify.global/oauth/device_authorization`,
      backchannel_logout_supported: true,
      backchannel_logout_session_supported: true,
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'jti',
        'email',
        'email_verified',
        'name',
        'tenant_id',
        'region',
        'cnf',
      ],
    };
  }

  async getJwksByTenant(tenantId: string) {
    // Validar tenant_id contra tenancy-service
    await this.validateTenant(tenantId);

    // TODO: Implementar lógica para obtener claves específicas por tenant
    // Durante rollover, debe retornar 2 claves activas con kid único
    return {
      keys: [
        {
          kty: 'EC',
          use: 'sig',
          crv: 'P-256',
          kid: `${tenantId}-2024-q4-primary`,
          x: 'example_x_coordinate',
          y: 'example_y_coordinate',
          alg: 'ES256',
        },
        // Durante rollover, incluir clave anterior:
        // {
        //   kty: 'EC',
        //   use: 'sig',
        //   crv: 'P-256',
        //   kid: `${tenantId}-2024-q3-previous`,
        //   x: 'example_x_coordinate_old',
        //   y: 'example_y_coordinate_old',
        //   alg: 'ES256'
        // }
      ],
    };
  }

  private async validateTenant(tenantId: string): Promise<void> {
    try {
      // Integración con tenancy-service para validar tenant_id
      const response = await firstValueFrom(
        this.httpService.get(
          `http://tenancy-service:3003/api/v1/tenancy/tenants/${tenantId}`,
        ),
      );

      if (response.status !== 200) {
        throw new BadRequestException('Invalid tenant_id');
      }
    } catch {
      throw new BadRequestException(
        'Invalid tenant_id or tenancy service unavailable',
      );
    }
  }
}
