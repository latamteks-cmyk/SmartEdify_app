"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const client_auth_guard_1 = require("./guards/client-auth.guard");
const authorization_code_store_service_1 = require("./store/authorization-code-store.service");
const tokens_module_1 = require("../tokens/tokens.module");
const users_module_1 = require("../users/users.module");
const sessions_module_1 = require("../sessions/sessions.module");
const par_store_service_1 = require("./store/par-store.service");
const device_code_store_service_1 = require("./store/device-code-store.service");
const refresh_token_entity_1 = require("../tokens/entities/refresh-token.entity");
const jti_store_service_1 = require("./store/jti-store.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([refresh_token_entity_1.RefreshToken]), tokens_module_1.TokensModule, users_module_1.UsersModule, sessions_module_1.SessionsModule],
        providers: [
            auth_service_1.AuthService,
            client_auth_guard_1.ClientAuthGuard,
            authorization_code_store_service_1.AuthorizationCodeStoreService,
            par_store_service_1.ParStoreService,
            device_code_store_service_1.DeviceCodeStoreService,
            jti_store_service_1.JtiStoreService
        ],
        controllers: [auth_controller_1.AuthController],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map