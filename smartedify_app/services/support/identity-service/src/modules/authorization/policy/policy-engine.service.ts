import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyEngineService {
  private policies = {
    'document:read': (user, resource) => {
      // Allow if the user is an admin or if the user is the owner of the document
      return user.roles.includes('admin') || user.id === resource.ownerId;
    },
    'camera:view': (user, resource) => {
        // Allow if the user is a guard and the camera is in their building
        return user.roles.includes('guard') && user.buildingId === resource.buildingId;
    }
  };

  evaluate(policyName: string, user: any, resource: any): boolean {
    if (this.policies[policyName]) {
      return this.policies[policyName](user, resource);
    }
    // Default to deny if the policy is not found
    return false;
  }
}
