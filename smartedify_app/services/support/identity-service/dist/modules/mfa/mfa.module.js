"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaModule = void 0;
const common_1 = require("@nestjs/common");
const mfa_service_1 = require("./mfa.service");
const mfa_guard_1 = require("./guards/mfa.guard");
const users_module_1 = require("../users/users.module");
let MfaModule = class MfaModule {
};
exports.MfaModule = MfaModule;
exports.MfaModule = MfaModule = __decorate([
    (0, common_1.Module)({
        imports: [users_module_1.UsersModule],
        providers: [mfa_service_1.MfaService, mfa_guard_1.MfaGuard],
        exports: [mfa_service_1.MfaService, mfa_guard_1.MfaGuard],
    })
], MfaModule);
//# sourceMappingURL=mfa.module.js.map