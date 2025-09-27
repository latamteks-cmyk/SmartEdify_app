"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const database_config_1 = require("./database.config");
exports.default = new typeorm_1.DataSource((0, database_config_1.getDatabaseConfig)(false));
//# sourceMappingURL=typeorm.config.js.map