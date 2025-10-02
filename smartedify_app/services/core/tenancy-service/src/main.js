// Mock Tenancy Service for testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockTenants = [
  {
    id: 'tenant-1',
    name: 'Condominio Las Flores',
    type: 'residential',
    status: 'active',
    address: 'Av. Las Flores 123, Lima, Peru',
    units: 50,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'tenant-2',
    name: 'Edificio Central',
    type: 'commercial',
    status: 'active',
    address: 'Jr. Central 456, Lima, Peru',
    units: 30,
    createdAt: '2024-01-15T00:00:00Z'
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tenancy-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all tenants
app.get('/tenants', (req, res) => {
  res.json({
    success: true,
    data: mockTenants,
    total: mockTenants.length
  });
});

// Get tenant by ID
app.get('/tenants/:id', (req, res) => {
  const tenant = mockTenants.find(t => t.id === req.params.id);
  
  if (tenant) {
    res.json({
      success: true,
      data: tenant
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Tenant not found'
    });
  }
});

// Create tenant
app.post('/tenants', (req, res) => {
  const newTenant = {
    id: 'tenant-' + Date.now(),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  mockTenants.push(newTenant);
  
  res.status(201).json({
    success: true,
    data: newTenant
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏢 Tenancy Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});