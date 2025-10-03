import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Asset } from '../../assets/entities/asset.entity';
import { Space } from '../../spaces/entities/space.entity';
import { Task } from '../../tasks/entities/task.entity';

export enum WorkOrderType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  INSPECTION = 'INSPECTION',
  CLEANING = 'CLEANING',
  REPAIR = 'REPAIR',
}

export enum WorkOrderStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AssigneeType {
  INTERNAL_TECH = 'INTERNAL_TECH',
  EXTERNAL_PROVIDER = 'EXTERNAL_PROVIDER',
  TEAM = 'TEAM',
}

@Entity('work_orders')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'type'])
@Index(['tenant_id', 'priority'])
@Index(['assigned_to'])
@Index(['scheduled_start'])
@Index(['due_date'])
export class WorkOrder {
  @ApiProperty({
    description: 'Unique identifier for the work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Task that generated this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  task_id: string;

  @ApiProperty({
    description: 'Asset related to this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  asset_id: string;

  @ApiProperty({
    description: 'Space/area related to this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  @ApiProperty({
    description: 'Work order number (human-readable)',
    example: 'WO-2023-001234',
  })
  @Column({ type: 'text', nullable: false, unique: true })
  work_order_number: string;

  @ApiProperty({
    description: 'Work order title',
    example: 'Mantenimiento preventivo ascensor Torre A',
  })
  @Column({ type: 'text', nullable: false })
  title: string;

  @ApiProperty({
    description: 'Detailed work description',
    example: 'Realizar inspección completa del sistema de frenos, cables y mecanismos del ascensor',
  })
  @Column({ type: 'text', nullable: false })
  description: string;

  @ApiProperty({
    description: 'Type of work order',
    enum: WorkOrderType,
    example: WorkOrderType.PREVENTIVE,
  })
  @Column({
    type: 'enum',
    enum: WorkOrderType,
    nullable: false,
  })
  type: WorkOrderType;

  @ApiProperty({
    description: 'Current status of the work order',
    enum: WorkOrderStatus,
    example: WorkOrderStatus.CREATED,
  })
  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.CREATED,
  })
  status: WorkOrderStatus;

  @ApiProperty({
    description: 'Priority level',
    enum: WorkOrderPriority,
    example: WorkOrderPriority.MEDIUM,
  })
  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
  })
  priority: WorkOrderPriority;

  @ApiProperty({
    description: 'Who/what is assigned to this work order',
    example: 'tech_123456789',
  })
  @Column({ type: 'text', nullable: true })
  assigned_to: string;

  @ApiProperty({
    description: 'Type of assignee',
    enum: AssigneeType,
    example: AssigneeType.INTERNAL_TECH,
  })
  @Column({
    type: 'enum',
    enum: AssigneeType,
    nullable: true,
  })
  assignee_type: AssigneeType;

  @ApiProperty({
    description: 'User who created the work order',
    example: 'admin_123456789',
  })
  @Column({ type: 'text', nullable: false })
  created_by: string;

