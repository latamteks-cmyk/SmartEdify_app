import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum KeyStatus {
  ACTIVE = 'ACTIVE',
  ROLLED_OVER = 'ROLLED_OVER',
  EXPIRED = 'EXPIRED',
}

@Entity('signing_keys')
@Index(['tenant_id', 'status'])
export class SigningKey {
  @PrimaryGeneratedColumn('uuid')
  kid: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'simple-json' })
  public_key_jwk: object;

  @Column({ type: 'text' }) // Should be encrypted at rest
  private_key_pem: string;

  @Column({ default: 'ES256' })
  algorithm: string;

  @Column({
    type: 'simple-enum',
    enum: KeyStatus,
    default: KeyStatus.ACTIVE,
  })
  status: KeyStatus;

  @Column()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
