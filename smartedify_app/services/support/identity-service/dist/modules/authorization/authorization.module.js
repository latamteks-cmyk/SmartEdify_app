"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationModule = void 0;
const common_1 = require("@nestjs/common");
const authorization_service_1 = require("./authorization.service");
const policy_guard_1 = require("./guards/policy.guard");
const policy_engine_service_1 = require("./policy/policy-engine.service");
let AuthorizationModule = class AuthorizationModule {
};
exports.AuthorizationModule = AuthorizationModule;
exports.AuthorizationModule = AuthorizationModule = __decorate([
    (0, common_1.Module)({
        providers: [authorization_service_1.AuthorizationService, policy_guard_1.PolicyGuard, policy_engine_service_1.PolicyEngineService],
        exports: [authorization_service_1.AuthorizationService, policy_guard_1.PolicyGuard],
    })
], AuthorizationModule);
//# sourceMappingURL=authorization.module.js.map