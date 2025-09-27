import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('revocation_events')
export class RevocationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column('uuid')
  subject: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  session_id: string;

  @Column({ nullable: true })
  jti: string;

  @Column({ type: 'timestamptz' })
  not_before: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
