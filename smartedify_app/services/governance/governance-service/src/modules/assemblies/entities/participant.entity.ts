import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ParticipantRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PRESIDENT = 'PRESIDENT',
  SECRETARY = 'SECRETARY',
  TREASURER = 'TREASURER',
  BOARD_MEMBER = 'BOARD_MEMBER',
  RESIDENT = 'RESIDENT',
  TENANT_USER = 'TENANT_USER',
}

@Entity('participants')
@Index(['tenantId', 'userId'], { unique: true })
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
  })
  role: ParticipantRole;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0,
  })
  aliquot: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'email', type: 'text', nullable: true })
  email?: string;

  @Column({ name: 'phone', type: 'text', nullable: true })
  phone?: string;

  @Column({ name: 'apartment_number', type: 'text', nullable: true })
  apartmentNumber?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Business methods
  canVote(): boolean {
    return this.isActive && this.aliquot > 0;
  }

  canModerate(): boolean {
    return this.isActive && [
      ParticipantRole.ADMIN,
      ParticipantRole.PRESIDENT,
      ParticipantRole.SECRETARY,
    ].includes(this.role);
  }

  canSignDocuments(): boolean {
    return this.isActive && [
      ParticipantRole.ADMIN,
      ParticipantRole.PRESIDENT,
      ParticipantRole.SECRETARY,
    ].includes(this.role);
  }

  isOwner(): boolean {
    return this.role === ParticipantRole.OWNER && this.aliquot > 0;
  }

  isBoardMember(): boolean {
    return [
      ParticipantRole.PRESIDENT,
      ParticipantRole.SECRETARY,
      ParticipantRole.TREASURER,
      ParticipantRole.BOARD_MEMBER,
    ].includes(this.role);
  }

  getVotingWeight(): number {
    return this.canVote() ? this.aliquot : 0;
  }

  updateProfile(data: Partial<{
    fullName: string;
    email: string;
    phone: string;
    apartmentNumber: string;
    aliquot: number;
  }>): void {
    if (data.fullName) this.fullName = data.fullName;
    if (data.email) this.email = data.email;
    if (data.phone) this.phone = data.phone;
    if (data.apartmentNumber) this.apartmentNumber = data.apartmentNumber;
    if (data.aliquot !== undefined) this.aliquot = data.aliquot;
    this.updatedAt = new Date();
  }
}