import { Injectable } from '@nestjs/common';
import { RegulatoryProfileService } from '../../compliance/services/regulatory-profile.service';
import { PolicyEvaluationDto } from '../dto/policy-evaluation.dto';

export interface PolicyDecision {
  decision: 'PERMIT' | 'DENY' | 'CONDITIONAL';
  obligations?: Array<{
    type: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  reasons: string[];
  policyRefs: string[];
  metadata: {
    evaluatedAt: Date;
    processingTimeMs: number;
    rulesEvaluated: number;
  };
}

@Injectable()
export class PolicyDecisionService {
  constructor(
    private readonly regulatoryProfileService: RegulatoryProfileService,
  ) {}

  async evaluate(request: PolicyEvaluationDto): Promise<PolicyDecision> {
    const startTime = Date.now();
    
    const profile = await this.regulatoryProfileService.getProfile(
      request.tenantId,
      request.countryCode,
    );

    if (!profile) {
      return {
        decision: 'DENY',
        reasons: [`No regulatory profile found for ${request.countryCode}`],
        policyRefs: [],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 0,
        },
      };
    }

    // Evaluar según el tipo de acción
    switch (request.action) {
      case 'assembly:create':
        return this.evaluateAssemblyCreation(request, profile, startTime);
      
      case 'assembly:join':
        return this.evaluateAssemblyJoin(request, profile, startTime);
      
      case 'reservation:create':
        return this.evaluateReservationCreation(request, profile, startTime);
      
      case 'streaming:validate_attendance':
        return this.evaluateStreamingAttendance(request, profile, startTime);
      
      case 'data:export':
      case 'data:delete':
        return this.evaluateDataRights(request, profile, startTime);
      
      default:
        return {
          decision: 'DENY',
          reasons: [`Unknown action: ${request.action}`],
          policyRefs: [],
          metadata: {
            evaluatedAt: new Date(),
            processingTimeMs: Date.now() - startTime,
            rulesEvaluated: 0,
          },
        };
    }
  }

