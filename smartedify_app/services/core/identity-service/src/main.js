// Mock Identity Service for testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'identity-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock authentication endpoint
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email && password) {
    res.json({
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'user-123',
        email: email,
        name: 'Test User',
        roles: ['admin']
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }
});

// Mock token validation
app.post('/auth/validate', (req, res) => {
  const { token } = req.body;
  
  if (token && token.startsWith('mock-jwt-token')) {
    res.json({
      valid: true,
      user: {
        id: 'user-123',
        email: 'test@smartedify.com',
        name: 'Test User',
        roles: ['admin']
      }
    });
  } else {
    res.status(401).json({
      valid: false,
      message: 'Invalid token'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔐 Identity Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});