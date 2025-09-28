import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { SessionsService } from '../sessions/sessions.service';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { AuthService } from '../auth/auth.service'; // Import AuthService
import { KeyManagementService } from '../keys/services/key-management.service';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    @Inject(forwardRef(() => AuthService)) // Use forwardRef to handle circular dependency
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
    private readonly keyManagementService: KeyManagementService,
  ) {}

  async issueRefreshToken(user: User, jkt: string, familyId?: string, clientId?: string, deviceId?: string, scope?: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const signingKey = await this.keyManagementService.getActiveSigningKey(user.tenant_id);
    const key = await jose.JWK.asKey(signingKey.private_key_pem, 'pem');
    const jti = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    const payload = JSON.stringify({
      iss: `https://auth.smartedify.global/t/${user.tenant_id}`,
      sub: user.id,
      aud: 'https://api.smartedify.global', // Audience should be configurable
      exp: now + 30 * 24 * 60 * 60, // 30 days
      iat: now,
      nbf: now,
      jti: jti,
      sid: sessionId,
      family: familyId || crypto.randomUUID(),
      scope: scope || 'openid profile',
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

    const token = await jose.JWS.createSign(options, key).update(payload).final();

    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    const newRefreshToken = this.refreshTokensRepository.create({
      user,
      token_hash,
      jkt,
      family_id: familyId || crypto.randomUUID(),
      client_id: clientId || 'test-client-id',
      device_id: deviceId || 'test-device-id', 
      session_id: sessionId,
      scope: scope || 'openid profile',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await this.refreshTokensRepository.save(newRefreshToken);

    return token as string;
  }

  async rotateRefreshToken(oldToken: string): Promise<string> {
    const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const oldRefreshToken = await this.refreshTokensRepository.findOne({ where: { token_hash: oldTokenHash }, relations: ['user'] });

    if (!oldRefreshToken || oldRefreshToken.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // DETECTION OF REUSE: If token was already used, it's a potential attack
    if (oldRefreshToken.used_at) {
      console.warn(`Refresh token reuse detected for family: ${oldRefreshToken.family_id}`);
      // Revoke entire token family when reuse is detected
      await this.revokeTokenFamily(oldRefreshToken.family_id, 'reuse_detected');
      throw new UnauthorizedException('Refresh token reuse detected - token family revoked');
    }

    // Check if token has expired
    if (oldRefreshToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Mark old token as used
    oldRefreshToken.used_at = new Date();
    await this.refreshTokensRepository.save(oldRefreshToken);

    // Issue new token with same family_id
    const newToken = await this.issueRefreshToken(
      oldRefreshToken.user, 
      oldRefreshToken.jkt, 
      oldRefreshToken.family_id,  // Keep same family
      oldRefreshToken.client_id,
      oldRefreshToken.device_id,
      oldRefreshToken.scope
    );
    
    // Link old token to new token
    const newRefreshTokenEntity = await this.refreshTokensRepository.findOne({
      where: {token_hash: crypto.createHash('sha256').update(newToken).digest('hex')}
    });
    if (newRefreshTokenEntity) {
      oldRefreshToken.replaced_by_id = newRefreshTokenEntity.id;
      newRefreshTokenEntity.parent_id = oldRefreshToken.id;
      await this.refreshTokensRepository.save([oldRefreshToken, newRefreshTokenEntity]);
    }

    return newToken;
  }

  async validateRefreshToken(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<User> {
    try {
      // 1. Decode the JWT to get the kid from the header
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid refresh token format');
      }
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const { kid } = header;

      if (!kid) {
        throw new UnauthorizedException('Refresh token missing kid');
      }

      // 2. Get the public key
      const signingKey = await this.keyManagementService.findKeyById(kid);
      if (!signingKey) {
        throw new UnauthorizedException('Invalid signing key');
      }
      const publicKey = await jose.JWK.asKey(signingKey.public_key_jwk);

      // 3. Verify the JWS
      const verifier = jose.JWS.createVerify(publicKey);
      const verified = await verifier.verify(token);
      const payload = JSON.parse(verified.payload.toString());

      // 4. Validate claims
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // 5. Validate DPoP proof and binding
      const incomingJkt = await this.authService.validateDpopProof(dpopProof, httpMethod, httpUrl);
      if (payload.cnf?.jkt !== incomingJkt) {
        throw new UnauthorizedException('DPoP proof does not match refresh token binding');
      }

      // 6. Check for reuse via jti
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const storedToken = await this.refreshTokensRepository.findOne({ where: { token_hash: tokenHash }, relations: ['user'] });

      if (!storedToken || storedToken.revoked || storedToken.used_at) {
        throw new UnauthorizedException('Invalid or used refresh token');
      }

      return storedToken.user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Revokes all tokens in a token family when reuse is detected
   * This is a security measure to invalidate potentially compromised token chains
   */
  async revokeTokenFamily(familyId: string, reason: string): Promise<void> {
    await this.refreshTokensRepository.update(
      { family_id: familyId },
      { 
        revoked: true, 
        revoked_reason: reason,
      }
    );
    console.log(`Revoked token family: ${familyId} due to: ${reason}`);
  }

  /**
   * Revokes a specific refresh token
   */
  async revokeRefreshToken(tokenHash: string, reason: string): Promise<void> {
    await this.refreshTokensRepository.update(
      { token_hash: tokenHash },
      { 
        revoked: true, 
        revoked_reason: reason,
      }
    );
  }

  /**
   * Validates an access token and checks the not_before time
   * This method should be called to validate access tokens before allowing access to resources
   */
  async validateAccessToken(accessToken: string, userId: string, tenantId: string, issuedAt: Date): Promise<boolean> {
    try {
      // In a real implementation, you would decode and validate the JWT token here
      // For this implementation, we focus on the not_before validation
      
      // Get the not_before time from sessions (last logout event)
      const notBeforeTime = await this.sessionsService.getNotBeforeTime(userId, tenantId);
      
      if (notBeforeTime && issuedAt < notBeforeTime) {
        console.warn(`Access token rejected: issued before last logout. UserId: ${userId}, TenantId: ${tenantId}, IssuedAt: ${issuedAt}, NotBefore: ${notBeforeTime}`);
        return false;
      }
      
      // Additional token validations would go here (signature, expiration, etc.)
      // For now, we return true if not_before validation passes
      return true;
    } catch (error) {
      console.error(`Error validating access token for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validates a refresh token including not_before check
   * Enhanced version that also verifies the user hasn't been logged out globally
   */
  async validateRefreshTokenWithNotBefore(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<User> {
    // First, do the standard refresh token validation
    const user = await this.validateRefreshToken(token, dpopProof, httpMethod, httpUrl);
    
    // Get the refresh token to check its creation time
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshToken = await this.refreshTokensRepository.findOne({ 
      where: { token_hash: tokenHash }, 
      relations: ['user'] 
    });

    if (refreshToken) {
      // Check if the refresh token was created before the user's last logout
      const notBeforeTime = await this.sessionsService.getNotBeforeTime(user.id, user.tenant_id);
      
      if (notBeforeTime && refreshToken.created_at < notBeforeTime) {
        console.warn(`Refresh token rejected: created before last logout. UserId: ${user.id}, TenantId: ${user.tenant_id}, TokenCreatedAt: ${refreshToken.created_at}, NotBefore: ${notBeforeTime}`);
        throw new UnauthorizedException('Refresh token invalidated due to user logout');
      }
    }

    return user;
  }
}