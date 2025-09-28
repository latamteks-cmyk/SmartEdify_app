import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/entities/user.entity';
import { ParStoreService, ParPayload } from './store/par-store.service';
import { DeviceCodeStoreService, DeviceCodeStatus } from './store/device-code-store.service';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { JtiStoreService } from './store/jti-store.service';
import { KeyManagementService } from '../keys/services/key-management.service';
import { ClientStoreService } from '../clients/client-store.service';

@Injectable()
export class AuthService {
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

  async pushedAuthorizationRequest(
    payload: ParPayload,
  ): Promise<{ request_uri: string; expires_in: number; }> {
    const requestUri = `urn:ietf:params:oauth:request_uri:${crypto.randomBytes(32).toString('hex')}`;
    this.parStore.set(requestUri, payload);
    return { request_uri: requestUri, expires_in: 60 };
  }

  async getStoredPARRequest(requestUri: string): Promise<ParPayload | null> {
    return this.parStore.get(requestUri) || null;
  }

  async deviceAuthorizationRequest(): Promise<{ 
    device_code: string; 
    user_code: string; 
    verification_uri: string; 
    expires_in: number; 
    interval: number; 
  }> {
    const device_code = crypto.randomBytes(32).toString('hex');
    const user_code = crypto.randomBytes(4).toString('hex').toUpperCase(); // User-friendly code
    const expiresIn = 1800; // 30 minutes

    this.deviceCodeStore.set(device_code, { 
      user_code,
      status: DeviceCodeStatus.PENDING,
    }, expiresIn);

    return {
      device_code,
      user_code,
      verification_uri: 'https://example.com/device', // Should be a real URL
      expires_in: expiresIn,
      interval: 5, // Polling interval
    };
  }

  async generateAuthorizationCode(
    params: { 
      code_challenge: string; 
      code_challenge_method: string; 
      userId: string; 
      scope: string;
    }
  ): Promise<string> {
    console.log('🔐 Generating auth code with params:', params);

    const payload = { 
      code_challenge: params.code_challenge, 
      code_challenge_method: params.code_challenge_method,
      scope: params.scope,
    };
    console.log('🔧 Using direct payload:', payload);

    const code = crypto.randomBytes(32).toString('hex');
    const codeData = {
      ...payload,
      userId: params.userId,
    };
    
    console.log('💾 Storing code:', { 
      code: code.substring(0, 10) + '...', 
      data: codeData 
    });
    
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
      throw new UnauthorizedException('DPoP proof is required');
    }
    
