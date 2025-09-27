"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaGuard = void 0;
const common_1 = require("@nestjs/common");
let MfaGuard = class MfaGuard {
    async canActivate(context) {
        console.log('MFA Guard: Checking for recent second-factor authentication...');
        return true;
    }
};
exports.MfaGuard = MfaGuard;
exports.MfaGuard = MfaGuard = __decorate([
    (0, common_1.Injectable)()
], MfaGuard);
//# sourceMappingURL=mfa.guard.js.map