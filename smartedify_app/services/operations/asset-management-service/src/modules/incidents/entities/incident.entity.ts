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

export enum IncidentStatus {
  OPEN = 'OPEN',
  CLASSIFIED = 'CLASSIFIED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum IncidentPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentSource {
  RESIDENT_APP = 'RESIDENT_APP',
  ADMIN_WEB = 'ADMIN_WEB',
  MOBILE_TECH = 'MOBILE_TECH',
  IOT_SENSOR = 'IOT_SENSOR',
  INSPECTION = 'INSPECTION',
  PREVENTIVE = 'PREVENTIVE',
}

export enum TaskType {
  TECHNICAL_MAINTENANCE = 'technical_maintenance',
  SOFT_SERVICE = 'soft_service',
}

export enum TaskClassification {
  URGENT = 'URGENT',       // Flujo de emergencias
  ORDINARY = 'ORDINARY',   // SOS regular
  PROGRAMMABLE = 'PROGRAMMABLE', // Agregar al próximo mantenimiento
}

@Entity('incidents')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'priority'])
@Index(['tenant_id', 'source'])
@Index(['reported_by'])
@Index(['created_at'])
export class Incident {
  @ApiProperty({
    description: 'Unique identifier for the incident',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this incident',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Asset related to this incident',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  asset_id: string;

  @ApiProperty({
    description: 'Space/area where the incident occurred',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  @ApiProperty({
    description: 'User who reported the incident',
    example: 'user_123456789',
  })
  @Column({ type: 'text', nullable: false })
  reported_by: string;

  @ApiProperty({
    description: 'Brief title or summary of the incident',
    example: 'Ascensor no funciona en Torre A',
  })
  @Column({ type: 'text', nullable: false })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the incident',
    example: 'El ascensor principal de la Torre A no responde al presionar los botones. Se escucha un ruido extraño.',
  })
  @Column({ type: 'text', nullable: false })
  description: string;

  @ApiProperty({
    description: 'LLM-generated standardized description',
    example: 'Elevator malfunction - Control panel unresponsive with abnormal noise',
  })
  @Column({ type: 'text', nullable: true })
  standardized_description: string;

  @ApiProperty({
    description: 'Current status of the incident',
    enum: IncidentStatus,
    example: IncidentStatus.OPEN,
  })
  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.OPEN,
  })
  status: IncidentStatus;

  @ApiProperty({
    description: 'Priority level of the incident',
    enum: IncidentPriority,
    example: IncidentPriority.HIGH,
  })
  @Column({
    type: 'enum',
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  priority: IncidentPriority;

  @ApiProperty({
    description: 'Source of the incident report',
    enum: IncidentSource,
    example: IncidentSource.RESIDENT_APP,
  })
  @Column({
    type: 'enum',
    enum: IncidentSource,
    nullable: false,
  })
  source: IncidentSource;

  @ApiProperty({
    description: 'Type of task generated from this incident',
    enum: TaskType,
    example: TaskType.TECHNICAL_MAINTENANCE,
  })
  @Column({
    type: 'enum',
    enum: TaskType,
    nullable: true,
  })
  task_type: TaskType;

  @ApiProperty({
    description: 'Classification of the task urgency',
    enum: TaskClassification,
    example: TaskClassification.URGENT,
  })
  @Column({
    type: 'enum',
    enum: TaskClassification,
    nullable: true,
  })
  task_classification: TaskClassification;

  @ApiProperty({
    description: 'Evidence files (photos, videos, audio)',
    example: [
      {
        type: 'image',
        url: 'https://cdn.smartedify.com/incidents/photo1.jpg',
        filename: 'elevator_issue.jpg'
      }
    ],
  })
  @Column({ type: 'jsonb', default: [] })
  evidence: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    filename: string;
    size?: number;
    uploaded_at?: Date;
  }>;

  @ApiProperty({
    description: 'Location details where the incident occurred',
    example: {
      floor: '5',
      unit: 'A-501',
      specific_location: 'Frente al ascensor',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  location_details: Record<string, any>;

  @ApiProperty({
    description: 'LLM classification suggestions',
    example: {
      suggested_asset_type: 'elevator',
      suggested_failure_type: 'control_malfunction',
      confidence_score: 0.85,
      classification_timestamp: '2023-12-01T10:00:00Z',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  llm_classification: Record<string, any>;

  @ApiProperty({
    description: 'Additional metadata',
    example: {
      weather_conditions: 'normal',
      time_of_day: 'morning',
      affected_users: 15,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Incident creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Incident last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ApiProperty({
    description: 'Timestamp when incident was resolved',
  })
  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date;

  @ApiProperty({
    description: 'Timestamp when incident was closed',
  })
  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date;

  // Relations
  @ManyToOne(() => Asset, (asset) => asset.work_orders)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Space, (space) => space.work_orders)
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @OneToMany(() => Task, (task) => task.incident)
  tasks: Task[];

  // Virtual properties
  get isOpen(): boolean {
    return this.status === IncidentStatus.OPEN;
  }

  get isCritical(): boolean {
    return this.priority === IncidentPriority.CRITICAL;
  }

  get isClassified(): boolean {
    return this.status !== IncidentStatus.OPEN;
  }

  get hasEvidence(): boolean {
    return this.evidence && this.evidence.length > 0;
  }

  get hasLlmClassification(): boolean {
    return this.llm_classification && Object.keys(this.llm_classification).length > 0;
  }

  get resolutionTimeHours(): number | null {
    if (!this.resolved_at) return null;
    return Math.round((this.resolved_at.getTime() - this.created_at.getTime()) / (1000 * 60 * 60));
  }

  get requiresWarrantyCheck(): boolean {
    return this.asset?.isUnderWarranty || false;
  }
}