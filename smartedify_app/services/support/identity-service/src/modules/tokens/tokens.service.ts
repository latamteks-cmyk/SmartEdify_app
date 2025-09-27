import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
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

    if (!oldRefreshToken || oldRefreshToken.revoked || oldRefreshToken.used_at) {
      // Here we should implement the reuse detection logic
      // For now, we just throw an error
      throw new UnauthorizedException('Invalid refresh token');
    }

    oldRefreshToken.used_at = new Date();
    await this.refreshTokensRepository.save(oldRefreshToken);

    const newToken = await this.issueRefreshToken(oldRefreshToken.user, oldRefreshToken.jkt, oldRefreshToken.family_id);
    
    const newRefreshTokenEntity = await this.refreshTokensRepository.findOne({where: {token_hash: crypto.createHash('sha256').update(newToken).digest('hex')}});
    if (!newRefreshTokenEntity) {
      throw new UnauthorizedException('Newly issued refresh token not found');
    }
    oldRefreshToken.replaced_by_id = newRefreshTokenEntity.id;
    await this.refreshTokensRepository.save(oldRefreshToken);

    return newToken;
  }

  async validateRefreshToken(token: string): Promise<User> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshToken = await this.refreshTokensRepository.findOne({ where: { token_hash: tokenHash }, relations: ['user'] });

    if (!refreshToken || refreshToken.revoked || refreshToken.used_at) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return refreshToken.user;
  }
}