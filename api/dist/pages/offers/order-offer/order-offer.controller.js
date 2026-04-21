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
var OrderOfferController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderOfferController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../../guards/admin-jwt-auth.guard");
const order_offer_service_1 = require("./order-offer.service");
const user_jwt_auth_guard_1 = require("../../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../../decorator/get-token-user.decorator");
const order_offer_dto_1 = require("../../../dto/order-offer.dto");
let OrderOfferController = OrderOfferController_1 = class OrderOfferController {
    constructor(orderOfferService) {
        this.orderOfferService = orderOfferService;
        this.logger = new common_1.Logger(OrderOfferController_1.name);
    }
    async addOrderOffer(addOrderOfferDto) {
        return await this.orderOfferService.addOrderOffer(addOrderOfferDto);
    }
    async getOrderOffer(select) {
        return await this.orderOfferService.getOrderOffer(select);
    }
    async getOrderOfferWithUser(user, select) {
        return await this.orderOfferService.getOrderOfferWithUser(user, select);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_offer_dto_1.AddOrderOfferDto]),
    __metadata("design:returntype", Promise)
], OrderOfferController.prototype, "addOrderOffer", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get'),
    __param(0, (0, common_1.Query)('select')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderOfferController.prototype, "getOrderOffer", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrderOfferController.prototype, "getOrderOfferWithUser", null);
OrderOfferController = OrderOfferController_1 = __decorate([
    (0, common_1.Controller)('order-offer'),
    __metadata("design:paramtypes", [order_offer_service_1.OrderOfferService])
], OrderOfferController);
exports.OrderOfferController = OrderOfferController;
//# sourceMappingURL=order-offer.controller.js.map