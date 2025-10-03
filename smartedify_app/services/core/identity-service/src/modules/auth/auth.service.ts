import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Rfc7807Exception } from '../../exceptions/rfc7807.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { importPKCS8, SignJWT } from 'jose';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/entities/user.entity';
import { ParStoreService, ParPayload } from './store/par-store.service';

// Token introspection response interface according to RFC 7662
export interface TokenIntrospectionResponse {
  active: boolean;
  sub?: string;
  scope?: string;
  exp?: number;
  iat?: number;
  client_id?: string;
  token_type?: string;
}
import {
  DeviceCodeStoreService,
  DeviceCodeStatus,
} from './store/device-code-store.service';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { KeyManagementService } from '../keys/services/key-management.service';
import { JtiStoreService } from './store/jti-store.service';
import { getDpopConfig } from '../../config/dpop.config';
import { ClientStoreService } from '../clients/client-store.service';

export interface ValidateDpopProofOptions {
  boundJkt?: string;
  requireBinding?: boolean;
}

export interface ValidatedDpopProof {
  jkt: string;
  htm: string;
  htu: string;
  iat: number;
  jti: string;
  ath?: string;
}

interface JwtHeader {
  kid: string;
}

interface BackchannelLogoutPayload {
  iss: string;
  events?: Record<string, unknown>;
  sid?: string;
}

interface JwksKeyObject {
  kid?: string;
  [key: string]: unknown;
}

interface ClientWithJwks {
  jwks?: {
    keys?: JwksKeyObject[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authorizationCodeStore: AuthorizationCodeStoreService,
    private readonly tokensService: TokensService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly parStore: ParStoreService,
    private readonly deviceCodeStore: DeviceCodeStoreService,
    private readonly jtiStore: JtiStoreService,
    private readonly keyManagementService: KeyManagementService,
    private readonly clientStore: ClientStoreService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  pushedAuthorizationRequest(payload: ParPayload): {
    request_uri: string;
    expires_in: number;
  } {
    const requestUri = `urn:ietf:params:oauth:request_uri:${crypto.randomBytes(32).toString('hex')}`;
    this.parStore.set(requestUri, payload);
    return { request_uri: requestUri, expires_in: 60 };
  }

  getStoredPARRequest(requestUri: string): ParPayload | null {
    return this.parStore.get(requestUri) || null;
  }

  deviceAuthorizationRequest(): {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  } {
    const device_code = crypto.randomBytes(32).toString('hex');
    const user_code = crypto.randomBytes(4).toString('hex').toUpperCase(); // User-friendly code
    const expiresIn = 1800; // 30 minutes

    this.deviceCodeStore.set(
      device_code,
      {
        user_code,
        status: DeviceCodeStatus.PENDING,
      },
      expiresIn,
    );

    return {
      device_code,
      user_code,
      verification_uri: 'https://example.com/device', // Should be a real URL
      expires_in: expiresIn,
      interval: 5, // Polling interval
    };
  }

  generateAuthorizationCode(params: {
    code_challenge: string;
    code_challenge_method: string;
    userId: string;
    scope: string;
  }): string {
    const payload = {
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
      scope: params.scope,
    };

    const code = crypto.randomBytes(32).toString('hex');
    const codeData = {
      ...payload,
      userId: params.userId,
    };

    this.authorizationCodeStore.set(code, codeData);
    return code;
  }

  async exchangeCodeForTokens(
    code: string,
    code_verifier: string,
    dpopProof: string,
    httpMethod: string,
    httpUrl: string,
  ): Promise<[string, string]> {
    // 1. Validate DPoP FIRST (according to OAuth 2.0 + DPoP spec)
    if (!dpopProof) {
      throw Rfc7807Exception.unauthorized('DPoP proof is required');
    }

    const proof = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);

    // 2. Validate required parameters (after DPoP passes)
    if (!code || !code_verifier) {
      throw Rfc7807Exception.badRequest('Code and code_verifier are required');
    }

    // 3. Validate authorization code
    const storedCode = this.authorizationCodeStore.get(code);

    if (!storedCode) {
      throw Rfc7807Exception.badRequest('Invalid authorization code');
    }

    // 4. Validate PKCE
    const { code_challenge, code_challenge_method, userId, scope } = storedCode; // Destructure scope
    let challenge: string;
    if (code_challenge_method === 'S256') {
      challenge = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');
    } else {
      challenge = code_verifier;
    }

    if (challenge !== code_challenge) {
      throw Rfc7807Exception.unauthorized('Invalid code verifier');
    }

    // 5. Get User
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw Rfc7807Exception.notFound('User not found');
    }

    // 6. Generate Tokens
    await this.jtiStore.register({
      tenantId: user.tenant_id,
      jkt: proof.jkt,
      jti: proof.jti,
      iat: proof.iat,
    });

    const accessToken = await this._generateAccessToken(user, proof.jkt, scope);
    const refreshToken = await this._generateRefreshToken(
      user,
      proof.jkt,
      scope,
    );

    return [accessToken, refreshToken];
  }

