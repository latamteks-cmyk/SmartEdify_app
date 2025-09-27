"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const authorization_service_1 = require("../authorization.service");
let PolicyGuard = class PolicyGuard {
    reflector;
    authorizationService;
    constructor(reflector, authorizationService) {
        this.reflector = reflector;
        this.authorizationService = authorizationService;
    }
    async canActivate(context) {
        const requiredPolicies = this.reflector.get('policies', context.getHandler());
        if (!requiredPolicies) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        const resource = { id: 'mock_resource' };
        for (const policy of requiredPolicies) {
            const [action, resourceName] = policy.split(':');
            const isAllowed = await this.authorizationService.checkPolicy(user, action, resource);
            if (!isAllowed) {
                return false;
            }
        }
        return true;
    }
};
exports.PolicyGuard = PolicyGuard;
exports.PolicyGuard = PolicyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        authorization_service_1.AuthorizationService])
], PolicyGuard);
//# sourceMappingURL=policy.guard.js.map