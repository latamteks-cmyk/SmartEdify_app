import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('webauthn_credentials')
@Unique(['user', 'credential_id'])
export class WebAuthnCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bytea' })
  credential_id: Buffer;

  @Column({ type: 'bytea' })
  public_key: Buffer;

  @Column('bigint', { default: 0 })
  sign_count: number;

  @Column()
  rp_id: string;

  @Column()
  origin: string;

  @Column({ type: 'bytea', nullable: true })
  aaguid: Buffer;

  @Column({ nullable: true })
  attestation_fmt: string;

  @Column('text', { array: true, nullable: true })
  transports: string[];

  @Column({ nullable: true })
  backup_eligible: boolean;

  @Column({ nullable: true })
  backup_state: string;

  @Column({ nullable: true })
  cred_protect: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
