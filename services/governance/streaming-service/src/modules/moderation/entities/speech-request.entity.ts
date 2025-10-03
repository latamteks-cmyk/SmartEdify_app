import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AssemblySession } from '../../sessions/entities/assembly-session.entity';

export enum SpeechRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  EXPIRED = 'expired',
  SPEAKING = 'speaking',
  COMPLETED = 'completed',
}

export enum SpeechRequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('speech_requests')
@Index(['tenantId', 'sessionId'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'requestedAt'])
export class SpeechRequest {
  @ApiProperty({ description: 'Speech request unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Session ID' })
  @Column({ name: 'session_id' })
  sessionId: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenancy' })
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ApiProperty({ description: 'User ID requesting to speak' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ enum: SpeechRequestStatus, description: 'Request status' })
  @Column({
    type: 'enum',
    enum: SpeechRequestStatus,
    default: SpeechRequestStatus.PENDING,
  })
  status: SpeechRequestStatus;

  @ApiProperty({ enum: SpeechRequestPriority, description: 'Request priority' })
  @Column({
    type: 'enum',
    enum: SpeechRequestPriority,
    default: SpeechRequestPriority.NORMAL,
  })
  priority: SpeechRequestPriority;

  @ApiProperty({ description: 'Optional message from the user' })
  @Column({ type: 'text', nullable: true })
  message?: string;

  @ApiProperty({ description: 'Moderator who approved/denied the request' })
  @Column({ name: 'moderator_id', nullable: true })
  moderatorId?: string;

  @ApiProperty({ description: 'Moderator notes' })
  @Column({ name: 'moderator_notes', type: 'text', nullable: true })
  moderatorNotes?: string;

  @ApiProperty({ description: 'When the request was made' })
  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @ApiProperty({ description: 'When the request was approved/denied' })
  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date;

  @ApiProperty({ description: 'When the user started speaking' })
  @Column({ name: 'speaking_started_at', type: 'timestamptz', nullable: true })
  speakingStartedAt?: Date;

  @ApiProperty({ description: 'When the user finished speaking' })
  @Column({ name: 'speaking_ended_at', type: 'timestamptz', nullable: true })
  speakingEndedAt?: Date;

  @ApiProperty({ description: 'Maximum speaking time allowed (seconds)' })
  @Column({ name: 'max_speaking_time', default: 300 })
  maxSpeakingTime: number;

  @ApiProperty({ description: 'Request expiration time' })
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => AssemblySession, (session) => session.speechRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: AssemblySession;

  // Business logic methods
  isPending(): boolean {
    return this.status === SpeechRequestStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === SpeechRequestStatus.APPROVED;
  }

  isSpeaking(): boolean {
    return this.status === SpeechRequestStatus.SPEAKING;
  }

  isExpired(): boolean {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  getSpeakingDuration(): number {
    if (this.speakingStartedAt && this.speakingEndedAt) {
      return Math.floor((this.speakingEndedAt.getTime() - this.speakingStartedAt.getTime()) / 1000);
    }
    if (this.speakingStartedAt) {
      return Math.floor((Date.now() - this.speakingStartedAt.getTime()) / 1000);
    }
    return 0;
  }

  hasExceededTimeLimit(): boolean {
    return this.getSpeakingDuration() > this.maxSpeakingTime;
  }

  getWaitingTime(): number {
    const referenceTime = this.respondedAt || new Date();
    return Math.floor((referenceTime.getTime() - this.requestedAt.getTime()) / 1000);
  }
}