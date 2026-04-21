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
var GalleryController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const gallery_dto_1 = require("../../dto/gallery.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const gallery_service_1 = require("./gallery.service");
let GalleryController = GalleryController_1 = class GalleryController {
    constructor(galleryService) {
        this.galleryService = galleryService;
        this.logger = new common_1.Logger(GalleryController_1.name);
    }
    async addGallery(addGalleryDto) {
        return await this.galleryService.addGallery(addGalleryDto);
    }
    async insertManyGallery(body) {
        return await this.galleryService.insertManyGallery(body.data, body.option);
    }
    async getAllGalleries(filterGalleryDto, searchString) {
        return this.galleryService.getAllGalleries(filterGalleryDto, searchString);
    }
    async getAllGalleriesByAdmin(filterGalleryDto, searchString) {
        return this.galleryService.getAllGalleries(filterGalleryDto, searchString);
    }
    async getGalleryById(id, select) {
        return await this.galleryService.getGalleryById(id, select);
    }
    async updateGalleryById(id, updateGalleryDto) {
        return await this.galleryService.updateGalleryById(id, updateGalleryDto);
    }
    async updateMultipleGalleryById(updateGalleryDto) {
        return await this.galleryService.updateMultipleGalleryById(updateGalleryDto.ids, updateGalleryDto);
    }
    async deleteGalleryById(id) {
        return await this.galleryService.deleteGalleryById(id);
    }
    async deleteMultipleGalleryById(data) {
        return await this.galleryService.deleteMultipleGalleryById(data.ids);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gallery_dto_1.AddGalleryDto]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "addGallery", null);
__decorate([
    (0, common_1.Post)('/insert-many'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "insertManyGallery", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/all-galleries'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gallery_dto_1.FilterAndPaginationGalleryDto, String]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "getAllGalleries", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gallery_dto_1.FilterAndPaginationGalleryDto, String]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "getAllGalleriesByAdmin", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "getGalleryById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-gallery/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, gallery_dto_1.UpdateGalleryDto]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "updateGalleryById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-multiple-gallery-by-id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gallery_dto_1.UpdateGalleryDto]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "updateMultipleGalleryById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete-gallery/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "deleteGalleryById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/delete-multiple-gallery-by-id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "deleteMultipleGalleryById", null);
GalleryController = GalleryController_1 = __decorate([
    (0, common_1.Controller)('gallery'),
    __metadata("design:paramtypes", [gallery_service_1.GalleryService])
], GalleryController);
exports.GalleryController = GalleryController;
//# sourceMappingURL=gallery.controller.js.map