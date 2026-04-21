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
var PraptisthanaController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PraptisthanaController = void 0;
const common_1 = require("@nestjs/common");
const get_token_user_decorator_1 = require("../../decorator/get-token-user.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const praptisthana_dto_1 = require("../../dto/praptisthana.dto");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const praptisthana_service_1 = require("./praptisthana.service");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
let PraptisthanaController = PraptisthanaController_1 = class PraptisthanaController {
    constructor(praptisthanaService) {
        this.praptisthanaService = praptisthanaService;
        this.logger = new common_1.Logger(PraptisthanaController_1.name);
    }
    async addPraptisthana(addPraptisthanaDto) {
        return await this.praptisthanaService.addPraptisthana(addPraptisthanaDto);
    }
    async insertManyPraptisthana(body) {
        return await this.praptisthanaService.insertManyPraptisthana(body.data, body.option);
    }
    async getAllPraptisthanas(filterPraptisthanaDto, searchString) {
        return this.praptisthanaService.getAllPraptisthanas(filterPraptisthanaDto, searchString);
    }
    async getAllPraptisthanasBasic() {
        return await this.praptisthanaService.getAllPraptisthanasBasic();
    }
    async getPraptisthanaById(id, select) {
        return await this.praptisthanaService.getPraptisthanaById(id, select);
    }
    async updatePraptisthanaById(id, updatePraptisthanaDto) {
        return await this.praptisthanaService.updatePraptisthanaById(id, updatePraptisthanaDto);
    }
    async updateMultiplePraptisthanaById(updatePraptisthanaDto) {
        return await this.praptisthanaService.updateMultiplePraptisthanaById(updatePraptisthanaDto.ids, updatePraptisthanaDto);
    }
    async deletePraptisthanaById(id, checkUsage) {
        return await this.praptisthanaService.deletePraptisthanaById(id, Boolean(checkUsage));
    }
    async deleteMultiplePraptisthanaById(data, checkUsage) {
        return await this.praptisthanaService.deleteMultiplePraptisthanaById(data.ids, Boolean(checkUsage));
    }
    async checkPraptisthanaAvailability(user, checkPraptisthanaDto) {
        return await this.praptisthanaService.checkPraptisthanaAvailability(user, checkPraptisthanaDto);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [praptisthana_dto_1.AddPraptisthanaDto]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "addPraptisthana", null);
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
], PraptisthanaController.prototype, "insertManyPraptisthana", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [praptisthana_dto_1.FilterAndPaginationPraptisthanaDto, String]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "getAllPraptisthanas", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "getAllPraptisthanasBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "getPraptisthanaById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, praptisthana_dto_1.UpdatePraptisthanaDto]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "updatePraptisthanaById", null);
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
    __metadata("design:paramtypes", [praptisthana_dto_1.UpdatePraptisthanaDto]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "updateMultiplePraptisthanaById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "deletePraptisthanaById", null);
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
], PraptisthanaController.prototype, "deleteMultiplePraptisthanaById", null);
__decorate([
    (0, common_1.Post)('/check-contact-availability'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, praptisthana_dto_1.CheckPraptisthanaDto]),
    __metadata("design:returntype", Promise)
], PraptisthanaController.prototype, "checkPraptisthanaAvailability", null);
PraptisthanaController = PraptisthanaController_1 = __decorate([
    (0, common_1.Controller)('praptisthana'),
    __metadata("design:paramtypes", [praptisthana_service_1.PraptisthanaService])
], PraptisthanaController);
exports.PraptisthanaController = PraptisthanaController;
//# sourceMappingURL=praptisthana.controller.js.map