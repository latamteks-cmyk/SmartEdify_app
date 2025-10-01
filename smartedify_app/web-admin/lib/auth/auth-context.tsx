'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from './auth-api';
import type { User, AuthTokens } from './types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && !!tokens;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('auth_tokens');
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens) as AuthTokens;
          
          // Check if tokens are still valid
          if (parsedTokens.expiresAt > Date.now()) {
            setTokens(parsedTokens);
            
            // Get user profile
            const userProfile = await authApi.getProfile(parsedTokens.accessToken);
            setUser(userProfile);
          } else {
            // Try to refresh tokens
            try {
              const newTokens = await authApi.refreshToken(parsedTokens.refreshToken);
              setTokens(newTokens);
              localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
              
              const userProfile = await authApi.getProfile(newTokens.accessToken);
              setUser(userProfile);
            } catch (error) {
              // Refresh failed, clear stored tokens
              localStorage.removeItem('auth_tokens');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('auth_tokens');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-refresh tokens before expiry
  useEffect(() => {
    if (!tokens) return;

    const timeUntilExpiry = tokens.expiresAt - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000); // 5 minutes before expiry, minimum 1 minute

    const refreshTimer = setTimeout(async () => {
      try {
        await refreshTokens();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        await logout();
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [tokens]);

  const login = async (email: string, password: string, mfaCode?: string) => {
    try {
      setIsLoading(true);
      
      const authResult = await authApi.login(email, password, mfaCode);
      
      if (authResult.requiresMfa) {
        throw new Error('MFA_REQUIRED');
      }

      setTokens(authResult.tokens);
      setUser(authResult.user);
      
      localStorage.setItem('auth_tokens', JSON.stringify(authResult.tokens));
      
      router.push('/dashboard');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (tokens) {
        await authApi.logout(tokens.accessToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('auth_tokens');
      router.push('/auth/login');
    }
  };

  const refreshTokens = async () => {
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const newTokens = await authApi.refreshToken(tokens.refreshToken);
      setTokens(newTokens);
      localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
    } catch (error) {
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshTokens,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}