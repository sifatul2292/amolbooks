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
var RedirectUrlController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedirectUrlController = void 0;
const common_1 = require("@nestjs/common");
const redirect_url_dto_1 = require("../../dto/redirect-url.dto");
const redirect_url_service_1 = require("./redirect-url.service");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../decorator/get-token-user.decorator");
let RedirectUrlController = RedirectUrlController_1 = class RedirectUrlController {
    constructor(redirectUrlService) {
        this.redirectUrlService = redirectUrlService;
        this.logger = new common_1.Logger(RedirectUrlController_1.name);
    }
    async addRedirectUrl(addRedirectUrlDto) {
        return await this.redirectUrlService.addRedirectUrl(addRedirectUrlDto);
    }
    async insertManyRedirectUrl(body) {
        return await this.redirectUrlService.insertManyRedirectUrl(body.data, body.option);
    }
    async getAllRedirectUrls(filterRedirectUrlDto, searchString) {
        return this.redirectUrlService.getAllRedirectUrls(filterRedirectUrlDto, searchString);
    }
    async getAllRedirectUrlsBasic() {
        return await this.redirectUrlService.getAllRedirectUrlsBasic();
    }
    async getRedirectUrlById(id, select) {
        return await this.redirectUrlService.getRedirectUrlById(id, select);
    }
    async updateRedirectUrlById(id, updateRedirectUrlDto) {
        return await this.redirectUrlService.updateRedirectUrlById(id, updateRedirectUrlDto);
    }
    async updateMultipleRedirectUrlById(updateRedirectUrlDto) {
        return await this.redirectUrlService.updateMultipleRedirectUrlById(updateRedirectUrlDto.ids, updateRedirectUrlDto);
    }
    async deleteRedirectUrlById(id, checkUsage) {
        return await this.redirectUrlService.deleteRedirectUrlById(id, Boolean(checkUsage));
    }
    async deleteMultipleRedirectUrlById(data, checkUsage) {
        return await this.redirectUrlService.deleteMultipleRedirectUrlById(data.ids, Boolean(checkUsage));
    }
    async checkRedirectUrlAvailability(user, checkRedirectUrlDto) {
        return await this.redirectUrlService.checkRedirectUrlAvailability(user, checkRedirectUrlDto);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [redirect_url_dto_1.AddRedirectUrlDto]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "addRedirectUrl", null);
__decorate([
    (0, common_1.Post)('/insert-many'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "insertManyRedirectUrl", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [redirect_url_dto_1.FilterAndPaginationRedirectUrlDto, String]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "getAllRedirectUrls", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "getAllRedirectUrlsBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "getRedirectUrlById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, redirect_url_dto_1.UpdateRedirectUrlDto]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "updateRedirectUrlById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-multiple'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [redirect_url_dto_1.UpdateRedirectUrlDto]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "updateMultipleRedirectUrlById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "deleteRedirectUrlById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/delete-multiple'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Boolean]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "deleteMultipleRedirectUrlById", null);
__decorate([
    (0, common_1.Post)('/check-redirectUrl-availability'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, redirect_url_dto_1.CheckRedirectUrlDto]),
    __metadata("design:returntype", Promise)
], RedirectUrlController.prototype, "checkRedirectUrlAvailability", null);
RedirectUrlController = RedirectUrlController_1 = __decorate([
    (0, common_1.Controller)('redirect-url'),
    __metadata("design:paramtypes", [redirect_url_service_1.RedirectUrlService])
], RedirectUrlController);
exports.RedirectUrlController = RedirectUrlController;
//# sourceMappingURL=redirect-url.controller.js.map