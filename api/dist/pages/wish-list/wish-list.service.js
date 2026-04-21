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
var WishListService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishListService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const ObjectId = mongoose_2.Types.ObjectId;
let WishListService = WishListService_1 = class WishListService {
    constructor(userModel, wishListModel, productModel, configService, utilsService) {
        this.userModel = userModel;
        this.wishListModel = wishListModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(WishListService_1.name);
    }
    async addToWishList(addWishListDto, user) {
        const userId = user._id;
        const data = addWishListDto;
        const final = Object.assign(Object.assign({}, data), { user: userId });
        try {
            const wishListData = await this.wishListModel.findOne({
                user: userId,
                product: addWishListDto.product,
            });
            if (wishListData) {
                await this.wishListModel.findByIdAndUpdate(wishListData._id, {
                    $inc: { selectedQty: addWishListDto.selectedQty },
                });
                return {
                    success: true,
                    message: 'WishList Item Updated Successfully!',
                };
            }
            else {
                const newData = new this.wishListModel(final);
                const saveData = await newData.save();
                await this.userModel.findOneAndUpdate({ _id: userId }, {
                    $push: {
                        wishLists: saveData._id,
                    },
                });
                return {
                    success: true,
                    message: 'Added to WishList Successfully!',
                };
            }
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async addToWishListMultiple(addWishListDto, user) {
        const userId = user._id;
        try {
            for (const data of addWishListDto) {
                const wishListData = await this.wishListModel.findOne({
                    user: userId,
                    product: data.product,
                });
                if (wishListData) {
                    await this.wishListModel.findByIdAndUpdate(wishListData._id, {
                        $inc: { selectedQty: data.selectedQty },
                    });
                }
                else {
                    const final = Object.assign(Object.assign({}, data), { user: userId });
                    const newData = new this.wishListModel(final);
                    const saveData = await newData.save();
                    await this.userModel.findOneAndUpdate({ _id: userId }, {
                        $push: {
                            wishLists: saveData._id,
                        },
                    });
                }
            }
            return {
                success: true,
                message: 'Multiple Added to WishList Successfully!',
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getWishListByUserId(user) {
        try {
            const data = await this.wishListModel
                .find({ user: user._id })
                .populate('product', 'name slug description salePrice sku tax discountType discountAmount images quantity category subCategory brand tags');
            return {
                data: data,
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteWishListById(id, user) {
        try {
            await this.wishListModel.findByIdAndDelete(id);
            await this.userModel.findByIdAndUpdate(user._id, {
                $pull: { wishLists: { $in: id } },
            });
            return {
                success: true,
                message: 'Item Removed Successfully From WishList!',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateWishListById(id, updateWishListDto) {
        try {
            console.log('updateWishListDto', updateWishListDto);
            await this.wishListModel.findByIdAndUpdate(id, {
                $set: updateWishListDto,
            });
            return {
                success: true,
                message: 'Item Updated Successfully!',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateWishListQty(id, updateWishListQty) {
        try {
            if (updateWishListQty.type == 'increment') {
                await this.wishListModel.findByIdAndUpdate(id, {
                    $inc: {
                        selectedQty: updateWishListQty.selectedQty,
                    },
                });
            }
            if (updateWishListQty.type == 'decrement') {
                await this.wishListModel.findByIdAndUpdate(id, {
                    $inc: {
                        selectedQty: -updateWishListQty.selectedQty,
                    },
                });
            }
            return {
                success: true,
                message: 'Quantity Updated Successfully!',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
WishListService = WishListService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('User')),
    __param(1, (0, mongoose_1.InjectModel)('WishList')),
    __param(2, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], WishListService);
exports.WishListService = WishListService;
//# sourceMappingURL=wish-list.service.js.map