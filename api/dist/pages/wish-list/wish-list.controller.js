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
var WishListController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishListController = void 0;
const common_1 = require("@nestjs/common");
const wish_list_dto_1 = require("../../dto/wish-list.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const wish_list_service_1 = require("./wish-list.service");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
const get_token_user_decorator_1 = require("../../decorator/get-token-user.decorator");
let WishListController = WishListController_1 = class WishListController {
    constructor(wishListService) {
        this.wishListService = wishListService;
        this.logger = new common_1.Logger(WishListController_1.name);
    }
    async addToWishList(addWishListDto, user) {
        return await this.wishListService.addToWishList(addWishListDto, user);
    }
    async addToWishListMultiple(addWishListDto, user) {
        return await this.wishListService.addToWishListMultiple(addWishListDto, user);
    }
    async getWishListByUserId(user) {
        return this.wishListService.getWishListByUserId(user);
    }
    async deleteWishListById(id, user) {
        return await this.wishListService.deleteWishListById(id, user);
    }
    async updateWishListById(id, updateWishListDto) {
        console.log('updateWishListDto', updateWishListDto);
        return await this.wishListService.updateWishListById(id, updateWishListDto);
    }
    async updateWishListQty(id, updateWishListQty) {
        return await this.wishListService.updateWishListQty(id, updateWishListQty);
    }
};
__decorate([
    (0, common_1.Post)('/add-to-wish-list'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_token_user_decorator_1.GetTokenUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [wish_list_dto_1.AddWishListDto, Object]),
    __metadata("design:returntype", Promise)
], WishListController.prototype, "addToWishList", null);
__decorate([
    (0, common_1.Post)('/add-to-wish-list-multiple'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_token_user_decorator_1.GetTokenUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], WishListController.prototype, "addToWishListMultiple", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-wish-lists-by-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_token_user_decorator_1.GetTokenUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WishListController.prototype, "getWishListByUserId", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, get_token_user_decorator_1.GetTokenUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WishListController.prototype, "deleteWishListById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, wish_list_dto_1.UpdateWishListDto]),
    __metadata("design:returntype", Promise)
], WishListController.prototype, "updateWishListById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-qty/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, wish_list_dto_1.UpdateWishListQty]),
    __metadata("design:returntype", Promise)
], WishListController.prototype, "updateWishListQty", null);
WishListController = WishListController_1 = __decorate([
    (0, common_1.Controller)('wishList'),
    __metadata("design:paramtypes", [wish_list_service_1.WishListService])
], WishListController);
exports.WishListController = WishListController;
//# sourceMappingURL=wish-list.controller.js.map