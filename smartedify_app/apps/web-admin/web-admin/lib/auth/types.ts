export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  requiresMfa: boolean;
  mfaChallenge?: {
    type: 'sms' | 'totp' | 'webauthn';
    challenge?: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

export interface MfaChallengeRequest {
  email: string;
  type: 'sms' | 'totp';
}

export interface WebAuthnChallengeRequest {
  email: string;
}

export interface WebAuthnChallengeResponse {
  challenge: string;
  rpId: string;
  allowCredentials: PublicKeyCredentialDescriptor[];
}

export interface DPoPProof {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  exp: number;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}