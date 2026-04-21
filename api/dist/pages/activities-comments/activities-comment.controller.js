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
var ActivitiesCommentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesCommentController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const activities_comment_dto_1 = require("../../dto/activities-comment.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const activities_comment_service_1 = require("./activities-comment.service");
const get_user_decorator_1 = require("../../decorator/get-user.decorator");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
const passport_1 = require("@nestjs/passport");
const global_variables_1 = require("../../core/global-variables");
const get_token_user_decorator_1 = require("../../decorator/get-token-user.decorator");
let ActivitiesCommentController = ActivitiesCommentController_1 = class ActivitiesCommentController {
    constructor(activitiesCommentService) {
        this.activitiesCommentService = activitiesCommentService;
        this.logger = new common_1.Logger(ActivitiesCommentController_1.name);
    }
    async addActivitiesComment(user, addActivitiesCommentDto) {
        return await this.activitiesCommentService.addActivitiesComment(user, addActivitiesCommentDto);
    }
    async addActivitiesCommentByAdmin(addActivitiesCommentDto) {
        return await this.activitiesCommentService.addActivitiesCommentByAdmin(addActivitiesCommentDto);
    }
    async getAllActivitiesComments() {
        return this.activitiesCommentService.getAllActivitiesComments();
    }
    async getAllActivitiesCommentsByQuery(filterActivitiesCommentDto, searchString) {
        return this.activitiesCommentService.getAllActivitiesCommentsByQuery(filterActivitiesCommentDto, searchString);
    }
    async getCartByUserId(user) {
        return this.activitiesCommentService.getActivitiesCommentByUserId(user);
    }
    async getActivitiesCommentById(id, select) {
        return await this.activitiesCommentService.getActivitiesCommentById(id, select);
    }
    async updateActivitiesCommentById(updateActivitiesCommentDto) {
        return await this.activitiesCommentService.updateActivitiesCommentById(updateActivitiesCommentDto);
    }
    async updateActivitiesCommentByIdAndDelete(updateActivitiesCommentDto) {
        return await this.activitiesCommentService.updateActivitiesCommentByIdAndDelete(updateActivitiesCommentDto);
    }
    async deleteActivitiesCommentById(id) {
        return await this.activitiesCommentService.deleteActivitiesCommentById(id);
    }
    async deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(id, user) {
        return await this.activitiesCommentService.deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(id, user);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, activities_comment_dto_1.AddActivitiesCommentDto]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "addActivitiesComment", null);
__decorate([
    (0, common_1.Post)('/add-by-admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_comment_dto_1.AddActivitiesCommentDto]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "addActivitiesCommentByAdmin", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-activitiesComment'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "getAllActivitiesComments", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all-activitiesComment-by-query'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_comment_dto_1.FilterAndPaginationActivitiesCommentDto, String]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "getAllActivitiesCommentsByQuery", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-ActivitiesComment-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "getCartByUserId", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "getActivitiesCommentById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_comment_dto_1.UpdateActivitiesCommentDto]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "updateActivitiesCommentById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-and-activitiesComment-remove'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activities_comment_dto_1.UpdateActivitiesCommentDto]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "updateActivitiesCommentByIdAndDelete", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
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
], ActivitiesCommentController.prototype, "deleteActivitiesCommentById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete-loggedin-user-activitiesComment/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ActivitiesCommentController.prototype, "deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId", null);
ActivitiesCommentController = ActivitiesCommentController_1 = __decorate([
    (0, common_1.Controller)('activities-comment'),
    __metadata("design:paramtypes", [activities_comment_service_1.ActivitiesCommentService])
], ActivitiesCommentController);
exports.ActivitiesCommentController = ActivitiesCommentController;
//# sourceMappingURL=activities-comment.controller.js.map