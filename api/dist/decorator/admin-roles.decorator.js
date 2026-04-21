"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminMetaRoles = void 0;
const common_1 = require("@nestjs/common");
const global_variables_1 = require("../core/global-variables");
const AdminMetaRoles = (...roles) => (0, common_1.SetMetadata)(global_variables_1.ADMIN_ROLES_KEY, roles);
exports.AdminMetaRoles = AdminMetaRoles;
//# sourceMappingURL=admin-roles.decorator.js.map