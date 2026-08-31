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
var OrderController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../../guards/admin-jwt-auth.guard");
const order_dto_1 = require("../../../dto/order.dto");
const incomplete_order_dto_1 = require("../../../dto/incomplete-order.dto");
const mongo_id_validation_pipe_1 = require("../../../pipes/mongo-id-validation.pipe");
const order_service_1 = require("./order.service");
const user_jwt_auth_guard_1 = require("../../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../../decorator/get-token-user.decorator");
const get_admin_decorator_1 = require("../../../decorator/get-admin.decorator");
let OrderController = OrderController_1 = class OrderController {
    constructor(orderService) {
        this.orderService = orderService;
        this.logger = new common_1.Logger(OrderController_1.name);
    }
    async receiveSteadfastWebhook(authorization, body) {
        await this.orderService.receiveSteadfastWebhook(authorization, body);
        return {
            status: 'success',
            message: 'Webhook received successfully.',
        };
    }
    async markBrowserPurchaseFired(body) {
        return await this.orderService.markBrowserPurchaseFired(body);
    }
    async backfillSteadfastStatus(body) {
        return await this.orderService.backfillSteadfastStatus(body);
    }
    async syncSteadfastInReview() {
        return await this.orderService.syncSteadfastInReview();
    }
    async addOrder(addOrderDto, admin) {
        return await this.orderService.addOrderAdmin(admin, addOrderDto);
    }
    async trackManualOrderMeta(id, body, admin) {
        return await this.orderService.trackManualOrderMetaAdmin(admin, id, body === null || body === void 0 ? void 0 : body.manualOrderSource);
    }
    async addAiAssistOrder(addOrderDto, admin) {
        return await this.orderService.addAiAssistOrderAdmin(admin, addOrderDto);
    }
    async getManualOrderRequestStatus(requestId, admin) {
        return this.orderService.getManualOrderRequestStatusAdmin(admin, requestId);
    }
    async updateDate() {
        return await this.orderService.updateDate();
    }
    async checkFraudSpy(body) {
        return await this.orderService.checkFraudSpy(body.phone);
    }
    async getRecentBuyersByProduct(slug) {
        return await this.orderService.getRecentBuyersByProduct(slug);
    }
    async getRepeatCustomers() {
        return await this.orderService.getRepeatCustomers();
    }
    async addOrderByUser(addOrderDto, user, req) {
        return await this.orderService.addOrderByUser(addOrderDto, user, req);
    }
    async addOrderByAnonymous(addOrderDto, req) {
        return await this.orderService.addOrderByAnonymous(addOrderDto, req);
    }
    async insertManyOrder(body) {
        return await this.orderService.insertManyOrder(body.data, body.option);
    }
    async generateInvoices(dto) {
        return this.orderService.generateInvoicesByIds(dto.ids);
    }
    async getAllOrders(filterOrderDto, searchString) {
        return this.orderService.getAllOrders(filterOrderDto, searchString);
    }
    async getOrdersByUser(user, filterOrderDto, searchString) {
        return await this.orderService.getOrdersByUser(user, filterOrderDto, searchString);
    }
    async getSalesStatsByFilter(filterType, filterId) {
        return await this.orderService.getSalesStatsByFilter(filterType, filterId);
    }
    async getOrderById(id, select) {
        return await this.orderService.getOrderById(id, select);
    }
    async updateOrderById(id, updateOrderDto) {
        return await this.orderService.updateOrderById(id, updateOrderDto);
    }
    async updateMultipleOrderById(updateOrderDto) {
        return await this.orderService.updateMultipleOrderById(updateOrderDto.ids, updateOrderDto);
    }
    async updateOrderSessionKey(id, updateOrderDto) {
        return await this.orderService.updateOrderSessionKey(id, updateOrderDto);
    }
    async sendToCourier(id) {
        return await this.orderService.sendToCourier(id);
    }
    async changeOrderStatus(id, updateOrderStatusDto) {
        return await this.orderService.changeOrderStatus(id, updateOrderStatusDto);
    }
    async generateInvoiceById(id, shop) {
        return this.orderService.generateInvoiceById(shop, id);
    }
    async getOrderByOrderId(orderId, select) {
        return await this.orderService.getOrderByOrderId(orderId, select);
    }
    async deleteOrderById(id, checkUsage) {
        return await this.orderService.deleteOrderById(id, Boolean(checkUsage));
    }
    async deleteMultipleOrderById(data, checkUsage) {
        return await this.orderService.deleteMultipleOrderById(data.ids, Boolean(checkUsage));
    }
    async addIncompleteOrderByUser(addIncompleteOrderDto, req) {
        return await this.orderService.addIncompleteOrder(addIncompleteOrderDto, req);
    }
    async addIncompleteOrderByAnonymous(addIncompleteOrderDto, req) {
        return await this.orderService.addIncompleteOrder(addIncompleteOrderDto, req);
    }
    async getAllIncompleteOrders(filterDto, searchString) {
        return await this.orderService.getAllIncompleteOrders(filterDto, searchString);
    }
    async getIncompleteOrderById(id) {
        return await this.orderService.getIncompleteOrderById(id);
    }
    async updateIncompleteOrderById(id, updateIncompleteOrderDto, req) {
        return await this.orderService.updateIncompleteOrderById(id, updateIncompleteOrderDto, req);
    }
    async updateIncompleteOrderByAdmin(id, updateIncompleteOrderDto) {
        return await this.orderService.updateIncompleteOrderByAdmin(id, updateIncompleteOrderDto);
    }
    async deleteMultipleIncompleteOrderById(deleteDto) {
        return await this.orderService.deleteMultipleIncompleteOrderById(deleteDto.ids);
    }
};
__decorate([
    (0, common_1.Post)('/courier-webhook/steadfast'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "receiveSteadfastWebhook", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/purchase-fired'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "markBrowserPurchaseFired", null);
__decorate([
    (0, common_1.Post)('/backfill-steadfast-status'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "backfillSteadfastStatus", null);
__decorate([
    (0, common_1.Post)('/sync-steadfast-in-review'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "syncSteadfastInReview", null);
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.EDITOR, admin_roles_enum_1.AdminRoles.Collector, admin_roles_enum_1.AdminRoles.SALESMAN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_admin_decorator_1.GetAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.AddOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "addOrder", null);
__decorate([
    (0, common_1.Post)('/track-manual-meta/:id'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, get_admin_decorator_1.GetAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "trackManualOrderMeta", null);
__decorate([
    (0, common_1.Post)('/add-ai-assist'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_admin_decorator_1.GetAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.AddOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "addAiAssistOrder", null);
__decorate([
    (0, common_1.Get)('/manual-request-status/:requestId'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('requestId')),
    __param(1, (0, get_admin_decorator_1.GetAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getManualOrderRequestStatus", null);
__decorate([
    (0, common_1.Put)('/updateDate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateDate", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/check-fraud-spy'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "checkFraudSpy", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/recent-buyers/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getRecentBuyersByProduct", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/repeat-customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getRepeatCustomers", null);
__decorate([
    (0, common_1.Post)('/add-order-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.AddOrderDto, Object, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "addOrderByUser", null);
__decorate([
    (0, common_1.Post)('/add-order-by-anonymous'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.AddOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "addOrderByAnonymous", null);
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
], OrderController.prototype, "insertManyOrder", null);
__decorate([
    (0, common_1.Post)('/generate-invoices'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.GenerateInvoicesDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "generateInvoices", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.FilterAndPaginationOrderDto, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getAllOrders", null);
__decorate([
    (0, common_1.Post)('/get-orders-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, order_dto_1.FilterAndPaginationOrderDto, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getOrdersByUser", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/sales-stats/:filterType/:filterId'),
    __param(0, (0, common_1.Param)('filterType')),
    __param(1, (0, common_1.Param)('filterId', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getSalesStatsByFilter", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, order_dto_1.UpdateOrderDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateOrderById", null);
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
    __metadata("design:paramtypes", [order_dto_1.UpdateOrderDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateMultipleOrderById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-order-session-key/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateOrderSessionKey", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/send-to-courier/:id'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "sendToCourier", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/change-status/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.SALESMAN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, order_dto_1.UpdateOrderStatusDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "changeOrderStatus", null);
__decorate([
    (0, common_1.Get)('/generate-invoice/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('shop', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "generateInvoiceById", null);
__decorate([
    (0, common_1.Get)('/get-order-by-order-id/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Query)('select')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getOrderByOrderId", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "deleteOrderById", null);
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
], OrderController.prototype, "deleteMultipleOrderById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/add-incomplete-order-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incomplete_order_dto_1.AddIncompleteOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "addIncompleteOrderByUser", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/add-incomplete-order-by-anonymous'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incomplete_order_dto_1.AddIncompleteOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "addIncompleteOrderByAnonymous", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all-incomplete-orders'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incomplete_order_dto_1.FilterAndPaginationIncompleteOrderDto, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getAllIncompleteOrders", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/incomplete/:id'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getIncompleteOrderById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-incomplete-order-by-id/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, incomplete_order_dto_1.UpdateIncompleteOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateIncompleteOrderById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-incomplete-order-admin/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, incomplete_order_dto_1.UpdateIncompleteOrderDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "updateIncompleteOrderByAdmin", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/delete-multiple-incomplete-orders'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incomplete_order_dto_1.DeleteMultipleIncompleteOrderDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "deleteMultipleIncompleteOrderById", null);
OrderController = OrderController_1 = __decorate([
    (0, common_1.Controller)('order'),
    __metadata("design:paramtypes", [order_service_1.OrderService])
], OrderController);
exports.OrderController = OrderController;
//# sourceMappingURL=order.controller.js.map