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
var BannerCaroselService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerCaroselService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let BannerCaroselService = BannerCaroselService_1 = class BannerCaroselService {
    constructor(bannerCaroselModel, userModel, configService, utilsService) {
        this.bannerCaroselModel = bannerCaroselModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(BannerCaroselService_1.name);
    }
    async addBannerCarosel(addBannerCaroselDto) {
        const { name } = addBannerCaroselDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addBannerCaroselDto), defaultData);
        const newData = new this.bannerCaroselModel(mData);
        try {
            const saveData = await newData.save();
            const data = {
                _id: saveData._id,
            };
            return {
                success: true,
                message: 'Data Added Successfully',
                data,
            };
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
    async insertManyBannerCarosel(addBannerCaroselsDto, optionBannerCaroselDto) {
        const { deleteMany } = optionBannerCaroselDto;
        if (deleteMany) {
            await this.bannerCaroselModel.deleteMany({});
        }
        const mData = addBannerCaroselsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.bannerCaroselModel.insertMany(mData);
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
    async getAllBannerCaroselsBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.bannerCaroselModel
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
    async getAllBannerCarosels(filterBannerCaroselDto, searchQuery) {
        const { filter } = filterBannerCaroselDto;
        const { pagination } = filterBannerCaroselDto;
        const { sort } = filterBannerCaroselDto;
        const { select } = filterBannerCaroselDto;
        const aggregateSbannerCaroseles = [];
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
            mSelect = {
                name: 1,
            };
        }
        if (Object.keys(mFilter).length) {
            aggregateSbannerCaroseles.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSbannerCaroseles.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSbannerCaroseles.push({ $project: mSelect });
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
            aggregateSbannerCaroseles.push(mPagination);
            aggregateSbannerCaroseles.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.bannerCaroselModel.aggregate(aggregateSbannerCaroseles);
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
    async getBannerCaroselById(id, select) {
        try {
            const data = await this.bannerCaroselModel.findById(id).select(select);
            return {
                success: true,
                message: 'Single bannerCarosel get Successfully',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateBannerCaroselById(id, updateBannerCaroselDto) {
        const { name } = updateBannerCaroselDto;
        let data;
        try {
            data = await this.bannerCaroselModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateBannerCaroselDto);
            await this.bannerCaroselModel.findByIdAndUpdate(id, {
                $set: finalData,
            });
            return {
                success: true,
                message: 'Update Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateMultipleBannerCaroselById(ids, updateBannerCaroselDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.bannerCaroselModel.updateMany({ _id: { $in: mIds } }, { $set: updateBannerCaroselDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteBannerCaroselById(id, checkUsage) {
        let data;
        try {
            data = await this.bannerCaroselModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.bannerCaroselModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Delete Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleBannerCaroselById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.bannerCaroselModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkBannerCaroselAvailability(user, checkBannerCaroselDto) {
        try {
            const { bannerCaroselCode, subTotal } = checkBannerCaroselDto;
            const bannerCaroselData = await this.bannerCaroselModel.findOne({ bannerCaroselCode });
            if (bannerCaroselData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! BannerCarosel offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! BannerCarosel Expired',
                        data: null,
                    };
                }
                else {
                    const userBannerCaroselExists = await this.userModel.findOne({
                        _id: user._id,
                        usedBannerCarosels: bannerCaroselData._id,
                    });
                    if (userBannerCaroselExists) {
                        return {
                            success: false,
                            message: 'Sorry! BannerCarosel already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (bannerCaroselData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! BannerCarosel minimum amount is ${bannerCaroselData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! BannerCarosel added.',
                                data: {
                                    _id: bannerCaroselData._id,
                                    discountAmount: bannerCaroselData['discountAmount'],
                                    discountType: bannerCaroselData['discountType'],
                                    bannerCaroselCode: bannerCaroselData['bannerCaroselCode'],
                                },
                            };
                        }
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid bannerCarosel code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
BannerCaroselService = BannerCaroselService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('BannerCarosel')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], BannerCaroselService);
exports.BannerCaroselService = BannerCaroselService;
//# sourceMappingURL=banner-carosel.service.js.map