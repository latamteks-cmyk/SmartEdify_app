import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ValidationType {
  ASSEMBLY = 'ASSEMBLY',
  QUORUM = 'QUORUM',
  MAJORITY = 'MAJORITY',
  FINANCIAL = 'FINANCIAL',
  LABOR = 'LABOR',
  DSAR = 'DSAR',
}

@Entity('compliance_validations')
@Index(['tenantId', 'validationType', 'createdAt'])
@Index(['entityId', 'validationType'])
export class ComplianceValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'validation_type',
  })
  validationType: string;

  @Column('uuid', { name: 'entity_id' })
  entityId: string; // assemblyId, voteId, etc.

  @Column({ name: 'is_valid' })
  isValid: boolean;

  @Column('jsonb', { name: 'validation_result' })
  validationResult: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
    requirements?: Record<string, any>;
    computedValues?: Record<string, any>;
  };

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ length: 255, nullable: true, name: 'validated_by' })
  validatedBy?: string; // user or system

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}