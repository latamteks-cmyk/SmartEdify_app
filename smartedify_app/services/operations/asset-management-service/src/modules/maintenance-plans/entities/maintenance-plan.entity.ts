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
import { Asset } from '../../assets/entities/asset.entity';
import { Space } from '../../spaces/entities/space.entity';
import { Task } from '../../tasks/entities/task.entity';

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',     // Mantenimiento preventivo
  PREDICTIVE = 'PREDICTIVE',     // Mantenimiento predictivo
  CORRECTIVE = 'CORRECTIVE',     // Mantenimiento correctivo
  CONDITION_BASED = 'CONDITION_BASED', // Basado en condición
}

export enum TriggerType {
  TIME_BASED = 'TIME_BASED',     // Basado en tiempo (frecuencia)
  USAGE_BASED = 'USAGE_BASED',   // Basado en uso (horas de operación)
  CONDITION_BASED = 'CONDITION_BASED', // Basado en condición (sensores IoT)
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
}

export enum FrequencyUnit {
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS',
  HOURS = 'HOURS',
  CYCLES = 'CYCLES',
}

@Entity('maintenance_plans')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'maintenance_type'])
@Index(['asset_id'])
@Index(['space_id'])
@Index(['next_execution'])
export class MaintenancePlan {
  @ApiProperty({
    description: 'Unique identifier for the maintenance plan',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this maintenance plan',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Asset this plan applies to (for hard assets)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  asset_id: string;

  @ApiProperty({
    description: 'Space this plan applies to (for soft assets)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  @ApiProperty({
    description: 'Plan name or title',
    example: 'Mantenimiento Mensual Ascensor Torre A',
  })
  @Column({ type: 'text', nullable: false })
  name: string;

  @ApiProperty({
    description: 'Detailed plan description',
    example: 'Plan de mantenimiento preventivo mensual para el ascensor principal de la Torre A',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Type of maintenance',
    enum: MaintenanceType,
    example: MaintenanceType.PREVENTIVE,
  })
  @Column({
    type: 'enum',
    enum: MaintenanceType,
    default: MaintenanceType.PREVENTIVE,
  })
  maintenance_type: MaintenanceType;

  @ApiProperty({
    description: 'What triggers this maintenance plan',
    enum: TriggerType,
    example: TriggerType.TIME_BASED,
  })
  @Column({
    type: 'enum',
    enum: TriggerType,
    nullable: false,
  })
  trigger_type: TriggerType;

  @ApiProperty({
    description: 'Current status of the plan',
    enum: PlanStatus,
    example: PlanStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.ACTIVE,
  })
  status: PlanStatus;

  @ApiProperty({
    description: 'Frequency value (e.g., 1 for every 1 month)',
    example: 1,
  })
  @Column({ type: 'integer', nullable: true })
  frequency_value: number;

  @ApiProperty({
    description: 'Frequency unit',
    enum: FrequencyUnit,
    example: FrequencyUnit.MONTHS,
  })
  @Column({
    type: 'enum',
    enum: FrequencyUnit,
    nullable: true,
  })
  frequency_unit: FrequencyUnit;

  @ApiProperty({
    description: 'Usage threshold for usage-based triggers (e.g., hours)',
    example: 1000,
  })
  @Column({ type: 'integer', nullable: true })
  usage_threshold: number;

  @ApiProperty({
    description: 'Condition thresholds for condition-based triggers',
    example: {
      temperature_max: 80,
      vibration_max: 5.0,
      pressure_min: 2.5,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  condition_thresholds: Record<string, number>;

  @ApiProperty({
    description: 'Next scheduled execution date',
    example: '2023-12-15T09:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  next_execution: Date;

  @ApiProperty({
    description: 'Last execution date',
    example: '2023-11-15T09:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true })
  last_execution: Date;

  @ApiProperty({
    description: 'Estimated duration for plan execution in minutes',
    example: 180,
  })
  @Column({ type: 'integer', nullable: true })
  estimated_duration_minutes: number;

  @ApiProperty({
    description: 'Required skills for executing this plan',
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
    description: 'Standard consumables needed',
    example: {
      'brake_oil': { quantity: 2, unit: 'liters' },
      'cleaning_supplies': { quantity: 1, unit: 'kit' }
    },
  })
  @Column({ type: 'jsonb', default: {} })
  standard_consumables: Record<string, { quantity: number; unit: string }>;

  @ApiProperty({
    description: 'Maintenance checklist and procedures',
    example: [
      'Verificar funcionamiento de frenos',
      'Inspeccionar cables por desgaste',
      'Limpiar cabina y mecanismos',
      'Probar sistema de emergencia',
      'Documentar lecturas de sensores'
    ],
  })
  @Column({ type: 'jsonb', default: [] })
  checklist: string[];

  @ApiProperty({
    description: 'Safety requirements and procedures',
    example: {
      risk_level: 'HIGH',
      required_ppe: ['safety_harness', 'helmet', 'gloves'],
      safety_procedures: ['lockout_tagout', 'area_isolation'],
      emergency_contacts: ['supervisor', 'safety_officer']
    },
  })
  @Column({ type: 'jsonb', default: {} })
  safety_requirements: Record<string, any>;

  @ApiProperty({
    description: 'Plan configuration and settings',
    example: {
      auto_generate_tasks: true,
      require_admin_approval: true,
      send_reminders: true,
      reminder_days_before: 7,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  configuration: Record<string, any>;

  @ApiProperty({
    description: 'Additional plan metadata',
    example: {
      created_by: 'admin_user_123',
      approved_by: 'supervisor_456',
      cost_center: 'MAINT_001',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Plan creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Plan last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Asset, (asset) => asset.maintenance_plans)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Space, (space) => space.work_orders)
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @OneToMany(() => Task, (task) => task.maintenance_plan)
  tasks: Task[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === PlanStatus.ACTIVE;
  }

  get isTimeBased(): boolean {
    return this.trigger_type === TriggerType.TIME_BASED;
  }

  get isUsageBased(): boolean {
    return this.trigger_type === TriggerType.USAGE_BASED;
  }

  get isConditionBased(): boolean {
    return this.trigger_type === TriggerType.CONDITION_BASED;
  }

  get isDue(): boolean {
    if (!this.next_execution) return false;
    return new Date() >= this.next_execution;
  }

  get isOverdue(): boolean {
    if (!this.next_execution) return false;
    const now = new Date();
    const overdueDays = 7; // Consider overdue after 7 days
    const overdueDate = new Date(this.next_execution.getTime() + (overdueDays * 24 * 60 * 60 * 1000));
    return now > overdueDate;
  }

  get daysUntilDue(): number | null {
    if (!this.next_execution) return null;
    const now = new Date();
    const diffTime = this.next_execution.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get frequencyDescription(): string {
    if (!this.frequency_value || !this.frequency_unit) return 'No definida';
    
    const value = this.frequency_value;
    const unit = this.frequency_unit.toLowerCase();
    
    if (value === 1) {
      return `Cada ${unit.slice(0, -1)}`; // Remove 's' from plural
    }
    
    return `Cada ${value} ${unit.toLowerCase()}`;
  }

  get requiresApproval(): boolean {
    return this.configuration?.require_admin_approval === true;
  }

  get autoGeneratesTasks(): boolean {
    return this.configuration?.auto_generate_tasks === true;
  }

  calculateNextExecution(): Date | null {
    if (!this.isTimeBased || !this.frequency_value || !this.frequency_unit) {
      return null;
    }

    const baseDate = this.last_execution || this.created_at;
    const nextDate = new Date(baseDate);

    switch (this.frequency_unit) {
      case FrequencyUnit.DAYS:
        nextDate.setDate(nextDate.getDate() + this.frequency_value);
        break;
      case FrequencyUnit.WEEKS:
        nextDate.setDate(nextDate.getDate() + (this.frequency_value * 7));
        break;
      case FrequencyUnit.MONTHS:
        nextDate.setMonth(nextDate.getMonth() + this.frequency_value);
        break;
      case FrequencyUnit.YEARS:
        nextDate.setFullYear(nextDate.getFullYear() + this.frequency_value);
        break;
      default:
        return null;
    }

    return nextDate;
  }
}