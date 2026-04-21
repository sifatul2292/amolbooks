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
var PublisherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let PublisherService = PublisherService_1 = class PublisherService {
    constructor(publisherModel, userModel, configService, utilsService) {
        this.publisherModel = publisherModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(PublisherService_1.name);
    }
    async addPublisher(addPublisherDto) {
        const { name, slug } = addPublisherDto;
        try {
            let finalSlug;
            const fData = await this.publisherModel.findOne({ slug: slug });
            if (fData) {
                finalSlug = this.utilsService.transformToSlug(slug, true);
            }
            else {
                finalSlug = slug;
            }
            const defaultData = {
                slug: finalSlug,
            };
            const mData = Object.assign(Object.assign({}, addPublisherDto), defaultData);
            const newData = new this.publisherModel(mData);
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
    async insertManyPublisher(addPublishersDto, optionPublisherDto) {
        const { deleteMany } = optionPublisherDto;
        if (deleteMany) {
            await this.publisherModel.deleteMany({});
        }
        const mData = addPublishersDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.publisherModel.insertMany(mData);
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
    async getAllPublishersBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.publisherModel
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
    async getAllPublishers(filterPublisherDto, searchQuery) {
        const { filter } = filterPublisherDto;
        const { pagination } = filterPublisherDto;
        const { sort } = filterPublisherDto;
        const { select } = filterPublisherDto;
        const aggregateSpublisheres = [];
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
            aggregateSpublisheres.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSpublisheres.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSpublisheres.push({ $project: mSelect });
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
            aggregateSpublisheres.push(mPagination);
            aggregateSpublisheres.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.publisherModel.aggregate(aggregateSpublisheres);
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
    async getPublisherById(id, select) {
        try {
            const data = await this.publisherModel.findById(id).select(select);
            return {
                success: true,
                message: 'Single publisher get Successfully',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updatePublisherById(id, updatePublisherDto) {
        try {
            const { name, slug } = updatePublisherDto;
            let finalSlug;
            const fData = await this.publisherModel.findById(id);
            if (fData.slug !== slug) {
                const fData = await this.publisherModel.findOne({ slug: slug });
                if (fData) {
                    finalSlug = this.utilsService.transformToSlug(slug, true);
                }
                else {
                    finalSlug = slug;
                }
            }
            else {
                finalSlug = slug;
            }
            const defaultData = {
                slug: finalSlug,
            };
            const finalData = Object.assign(Object.assign({}, updatePublisherDto), defaultData);
            await this.publisherModel.findByIdAndUpdate(id, {
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
    async updateMultiplePublisherById(ids, updatePublisherDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.publisherModel.updateMany({ _id: { $in: mIds } }, { $set: updatePublisherDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deletePublisherById(id, checkUsage) {
        let data;
        try {
            data = await this.publisherModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.publisherModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Delete Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultiplePublisherById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.publisherModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkPublisherAvailability(user, checkPublisherDto) {
        try {
            const { publisherCode, subTotal } = checkPublisherDto;
            const publisherData = await this.publisherModel.findOne({
                publisherCode,
            });
            if (publisherData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! Publisher offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Publisher Expired',
                        data: null,
                    };
                }
                else {
                    const userPublisherExists = await this.userModel.findOne({
                        _id: user._id,
                        usedPublishers: publisherData._id,
                    });
                    if (userPublisherExists) {
                        return {
                            success: false,
                            message: 'Sorry! Publisher already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (publisherData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! Publisher minimum amount is ${publisherData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! Publisher added.',
                                data: {
                                    _id: publisherData._id,
                                    discountAmount: publisherData['discountAmount'],
                                    discountType: publisherData['discountType'],
                                    publisherCode: publisherData['publisherCode'],
                                },
                            };
                        }
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid publisher code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
PublisherService = PublisherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Publisher')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], PublisherService);
exports.PublisherService = PublisherService;
//# sourceMappingURL=publisher.service.js.map