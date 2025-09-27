import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, INACTIVE, LOCKED

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  phone_verified_at: Date;

  @Column({ nullable: true })
  preferred_login: string; // 'PASSWORD', 'TOTP', 'WEBAUTHN'

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
