
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { SessionsService } from '../sessions/sessions.service';
import { KeyManagementService } from '../keys/services/key-management.service';
import { exportJWK, exportPKCS8, generateKeyPair, jwtVerify, KeyLike } from 'jose';

describe('TokensService', () => {
  let service: TokensService;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;
  let mockAuthService: Partial<AuthService>;
  let mockSessionsService: Partial<SessionsService>;
  let mockKeyManagementService: { getActiveSigningKey: jest.Mock };
  let publicKey: KeyLike;
  let signingKey: any;

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
  } as User;

  const mockRefreshToken: RefreshToken = {
    id: 'token-123',
    token_hash: 'abc123hash',
    user: mockUser,
    jkt: 'jkt-thumbprint-123',
    kid: 'test-key',
    jti: 'jti-123',
    family_id: 'family-123',
    parent_id: null as any,
    replaced_by_id: null as any,
    used_at: null as any,
    client_id: 'client-1',
    device_id: 'device-1',
    session_id: 'session-1',
    scope: 'openid profile',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    created_ip: '127.0.0.1',
    created_ua: 'test-agent',
    revoked: false,
    revoked_reason: null as any,
    created_at: new Date(),
  };

  beforeAll(async () => {
    const { privateKey, publicKey: generatedPublicKey } = await generateKeyPair('ES256');
    publicKey = generatedPublicKey;
    const privateKeyPem = await exportPKCS8(privateKey);
    const publicJwk = await exportJWK(generatedPublicKey);
    signingKey = {
      kid: 'test-key',
      tenant_id: mockUser.tenant_id,
      private_key_pem: privateKeyPem,
      algorithm: 'ES256',
      public_key_jwk: { ...publicJwk, kid: 'test-key', use: 'sig', alg: 'ES256' },
    };
  });

  beforeEach(async () => {
    mockRefreshTokenRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockAuthService = {
      validateDpopProof: jest.fn().mockResolvedValue('jkt-thumbprint-123'),
    };

    mockSessionsService = {
      getNotBeforeTime: jest.fn().mockResolvedValue(null), // Default to no logout events
    };

    mockKeyManagementService = {
      getActiveSigningKey: jest.fn().mockResolvedValue(signingKey),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
        {
          provide: KeyManagementService,
          useValue: mockKeyManagementService,
        },
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
      mockRefreshTokenRepository.save = jest.fn(async (entity) => {
        if (Array.isArray(entity)) {
          entity.forEach((item) => persisted.push(item as RefreshToken));
        } else {
          persisted.push(entity as RefreshToken);
        }
        return entity;
      });

      const token = await service.issueRefreshToken(
        mockUser,
        'jkt-thumbprint-123',
        'family-xyz',
        'client-1',
        'device-1',
        'openid profile',
      );

      expect(token).toEqual(expect.any(String));
      expect(mockKeyManagementService.getActiveSigningKey).toHaveBeenCalledWith(mockUser.tenant_id);
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        kid: 'test-key',
        jti: expect.any(String),
      }));

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
      const oldTokenHash = require('crypto').createHash('sha256').update(oldToken).digest('hex');

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.save = jest.fn().mockResolvedValue(mockRefreshToken);

      // Mock the new token creation
      service.issueRefreshToken = jest.fn().mockResolvedValue('new-refresh-token');
      
      const newTokenHash = require('crypto').createHash('sha256').update('new-refresh-token').digest('hex');
      const newMockToken = { ...mockRefreshToken, id: 'new-token-123', token_hash: newTokenHash };
      
      mockRefreshTokenRepository.findOne = jest.fn()
        .mockResolvedValueOnce(mockRefreshToken) // First call for old token
        .mockResolvedValueOnce(newMockToken); // Second call for new token

      const result = await service.rotateRefreshToken(oldToken);

      expect(result).toBe('new-refresh-token');
      expect(service.issueRefreshToken).toHaveBeenCalledWith(
        mockUser,
        'jkt-thumbprint-123',
        'family-123',
        'client-1',
        'device-1',
        'openid profile',
        'session-1'
      );
    });

    it('should detect reuse and revoke token family', async () => {
      const oldToken = 'reused-refresh-token';
      const usedMockToken = { ...mockRefreshToken, used_at: new Date() }; // Already used

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(usedMockToken);
      
      // Mock the revokeTokenFamily method to avoid actual database calls
      const revokeTokenFamilySpy = jest.spyOn(service, 'revokeTokenFamily').mockResolvedValue(undefined);

      await expect(service.rotateRefreshToken(oldToken)).rejects.toThrow(
        'Refresh token reuse detected - token family revoked'
      );

      expect(revokeTokenFamilySpy).toHaveBeenCalledWith('family-123', 'reuse_detected');
      
      // Restore the spy
      revokeTokenFamilySpy.mockRestore();
    });

    it('should reject expired refresh token', async () => {
      const oldToken = 'expired-refresh-token';
      const expiredMockToken = { 
        ...mockRefreshToken, 
        expires_at: new Date(Date.now() - 1000), // Expired
        used_at: undefined // Make sure it's not used
      }; 

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(expiredMockToken);

      await expect(service.rotateRefreshToken(oldToken)).rejects.toThrow(
        'Refresh token has expired'
      );
    });
  });

  describe('DPoP Validation', () => {
    it('should validate DPoP binding correctly', async () => {
      const token = 'valid-refresh-token';
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const dpopProof = 'valid-dpop-proof';
      
      const validToken = { 
        ...mockRefreshToken, 
        token_hash: tokenHash,
        used_at: undefined, // Explicitly set to undefined to pass the check
        revoked: false
      };
      
      // Reset and setup the mock for this specific test
      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(validToken);
      mockAuthService.validateDpopProof = jest.fn().mockResolvedValue('jkt-thumbprint-123');

      const result = await service.validateRefreshToken(token, dpopProof, 'POST', 'https://example.com/token');

      expect(result).toBe(mockUser);
      expect(mockAuthService.validateDpopProof).toHaveBeenCalledWith(dpopProof, 'POST', 'https://example.com/token');
    });

    it('should reject mismatched DPoP binding', async () => {
      const token = 'valid-refresh-token';
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const dpopProof = 'invalid-dpop-proof';
      
      const validToken = { 
        ...mockRefreshToken, 
        token_hash: tokenHash,
        used_at: undefined, // Explicitly set to undefined to pass the initial check
        revoked: false
      };
      
      // Reset and setup the mock for this specific test
      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(validToken);
      mockAuthService.validateDpopProof = jest.fn().mockResolvedValue('wrong-jkt-thumbprint');

      await expect(service.validateRefreshToken(token, dpopProof, 'POST', 'https://example.com/token'))
        .rejects.toThrow('DPoP proof does not match refresh token binding');
    });
  });

  describe('Not Before Validation', () => {
    it('should validate access token with not_before check', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-1';
      const issuedAt = new Date();
      const accessToken = 'mock-access-token';

      // Mock no logout events (not_before is null)
      mockSessionsService.getNotBeforeTime = jest.fn().mockResolvedValue(null);

      const result = await service.validateAccessToken(accessToken, userId, tenantId, issuedAt);

      expect(result).toBe(true);
      expect(mockSessionsService.getNotBeforeTime).toHaveBeenCalledWith(userId, tenantId);
    });

    it('should reject access token issued before user logout', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-1';
      const issuedAt = new Date('2023-01-01T10:00:00Z');
      const notBeforeTime = new Date('2023-01-01T12:00:00Z'); // Logout after token issue
      const accessToken = 'mock-access-token';

      // Mock a logout event that happened after token was issued
      mockSessionsService.getNotBeforeTime = jest.fn().mockResolvedValue(notBeforeTime);

      const result = await service.validateAccessToken(accessToken, userId, tenantId, issuedAt);

      expect(result).toBe(false);
      expect(mockSessionsService.getNotBeforeTime).toHaveBeenCalledWith(userId, tenantId);
    });

    it('should validate refresh token with not_before check', async () => {
      const token = 'valid-refresh-token';
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const dpopProof = 'valid-dpop-proof';
      
      const validToken = { 
        ...mockRefreshToken, 
        token_hash: tokenHash,
        used_at: null as any,
        revoked: false,
        created_at: new Date('2023-01-01T12:00:00Z') // Token created after logout
      };
      
      // Mock no logout events (not_before is null)
      mockRefreshTokenRepository.findOne = jest.fn()
        .mockResolvedValueOnce(validToken) // First call in validateRefreshToken
        .mockResolvedValueOnce(validToken); // Second call in validateRefreshTokenWithNotBefore
        
      mockAuthService.validateDpopProof = jest.fn().mockResolvedValue('jkt-thumbprint-123');
      mockSessionsService.getNotBeforeTime = jest.fn().mockResolvedValue(null);

      const result = await service.validateRefreshTokenWithNotBefore(token, dpopProof, 'POST', 'https://example.com/token');

      expect(result).toBe(mockUser);
      expect(mockSessionsService.getNotBeforeTime).toHaveBeenCalledWith(mockUser.id, mockUser.tenant_id);
    });
  });

  describe('Token Family Management', () => {
    it('should revoke entire token family', async () => {
      const familyId = 'family-123';
      const reason = 'reuse_detected';

      await service.revokeTokenFamily(familyId, reason);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { family_id: familyId },
        { revoked: true, revoked_reason: reason }
      );
    });
  });
});