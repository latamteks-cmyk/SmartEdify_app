import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

import { PolicyCompilerService } from './policy-compiler.service';
import { PolicyDraft, PolicyScope, PolicyDraftStatus } from '../entities/policy-draft.entity';
import { LlamaService } from './llama.service';
import { RagService } from './rag.service';
import { PolicyService } from '../../policies/policies.service';

describe('PolicyCompilerService', () => {
  let service: PolicyCompilerService;
  let policyDraftRepository: jest.Mocked<Repository<PolicyDraft>>;
  let llamaService: jest.Mocked<LlamaService>;
  let ragService: jest.Mocked<RagService>;
  let policyService: jest.Mocked<PolicyService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCondominiumId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyCompilerService,
        {
          provide: getRepositoryToken(PolicyDraft),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: LlamaService,
          useValue: {
            compilePolicy: jest.fn(),
          },
        },
        {
          provide: RagService,
          useValue: {
            getDocumentChunks: jest.fn(),
            searchSimilarChunks: jest.fn(),
          },
        },
        {
          provide: PolicyService,
          useValue: {
            createPolicy: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PolicyCompilerService>(PolicyCompilerService);
    policyDraftRepository = module.get(getRepositoryToken(PolicyDraft));
    llamaService = module.get(LlamaService);
    ragService = module.get(RagService);
    policyService = module.get(PolicyService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('compilePolicy', () => {
    const mockRequest = {
      tenantId: mockTenantId,
      condominiumId: mockCondominiumId,
      scope: PolicyScope.RESERVATION,
      docRefs: ['doc1', 'doc2'],
    };

    const mockChunks = [
      {
        content: 'Las reservas de la piscina requieren aprobación previa.',
        sectionId: 'section1',
        docId: 'doc1',
      },
      {
        content: 'El horario de uso es de 8:00 AM a 10:00 PM.',
        sectionId: 'section2',
        docId: 'doc2',
      },
    ];

    const mockCompilationResult = {
      policyJson: {
        rules: [
          {
            action: 'reservation:create',
            condition: 'amenity.type == "piscina"',
            obligations: [{ type: 'REQUIRES_APPROVAL', when: 'always' }],
            refs: ['doc1#section1'],
          },
        ],
        requiresHumanReview: false,
      },
      groundingScore: 0.92,
      promptHash: 'hash123',
      completionHash: 'hash456',
    };

    beforeEach(() => {
      ragService.getDocumentChunks.mockResolvedValue(mockChunks);
      llamaService.compilePolicy.mockResolvedValue(mockCompilationResult);
      policyDraftRepository.create.mockReturnValue({} as PolicyDraft);
      policyDraftRepository.save.mockResolvedValue({
        id: 'draft123',
        ...mockRequest,
        rules: mockCompilationResult.policyJson.rules,
        requiresHumanReview: false,
        status: PolicyDraftStatus.DRAFT,
        groundingScore: mockCompilationResult.groundingScore,
      } as PolicyDraft);
    });

    it('should compile policy successfully', async () => {
      const result = await service.compilePolicy(mockRequest);

      expect(ragService.getDocumentChunks).toHaveBeenCalledWith(
        mockTenantId,
        mockCondominiumId,
        'doc1',
      );
      expect(ragService.getDocumentChunks).toHaveBeenCalledWith(
        mockTenantId,
        mockCondominiumId,
        'doc2',
      );
      expect(llamaService.compilePolicy).toHaveBeenCalledWith(
        mockTenantId,
        mockCondominiumId,
        PolicyScope.RESERVATION,
        mockChunks,
      );
      expect(policyDraftRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('policy.draft.created', expect.any(Object));
      expect(result.id).toBe('draft123');
    });

    it('should require human review for low grounding score', async () => {
      llamaService.compilePolicy.mockResolvedValue({
        ...mockCompilationResult,
        groundingScore: 0.7, // Below threshold
      });

      const result = await service.compilePolicy(mockRequest);

      expect(result.requiresHumanReview).toBe(true);
      expect(result.status).toBe(PolicyDraftStatus.UNDER_REVIEW);
    });

    it('should require human review for complex rules', async () => {
      llamaService.compilePolicy.mockResolvedValue({
        ...mockCompilationResult,
        policyJson: {
          ...mockCompilationResult.policyJson,
          rules: [
            {
              action: 'reservation:create',
              condition: 'amenity.type == "piscina" && user.role == "admin" || time.hour > 20',
              obligations: [
                { type: 'REQUIRES_APPROVAL' },
                { type: 'SEND_NOTIFICATION' },
                { type: 'LOG_ACTIVITY' },
              ],
              exceptions: ['holiday', 'maintenance'],
              refs: ['doc1#section1'],
            },
          ],
        },
      });

      const result = await service.compilePolicy(mockRequest);

      expect(result.requiresHumanReview).toBe(true);
    });

    it('should throw error when no chunks found', async () => {
      ragService.getDocumentChunks.mockResolvedValue([]);

      await expect(service.compilePolicy(mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle search-based chunk retrieval', async () => {
      const requestWithoutDocRefs = {
        ...mockRequest,
        docRefs: [],
      };

      ragService.searchSimilarChunks.mockResolvedValue([
        {
          chunk: mockChunks[0],
          similarity: 0.85,
        },
      ]);

      await service.compilePolicy(requestWithoutDocRefs);

      expect(ragService.searchSimilarChunks).toHaveBeenCalledWith(
        'reservas amenidades horarios capacidad aprobación',
        mockTenantId,
        mockCondominiumId,
        20,
        0.6,
      );
    });
  });

  describe('promotePolicy', () => {
    const mockDraft = {
      id: 'draft123',
      tenantId: mockTenantId,
      condominiumId: mockCondominiumId,
      scope: PolicyScope.RESERVATION,
      status: PolicyDraftStatus.APPROVED,
      rules: [
        {
          action: 'reservation:create',
          condition: 'amenity.type == "piscina"',
          refs: ['doc1#section1'],
        },
      ],
      groundingScore: 0.92,
      sourceDocs: ['doc1', 'doc2'],
    } as PolicyDraft;

    const mockPolicyVersion = {
      id: 'policy123',
      version: 'v1.0.0',
    };

    beforeEach(() => {
      policyDraftRepository.findOne.mockResolvedValue(mockDraft);
      policyService.createPolicy.mockResolvedValue(mockPolicyVersion);
      policyDraftRepository.save.mockResolvedValue({
        ...mockDraft,
        status: PolicyDraftStatus.PUBLISHED,
        publishedVersion: mockPolicyVersion.version,
      } as PolicyDraft);
    });

    it('should promote approved policy successfully', async () => {
      const request = {
        draftId: 'draft123',
        versionNote: 'Initial version',
        reviewedBy: 'admin@example.com',
      };

      await service.promotePolicy(request);

      expect(policyService.createPolicy).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        condominiumId: mockCondominiumId,
        name: 'reservation_policy',
        description: 'Auto-generated reservation policy from documents',
        type: 'ABAC',
        rules: expect.any(Array),
        metadata: expect.objectContaining({
          sourceType: 'LLM_COMPILED',
          sourceDraftId: 'draft123',
          groundingScore: 0.92,
        }),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('policy.promoted', expect.any(Object));
    });

    it('should throw error for non-existent draft', async () => {
      policyDraftRepository.findOne.mockResolvedValue(null);

      const request = {
        draftId: 'nonexistent',
        versionNote: 'Test',
        reviewedBy: 'admin@example.com',
      };

      await expect(service.promotePolicy(request)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid status', async () => {
      policyDraftRepository.findOne.mockResolvedValue({
        ...mockDraft,
        status: PolicyDraftStatus.REJECTED,
      } as PolicyDraft);

      const request = {
        draftId: 'draft123',
        versionNote: 'Test',
        reviewedBy: 'admin@example.com',
      };

      await expect(service.promotePolicy(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewPolicy', () => {
    const mockDraft = {
      id: 'draft123',
      tenantId: mockTenantId,
      status: PolicyDraftStatus.UNDER_REVIEW,
    } as PolicyDraft;

    beforeEach(() => {
      policyDraftRepository.findOne.mockResolvedValue(mockDraft);
      policyDraftRepository.save.mockResolvedValue({
        ...mockDraft,
        status: PolicyDraftStatus.APPROVED,
        reviewedBy: 'admin@example.com',
        reviewNotes: 'Approved after review',
      } as PolicyDraft);
    });

    it('should approve policy successfully', async () => {
      const result = await service.reviewPolicy(
        'draft123',
        'admin@example.com',
        true,
        'Approved after review',
      );

      expect(result.status).toBe(PolicyDraftStatus.APPROVED);
      expect(result.reviewedBy).toBe('admin@example.com');
      expect(eventEmitter.emit).toHaveBeenCalledWith('policy.draft.reviewed', expect.any(Object));
    });

    it('should reject policy successfully', async () => {
      policyDraftRepository.save.mockResolvedValue({
        ...mockDraft,
        status: PolicyDraftStatus.REJECTED,
        reviewedBy: 'admin@example.com',
        reviewNotes: 'Rejected due to errors',
      } as PolicyDraft);

      const result = await service.reviewPolicy(
        'draft123',
        'admin@example.com',
        false,
        'Rejected due to errors',
      );

      expect(result.status).toBe(PolicyDraftStatus.REJECTED);
    });
  });

  describe('getDrafts', () => {
    it('should return drafts for tenant', async () => {
      const mockDrafts = [
        { id: 'draft1', tenantId: mockTenantId },
        { id: 'draft2', tenantId: mockTenantId },
      ] as PolicyDraft[];

      policyDraftRepository.find.mockResolvedValue(mockDrafts);

      const result = await service.getDrafts(mockTenantId);

      expect(policyDraftRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockDrafts);
    });

    it('should filter by condominium and status', async () => {
      await service.getDrafts(mockTenantId, mockCondominiumId, PolicyDraftStatus.APPROVED);

      expect(policyDraftRepository.find).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          condominiumId: mockCondominiumId,
          status: PolicyDraftStatus.APPROVED,
        },
        order: { createdAt: 'DESC' },
      });
    });
  });
});