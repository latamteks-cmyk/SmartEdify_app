import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AssemblySession } from './assembly-session.entity';

export enum SpeechRequestStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  SPEAKING = 'SPEAKING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('speech_requests')
export class SpeechRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: SpeechRequestStatus,
    default: SpeechRequestStatus.PENDING,
  })
  status: SpeechRequestStatus;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ name: 'granted_at', type: 'timestamptz', nullable: true })
  grantedAt?: Date;

  @Column({ name: 'started_speaking_at', type: 'timestamptz', nullable: true })
  startedSpeakingAt?: Date;

  @Column({ name: 'finished_speaking_at', type: 'timestamptz', nullable: true })
  finishedSpeakingAt?: Date;

  @Column({ name: 'max_duration_seconds', type: 'integer', default: 180 })
  maxDurationSeconds: number;

  @Column({ name: 'is_replica', type: 'boolean', default: false })
  isReplica: boolean;

  // Relations
  @ManyToOne(() => AssemblySession, (session) => session.speechRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'session_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  session: AssemblySession;

  // Business methods
  grant(): void {
    if (this.status === SpeechRequestStatus.PENDING) {
      this.status = SpeechRequestStatus.GRANTED;
      this.grantedAt = new Date();
    }
  }

  startSpeaking(): void {
    if (this.status === SpeechRequestStatus.GRANTED) {
      this.status = SpeechRequestStatus.SPEAKING;
      this.startedSpeakingAt = new Date();
    }
  }

  finishSpeaking(): void {
    if (this.status === SpeechRequestStatus.SPEAKING) {
      this.status = SpeechRequestStatus.COMPLETED;
      this.finishedSpeakingAt = new Date();
    }
  }

  cancel(): void {
    if ([SpeechRequestStatus.PENDING, SpeechRequestStatus.GRANTED].includes(this.status)) {
      this.status = SpeechRequestStatus.CANCELLED;
    }
  }

  isExpired(): boolean {
    if (this.status !== SpeechRequestStatus.SPEAKING) return false;
    
    if (!this.startedSpeakingAt) return false;
    
    const now = new Date();
    const elapsed = (now.getTime() - this.startedSpeakingAt.getTime()) / 1000;
    
    return elapsed > this.maxDurationSeconds;
  }

  getRemainingTime(): number {
    if (this.status !== SpeechRequestStatus.SPEAKING || !this.startedSpeakingAt) {
      return this.maxDurationSeconds;
    }
    
    const now = new Date();
    const elapsed = (now.getTime() - this.startedSpeakingAt.getTime()) / 1000;
    
    return Math.max(0, this.maxDurationSeconds - elapsed);
  }
}