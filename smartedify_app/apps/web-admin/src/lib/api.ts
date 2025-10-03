import axios from 'axios'

// API Base URLs
const API_URLS = {
  identity: 'http://localhost:3001',
  tenancy: 'http://localhost:3003',
  finance: 'http://localhost:3007',
  compliance: 'http://localhost:3012',
  reservation: 'http://localhost:3013',
  embeddings: 'http://localhost:8091',
}

// Create axios instances for each service
const createApiClient = (baseURL: string) => {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

const clients = {
  identity: createApiClient(API_URLS.identity),
  tenancy: createApiClient(API_URLS.tenancy),
  finance: createApiClient(API_URLS.finance),
  compliance: createApiClient(API_URLS.compliance),
  reservation: createApiClient(API_URLS.reservation),
  embeddings: createApiClient(API_URLS.embeddings),
}

export const api = {
  // Health checks
  async getServicesHealth() {
    const services = [
      { name: 'Identity Service', client: clients.identity, port: 3001 },
      { name: 'Tenancy Service', client: clients.tenancy, port: 3003 },
      { name: 'Finance Service', client: clients.finance, port: 3007 },
      { name: 'Compliance Service', client: clients.compliance, port: 3012 },
      { name: 'Reservation Service', client: clients.reservation, port: 3013 },
      { name: 'Embeddings Service', client: clients.embeddings, port: 8091 },
    ]

    const results = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await service.client.get('/health')
          return {
            name: service.name,
            port: service.port,
            status: 'healthy',
            data: response.data,
          }
        } catch (error) {
          return {
            name: service.name,
            port: service.port,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    return results.map((result) => 
      result.status === 'fulfilled' ? result.value : {
        name: 'Unknown Service',
        status: 'unhealthy',
        error: 'Failed to check',
      }
    )
  },

  // Tenancy Service
  async getTenants() {
    const response = await clients.tenancy.get('/tenants')
    return response.data
  },

  async createTenant(tenant: any) {
    const response = await clients.tenancy.post('/tenants', tenant)
    return response.data
  },

  async getTenant(id: string) {
    const response = await clients.tenancy.get(`/tenants/${id}`)
    return response.data
  },

  // Reservation Service
  async getReservations(params?: any) {
    const response = await clients.reservation.get('/reservations', { params })
    return response.data
  },

  async createReservation(reservation: any) {
    const response = await clients.reservation.post('/reservations', reservation, {
      headers: {
        'Idempotency-Key': `web-admin-${Date.now()}`,
      },
    })
    return response.data
  },

  async getAmenities() {
    const response = await clients.reservation.get('/amenities')
    return response.data
  },

  async getAvailability(amenityId: string, params: any) {
    const response = await clients.reservation.get(`/reservations/availability/${amenityId}`, { params })
    return response.data
  },

  // Finance Service
  async getOrders(params?: any) {
    const response = await clients.finance.get('/api/v1/orders', { params })
    return response.data
  },

  async createOrder(order: any) {
    const response = await clients.finance.post('/api/v1/orders', order)
    return response.data
  },

  async getPayments(params?: any) {
    const response = await clients.finance.get('/api/v1/payments', { params })
    return response.data
  },

  async createPayment(payment: any) {
    const response = await clients.finance.post('/api/v1/payments', payment)
    return response.data
  },

  // Compliance Service
  async validatePolicy(validation: any) {
    const response = await clients.compliance.post('/policies/validate', validation)
    return response.data
  },

  async compilePolicy(compilation: any) {
    const response = await clients.compliance.post('/llm/policies/compile', compilation)
    return response.data
  },

  async explainPolicy(explanation: any) {
    const response = await clients.compliance.post('/llm/policies/explain', explanation)
    return response.data
  },

  async searchRAG(params: any) {
    const response = await clients.compliance.get('/llm/rag/search', { params })
    return response.data
  },

  // Identity Service
  async login(credentials: any) {
    const response = await clients.identity.post('/auth/login', credentials)
    return response.data
  },

  async validateToken(token: string) {
    const response = await clients.identity.post('/auth/validate', { token })
    return response.data
  },
}