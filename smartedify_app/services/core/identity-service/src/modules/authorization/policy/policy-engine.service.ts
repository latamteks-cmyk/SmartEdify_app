import { Injectable } from '@nestjs/common';

interface User {
  roles: string[];
  id: string;
  buildingId?: string;
}

interface Resource {
  ownerId?: string;
  buildingId?: string;
}

type PolicyFunction = (user: User, resource: Resource) => boolean;

@Injectable()
export class PolicyEngineService {
  // Optional external evaluator (e.g., OPA/Cedar adapter)
  private externalEvaluator?: (policyName: string, user: Record<string, unknown>, resource: Record<string, unknown>) => boolean;

  private policies: Record<string, PolicyFunction> = {
    'document:read': (user: User, resource: Resource) => {
      // Allow if the user is an admin or if the user is the owner of the document
      return user.roles.includes('admin') || user.id === resource.ownerId;
    },
    'camera:view': (user: User, resource: Resource) => {
      // Allow if the user is a guard and the camera is in their building
      return (
        user.roles.includes('guard') && user.buildingId === resource.buildingId
      );
    },
  };

  registerExternalEvaluator(evaluator: (policyName: string, user: Record<string, unknown>, resource: Record<string, unknown>) => boolean) {
    this.externalEvaluator = evaluator;
  }

  evaluatePolicy(
    policyName: string,
    user: Record<string, unknown>,
    resource: Record<string, unknown>,
  ): boolean {
    // Delegate to external evaluator if configured
    if (this.externalEvaluator) {
      try {
        return this.externalEvaluator(policyName, user, resource);
      } catch {
        // Fall through to built-in policies on error
      }
    }
    const policy = this.policies[policyName];
    if (policy) {
      return policy(user as unknown as User, resource as unknown as Resource);
    }
    // Default to deny if the policy is not found
    return false;
  }
}
