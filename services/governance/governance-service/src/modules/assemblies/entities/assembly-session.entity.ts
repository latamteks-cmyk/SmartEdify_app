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
import { SessionAttendee } from './session-attendee.entity';
import { SpeechRequest } from './speech-request.entity';

@Entity('assembly_sessions')
@Index(['id', 'tenantId'], { unique: true })
export class AssemblySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'video_conference_link', type: 'text', nullable: true })
  videoConferenceLink?: string;

  @Column({ name: 'recording_url', type: 'text', nullable: true })
  recordingUrl?: string;

  @Column({ name: 'recording_hash_sha256', type: 'text', nullable: true })
  recordingHashSha256?: string;

  @Column({ name: 'quorum_seal', type: 'text', nullable: true })
  quorumSeal?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'moderator_id', type: 'uuid', nullable: true })
  moderatorId?: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Assembly, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'assembly_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  assembly: Assembly;

  @OneToMany(() => SessionAttendee, (attendee) => attendee.session)
  attendees: SessionAttendee[];

  @OneToMany(() => SpeechRequest, (request) => request.session)
  speechRequests: SpeechRequest[];

  // Business methods
  start(): void {
    this.isActive = true;
    this.startedAt = new Date();
  }

  end(): void {
    this.isActive = false;
    this.endedAt = new Date();
  }

  assignModerator(moderatorId: string): void {
    this.moderatorId = moderatorId;
  }

  getActiveAttendees(): SessionAttendee[] {
    return this.attendees?.filter(attendee => attendee.isPresent) || [];
  }

  calculateQuorum(totalAliquots: number): {
    attendeeCount: number;
    totalAliquots: number;
    attendeeAliquots: number;
    quorumPercentage: number;
  } {
    const activeAttendees = this.getActiveAttendees();
    const attendeeAliquots = activeAttendees.reduce((sum, attendee) => {
      // This would need to be calculated based on user aliquots
      return sum + 1; // Simplified for now
    }, 0);

    return {
      attendeeCount: activeAttendees.length,
      totalAliquots,
      attendeeAliquots,
      quorumPercentage: (attendeeAliquots / totalAliquots) * 100,
    };
  }

  canEnd(): boolean {
    return this.isActive && this.startedAt !== null;
  }

  generateQuorumSeal(merkleRoot: string, commitHeight: number, signature: string): void {
    this.quorumSeal = JSON.stringify({
      merkleRoot,
      commitHeight,
      signature,
      timestamp: new Date().toISOString(),
    });
  }
}