    console.log('🔍 Validating DPoP proof first...');
    const jkt = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);
    console.log('✅ DPoP validation passed');

    // 2. Validate required parameters (after DPoP passes)
    if (!code || !code_verifier) {
      throw new BadRequestException('Code and code_verifier are required');
    }

    // 3. Validate authorization code
    console.log('🔍 Looking up authorization code:', { code: code?.substring(0, 10) + '...' });
    const storedCode = this.authorizationCodeStore.get(code);
    console.log('📋 Retrieved code data:', storedCode ? 'found' : 'NOT FOUND', storedCode);
    
    if (!storedCode) {
      throw new BadRequestException('Invalid authorization code');
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
      throw new UnauthorizedException('Invalid code verifier');
    }

    // 5. Get User
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 6. Generate Tokens
    const accessToken = await this._generateAccessToken(user, jkt, scope);
    const refreshToken = await this._generateRefreshToken(user, jkt, scope);

    return [accessToken, refreshToken];
  }

  async exchangeDeviceCodeForTokens(deviceCode: string): Promise<[string, string]> {
    throw new BadRequestException('Device code grant type not yet implemented');
  }

  async revokeToken(token: string, token_type_hint?: string): Promise<void> {
    // For now, we only support refresh token revocation
    if (token_type_hint === 'refresh_token') {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const foundToken = await this.refreshTokenRepository.findOne({ where: { token_hash: hashedToken } });
      if (foundToken) {
        await this.refreshTokenRepository.delete(foundToken.id);
      }
      // RFC 7009 says the server should return 200 OK regardless of whether the token was valid
      return;
    }

    // In a real implementation, we would handle access token revocation via a denylist
  }

  private async _generateAccessToken(user: User, jkt: string, scope: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const signingKey = await this.keyManagementService.getActiveSigningKey(user.tenant_id);
    const key = await jose.JWK.asKey(signingKey.private_key_pem, 'pem');

    const payload = JSON.stringify({
      iss: `https://auth.smartedify.global/t/${user.tenant_id}`,
      sub: user.id,
      aud: 'https://api.smartedify.global', // Audience should be configurable
      exp: now + 10 * 60, // 10 minutes
      iat: now,
      nbf: now,
      jti: crypto.randomUUID(),
      scope: scope,
      cnf: {
        jkt: jkt,
      },
    });

    const options = {
      format: 'compact' as const,
      fields: {
        alg: 'ES256',
        kid: signingKey.kid,
      },
    };

    return jose.JWS.createSign(options, key).update(payload).final();
  }

  private async _generateRefreshToken(user: User, jkt: string, scope: string): Promise<string> {
    return this.tokensService.issueRefreshToken(user, jkt, undefined, undefined, undefined, scope);
  }

  async introspect(token: string): Promise<any> {
    // Placeholder for token introspection logic
    console.log(`Introspecting token: ${token}`);
    // In a real implementation, we would validate the token and return its claims
    return { active: true, sub: 'mock_user_id' };
  }

  /**
   * Refresh tokens with DPoP binding and rotation
   * Implements RFC 6749 refresh token flow with DPoP (RFC 9449)
   * Now includes not_before validation to check for user logout events
   */
  async refreshTokens(refreshToken: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<[string, string]> {
    // Validate the refresh token with DPoP binding AND not_before check
    const user = await this.tokensService.validateRefreshTokenWithNotBefore(refreshToken, dpopProof, httpMethod, httpUrl);
    
    // Rotate the refresh token (invalidates the old one and issues a new one)
    const newRefreshToken = await this.tokensService.rotateRefreshToken(refreshToken);
    
    // Generate new access token with same DPoP binding
    const jkt = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);
    const newAccessToken = await this._generateAccessToken(user, jkt, 'openid profile'); // Default scope for now
    
    return [newAccessToken, newRefreshToken];
  }

  /**
   * Validates an access token including not_before verification
   * This method should be used by resource servers to validate access tokens
   */
  async validateAccessToken(accessToken: string, userId: string, tenantId: string, issuedAt: Date): Promise<boolean> {
    return this.tokensService.validateAccessToken(accessToken, userId, tenantId, issuedAt);
  }

  public async validateDpopProof(dpopProof: string, httpMethod: string, httpUrl: string): Promise<string> {
    try {
      // Parse the JWS to get header and payload
      const parts = dpopProof.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }
      
      const headerBase64 = parts[0];
      const header = JSON.parse(Buffer.from(headerBase64, 'base64url').toString());
      
      const jwk = header.jwk;
      if (!jwk) {
        throw new Error('Missing jwk in header');
      }
      
      const key = await jose.JWK.asKey(jwk);
      const verifier = jose.JWS.createVerify(key);
      const verified = await verifier.verify(dpopProof);

      const decodedPayload = JSON.parse(verified.payload.toString());

      // Validate htm claim
      if (decodedPayload.htm !== httpMethod) {
        throw new UnauthorizedException('Invalid DPoP htm claim');
      }

      // Validate htu claim
      if (decodedPayload.htu !== httpUrl) {
        throw new UnauthorizedException('Invalid DPoP htu claim');
      }

      // Validate jti claim for anti-replay
      if (!decodedPayload.jti || typeof decodedPayload.jti !== 'string') {
        throw new UnauthorizedException('Invalid or missing jti in DPoP proof');
      }

      if (this.jtiStore.has(decodedPayload.jti)) {
        throw new UnauthorizedException('DPoP proof replay detected');
      }

      this.jtiStore.set(decodedPayload.jti);

      // Create thumbprint as a hex string instead of buffer
      const thumbprintBuffer = await key.thumbprint('SHA-256');
      return Buffer.from(thumbprintBuffer).toString('hex');

    } catch (error) {
      // Re-throw specific UnauthorizedException errors (htm, htu validation)
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // For other errors (signature verification, parsing, etc.), throw generic error
      throw new UnauthorizedException('Invalid DPoP proof');
    }
  }

  async handleBackchannelLogout(logoutToken: string): Promise<void> {
    // TODO: Implement the full back-channel logout logic.
    // 1. Decode logout_token to get kid and iss
    // 2. Find client public key from clientStore
    // 3. Verify token signature and claims (iss, sub, aud, iat, jti, events, sid)
    // 4. Check for jti reuse
    // 5. Find session by sid and iss
    // 6. Revoke the session using sessionsService.revokeSession(sid)
    console.log(`Handling back-channel logout for token: ${logoutToken}`);
  }}