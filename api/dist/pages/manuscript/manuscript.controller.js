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
var ManuscriptController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManuscriptController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const manuscript_dto_1 = require("../../dto/manuscript.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const manuscript_service_1 = require("./manuscript.service");
let ManuscriptController = ManuscriptController_1 = class ManuscriptController {
    constructor(manuscriptService) {
        this.manuscriptService = manuscriptService;
        this.logger = new common_1.Logger(ManuscriptController_1.name);
    }
    async addManuscript(addManuscriptDto) {
        return await this.manuscriptService.addManuscript(addManuscriptDto);
    }
    async insertManyManuscript(body) {
        return await this.manuscriptService.insertManyManuscript(body.data, body.option);
    }
    async getAllManuscripts(filterManuscriptDto, searchString) {
        return this.manuscriptService.getAllManuscripts(filterManuscriptDto, searchString);
    }
    async getAllManuscriptsBasic() {
        return await this.manuscriptService.getAllManuscriptsBasic();
    }
    async getManuscriptById(id, select) {
        return await this.manuscriptService.getManuscriptById(id, select);
    }
    async updateManuscriptById(id, updateManuscriptDto) {
        return await this.manuscriptService.updateManuscriptById(id, updateManuscriptDto);
    }
    async updateMultipleManuscriptById(updateManuscriptDto) {
        return await this.manuscriptService.updateMultipleManuscriptById(updateManuscriptDto.ids, updateManuscriptDto);
    }
    async deleteManuscriptById(id, checkUsage) {
        return await this.manuscriptService.deleteManuscriptById(id, Boolean(checkUsage));
    }
    async deleteMultipleManuscriptById(data, checkUsage) {
        return await this.manuscriptService.deleteMultipleManuscriptById(data.ids, Boolean(checkUsage));
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [manuscript_dto_1.AddManuscriptDto]),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "addManuscript", null);
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
], ManuscriptController.prototype, "insertManyManuscript", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [manuscript_dto_1.FilterAndPaginationManuscriptDto, String]),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "getAllManuscripts", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "getAllManuscriptsBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "getManuscriptById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, manuscript_dto_1.UpdateManuscriptDto]),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "updateManuscriptById", null);
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
    __metadata("design:paramtypes", [manuscript_dto_1.UpdateManuscriptDto]),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "updateMultipleManuscriptById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], ManuscriptController.prototype, "deleteManuscriptById", null);
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
], ManuscriptController.prototype, "deleteMultipleManuscriptById", null);
ManuscriptController = ManuscriptController_1 = __decorate([
    (0, common_1.Controller)('manuscript'),
    __metadata("design:paramtypes", [manuscript_service_1.ManuscriptService])
], ManuscriptController);
exports.ManuscriptController = ManuscriptController;
//# sourceMappingURL=manuscript.controller.js.map