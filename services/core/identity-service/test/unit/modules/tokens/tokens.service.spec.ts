import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokensService } from '../../../../src/modules/tokens/tokens.service';
import { RefreshToken } from '../../../../src/modules/tokens/entities/refresh-token.entity';
import { Repository } from 'typeorm';
import { UsersService } from '../../../../src/modules/users/users.service';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { KeyManagementService } from '../../../../src/modules/keys/services/key-management.service';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { JtiStoreService } from '../../../../src/modules/auth/store/jti-store.service';
import { User } from '../../../../src/modules/users/entities/user.entity';

describe('TokensService', () => {
  let service: TokensService;
  let refreshTokenRepository: Repository<RefreshToken>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: getRepositoryToken(RefreshToken),
          useClass: Repository,
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            getNotBeforeTime: jest.fn(),
          },
        },
        {
          provide: KeyManagementService,
          useValue: {
            getActiveSigningKey: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateDpopProof: jest.fn(),
          },
        },
        {
          provide: JtiStoreService,
          useValue: {
            register: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate refresh token with DPoP proof', async () => {
    const mockRefreshToken = {
      id: 'refresh-token-id',
      token_hash: 'hash123',
      jkt: 'test-jkt',
      user: {
        id: 'user-id',
        tenant_id: 'tenant-id',
      } as User,
    };

    jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(mockRefreshToken as any);

    // Mock the AuthService dependency
    const authService = service['authService'];
    jest.spyOn(authService, 'validateDpopProof').mockResolvedValue({
      jkt: 'test-jkt',
      htm: 'POST',
      htu: 'http://example.com',
      iat: Math.floor(Date.now() / 1000),
      jti: 'test-jti',
    });

    const result = await service.validateRefreshToken(
      'token123',
      'dpop-proof',
      'POST',
      'http://example.com'
    );

    expect(result.user).toEqual(mockRefreshToken.user);
    expect(authService.validateDpopProof).toHaveBeenCalledWith(
      'dpop-proof',
      'POST',
      'http://example.com',
      { boundJkt: 'test-jkt', requireBinding: true }
    );
  });

  it('should revoke token family', async () => {
    jest.spyOn(refreshTokenRepository, 'update').mockResolvedValue({} as any);

    await service.revokeTokenFamily('family-id', 'reuse_detected');

    expect(refreshTokenRepository.update).toHaveBeenCalledWith(
      { family_id: 'family-id' },
      { revoked: true, revoked_reason: 'reuse_detected' }
    );
  });

  it('should validate access token with not_before check', async () => {
    const mockUser = { id: 'user-id', tenant_id: 'tenant-id' } as User;
    const issuedAt = new Date(Date.now() - 30000); // 30 seconds ago
    const notBeforeTime = new Date(Date.now() - 60000); // 60 seconds ago

    // Mock sessions service to return the not_before time
    const sessionsService = service['sessionsService'];
    jest.spyOn(sessionsService, 'getNotBeforeTime').mockResolvedValue(notBeforeTime);

    const result = await service.validateAccessToken(
      'access-token',
      mockUser.id,
      mockUser.tenant_id,
      issuedAt
    );

    // The issuedAt (30s ago) is after notBefore (60s ago), so validation should pass
    expect(result).toBe(true);
  });
});