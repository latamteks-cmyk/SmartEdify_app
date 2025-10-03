import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Proposal } from '../../voting/entities/proposal.entity';
import { AssemblySession } from '../../sessions/entities/assembly-session.entity';
import { CommunityContribution } from '../../contributions/entities/community-contribution.entity';

export enum AssemblyModality {
  PRESENCIAL = 'PRESENCIAL',
  VIRTUAL = 'VIRTUAL',
  MIXTA = 'MIXTA',
  ASINCRONA = 'ASINCRONA',
}

export enum AssemblyStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  CONCLUDED = 'CONCLUDED',
}

@Entity('assemblies')
@Index(['tenant_id'])
@Index(['tenant_id', 'status', 'start_time'])
@Index(['id', 'tenant_id'], { unique: true })
export class Assembly {
  @ApiProperty({
    description: 'Unique identifier for the assembly',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this assembly',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  @Index()
  tenant_id: string;

  @ApiProperty({
    description: 'Assembly code (unique per tenant)',
    example: 'ASM-2025-001',
  })
  @Column({ type: 'text', nullable: false })
  code: string;

  @ApiProperty({
    description: 'Assembly title',
    example: 'Asamblea Ordinaria Anual 2025',
  })
  @Column({ type: 'text', nullable: false })
  title: string;

  @ApiProperty({
    description: 'Assembly description',
    example: 'Asamblea para aprobar presupuesto 2025 y elección de junta directiva',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Assembly start time',
    example: '2025-03-15T10:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: false })
  start_time: Date;

  @ApiProperty({
    description: 'Assembly end time',
    example: '2025-03-15T14:00:00Z',
  })
  @Column({ type: 'timestamptz', nullable: false })
  end_time: Date;

  @ApiProperty({
    description: 'Assembly modality',
    enum: AssemblyModality,
    example: AssemblyModality.MIXTA,
  })
  @Column({
    type: 'enum',
    enum: AssemblyModality,
    nullable: false,
  })
  modality: AssemblyModality;

  @ApiProperty({
    description: 'Assembly status',
    enum: AssemblyStatus,
    example: AssemblyStatus.SCHEDULED,
  })
  @Column({
    type: 'enum',
    enum: AssemblyStatus,
    default: AssemblyStatus.DRAFT,
  })
  status: AssemblyStatus;

  @ApiProperty({
    description: 'User who created the assembly',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  created_by: string;

  @ApiProperty({
    description: 'Policy ID from compliance service',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  policy_id: string;

  @ApiProperty({
    description: 'Policy version from compliance service',
    example: '1.2.3',
  })
  @Column({ type: 'text', nullable: false })
  policy_version: string;

  @ApiProperty({
    description: 'Assembly creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Assembly last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @OneToMany(() => Proposal, (proposal) => proposal.assembly)
  proposals: Proposal[];

  @OneToMany(() => AssemblySession, (session) => session.assembly)
  sessions: AssemblySession[];

  @OneToMany(() => CommunityContribution, (contribution) => contribution.assembly)
  contributions: CommunityContribution[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === AssemblyStatus.IN_PROGRESS;
  }

  get isScheduled(): boolean {
    return this.status === AssemblyStatus.SCHEDULED;
  }

  get isConcluded(): boolean {
    return this.status === AssemblyStatus.CONCLUDED;
  }

  get isVirtual(): boolean {
    return this.modality === AssemblyModality.VIRTUAL || this.modality === AssemblyModality.MIXTA;
  }

  get isAsynchronous(): boolean {
    return this.modality === AssemblyModality.ASINCRONA;
  }

  get duration(): number {
    return Math.round((this.end_time.getTime() - this.start_time.getTime()) / (1000 * 60 * 60));
  }
}