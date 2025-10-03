import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PolicyGuard } from './guards/policy.guard';
import { PolicyEngineService } from './policy/policy-engine.service';
import { OpaEvaluatorService } from './policy/opa-evaluator.service';

@Module({
  providers: [AuthorizationService, PolicyGuard, PolicyEngineService, OpaEvaluatorService],
  exports: [AuthorizationService, PolicyGuard],
})
export class AuthorizationModule {}
