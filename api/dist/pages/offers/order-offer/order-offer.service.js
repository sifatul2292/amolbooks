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
var OrderOfferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderOfferService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let OrderOfferService = OrderOfferService_1 = class OrderOfferService {
    constructor(orderOfferModel, orderModel, userModel, configService, utilsService) {
        this.orderOfferModel = orderOfferModel;
        this.orderModel = orderModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(OrderOfferService_1.name);
    }
    async addOrderOffer(addOrderOfferDto) {
        try {
            const orderOfferData = await this.orderOfferModel.findOne();
            if (orderOfferData) {
                await this.orderOfferModel.findByIdAndUpdate(orderOfferData._id, {
                    $set: addOrderOfferDto,
                });
                const data = {
                    _id: orderOfferData._id,
                };
                return {
                    success: true,
                    message: 'Data Updated Success',
                    data,
                };
            }
            else {
                const newData = new this.orderOfferModel(addOrderOfferDto);
                const saveData = await newData.save();
                const data = {
                    _id: saveData._id,
                };
                return {
                    success: true,
                    message: 'Data Added Success',
                    data,
                };
            }
        }
        catch (error) {
            console.log(error);
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Slug Must be Unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async getOrderOffer(select) {
        try {
            const data = await this.orderOfferModel.findOne({}).select(select);
            return {
                success: true,
                message: 'Success',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getOrderOfferWithUser(user, select) {
        try {
            const fOrderOfferData = await this.orderOfferModel
                .findOne({})
                .select(select);
            const orderOfferData = JSON.parse(JSON.stringify(fOrderOfferData));
            let finalData;
            if (orderOfferData) {
                const orderCount = await this.orderModel.countDocuments({
                    user: new ObjectId(user._id),
                });
                const currentMonth = this.utilsService.getDateMonth(false, new Date());
                const currentYear = this.utilsService.getDateYear(new Date());
                const orderInMonth = await this.orderModel.find({
                    user: new ObjectId(user._id),
                    month: currentMonth,
                    year: currentYear,
                });
                const jOrderInMonth = JSON.parse(JSON.stringify(orderInMonth));
                let hasMonthDiscount = false;
                for (const data of jOrderInMonth) {
                    if (data.hasMonthDiscount) {
                        hasMonthDiscount = true;
                    }
                }
                const orderInMonthAmount = jOrderInMonth
                    .map((m) => m.grandTotal)
                    .reduce((acc, value) => acc + value, 0);
                if (orderCount === 0) {
                    finalData = Object.assign(Object.assign({}, orderOfferData), {
                        hasFirstOrderDiscount: true,
                    });
                }
                else {
                    finalData = Object.assign(Object.assign({}, orderOfferData), {
                        hasFirstOrderDiscount: false,
                        orderInMonthAmount: hasMonthDiscount ? 0 : orderInMonthAmount,
                    });
                }
            }
            else {
                finalData = Object.assign(Object.assign({}, orderOfferData), {
                    hasFirstOrderDiscount: false,
                    orderInMonthAmount: null,
                });
            }
            return {
                success: true,
                message: 'Success',
                data: finalData,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
OrderOfferService = OrderOfferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('OrderOffer')),
    __param(1, (0, mongoose_1.InjectModel)('Order')),
    __param(2, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], OrderOfferService);
exports.OrderOfferService = OrderOfferService;
//# sourceMappingURL=order-offer.service.js.map