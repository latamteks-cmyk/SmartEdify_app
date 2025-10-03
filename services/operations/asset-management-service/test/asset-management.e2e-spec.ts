import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AssetType, AssetCategory, AssetCriticality } from '../src/modules/assets/entities/asset.entity';
import { SpaceCategory, SpaceComplexity } from '../src/modules/spaces/entities/space.entity';
import { IncidentPriority, IncidentSource, TaskType, TaskClassification } from '../src/modules/incidents/entities/incident.entity';
import { WorkOrderType, WorkOrderPriority, WorkOrderStatus } from '../src/modules/work-orders/entities/work-order.entity';

describe('Asset Management Service - E2E Complete Flows', () => {
  let app: INestApplication;
  let assetId: string;
  let softAssetId: string;
  let spaceId: string;
  let incidentId: string;
  let taskId: string;
  let workOrderId: string;
  let maintenancePlanId: string;
  let consumableId: string;

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

  describe('Health Checks', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/assets/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/assets/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('asset-management-service');
        });
    });
  });

  describe('Setup: Create Base Entities', () => {
    it('should create a space for testing', () => {
      const createSpaceDto = {
        name: 'Lobby Principal Torre A',
        category: SpaceCategory.LOBBY,
        usable_floor_area_m2: 150.5,
        perimeter_m: 48.0,
        wall_height_m: 3.2,
        complexity: SpaceComplexity.M,
        metadata: {
          ceiling_type: 'suspended',
          lighting_type: 'LED',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/spaces')
        .send(createSpaceDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe(createSpaceDto.name);
          expect(res.body.category).toBe(createSpaceDto.category);
          expect(res.body.wall_area_m2).toBe(153.6); // Calculated field
          expect(res.body.total_area).toBeDefined();
          spaceId = res.body.id;
        });
    });

    it('should create a hard asset (elevator)', () => {
      const createAssetDto = {
        space_id: spaceId,
        name: 'Ascensor Principal Torre A',
        type: AssetType.HARD,
        category: AssetCategory.ELEVATOR,
        criticality: AssetCriticality.A,
        brand: 'Otis',
        model: 'Gen2 Premier',
        serial_number: 'OT2023001234',
        warranty_until: '2025-12-31',
        metadatos: {
          capacity: '8 persons',
          floors_served: 15,
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/assets')
        .send(createAssetDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.type).toBe(AssetType.HARD);
          expect(res.body.category).toBe(AssetCategory.ELEVATOR);
          expect(res.body.is_under_warranty).toBe(true);
          assetId = res.body.id;
        });
    });

    it('should create a soft asset (garden)', () => {
      const createAssetDto = {
        space_id: spaceId,
        name: 'Jardín Frontal',
        type: AssetType.SOFT,
        category: AssetCategory.GARDEN,
        criticality: AssetCriticality.B,
        metadatos: {
          plant_types: ['roses', 'palm_trees'],
          irrigation_system: 'automatic',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/assets')
        .send(createAssetDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.type).toBe(AssetType.SOFT);
          expect(res.body.category).toBe(AssetCategory.GARDEN);
          softAssetId = res.body.id;
        });
    });

    it('should create a consumable item', () => {
      const createConsumableDto = {
        name: 'Aceite Hidráulico SAE 32',
        category: 'lubricants',
        unit: 'liters',
        current_stock: 50,
        min_stock: 10,
        unit_cost: 25.50,
        supplier: 'Lubricantes Industriales SA',
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/consumables')
        .send(createConsumableDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe(createConsumableDto.name);
          expect(res.body.current_stock).toBe(50);
          consumableId = res.body.id;
        });
    });
  });

  describe('Incident Management Flow', () => {
    it('should create an incident for the elevator', () => {
      const createIncidentDto = {
        asset_id: assetId,
        title: 'Ascensor hace ruido extraño',
        description: 'El ascensor emite un ruido metálico al subir entre los pisos 5 y 6',
        priority: IncidentPriority.HIGH,
        source: IncidentSource.RESIDENT_APP,
        reported_by: 'Juan Pérez - Apt 502',
        metadata: {
          floor_affected: '5-6',
          sound_type: 'metallic',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/incidents')
        .send(createIncidentDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe(createIncidentDto.title);
          expect(res.body.priority).toBe(IncidentPriority.HIGH);
          expect(res.body.status).toBe('open');
          incidentId = res.body.id;
        });
    });

    it('should create a task for the incident', () => {
      const createTaskDto = {
        incident_id: incidentId,
        title: 'Inspeccionar sistema de poleas',
        description: 'Revisar el estado de las poleas y cables del ascensor',
        type: TaskType.TECHNICAL_MAINTENANCE,
        classification: TaskClassification.URGENT,
        estimated_duration_minutes: 120,
        assigned_to: 'Técnico Ascensores',
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/tasks')
        .send(createTaskDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe(createTaskDto.title);
          expect(res.body.type).toBe(TaskType.TECHNICAL_MAINTENANCE);
          expect(res.body.status).toBe('pending');
          taskId = res.body.id;
        });
    });

    it('should update task status to in_progress', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/assets/tasks/${taskId}`)
        .send({ status: 'in_progress' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('in_progress');
          expect(res.body.started_at).toBeDefined();
        });
    });

    it('should complete the task', () => {
      const updateTaskDto = {
        status: 'completed',
        completion_report: {
          notes: 'Se encontró desgaste en polea principal. Requiere reemplazo.',
        },
        actual_duration_minutes: 90,
      };

      return request(app.getHttpServer())
        .patch(`/api/v1/assets/tasks/${taskId}`)
        .send(updateTaskDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('completed');
          expect(res.body.actual_end).toBeDefined();
          expect(res.body.completion_report.notes).toBe(updateTaskDto.completion_report.notes);
        });
    });
  });

  describe('Work Order Management Flow', () => {
    it('should create a work order for elevator repair', () => {
      const createWorkOrderDto = {
        asset_id: assetId,
        incident_id: incidentId,
        title: 'Reemplazo de polea principal ascensor',
        description: 'Reemplazar polea principal desgastada del ascensor Torre A',
        type: WorkOrderType.CORRECTIVE,
        priority: WorkOrderPriority.HIGH,
        estimated_duration_minutes: 240,
        metadata: {
          estimated_cost: 1500.00,
        },
        assigned_contractor: 'Mantenimiento Ascensores Pro',
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/work-orders')
        .send(createWorkOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe(createWorkOrderDto.title);
          expect(res.body.status).toBe(WorkOrderStatus.CREATED);
          expect(res.body.metadata.estimated_cost).toBe(1500.00);
          workOrderId = res.body.id;
        });
    });

    it('should approve the work order', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/assets/work-orders/${workOrderId}`)
        .send({ 
          status: WorkOrderStatus.ASSIGNED,
          assigned_to: 'Manager Operaciones',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(WorkOrderStatus.ASSIGNED);
          expect(res.body.assigned_to).toBe('Manager Operaciones');
        });
    });

    it('should start work order execution', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/assets/work-orders/${workOrderId}`)
        .send({ 
          status: WorkOrderStatus.IN_PROGRESS,
          actual_start: new Date().toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(WorkOrderStatus.IN_PROGRESS);
          expect(res.body.actual_start).toBeDefined();
        });
    });

    it('should complete the work order', () => {
      const completionData = {
        status: WorkOrderStatus.COMPLETED,
        actual_end: new Date().toISOString(),
        actual_duration_minutes: 210,
        completion_report: {
          work_performed: 'Polea reemplazada exitosamente. Ascensor funcionando normalmente.',
          quality_rating: 5,
        },
        consumables_used: {
          'aceite_hidraulico': { planned: 2, used: 2, unit: 'liters' },
        },
        metadata: {
          actual_cost: 1450.00,
        },
      };

      return request(app.getHttpServer())
        .patch(`/api/v1/assets/work-orders/${workOrderId}`)
        .send(completionData)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(WorkOrderStatus.COMPLETED);
          expect(res.body.metadata.actual_cost).toBe(1450.00);
          expect(res.body.completion_report).toBeDefined();
        });
    });
  });

  describe('Maintenance Plan Management', () => {
    it('should create a preventive maintenance plan for the elevator', () => {
      const createMaintenancePlanDto = {
        asset_id: assetId,
        name: 'Mantenimiento Preventivo Ascensor Torre A',
        description: 'Plan de mantenimiento preventivo mensual para ascensor principal',
        maintenance_type: 'PREVENTIVE',
        trigger_type: 'TIME_BASED',
        frequency_days: 30,
        estimated_duration_minutes: 180,
        estimated_cost: 800.00,
        tasks: [
          {
            title: 'Inspección general del sistema',
            description: 'Revisar cables, poleas, frenos y sistema eléctrico',
            estimated_duration_minutes: 90,
          },
          {
            title: 'Lubricación de componentes',
            description: 'Aplicar lubricante a poleas y guías',
            estimated_duration_minutes: 60,
          },
          {
            title: 'Pruebas de seguridad',
            description: 'Verificar funcionamiento de frenos de emergencia',
            estimated_duration_minutes: 30,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/maintenance-plans')
        .send(createMaintenancePlanDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe(createMaintenancePlanDto.name);
          expect(res.body.maintenance_type).toBe('PREVENTIVE');
          expect(res.body.is_active).toBe(true);
          expect(res.body.tasks).toHaveLength(3);
          maintenancePlanId = res.body.id;
        });
    });

    it('should generate next maintenance work order from plan', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/assets/maintenance-plans/${maintenancePlanId}/generate-work-order`)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.type).toBe(WorkOrderType.PREVENTIVE);
          expect(res.body.maintenance_plan_id).toBe(maintenancePlanId);
          expect(res.body.status).toBe(WorkOrderStatus.CREATED);
        });
    });
  });

  describe('Asset Queries and Reports', () => {
    it('should get asset with all related data', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/assets/assets/${assetId}?include=space,incidents,work_orders,maintenance_plans`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(assetId);
          expect(res.body.space).toBeDefined();
          expect(res.body.incidents).toHaveLength(1);
          expect(res.body.work_orders.length).toBeGreaterThan(0);
          expect(res.body.maintenance_plans).toHaveLength(1);
        });
    });

    it('should get assets by criticality', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/assets/assets?criticality=${AssetCriticality.A}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].criticality).toBe(AssetCriticality.A);
        });
    });

    it('should get assets by space', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/assets/assets?space_id=${spaceId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2); // Hard and soft assets
          expect(res.body.data.every((asset: any) => asset.space_id === spaceId)).toBe(true);
        });
    });

    it('should get maintenance cost report', () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      return request(app.getHttpServer())
        .get(`/api/v1/assets/reports/maintenance-costs?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total_cost).toBeDefined();
          expect(res.body.by_asset).toBeDefined();
          expect(res.body.by_type).toBeDefined();
        });
    });

    it('should get asset performance metrics', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/assets/assets/${assetId}/metrics`)
        .expect(200)
        .expect((res) => {
          expect(res.body.uptime_percentage).toBeDefined();
          expect(res.body.total_incidents).toBeDefined();
          expect(res.body.total_work_orders).toBeDefined();
          expect(res.body.maintenance_cost_ytd).toBeDefined();
        });
    });
  });

  describe('Consumables Management', () => {
    it('should update consumable stock after work order completion', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/assets/consumables/${consumableId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.current_stock).toBe(48); // 50 - 2 used in work order
        });
    });

    it('should get low stock consumables', () => {
      return request(app.getHttpServer())
        .get('/api/v1/assets/consumables?low_stock=true')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should restock consumable', () => {
      const restockDto = {
        quantity: 25,
        unit_cost: 26.00,
        supplier: 'Lubricantes Industriales SA',
        notes: 'Restock mensual programado',
      };

      return request(app.getHttpServer())
        .post(`/api/v1/assets/consumables/${consumableId}/restock`)
        .send(restockDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.current_stock).toBe(73); // 48 + 25
          expect(res.body.restock_history).toBeDefined();
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent asset', () => {
      return request(app.getHttpServer())
        .get('/api/v1/assets/assets/non-existent-id')
        .expect(404);
    });

    it('should return 400 for invalid asset creation', () => {
      const invalidAssetDto = {
        name: '', // Empty name should fail validation
        type: 'INVALID_TYPE',
      };

      return request(app.getHttpServer())
        .post('/api/v1/assets/assets')
        .send(invalidAssetDto)
        .expect(400);
    });

    it('should return 400 for invalid work order status transition', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/assets/work-orders/${workOrderId}`)
        .send({ status: WorkOrderStatus.CREATED }) // Cannot go back to created from completed
        .expect(400);
    });
  });

  describe('Cleanup', () => {
    it('should deactivate maintenance plan', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/assets/maintenance-plans/${maintenancePlanId}`)
        .send({ is_active: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.is_active).toBe(false);
        });
    });

    it('should close incident', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/assets/incidents/${incidentId}`)
        .send({ 
          status: 'closed',
          resolution: 'Problema resuelto con reemplazo de polea',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('closed');
          expect(res.body.resolution).toBeDefined();
        });
    });
  });
});