  async exchangeDeviceCodeForTokens(deviceCode: string): Promise<[string, string]> {
    // Get the device code payload from storage
    const deviceCodePayload = this.deviceCodeStore.getByDeviceCode(deviceCode);
    
    if (!deviceCodePayload) {
      throw Rfc7807Exception.badRequest('Invalid device code');
    }
    
    // Check if the device code has been approved
    if (deviceCodePayload.status !== DeviceCodeStatus.APPROVED) {
      if (deviceCodePayload.status === DeviceCodeStatus.DENIED) {
        throw Rfc7807Exception.badRequest('Device code was denied');
      }
      // If still pending, return authorization_pending error per RFC 8628
      throw Rfc7807Exception.badRequest('authorization_pending');
    }
    
    // Get the user who approved the device code
    if (!deviceCodePayload.userId) {
      throw Rfc7807Exception.badRequest('Device code approval is missing user ID');
    }
    
    const user = await this.usersService.findById(deviceCodePayload.userId);
    if (!user) {
      throw Rfc7807Exception.notFound('User not found for approved device code');
    }
    
    // Generate tokens (access and refresh, though refresh may not be standard for device flow)
    const jkt = crypto.randomBytes(32).toString('hex'); // In a real implementation, this should be tied to the device
    const accessToken = await this._generateAccessToken(user, jkt, 'openid profile');
    const refreshToken = await this._generateRefreshToken(user, jkt, 'openid profile');
    
    return [accessToken, refreshToken];
  }

  async revokeToken(token: string, token_type_hint?: string): Promise<void> {
    // For now, we only support refresh token revocation
    if (token_type_hint === 'refresh_token') {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      const foundToken = await this.refreshTokenRepository.findOne({
        where: { token_hash: hashedToken },
      });
      if (foundToken) {
        await this.refreshTokenRepository.delete(foundToken.id);
      }
      // RFC 7009 says the server should return 200 OK regardless of whether the token was valid
      return;
    }

    // In a real implementation, we would handle access token revocation via a denylist
  }

  private async _generateAccessToken(
    user: User,
    jkt: string,
    scope: string,
  ): Promise<string> {
    const signingKey = await this.keyManagementService.getActiveSigningKey(
      user.tenant_id,
    );

    // El private_key_pem ahora está en formato PKCS#8 correcto
    const privateKey = await importPKCS8(signingKey.private_key_pem, 'ES256');

    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    const issuer = `https://auth.smartedify.global/t/${user.tenant_id}`;

    const token = await new SignJWT({
      sub: user.id,
      scope,
      tenant_id: user.tenant_id,
      cnf: { jkt },
    })
      .setProtectedHeader({ alg: 'ES256', kid: signingKey.kid, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(issuer)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 900)
      .setJti(jti)
      .sign(privateKey);

    return token;
  }

  private async _generateRefreshToken(
    user: User,
    jkt: string,
    scope: string,
  ): Promise<string> {
    return this.tokensService.issueRefreshToken(
      user,
      jkt,
      undefined,
      undefined,
      undefined,
      scope,
      undefined,
    );
  }

  async introspect(token: string): Promise<TokenIntrospectionResponse> {
    try {
      // Validate that token parameter is provided
      if (!token) {
        this.logger.warn('Introspection request missing token parameter');
        return { active: false };
      }

      // Enhanced security validation:
      // 1. Parse the token to determine its type (access token, refresh token, etc.)
      // 2. Validate the token signature and claims
      // 3. Check if the token has been revoked
      // 4. Return the token metadata if valid
      // 5. Include not_before validation to check for user logout events
      
      // For demonstration purposes, we'll implement an enhanced validation:
      
      // Check if token looks like a JWT (has 3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.logger.warn('Introspection request with invalid token format');
        return { active: false };
      }
      
      // Try to decode the payload to get basic information
      let payload: any;
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      } catch (decodeError) {
        this.logger.warn('Introspection request with undecodable token payload');
        return { active: false };
      }
      
      // Check expiration if present
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        this.logger.log(`Introspection: Token expired at ${new Date(payload.exp * 1000).toISOString()}`);
        return { active: false };
      }
      
