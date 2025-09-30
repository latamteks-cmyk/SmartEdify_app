import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('users')
@Unique(['tenant_id', 'username'])
@Unique(['tenant_id', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  mfa_secret?: string;

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, INACTIVE, LOCKED

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  phone_verified_at: Date;

  @Column({ nullable: true })
  preferred_login: string; // 'PASSWORD', 'TOTP', 'WEBAUTHN'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
