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
var MultiPromoOfferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiPromoOfferService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const job_scheduler_service_1 = require("../../../shared/job-scheduler/job-scheduler.service");
const ObjectId = mongoose_2.Types.ObjectId;
let MultiPromoOfferService = MultiPromoOfferService_1 = class MultiPromoOfferService {
    constructor(multiMultiPromoOfferModel, configService, utilsService, jobSchedulerService) {
        this.multiMultiPromoOfferModel = multiMultiPromoOfferModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.jobSchedulerService = jobSchedulerService;
        this.logger = new common_1.Logger(MultiPromoOfferService_1.name);
    }
    async addMultiPromoOffer(addMultiPromoOfferDto) {
        try {
            const { title } = addMultiPromoOfferDto;
            const { products } = addMultiPromoOfferDto;
            const { startDateTime } = addMultiPromoOfferDto;
            const { endDateTime } = addMultiPromoOfferDto;
            const defaultData = {
                slug: this.utilsService.transformToSlug(title),
            };
            const mData = Object.assign(Object.assign({}, addMultiPromoOfferDto), defaultData);
            const newData = new this.multiMultiPromoOfferModel(mData);
            const saveData = await newData.save();
            const isStartDate = this.utilsService.getDateDifference(new Date(), new Date(startDateTime), 'seconds');
            const isEndDate = this.utilsService.getDateDifference(new Date(), new Date(endDateTime), 'seconds');
            if (isEndDate <= 0) {
                console.log('isEndDate is past date');
                return {
                    success: false,
                    message: 'Data can not be added. Expire date is wrong',
                };
            }
            else {
                console.log('isEndDate is future date');
                this.jobSchedulerService.addOfferScheduleOnEnd(true, saveData._id, endDateTime, products);
            }
            if (isStartDate <= 0) {
                console.log('isStartDate is past date');
                await this.utilsService.updateProductsOnOfferStart(products);
            }
            else {
                console.log('isStartDate is future date');
                this.jobSchedulerService.addOfferScheduleOnStart(true, saveData._id, startDateTime, products);
            }
            return {
                success: true,
                message: 'Data Added Success',
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
    async insertManyMultiPromoOffer(addMultiPromoOffersDto, optionMultiPromoOfferDto) {
        const { deleteMany } = optionMultiPromoOfferDto;
        if (deleteMany) {
            await this.multiMultiPromoOfferModel.deleteMany({});
        }
        const mData = addMultiPromoOffersDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.title),
            });
        });
        try {
            const saveData = await this.multiMultiPromoOfferModel.insertMany(mData);
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
    async getAllMultiPromoOffers(filterPromoOfferDto, searchQuery) {
        const { filter } = filterPromoOfferDto;
        const { pagination } = filterPromoOfferDto;
        const { sort } = filterPromoOfferDto;
        const { select } = filterPromoOfferDto;
        const aggregateStages = [];
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
            aggregateStages.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateStages.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateStages.push({ $project: mSelect });
        }
        aggregateStages.push({
            $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'productDetails',
            },
        });
        aggregateStages.push({
            $unwind: {
                path: '$productDetails',
                preserveNullAndEmptyArrays: true,
            },
        });
        if (pagination) {
            mPagination = {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        {
                            $skip: pagination.pageSize * (pagination.currentPage - 1),
                        },
                        { $limit: pagination.pageSize },
                        { $project: mSelect },
                    ],
                },
            };
            aggregateStages.push(mPagination);
            aggregateStages.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.multiMultiPromoOfferModel.aggregate(aggregateStages);
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
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async getMultiPromoOfferById(id, select) {
        try {
            const data = await this.multiMultiPromoOfferModel
                .findById(id)
                .populate('products.product')
                .select(select);
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
    async getMultiPromoOfferDouble(select) {
        try {
            const data = await this.multiMultiPromoOfferModel
                .find({})
                .populate('products.product')
                .select(select ? select : '');
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
    async updateMultiPromoOfferById(id, updateMultiPromoOfferDto) {
        try {
            const { title } = updateMultiPromoOfferDto;
            const { products } = updateMultiPromoOfferDto;
            const { startDateTime } = updateMultiPromoOfferDto;
            const { endDateTime } = updateMultiPromoOfferDto;
            const data = await this.multiMultiPromoOfferModel.findById(id);
            const finalData = Object.assign({}, updateMultiPromoOfferDto);
            if (title) {
                if (title && data.title !== title) {
                    finalData.slug = this.utilsService.transformToSlug(title, true);
                }
            }
            const jobNameStart = this.configService.get('multiMultiPromoOfferScheduleOnStart');
            const jobNameEnd = this.configService.get('multiMultiPromoOfferScheduleOnEnd');
            await this.jobSchedulerService.cancelOfferJobScheduler(jobNameStart);
            await this.jobSchedulerService.cancelOfferJobScheduler(jobNameEnd);
            const isStartDate = this.utilsService.getDateDifference(new Date(), new Date(startDateTime), 'seconds');
            const isEndDate = this.utilsService.getDateDifference(new Date(), new Date(endDateTime), 'seconds');
            if (isEndDate <= 0) {
                console.log('isEndDate is past date');
                return {
                    success: false,
                    message: 'Data can not be added. Expire date is wrong',
                };
            }
            else {
                console.log('isEndDate is future date');
                this.jobSchedulerService.addOfferScheduleOnEnd(true, id, endDateTime, products);
            }
            if (isStartDate <= 0) {
                console.log('isStartDate is past date');
                await this.utilsService.updateProductsOnOfferStart(products);
            }
            else {
                console.log('isStartDate is future date');
                this.jobSchedulerService.addOfferScheduleOnStart(true, id, startDateTime, products);
            }
            await this.multiMultiPromoOfferModel.findByIdAndUpdate(id, {
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
    async updateMultipleMultiPromoOfferById(ids, updateMultiPromoOfferDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateMultiPromoOfferDto.slug) {
            delete updateMultiPromoOfferDto.slug;
        }
        try {
            await this.multiMultiPromoOfferModel.updateMany({ _id: { $in: mIds } }, { $set: updateMultiPromoOfferDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultiPromoOfferById(id, checkUsage) {
        let data;
        try {
            data = await this.multiMultiPromoOfferModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        if (data.readOnly) {
            throw new common_1.NotFoundException('Sorry! Read only data can not be deleted');
        }
        try {
            const defaultMultiPromoOffer = await this.multiMultiPromoOfferModel.findOne({
                _id: id,
            });
            await this.multiMultiPromoOfferModel.findByIdAndDelete(id);
            const productIds = defaultMultiPromoOffer
                ? defaultMultiPromoOffer.products.map((m) => new ObjectId(m))
                : [];
            let resetData = {
                discountStartDateTime: null,
                discountEndDateTime: null,
            };
            if (checkUsage) {
                resetData = Object.assign(Object.assign({}, resetData), {
                    discountType: null,
                    discountAmount: null,
                });
            }
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleMultiPromoOfferById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.multiMultiPromoOfferModel.find({
                _id: { $in: mIds },
            });
            await this.multiMultiPromoOfferModel.deleteMany({ _id: mIds });
            const mProductsIds = [];
            allCategory.forEach((f) => {
                f.products.forEach((g) => {
                    mProductsIds.push(g);
                });
            });
            const jobNameStart = this.configService.get('multiMultiPromoOfferScheduleOnStart');
            const jobNameEnd = this.configService.get('multiMultiPromoOfferScheduleOnEnd');
            await this.jobSchedulerService.cancelOfferJobScheduler(jobNameStart);
            await this.jobSchedulerService.cancelOfferJobScheduler(jobNameEnd);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
MultiPromoOfferService = MultiPromoOfferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('MultiPromoOffer')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService,
        job_scheduler_service_1.JobSchedulerService])
], MultiPromoOfferService);
exports.MultiPromoOfferService = MultiPromoOfferService;
//# sourceMappingURL=multi-promo-offer.service.js.map