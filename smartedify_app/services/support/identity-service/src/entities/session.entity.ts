import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  tenant_id: string;

  @Column()
  device_id: string;

  @Column()
  cnf_jkt: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  issued_at: Date;

  @Column({ type: 'timestamptz' })
  not_after: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;
}
