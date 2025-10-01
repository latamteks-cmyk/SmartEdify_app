# Compliance Service - Plan de Implementación Híbrida

**Fecha**: 2025-01-01  
**Versión**: 1.0  
**Estado**: 📋 **PLAN PRAGMÁTICO**  

## Objetivo

Completar el compliance-service en **1 semana** con funcionalidad **suficiente** para desbloquear governance-service, manteniendo la arquitectura preparada para evolución futura hacia LLM+RAG.

## 🎯 Estrategia Híbrida

### Fase Inmediata (Esta semana)
1. **Completar implementación básica** - Validaciones + perfiles regulatorios
2. **Preparar arquitectura** - Interfaces y estructura para LLM futuro
3. **Mock avanzado** - Simular respuestas LLM para testing
4. **Integración funcional** - Que governance-service pueda consumir

### Fase Futura (Próximas semanas)
1. **Implementar LLM real** - Cuando recursos estén disponibles
2. **Agregar RAG** - Sistema de documentos completo
3. **Observabilidad avanzada** - Métricas LLM específicas

## 📋 Implementación Inmediata

### 1. Completar Módulos Básicos (Días 1-2)

#### A. Políticas Hardcoded Avanzadas
```typescript
// Expandir regulatory profiles con más detalle
export class RegulatoryProfileService {
  getAdvancedRules(tenantId: string, countryCode: string) {
    return {
      assembly: { /* reglas detalladas */ },
      reservation: { /* reglas de áreas comunes */ },
      streaming: { /* reglas de video */ },
      privacy: { /* reglas DSAR */ }
    };
  }
}
```

#### B. Policy Decision Point (PDP) Básico
```typescript
@Injectable()
export class PolicyDecisionService {
  async evaluate(request: PolicyEvaluationRequest): Promise<PolicyDecision> {
    // Lógica determinista basada en reglas hardcoded
    // Preparado para recibir políticas compiladas por LLM
  }
}
```

### 2. APIs Requeridas por Governance (Días 3-4)

#### A. Endpoints Críticos
```typescript
// Estos endpoints SON requeridos por governance-service
POST /api/v1/compliance/validate/assembly
POST /api/v1/compliance/validate/quorum  
POST /api/v1/compliance/validate/majority
GET /api/v1/compliance/policies/:tenantId
POST /api/v1/compliance/evaluate  // Nuevo - PDP endpoint
```

#### B. Mock de APIs Avanzadas
```typescript
// Preparar estructura para futuro LLM
POST /api/v1/compliance/policies:compile   // Mock response
POST /api/v1/compliance/policies:explain   // Mock response  
GET /api/v1/compliance/rag:search         // Mock response
```

### 3. Base de Datos Completa (Día 5)

#### A. Esquemas Actuales + Preparación Futura
```sql
-- Tablas actuales (implementadas)
compliance_policies
regulatory_profiles  
compliance_validations

-- Tablas preparadas para LLM (estructura, sin uso)
policy_drafts
rag_chunks
document_manifests
llm_audit_logs
```

### 4. Configuración e Integración (Días 6-7)

#### A. Environment Variables
```env
# Básico (funcional)
NODE_ENV=development
PORT=3012
DATABASE_URL=postgresql://...

# Preparado para LLM (sin usar aún)
LLM_BASE_URL=http://localhost:8089
EMBEDDINGS_URL=http://localhost:8091
VECTOR_DB_URL=postgresql://...
```

#### B. Docker Compose Preparado
```yaml
# compliance-service funcional
# llama, embeddings, pgvector comentados pero listos
```

## 🔧 Implementación Detallada

### Día 1: Completar Validaciones Avanzadas

<function_calls>
<invoke name="fsWrite">
<parameter name="path">smartedify_app/services/governance/compliance-service/src/modules/compliance/services/policy-decision.service.ts Injectable } from '@nestjs/common';
import { RegulatoryProfileService } from './regulatory-profile.service';

export interface PolicyEvaluationRequest {
  tenantId: string;
  countryCode: string;
  action: string;
  resource: string;
  subject: {
    userId: string;
    roles: string[];
    attributes: Record<string, any>;
  };
  context: Record<string, any>;
}

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

  async evaluate(request: PolicyEvaluationRequest): Promise<PolicyDecision> {
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
    request: PolicyEvaluationRequest,
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
    const scheduledDate = new Date(request.context.scheduledDate);
    const noticeDate = new Date(request.context.noticeDate || new Date());
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

    // Verificar modalidad permitida
    const modality = request.context.modality;
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
    request: PolicyEvaluationRequest,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    // Verificar si el usuario puede unirse a asambleas
    const hasVotingRights = request.subject.attributes.hasVotingRights;
    const isEligible = request.subject.attributes.isEligible;

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
    request: PolicyEvaluationRequest,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    // Lógica básica para reservas - expandir según necesidades
    const amenityType = request.context.amenityType;
    const partySize = request.context.partySize;
    const amenityCapacity = request.context.amenityCapacity;

    if (partySize > amenityCapacity) {
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

    // Amenidades que requieren aprobación especial
    const restrictedAmenities = ['piscina', 'salon_eventos', 'terraza'];
    const obligations: any[] = [];

    if (restrictedAmenities.includes(amenityType)) {
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
    request: PolicyEvaluationRequest,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    // Validar métodos de validación de asistencia permitidos
    const validationMethod = request.context.validationMethod;
    const allowedMethods = ['QR', 'BIOMETRIC', 'SMS', 'EMAIL', 'MANUAL'];

    if (!allowedMethods.includes(validationMethod)) {
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

    // Biometría requiere consentimiento explícito
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
    request: PolicyEvaluationRequest,
    profile: any,
    startTime: number,
  ): PolicyDecision {
    const action = request.action;
    const dsarRules = profile.dsarRules;

    // Verificar si el derecho está permitido
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

    // Verificación de identidad adicional para operaciones sensibles
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