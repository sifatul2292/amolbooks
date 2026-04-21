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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreOrderController = void 0;
const common_1 = require("@nestjs/common");
const pre_order_service_1 = require("./pre-order.service");
const pre_order_dto_1 = require("../../dto/pre-order.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
let PreOrderController = class PreOrderController {
    constructor(preOrderService) {
        this.preOrderService = preOrderService;
    }
    async addPreOrder(addPreOrderDto) {
        return await this.preOrderService.addPreOrder(addPreOrderDto);
    }
    async getAllPreOrders(filterPreOrderDto, searchString) {
        return await this.preOrderService.getAllPreOrders(filterPreOrderDto, searchString);
    }
    async getSinglePreOrderById(id, select) {
        return await this.preOrderService.getSinglePreOrderById(id, select);
    }
    async updatePreOrderStatus(id, updatePreOrderStatusDto) {
        return await this.preOrderService.updatePreOrderStatus(id, updatePreOrderStatusDto);
    }
    async deletePreOrderById(id) {
        return await this.preOrderService.deletePreOrderById(id);
    }
};
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pre_order_dto_1.AddPreOrderDto]),
    __metadata("design:returntype", Promise)
], PreOrderController.prototype, "addPreOrder", null);
__decorate([
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pre_order_dto_1.FilterAndPaginationPreOrderDto, String]),
    __metadata("design:returntype", Promise)
], PreOrderController.prototype, "getAllPreOrders", null);
__decorate([
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)('select')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreOrderController.prototype, "getSinglePreOrderById", null);
__decorate([
    (0, common_1.Put)('/update-status/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pre_order_dto_1.UpdatePreOrderStatusDto]),
    __metadata("design:returntype", Promise)
], PreOrderController.prototype, "updatePreOrderStatus", null);
__decorate([
    (0, common_1.Delete)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PreOrderController.prototype, "deletePreOrderById", null);
PreOrderController = __decorate([
    (0, common_1.Controller)('pre-order'),
    __metadata("design:paramtypes", [pre_order_service_1.PreOrderService])
], PreOrderController);
exports.PreOrderController = PreOrderController;
//# sourceMappingURL=pre-order.controller.js.map