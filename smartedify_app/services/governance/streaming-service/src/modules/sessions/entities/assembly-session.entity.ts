import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SessionAttendee } from '../../attendance/entities/session-attendee.entity';
import { SpeechRequest } from '../../moderation/entities/speech-request.entity';

export enum SessionModality {
  VIRTUAL = 'virtual',
  PRESENCIAL = 'presencial',
  MIXTA = 'mixta',
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('assembly_sessions')
@Index(['tenantId', 'assemblyId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdAt'])
export class AssemblySession {
  @ApiProperty({ description: 'Session unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenancy' })
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ApiProperty({ description: 'Assembly ID from governance-service' })
  @Column({ name: 'assembly_id' })
  assemblyId: string;

  @ApiProperty({ description: 'Policy ID from compliance-service' })
  @Column({ name: 'policy_id', nullable: true })
  policyId?: string;

  @ApiProperty({ description: 'Policy version' })
  @Column({ name: 'policy_version', nullable: true })
  policyVersion?: string;

  @ApiProperty({ enum: SessionModality, description: 'Session modality' })
  @Column({
    type: 'enum',
    enum: SessionModality,
    default: SessionModality.MIXTA,
  })
  modality: SessionModality;

  @ApiProperty({ enum: SessionStatus, description: 'Current session status' })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @ApiProperty({ description: 'Video conference link' })
  @Column({ name: 'video_conference_link', nullable: true })
  videoConferenceLink?: string;

  @ApiProperty({ description: 'Video provider (google_meet, zoom, webrtc)' })
  @Column({ name: 'video_provider', default: 'webrtc' })
  videoProvider: string;

  @ApiProperty({ description: 'Recording URL in S3' })
  @Column({ name: 'recording_url', nullable: true })
  recordingUrl?: string;

  @ApiProperty({ description: 'SHA256 hash of the recording' })
  @Column({ name: 'recording_hash_sha256', nullable: true })
  recordingHashSha256?: string;

  @ApiProperty({ description: 'Cryptographic seal linking to governance events' })
  @Column({ name: 'quorum_seal', type: 'text', nullable: true })
  quorumSeal?: string;

  @ApiProperty({ description: 'Merkle root from governance event stream' })
  @Column({ name: 'merkle_root', nullable: true })
  merkleRoot?: string;

  @ApiProperty({ description: 'Commit height from governance event stream' })
  @Column({ name: 'commit_height', type: 'bigint', nullable: true })
  commitHeight?: number;

  @ApiProperty({ description: 'Key ID used for signing' })
  @Column({ name: 'signing_kid', nullable: true })
  signingKid?: string;

  @ApiProperty({ description: 'Session start time' })
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @ApiProperty({ description: 'Session end time' })
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @ApiProperty({ description: 'Maximum participants allowed' })
  @Column({ name: 'max_participants', default: 500 })
  maxParticipants: number;

  @ApiProperty({ description: 'Current participant count' })
  @Column({ name: 'current_participants', default: 0 })
  currentParticipants: number;

  @ApiProperty({ description: 'Whether recording is enabled' })
  @Column({ name: 'recording_enabled', default: true })
  recordingEnabled: boolean;

  @ApiProperty({ description: 'Whether transcription is enabled' })
  @Column({ name: 'transcription_enabled', default: true })
  transcriptionEnabled: boolean;

  @ApiProperty({ description: 'Session metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Session creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Session last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => SessionAttendee, (attendee) => attendee.session)
  attendees: SessionAttendee[];

  @OneToMany(() => SpeechRequest, (request) => request.session)
  speechRequests: SpeechRequest[];

  // Business logic methods
  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  canBeModified(): boolean {
    return this.status === SessionStatus.SCHEDULED;
  }

  getDuration(): number {
    if (this.startedAt && this.endedAt) {
      return Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
    return 0;
  }

  hasRecording(): boolean {
    return !!this.recordingUrl && !!this.recordingHashSha256;
  }

  isRecordingVerifiable(): boolean {
    return this.hasRecording() && !!this.quorumSeal && !!this.merkleRoot;
  }
}