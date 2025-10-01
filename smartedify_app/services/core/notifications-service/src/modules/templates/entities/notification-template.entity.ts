import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TemplateType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum TemplateCategory {
  ASSEMBLY = 'ASSEMBLY',
  VOTING = 'VOTING',
  FINANCIAL = 'FINANCIAL',
  MAINTENANCE = 'MAINTENANCE',
  SECURITY = 'SECURITY',
  GENERAL = 'GENERAL',
  VERIFICATION = 'VERIFICATION',
  REMINDER = 'REMINDER',
}

@Entity('notification_templates')
@Index(['tenantId', 'type', 'category'])
@Index(['tenantId', 'isActive'])
@Index(['code'], { unique: true })
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
  })
  type: TemplateType;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
  })
  category: TemplateCategory;

  @Column({ name: 'country_code', length: 3, nullable: true })
  countryCode?: string;

  @Column({ length: 5, default: 'es' })
  language: string;

  @Column({ name: 'subject_template' })
  subjectTemplate: string;

  @Column('text', { name: 'content_template' })
  contentTemplate: string;

  @Column('text', { name: 'html_template', nullable: true })
  htmlTemplate?: string;

  @Column('jsonb', { name: 'template_variables', default: [] })
  templateVariables: string[];

  @Column('jsonb', { name: 'default_values', default: {} })
  defaultValues: Record<string, any>;

  @Column('jsonb', { name: 'validation_rules', default: {} })
  validationRules: Record<string, any>;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ version: '1.0.0' })
  version: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual properties
  get isMultiLanguage(): boolean {
    return this.templateVariables.includes('{{language}}');
  }

  get isCountrySpecific(): boolean {
    return !!this.countryCode;
  }
}