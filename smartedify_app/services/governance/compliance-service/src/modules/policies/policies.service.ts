import { Injectable } from '@nestjs/common';
import { PolicyDecisionService } from './services/policy-decision.service';
import { PolicyEvaluationDto } from './dto/policy-evaluation.dto';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly policyDecisionService: PolicyDecisionService,
  ) {}

  async evaluate(evaluationDto: PolicyEvaluationDto) {
    return this.policyDecisionService.evaluate(evaluationDto);
  }

  async batchEvaluate(evaluations: PolicyEvaluationDto[]) {
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