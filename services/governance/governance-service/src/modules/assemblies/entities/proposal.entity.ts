import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Assembly } from './assembly.entity';
import { DigitalVote } from './digital-vote.entity';
import { ManualVote } from './manual-vote.entity';

export enum DecisionType {
  SIMPLE_MAJORITY = 'SIMPLE_MAJORITY',
  QUALIFIED_MAJORITY = 'QUALIFIED_MAJORITY',
  UNANIMOUS = 'UNANIMOUS',
  INFORMATIVE = 'INFORMATIVE',
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('proposals')
@Index(['id', 'tenantId'], { unique: true })
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'decision_type',
    type: 'enum',
    enum: DecisionType,
  })
  decisionType: DecisionType;

  @Column({
    name: 'required_quorum_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  requiredQuorumPercentage: number;

  @Column({
    name: 'required_majority_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  requiredMajorityPercentage: number;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.DRAFT,
  })
  status: ProposalStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Assembly, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'assembly_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  assembly: Assembly;

  @OneToMany(() => DigitalVote, (vote) => vote.proposal)
  digitalVotes: DigitalVote[];

  @OneToMany(() => ManualVote, (vote) => vote.proposal)
  manualVotes: ManualVote[];

  // Business methods
  calculateResults(totalAliquots: number): {
    totalVotes: number;
    favorVotes: number;
    againstVotes: number;
    abstentionVotes: number;
    participationPercentage: number;
    approvalPercentage: number;
    isApproved: boolean;
    hasQuorum: boolean;
  } {
    const allVotes = [
      ...this.digitalVotes.map(v => ({ choice: v.choice, weight: v.weight })),
      ...this.manualVotes.map(v => ({ choice: v.choice, weight: 1 })), // Manual votes have weight 1
    ];

    const totalVotes = allVotes.reduce((sum, vote) => sum + vote.weight, 0);
    const favorVotes = allVotes
      .filter(vote => vote.choice === 'FAVOR')
      .reduce((sum, vote) => sum + vote.weight, 0);
    const againstVotes = allVotes
      .filter(vote => vote.choice === 'AGAINST')
      .reduce((sum, vote) => sum + vote.weight, 0);
    const abstentionVotes = allVotes
      .filter(vote => vote.choice === 'ABSTENTION')
      .reduce((sum, vote) => sum + vote.weight, 0);

    const participationPercentage = (totalVotes / totalAliquots) * 100;
    const approvalPercentage = totalVotes > 0 ? (favorVotes / totalVotes) * 100 : 0;

    const hasQuorum = participationPercentage >= this.requiredQuorumPercentage;
    const isApproved = hasQuorum && approvalPercentage >= this.requiredMajorityPercentage;

    return {
      totalVotes,
      favorVotes,
      againstVotes,
      abstentionVotes,
      participationPercentage,
      approvalPercentage,
      isApproved,
      hasQuorum,
    };
  }

  canBeClosed(): boolean {
    return this.status === ProposalStatus.ACTIVE;
  }

  close(isApproved: boolean): void {
    this.status = isApproved ? ProposalStatus.APPROVED : ProposalStatus.REJECTED;
  }
}