import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Assembly } from './assembly.entity';

export enum ProxyVoteStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  USED = 'USED',
}

@Entity('proxy_votes')
export class ProxyVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'grantor_id', type: 'uuid' })
  grantorId: string;

  @Column({ name: 'grantee_id', type: 'uuid' })
  granteeId: string;

  @Column({ name: 'document_url', type: 'text', nullable: true })
  documentUrl?: string;

  @Column({ name: 'digital_signature', type: 'text', nullable: true })
  digitalSignature?: string;

  @Column({
    type: 'enum',
    enum: ProxyVoteStatus,
    default: ProxyVoteStatus.ACTIVE,
  })
  status: ProxyVoteStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Assembly, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'assembly_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  assembly: Assembly;

  // Business methods
  isValid(): boolean {
    return (
      this.status === ProxyVoteStatus.ACTIVE &&
      new Date() < this.expiresAt &&
      !this.isUsed()
    );
  }

  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  isUsed(): boolean {
    return this.status === ProxyVoteStatus.USED || !!this.usedAt;
  }

  isRevoked(): boolean {
    return this.status === ProxyVoteStatus.REVOKED || !!this.revokedAt;
  }

  use(): void {
    if (this.isValid()) {
      this.status = ProxyVoteStatus.USED;
      this.usedAt = new Date();
    }
  }

  revoke(revokedBy: string): void {
    if (this.status === ProxyVoteStatus.ACTIVE) {
      this.status = ProxyVoteStatus.REVOKED;
      this.revokedAt = new Date();
      this.revokedBy = revokedBy;
    }
  }

  checkExpiration(): void {
    if (this.isExpired() && this.status === ProxyVoteStatus.ACTIVE) {
      this.status = ProxyVoteStatus.EXPIRED;
    }
  }

  hasDigitalSignature(): boolean {
    return !!this.digitalSignature;
  }

  hasDocument(): boolean {
    return !!this.documentUrl;
  }
}