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
var ShippingChargeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingChargeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let ShippingChargeService = ShippingChargeService_1 = class ShippingChargeService {
    constructor(shippingChargeModel, configService, utilsService) {
        this.shippingChargeModel = shippingChargeModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(ShippingChargeService_1.name);
    }
    async addShippingCharge(addShippingChargeDto) {
        try {
            const shippingChargeData = await this.shippingChargeModel.findOne();
            if (shippingChargeData) {
                await this.shippingChargeModel.findByIdAndUpdate(shippingChargeData._id, {
                    $set: addShippingChargeDto,
                });
                const data = {
                    _id: shippingChargeData._id,
                };
                return {
                    success: true,
                    message: 'Data Updated Success',
                    data,
                };
            }
            else {
                const newData = new this.shippingChargeModel(addShippingChargeDto);
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
    async getShippingCharge(select) {
        try {
            const data = await this.shippingChargeModel.findOne({}).select(select);
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
};
ShippingChargeService = ShippingChargeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ShippingCharge')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], ShippingChargeService);
exports.ShippingChargeService = ShippingChargeService;
//# sourceMappingURL=shipping-charge.service.js.map