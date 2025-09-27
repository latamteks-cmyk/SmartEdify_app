import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  tenant_id: string;

  @Column()
  device_id: string;

  @Column()
  cnf_jkt: string;

  @CreateDateColumn({ type: 'timestamptz' })
  issued_at: Date;

  @Column({ type: 'timestamptz' })
  not_after: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}