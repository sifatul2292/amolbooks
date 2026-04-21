"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPermissionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const admin_permissions_decorator_1 = require("../decorator/admin-permissions.decorator");
let AdminPermissionGuard = class AdminPermissionGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const permissions = this.reflector.get(admin_permissions_decorator_1.ADMIN_PERMISSIONS_KEY, context.getHandler());
        if (!permissions) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        let user;
        if (request.admin) {
            user = request.admin;
        }
        else if (request.user) {
            user = request.user;
        }
        else {
            user = undefined;
        }
        if (user === null || user === void 0 ? void 0 : user.permissions.includes(permissions[0])) {
            return user === null || user === void 0 ? void 0 : user.permissions.includes(permissions[0]);
        }
        else {
            throw new common_1.UnauthorizedException('This role does not have permission for this advanced action.');
        }
    }
};
AdminPermissionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], AdminPermissionGuard);
exports.AdminPermissionGuard = AdminPermissionGuard;
//# sourceMappingURL=admin-permission.guard.js.map