// Mock Reservation Service for testing
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3013;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockReservations = [];
const mockAmenities = [
  {
    id: 'amenity-1',
    name: 'Piscina',
    type: 'pool',
    capacity: 20,
    pricePerHour: 50.00,
    currency: 'PEN',
    availableHours: ['06:00', '07:00', '08:00', '09:00', '10:00', '18:00', '19:00', '20:00', '21:00']
  },
  {
    id: 'amenity-2',
    name: 'Salón de Eventos',
    type: 'event_hall',
    capacity: 50,
    pricePerHour: 100.00,
    currency: 'PEN',
    availableHours: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reservation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dependencies: {
      compliance_service: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3012',
      finance_service: process.env.FINANCE_SERVICE_URL || 'http://finance-service:3007'
    }
  });
});

// Get amenities
app.get('/amenities', (req, res) => {
  res.json({
    success: true,
    data: mockAmenities,
    total: mockAmenities.length
  });
});

// Check availability
app.get('/reservations/availability/:amenityId', (req, res) => {
  const { amenityId } = req.params;
  const { from, to } = req.query;
  
  const amenity = mockAmenities.find(a => a.id === amenityId);
  if (!amenity) {
    return res.status(404).json({
      success: false,
      message: 'Amenity not found'
    });
  }
  
  // Mock availability - return available slots
  const availableSlots = amenity.availableHours.map(hour => ({
    time: hour,
    available: Math.random() > 0.3, // 70% availability
    price: amenity.pricePerHour,
    currency: amenity.currency
  }));
  
  res.json({
    success: true,
    data: availableSlots,
    amenity: amenity,
    period: { from, to }
  });
});

// Create reservation
app.post('/reservations', async (req, res) => {
  try {
    const { condominiumId, amenityId, startTime, endTime, partySize } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];
    
    // Check if reservation already exists (idempotency)
    const existingReservation = mockReservations.find(r => r.idempotencyKey === idempotencyKey);
    if (existingReservation) {
      return res.json({
        success: true,
        data: existingReservation
      });
    }
    
    // Find amenity
    const amenity = mockAmenities.find(a => a.id === amenityId);
    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: 'Amenity not found'
      });
    }
    
    // Calculate duration and price
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end - start) / (1000 * 60 * 60);
    const totalPrice = amenity.pricePerHour * durationHours;
    
    // Check compliance (if service is available)
    let complianceDecision = { decision: 'PERMIT', reason: 'Default permit' };
    try {
      const complianceUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3012';
      const complianceResponse = await axios.post(`${complianceUrl}/policies/validate`, {
        action: 'reservation:create',
        resource: `amenity:${amenity.type}`,
        subject: 'user:123',
        context: {
          amenityId,
          startTime,
          endTime,
          partySize,
          condominiumId
        }
      }, { timeout: 5000 });
      
      complianceDecision = complianceResponse.data;
    } catch (error) {
      console.log('⚠️ Compliance service not available, using fallback');
    }
    
    if (complianceDecision.decision === 'DENY') {
      return res.status(400).json({
        success: false,
        message: `Reservation denied: ${complianceDecision.reason}`,
        complianceDecision
      });
    }
    
    // Create reservation
    const reservation = {
      id: 'reservation-' + Date.now(),
      condominiumId,
      amenityId,
      amenityName: amenity.name,
      startTime,
      endTime,
      partySize,
      status: totalPrice > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
      priceAmount: totalPrice,
      currency: amenity.currency,
      createdAt: new Date().toISOString(),
      idempotencyKey,
      metadata: {
        policyDecision: complianceDecision,
        durationHours
      }
    };
    
    mockReservations.push(reservation);
    
    // Create order in finance service if price > 0
    if (totalPrice > 0) {
      try {
        const financeUrl = process.env.FINANCE_SERVICE_URL || 'http://finance-service:3007';
        const orderResponse = await axios.post(`${financeUrl}/api/v1/orders`, {
          tenantId: condominiumId,
          type: 'RESERVATION_FEE',
          amount: totalPrice,
          currency: amenity.currency,
          description: `Reservation fee for ${amenity.name}`,
          referenceId: reservation.id,
          referenceType: 'reservation',
          customerId: 'user-123',
          customerEmail: 'user@example.com',
          customerName: 'Test User'
        }, { 
          timeout: 10000,
          headers: {
            'Authorization': req.headers.authorization || 'Bearer mock-token'
          }
        });
        
        reservation.orderId = orderResponse.data.id;
        console.log(`✅ Created order ${orderResponse.data.id} for reservation ${reservation.id}`);
      } catch (error) {
        console.log('⚠️ Finance service not available, reservation created without order');
        reservation.status = 'CONFIRMED'; // Fallback to confirmed
      }
    }
    
    res.status(201).json({
      success: true,
      data: reservation
    });
    
  } catch (error) {
    console.error('Error creating reservation:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get reservations
app.get('/reservations', (req, res) => {
  const { condominiumId, status } = req.query;
  
  let filteredReservations = mockReservations;
  
  if (condominiumId) {
    filteredReservations = filteredReservations.filter(r => r.condominiumId === condominiumId);
  }
  
  if (status) {
    filteredReservations = filteredReservations.filter(r => r.status === status);
  }
  
  res.json({
    success: true,
    data: filteredReservations,
    total: filteredReservations.length
  });
});

// Get reservation by ID
app.get('/reservations/:id', (req, res) => {
  const reservation = mockReservations.find(r => r.id === req.params.id);
  
  if (reservation) {
    res.json({
      success: true,
      data: reservation
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Reservation not found'
    });
  }
});

// Check-in endpoint
app.post('/reservations/:id/attendance/check-in', (req, res) => {
  const reservation = mockReservations.find(r => r.id === req.params.id);
  
  if (!reservation) {
    return res.status(404).json({
      success: false,
      message: 'Reservation not found'
    });
  }
  
  if (reservation.status !== 'CONFIRMED') {
    return res.status(400).json({
      success: false,
      message: 'Reservation must be confirmed to check in'
    });
  }
  
  // Update reservation with check-in
  reservation.checkedInAt = new Date().toISOString();
  reservation.status = 'ACTIVE';
  
  res.json({
    success: true,
    data: {
      reservationId: reservation.id,
      checkInAt: reservation.checkedInAt,
      status: reservation.status
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏨 Reservation Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});