  @ApiProperty({
    description: 'Scheduled start date and time',
    example: '2023-12-15T09:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  scheduled_start: Date;

  @ApiProperty({
    description: 'Scheduled end date and time',
    example: '2023-12-15T12:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  scheduled_end: Date;

  @ApiProperty({
    description: 'Due date for completion',
    example: '2023-12-15T18:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  due_date: Date;

  @ApiProperty({
    description: 'Actual start timestamp',
    example: '2023-12-15T09:15:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  actual_start: Date;

  @ApiProperty({
    description: 'Actual completion timestamp',
    example: '2023-12-15T11:45:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  actual_end: Date;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 180,
  })
  @Column({ type: 'integer', nullable: true })
  estimated_duration_minutes: number;

  @ApiProperty({
    description: 'Actual duration in minutes',
    example: 150,
  })
  @Column({ type: 'integer', nullable: true })
  actual_duration_minutes: number;

  @ApiProperty({
    description: 'Required skills and certifications',
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
    description: 'Work instructions and checklist',
    example: [
      'Verificar funcionamiento de frenos',
      'Inspeccionar cables por desgaste',
      'Limpiar cabina y mecanismos'
    ],
  })
  @Column({ type: 'jsonb', default: [] })
  instructions: string[];

  @ApiProperty({
    description: 'Safety requirements and high-risk checklist',
    example: {
      risk_level: 'HIGH',
      safety_checklist_completed: false,
      required_ppe: ['safety_harness', 'helmet'],
      safety_officer_approval: false,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  safety_requirements: Record<string, any>;

  @ApiProperty({
    description: 'Location validation information',
    example: {
      qr_code_scanned: false,
      qr_code_id: 'QR_ELEVATOR_A_001',
      location_confirmed_at: null,
      gps_coordinates: { lat: -12.0464, lng: -77.0428 },
    },
  })
  @Column({ type: 'jsonb', default: {} })
  location_validation: Record<string, any>;

  @ApiProperty({
    description: 'Consumables used during execution',
    example: {
      'brake_oil': { planned: 2, used: 1.5, unit: 'liters' },
      'cleaning_cloth': { planned: 5, used: 3, unit: 'pieces' }
    },
  })
  @Column({ type: 'jsonb', default: {} })
  consumables_used: Record<string, { planned: number; used: number; unit: string }>;

  @ApiProperty({
    description: 'Work completion report',
    example: {
      work_performed: 'Mantenimiento completado según checklist',
      issues_found: ['Desgaste menor en cable secundario'],
      recommendations: ['Reemplazar cable en próximo mantenimiento'],
      quality_rating: 5,
      photos: ['https://cdn.smartedify.com/wo/photo1.jpg'],
    },
  })
  @Column({ type: 'jsonb', default: {} })
  completion_report: Record<string, any>;

  @ApiProperty({
    description: 'Supervisor approval information',
    example: {
      approved_by: 'supervisor_123',
      approved_at: '2023-12-15T12:00:00Z',
      approval_notes: 'Trabajo completado satisfactoriamente',
      quality_score: 9,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  supervisor_approval: Record<string, any>;

  @ApiProperty({
    description: 'Resident feedback (optional)',
    example: {
      feedback_provided: true,
      rating: 5,
      comments: 'Excelente trabajo, muy profesional',
      feedback_date: '2023-12-15T14:00:00Z',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  resident_feedback: Record<string, any>;

  @ApiProperty({
    description: 'Additional work order metadata',
    example: {
      cost_estimate: 150.00,
      actual_cost: 135.50,
      currency: 'USD',
      purchase_order_id: 'PO-2023-001',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Work order creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Work order last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Task, (task) => task.work_orders)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Asset, (asset) => asset.work_orders)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Space, (space) => space.work_orders)
  @JoinColumn({ name: 'space_id' })
  space: Space;

  // Virtual properties
  get isCreated(): boolean {
    return this.status === WorkOrderStatus.CREATED;
  }

  get isAssigned(): boolean {
    return this.status === WorkOrderStatus.ASSIGNED;
  }

  get isInProgress(): boolean {
    return this.status === WorkOrderStatus.IN_PROGRESS;
  }

  get isCompleted(): boolean {
    return this.status === WorkOrderStatus.COMPLETED;
  }

  get isApproved(): boolean {
    return this.status === WorkOrderStatus.APPROVED;
  }

  get isCritical(): boolean {
    return this.priority === WorkOrderPriority.CRITICAL;
  }

  get isEmergency(): boolean {
    return this.type === WorkOrderType.EMERGENCY;
  }

  get isOverdue(): boolean {
    if (!this.due_date) return false;
    return new Date() > this.due_date && !this.isCompleted;
  }

  get requiresSafetyChecklist(): boolean {
    return this.safety_requirements?.risk_level === 'HIGH';
  }

  get safetyChecklistCompleted(): boolean {
    return this.safety_requirements?.safety_checklist_completed === true;
  }

  get locationValidated(): boolean {
    return this.location_validation?.qr_code_scanned === true ||
           this.location_validation?.location_confirmed_at !== null;
  }

  get hasCompletionReport(): boolean {
    return this.completion_report && Object.keys(this.completion_report).length > 0;
  }

  get isSupervisorApproved(): boolean {
    return this.supervisor_approval?.approved_by !== undefined;
  }

  get hasResidentFeedback(): boolean {
    return this.resident_feedback?.feedback_provided === true;
  }

  get actualDurationHours(): number | null {
    return this.actual_duration_minutes ? Math.round(this.actual_duration_minutes / 60 * 100) / 100 : null;
  }

  get estimatedDurationHours(): number | null {
    return this.estimated_duration_minutes ? Math.round(this.estimated_duration_minutes / 60 * 100) / 100 : null;
  }

  get durationVariancePercentage(): number | null {
    if (!this.estimated_duration_minutes || !this.actual_duration_minutes) return null;
    
    const variance = this.actual_duration_minutes - this.estimated_duration_minutes;
    return Math.round((variance / this.estimated_duration_minutes) * 100);
  }

  get canStart(): boolean {
    return this.status === WorkOrderStatus.ASSIGNED && 
           (!this.requiresSafetyChecklist || this.safetyChecklistCompleted);
  }

  get canComplete(): boolean {
    return this.status === WorkOrderStatus.IN_PROGRESS && 
           this.locationValidated;
  }
}