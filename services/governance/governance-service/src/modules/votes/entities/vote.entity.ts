import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Assembly } from '../../assemblies/entities/assembly.entity';
import { Session } from '../../sessions/entities/session.entity';
import { VotingType } from '../../assemblies/enums/assembly.enums';

export enum VoteStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VoteResult {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ABSTAINED = 'abstained',
  PENDING = 'pending',
}

@Entity('votes')
@Index(['tenantId', 'assemblyId'])
@Index(['tenantId', 'sessionId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'startTime'])
@Unique(['tenantId', 'assemblyId', 'title'])
export class Vote {
  @ApiProperty({ description: 'Vote unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenancy' })
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ApiProperty({ description: 'Assembly ID this vote belongs to' })
  @Column({ name: 'assembly_id' })
  assemblyId: string;

  @ApiProperty({ description: 'Session ID this vote belongs to', required: false })
  @Column({ name: 'session_id', nullable: true })
  sessionId?: string;

  @ApiProperty({ description: 'Vote title' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: 'Vote description' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: VotingType, description: 'Type of voting mechanism' })
  @Column({
    type: 'enum',
    enum: VotingType,
    default: VotingType.SIMPLE_MAJORITY,
  })
  votingType: VotingType;

  @ApiProperty({ enum: VoteStatus, description: 'Current vote status' })
  @Column({
    type: 'enum',
    enum: VoteStatus,
    default: VoteStatus.DRAFT,
  })
  status: VoteStatus;

  @ApiProperty({ description: 'Vote start time' })
  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @ApiProperty({ description: 'Vote end time' })
  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @ApiProperty({ description: 'Vote options as JSON array' })
  @Column({ type: 'json' })
  options: string[];

  @ApiProperty({ description: 'Vote results as JSON object' })
  @Column({ type: 'json', default: '{}' })
  results: Record<string, number>;

  @ApiProperty({ description: 'Total votes cast' })
  @Column({ name: 'total_votes', default: 0 })
  totalVotes: number;

  @ApiProperty({ description: 'Required quorum for this vote' })
  @Column({ name: 'required_quorum', type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  requiredQuorum: number;

  @ApiProperty({ description: 'Required majority percentage' })
  @Column({ name: 'required_majority', type: 'decimal', precision: 5, scale: 2, default: 50.00 })
  requiredMajority: number;

  @ApiProperty({ enum: VoteResult, description: 'Final vote result' })
  @Column({
    type: 'enum',
    enum: VoteResult,
    default: VoteResult.PENDING,
  })
  result: VoteResult;

  @ApiProperty({ description: 'Vote creator user ID' })
  @Column({ name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Anonymous voting flag' })
  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @ApiProperty({ description: 'Allow vote changes flag' })
  @Column({ name: 'allow_changes', default: false })
  allowChanges: boolean;

  @ApiProperty({ description: 'Vote metadata' })
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Vote creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Vote last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Assembly, (assembly) => assembly.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assembly_id' })
  assembly: Assembly;

  @ManyToOne(() => Session, (session) => session.votes, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'session_id' })
  session?: Session;

  // Business logic methods
  isActive(): boolean {
    return this.status === VoteStatus.ACTIVE && 
           new Date() >= this.startTime && 
           new Date() <= this.endTime;
  }

  hasEnded(): boolean {
    return new Date() > this.endTime || this.status === VoteStatus.COMPLETED;
  }

  canBeModified(): boolean {
    return this.status === VoteStatus.DRAFT;
  }

  calculateResult(): VoteResult {
    if (this.totalVotes === 0) {
      return VoteResult.PENDING;
    }

    const totalEligibleVoters = this.assembly?.maxParticipants || 100;
    const participationRate = (this.totalVotes / totalEligibleVoters) * 100;

    // Check quorum
    if (participationRate < this.requiredQuorum) {
      return VoteResult.PENDING;
    }

    // Calculate majority based on voting type
    switch (this.votingType) {
      case VotingType.SIMPLE_MAJORITY:
        return this.calculateSimpleMajority();
      case VotingType.QUALIFIED_MAJORITY:
        return this.calculateQualifiedMajority();
      case VotingType.UNANIMOUS:
        return this.calculateUnanimous();
      case VotingType.WEIGHTED:
        return this.calculateWeighted();
      default:
        return VoteResult.PENDING;
    }
  }

  private calculateSimpleMajority(): VoteResult {
    const yesVotes = this.results['yes'] || 0;
    const noVotes = this.results['no'] || 0;
    
    if (yesVotes > noVotes) {
      return VoteResult.APPROVED;
    } else if (noVotes > yesVotes) {
      return VoteResult.REJECTED;
    }
    
    return VoteResult.ABSTAINED;
  }

  private calculateQualifiedMajority(): VoteResult {
    const yesVotes = this.results['yes'] || 0;
    const yesPercentage = (yesVotes / this.totalVotes) * 100;
    
    return yesPercentage >= this.requiredMajority ? 
           VoteResult.APPROVED : 
           VoteResult.REJECTED;
  }

  private calculateUnanimous(): VoteResult {
    const yesVotes = this.results['yes'] || 0;
    return yesVotes === this.totalVotes ? 
           VoteResult.APPROVED : 
           VoteResult.REJECTED;
  }

  private calculateWeighted(): VoteResult {
    // Implement weighted voting logic based on metadata
    // This would require additional weight information per voter
    return this.calculateSimpleMajority();
  }
}