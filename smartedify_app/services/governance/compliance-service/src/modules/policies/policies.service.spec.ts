import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesService } from './policies.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { RegulatoryProfileService } from '../compliance/services/regulatory-profile.service';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let policyDecisionService: PolicyDecisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        {
          provide: PolicyDecisionService,
          useValue: {
            evaluate: jest.fn(),
          },
        },
        {
          provide: RegulatoryProfileService,
          useValue: {
            getProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    policyDecisionService = module.get<PolicyDecisionService>(PolicyDecisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluate', () => {
    it('should evaluate a single policy', async () => {
      const mockEvaluation = {
        tenantId: 'test-tenant',
        countryCode: 'PE',
        action: 'assembly:create',
        resource: 'assembly:123',
        subject: {
          userId: 'user-123',
          roles: ['OWNER'],
          attributes: {},
        },
        context: {},
      };

      const mockResult = {
        decision: 'PERMIT' as const,
        reasons: ['Assembly creation permitted'],
        policyRefs: ['regulatory_profile:assembly_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: 50,
          rulesEvaluated: 3,
        },
      };

      jest.spyOn(policyDecisionService, 'evaluate').mockResolvedValue(mockResult);

      const result = await service.evaluate(mockEvaluation);

      expect(result).toEqual(mockResult);
      expect(policyDecisionService.evaluate).toHaveBeenCalledWith(mockEvaluation);
    });
  });

  describe('batchEvaluate', () => {
    it('should evaluate multiple policies and return summary', async () => {
      const mockEvaluations = [
        {
          tenantId: 'test-tenant',
          countryCode: 'PE',
          action: 'assembly:create',
          resource: 'assembly:123',
          subject: {
            userId: 'user-123',
            roles: ['OWNER'],
            attributes: {},
          },
          context: {},
        },
        {
          tenantId: 'test-tenant',
          countryCode: 'PE',
          action: 'assembly:join',
          resource: 'assembly:123',
          subject: {
            userId: 'user-456',
            roles: ['TENANT'],
            attributes: {},
          },
          context: {},
        },
      ];

      const mockResults = [
        {
          decision: 'PERMIT' as const,
          reasons: ['Assembly creation permitted'],
          policyRefs: ['regulatory_profile:assembly_rules'],
          metadata: {
            evaluatedAt: new Date(),
            processingTimeMs: 50,
            rulesEvaluated: 3,
          },
        },
        {
          decision: 'DENY' as const,
          reasons: ['User not eligible'],
          policyRefs: ['regulatory_profile:voting_rules'],
          metadata: {
            evaluatedAt: new Date(),
            processingTimeMs: 30,
            rulesEvaluated: 1,
          },
        },
      ];

      jest.spyOn(policyDecisionService, 'evaluate')
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await service.batchEvaluate(mockEvaluations);

      expect(result.evaluations).toEqual(mockResults);
      expect(result.summary).toEqual({
        total: 2,
        permitted: 1,
        denied: 1,
        conditional: 0,
      });
    });
  });
});