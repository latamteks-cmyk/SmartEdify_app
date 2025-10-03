import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index(['token_hash'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token_hash: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  jkt: string;

  @Column()
  kid: string;

  @Column('uuid')
  jti: string;

  @Column('uuid')
  family_id: string;

  @Column('uuid', { nullable: true })
  parent_id: string;

  @Column('uuid', { nullable: true })
  replaced_by_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date;

  @Column()
  client_id: string;

  @Column()
  device_id: string;

  @Column('uuid')
  session_id: string;

  @Column('uuid')
  tenant_id: string;

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

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
