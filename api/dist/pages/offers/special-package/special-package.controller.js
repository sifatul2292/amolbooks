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
var SpecialPackageController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialPackageController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../../guards/admin-jwt-auth.guard");
const mongo_id_validation_pipe_1 = require("../../../pipes/mongo-id-validation.pipe");
const special_package_service_1 = require("./special-package.service");
const special_package_dto_1 = require("../../../dto/special-package.dto");
let SpecialPackageController = SpecialPackageController_1 = class SpecialPackageController {
    constructor(promoOfferService) {
        this.promoOfferService = promoOfferService;
        this.logger = new common_1.Logger(SpecialPackageController_1.name);
    }
    async addSpecialPackage(addSpecialPackageDto) {
        return await this.promoOfferService.addSpecialPackage(addSpecialPackageDto);
    }
    async insertManySpecialPackage(body) {
        return await this.promoOfferService.insertManySpecialPackage(body.data, body.option);
    }
    async getAllSpecialPackages(filterSpecialPackageDto, searchString) {
        return this.promoOfferService.getAllSpecialPackages(filterSpecialPackageDto, searchString);
    }
    async getSpecialPackageSingle(select) {
        return await this.promoOfferService.getSpecialPackageSingle(select);
    }
    async getSpecialPackageById(id, select) {
        return await this.promoOfferService.getSpecialPackageById(id, select);
    }
    async getSpecialPackageBySlug(slug, select) {
        return await this.promoOfferService.getSpecialPackageBySlug(slug, select);
    }
    async getProductByIds(ids, select) {
        return await this.promoOfferService.getSpecialPackageByIds(ids, select);
    }
    async updateSpecialPackageById(id, updateSpecialPackageDto) {
        return await this.promoOfferService.updateSpecialPackageById(id, updateSpecialPackageDto);
    }
    async updateMultipleSpecialPackageById(updateSpecialPackageDto) {
        return await this.promoOfferService.updateMultipleSpecialPackageById(updateSpecialPackageDto.ids, updateSpecialPackageDto);
    }
    async deleteSpecialPackageById(id, checkUsage) {
        return await this.promoOfferService.deleteSpecialPackageById(id, Boolean(checkUsage));
    }
    async deleteMultipleSpecialPackageById(data, checkUsage) {
        return await this.promoOfferService.deleteMultipleSpecialPackageById(data.ids, Boolean(checkUsage));
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [special_package_dto_1.AddSpecialPackageDto]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "addSpecialPackage", null);
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
], SpecialPackageController.prototype, "insertManySpecialPackage", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [special_package_dto_1.FilterAndPaginationSpecialPackageDto, String]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "getAllSpecialPackages", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/promotional-offer'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "getSpecialPackageSingle", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "getSpecialPackageById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/slug/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "getSpecialPackageBySlug", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-products-by-ids'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "getProductByIds", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, special_package_dto_1.UpdateSpecialPackageDto]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "updateSpecialPackageById", null);
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
    __metadata("design:paramtypes", [special_package_dto_1.UpdateSpecialPackageDto]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "updateMultipleSpecialPackageById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], SpecialPackageController.prototype, "deleteSpecialPackageById", null);
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
], SpecialPackageController.prototype, "deleteMultipleSpecialPackageById", null);
SpecialPackageController = SpecialPackageController_1 = __decorate([
    (0, common_1.Controller)('special-package'),
    __metadata("design:paramtypes", [special_package_service_1.SpecialPackageService])
], SpecialPackageController);
exports.SpecialPackageController = SpecialPackageController;
//# sourceMappingURL=special-package.controller.js.map