// Simple Finance Service for testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockOrders = [
  {
    id: 'order-1',
    tenantId: 'tenant-1',
    type: 'RESERVATION_FEE',
    status: 'PENDING',
    amount: 50.00,
    currency: 'PEN',
    description: 'Pool reservation fee',
    referenceId: 'reservation-1',
    referenceType: 'reservation',
    customerId: 'user-123',
    customerEmail: 'user@example.com',
    createdAt: new Date().toISOString()
  }
];

const mockPayments = [];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'finance-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'mock',
    providers: {
      stripe: 'configured',
      culqi: 'configured',
      mercadopago: 'configured'
    }
  });
});

// Orders API
app.get('/api/v1/orders', (req, res) => {
  const { tenantId, referenceId, referenceType } = req.query;
  
  let filteredOrders = mockOrders;
  
  if (tenantId) {
    filteredOrders = filteredOrders.filter(o => o.tenantId === tenantId);
  }
  if (referenceId) {
    filteredOrders = filteredOrders.filter(o => o.referenceId === referenceId);
  }
  if (referenceType) {
    filteredOrders = filteredOrders.filter(o => o.referenceType === referenceType);
  }
  
  res.json({
    success: true,
    data: filteredOrders,
    total: filteredOrders.length
  });
});

app.get('/api/v1/orders/reference/:referenceId', (req, res) => {
  const { referenceId } = req.params;
  const { referenceType } = req.query;
  
  const orders = mockOrders.filter(o => 
    o.referenceId === referenceId && 
    (!referenceType || o.referenceType === referenceType)
  );
  
  res.json(orders);
});

app.post('/api/v1/orders', (req, res) => {
  const newOrder = {
    id: 'order-' + Date.now(),
    ...req.body,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  mockOrders.push(newOrder);
  
  res.status(201).json(newOrder);
});

app.get('/api/v1/orders/:id', (req, res) => {
  const order = mockOrders.find(o => o.id === req.params.id);
  
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
});

// Payments API
app.get('/api/v1/payments', (req, res) => {
  res.json({
    success: true,
    data: mockPayments,
    total: mockPayments.length
  });
});

app.post('/api/v1/payments', (req, res) => {
  const { orderId, provider } = req.body;
  
  const order = mockOrders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
  
  const payment = {
    id: 'payment-' + Date.now(),
    orderId,
    provider,
    amount: order.amount,
    currency: order.currency,
    status: 'COMPLETED', // Mock successful payment
    providerPaymentId: `${provider.toLowerCase()}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    metadata: {
      mockPayment: true,
      provider: provider
    }
  };
  
  mockPayments.push(payment);
  
  // Update order status
  order.status = 'CONFIRMED';
  
  res.status(201).json(payment);
});

// Webhook endpoints (mock)
app.post('/api/v1/payments/webhooks/stripe', (req, res) => {
  console.log('Received Stripe webhook:', req.body);
  res.json({ received: true });
});

app.post('/api/v1/payments/webhooks/culqi', (req, res) => {
  console.log('Received Culqi webhook:', req.body);
  res.json({ received: true });
});

app.post('/api/v1/payments/webhooks/mercadopago', (req, res) => {
  console.log('Received MercadoPago webhook:', req.body);
  res.json({ received: true });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    service: 'SmartEdify Finance Service',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      orders: {
        list: 'GET /api/v1/orders',
        create: 'POST /api/v1/orders',
        get: 'GET /api/v1/orders/:id',
        byReference: 'GET /api/v1/orders/reference/:referenceId'
      },
      payments: {
        list: 'GET /api/v1/payments',
        create: 'POST /api/v1/payments'
      },
      webhooks: {
        stripe: 'POST /api/v1/payments/webhooks/stripe',
        culqi: 'POST /api/v1/payments/webhooks/culqi',
        mercadopago: 'POST /api/v1/payments/webhooks/mercadopago'
      }
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`💰 Finance Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
});