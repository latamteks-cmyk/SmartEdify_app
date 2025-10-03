// Mock utilities for identity-service tests
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { SigningKey } from '../../src/modules/keys/entities/signing-key.entity';

// Mock for external services
export const createMockTenancyService = () => {
  return {
    validateTenant: jest.fn().mockResolvedValue(true),
    getTenant: jest.fn().mockResolvedValue({ id: 'test-tenant', name: 'Test Tenant' }),
  };
};

export const createMockComplianceService = () => {
  return {
    validateDsarRequest: jest.fn().mockResolvedValue({ approved: true }),
    reportIncident: jest.fn().mockResolvedValue({ incidentId: 'test-incident' }),
  };
};

export const createMockKafkaService = () => {
  return {
    emitEvent: jest.fn().mockResolvedValue(true),
    publish: jest.fn().mockResolvedValue(true),
  };
};

// Mock repositories
export const createMockUserRepository = () => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockRefreshTokenRepository = () => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockSessionRepository = () => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockWebAuthnCredentialRepository = () => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockSigningKeyRepository = () => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
};

// Mock services
export const createMockAuthService = () => {
  return {
    validateDpopProof: jest.fn(),
    refreshTokens: jest.fn(),
    exchangeCodeForTokens: jest.fn(),
    introspect: jest.fn(),
    handleBackchannelLogout: jest.fn(),
    validateAccessToken: jest.fn().mockResolvedValue(true),
  };
};

export const createMockTokensService = () => {
  return {
    issueRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    validateAccessToken: jest.fn(),
    validateRefreshTokenWithNotBefore: jest.fn(),
    revokeTokenFamily: jest.fn(),
  };
};

export const createMockSessionsService = () => {
  return {
    getActiveSessions: jest.fn(),
    revokeUserSessions: jest.fn(),
    getNotBeforeTime: jest.fn(),
    revokeSession: jest.fn(),
  };
};

export const createMockWebauthnService = () => {
  return {
    registerCredential: jest.fn(),
    authenticateCredential: jest.fn(),
  };
};

export const createMockKeyManagementService = () => {
  return {
    getActiveSigningKey: jest.fn(),
    getJwksForTenant: jest.fn(),
    generateNewKey: jest.fn(),
  };
};

export const createMockOidcDiscoveryService = () => {
  return {
    getOidcConfiguration: jest.fn(),
    getJwksByTenant: jest.fn(),
  };
};

export const createMockUsersService = () => {
  return {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    validate: jest.fn(),
  };
};

// Mock HTTP client
export const createMockHttpService = () => {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
};

// Create a complete mock module for testing
export const createTestingModuleWithMocks = async (moduleImports: any[] = []) => {
  const { Test } = await import('@nestjs/testing');
  const { AppModule } = await import('../../src/app.module');
  
  const testModule = Test.createTestingModule({
    imports: [AppModule, ...moduleImports],
  });

  // Add all necessary mocks
  testModule
    .overrideProvider('TenancyService')
    .useValue(createMockTenancyService())
    .overrideProvider('ComplianceService')
    .useValue(createMockComplianceService())
    .overrideProvider('KafkaService')
    .useValue(createMockKafkaService())
    .overrideProvider('UserRepository')
    .useValue(createMockUserRepository())
    .overrideProvider('RefreshTokenRepository')
    .useValue(createMockRefreshTokenRepository())
    .overrideProvider('SessionRepository')
    .useValue(createMockSessionRepository())
    .overrideProvider('WebAuthnCredentialRepository')
    .useValue(createMockWebAuthnCredentialRepository())
    .overrideProvider('SigningKeyRepository')
    .useValue(createMockSigningKeyRepository())
    .overrideProvider('AuthService')
    .useValue(createMockAuthService())
    .overrideProvider('TokensService')
    .useValue(createMockTokensService())
    .overrideProvider('SessionsService')
    .useValue(createMockSessionsService())
    .overrideProvider('WebauthnService')
    .useValue(createMockWebauthnService())
    .overrideProvider('KeyManagementService')
    .useValue(createMockKeyManagementService())
    .overrideProvider('OidcDiscoveryService')
    .useValue(createMockOidcDiscoveryService())
    .overrideProvider('UsersService')
    .useValue(createMockUsersService())
    .overrideProvider('HttpService')
    .useValue(createMockHttpService());

  return testModule;
};