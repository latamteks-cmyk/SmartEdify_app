import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Proposal } from './proposal.entity';
import { VoteChoice } from './digital-vote.entity';

@Entity('manual_votes')
@Index(['tenantId', 'proposalId', 'eventId'], { unique: true })
export class ManualVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposalId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'moderator_id', type: 'uuid' })
  moderatorId: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({
    type: 'enum',
    enum: VoteChoice,
  })
  choice: VoteChoice;

  @Column({ name: 'evidence_ref', type: 'text', nullable: true })
  evidenceRef?: string;

  @Column({ name: 'registered_at', type: 'timestamptz', default: () => 'NOW()' })
  registeredAt: Date;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  // Relations
  @ManyToOne(() => Proposal, (proposal) => proposal.manualVotes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'proposal_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  proposal: Proposal;

  // Business methods
  isValid(): boolean {
    return Object.values(VoteChoice).includes(this.choice);
  }

  hasEvidence(): boolean {
    return !!this.evidenceRef;
  }

  getVoteValue(): number {
    switch (this.choice) {
      case VoteChoice.FAVOR:
        return 1;
      case VoteChoice.AGAINST:
        return -1;
      case VoteChoice.ABSTENTION:
        return 0;
      default:
        return 0;
    }
  }
}