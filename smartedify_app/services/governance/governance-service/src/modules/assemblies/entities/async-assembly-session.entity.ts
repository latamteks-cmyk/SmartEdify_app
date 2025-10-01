import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Assembly } from './assembly.entity';

@Entity('async_assembly_sessions')
export class AsyncAssemblySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'legal_verdict', type: 'jsonb', nullable: true })
  legalVerdict?: Record<string, any>;

  @Column({ name: 'auto_close_enabled', type: 'boolean', default: true })
  autoCloseEnabled: boolean;

  // Relations
  @ManyToOne(() => Assembly, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'assembly_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  assembly: Assembly;

  // Business methods
  isCurrentlyActive(): boolean {
    const now = new Date();
    return (
      this.isActive &&
      now >= this.startTime &&
      now <= this.endTime
    );
  }

  isExpired(): boolean {
    return new Date() > this.endTime;
  }

  getRemainingTime(): number {
    if (!this.isCurrentlyActive()) return 0;
    
    const now = new Date();
    return Math.max(0, this.endTime.getTime() - now.getTime());
  }

  getRemainingTimeInHours(): number {
    return Math.floor(this.getRemainingTime() / (1000 * 60 * 60));
  }

  canBeClosed(): boolean {
    return this.isActive && (this.isExpired() || !!this.legalVerdict);
  }

  close(legalVerdict?: Record<string, any>): void {
    this.isActive = false;
    if (legalVerdict) {
      this.legalVerdict = legalVerdict;
    }
  }

  extend(newEndTime: Date): void {
    if (newEndTime > this.endTime) {
      this.endTime = newEndTime;
    }
  }

  hasLegalVerdict(): boolean {
    return !!this.legalVerdict;
  }

  getStatus(): 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CLOSED' {
    if (!this.isActive) return 'CLOSED';
    if (this.isExpired()) return 'EXPIRED';
    if (this.isCurrentlyActive()) return 'ACTIVE';
    return 'PENDING';
  }
}