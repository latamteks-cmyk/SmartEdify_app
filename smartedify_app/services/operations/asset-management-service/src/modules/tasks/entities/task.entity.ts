import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Incident } from '../../incidents/entities/incident.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { Space } from '../../spaces/entities/space.entity';
import { MaintenancePlan } from '../../maintenance-plans/entities/maintenance-plan.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';

export enum TaskStatus {
  GENERATED = 'GENERATED',           // Tarea generada automáticamente
  SCHEDULED = 'SCHEDULED',           // Programada para una fecha
  CONSOLIDATED = 'CONSOLIDATED',     // Agrupada con otras tareas
  ESCALATED_TO_SOS = 'ESCALATED_TO_SOS', // Escalada a SOS
  ASSIGNED = 'ASSIGNED',             // Asignada a técnico/proveedor
  IN_PROGRESS = 'IN_PROGRESS',       // En ejecución
  COMPLETED = 'COMPLETED',           // Completada
  CANCELLED = 'CANCELLED',           // Cancelada
}

export enum TaskType {
  TECHNICAL_MAINTENANCE = 'technical_maintenance',
  SOFT_SERVICE = 'soft_service',
}

export enum TaskClassification {
  URGENT = 'URGENT',
  ORDINARY = 'ORDINARY',
  PROGRAMMABLE = 'PROGRAMMABLE',
}

@Entity('tasks')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'type'])
@Index(['tenant_id', 'classification'])
@Index(['group_id'])
@Index(['scheduled_for'])
export class Task {
  @ApiProperty({
    description: 'Unique identifier for the task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Incident that generated this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  incident_id: string;

  @ApiProperty({
    description: 'Asset related to this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  asset_id: string;

  @ApiProperty({
    description: 'Space/area related to this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  @ApiProperty({
    description: 'Maintenance plan that generated this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  plan_id: string;

  @ApiProperty({
    description: 'Group ID for consolidated tasks',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  group_id: string;

  @ApiProperty({
    description: 'Task title or summary',
    example: 'Mantenimiento preventivo ascensor Torre A',
  })
  @Column({ type: 'text', nullable: false })
  title: string;

  @ApiProperty({
    description: 'Detailed task description',
    example: 'Realizar inspección mensual del sistema de frenos y cables del ascensor principal',
  })
  @Column({ type: 'text', nullable: false })
  description: string;

  @ApiProperty({
    description: 'Current status of the task',
    enum: TaskStatus,
    example: TaskStatus.GENERATED,
  })
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.GENERATED,
  })
  status: TaskStatus;

  @ApiProperty({
    description: 'Type of task',
    enum: TaskType,
    example: TaskType.TECHNICAL_MAINTENANCE,
  })
  @Column({
    type: 'enum',
    enum: TaskType,
    nullable: false,
  })
  type: TaskType;

  @ApiProperty({
    description: 'Task classification for prioritization',
    enum: TaskClassification,
    example: TaskClassification.ORDINARY,
  })
  @Column({
    type: 'enum',
    enum: TaskClassification,
    nullable: true,
  })
  classification: TaskClassification;

  @ApiProperty({
    description: 'Scheduled execution date and time',
    example: '2023-12-15T09:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  scheduled_for: Date;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 120,
  })
  @Column({ type: 'integer', nullable: true })
  estimated_duration_minutes: number;

  @ApiProperty({
    description: 'Required skills or certifications',
    example: ['elevator_certified', 'electrical_safety'],
  })
  @Column({ type: 'jsonb', default: [] })
  required_skills: string[];

  @ApiProperty({
    description: 'Required tools and equipment',
    example: ['multimeter', 'safety_harness', 'elevator_key'],
  })
  @Column({ type: 'jsonb', default: [] })
  required_tools: string[];

  @ApiProperty({
    description: 'Required consumables and quantities',
    example: {
      'brake_oil': { quantity: 2, unit: 'liters' },
      'cleaning_cloth': { quantity: 5, unit: 'pieces' }
    },
  })
  @Column({ type: 'jsonb', default: {} })
  required_consumables: Record<string, { quantity: number; unit: string }>;

  @ApiProperty({
    description: 'Task instructions and checklist',
    example: [
      'Verificar funcionamiento de frenos',
      'Inspeccionar cables por desgaste',
      'Limpiar cabina y mecanismos',
      'Probar sistema de emergencia'
    ],
  })
  @Column({ type: 'jsonb', default: [] })
  instructions: string[];

  @ApiProperty({
    description: 'Safety requirements and precautions',
    example: {
      risk_level: 'HIGH',
      required_ppe: ['safety_harness', 'helmet', 'gloves'],
      safety_checklist: ['lockout_tagout', 'area_secured', 'emergency_contact']
    },
  })
  @Column({ type: 'jsonb', default: {} })
  safety_requirements: Record<string, any>;

  @ApiProperty({
    description: 'Additional task metadata',
    example: {
      priority_score: 85,
      complexity_level: 'medium',
      weather_dependent: false,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Task creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Task last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Incident, (incident) => incident.tasks)
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @ManyToOne(() => Asset, (asset) => asset.work_orders)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Space, (space) => space.work_orders)
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @ManyToOne(() => MaintenancePlan, (plan) => plan.tasks)
  @JoinColumn({ name: 'plan_id' })
  maintenance_plan: MaintenancePlan;

  @OneToMany(() => WorkOrder, (workOrder) => workOrder.task)
  work_orders: WorkOrder[];

  // Virtual properties
  get isGenerated(): boolean {
    return this.status === TaskStatus.GENERATED;
  }

  get isScheduled(): boolean {
    return this.status === TaskStatus.SCHEDULED;
  }

  get isConsolidated(): boolean {
    return this.status === TaskStatus.CONSOLIDATED;
  }

  get isUrgent(): boolean {
    return this.classification === TaskClassification.URGENT;
  }

  get isProgrammable(): boolean {
    return this.classification === TaskClassification.PROGRAMMABLE;
  }

  get requiresSpecialSkills(): boolean {
    return this.required_skills && this.required_skills.length > 0;
  }

  get isHighRisk(): boolean {
    return this.safety_requirements?.risk_level === 'HIGH';
  }

  get canBeConsolidated(): boolean {
    return this.status === TaskStatus.GENERATED && 
           this.classification !== TaskClassification.URGENT;
  }

  get estimatedCost(): number | null {
    // Basic cost estimation based on duration and type
    if (!this.estimated_duration_minutes) return null;
    
    const hourlyRate = this.type === TaskType.TECHNICAL_MAINTENANCE ? 50 : 25; // USD per hour
    return Math.round((this.estimated_duration_minutes / 60) * hourlyRate);
  }
}