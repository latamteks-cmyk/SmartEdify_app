"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngineService = void 0;
const common_1 = require("@nestjs/common");
let PolicyEngineService = class PolicyEngineService {
    policies = {
        'document:read': (user, resource) => {
            return user.roles.includes('admin') || user.id === resource.ownerId;
        },
        'camera:view': (user, resource) => {
            return (user.roles.includes('guard') && user.buildingId === resource.buildingId);
        },
    };
    evaluate(policyName, user, resource) {
        if (this.policies[policyName]) {
            return this.policies[policyName](user, resource);
        }
        return false;
    }
};
exports.PolicyEngineService = PolicyEngineService;
exports.PolicyEngineService = PolicyEngineService = __decorate([
    (0, common_1.Injectable)()
], PolicyEngineService);
//# sourceMappingURL=policy-engine.service.js.map