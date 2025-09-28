import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('consent_audits')
export class ConsentAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  consent_type: string;

  @Column({ default: false })
  consent_granted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  granted_at: Date;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ nullable: true })
  policy_version: string;

  @Column({ nullable: true })
  purpose: string;

  @Column({ nullable: true })
  country_code: string;

  @Column({ nullable: true })
  evidence_ref: string;
}