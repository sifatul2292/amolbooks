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
var PublisherController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../../guards/admin-jwt-auth.guard");
const publisher_dto_1 = require("../../../dto/publisher.dto");
const mongo_id_validation_pipe_1 = require("../../../pipes/mongo-id-validation.pipe");
const publisher_service_1 = require("./publisher.service");
const user_jwt_auth_guard_1 = require("../../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../../decorator/get-token-user.decorator");
let PublisherController = PublisherController_1 = class PublisherController {
    constructor(publisherService) {
        this.publisherService = publisherService;
        this.logger = new common_1.Logger(PublisherController_1.name);
    }
    async addPublisher(addPublisherDto) {
        return await this.publisherService.addPublisher(addPublisherDto);
    }
    async insertManyPublisher(body) {
        return await this.publisherService.insertManyPublisher(body.data, body.option);
    }
    async getAllPublishers(filterPublisherDto, searchString) {
        return this.publisherService.getAllPublishers(filterPublisherDto, searchString);
    }
    async getAllPublishersBasic() {
        return await this.publisherService.getAllPublishersBasic();
    }
    async getPublisherById(id, select) {
        return await this.publisherService.getPublisherById(id, select);
    }
    async updatePublisherById(id, updatePublisherDto) {
        return await this.publisherService.updatePublisherById(id, updatePublisherDto);
    }
    async updateMultiplePublisherById(updatePublisherDto) {
        return await this.publisherService.updateMultiplePublisherById(updatePublisherDto.ids, updatePublisherDto);
    }
    async deletePublisherById(id, checkUsage) {
        return await this.publisherService.deletePublisherById(id, Boolean(checkUsage));
    }
    async deleteMultiplePublisherById(data, checkUsage) {
        return await this.publisherService.deleteMultiplePublisherById(data.ids, Boolean(checkUsage));
    }
    async checkPublisherAvailability(user, checkPublisherDto) {
        return await this.publisherService.checkPublisherAvailability(user, checkPublisherDto);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [publisher_dto_1.AddPublisherDto]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "addPublisher", null);
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
], PublisherController.prototype, "insertManyPublisher", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [publisher_dto_1.FilterAndPaginationPublisherDto, String]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "getAllPublishers", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-all-basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "getAllPublishersBasic", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "getPublisherById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, publisher_dto_1.UpdatePublisherDto]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "updatePublisherById", null);
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
    __metadata("design:paramtypes", [publisher_dto_1.UpdatePublisherDto]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "updateMultiplePublisherById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "deletePublisherById", null);
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
], PublisherController.prototype, "deleteMultiplePublisherById", null);
__decorate([
    (0, common_1.Post)('/check-publisher-availability'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, publisher_dto_1.CheckPublisherDto]),
    __metadata("design:returntype", Promise)
], PublisherController.prototype, "checkPublisherAvailability", null);
PublisherController = PublisherController_1 = __decorate([
    (0, common_1.Controller)('publisher'),
    __metadata("design:paramtypes", [publisher_service_1.PublisherService])
], PublisherController);
exports.PublisherController = PublisherController;
//# sourceMappingURL=publisher.controller.js.map