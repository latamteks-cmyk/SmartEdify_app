import axios, { AxiosInstance } from 'axios';
import { generateDPoPProof } from '@/lib/auth/dpop';
import type { Tenant, Condominium, Building, Unit, TenantUser } from './types';

class TenancyAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_TENANCY_SERVICE_URL || 'http://localhost:3003',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for DPoP and auth
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
  }

  // Tenant Management
  async getUserTenants(accessToken: string): Promise<Tenant[]> {
    const response = await this.client.get<Tenant[]>('/v1/tenants/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getTenant(tenantId: string, accessToken: string): Promise<Tenant> {
    const response = await this.client.get<Tenant>(`/v1/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async createTenant(tenant: Partial<Tenant>, accessToken: string): Promise<Tenant> {
    const response = await this.client.post<Tenant>('/v1/tenants', tenant, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>, accessToken: string): Promise<Tenant> {
    const response = await this.client.put<Tenant>(`/v1/tenants/${tenantId}`, updates, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  // Condominium Management
  async getTenantCondominiums(tenantId: string, accessToken: string): Promise<Condominium[]> {
    const response = await this.client.get<Condominium[]>(`/v1/tenants/${tenantId}/condominiums`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getCondominium(condominiumId: string, accessToken: string): Promise<Condominium> {
    const response = await this.client.get<Condominium>(`/v1/condominiums/${condominiumId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async createCondominium(condominium: Partial<Condominium>, accessToken: string): Promise<Condominium> {
    const response = await this.client.post<Condominium>('/v1/condominiums', condominium, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async updateCondominium(
    condominiumId: string,
    updates: Partial<Condominium>,
    accessToken: string
  ): Promise<Condominium> {
    const response = await this.client.put<Condominium>(`/v1/condominiums/${condominiumId}`, updates, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  // Building Management
  async getCondominiumBuildings(condominiumId: string, accessToken: string): Promise<Building[]> {
    const response = await this.client.get<Building[]>(`/v1/condominiums/${condominiumId}/buildings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getBuilding(buildingId: string, accessToken: string): Promise<Building> {
    const response = await this.client.get<Building>(`/v1/buildings/${buildingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async createBuilding(building: Partial<Building>, accessToken: string): Promise<Building> {
    const response = await this.client.post<Building>('/v1/buildings', building, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async updateBuilding(buildingId: string, updates: Partial<Building>, accessToken: string): Promise<Building> {
    const response = await this.client.put<Building>(`/v1/buildings/${buildingId}`, updates, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  // Unit Management
  async getBuildingUnits(buildingId: string, accessToken: string): Promise<Unit[]> {
    const response = await this.client.get<Unit[]>(`/v1/buildings/${buildingId}/units`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getCondominiumUnits(condominiumId: string, accessToken: string): Promise<Unit[]> {
    const response = await this.client.get<Unit[]>(`/v1/condominiums/${condominiumId}/units`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getUnit(unitId: string, accessToken: string): Promise<Unit> {
    const response = await this.client.get<Unit>(`/v1/units/${unitId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async createUnit(unit: Partial<Unit>, accessToken: string): Promise<Unit> {
    const response = await this.client.post<Unit>('/v1/units', unit, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async updateUnit(unitId: string, updates: Partial<Unit>, accessToken: string): Promise<Unit> {
    const response = await this.client.put<Unit>(`/v1/units/${unitId}`, updates, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  // User Management
  async getTenantUsers(tenantId: string, accessToken: string): Promise<TenantUser[]> {
    const response = await this.client.get<TenantUser[]>(`/v1/tenants/${tenantId}/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async inviteUser(
    tenantId: string,
    invitation: {
      email: string;
      name: string;
      roles: string[];
      condominiums: string[];
    },
    accessToken: string
  ): Promise<void> {
    await this.client.post(`/v1/tenants/${tenantId}/users/invite`, invitation, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async updateUserRoles(
    tenantId: string,
    userId: string,
    roles: string[],
    accessToken: string
  ): Promise<TenantUser> {
    const response = await this.client.put<TenantUser>(
      `/v1/tenants/${tenantId}/users/${userId}/roles`,
      { roles },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data;
  }

  async removeUser(tenantId: string, userId: string, accessToken: string): Promise<void> {
    await this.client.delete(`/v1/tenants/${tenantId}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export const tenancyApi = new TenancyAPI();