import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PolicyEvaluationDto } from './dto/policy-evaluation.dto';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/policies')
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private readonly policyDecisionService: PolicyDecisionService,
  ) {}

  @Post('evaluate')
  @ApiOperation({ 
    summary: 'Evaluar política para una acción específica',
    description: 'Motor de decisiones de políticas (PDP) - evalúa si una acción está permitida según las reglas del tenant/país'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Decisión de política evaluada exitosamente',
    schema: {
      type: 'object',
      properties: {
        decision: { type: 'string', enum: ['PERMIT', 'DENY', 'CONDITIONAL'] },
        obligations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              description: { type: 'string' },
              parameters: { type: 'object' }
            }
          }
        },
        reasons: { type: 'array', items: { type: 'string' } },
        policyRefs: { type: 'array', items: { type: 'string' } },
        metadata: {
          type: 'object',
          properties: {
            evaluatedAt: { type: 'string', format: 'date-time' },
            processingTimeMs: { type: 'number' },
            rulesEvaluated: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Datos de evaluación inválidos' 
  })
  async evaluate(@Body() evaluationDto: PolicyEvaluationDto) {
    return this.policyDecisionService.evaluate(evaluationDto);
  }

  @Post('batch-evaluate')
  @ApiOperation({ 
    summary: 'Evaluar múltiples políticas en lote',
    description: 'Evalúa múltiples acciones de una vez para optimizar performance'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Decisiones de políticas evaluadas exitosamente' 
  })
  async batchEvaluate(@Body() evaluations: PolicyEvaluationDto[]) {
    const results = await Promise.all(
      evaluations.map(evaluation => 
        this.policyDecisionService.evaluate(evaluation)
      )
    );

    return {
      evaluations: results,
      summary: {
        total: results.length,
        permitted: results.filter(r => r.decision === 'PERMIT').length,
        denied: results.filter(r => r.decision === 'DENY').length,
        conditional: results.filter(r => r.decision === 'CONDITIONAL').length,
      }
    };
  }
}