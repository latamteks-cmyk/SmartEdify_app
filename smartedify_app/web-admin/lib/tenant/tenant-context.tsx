'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { tenancyApi } from './tenancy-api';
import type { Tenant, Condominium } from './types';

interface TenantContextType {
  currentTenant: Tenant | null;
  currentCondominium: Condominium | null;
  availableTenants: Tenant[];
  availableCondominiums: Condominium[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  switchCondominium: (condominiumId: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, tokens, isAuthenticated } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentCondominium, setCurrentCondominium] = useState<Condominium | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [availableCondominiums, setAvailableCondominiums] = useState<Condominium[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load tenant data when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !tokens) return;

    const loadTenantData = async () => {
      try {
        setIsLoading(true);

        // Get user's available tenants
        const tenants = await tenancyApi.getUserTenants(tokens.accessToken);
        setAvailableTenants(tenants);

        // Set current tenant (from user profile or first available)
        const userTenant = tenants.find(t => t.id === user.tenantId) || tenants[0];
        if (userTenant) {
          setCurrentTenant(userTenant);

          // Get condominiums for current tenant
          const condominiums = await tenancyApi.getTenantCondominiums(
            userTenant.id,
            tokens.accessToken
          );
          setAvailableCondominiums(condominiums);

          // Set default condominium (from localStorage or first available)
          const savedCondominiumId = localStorage.getItem('current_condominium_id');
          const defaultCondominium = savedCondominiumId
            ? condominiums.find(c => c.id === savedCondominiumId)
            : condominiums[0];

          if (defaultCondominium) {
            setCurrentCondominium(defaultCondominium);
          }
        }
      } catch (error) {
        console.error('Failed to load tenant data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenantData();
  }, [isAuthenticated, user, tokens]);

  const switchTenant = async (tenantId: string) => {
    if (!tokens) return;

    try {
      setIsLoading(true);

      const tenant = availableTenants.find(t => t.id === tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      setCurrentTenant(tenant);
      setCurrentCondominium(null);

      // Load condominiums for new tenant
      const condominiums = await tenancyApi.getTenantCondominiums(tenantId, tokens.accessToken);
      setAvailableCondominiums(condominiums);

      // Set first condominium as default
      if (condominiums.length > 0) {
        setCurrentCondominium(condominiums[0]);
        localStorage.setItem('current_condominium_id', condominiums[0].id);
      }

      localStorage.setItem('current_tenant_id', tenantId);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const switchCondominium = async (condominiumId: string) => {
    try {
      const condominium = availableCondominiums.find(c => c.id === condominiumId);
      if (!condominium) {
        throw new Error('Condominium not found');
      }

      setCurrentCondominium(condominium);
      localStorage.setItem('current_condominium_id', condominiumId);
    } catch (error) {
      console.error('Failed to switch condominium:', error);
      throw error;
    }
  };

  const value: TenantContextType = {
    currentTenant,
    currentCondominium,
    availableTenants,
    availableCondominiums,
    isLoading,
    switchTenant,
    switchCondominium,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}