import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EventSchemaStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DRAFT = 'DRAFT',
}

export enum EventCategory {
  ASSEMBLY = 'ASSEMBLY',
  VOTING = 'VOTING',
  FINANCIAL = 'FINANCIAL',
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('event_schemas')
@Index(['tenantId', 'eventType'])
@Index(['tenantId', 'category'])
@Index(['tenantId', 'status'])
@Index(['eventType', 'version'], { unique: true })
export class EventSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: EventCategory,
  })
  category: EventCategory;

  @Column({ version: '1.0.0' })
  version: string;

  @Column({
    type: 'enum',
    enum: EventSchemaStatus,
    default: EventSchemaStatus.ACTIVE,
  })
  status: EventSchemaStatus;

  @Column('jsonb', { name: 'json_schema' })
  jsonSchema: {
    $schema?: string;
    type: string;
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };

  @Column('jsonb', { name: 'example_payload', nullable: true })
  examplePayload?: Record<string, any>;

  @Column('jsonb', { name: 'notification_mappings', default: [] })
  notificationMappings: Array<{
    templateCode: string;
    condition?: string;
    priority?: string;
    channels?: string[];
  }>;

  @Column('jsonb', { name: 'routing_rules', default: {} })
  routingRules: {
    topics?: string[];
    partitionKey?: string;
    headers?: Record<string, string>;
  };

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'backward_compatible', default: true })
  backwardCompatible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual properties
  get isActive(): boolean {
    return this.status === EventSchemaStatus.ACTIVE;
  }

  get hasNotificationMappings(): boolean {
    return this.notificationMappings.length > 0;
  }
}