import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagChunk } from '../entities/rag-chunk.entity';
import { EmbeddingsService } from './embeddings.service';

export interface SearchResult {
  chunk: RagChunk;
  similarity: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(RagChunk)
    private readonly ragChunkRepository: Repository<RagChunk>,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async searchSimilarChunks(
    query: string,
    tenantId: string,
    condominiumId: string,
    topK: number = 8,
    minSimilarity: number = 0.7,
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);

      // Search using cosine similarity
      const results = await this.ragChunkRepository
        .createQueryBuilder('chunk')
        .select([
          'chunk.*',
          '1 - (chunk.embedding <=> :queryEmbedding) as similarity',
        ])
        .where('chunk.tenant_id = :tenantId', { tenantId })
        .andWhere('chunk.condominium_id = :condominiumId', { condominiumId })
        .andWhere('1 - (chunk.embedding <=> :queryEmbedding) >= :minSimilarity', {
          queryEmbedding: JSON.stringify(queryEmbedding),
          minSimilarity,
        })
        .orderBy('similarity', 'DESC')
        .limit(topK)
        .getRawMany();

      return results.map(result => ({
        chunk: {
          id: result.chunk_id,
          tenantId: result.chunk_tenant_id,
          condominiumId: result.chunk_condominium_id,
          docId: result.chunk_doc_id,
          sectionId: result.chunk_section_id,
          content: result.chunk_content,
          embedding: result.chunk_embedding,
          lang: result.chunk_lang,
          meta: result.chunk_meta,
          createdAt: result.chunk_created_at,
        } as RagChunk,
        similarity: parseFloat(result.similarity),
      }));
    } catch (error) {
      this.logger.error(`RAG search failed: ${error.message}`, error.stack);
      return [];
    }
  }

  async ingestDocument(
    tenantId: string,
    condominiumId: string,
    docId: string,
    chunks: Array<{
      sectionId: string;
      content: string;
      lang: string;
      meta?: Record<string, any>;
    }>,
  ): Promise<void> {
    this.logger.log(`Ingesting document ${docId} with ${chunks.length} chunks`);

    // Delete existing chunks for this document
    await this.ragChunkRepository.delete({
      tenantId,
      condominiumId,
      docId,
    });

    // Process chunks in batches
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await this.processBatch(tenantId, condominiumId, docId, batch);
    }

    this.logger.log(`Document ${docId} ingestion completed`);
  }

  async deleteDocumentChunks(tenantId: string, condominiumId: string, docId: string): Promise<void> {
    await this.ragChunkRepository.delete({
      tenantId,
      condominiumId,
      docId,
    });

    this.logger.log(`Deleted chunks for document ${docId}`);
  }

  async getDocumentChunks(
    tenantId: string,
    condominiumId: string,
    docId: string,
  ): Promise<RagChunk[]> {
    return this.ragChunkRepository.find({
      where: { tenantId, condominiumId, docId },
      order: { sectionId: 'ASC' },
    });
  }

  async getChunkStats(tenantId: string, condominiumId?: string): Promise<{
    totalChunks: number;
    documentCount: number;
    languageDistribution: Record<string, number>;
  }> {
    const whereCondition: any = { tenantId };
    if (condominiumId) {
      whereCondition.condominiumId = condominiumId;
    }

    const totalChunks = await this.ragChunkRepository.count({ where: whereCondition });

    const documentCount = await this.ragChunkRepository
      .createQueryBuilder('chunk')
      .select('COUNT(DISTINCT chunk.doc_id)', 'count')
      .where('chunk.tenant_id = :tenantId', { tenantId })
      .andWhere(condominiumId ? 'chunk.condominium_id = :condominiumId' : '1=1', { condominiumId })
      .getRawOne()
      .then(result => parseInt(result.count));

    const languageStats = await this.ragChunkRepository
      .createQueryBuilder('chunk')
      .select('chunk.lang', 'lang')
      .addSelect('COUNT(*)', 'count')
      .where('chunk.tenant_id = :tenantId', { tenantId })
      .andWhere(condominiumId ? 'chunk.condominium_id = :condominiumId' : '1=1', { condominiumId })
      .groupBy('chunk.lang')
      .getRawMany();

    const languageDistribution = languageStats.reduce((acc, stat) => {
      acc[stat.lang] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      totalChunks,
      documentCount,
      languageDistribution,
    };
  }

  private async processBatch(
    tenantId: string,
    condominiumId: string,
    docId: string,
    chunks: Array<{
      sectionId: string;
      content: string;
      lang: string;
      meta?: Record<string, any>;
    }>,
  ): Promise<void> {
    // Generate embeddings for all chunks in batch
    const contents = chunks.map(chunk => chunk.content);
    const embeddings = await this.embeddingsService.generateBatchEmbeddings(contents);

    // Create chunk entities
    const chunkEntities = chunks.map((chunk, index) => 
      this.ragChunkRepository.create({
        tenantId,
        condominiumId,
        docId,
        sectionId: chunk.sectionId,
        content: chunk.content,
        embedding: embeddings[index],
        lang: chunk.lang,
        meta: chunk.meta || {},
      })
    );

    // Save batch
    await this.ragChunkRepository.save(chunkEntities);
  }
}