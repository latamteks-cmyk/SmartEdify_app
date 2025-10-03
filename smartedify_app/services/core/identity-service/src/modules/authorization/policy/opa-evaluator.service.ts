import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import * as fs from 'fs';

type OpaPolicy = {
  setData: (data: Record<string, unknown>) => void;
  evaluate: (input: unknown) => Array<unknown>;
};

@Injectable()
export class OpaEvaluatorService implements OnModuleInit {
  private readonly logger = new Logger(OpaEvaluatorService.name);
  private policy: OpaPolicy | null = null;

  constructor(
    private readonly policyEngine: PolicyEngineService,
    @Optional() private readonly data: Record<string, unknown> = {},
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const enabled = (process.env.OPA_POLICIES_ENABLED || 'false').toLowerCase() === 'true';
      const policyPath = process.env.OPA_WASM_POLICY_PATH;
      if (!enabled || !policyPath || !fs.existsSync(policyPath)) {
        this.logger.log('OPA evaluator disabled or policy file not found; using local policies.');
        return;
      }

      // Dynamically import to avoid load cost when disabled
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const opa = require('@open-policy-agent/opa-wasm');
      const wasm = fs.readFileSync(policyPath);
      const instance = await opa.loadPolicy(wasm);
      if (this.data) instance.setData(this.data);
      this.policy = instance as OpaPolicy;

      this.policyEngine.registerExternalEvaluator((policyName, user, resource) => {
        return this.evaluate(policyName, user, resource);
      });
      this.logger.log('OPA evaluator registered successfully.');
    } catch (err) {
      this.logger.warn(`OPA evaluator initialization failed; falling back to local policies. ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private evaluate(policyName: string, user: Record<string, unknown>, resource: Record<string, unknown>): boolean {
    if (!this.policy) return false;
    try {
      const outputs = this.policy.evaluate({ policy: policyName, user, resource });
      if (!outputs || outputs.length === 0) return false;
      const first = outputs[0] as any;
      // Common shapes: { result: true } or { allow: true }
      if (typeof first === 'boolean') return first;
      if (first?.result !== undefined) return Boolean(first.result);
      if (first?.allow !== undefined) return Boolean(first.allow);
      return false;
    } catch (e) {
      this.logger.warn(`OPA evaluation error for policy '${policyName}': ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}

