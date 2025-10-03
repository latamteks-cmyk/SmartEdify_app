import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('regulatory_profiles')
@Index(['tenantId', 'countryCode'], { unique: true })
export class RegulatoryProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @Column({ length: 3 })
  countryCode: string;

  @Column({ length: 255 })
  legalFramework: string;

  @Column('jsonb')
  assemblyRules: {
    minNoticedays: number;
    quorumRequirements: {
      firstCall: number; // percentage
      secondCall: number; // percentage
    };
    majorityRequirements: {
      simple: number; // percentage
      qualified: number; // percentage
      unanimous: number; // percentage
    };
    allowedMethods: string[]; // ['PRESENCIAL', 'VIRTUAL', 'MIXTA']
  };

  @Column('jsonb')
  votingRules: {
    allowedMethods: string[]; // ['DIGITAL', 'PRESENCIAL', 'DELEGACION']
    secretVoting: boolean;
    delegationAllowed: boolean;
    maxDelegationsPerPerson: number;
  };

  @Column('jsonb')
  financialRules: {
    accountingStandard: string; // 'PCGE', 'NIIF', etc.
    auditRequired: boolean;
    reportingFrequency: string; // 'MONTHLY', 'QUARTERLY', 'ANNUAL'
    budgetApprovalRequired: boolean;
  };

  @Column('jsonb')
  laborRules: {
    payrollSystem: string; // 'PLAME', 'T-REGISTRO', etc.
    benefitsRequired: string[];
    sst: {
      required: boolean;
      certificationRequired: boolean;
    };
  };

  @Column('jsonb')
  dsarRules: {
    dataRetentionDays: number;
    rightToPortability: boolean;
    rightToErasure: boolean;
    consentRequired: boolean;
    breachNotificationHours: number; // 72 for EU, 48 for Peru
  };

  @Column('jsonb', { default: {} })
  customRules: Record<string, any>;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}