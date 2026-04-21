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
var CarouselService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarouselService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let CarouselService = CarouselService_1 = class CarouselService {
    constructor(carouselModel, userModel, configService, utilsService) {
        this.carouselModel = carouselModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(CarouselService_1.name);
    }
    async addCarousel(addCarouselDto) {
        const { name } = addCarouselDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addCarouselDto), defaultData);
        const newData = new this.carouselModel(mData);
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
    async insertManyCarousel(addCarouselsDto, optionCarouselDto) {
        const { deleteMany } = optionCarouselDto;
        if (deleteMany) {
            await this.carouselModel.deleteMany({});
        }
        const mData = addCarouselsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.carouselModel.insertMany(mData);
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
    async getAllCarouselsBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.carouselModel
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
    async getAllCarousels(filterCarouselDto, searchQuery) {
        const { filter } = filterCarouselDto;
        const { pagination } = filterCarouselDto;
        const { sort } = filterCarouselDto;
        const { select } = filterCarouselDto;
        const aggregateScarouseles = [];
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
            aggregateScarouseles.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateScarouseles.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateScarouseles.push({ $project: mSelect });
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
            aggregateScarouseles.push(mPagination);
            aggregateScarouseles.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.carouselModel.aggregate(aggregateScarouseles);
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
    async getCarouselById(id, select) {
        try {
            const data = await this.carouselModel.findById(id).select(select);
            return {
                success: true,
                message: 'Single contact get Successfully',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateCarouselById(id, updateCarouselDto) {
        const { name } = updateCarouselDto;
        let data;
        try {
            data = await this.carouselModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateCarouselDto);
            await this.carouselModel.findByIdAndUpdate(id, {
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
    async updateMultipleCarouselById(ids, updateCarouselDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.carouselModel.updateMany({ _id: { $in: mIds } }, { $set: updateCarouselDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteCarouselById(id, checkUsage) {
        let data;
        try {
            data = await this.carouselModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.carouselModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Delete Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleCarouselById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.carouselModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkCarouselAvailability(user, checkCarouselDto) {
        try {
            const { carouselCode, subTotal } = checkCarouselDto;
            const carouselData = await this.carouselModel.findOne({ carouselCode });
            if (carouselData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! Carousel offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Carousel Expired',
                        data: null,
                    };
                }
                else {
                    const userCarouselExists = await this.userModel.findOne({
                        _id: user._id,
                        usedCarousels: carouselData._id,
                    });
                    if (userCarouselExists) {
                        return {
                            success: false,
                            message: 'Sorry! Carousel already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (carouselData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! Carousel minimum amount is ${carouselData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! Carousel added.',
                                data: {
                                    _id: carouselData._id,
                                    discountAmount: carouselData['discountAmount'],
                                    discountType: carouselData['discountType'],
                                    carouselCode: carouselData['carouselCode'],
                                },
                            };
                        }
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid contact code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
CarouselService = CarouselService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Carousel')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], CarouselService);
exports.CarouselService = CarouselService;
//# sourceMappingURL=carousel.service.js.map