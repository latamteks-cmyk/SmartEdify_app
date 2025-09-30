"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrcodesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const qrcodes_service_1 = require("./qrcodes.service");
const qrcodes_controller_1 = require("./qrcodes.controller");
const keys_module_1 = require("../keys/keys.module");
const dpop_replay_proof_entity_1 = require("../auth/entities/dpop-replay-proof.entity");
let QrcodesModule = class QrcodesModule {
};
exports.QrcodesModule = QrcodesModule;
exports.QrcodesModule = QrcodesModule = __decorate([
    (0, common_1.Module)({
        imports: [keys_module_1.KeysModule, typeorm_1.TypeOrmModule.forFeature([dpop_replay_proof_entity_1.DpopReplayProof])],
        providers: [qrcodes_service_1.QrcodesService],
        controllers: [qrcodes_controller_1.QrcodesController],
    })
], QrcodesModule);
//# sourceMappingURL=qrcodes.module.js.map