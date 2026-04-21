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
var BlogCommentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogCommentController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const blog_comment_dto_1 = require("../../dto/blog-comment.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const blog_comment_service_1 = require("./blog-comment.service");
const get_user_decorator_1 = require("../../decorator/get-user.decorator");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
const passport_1 = require("@nestjs/passport");
const global_variables_1 = require("../../core/global-variables");
const get_token_user_decorator_1 = require("../../decorator/get-token-user.decorator");
let BlogCommentController = BlogCommentController_1 = class BlogCommentController {
    constructor(blogCommentService) {
        this.blogCommentService = blogCommentService;
        this.logger = new common_1.Logger(BlogCommentController_1.name);
    }
    async addBlogComment(user, addBlogCommentDto) {
        return await this.blogCommentService.addBlogComment(user, addBlogCommentDto);
    }
    async addBlogCommentByAdmin(addBlogCommentDto) {
        return await this.blogCommentService.addBlogCommentByAdmin(addBlogCommentDto);
    }
    async getAllBlogComments() {
        return this.blogCommentService.getAllBlogComments();
    }
    async getAllBlogCommentsByQuery(filterBlogCommentDto, searchString) {
        return this.blogCommentService.getAllBlogCommentsByQuery(filterBlogCommentDto, searchString);
    }
    async getCartByUserId(user) {
        return this.blogCommentService.getBlogCommentByUserId(user);
    }
    async getBlogCommentById(id, select) {
        return await this.blogCommentService.getBlogCommentById(id, select);
    }
    async updateBlogCommentById(updateBlogCommentDto) {
        return await this.blogCommentService.updateBlogCommentById(updateBlogCommentDto);
    }
    async updateBlogCommentByIdAndDelete(updateBlogCommentDto) {
        return await this.blogCommentService.updateBlogCommentByIdAndDelete(updateBlogCommentDto);
    }
    async deleteBlogCommentById(id) {
        return await this.blogCommentService.deleteBlogCommentById(id);
    }
    async deleteBlogCommentByLoggedinUserAndBlogCommentId(id, user) {
        return await this.blogCommentService.deleteBlogCommentByLoggedinUserAndBlogCommentId(id, user);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, blog_comment_dto_1.AddBlogCommentDto]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "addBlogComment", null);
__decorate([
    (0, common_1.Post)('/add-by-admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_comment_dto_1.AddBlogCommentDto]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "addBlogCommentByAdmin", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-blogComment'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "getAllBlogComments", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all-blogComment-by-query'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_comment_dto_1.FilterAndPaginationBlogCommentDto, String]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "getAllBlogCommentsByQuery", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-BlogComment-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "getCartByUserId", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "getBlogCommentById", null);
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
    __metadata("design:paramtypes", [blog_comment_dto_1.UpdateBlogCommentDto]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "updateBlogCommentById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-and-blogComment-remove'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_comment_dto_1.UpdateBlogCommentDto]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "updateBlogCommentByIdAndDelete", null);
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
], BlogCommentController.prototype, "deleteBlogCommentById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete-loggedin-user-blogComment/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogCommentController.prototype, "deleteBlogCommentByLoggedinUserAndBlogCommentId", null);
BlogCommentController = BlogCommentController_1 = __decorate([
    (0, common_1.Controller)('comment'),
    __metadata("design:paramtypes", [blog_comment_service_1.BlogCommentService])
], BlogCommentController);
exports.BlogCommentController = BlogCommentController;
//# sourceMappingURL=blog-comment.controller.js.map