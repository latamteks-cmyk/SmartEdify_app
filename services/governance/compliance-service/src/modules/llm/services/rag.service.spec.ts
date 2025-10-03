import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RagService } from './rag.service';
import { RagChunk } from '../entities/rag-chunk.entity';
import { DocumentManifest, ProcessingStatus } from '../entities/document-manifest.entity';
import { EmbeddingsService } from './embeddings.service';

describe('RagService', () => {
  let service: RagService;
  let ragChunkRepository: jest.Mocked<Repository<RagChunk>>;
  let documentManifestRepository: jest.Mocked<Repository<DocumentManifest>>;
  let embeddingsService: jest.Mocked<EmbeddingsService>;

  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCondominiumId = '123e4567-e89b-12d3-a456-426614174001';
  const mockDocId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: getRepositoryToken(RagChunk),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentManifest),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: EmbeddingsService,
          useValue: {
            generateEmbedding: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    ragChunkRepository = module.get(getRepositoryToken(RagChunk));
    documentManifestRepository = module.get(getRepositoryToken(DocumentManifest));
    embeddingsService = module.get(EmbeddingsService);
  });

  describe('indexDocument', () => {
    const mockDocument = {
      tenantId: mockTenantId,
      condominiumId: mockCondominiumId,
      docId: mockDocId,
      filename: 'test.pdf',
      content: 'This is a test document with multiple sentences. It contains important information about reservations.',
      contentHash: 'hash123',
      fileSize: 1024,
      mimeType: 'application/pdf',
    };

    beforeEach(() => {
      embeddingsService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      documentManifestRepository.create.mockReturnValue({} as DocumentManifest);
      documentManifestRepository.save.mockResolvedValue({
        ...mockDocument,
        id: 'manifest123',
        processingStatus: ProcessingStatus.COMPLETED,
        chunkCount: 2,
      } as DocumentManifest);
      ragChunkRepository.save.mockResolvedValue({} as RagChunk);
    });

    it('should index document successfully', async () => {
      await service.indexDocument(mockDocument);

      expect(documentManifestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.PROCESSING,
        }),
      );

      // Should create chunks for each sentence
      expect(ragChunkRepository.save).toHaveBeenCalledTimes(2);
      expect(embeddingsService.generateEmbedding).toHaveBeenCalledTimes(2);

      expect(documentManifestRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED,
          chunkCount: 2,
        }),
      );
    });

    it('should handle embedding generation failure', async () => {
      embeddingsService.generateEmbedding.mockRejectedValue(new Error('Embedding failed'));

      await expect(service.indexDocument(mockDocument)).rejects.toThrow('Embedding failed');

      expect(documentManifestRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.FAILED,
        }),
      );
    });

    it('should skip short chunks', async () => {
      const shortDocument = {
        ...mockDocument,
        content: 'Short.',
      };

      await service.indexDocument(shortDocument);

      // Should not create chunks for very short content
      expect(ragChunkRepository.save).not.toHaveBeenCalled();
    });

    it('should handle long documents with chunking', async () => {
      const longContent = 'A'.repeat(2000) + '. ' + 'B'.repeat(2000) + '.';
      const longDocument = {
        ...mockDocument,
        content: longContent,
      };

      await service.indexDocument(longDocument);

      // Should create multiple chunks for long content
      expect(ragChunkRepository.save).toHaveBeenCalled();
      expect(embeddingsService.generateEmbedding).toHaveBeenCalled();
    });
  });

  describe('searchSimilarChunks', () => {
    const mockQueryEmbedding = [0.1, 0.2, 0.3];
    const mockSearchResults = [
      {
        chunk_id: 'chunk1',
        doc_id: mockDocId,
        section_id: 'section1',
        content: 'Test content 1',
        similarity: 0.95,
        lang: 'es',
        meta: {},
      },
      {
        chunk_id: 'chunk2',
        doc_id: mockDocId,
        section_id: 'section2',
        content: 'Test content 2',
        similarity: 0.85,
        lang: 'es',
        meta: {},
      },
    ];

    beforeEach(() => {
      embeddingsService.generateEmbedding.mockResolvedValue(mockQueryEmbedding);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockSearchResults),
      };

      ragChunkRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
    });

    it('should search similar chunks successfully', async () => {
      const results = await service.searchSimilarChunks(
        'test query',
        mockTenantId,
        mockCondominiumId,
        10,
        0.7,
      );

      expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(ragChunkRepository.createQueryBuilder).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBe(0.95);
      expect(results[0].chunk.content).toBe('Test content 1');
    });

    it('should filter by similarity threshold', async () => {
      const lowSimilarityResults = [
        { ...mockSearchResults[0], similarity: 0.6 },
        { ...mockSearchResults[1], similarity: 0.5 },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(lowSimilarityResults),
      };

      ragChunkRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const results = await service.searchSimilarChunks(
        'test query',
        mockTenantId,
        mockCondominiumId,
        10,
        0.7,
      );

      // Should filter out results below threshold
      expect(results).toHaveLength(0);
    });

    it('should limit results by topK', async () => {
      const results = await service.searchSimilarChunks(
        'test query',
        mockTenantId,
        mockCondominiumId,
        1,
        0.7,
      );

      const mockQueryBuilder = ragChunkRepository.createQueryBuilder();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('getDocumentChunks', () => {
    const mockChunks = [
      {
        id: 'chunk1',
        docId: mockDocId,
        sectionId: 'section1',
        content: 'Chunk 1 content',
        tenantId: mockTenantId,
        condominiumId: mockCondominiumId,
      },
      {
        id: 'chunk2',
        docId: mockDocId,
        sectionId: 'section2',
        content: 'Chunk 2 content',
        tenantId: mockTenantId,
        condominiumId: mockCondominiumId,
      },
    ] as RagChunk[];

    beforeEach(() => {
      ragChunkRepository.find.mockResolvedValue(mockChunks);
    });

    it('should get document chunks successfully', async () => {
      const results = await service.getDocumentChunks(
        mockTenantId,
        mockCondominiumId,
        mockDocId,
      );

      expect(ragChunkRepository.find).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          condominiumId: mockCondominiumId,
          docId: mockDocId,
        },
        order: { createdAt: 'ASC' },
      });

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Chunk 1 content');
    });
  });

  describe('getChunkStats', () => {
    const mockStats = [
      {
        total_chunks: 100,
        document_count: 10,
        language_distribution: { es: 80, en: 20 },
      },
    ];

    beforeEach(() => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockStats),
      };

      ragChunkRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
    });

    it('should get chunk statistics successfully', async () => {
      const results = await service.getChunkStats(mockTenantId, mockCondominiumId);

      expect(results.totalChunks).toBe(100);
      expect(results.documentCount).toBe(10);
      expect(results.languageDistribution).toEqual({ es: 80, en: 20 });
    });

    it('should get stats for all condominiums when not specified', async () => {
      await service.getChunkStats(mockTenantId);

      const mockQueryBuilder = ragChunkRepository.createQueryBuilder();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('tenant_id = :tenantId', {
        tenantId: mockTenantId,
      });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocumentChunks', () => {
    it('should delete document chunks successfully', async () => {
      ragChunkRepository.delete.mockResolvedValue({ affected: 5 } as any);

      const result = await service.deleteDocumentChunks(
        mockTenantId,
        mockCondominiumId,
        mockDocId,
      );

      expect(ragChunkRepository.delete).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        condominiumId: mockCondominiumId,
        docId: mockDocId,
      });

      expect(result).toBe(5);
    });
  });
});