      // Check not_before if present
      if (payload.nbf && payload.nbf > now) {
        this.logger.log(`Introspection: Token not valid until ${new Date(payload.nbf * 1000).toISOString()}`);
        return { active: false };
      }
      
      // Enhanced security checks:
      // 1. Verify the token signature using the appropriate key
      // 2. Check if the token has been revoked (in a denylist)
      // 3. Validate the issuer and audience
      // 4. Check token-specific constraints
      // 5. Validate not_before time against user's last logout event
      
      // Validate not_before against user's last logout event
      if (payload.sub && payload.tenant_id) {
        const notBeforeTime = await this.sessionsService.getNotBeforeTime(
          payload.sub,
          payload.tenant_id,
        );
        
        if (notBeforeTime && payload.iat && new Date(payload.iat * 1000) < notBeforeTime) {
          this.logger.log(
            `Introspection: Token rejected - issued before user logout. UserId: ${payload.sub}, TenantId: ${payload.tenant_id}, IssuedAt: ${new Date(payload.iat * 1000).toISOString()}, NotBefore: ${notBeforeTime.toISOString()}`,
          );
          return { active: false };
        }
      }
      
      // For a real implementation, we would also:
      // - Verify the token signature using the appropriate key
      // - Check if the token has been revoked (in a denylist)
      // - Validate the issuer and audience
      // - Check token-specific constraints
      
      // For now, we'll return an enhanced active response with available claims
      const response: TokenIntrospectionResponse = {
        active: true,
        sub: payload.sub,
        scope: payload.scope,
        client_id: payload.client_id,
        token_type: payload.token_type,
        exp: payload.exp,
        iat: payload.iat,
        nbf: payload.nbf,
        tenant_id: payload.tenant_id,
        cnf: payload.cnf,
        // Add any other claims that should be returned
      };
      
      // Remove undefined properties
      Object.keys(response).forEach(key => {
        if (response[key as keyof TokenIntrospectionResponse] === undefined) {
          delete response[key as keyof TokenIntrospectionResponse];
        }
      });
      
