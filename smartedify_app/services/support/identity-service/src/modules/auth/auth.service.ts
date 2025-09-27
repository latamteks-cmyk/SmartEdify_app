

import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { ParStoreService, ParPayload } from './store/par-store.service';
import { DeviceCodeStoreService, DeviceCodeStatus } from './store/device-code-store.service';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { JtiStoreService } from './store/jti-store.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authorizationCodeStore: AuthorizationCodeStoreService,
    private readonly tokensService: TokensService,
    private readonly usersService: UsersService,
    private readonly parStore: ParStoreService,
    private readonly deviceCodeStore: DeviceCodeStoreService,
    private readonly jtiStore: JtiStoreService,
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
      request_uri?: string;
      code_challenge?: string; 
      code_challenge_method?: string; 
      userId: string; 
    }
  ): Promise<string> {
    let payload: { code_challenge: string; code_challenge_method: string; };

    if (params.request_uri) {
      const storedPayload = this.parStore.get(params.request_uri);
      if (!storedPayload) {
        throw new BadRequestException('Invalid or expired request_uri');
      }
      payload = storedPayload;
    } else if (params.code_challenge && params.code_challenge_method) {
      payload = { 
        code_challenge: params.code_challenge, 
        code_challenge_method: params.code_challenge_method 
      };
    } else {
      throw new BadRequestException('Either request_uri or PKCE parameters are required');
    }

    const code = crypto.randomBytes(32).toString('hex');
    this.authorizationCodeStore.set(code, {
      ...payload,
      userId: params.userId,
    });
    return code;
  }

  async exchangeCodeForTokens(
    code: string,
    code_verifier: string,
    dpopProof: string,
    httpMethod: string,
    httpUrl: string,
  ): Promise<[string, string]> {
    const storedCode = this.authorizationCodeStore.get(code);
    if (!storedCode) {
      throw new BadRequestException('Invalid authorization code');
    }

    // 1. Validate PKCE
    const { code_challenge, code_challenge_method, userId } = storedCode;
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

    // 2. Validate DPoP
    if (!dpopProof) {
      throw new UnauthorizedException('DPoP proof is required');
    }
    const jkt = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);

    // 3. Get User
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 4. Generate Tokens
    const accessToken = await this._generateAccessToken(user, jkt);
    const refreshToken = await this._generateRefreshToken(user, jkt);

    return [accessToken, refreshToken];
  }

  async exchangeDeviceCodeForTokens(deviceCode: string): Promise<[string, string]> {
    throw new BadRequestException('Device code grant type not yet implemented');
  }

  async revokeToken(token: string, token_type_hint: string): Promise<void> {
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

  private async _generateAccessToken(user: User, jkt: string): Promise<string> {
    // In a real implementation, we would generate and sign a JWT
    // and include the jkt in the claims.
    const accessToken = 'mock_access_token';
    return accessToken;
  }

  private async _generateRefreshToken(user: User, jkt: string): Promise<string> {
    return this.tokensService.issueRefreshToken(user, jkt);
  }

  async introspect(token: string): Promise<any> {
    // Placeholder for token introspection logic
    console.log(`Introspecting token: ${token}`);
    // In a real implementation, we would validate the token and return its claims
    return { active: true, sub: 'mock_user_id' };
  }

  private async validateDpopProof(dpopProof: string, httpMethod: string, httpUrl: string): Promise<string> {
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
}