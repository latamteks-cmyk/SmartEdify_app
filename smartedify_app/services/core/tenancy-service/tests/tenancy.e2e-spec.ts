import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TenantType } from '../src/modules/tenants/entities/tenant.entity';
import { UnitKind, CommonAreaType } from '../src/modules/units/entities/unit.entity';

describe('Tenancy Service (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let condominiumId: string;
  let buildingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/tenancy/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenancy/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenancy/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('/api/v1/tenancy/tenants (POST)', () => {
    it('should create a new tenant', () => {
      const createTenantDto = {
        type: TenantType.ADMINISTRADORA,
        legal_name: 'Test Administradora S.A.C.',
        country_code: 'PE',
        metadata: {
          tax_id: '20123456789',
          contact_email: 'admin@test.com',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/tenants')
        .send(createTenantDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.type).toBe(TenantType.ADMINISTRADORA);
          expect(res.body.legal_name).toBe(createTenantDto.legal_name);
          expect(res.body.country_code).toBe(createTenantDto.country_code);
          expect(res.body.status).toBe('ACTIVE');
          tenantId = res.body.id;
        });
    });

    it('should fail to create tenant with duplicate legal name', () => {
      const createTenantDto = {
        type: TenantType.JUNTA,
        legal_name: 'Test Administradora S.A.C.', // Same as previous
        country_code: 'PE',
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/tenants')
        .send(createTenantDto)
        .expect(409)
        .expect((res) => {
          expect(res.body.type).toContain('conflict');
          expect(res.body.detail).toContain('already exists');
        });
    });

    it('should fail with invalid country code', () => {
      const createTenantDto = {
        type: TenantType.JUNTA,
        legal_name: 'Another Test Tenant',
        country_code: 'INVALID',
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/tenants')
        .send(createTenantDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.type).toContain('validation-error');
        });
    });
  });

  describe('/api/v1/tenancy/tenants/:id (GET)', () => {
    it('should get tenant by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tenancy/tenants/${tenantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(tenantId);
          expect(res.body.type).toBe(TenantType.ADMINISTRADORA);
        });
    });

    it('should return 404 for non-existent tenant', () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/api/v1/tenancy/tenants/${fakeId}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.type).toContain('not-found');
        });
    });
  });

  describe('/api/v1/tenancy/condominiums (POST)', () => {
    it('should create a new condominium', () => {
      const createCondominiumDto = {
        tenant_id: tenantId,
        name: 'Residencial Test',
        address: 'Av. Test 123, Lima',
        country_code: 'PE',
        financial_profile: {
          currency: 'PEN',
          aliquot_calculation: 'by_area',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/condominiums')
        .send(createCondominiumDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.tenant_id).toBe(tenantId);
          expect(res.body.name).toBe(createCondominiumDto.name);
          expect(res.body.status).toBe('ACTIVE');
          condominiumId = res.body.id;
        });
    });
  });

  describe('/api/v1/tenancy/buildings (POST)', () => {
    it('should create a new building', () => {
      const createBuildingDto = {
        condominium_id: condominiumId,
        name: 'Torre A',
        levels: 15,
        meta: {
          elevator_count: 2,
          construction_year: 2020,
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/buildings')
        .send(createBuildingDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.condominium_id).toBe(condominiumId);
          expect(res.body.name).toBe(createBuildingDto.name);
          expect(res.body.levels).toBe(createBuildingDto.levels);
          buildingId = res.body.id;
        });
    });
  });

  describe('/api/v1/tenancy/units (POST)', () => {
    it('should create a private unit', () => {
      const createUnitDto = {
        condominium_id: condominiumId,
        local_code: 'A-101',
        kind: UnitKind.PRIVATE,
        building_id: buildingId,
        aliquot: 0.025,
        floor: '1',
        area_m2: 85.5,
        meta: {
          rooms: 3,
          bathrooms: 2,
          parking_spaces: 1,
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/units')
        .send(createUnitDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.condominium_id).toBe(condominiumId);
          expect(res.body.local_code).toBe(createUnitDto.local_code);
          expect(res.body.kind).toBe(UnitKind.PRIVATE);
          expect(res.body.aliquot).toBe('0.0250'); // Decimal precision
        });
    });

    it('should create a common area unit', () => {
      const createUnitDto = {
        condominium_id: condominiumId,
        local_code: 'AC-POOL',
        kind: UnitKind.COMMON,
        common_type: CommonAreaType.POOL,
        cost_center_id: 'CC-001',
        revenue_cfg: {
          reservation: {
            hour_price: 25,
            currency: 'PEN',
            min_block: 60,
          },
          penalties: {
            no_show: 15,
            late_cancel_pct: 50,
          },
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/units')
        .send(createUnitDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.kind).toBe(UnitKind.COMMON);
          expect(res.body.common_type).toBe(CommonAreaType.POOL);
          expect(res.body.revenue_cfg.reservation.hour_price).toBe(25);
        });
    });

    it('should fail to create unit with duplicate local_code', () => {
      const createUnitDto = {
        condominium_id: condominiumId,
        local_code: 'A-101', // Duplicate
        kind: UnitKind.PRIVATE,
        building_id: buildingId,
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/units')
        .send(createUnitDto)
        .expect(409)
        .expect((res) => {
          expect(res.body.type).toContain('conflict');
          expect(res.body.detail).toContain('already exists');
        });
    });

    it('should fail to create common unit without common_type', () => {
      const createUnitDto = {
        condominium_id: condominiumId,
        local_code: 'AC-GYM',
        kind: UnitKind.COMMON,
        // Missing common_type
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/units')
        .send(createUnitDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.type).toContain('validation-error');
        });
    });
  });

  describe('/api/v1/tenancy/units (GET)', () => {
    it('should list units with filters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenancy/units')
        .query({
          condominium_id: condominiumId,
          kind: UnitKind.PRIVATE,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.data[0].kind).toBe(UnitKind.PRIVATE);
        });
    });

    it('should list common areas only', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenancy/units')
        .query({
          condominium_id: condominiumId,
          kind: UnitKind.COMMON,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.every((unit: any) => unit.kind === UnitKind.COMMON)).toBe(true);
        });
    });
  });

  describe('Bulk Operations', () => {
    it('should validate bulk unit creation', () => {
      const bulkCreateDto = {
        units: [
          {
            condominium_id: condominiumId,
            local_code: 'A-201',
            kind: UnitKind.PRIVATE,
            building_id: buildingId,
            aliquot: 0.025,
          },
          {
            condominium_id: condominiumId,
            local_code: 'A-202',
            kind: UnitKind.PRIVATE,
            building_id: buildingId,
            aliquot: 0.025,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/units/bulk/validate')
        .send(bulkCreateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
          expect(res.body.summary.total_units).toBe(2);
          expect(res.body.summary.private_units).toBe(2);
        });
    });

    it('should execute bulk unit creation', () => {
      const bulkCreateDto = {
        units: [
          {
            condominium_id: condominiumId,
            local_code: 'A-301',
            kind: UnitKind.PRIVATE,
            building_id: buildingId,
            aliquot: 0.025,
          },
          {
            condominium_id: condominiumId,
            local_code: 'A-302',
            kind: UnitKind.PRIVATE,
            building_id: buildingId,
            aliquot: 0.025,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/v1/tenancy/units/bulk/execute')
        .send(bulkCreateDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.created_count).toBe(2);
          expect(res.body.units).toHaveLength(2);
        });
    });
  });
});