import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token_hash: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  jkt: string;

  @Column('uuid')
  family_id: string;

  @ManyToOne(() => RefreshToken, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: RefreshToken;

  @ManyToOne(() => RefreshToken, { nullable: true })
  @JoinColumn({ name: 'replaced_by_id' })
  replaced_by: RefreshToken;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date;

  @Column()
  client_id: string;

  @Column()
  device_id: string;

  @Column('uuid')
  session_id: string;

  @Column()
  scope: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ nullable: true })
  created_ip: string;

  @Column({ nullable: true })
  created_ua: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  revoked_reason: string;

  @CreateDateColumn()
  created_at: Date;
}
