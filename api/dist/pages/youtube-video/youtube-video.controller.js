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
var YoutubeVideoController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeVideoController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const youtube_video_dto_1 = require("../../dto/youtube-video.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const youtube_video_service_1 = require("./youtube-video.service");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../decorator/get-token-user.decorator");
let YoutubeVideoController = YoutubeVideoController_1 = class YoutubeVideoController {
    constructor(youtubeVideoService) {
        this.youtubeVideoService = youtubeVideoService;
        this.logger = new common_1.Logger(YoutubeVideoController_1.name);
    }
    async addYoutubeVideo(addYoutubeVideoDto) {
        return await this.youtubeVideoService.addYoutubeVideo(addYoutubeVideoDto);
    }
    async insertManyYoutubeVideo(body) {
        return await this.youtubeVideoService.insertManyYoutubeVideo(body.data, body.option);
    }
    async getAllYoutubeVideos(filterYoutubeVideoDto, searchString) {
        return this.youtubeVideoService.getAllYoutubeVideos(filterYoutubeVideoDto, searchString);
    }
    async getAllYoutubeVideosBasic() {
        return await this.youtubeVideoService.getAllYoutubeVideosBasic();
    }
    async getYoutubeVideoById(id, select) {
        return await this.youtubeVideoService.getYoutubeVideoById(id, select);
    }
    async updateYoutubeVideoById(id, updateYoutubeVideoDto) {
        return await this.youtubeVideoService.updateYoutubeVideoById(id, updateYoutubeVideoDto);
    }
    async updateMultipleYoutubeVideoById(updateYoutubeVideoDto) {
        return await this.youtubeVideoService.updateMultipleYoutubeVideoById(updateYoutubeVideoDto.ids, updateYoutubeVideoDto);
    }
    async deleteYoutubeVideoById(id, checkUsage) {
        return await this.youtubeVideoService.deleteYoutubeVideoById(id, Boolean(checkUsage));
    }
    async deleteMultipleYoutubeVideoById(data, checkUsage) {
        return await this.youtubeVideoService.deleteMultipleYoutubeVideoById(data.ids, Boolean(checkUsage));
    }
    async checkYoutubeVideoAvailability(user, checkYoutubeVideoDto) {
        return await this.youtubeVideoService.checkYoutubeVideoAvailability(user, checkYoutubeVideoDto);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [youtube_video_dto_1.AddYoutubeVideoDto]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "addYoutubeVideo", null);
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
], YoutubeVideoController.prototype, "insertManyYoutubeVideo", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [youtube_video_dto_1.FilterAndPaginationYoutubeVideoDto, String]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "getAllYoutubeVideos", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "getAllYoutubeVideosBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "getYoutubeVideoById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, youtube_video_dto_1.UpdateYoutubeVideoDto]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "updateYoutubeVideoById", null);
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
    __metadata("design:paramtypes", [youtube_video_dto_1.UpdateYoutubeVideoDto]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "updateMultipleYoutubeVideoById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "deleteYoutubeVideoById", null);
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
], YoutubeVideoController.prototype, "deleteMultipleYoutubeVideoById", null);
__decorate([
    (0, common_1.Post)('/check-contact-availability'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, youtube_video_dto_1.CheckYoutubeVideoDto]),
    __metadata("design:returntype", Promise)
], YoutubeVideoController.prototype, "checkYoutubeVideoAvailability", null);
YoutubeVideoController = YoutubeVideoController_1 = __decorate([
    (0, common_1.Controller)('youtubeVideo'),
    __metadata("design:paramtypes", [youtube_video_service_1.YoutubeVideoService])
], YoutubeVideoController);
exports.YoutubeVideoController = YoutubeVideoController;
//# sourceMappingURL=youtube-video.controller.js.map