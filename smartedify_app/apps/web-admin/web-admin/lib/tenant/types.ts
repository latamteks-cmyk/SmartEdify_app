export interface Tenant {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  currency: string;
  language: string;
  settings: {
    branding?: {
      primaryColor?: string;
      logo?: string;
      favicon?: string;
    };
    features?: {
      governance?: boolean;
      reservations?: boolean;
      finance?: boolean;
      security?: boolean;
    };
    compliance?: {
      dataRetentionDays?: number;
      requiresApproval?: boolean;
      auditLevel?: 'basic' | 'detailed' | 'forensic';
    };
  };
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Condominium {
  id: string;
  tenantId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  settings: {
    timezone?: string;
    currency?: string;
    language?: string;
    governance?: {
      quorumPercentage?: number;
      majorityPercentage?: number;
      votingPeriodDays?: number;
    };
    reservations?: {
      advanceBookingDays?: number;
      cancellationHours?: number;
      maxReservationsPerUser?: number;
    };
  };
  stats: {
    totalUnits: number;
    occupiedUnits: number;
    totalBuildings: number;
    totalAmenities: number;
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  condominiumId: string;
  name: string;
  code: string;
  floors: number;
  unitsPerFloor: number;
  totalUnits: number;
  amenities: string[];
  status: 'active' | 'maintenance' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  condominiumId: string;
  buildingId: string;
  number: string;
  floor: number;
  type: 'apartment' | 'office' | 'commercial' | 'parking' | 'storage' | 'common';
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  owner?: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
  };
  tenant?: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    leaseStart: string;
    leaseEnd: string;
  };
  status: 'occupied' | 'vacant' | 'maintenance' | 'reserved';
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  condominiums: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}