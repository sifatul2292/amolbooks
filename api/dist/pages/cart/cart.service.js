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
var CartService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const ObjectId = mongoose_2.Types.ObjectId;
let CartService = CartService_1 = class CartService {
    constructor(userModel, cartModel, specialPackageModel, productModel, configService, utilsService) {
        this.userModel = userModel;
        this.cartModel = cartModel;
        this.specialPackageModel = specialPackageModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(CartService_1.name);
    }
    async addToCart(addCartDto, user) {
        const userId = user._id;
        const data = addCartDto;
        const final = Object.assign(Object.assign({}, data), { user: userId });
        try {
            let cartData;
            if (addCartDto.cartType == 1) {
                cartData = await this.cartModel.findOne({
                    user: userId,
                    specialPackage: addCartDto.specialPackage,
                });
            }
            else if (addCartDto.cartType == 2) {
                cartData = await this.cartModel.findOne({
                    user: userId,
                    specialPackage: addCartDto.specialPackage,
                });
            }
            else {
                if (addCartDto.selectedVariation) {
                    cartData = await this.cartModel.find({
                        user: userId,
                        product: new ObjectId(addCartDto.product),
                        selectedVariation: new ObjectId(addCartDto.selectedVariation),
                    });
                    if (cartData.length == 0) {
                        cartData = null;
                    }
                }
                else {
                    cartData = await this.cartModel.findOne({
                        user: userId,
                        product: addCartDto.product,
                    });
                }
            }
            if (cartData && cartData != null) {
                await this.cartModel.findByIdAndUpdate(cartData._id, {
                    $inc: { selectedQty: addCartDto.selectedQty },
                });
                return {
                    success: true,
                    message: 'Cart Item Updated Successfully!',
                };
            }
            else {
                const newData = new this.cartModel(final);
                const saveData = await newData.save();
                await this.userModel.findOneAndUpdate({ _id: userId }, {
                    $push: {
                        carts: saveData._id,
                    },
                });
                return {
                    success: true,
                    message: 'Added to Cart Successfully!',
                };
            }
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async addToCartMultiple(addCartDto, user) {
        const userId = user._id;
        try {
            for (const data of addCartDto) {
                const cartData = await this.cartModel.findOne({
                    user: userId,
                    product: data.product,
                });
                if (cartData) {
                    await this.cartModel.findByIdAndUpdate(cartData._id, {
                        $inc: { selectedQty: data.selectedQty },
                    });
                }
                else {
                    const final = Object.assign(Object.assign({}, data), { user: userId });
                    const newData = new this.cartModel(final);
                    const saveData = await newData.save();
                    await this.userModel.findOneAndUpdate({ _id: userId }, {
                        $push: {
                            carts: saveData._id,
                        },
                    });
                }
            }
            return {
                success: true,
                message: 'Multiple Added to Cart Successfully!',
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getCartByUserId(user) {
        try {
            const data = await this.cartModel
                .find({ user: user._id })
                .populate('product', 'name nameEn slug description salePrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit weight')
                .populate('specialPackage');
            const finalData = [];
            if (data && data.length) {
                data.map(async (item) => {
                    if (item.cartType == 1 && item.specialPackage != null) {
                        const images = [item.specialPackage.image];
                        item = Object.assign(Object.assign({}, item._doc), {
                            product: Object.assign(Object.assign({}, item.specialPackage._doc), { images: images }),
                        });
                        delete item.comboPackage;
                        delete item['product']['image'];
                        delete item['product']['products'];
                    }
                    else if (item.cartType == 1 && item.specialPackage == null) {
                        item = null;
                    }
                    else {
                    }
                    finalData.push(item);
                });
            }
            const filterData = finalData.filter((item) => item != null);
            return {
                data: filterData,
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteCartById(id, user) {
        try {
            await this.cartModel.findByIdAndDelete(id);
            await this.userModel.findByIdAndUpdate(user._id, {
                $pull: { carts: { $in: id } },
            });
            return {
                success: true,
                message: 'Item Removed Successfully From Cart!',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateCartById(id, updateCartDto) {
        try {
            console.log('updateCartDto', updateCartDto);
            await this.cartModel.findByIdAndUpdate(id, {
                $set: updateCartDto,
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
    async updateCartQty(id, updateCartQty) {
        console.log('updateCartQty', updateCartQty);
        console.log('id', id);
        try {
            let data = await this.cartModel
                .findById(id)
                .populate('product', 'quantity hasVariations variationsOptions trackQuantity name cartLimit');
            if (data) {
                if (data.cartType == 1) {
                }
                else {
                    if (data.selectedVariation) {
                        data.product.variationsOptions.map((variation) => {
                            if (String(data.selectedVariation) === String(variation._id)) {
                                data = Object.assign(Object.assign({}, data._doc), { selectedVariation: variation });
                            }
                        });
                    }
                }
            }
            if (updateCartQty.type == 'increment') {
                if (data.cartType == 1 || data.cartType == 2) {
                    await this.cartModel.findByIdAndUpdate(id, {
                        $inc: {
                            selectedQty: updateCartQty.selectedQty,
                        },
                    });
                }
                else {
                    if (data.product.cartLimit > 0) {
                        if (data.selectedQty < data.product.cartLimit) {
                            if (data.product.trackQuantity == true) {
                                if (data.product.hasVariations) {
                                    if (data.selectedQty >=
                                        data.selectedVariation.quantity) {
                                        return {
                                            success: true,
                                            message: 'Product quantity is not available',
                                            type: 'not available',
                                        };
                                    }
                                    else {
                                        await this.cartModel.findByIdAndUpdate(id, {
                                            $inc: {
                                                selectedQty: updateCartQty.selectedQty,
                                            },
                                        });
                                    }
                                }
                                else {
                                    if (data.selectedQty >= data.product.quantity) {
                                        return {
                                            success: true,
                                            message: 'Product quantity is not available',
                                            type: 'not available',
                                        };
                                    }
                                    else {
                                        await this.cartModel.findByIdAndUpdate(id, {
                                            $inc: {
                                                selectedQty: updateCartQty.selectedQty,
                                            },
                                        });
                                    }
                                }
                            }
                            else {
                                if (data.product.hasVariations) {
                                    if (data.selectedQty >=
                                        data.selectedVariation.quantity) {
                                        return {
                                            success: true,
                                            message: 'Product quantity is not available',
                                            type: 'not available',
                                        };
                                    }
                                    else {
                                        await this.cartModel.findByIdAndUpdate(id, {
                                            $inc: {
                                                selectedQty: updateCartQty.selectedQty,
                                            },
                                        });
                                    }
                                }
                                else {
                                    await this.cartModel.findByIdAndUpdate(id, {
                                        $inc: {
                                            selectedQty: updateCartQty.selectedQty,
                                        },
                                    });
                                }
                            }
                        }
                        else {
                            return {
                                success: true,
                                message: `Can not order more than ${data.product.cartLimit}`,
                                type: 'not available',
                            };
                        }
                    }
                    else {
                        if (data.product.trackQuantity == true) {
                            if (data.product.hasVariations) {
                                if (data.selectedQty >=
                                    data.selectedVariation.quantity) {
                                    return {
                                        success: true,
                                        message: 'Product quantity is not available',
                                        type: 'not available',
                                    };
                                }
                                else {
                                    await this.cartModel.findByIdAndUpdate(id, {
                                        $inc: {
                                            selectedQty: updateCartQty.selectedQty,
                                        },
                                    });
                                }
                            }
                            else {
                                if (data.selectedQty >= data.product.quantity) {
                                    return {
                                        success: true,
                                        message: 'Product quantity is not available',
                                        type: 'not available',
                                    };
                                }
                                else {
                                    await this.cartModel.findByIdAndUpdate(id, {
                                        $inc: {
                                            selectedQty: updateCartQty.selectedQty,
                                        },
                                    });
                                }
                            }
                        }
                        else {
                            if (data.product.hasVariations) {
                                if (data.selectedQty >=
                                    data.selectedVariation.quantity) {
                                    return {
                                        success: true,
                                        message: 'Product quantity is not available',
                                        type: 'not available',
                                    };
                                }
                                else {
                                    await this.cartModel.findByIdAndUpdate(id, {
                                        $inc: {
                                            selectedQty: updateCartQty.selectedQty,
                                        },
                                    });
                                }
                            }
                            else {
                                await this.cartModel.findByIdAndUpdate(id, {
                                    $inc: {
                                        selectedQty: updateCartQty.selectedQty,
                                    },
                                });
                            }
                        }
                    }
                }
            }
            if (updateCartQty.type == 'decrement') {
                await this.cartModel.findByIdAndUpdate(id, {
                    $inc: {
                        selectedQty: -updateCartQty.selectedQty,
                    },
                });
            }
            return {
                success: true,
                message: 'Quantity Updated Successfully!',
                type: 'available',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getLocalCartItems(cartItemDto) {
        try {
            const finalCartItems = [];
            for (const item of cartItemDto) {
                if (item.cartType === 1) {
                    const comboData = await this.specialPackageModel.findById(item.specialPackage);
                    const jComboData = JSON.parse(JSON.stringify(comboData));
                    const cCartItem = {
                        product: {
                            _id: jComboData._id,
                            name: jComboData.name,
                            slug: jComboData.slug,
                            salePrice: jComboData.salePrice,
                            discountType: jComboData.discountType,
                            discountAmount: jComboData.discountAmount,
                            images: jComboData.image ? [jComboData.image] : [],
                            quantity: jComboData.quantity,
                        },
                        selectedQty: item.selectedQty,
                        cartType: 1,
                    };
                    finalCartItems.push(cCartItem);
                }
                else {
                    const productData = await this.productModel.findById(item.product);
                    const jProductData = JSON.parse(JSON.stringify(productData));
                    const pCartItem = {
                        product: {
                            _id: jProductData._id,
                            name: jProductData.name,
                            slug: jProductData.slug,
                            salePrice: jProductData.salePrice,
                            discountType: jProductData.discountType,
                            discountAmount: jProductData.discountAmount,
                            images: jProductData.images,
                            quantity: jProductData.quantity,
                        },
                        selectedQty: item.selectedQty,
                        cartType: 0,
                    };
                    finalCartItems.push(pCartItem);
                }
            }
            return {
                success: true,
                message: 'Item Updated Successfully!',
                data: finalCartItems,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
CartService = CartService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('User')),
    __param(1, (0, mongoose_1.InjectModel)('Cart')),
    __param(2, (0, mongoose_1.InjectModel)('SpecialPackage')),
    __param(3, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], CartService);
exports.CartService = CartService;
//# sourceMappingURL=cart.service.js.map