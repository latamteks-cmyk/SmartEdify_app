"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebauthnModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const webauthn_credential_entity_1 = require("./entities/webauthn-credential.entity");
const webauthn_service_1 = require("./webauthn.service");
const webauthn_controller_1 = require("./webauthn.controller");
const rp_service_1 = require("./rp.service");
const users_module_1 = require("../users/users.module");
let WebauthnModule = class WebauthnModule {
};
exports.WebauthnModule = WebauthnModule;
exports.WebauthnModule = WebauthnModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([webauthn_credential_entity_1.WebAuthnCredential]), users_module_1.UsersModule],
        providers: [webauthn_service_1.WebauthnService, rp_service_1.RpService],
        controllers: [webauthn_controller_1.WebauthnController],
    })
], WebauthnModule);
//# sourceMappingURL=webauthn.module.js.map