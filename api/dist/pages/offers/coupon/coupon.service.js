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
var CouponService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let CouponService = CouponService_1 = class CouponService {
    constructor(couponModel, userModel, configService, utilsService) {
        this.couponModel = couponModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(CouponService_1.name);
    }
    async addCoupon(addCouponDto) {
        const { name } = addCouponDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addCouponDto), defaultData);
        const newData = new this.couponModel(mData);
        try {
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
        catch (error) {
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Slug Must be Unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async insertManyCoupon(addCouponsDto, optionCouponDto) {
        const { deleteMany } = optionCouponDto;
        if (deleteMany) {
            await this.couponModel.deleteMany({});
        }
        const mData = addCouponsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.couponModel.insertMany(mData);
            return {
                success: true,
                message: `${saveData && saveData.length ? saveData.length : 0}  Data Added Success`,
            };
        }
        catch (error) {
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Slug Must be Unique');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async getAllCouponsBasic() {
        try {
            const pageSize = 10;
            const currentPage = 3;
            const data = await this.couponModel
                .find()
                .skip(pageSize * (currentPage - 1))
                .limit(Number(pageSize));
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
    async getAllCoupons(filterCouponDto, searchQuery) {
        const { filter } = filterCouponDto;
        const { pagination } = filterCouponDto;
        const { sort } = filterCouponDto;
        const { select } = filterCouponDto;
        const aggregateScoupones = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = Object.assign(Object.assign({}, mFilter), { name: new RegExp(searchQuery, 'i') });
        }
        if (sort) {
            mSort = sort;
        }
        else {
            mSort = { createdAt: -1 };
        }
        if (select) {
            mSelect = Object.assign({}, select);
        }
        else {
            mSelect = { name: 1 };
        }
        if (Object.keys(mFilter).length) {
            aggregateScoupones.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateScoupones.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateScoupones.push({ $project: mSelect });
        }
        if (pagination) {
            if (Object.keys(mSelect).length) {
                mPagination = {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            {
                                $skip: pagination.pageSize * pagination.currentPage,
                            },
                            { $limit: pagination.pageSize },
                            { $project: mSelect },
                        ],
                    },
                };
            }
            else {
                mPagination = {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            {
                                $skip: pagination.pageSize * pagination.currentPage,
                            },
                            { $limit: pagination.pageSize },
                        ],
                    },
                };
            }
            aggregateScoupones.push(mPagination);
            aggregateScoupones.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.couponModel.aggregate(aggregateScoupones);
            if (pagination) {
                return Object.assign(Object.assign({}, Object.assign({}, dataAggregates[0])), { success: true, message: 'Success' });
            }
            else {
                return {
                    data: dataAggregates,
                    success: true,
                    message: 'Success',
                    count: dataAggregates.length,
                };
            }
        }
        catch (err) {
            this.logger.error(err);
            if (err.code && err.code.toString() === error_code_enum_1.ErrorCodes.PROJECTION_MISMATCH) {
                throw new common_1.BadRequestException('Error! Projection mismatch');
            }
            else {
                throw new common_1.InternalServerErrorException(err.message);
            }
        }
    }
    async getCouponById(id, select) {
        try {
            const data = await this.couponModel.findById(id).select(select);
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
    async updateCouponById(id, updateCouponDto) {
        const { name } = updateCouponDto;
        let data;
        try {
            data = await this.couponModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateCouponDto);
            await this.couponModel.findByIdAndUpdate(id, {
                $set: finalData,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateMultipleCouponById(ids, updateCouponDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.couponModel.updateMany({ _id: { $in: mIds } }, { $set: updateCouponDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteCouponById(id, checkUsage) {
        let data;
        try {
            data = await this.couponModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.couponModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleCouponById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.couponModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkCouponAvailability(user, checkCouponDto) {
        try {
            const { couponCode, subTotal } = checkCouponDto;
            const couponData = await this.couponModel.findOne({ couponCode });
            if (couponData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), new Date(couponData.endDateTime), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), new Date(couponData.startDateTime), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! Coupon offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Coupon Expired',
                        data: null,
                    };
                }
                else {
                    const userCouponExists = await this.userModel.findOne({
                        _id: user._id,
                        usedCoupons: couponData._id,
                    });
                    if (userCouponExists) {
                        return {
                            success: false,
                            message: 'Sorry! Coupon already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (couponData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! Coupon minimum amount is ${couponData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! Coupon added.',
                                data: {
                                    _id: couponData._id,
                                    discountAmount: couponData['discountAmount'],
                                    discountType: couponData['discountType'],
                                    couponCode: couponData['couponCode'],
                                },
                            };
                        }
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid coupon code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async checkCouponAnonymousAvailability(checkCouponDto) {
        try {
            const { couponCode, subTotal } = checkCouponDto;
            const couponData = await this.couponModel.findOne({ couponCode });
            if (couponData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), new Date(couponData.endDateTime), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), new Date(couponData.startDateTime), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! Coupon offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Coupon Expired',
                        data: null,
                    };
                }
                else {
                    if (couponData['minimumAmount'] > subTotal) {
                        return {
                            success: false,
                            message: `Sorry! Coupon minimum amount is ${couponData['minimumAmount']}`,
                            data: null,
                        };
                    }
                    else {
                        return {
                            success: true,
                            message: 'Success! Coupon added.',
                            data: {
                                _id: couponData._id,
                                discountAmount: couponData['discountAmount'],
                                discountType: couponData['discountType'],
                                couponCode: couponData['couponCode'],
                            },
                        };
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid coupon code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
CouponService = CouponService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Coupon')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], CouponService);
exports.CouponService = CouponService;
//# sourceMappingURL=coupon.service.js.map