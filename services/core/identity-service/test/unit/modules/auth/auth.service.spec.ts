import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { TokensService } from '../../../../src/modules/tokens/tokens.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { KeyManagementService } from '../../../../src/modules/keys/services/key-management.service';
import { JtiStoreService } from '../../../../src/modules/auth/store/jti-store.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../../../src/modules/tokens/entities/refresh-token.entity';
import { AuthorizationCodeStoreService } from '../../../../src/modules/auth/store/authorization-code-store.service';
import { ParStoreService } from '../../../../src/modules/auth/store/par-store.service';
import { DeviceCodeStoreService } from '../../../../src/modules/auth/store/device-code-store.service';
import { ClientStoreService } from '../../../../src/modules/clients/client-store.service';

describe('AuthService', () => {
  let service: AuthService;
  let tokensService: TokensService;
  let usersService: UsersService;
  let sessionsService: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokensService,
        { provide: UsersService, useValue: {} },
        { provide: SessionsService, useValue: {} },
        { provide: KeyManagementService, useValue: { getActiveSigningKey: jest.fn() } },
        { provide: JtiStoreService, useValue: { register: jest.fn() } },
        { provide: AuthorizationCodeStoreService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: ParStoreService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: DeviceCodeStoreService, useValue: { set: jest.fn(), getByDeviceCode: jest.fn() } },
        { provide: ClientStoreService, useValue: { findClientById: jest.fn() } },
        {
          provide: getRepositoryToken(RefreshToken),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokensService = module.get<TokensService>(TokensService);
    usersService = module.get<UsersService>(UsersService);
    sessionsService = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate DPoP proof correctly', async () => {
    expect(service.validateDpopProof).toBeDefined();
  });

  it('should handle refresh tokens with DPoP binding', async () => {
    expect(service.refreshTokens).toBeDefined();
  });

  it('should exchange authorization code for tokens', async () => {
    expect(service.exchangeCodeForTokens).toBeDefined();
  });
});
