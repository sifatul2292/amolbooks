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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const admin_service_1 = require("./admin.service");
const admin_dto_1 = require("../../dto/admin.dto");
const passport_1 = require("@nestjs/passport");
const get_admin_decorator_1 = require("../../decorator/get-admin.decorator");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const global_variables_1 = require("../../core/global-variables");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const change_password_dto_1 = require("../../dto/change-password.dto");
let AdminController = AdminController_1 = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
        this.logger = new common_1.Logger(AdminController_1.name);
    }
    async adminSignup(createAdminDto) {
        return await this.adminService.adminSignup(createAdminDto);
    }
    async adminLogin(authAdminDto) {
        return await this.adminService.adminLogin(authAdminDto);
    }
    async getLoggedInAdminData(adminSelectFieldDto, admin) {
        return this.adminService.getLoggedInAdminData(admin, adminSelectFieldDto);
    }
    async getAllAdmins(filterAdminDto, searchString) {
        return this.adminService.getAllAdmins(filterAdminDto, searchString);
    }
    async getAdminsBySearch(searchString, adminSelectFieldDto) {
        return this.adminService.getAdminsBySearch(searchString, adminSelectFieldDto);
    }
    async getAdminById(id, adminSelectFieldDto) {
        return await this.adminService.getAdminById(id, adminSelectFieldDto);
    }
    async updateLoggedInAdminInfo(admin, updateAdminDto) {
        return await this.adminService.updateLoggedInAdminInfo(admin, updateAdminDto);
    }
    async changeLoggedInAdminPassword(admin, changePasswordDto) {
        return await this.adminService.changeLoggedInAdminPassword(admin, changePasswordDto);
    }
    async updateAdminById(id, updateAdminDto) {
        return await this.adminService.updateAdminById(id, updateAdminDto);
    }
    async updateMultipleAdminById(updateAdminDto) {
        return await this.adminService.updateMultipleAdminById(updateAdminDto.ids, updateAdminDto);
    }
    async deleteAdminById(id) {
        return await this.adminService.deleteAdminById(id);
    }
    async deleteMultipleAdminById(data) {
        return await this.adminService.deleteMultipleAdminById(data.ids);
    }
};
__decorate([
    (0, common_1.Post)('/signup'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.CreateAdminDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "adminSignup", null);
__decorate([
    (0, common_1.Post)('/login'),
    (0, throttler_1.Throttle)(5, 60),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.AuthAdminDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "adminLogin", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/logged-in-admin-data'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_ADMIN_TOKEN_TYPE)),
    __param(0, (0, common_1.Query)(common_1.ValidationPipe)),
    __param(1, (0, get_admin_decorator_1.GetAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.AdminSelectFieldDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLoggedInAdminData", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/all-admins'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.FilterAndPaginationAdminDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllAdmins", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/admins-by-search'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.AdminSelectFieldDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAdminsBySearch", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.AdminSelectFieldDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAdminById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-logged-in-admin'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_ADMIN_TOKEN_TYPE)),
    __param(0, (0, get_admin_decorator_1.GetAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_dto_1.UpdateAdminDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateLoggedInAdminInfo", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/change-logged-in-admin-password'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_ADMIN_TOKEN_TYPE)),
    __param(0, (0, get_admin_decorator_1.GetAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "changeLoggedInAdminPassword", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-admin/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.UpdateAdminDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateAdminById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-multiple-admin-by-id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.UpdateAdminDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateMultipleAdminById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete-admin/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteAdminById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/delete-multiple-admin-by-id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteMultipleAdminById", null);
AdminController = AdminController_1 = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map