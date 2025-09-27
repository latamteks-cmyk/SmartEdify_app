"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationCodeStoreService = void 0;
const common_1 = require("@nestjs/common");
let AuthorizationCodeStoreService = class AuthorizationCodeStoreService {
    store = new Map();
    set(code, data) {
        this.store.set(code, data);
    }
    get(code) {
        const data = this.store.get(code);
        if (data) {
            this.store.delete(code);
        }
        return data;
    }
};
exports.AuthorizationCodeStoreService = AuthorizationCodeStoreService;
exports.AuthorizationCodeStoreService = AuthorizationCodeStoreService = __decorate([
    (0, common_1.Injectable)()
], AuthorizationCodeStoreService);
//# sourceMappingURL=authorization-code-store.service.js.map