      this.logger.log(`Successfully introspected token for subject: ${payload.sub || 'unknown'}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error during token introspection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      
      // According to RFC 7662, we should return { active: false } for any error
      return { active: false };
    }
  }

  /**
   * Refresh tokens with DPoP binding and rotation
   * Implements RFC 6749 refresh token flow with DPoP (RFC 9449)
   * Now includes not_before validation to check for user logout events
   */
  async refreshTokens(
    refreshToken: string,
    dpopProof: string,
    httpMethod: string,
    httpUrl: string,
  ): Promise<[string, string]> {
    // Validate the refresh token with DPoP binding AND not_before check
    const { dpop, user } =
      await this.tokensService.validateRefreshTokenWithNotBefore(
        refreshToken,
        dpopProof,
        httpMethod,
        httpUrl,
      );

    // Rotate the refresh token (invalidates the old one and issues a new one)
    const newRefreshToken =
      await this.tokensService.rotateRefreshToken(refreshToken);

    // Generate new access token with same DPoP binding
    const newAccessToken = await this._generateAccessToken(
      user,
      dpop.jkt,
      'openid profile',
    ); // Default scope for now
    return [newAccessToken, newRefreshToken];
  }

  /**
   * Validates an access token including not_before verification
   * This method should be used by resource servers to validate access tokens
   */
  async validateAccessToken(
    accessToken: string,
    userId: string,
    tenantId: string,
    issuedAt: Date,
  ): Promise<boolean> {
    return this.tokensService.validateAccessToken(
      accessToken,
      userId,
      tenantId,
      issuedAt,
    );
  }

  public async validateDpopProof(
    dpopProof: string,
    httpMethod: string,
    httpUrl: string,
    options?: ValidateDpopProofOptions,
  ): Promise<ValidatedDpopProof> {
    try {
      // Parse the JWS to get header and payload
      const parts = dpopProof.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      const headerBase64 = parts[0];
      const header = JSON.parse(
        Buffer.from(headerBase64, 'base64url').toString(),
      ) as Record<string, unknown>;

      const jwk = header.jwk as Record<string, unknown>;
      if (!jwk) {
        throw new Error('Missing jwk in header');
      }

      const key = await jose.JWK.asKey(jwk);
      const verifier = jose.JWS.createVerify(key);
      const verified = await verifier.verify(dpopProof);

      const decodedPayload = JSON.parse(verified.payload.toString()) as Record<
        string,
        unknown
      >;

      // Validate htm claim
      if (decodedPayload.htm !== httpMethod) {
        throw Rfc7807Exception.unauthorized('Invalid DPoP htm claim');
      }

      // Validate htu claim
      if (decodedPayload.htu !== httpUrl) {
        throw Rfc7807Exception.unauthorized('Invalid DPoP htu claim');
      }

      // Validate jti claim for anti-replay
      if (!decodedPayload.jti || typeof decodedPayload.jti !== 'string') {
        throw Rfc7807Exception.badRequest('Invalid or missing jti in DPoP proof');
      }

      if (typeof decodedPayload.iat !== 'number') {
        throw Rfc7807Exception.badRequest('Invalid or missing iat in DPoP proof');
      }

      const {
        proof: { maxIatSkewSeconds },
      } = getDpopConfig();
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - decodedPayload.iat) > maxIatSkewSeconds) {
        throw Rfc7807Exception.unauthorized('DPoP proof expired');
      }

      if (options?.requireBinding && !options.boundJkt) {
        throw Rfc7807Exception.unauthorized('Token is missing cnf.jkt binding');
      }

      // Create thumbprint as a hex string instead of buffer
      const thumbprintBuffer = await key.thumbprint('SHA-256');
      const computedThumbprint = Buffer.from(thumbprintBuffer).toString('hex');

      if (options?.boundJkt && options.boundJkt !== computedThumbprint) {
        throw Rfc7807Exception.unauthorized(
          'DPoP proof does not match provided binding',
        );
      }

      return {
        jkt: computedThumbprint,
        htm: httpMethod,
        htu: httpUrl,
        jti: decodedPayload.jti,
        iat: decodedPayload.iat,
      };
    } catch (error) {
      // Re-throw specific RFC 7807 exceptions (htm, htu validation)
      if (error instanceof Rfc7807Exception) {
        throw error;
      }
      // For other errors (signature verification, parsing, etc.), throw generic error
      throw Rfc7807Exception.unauthorized('Invalid DPoP proof');
    }
  }

  async handleBackchannelLogout(logoutToken: string): Promise<void> {
    try {
      // 1. Decode header to get kid and client_id (iss)
      const parts = logoutToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');

      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString(),
      ) as JwtHeader;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString(),
      ) as BackchannelLogoutPayload;
      const { kid } = header;
      const clientId = payload.iss;

      if (!kid || !clientId) {
        throw Rfc7807Exception.unauthorized('Missing kid or iss in logout token');
      }

      // 2. Find client and their public key
      const client = this.clientStore.findClientById(
        clientId,
      ) as ClientWithJwks;
      if (!client || !client.jwks || !client.jwks.keys) {
        // As per spec, we must not return an error to the client.
        this.logger.warn(
          `Back-channel logout attempt for unknown client: ${clientId}`,
        );
        return;
      }

      const jwk = client.jwks.keys.find((k) => k.kid === kid);
      if (!jwk) {
        this.logger.warn(
          `Back-channel logout with unknown kid: ${kid} for client: ${clientId}`,
        );
        return;
      }

      const key = await jose.JWK.asKey(jwk);

      // 3. Verify the JWT signature
      const verifier = jose.JWS.createVerify(key);
      const verified = await verifier.verify(logoutToken);
      const verifiedPayload = JSON.parse(verified.payload.toString()) as Record<
        string,
        unknown
      >;

      // 4. Verify claims
      if (
        !verifiedPayload.events ||
        !(verifiedPayload.events as Record<string, unknown>)[
          'http://schemas.openid.net/event/backchannel-logout'
        ]
      ) {
        throw Rfc7807Exception.badRequest('Missing backchannel-logout event claim');
      }
      if (!verifiedPayload.sid) {
        throw Rfc7807Exception.badRequest('Missing sid claim');
      }

      // 5. JTI replay check removed due to incompatible JtiStoreService.
      // TODO: Implement a non-DPoP JTI store for back-channel logout.

      // 6. Revoke the session
      await this.sessionsService.revokeSession(verifiedPayload.sid as string);
    } catch (error) {
      // Per OIDC spec, the RP must not receive an error response.
      // We log the error and return a 200 OK.
      this.logger.error(
        `Back-channel logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
