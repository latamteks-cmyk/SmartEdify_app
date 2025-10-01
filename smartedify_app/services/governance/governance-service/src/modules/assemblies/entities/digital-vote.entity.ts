import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Proposal } from './proposal.entity';

export enum VoteChoice {
  FAVOR = 'FAVOR',
  AGAINST = 'AGAINST',
  ABSTENTION = 'ABSTENTION',
}

@Entity('digital_votes')
@Index(['tenantId', 'proposalId', 'eventId'], { unique: true })
export class DigitalVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposalId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
  })
  weight: number;

  @Column({
    type: 'enum',
    enum: VoteChoice,
  })
  choice: VoteChoice;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  // Relations
  @ManyToOne(() => Proposal, (proposal) => proposal.digitalVotes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'proposal_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  proposal: Proposal;

  // Business methods
  isValid(): boolean {
    return this.weight > 0 && Object.values(VoteChoice).includes(this.choice);
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