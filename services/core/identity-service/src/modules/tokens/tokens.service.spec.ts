import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TokensService } from './tokens.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { SessionsService } from '../sessions/sessions.service';
import { KeyManagementService } from '../keys/services/key-management.service';
import {
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
  KeyLike,
} from 'jose';
import { JtiStoreService } from '../auth/store/jti-store.service';

interface MockSigningKey {
  kid: string;
  tenant_id: string;
  private_key_pem: string;
  algorithm: 'ES256';
  public_key_jwk: { kid: string; use: string; alg: string; kty: string; crv?: string; x?: string; y?: string };
}

describe('TokensService', () => {
  let service: TokensService;
  let mockRefreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockSessionsService: jest.Mocked<Partial<SessionsService>>;
  let mockKeyManagementService: jest.Mocked<KeyManagementService>;
  let mockJtiStore: jest.Mocked<JtiStoreService>;
  let publicKey: KeyLike;
  let signingKey: MockSigningKey;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed',
    tenant_id: 'tenant-1',
    phone: '+1234567890',
    status: 'active',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'email',
    created_at: new Date(),
    updated_at: new Date(),
    webauthn_credentials: [],
    refresh_tokens: [],
  };

  const mockRefreshToken: RefreshToken = {
    id: 'token-123',
    token_hash: 'abc123hash',
    user: mockUser,
    jkt: 'jkt-thumbprint-123',
    kid: 'test-key',
    jti: 'jti-123',
    family_id: 'family-123',
    parent_id: null,
    replaced_by_id: null,
    used_at: null,
    client_id: 'client-1',
    device_id: 'device-1',
    session_id: 'session-1',
    scope: 'openid profile',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    created_ip: '127.0.0.1',
    created_ua: 'test-agent',
    revoked: false,
    revoked_reason: null,
    created_at: new Date(),
  };

  beforeAll(async () => {
    const { privateKey, publicKey: generatedPublicKey } =
      await generateKeyPair('ES256');
    publicKey = generatedPublicKey;
    const privateKeyPem = await exportPKCS8(privateKey);
    const publicJwk = await exportJWK(generatedPublicKey);
    signingKey = {
      kid: 'test-key',
      tenant_id: mockUser.tenant_id,
      private_key_pem: privateKeyPem,
      algorithm: 'ES256',
      public_key_jwk: {
        ...publicJwk,
        kid: 'test-key',
        use: 'sig',
        alg: 'ES256',
      },
    };
  });

  beforeEach(async () => {
    mockRefreshTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<RefreshToken>>;

    mockAuthService = {
      validateDpopProof: jest.fn().mockResolvedValue({
        jkt: 'jkt-thumbprint-123',
        jti: 'proof-jti-1',
        iat: Math.floor(Date.now() / 1000),
      }),
    };

    mockSessionsService = {
      getNotBeforeTime: jest.fn().mockResolvedValue(null),
    };

    mockKeyManagementService = {
      getActiveSigningKey: jest.fn().mockResolvedValue(signingKey),
    } as unknown as jest.Mocked<KeyManagementService>;

    mockJtiStore = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JtiStoreService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: KeyManagementService, useValue: mockKeyManagementService },
        { provide: JtiStoreService, useValue: mockJtiStore },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issueRefreshToken', () => {
    it('should issue an ES256 JWT with binding and persist kid/jti', async () => {
      const persisted: RefreshToken[] = [];
      mockRefreshTokenRepository.save.mockImplementation(async (entity) => {
        persisted.push(entity as RefreshToken);
        return entity as RefreshToken;
      });
      mockRefreshTokenRepository.create.mockImplementation(
        (entity) => entity as RefreshToken,
      );

      const token = await service.issueRefreshToken(
        mockUser,
        'jkt-thumbprint-123',
        'family-xyz',
        'client-1',
        'device-1',
        'openid profile',
      );

      expect(token).toEqual(expect.any(String));
      expect(mockKeyManagementService.getActiveSigningKey).toHaveBeenCalledWith(
        mockUser.tenant_id,
      );
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ kid: 'test-key', jti: expect.any(String) }),
      );

      const verification = await jwtVerify(token, publicKey, {
        issuer: `https://auth.smartedify.global/t/${mockUser.tenant_id}`,
        audience: `https://auth.smartedify.global/t/${mockUser.tenant_id}`,
      });

      expect(verification.protectedHeader.alg).toBe('ES256');
      expect(verification.protectedHeader.kid).toBe('test-key');
      expect(verification.payload.cnf).toEqual({ jkt: 'jkt-thumbprint-123' });
      expect(verification.payload.family_id).toBe('family-xyz');
      expect(verification.payload.session_id).toBeDefined();
      expect(verification.payload.jti).toBeDefined();

      const savedToken = persisted[0];
      expect(savedToken.kid).toBe('test-key');
      expect(savedToken.jti).toBe(verification.payload.jti);
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate refresh token successfully', async () => {
      const oldToken = 'old-refresh-token';
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.create.mockImplementation(
        (entity) => entity as RefreshToken,
      );

      // Mock the issueRefreshToken method directly on the service instance
      const issueRefreshTokenSpy = jest
        .spyOn(service, 'issueRefreshToken')
        .mockResolvedValue('new-refresh-token');

      const result = await service.rotateRefreshToken(oldToken);

      expect(result).toBe('new-refresh-token');
      expect(issueRefreshTokenSpy).toHaveBeenCalledWith(
        mockUser,
        'jkt-thumbprint-123',
        'family-123',
        'client-1',
        'device-1',
        'openid profile',
        'session-1',
      );

      issueRefreshTokenSpy.mockRestore();
    });

    it('should detect reuse and revoke token family', async () => {
      const oldToken = 'reused-refresh-token';
      const usedMockToken: RefreshToken = {
        ...mockRefreshToken,
        used_at: new Date(),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(usedMockToken);

      const revokeTokenFamilySpy = jest
        .spyOn(service, 'revokeTokenFamily')
        .mockResolvedValue(undefined);

      await expect(service.rotateRefreshToken(oldToken)).rejects.toThrow(
        'Refresh token reuse detected - token family revoked',
      );

      expect(revokeTokenFamilySpy).toHaveBeenCalledWith(
        'family-123',
        'reuse_detected',
      );

      revokeTokenFamilySpy.mockRestore();
    });

    it('should reject expired refresh token', async () => {
      const oldToken = 'expired-refresh-token';
      const expiredMockToken: RefreshToken = {
        ...mockRefreshToken,
        expires_at: new Date(Date.now() - 1000),
        used_at: null,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(expiredMockToken);

      await expect(service.rotateRefreshToken(oldToken)).rejects.toThrow(
        'Refresh token has expired',
      );
    });
  });

  describe('DPoP Validation', () => {
    it('should validate DPoP binding correctly', async () => {
      const token = 'valid-refresh-token';
      const dpopProof = 'valid-dpop-proof';

      const validToken: RefreshToken = {
        ...mockRefreshToken,
        used_at: null,
        revoked: false,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(validToken);
      mockAuthService.validateDpopProof?.mockResolvedValue({
        jkt: 'jkt-thumbprint-123',
        jti: 'proof-jti-42',
        iat: Math.floor(Date.now() / 1000),
      });

      const result = await service.validateRefreshToken(
        token,
        dpopProof,
        'POST',
        'https://example.com/token',
      );

      expect(result.user).toBe(mockUser);
      expect(result.dpop.jkt).toBe('jkt-thumbprint-123');
      expect(mockAuthService.validateDpopProof).toHaveBeenCalledWith(
        dpopProof,
        'POST',
        'https://example.com/token',
        expect.objectContaining({
          boundJkt: 'jkt-thumbprint-123',
          requireBinding: true,
        }),
      );
      expect(mockJtiStore.register).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockUser.tenant_id,
          jkt: 'jkt-thumbprint-123',
          jti: 'proof-jti-42',
        }),
      );
    });

    it('should reject mismatched DPoP binding', async () => {
      const token = 'valid-refresh-token';
      const dpopProof = 'invalid-dpop-proof';

      const validToken: RefreshToken = {
        ...mockRefreshToken,
        used_at: null,
        revoked: false,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(validToken);
      mockAuthService.validateDpopProof?.mockResolvedValue({
        jkt: 'wrong-jkt-thumbprint',
        jti: 'proof-jti-43',
        iat: Math.floor(Date.now() / 1000),
      });

      await expect(
        service.validateRefreshToken(
          token,
          dpopProof,
          'POST',
          'https://example.com/token',
        ),
      ).rejects.toThrow('DPoP proof does not match refresh token binding');
    });
  });

  describe('Not Before Validation', () => {
    it('should validate access token with not_before check', async () => {
      mockSessionsService.getNotBeforeTime?.mockResolvedValue(null);

      const result = await service.validateAccessToken(
        'mock-access-token',
        'user-123',
        'tenant-1',
        new Date(),
      );

      expect(result).toBe(true);
      expect(mockSessionsService.getNotBeforeTime).toHaveBeenCalledWith(
        'user-123',
        'tenant-1',
      );
    });

    it('should reject access token issued before user logout', async () => {
      const issuedAt = new Date('2023-01-01T10:00:00Z');
      const notBeforeTime = new Date('2023-01-01T12:00:00Z');
      mockSessionsService.getNotBeforeTime?.mockResolvedValue(notBeforeTime);

      const result = await service.validateAccessToken(
        'mock-access-token',
        'user-123',
        'tenant-1',
        issuedAt,
      );

      expect(result).toBe(false);
    });

    it('should validate refresh token with not_before check', async () => {
      const token = 'valid-refresh-token';
      const dpopProof = 'valid-dpop-proof';

      const validToken: RefreshToken = {
        ...mockRefreshToken,
        used_at: null,
        revoked: false,
        created_at: new Date('2023-01-01T12:00:00Z'),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(validToken);
      mockAuthService.validateDpopProof?.mockResolvedValue({
        jkt: 'jkt-thumbprint-123',
        jti: 'proof-jti-99',
        iat: Math.floor(Date.now() / 1000),
      });
      mockSessionsService.getNotBeforeTime?.mockResolvedValue(null);

      const result = await service.validateRefreshTokenWithNotBefore(
        token,
        dpopProof,
        'POST',
        'https://example.com/token',
      );

      expect(result.user).toBe(mockUser);
      expect(mockSessionsService.getNotBeforeTime).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.tenant_id,
      );
    });
  });

  describe('Token Family Management', () => {
    it('should revoke entire token family', async () => {
      const familyId = 'family-123';
      const reason = 'reuse_detected';

      await service.revokeTokenFamily(familyId, reason);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { family_id: familyId },
        { revoked: true, revoked_reason: reason },
      );
    });
  });
});
