import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumns,
} from 'typeorm';
import { DocumentManifest } from './document-manifest.entity';

@Entity('rag_chunks')
@Index(['tenantId', 'condominiumId'])
@Index(['docId', 'sectionId'])
@Index(['lang'])
export class RagChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column('uuid', { name: 'doc_id' })
  docId: string;

  @Column({ name: 'section_id' })
  sectionId: string;

  @Column('text')
  content: string;

  @Column('vector', { length: 768 })
  embedding: number[];

  @Column({ length: 2, default: 'es' })
  lang: string;

  @Column('jsonb', { default: {} })
  meta: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => DocumentManifest, { onDelete: 'CASCADE' })
  @JoinColumns([
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
    { name: 'condominium_id', referencedColumnName: 'condominiumId' },
    { name: 'doc_id', referencedColumnName: 'docId' },
  ])
  document: DocumentManifest;
}