  private evaluateAssemblyCreation(
    request: PolicyEvaluationDto,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    const reasons: string[] = [];
    const obligations: any[] = [];
    let decision: 'PERMIT' | 'DENY' | 'CONDITIONAL' = 'PERMIT';

    // Verificar si el usuario puede crear asambleas
    if (!request.subject.roles.includes('OWNER') && !request.subject.roles.includes('ADMIN')) {
      return {
        decision: 'DENY',
        reasons: ['Only owners or administrators can create assemblies'],
        policyRefs: ['regulatory_profile:assembly_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 1,
        },
      };
    }

    // Verificar días de aviso mínimo
    if (request.context?.scheduledDate && request.context?.noticeDate) {
      const scheduledDate = new Date(request.context.scheduledDate);
      const noticeDate = new Date(request.context.noticeDate);
      const daysDifference = Math.ceil(
        (scheduledDate.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDifference < profile.assemblyRules.minNoticedays) {
        decision = 'CONDITIONAL';
        obligations.push({
          type: 'REQUIRES_APPROVAL',
          description: `Assembly requires ${profile.assemblyRules.minNoticedays} days notice, but only ${daysDifference} provided`,
          parameters: {
            requiredDays: profile.assemblyRules.minNoticedays,
            actualDays: daysDifference,
          },
        });
        reasons.push('Insufficient notice period - requires approval');
      }
    }

    // Verificar modalidad permitida
    const modality = request.context?.modality;
    if (modality && !profile.assemblyRules.allowedMethods.includes(modality)) {
      return {
        decision: 'DENY',
        reasons: [`Assembly modality '${modality}' not allowed in ${request.countryCode}`],
        policyRefs: ['regulatory_profile:assembly_rules:allowed_methods'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 3,
        },
      };
    }

    return {
      decision,
      obligations: obligations.length > 0 ? obligations : undefined,
      reasons: reasons.length > 0 ? reasons : ['Assembly creation permitted'],
      policyRefs: ['regulatory_profile:assembly_rules'],
      metadata: {
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        rulesEvaluated: 3,
      },
    };
  }

  private evaluateAssemblyJoin(
    request: PolicyEvaluationDto,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    const hasVotingRights = request.subject.attributes?.hasVotingRights;
    const isEligible = request.subject.attributes?.isEligible;

    if (!isEligible) {
      return {
        decision: 'DENY',
        reasons: ['User is not eligible to participate in assemblies'],
        policyRefs: ['regulatory_profile:voting_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 1,
        },
      };
    }

    const obligations: any[] = [];
    if (!hasVotingRights) {
      obligations.push({
        type: 'OBSERVER_ONLY',
        description: 'User can observe but cannot vote',
        parameters: {
          reason: 'No voting rights',
        },
      });
    }

    return {
      decision: 'PERMIT',
      obligations: obligations.length > 0 ? obligations : undefined,
      reasons: ['Assembly participation permitted'],
      policyRefs: ['regulatory_profile:voting_rules'],
      metadata: {
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        rulesEvaluated: 2,
      },
    };
  }

  private evaluateReservationCreation(
    request: PolicyEvaluationDto,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    const amenityType = request.context?.amenityType;
    const partySize = request.context?.partySize;
    const amenityCapacity = request.context?.amenityCapacity;

    if (partySize && amenityCapacity && partySize > amenityCapacity) {
      return {
        decision: 'DENY',
        reasons: [`Party size (${partySize}) exceeds amenity capacity (${amenityCapacity})`],
        policyRefs: ['regulatory_profile:reservation_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 1,
        },
      };
    }

    const restrictedAmenities = ['piscina', 'salon_eventos', 'terraza'];
    const obligations: any[] = [];

    if (amenityType && restrictedAmenities.includes(amenityType)) {
      obligations.push({
        type: 'REQUIRES_APPROVAL',
        description: `Reservation for ${amenityType} requires administrator approval`,
        parameters: {
          amenityType,
          approvalRequired: true,
        },
      });
    }

    return {
      decision: obligations.length > 0 ? 'CONDITIONAL' : 'PERMIT',
      obligations: obligations.length > 0 ? obligations : undefined,
      reasons: ['Reservation permitted'],
      policyRefs: ['regulatory_profile:reservation_rules'],
      metadata: {
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        rulesEvaluated: 2,
      },
    };
  }

  private evaluateStreamingAttendance(
    request: PolicyEvaluationDto,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    const validationMethod = request.context?.validationMethod;
    const allowedMethods = ['QR', 'BIOMETRIC', 'SMS', 'EMAIL', 'MANUAL'];

    if (validationMethod && !allowedMethods.includes(validationMethod)) {
      return {
        decision: 'DENY',
        reasons: [`Validation method '${validationMethod}' not allowed`],
        policyRefs: ['regulatory_profile:streaming_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 1,
        },
      };
    }

    const obligations: any[] = [];

    if (validationMethod === 'BIOMETRIC') {
      obligations.push({
        type: 'REQUIRES_CONSENT',
        description: 'Biometric validation requires explicit user consent',
        parameters: {
          consentType: 'biometric_data_processing',
          required: true,
        },
      });
    }

    return {
      decision: obligations.length > 0 ? 'CONDITIONAL' : 'PERMIT',
      obligations: obligations.length > 0 ? obligations : undefined,
      reasons: ['Attendance validation permitted'],
      policyRefs: ['regulatory_profile:streaming_rules'],
      metadata: {
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        rulesEvaluated: 2,
      },
    };
  }

  private evaluateDataRights(
    request: PolicyEvaluationDto,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    const action = request.action;
    const dsarRules = profile.dsarRules;

    if (action === 'data:export' && !dsarRules.rightToPortability) {
      return {
        decision: 'DENY',
        reasons: ['Data portability not available in this jurisdiction'],
        policyRefs: ['regulatory_profile:dsar_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 1,
        },
      };
    }

    if (action === 'data:delete' && !dsarRules.rightToErasure) {
      return {
        decision: 'DENY',
        reasons: ['Data erasure not available in this jurisdiction'],
        policyRefs: ['regulatory_profile:dsar_rules'],
        metadata: {
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          rulesEvaluated: 1,
        },
      };
    }

    const obligations: any[] = [];

    obligations.push({
      type: 'REQUIRES_STRONG_AUTH',
      description: 'Data rights operations require additional identity verification',
      parameters: {
        authLevel: 'AAL2',
        methods: ['TOTP', 'BIOMETRIC'],
      },
    });

    return {
      decision: 'CONDITIONAL',
      obligations,
      reasons: ['Data rights operation permitted with additional verification'],
      policyRefs: ['regulatory_profile:dsar_rules'],
      metadata: {
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        rulesEvaluated: 3,
      },
    };
  }
}