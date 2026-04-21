"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminMetaPermissions = exports.ADMIN_PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ADMIN_PERMISSIONS_KEY = 'adminPermissions';
const AdminMetaPermissions = (...permissions) => (0, common_1.SetMetadata)(exports.ADMIN_PERMISSIONS_KEY, permissions);
exports.AdminMetaPermissions = AdminMetaPermissions;
//# sourceMappingURL=admin-permissions.decorator.js.map