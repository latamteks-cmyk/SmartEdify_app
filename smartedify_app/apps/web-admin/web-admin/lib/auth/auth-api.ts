import axios, { AxiosInstance } from 'axios';
import { generateDPoPProof } from './dpop';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
  AuthTokens,
  MfaChallengeRequest,
  WebAuthnChallengeRequest,
  WebAuthnChallengeResponse,
} from './types';

class AuthAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for DPoP
    this.client.interceptors.request.use(async (config) => {
      // Add DPoP proof for state-changing operations
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        try {
          const dpopProof = await generateDPoPProof(
            config.method?.toUpperCase() || 'POST',
            `${config.baseURL}${config.url}`
          );
          config.headers['DPoP'] = dpopProof;
        } catch (error) {
          console.warn('Failed to generate DPoP proof:', error);
        }
      }

      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_tokens');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/v1/auth/login', {
      email,
      password,
      mfaCode,
    });

    return response.data;
  }

  async logout(accessToken: string): Promise<void> {
    await this.client.post(
      '/v1/auth/logout',
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.client.post<RefreshTokenResponse>('/v1/auth/refresh', {
      refreshToken,
    });

    return response.data.tokens;
  }

  async getProfile(accessToken: string): Promise<User> {
    const response = await this.client.get<User>('/v1/auth/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  async requestMfaChallenge(request: MfaChallengeRequest): Promise<void> {
    await this.client.post('/v1/auth/mfa/challenge', request);
  }

  async requestWebAuthnChallenge(request: WebAuthnChallengeRequest): Promise<WebAuthnChallengeResponse> {
    const response = await this.client.post<WebAuthnChallengeResponse>(
      '/v1/auth/webauthn/challenge',
      request
    );

    return response.data;
  }

  async verifyWebAuthn(
    email: string,
    credential: PublicKeyCredential
  ): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/v1/auth/webauthn/verify', {
      email,
      credential: {
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          authenticatorData: Array.from(
            new Uint8Array((credential.response as AuthenticatorAssertionResponse).authenticatorData)
          ),
          clientDataJSON: Array.from(
            new Uint8Array((credential.response as AuthenticatorAssertionResponse).clientDataJSON)
          ),
          signature: Array.from(
            new Uint8Array((credential.response as AuthenticatorAssertionResponse).signature)
          ),
          userHandle: (credential.response as AuthenticatorAssertionResponse).userHandle
            ? Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).userHandle!))
            : null,
        },
        type: credential.type,
      },
    });

    return response.data;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    accessToken: string
  ): Promise<void> {
    await this.client.post(
      '/v1/auth/change-password',
      {
        currentPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post('/v1/auth/password-reset/request', {
      email,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.client.post('/v1/auth/password-reset/confirm', {
      token,
      newPassword,
    });
  }

  async enableMfa(accessToken: string, type: 'sms' | 'totp'): Promise<{ secret?: string; qrCode?: string }> {
    const response = await this.client.post(
      '/v1/auth/mfa/enable',
      { type },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  async disableMfa(accessToken: string, mfaCode: string): Promise<void> {
    await this.client.post(
      '/v1/auth/mfa/disable',
      { mfaCode },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }
}

export const authApi = new AuthAPI();