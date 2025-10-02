import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DocumentType, DocumentCategory } from '../../documents/entities/document.entity';

export enum TemplateFormat {
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  DOCX = 'DOCX',
  PDF = 'PDF',
}

@Entity('document_templates')
@Index(['tenantId', 'type', 'category'])
@Index(['tenantId', 'isActive'])
@Index(['code'], { unique: true })
export class DocumentTemplate {
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
    enum: DocumentType,
  })
  type: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
  })
  category: DocumentCategory;

  @Column({
    type: 'enum',
    enum: TemplateFormat,
    default: TemplateFormat.HTML,
  })
  format: TemplateFormat;

  @Column({ name: 'country_code', length: 3, nullable: true })
  countryCode?: string;

  @Column({ length: 5, default: 'es' })
  language: string;

  @Column('text', { name: 'template_content' })
  templateContent: string;

  @Column('text', { name: 'css_styles', nullable: true })
  cssStyles?: string;

  @Column('jsonb', { name: 'template_variables', default: [] })
  templateVariables: string[];

  @Column('jsonb', { name: 'default_values', default: {} })
  defaultValues: Record<string, any>;

  @Column('jsonb', { name: 'validation_rules', default: {} })
  validationRules: Record<string, any>;

  @Column('jsonb', { name: 'ai_prompts', default: {} })
  aiPrompts: {
    generation?: string;
    review?: string;
    summary?: string;
  };

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ version: '1.0.0' })
  version: string;

  @Column({ name: 'requires_signature', default: false })
  requiresSignature: boolean;

  @Column('jsonb', { name: 'signature_config', default: {} })
  signatureConfig: {
    requiredSigners?: string[];
    signingOrder?: 'SEQUENTIAL' | 'PARALLEL';
    expirationDays?: number;
  };

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

  get hasAiIntegration(): boolean {
    return Object.keys(this.aiPrompts).length > 0;
  }
}