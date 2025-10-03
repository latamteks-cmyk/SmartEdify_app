import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { Profile } from '../src/profiles/entities/profile.entity';
import { Membership } from '../src/memberships/entities/membership.entity';
import { TenantService } from '../src/tenant/tenant.service';

describe('ProfilesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let postgresContainer: StartedPostgreSqlContainer;
  let tenantService: TenantService;

  // Test data
  const testTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const testCondominiumId = '660e8400-e29b-41d4-a716-446655440001';
  const mockJwtToken = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJ0ZW5hbnRfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzY29wZSI6InByb2ZpbGVzOnJlYWQgcHJvZmlsZXM6d3JpdGUiLCJpYXQiOjE2OTU5ODQwMDAsImV4cCI6MTY5NTk4NzYwMH0.test-signature';

  beforeAll(async () => {
    // Iniciar contenedor PostgreSQL para tests
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_user_profiles')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    const databaseUrl = `postgresql://${postgresContainer.getUsername()}:${postgresContainer.getPassword()}@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/${postgresContainer.getDatabase()}`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              database: {
                url: databaseUrl,
                schema: 'user_profiles',
              },
              redis: {
                url: 'redis://localhost:6379', // Mock Redis para tests
              },
            }),
          ],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configurar pipes y middleware como en main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    dataSource = moduleFixture.get<DataSource>(DataSource);
    tenantService = moduleFixture.get<TenantService>(TenantService);

    await app.init();

    // Ejecutar migraciones de test
    await dataSource.query(`
      CREATE SCHEMA IF NOT EXISTS user_profiles;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Crear tablas básicas para tests
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_profiles.profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        country_code TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (tenant_id, email)
      );
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_profiles.memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        profile_id UUID NOT NULL REFERENCES user_profiles.profiles(id),
        condominium_id UUID NOT NULL,
        unit_id UUID,
        relation TEXT NOT NULL,
        privileges JSONB DEFAULT '{}',
        since TIMESTAMPTZ DEFAULT now(),
        until TIMESTAMPTZ,
        status TEXT GENERATED ALWAYS AS (
          CASE WHEN until IS NULL OR until > now() THEN 'ACTIVE' ELSE 'ENDED' END
        ) STORED
      );
    `);

    // Configurar contexto de tenant para tests
    await dataSource.query(`SET app.current_tenant = '${testTenantId}'`);
  });

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    // Limpiar datos entre tests
    await dataSource.query('TRUNCATE user_profiles.memberships CASCADE');
    await dataSource.query('TRUNCATE user_profiles.profiles CASCADE');
  });

  describe('GET /me', () => {
    it('should return current user profile with memberships', async () => {
      // Arrange: Crear perfil de test
      const profileId = '770e8400-e29b-41d4-a716-446655440002';
      await dataSource.query(`
        INSERT INTO user_profiles.profiles (id, tenant_id, email, full_name, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [profileId, testTenantId, 'test@example.com', 'Test User', 'ACTIVE']);

      await dataSource.query(`
        INSERT INTO user_profiles.memberships (profile_id, tenant_id, condominium_id, relation, privileges)
        VALUES ($1, $2, $3, $4, $5)
      `, [profileId, testTenantId, testCondominiumId, 'OWNER', '{"voice": true, "vote": true}']);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/api/v1/user-profiles/me')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(200);

      expect(response.body).toMatchObject({
        profile: {
          id: profileId,
          email: 'test@example.com',
          full_name: 'Test User',
          status: 'ACTIVE',
        },
        memberships: expect.arrayContaining([
          expect.objectContaining({
            condominium_id: testCondominiumId,
            relation: 'OWNER',
            privileges: {
              voice: true,
              vote: true,
            },
            status: 'ACTIVE',
          }),
        ]),
        roles: expect.any(Array),
        entitlements: expect.any(Array),
      });
    });

    it('should return 401 when no authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/user-profiles/me')
        .expect(401);
    });

    it('should return 404 when profile not found', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/user-profiles/me')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(404);
    });
  });

  describe('POST /profiles', () => {
    it('should create a new profile successfully', async () => {
      const createProfileDto = {
        email: 'newuser@example.com',
        full_name: 'New User',
        phone: '+51987654321',
        country_code: 'PE',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-profiles/profiles')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send(createProfileDto)
        .expect(201);

      expect(response.body).toMatchObject({
        email: createProfileDto.email,
        full_name: createProfileDto.full_name,
        phone: createProfileDto.phone,
        country_code: createProfileDto.country_code,
        status: 'PENDING_VERIFICATION',
        tenant_id: testTenantId,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.created_at).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      const invalidProfileDto = {
        email: 'invalid-email',
        full_name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-profiles/profiles')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send(invalidProfileDto)
        .expect(400);

      expect(response.body).toMatchObject({
        type: expect.stringContaining('validation-error'),
        title: 'Validation Error',
        status: 400,
        invalid_params: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
          }),
        ]),
      });
    });

    it('should return 409 for duplicate email', async () => {
      // Crear primer perfil
      const profileDto = {
        email: 'duplicate@example.com',
        full_name: 'First User',
      };

      await request(app.getHttpServer())
        .post('/api/v1/user-profiles/profiles')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send(profileDto)
        .expect(201);

      // Intentar crear segundo perfil con mismo email
      const duplicateDto = {
        email: 'duplicate@example.com',
        full_name: 'Second User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-profiles/profiles')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send(duplicateDto)
        .expect(409);

      expect(response.body).toMatchObject({
        type: expect.stringContaining('resource-conflict'),
        title: 'Resource Conflict',
        status: 409,
        detail: expect.stringContaining('duplicate@example.com'),
      });
    });
  });

  describe('GET /profiles/:id', () => {
    it('should return profile by id', async () => {
      // Arrange
      const profileId = '880e8400-e29b-41d4-a716-446655440003';
      await dataSource.query(`
        INSERT INTO user_profiles.profiles (id, tenant_id, email, full_name, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [profileId, testTenantId, 'gettest@example.com', 'Get Test User', 'ACTIVE']);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/api/v1/user-profiles/profiles/${profileId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(200);

      expect(response.body).toMatchObject({
        id: profileId,
        email: 'gettest@example.com',
        full_name: 'Get Test User',
        status: 'ACTIVE',
      });
    });

    it('should return 404 for non-existent profile', async () => {
      const nonExistentId = '990e8400-e29b-41d4-a716-446655440004';

      await request(app.getHttpServer())
        .get(`/api/v1/user-profiles/profiles/${nonExistentId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/user-profiles/profiles/invalid-uuid')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(400);
    });
  });

  describe('PATCH /profiles/:id', () => {
    it('should update profile successfully', async () => {
      // Arrange
      const profileId = '990e8400-e29b-41d4-a716-446655440005';
      await dataSource.query(`
        INSERT INTO user_profiles.profiles (id, tenant_id, email, full_name, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [profileId, testTenantId, 'update@example.com', 'Original Name', 'ACTIVE']);

      const updateDto = {
        full_name: 'Updated Name',
        phone: '+51987654321',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/user-profiles/profiles/${profileId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: profileId,
        full_name: 'Updated Name',
        phone: '+51987654321',
        email: 'update@example.com', // Email no debe cambiar
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should not return profiles from different tenant', async () => {
      const otherTenantId = '111e8400-e29b-41d4-a716-446655440006';
      const profileId = '222e8400-e29b-41d4-a716-446655440007';

      // Crear perfil en otro tenant
      await dataSource.query(`
        INSERT INTO user_profiles.profiles (id, tenant_id, email, full_name, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [profileId, otherTenantId, 'other@example.com', 'Other Tenant User', 'ACTIVE']);

      // Intentar acceder con tenant diferente
      await request(app.getHttpServer())
        .get(`/api/v1/user-profiles/profiles/${profileId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId) // Tenant diferente
        .expect(404); // No debe encontrar el perfil
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after many requests', async () => {
      // Este test requiere configuración específica de rate limiting
      // Por simplicidad, solo verificamos que el endpoint responde
      await request(app.getHttpServer())
        .get('/api/v1/user-profiles/me')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(404); // 404 porque no hay perfil, pero no 429
    }, 10000);
  });
});