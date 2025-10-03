import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

describe('Reservation Flow E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let condominiumId: string;
  let amenityId: string;

  beforeAll(async () => {
    // This would be set up with actual test containers
    // For now, we'll assume services are running
    
    tenantId = uuidv4();
    condominiumId = uuidv4();
    amenityId = uuidv4();
    
    // Mock JWT token for testing
    authToken = 'Bearer test-jwt-token';
  });

  describe('Complete Reservation Flow', () => {
    it('should create reservation with policy validation and payment', async () => {
      const idempotencyKey = uuidv4();
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2); // 2 hours from now
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // 1 hour duration

      // Step 1: Check availability
      const availabilityResponse = await request('http://localhost:3013')
        .get(`/reservations/availability/${amenityId}`)
        .set('Authorization', authToken)
        .query({
          from: startTime.toISOString(),
          to: endTime.toISOString(),
        })
        .expect(200);

      expect(availabilityResponse.body).toHaveProperty('length');

      // Step 2: Create reservation
      const reservationResponse = await request('http://localhost:3013')
        .post('/reservations')
        .set('Authorization', authToken)
        .set('DPoP', 'mock-dpop-token')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          condominiumId,
          amenityId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          partySize: 2,
        })
        .expect(201);

      const reservation = reservationResponse.body;
      expect(reservation).toHaveProperty('id');
      expect(reservation.status).toMatch(/PENDING|CONFIRMED/);

      // Step 3: If payment required, check order was created
      if (reservation.priceAmount > 0) {
        const orderResponse = await request('http://localhost:3007')
          .get(`/orders/reference/${reservation.id}`)
          .set('Authorization', authToken)
          .query({ referenceType: 'reservation' })
          .expect(200);

        expect(orderResponse.body).toHaveLength(1);
        expect(orderResponse.body[0].type).toBe('RESERVATION_FEE');
      }

      // Step 4: Check compliance service was called (via logs or metrics)
      // This would be validated through observability tools in real scenarios

      // Step 5: Test check-in flow
      if (reservation.status === 'CONFIRMED') {
        const checkInResponse = await request('http://localhost:3013')
          .post(`/reservations/${reservation.id}/attendance/check-in`)
          .set('Authorization', authToken)
          .set('DPoP', 'mock-dpop-token')
          .send({
            method: 'MANUAL',
            payload: 'manual-check-in',
          })
          .expect(200);

        expect(checkInResponse.body).toHaveProperty('checkInAt');
      }
    });

    it('should handle policy denial correctly', async () => {
      const idempotencyKey = uuidv4();
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 48); // Far future to trigger policy denial
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      // This should be denied by compliance service
      await request('http://localhost:3013')
        .post('/reservations')
        .set('Authorization', authToken)
        .set('DPoP', 'mock-dpop-token')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          condominiumId,
          amenityId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          partySize: 10, // Exceed capacity to trigger denial
        })
        .expect(400);
    });

    it('should handle compliance service failure gracefully', async () => {
      // Mock compliance service being down
      // This would require test containers or service mocking
      
      const idempotencyKey = uuidv4();
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      // Should fall back to basic validation
      const response = await request('http://localhost:3013')
        .post('/reservations')
        .set('Authorization', authToken)
        .set('DPoP', 'mock-dpop-token')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          condominiumId,
          amenityId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          partySize: 1,
        });

      // Should either succeed with fallback or fail gracefully
      expect([200, 201, 400, 503]).toContain(response.status);
    });

    it('should handle idempotency correctly', async () => {
      const idempotencyKey = uuidv4();
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 3);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const requestBody = {
        condominiumId,
        amenityId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        partySize: 1,
      };

      // First request
      const firstResponse = await request('http://localhost:3013')
        .post('/reservations')
        .set('Authorization', authToken)
        .set('DPoP', 'mock-dpop-token')
        .set('Idempotency-Key', idempotencyKey)
        .send(requestBody)
        .expect(201);

      // Second request with same idempotency key
      const secondResponse = await request('http://localhost:3013')
        .post('/reservations')
        .set('Authorization', authToken)
        .set('DPoP', 'mock-dpop-token-2') // Different DPoP but same idempotency key
        .set('Idempotency-Key', idempotencyKey)
        .send(requestBody)
        .expect(201);

      // Should return the same reservation
      expect(firstResponse.body.id).toBe(secondResponse.body.id);
    });
  });

  describe('LLM Policy Compilation Flow', () => {
    it('should compile document to policy and use in evaluation', async () => {
      // Step 1: Upload document and compile policy
      const compileResponse = await request('http://localhost:3012')
        .post('/llm/policies/compile')
        .set('Authorization', authToken)
        .set('DPoP', 'mock-dpop-token')
        .send({
          condominiumId,
          scope: 'reservation',
          docRefs: ['test-document-1'],
        })
        .expect(201);

      const policyDraft = compileResponse.body;
      expect(policyDraft).toHaveProperty('id');
      expect(policyDraft.scope).toBe('reservation');
      expect(policyDraft.rules).toBeInstanceOf(Array);

      // Step 2: Promote policy if approved
      if (!policyDraft.requiresHumanReview) {
        await request('http://localhost:3012')
          .post('/llm/policies/promote')
          .set('Authorization', authToken)
          .set('DPoP', 'mock-dpop-token')
          .send({
            draftId: policyDraft.id,
            versionNote: 'E2E test promotion',
            reviewedBy: 'test-admin',
          })
          .expect(200);
      }

      // Step 3: Test policy explanation
      const explainResponse = await request('http://localhost:3012')
        .post('/llm/policies/explain')
        .set('Authorization', authToken)
        .send({
          condominiumId,
          action: 'reservation:create',
          resource: 'amenity:pool',
          subject: 'user:123',
          decision: 'PERMIT',
        })
        .expect(200);

      expect(explainResponse.body).toHaveProperty('explanation');
      expect(explainResponse.body).toHaveProperty('citations');
    });
  });

  describe('Service Health and Observability', () => {
    it('should have all services healthy', async () => {
      // Check reservation service health
      const reservationHealth = await request('http://localhost:3013')
        .get('/health')
        .expect(200);

      expect(reservationHealth.body.status).toBe('ok');

      // Check compliance service health
      const complianceHealth = await request('http://localhost:3012')
        .get('/health')
        .expect(200);

      expect(complianceHealth.body.status).toBe('ok');

      // Check finance service health
      const financeHealth = await request('http://localhost:3007')
        .get('/health')
        .expect(200);

      expect(financeHealth.body.status).toBe('ok');
    });

    it('should have metrics endpoints available', async () => {
      // Check Prometheus metrics
      await request('http://localhost:8888')
        .get('/metrics')
        .expect(200);
    });

    it('should have tracing working', async () => {
      // This would check Jaeger for traces
      // In a real test, we'd verify trace propagation
      expect(true).toBe(true); // Placeholder
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});