import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import { AuthService } from '../auth/auth.service'; // Import AuthService

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    @Inject(forwardRef(() => AuthService)) // Use forwardRef to handle circular dependency
    private readonly authService: AuthService,
  ) {}

  async issueRefreshToken(user: User, jkt: string, familyId?: string, clientId?: string, deviceId?: string, scope?: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    const newRefreshToken = this.refreshTokensRepository.create({
      user,
      token_hash,
      jkt,
      family_id: familyId || crypto.randomUUID(),
      client_id: clientId || 'test-client-id',
      device_id: deviceId || 'test-device-id', 
      session_id: crypto.randomUUID(),
      scope: scope || 'openid profile',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await this.refreshTokensRepository.save(newRefreshToken);

    return token;
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

  async validateRefreshToken(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<User> { // Modified signature
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshToken = await this.refreshTokensRepository.findOne({ where: { token_hash: tokenHash }, relations: ['user'] });

    if (!refreshToken || refreshToken.revoked || refreshToken.used_at) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Validate DPoP binding
    if (!dpopProof) {
      throw new UnauthorizedException('DPoP proof is required for refresh token validation');
    }
    const incomingJkt = await this.authService.validateDpopProof(dpopProof, httpMethod, httpUrl);

    if (incomingJkt !== refreshToken.jkt) {
      throw new UnauthorizedException('DPoP proof does not match refresh token binding');
    }

    return refreshToken.user;
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
}