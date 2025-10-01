import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Assembly } from '../../assemblies/entities/assembly.entity';
import { Vote } from '../../votes/entities/vote.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum SessionType {
  OPENING = 'opening',
  DISCUSSION = 'discussion',
  VOTING = 'voting',
  CLOSING = 'closing',
}

@Entity('sessions')
@Index(['tenantId', 'assemblyId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'startTime'])
export class Session {
  @ApiProperty({ description: 'Session unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenancy' })
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ApiProperty({ description: 'Assembly ID this session belongs to' })
  @Column({ name: 'assembly_id' })
  assemblyId: string;

  @ApiProperty({ description: 'Session title' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: 'Session description', required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: SessionType, description: 'Type of session' })
  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.DISCUSSION,
  })
  type: SessionType;

  @ApiProperty({ enum: SessionStatus, description: 'Current session status' })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @ApiProperty({ description: 'Session start time' })
  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @ApiProperty({ description: 'Session end time' })
  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @ApiProperty({ description: 'Session duration in minutes', required: false })
  @Column({ name: 'duration_minutes', nullable: true })
  durationMinutes?: number;

  @ApiProperty({ description: 'Session agenda items', required: false })
  @Column({ type: 'json', nullable: true })
  agenda?: string[];

  @ApiProperty({ description: 'Session moderator user ID', required: false })
  @Column({ name: 'moderator_id', nullable: true })
  moderatorId?: string;

  @ApiProperty({ description: 'Session notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Session recording URL', required: false })
  @Column({ name: 'recording_url', nullable: true })
  recordingUrl?: string;

  @ApiProperty({ description: 'Session metadata', required: false })
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Session creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Session last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Assembly, (assembly) => assembly.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assembly_id' })
  assembly: Assembly;

  @OneToMany(() => Vote, (vote) => vote.session)
  votes: Vote[];

  // Business logic methods
  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  canBeModified(): boolean {
    return this.status === SessionStatus.SCHEDULED;
  }

  getDuration(): number {
    if (this.durationMinutes) {
      return this.durationMinutes;
    }
    
    if (this.startTime && this.endTime) {
      return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
    }
    
    return 0;
  }

  isOverdue(): boolean {
    return this.status === SessionStatus.SCHEDULED && new Date() > this.endTime;
  }
}