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
var BannerCaroselController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerCaroselController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../../guards/admin-jwt-auth.guard");
const banner_carosel_dto_1 = require("../../../dto/banner-carosel.dto");
const mongo_id_validation_pipe_1 = require("../../../pipes/mongo-id-validation.pipe");
const banner_carosel_service_1 = require("./banner-carosel.service");
const user_jwt_auth_guard_1 = require("../../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../../decorator/get-token-user.decorator");
let BannerCaroselController = BannerCaroselController_1 = class BannerCaroselController {
    constructor(bannerCaroselService) {
        this.bannerCaroselService = bannerCaroselService;
        this.logger = new common_1.Logger(BannerCaroselController_1.name);
    }
    async addBannerCarosel(addBannerCaroselDto) {
        return await this.bannerCaroselService.addBannerCarosel(addBannerCaroselDto);
    }
    async insertManyBannerCarosel(body) {
        return await this.bannerCaroselService.insertManyBannerCarosel(body.data, body.option);
    }
    async getAllBannerCarosels(filterBannerCaroselDto, searchString) {
        return this.bannerCaroselService.getAllBannerCarosels(filterBannerCaroselDto, searchString);
    }
    async getAllBannerCaroselsBasic() {
        return await this.bannerCaroselService.getAllBannerCaroselsBasic();
    }
    async getBannerCaroselById(id, select) {
        return await this.bannerCaroselService.getBannerCaroselById(id, select);
    }
    async updateBannerCaroselById(id, updateBannerCaroselDto) {
        return await this.bannerCaroselService.updateBannerCaroselById(id, updateBannerCaroselDto);
    }
    async updateMultipleBannerCaroselById(updateBannerCaroselDto) {
        return await this.bannerCaroselService.updateMultipleBannerCaroselById(updateBannerCaroselDto.ids, updateBannerCaroselDto);
    }
    async deleteBannerCaroselById(id, checkUsage) {
        return await this.bannerCaroselService.deleteBannerCaroselById(id, Boolean(checkUsage));
    }
    async deleteMultipleBannerCaroselById(data, checkUsage) {
        return await this.bannerCaroselService.deleteMultipleBannerCaroselById(data.ids, Boolean(checkUsage));
    }
    async checkBannerCaroselAvailability(user, checkBannerCaroselDto) {
        return await this.bannerCaroselService.checkBannerCaroselAvailability(user, checkBannerCaroselDto);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [banner_carosel_dto_1.AddBannerCaroselDto]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "addBannerCarosel", null);
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
], BannerCaroselController.prototype, "insertManyBannerCarosel", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [banner_carosel_dto_1.FilterAndPaginationBannerCaroselDto, String]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "getAllBannerCarosels", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "getAllBannerCaroselsBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "getBannerCaroselById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, banner_carosel_dto_1.UpdateBannerCaroselDto]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "updateBannerCaroselById", null);
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
    __metadata("design:paramtypes", [banner_carosel_dto_1.UpdateBannerCaroselDto]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "updateMultipleBannerCaroselById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "deleteBannerCaroselById", null);
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
], BannerCaroselController.prototype, "deleteMultipleBannerCaroselById", null);
__decorate([
    (0, common_1.Post)('/check-bannerCarosel-availability'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, banner_carosel_dto_1.CheckBannerCaroselDto]),
    __metadata("design:returntype", Promise)
], BannerCaroselController.prototype, "checkBannerCaroselAvailability", null);
BannerCaroselController = BannerCaroselController_1 = __decorate([
    (0, common_1.Controller)('banner-carousel'),
    __metadata("design:paramtypes", [banner_carosel_service_1.BannerCaroselService])
], BannerCaroselController);
exports.BannerCaroselController = BannerCaroselController;
//# sourceMappingURL=banner-carosel.controller.js.map