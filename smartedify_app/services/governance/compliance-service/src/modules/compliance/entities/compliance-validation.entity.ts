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

  @Column('uuid')
  @Index()
  tenantId: string;

  @Column({
    type: 'enum',
    enum: ValidationType,
  })
  validationType: ValidationType;

  @Column('uuid')
  entityId: string; // assemblyId, voteId, etc.

  @Column()
  isValid: boolean;

  @Column('jsonb')
  validationResult: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
    requirements?: Record<string, any>;
    computedValues?: Record<string, any>;
  };

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ length: 255, nullable: true })
  validatedBy?: string; // user or system

  @CreateDateColumn()
  createdAt: Date;
}