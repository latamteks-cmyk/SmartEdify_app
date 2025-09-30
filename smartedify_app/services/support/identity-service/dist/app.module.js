"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const keys_module_1 = require("./modules/keys/keys.module");
const schedule_1 = require("@nestjs/schedule");
const database_config_1 = require("./config/database.config");
const users_module_1 = require("./modules/users/users.module");
const sessions_module_1 = require("./modules/sessions/sessions.module");
const tokens_module_1 = require("./modules/tokens/tokens.module");
const webauthn_module_1 = require("./modules/webauthn/webauthn.module");
const auth_module_1 = require("./modules/auth/auth.module");
const authorization_module_1 = require("./modules/authorization/authorization.module");
const compliance_module_1 = require("./modules/compliance/compliance.module");
const qrcodes_module_1 = require("./modules/qrcodes/qrcodes.module");
const mfa_module_1 = require("./modules/mfa/mfa.module");
const oidc_discovery_module_1 = require("./modules/oidc-discovery/oidc-discovery.module");
const metrics_module_1 = require("./modules/metrics/metrics.module");
const privacy_module_1 = require("./modules/privacy/privacy.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            typeorm_1.TypeOrmModule.forRoot((0, database_config_1.getDatabaseConfig)()),
            keys_module_1.KeysModule,
            users_module_1.UsersModule,
            sessions_module_1.SessionsModule,
            tokens_module_1.TokensModule,
            webauthn_module_1.WebauthnModule,
            auth_module_1.AuthModule,
            authorization_module_1.AuthorizationModule,
            compliance_module_1.ComplianceModule,
            qrcodes_module_1.QrcodesModule,
            mfa_module_1.MfaModule,
            oidc_discovery_module_1.OidcDiscoveryModule,
            metrics_module_1.MetricsModule,
            privacy_module_1.PrivacyModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map