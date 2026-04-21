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
var PromoOfferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoOfferService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const job_scheduler_service_1 = require("../../../shared/job-scheduler/job-scheduler.service");
const ObjectId = mongoose_2.Types.ObjectId;
let PromoOfferService = PromoOfferService_1 = class PromoOfferService {
    constructor(promoOfferModel, configService, utilsService, jobSchedulerService) {
        this.promoOfferModel = promoOfferModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.jobSchedulerService = jobSchedulerService;
        this.logger = new common_1.Logger(PromoOfferService_1.name);
    }
    async addPromoOffer(addPromoOfferDto) {
        try {
            const { title } = addPromoOfferDto;
            const { products } = addPromoOfferDto;
            const { startDateTime } = addPromoOfferDto;
            const { endDateTime } = addPromoOfferDto;
            const defaultData = {
                slug: this.utilsService.transformToSlug(title),
            };
            const mData = Object.assign(Object.assign({}, addPromoOfferDto), defaultData);
            const newData = new this.promoOfferModel(mData);
            const saveData = await newData.save();
            const isStartDate = this.utilsService.getDateDifference(new Date(), new Date(startDateTime), 'seconds');
            const isEndDate = this.utilsService.getDateDifference(new Date(), new Date(endDateTime), 'seconds');
            if (isEndDate <= 0) {
                return {
                    success: false,
                    message: 'Data can not be added. Expire date is wrong',
                };
            }
            else {
                this.jobSchedulerService.addOfferScheduleOnEnd(true, saveData._id, endDateTime, products);
            }
            if (isStartDate <= 0) {
                console.log('--------');
                await this.utilsService.updateProductsOnOfferStart(products);
            }
            else {
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
    async insertManyPromoOffer(addPromoOffersDto, optionPromoOfferDto) {
        const { deleteMany } = optionPromoOfferDto;
        if (deleteMany) {
            await this.promoOfferModel.deleteMany({});
        }
        const mData = addPromoOffersDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.title),
            });
        });
        try {
            const saveData = await this.promoOfferModel.insertMany(mData);
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
    async getAllPromoOffers(filterPromoOfferDto, searchQuery) {
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
            aggregateStages.push(mPagination);
            aggregateStages.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.promoOfferModel.aggregate(aggregateStages);
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
    async getPromoOfferById(id, select) {
        try {
            const data = await this.promoOfferModel
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
    async getPromoOfferSingle(select) {
        try {
            const data = await this.promoOfferModel
                .findOne({})
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
    async updatePromoOfferById(id, updatePromoOfferDto) {
        try {
            const { title } = updatePromoOfferDto;
            const { products } = updatePromoOfferDto;
            const { startDateTime } = updatePromoOfferDto;
            const { endDateTime } = updatePromoOfferDto;
            const data = await this.promoOfferModel.findById(id);
            const finalData = Object.assign({}, updatePromoOfferDto);
            if (title) {
                if (title && data.title !== title) {
                    finalData.slug = this.utilsService.transformToSlug(title, true);
                }
            }
            const jobNameStart = this.configService.get('promoOfferScheduleOnStart');
            const jobNameEnd = this.configService.get('promoOfferScheduleOnEnd');
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
            await this.promoOfferModel.findByIdAndUpdate(id, {
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
    async updateMultiplePromoOfferById(ids, updatePromoOfferDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updatePromoOfferDto.slug) {
            delete updatePromoOfferDto.slug;
        }
        try {
            await this.promoOfferModel.updateMany({ _id: { $in: mIds } }, { $set: updatePromoOfferDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deletePromoOfferById(id, checkUsage) {
        let data;
        try {
            data = await this.promoOfferModel.findById(id);
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
            const defaultPromoOffer = await this.promoOfferModel.findOne({
                _id: id,
            });
            await this.promoOfferModel.findByIdAndDelete(id);
            const productIds = defaultPromoOffer
                ? defaultPromoOffer.products.map((m) => new ObjectId(m))
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
    async deleteMultiplePromoOfferById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.promoOfferModel.find({
                _id: { $in: mIds },
            });
            await this.promoOfferModel.deleteMany({ _id: mIds });
            const mProductsIds = [];
            allCategory.forEach((f) => {
                f.products.forEach((g) => {
                    mProductsIds.push(g);
                });
            });
            const jobNameStart = this.configService.get('promoOfferScheduleOnStart');
            const jobNameEnd = this.configService.get('promoOfferScheduleOnEnd');
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
PromoOfferService = PromoOfferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('PromoOffer')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService,
        job_scheduler_service_1.JobSchedulerService])
], PromoOfferService);
exports.PromoOfferService = PromoOfferService;
//# sourceMappingURL=promo-offer.service.js.map