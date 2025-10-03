import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Assembly } from './assembly.entity';

export enum InitiativeStatus {
  DRAFT = 'DRAFT',
  COLLECTING_ADHESIONS = 'COLLECTING_ADHESIONS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('assembly_initiatives')
@Index(['id', 'tenantId'], { unique: true })
export class AssemblyInitiative {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'proposed_by', type: 'uuid' })
  proposedBy: string;

  @Column({
    type: 'enum',
    enum: InitiativeStatus,
    default: InitiativeStatus.DRAFT,
  })
  status: InitiativeStatus;

  @Column({
    name: 'required_adhesion_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  requiredAdhesionPercentage: number;

  @Column({
    name: 'current_adhesion_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.0,
  })
  currentAdhesionPercentage: number;

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
  canEmitNotice(): boolean {
    return (
      this.status === InitiativeStatus.COLLECTING_ADHESIONS &&
      this.currentAdhesionPercentage >= this.requiredAdhesionPercentage
    );
  }

  addAdhesion(ownerAliquot: number, totalAliquots: number): void {
    const adhesionPercentage = (ownerAliquot / totalAliquots) * 100;
    this.currentAdhesionPercentage += adhesionPercentage;
    
    if (this.currentAdhesionPercentage >= this.requiredAdhesionPercentage) {
      this.status = InitiativeStatus.APPROVED;
    }
  }
}