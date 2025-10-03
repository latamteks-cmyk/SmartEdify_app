import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PolicyType {
  ASSEMBLY = 'ASSEMBLY',
  VOTING = 'VOTING',
  FINANCIAL = 'FINANCIAL',
  LABOR = 'LABOR',
  DSAR = 'DSAR',
}

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  MIXED = 'MIXED',
}

@Entity('compliance_policies')
@Index(['tenantId', 'countryCode', 'policyType'])
export class CompliancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @Column({ length: 3 })
  @Index()
  countryCode: string;

  @Column({
    type: 'enum',
    enum: PolicyType,
  })
  policyType: PolicyType;

  @Column({
    type: 'enum',
    enum: PropertyType,
    nullable: true,
  })
  propertyType?: PropertyType;

  @Column({ length: 255 })
  name: string;

  @Column('text')
  description: string;

  @Column('jsonb')
  rules: Record<string, any>;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 50 })
  version: string;

  @Column('timestamp', { nullable: true })
  effectiveFrom?: Date;

  @Column('timestamp', { nullable: true })
  effectiveTo?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isEffective(): boolean {
    const now = new Date();
    const fromCheck = !this.effectiveFrom || this.effectiveFrom <= now;
    const toCheck = !this.effectiveTo || this.effectiveTo >= now;
    return this.isActive && fromCheck && toCheck;
  }
}