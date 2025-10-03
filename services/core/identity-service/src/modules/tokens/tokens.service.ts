import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { SessionsService } from '../sessions/sessions.service';
import * as crypto from 'crypto';
import { AuthService, ValidatedDpopProof } from '../auth/auth.service'; // Import AuthService
import { KeyManagementService } from '../keys/services/key-management.service';
import { JtiStoreService } from '../auth/store/jti-store.service';
import { importPKCS8, SignJWT } from 'jose';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    @Inject(forwardRef(() => AuthService)) // Use forwardRef to handle circular dependency
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
    private readonly keyManagementService: KeyManagementService,
    @Inject(forwardRef(() => JtiStoreService))
    private readonly jtiStore: JtiStoreService,
  ) {}

  async issueRefreshToken(
    user: User,
    jkt: string,
    familyId?: string,
    clientId?: string,
    deviceId?: string,
    scope?: string,
    sessionId?: string,
  ): Promise<string> {
    const signingKey = await this.keyManagementService.getActiveSigningKey(
      user.tenant_id,
    );
    const privateKey = await importPKCS8(signingKey.private_key_pem, 'ES256');

    const resolvedFamilyId = familyId || crypto.randomUUID();
    const resolvedSessionId = sessionId || crypto.randomUUID();
    const resolvedClientId = clientId || 'test-client-id';
    const resolvedDeviceId = deviceId || 'test-device-id';
    const resolvedScope = scope || 'openid profile';

    const issuer = `https://auth.smartedify.global/t/${user.tenant_id}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = 30 * 24 * 60 * 60; // 30 days
    const jti = crypto.randomUUID();

    const token = await new SignJWT({
      sub: user.id,
      tenant_id: user.tenant_id,
      scope: resolvedScope,
      cnf: { jkt },
      family_id: resolvedFamilyId,
      session_id: resolvedSessionId,
      client_id: resolvedClientId,
      device_id: resolvedDeviceId,
    })
      .setProtectedHeader({ alg: 'ES256', kid: signingKey.kid, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(issuer)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + expiresInSeconds)
      .setJti(jti)
      .sign(privateKey);

    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    const newRefreshToken = this.refreshTokensRepository.create({
      user,
      token_hash,
      jkt,
      kid: signingKey.kid,
      jti,
      family_id: resolvedFamilyId,
      client_id: resolvedClientId,
      device_id: resolvedDeviceId,
      session_id: resolvedSessionId,
      scope: resolvedScope,
      expires_at: new Date((now + expiresInSeconds) * 1000),
    });

    await this.refreshTokensRepository.save(newRefreshToken);

    return token;
  }

  async rotateRefreshToken(oldToken: string): Promise<string> {
    const oldTokenHash = crypto
      .createHash('sha256')
      .update(oldToken)
      .digest('hex');
    const oldRefreshToken = await this.refreshTokensRepository.findOne({
      where: { token_hash: oldTokenHash },
      relations: ['user'],
    });

    if (!oldRefreshToken || oldRefreshToken.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // DETECTION OF REUSE: If token was already used, it's a potential attack
    if (oldRefreshToken.used_at) {
      this.logger.warn(
        `Refresh token reuse detected for family: ${oldRefreshToken.family_id}`,
      );
      // Revoke entire token family when reuse is detected
      await this.revokeTokenFamily(oldRefreshToken.family_id, 'reuse_detected');
      throw new UnauthorizedException(
        'Refresh token reuse detected - token family revoked',
      );
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
      oldRefreshToken.family_id, // Keep same family
      oldRefreshToken.client_id,
      oldRefreshToken.device_id,
      oldRefreshToken.scope,
      oldRefreshToken.session_id,
    );

    // Link old token to new token
    const newRefreshTokenEntity = await this.refreshTokensRepository.findOne({
      where: {
        token_hash: crypto.createHash('sha256').update(newToken).digest('hex'),
      },
    });
    if (newRefreshTokenEntity) {
      oldRefreshToken.replaced_by_id = newRefreshTokenEntity.id;
      newRefreshTokenEntity.parent_id = oldRefreshToken.id;
      await this.refreshTokensRepository.save([
        oldRefreshToken,
        newRefreshTokenEntity,
      ]);
    }

    return newToken;
  }

  async validateRefreshToken(
    token: string,
    dpopProof: string,
    httpMethod: string,
    httpUrl: string,
  ): Promise<{ user: User; dpop: ValidatedDpopProof }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshToken = await this.refreshTokensRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['user'],
    });

    if (!refreshToken || refreshToken.revoked || refreshToken.used_at) {
      throw new UnauthorizedException('Invalid or used refresh token');
    }

    if (!refreshToken.jkt) {
      throw new UnauthorizedException(
        'Refresh token is missing cnf.jkt binding',
      );
    }

    // Validate DPoP binding
    if (!dpopProof) {
      throw new UnauthorizedException(
        'DPoP proof is required for refresh token validation',
      );
    }
    const dpop = await this.authService.validateDpopProof(
      dpopProof,
      httpMethod,
      httpUrl,
      {
        boundJkt: refreshToken.jkt,
        requireBinding: true,
      },
    );

    if (dpop.jkt !== refreshToken.jkt) {
      throw new UnauthorizedException(
        'DPoP proof does not match refresh token binding',
      );
    }

    await this.jtiStore.register({
      tenantId: refreshToken.user.tenant_id,
      jkt: refreshToken.jkt,
      jti: dpop.jti,
      iat: dpop.iat,
    });

    return { user: refreshToken.user, dpop };
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
      },
    );
    this.logger.log(`Revoked token family: ${familyId} due to: ${reason}`);
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
      },
    );
  }

  /**
   * Validates an access token and checks the not_before time
   * This method should be called to validate access tokens before allowing access to resources
   */
  async validateAccessToken(
    accessToken: string,
    userId: string,
    tenantId: string,
    issuedAt: Date,
  ): Promise<boolean> {
    try {
      // In a real implementation, you would decode and validate the JWT token here
      // For this implementation, we focus on the not_before validation

      // Get the not_before time from sessions (last logout event)
      const notBeforeTime = await this.sessionsService.getNotBeforeTime(
        userId,
        tenantId,
      );

      if (notBeforeTime && issuedAt < notBeforeTime) {
        this.logger.warn(
          `Access token rejected: issued before last logout. UserId: ${userId}, TenantId: ${tenantId}, IssuedAt: ${issuedAt.toISOString()}, NotBefore: ${notBeforeTime.toISOString()}`,
        );
        return false;
      }

      // Additional token validations would go here (signature, expiration, etc.)
      // For now, we return true if not_before validation passes
      return true;
    } catch (error) {
      this.logger.error(`Error validating access token for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validates a refresh token including not_before check
   * Enhanced version that also verifies the user hasn't been logged out globally
   */
  async validateRefreshTokenWithNotBefore(
    token: string,
    dpopProof: string,
    httpMethod: string,
    httpUrl: string,
  ): Promise<{ user: User; dpop: ValidatedDpopProof }> {
    // First, do the standard refresh token validation
    const { user, dpop } = await this.validateRefreshToken(
      token,
      dpopProof,
      httpMethod,
      httpUrl,
    );

    // Get the refresh token to check its creation time
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshToken = await this.refreshTokensRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['user'],
    });

    if (refreshToken) {
      // Check if the refresh token was created before the user's last logout
      const notBeforeTime = await this.sessionsService.getNotBeforeTime(
        user.id,
        user.tenant_id,
      );

      if (notBeforeTime && refreshToken.created_at < notBeforeTime) {
        this.logger.warn(
          `Refresh token rejected: created before last logout. UserId: ${user.id}, TenantId: ${user.tenant_id}, TokenCreatedAt: ${refreshToken.created_at.toISOString()}, NotBefore: ${notBeforeTime.toISOString()}`,
        );
        throw new UnauthorizedException(
          'Refresh token invalidated due to user logout',
        );
      }
    }

    return { user, dpop };
  }
}
