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
var ActivitiesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../../guards/admin-jwt-auth.guard");
const activities_dto_1 = require("../../../dto/activities.dto");
const mongo_id_validation_pipe_1 = require("../../../pipes/mongo-id-validation.pipe");
const activities_service_1 = require("./activities.service");
const user_jwt_auth_guard_1 = require("../../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../../decorator/get-token-user.decorator");
let ActivitiesController = ActivitiesController_1 = class ActivitiesController {
    constructor(activitiesService) {
        this.activitiesService = activitiesService;
        this.logger = new common_1.Logger(ActivitiesController_1.name);
    }
    async addActivities(addActivitiesDto) {
        return await this.activitiesService.addActivities(addActivitiesDto);
    }
    async insertManyActivities(body) {
        return await this.activitiesService.insertManyActivities(body.data, body.option);
    }
    async getAllActivitiess(filterActivitiesDto, searchString) {
        return this.activitiesService.getAllActivitiess(filterActivitiesDto, searchString);
    }
    async getAllActivitiessBasic() {
        return await this.activitiesService.getAllActivitiessBasic();
    }
    async productViewCount(data) {
        return await this.activitiesService.activitiesViewCount(data === null || data === void 0 ? void 0 : data.id, data === null || data === void 0 ? void 0 : data.user);
    }
    async getActivitiesById(id, select) {
        return await this.activitiesService.getActivitiesById(id, select);
    }
    async updateActivitiesById(id, updateActivitiesDto) {
        return await this.activitiesService.updateActivitiesById(id, updateActivitiesDto);
    }
    async updateMultipleActivitiesById(updateActivitiesDto) {
        return await this.activitiesService.updateMultipleActivitiesById(updateActivitiesDto.ids, updateActivitiesDto);
    }
    async deleteActivitiesById(id, checkUsage) {
        return await this.activitiesService.deleteActivitiesById(id, Boolean(checkUsage));
    }
    async deleteMultipleActivitiesById(data, checkUsage) {
        return await this.activitiesService.deleteMultipleActivitiesById(data.ids, Boolean(checkUsage));
    }
    async checkActivitiesAvailability(user, checkActivitiesDto) {
        return await this.activitiesService.checkActivitiesAvailability(user, checkActivitiesDto);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_dto_1.AddActivitiesDto]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "addActivities", null);
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
], ActivitiesController.prototype, "insertManyActivities", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_dto_1.FilterAndPaginationActivitiesDto, String]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "getAllActivitiess", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "getAllActivitiessBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/activities-view-count'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "productViewCount", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "getActivitiesById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, activities_dto_1.UpdateActivitiesDto]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "updateActivitiesById", null);
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
    __metadata("design:paramtypes", [activities_dto_1.UpdateActivitiesDto]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "updateMultipleActivitiesById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "deleteActivitiesById", null);
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
], ActivitiesController.prototype, "deleteMultipleActivitiesById", null);
__decorate([
    (0, common_1.Post)('/check-profile-availability'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, activities_dto_1.CheckActivitiesDto]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "checkActivitiesAvailability", null);
ActivitiesController = ActivitiesController_1 = __decorate([
    (0, common_1.Controller)('activities'),
    __metadata("design:paramtypes", [activities_service_1.ActivitiesService])
], ActivitiesController);
exports.ActivitiesController = ActivitiesController;
//# sourceMappingURL=activities.controller.js.map