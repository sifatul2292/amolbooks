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
var ActivitiesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let ActivitiesService = ActivitiesService_1 = class ActivitiesService {
    constructor(activitiesModel, userModel, configService, utilsService) {
        this.activitiesModel = activitiesModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(ActivitiesService_1.name);
    }
    async addActivities(addActivitiesDto) {
        const { name } = addActivitiesDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addActivitiesDto), defaultData);
        const newData = new this.activitiesModel(mData);
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
    async insertManyActivities(addActivitiessDto, optionActivitiesDto) {
        const { deleteMany } = optionActivitiesDto;
        if (deleteMany) {
            await this.activitiesModel.deleteMany({});
        }
        const mData = addActivitiessDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.activitiesModel.insertMany(mData);
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
    async getAllActivitiessBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.activitiesModel
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
    async getAllActivitiess(filterActivitiesDto, searchQuery) {
        const { filter } = filterActivitiesDto;
        const { pagination } = filterActivitiesDto;
        const { sort } = filterActivitiesDto;
        const { select } = filterActivitiesDto;
        const aggregateSactivitieses = [];
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
            aggregateSactivitieses.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSactivitieses.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSactivitieses.push({ $project: mSelect });
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
            aggregateSactivitieses.push(mPagination);
            aggregateSactivitieses.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.activitiesModel.aggregate(aggregateSactivitieses);
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
    async getActivitiesById(id, select) {
        try {
            const data = await this.activitiesModel.findById(id).select(select);
            return {
                success: true,
                message: 'Single profile get Successfully',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async activitiesViewCount(id, user) {
        try {
            await this.activitiesModel.findByIdAndUpdate(id, {
                $inc: { totalView: 1 },
            }, {
                upsert: true,
                new: true,
            });
            return {
                success: true,
                message: 'Success',
                data: null,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateActivitiesById(id, updateActivitiesDto) {
        const { name } = updateActivitiesDto;
        let data;
        try {
            data = await this.activitiesModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateActivitiesDto);
            await this.activitiesModel.findByIdAndUpdate(id, {
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
    async updateMultipleActivitiesById(ids, updateActivitiesDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.activitiesModel.updateMany({ _id: { $in: mIds } }, { $set: updateActivitiesDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteActivitiesById(id, checkUsage) {
        let data;
        try {
            data = await this.activitiesModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.activitiesModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Delete Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleActivitiesById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.activitiesModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkActivitiesAvailability(user, checkActivitiesDto) {
        try {
            const { activitiesCode, subTotal } = checkActivitiesDto;
            const activitiesData = await this.activitiesModel.findOne({ activitiesCode });
            if (activitiesData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! Activities offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Activities Expired',
                        data: null,
                    };
                }
                else {
                    const userActivitiesExists = await this.userModel.findOne({
                        _id: user._id,
                        usedActivitiess: activitiesData._id,
                    });
                    if (userActivitiesExists) {
                        return {
                            success: false,
                            message: 'Sorry! Activities already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (activitiesData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! Activities minimum amount is ${activitiesData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! Activities added.',
                                data: {
                                    _id: activitiesData._id,
                                    discountAmount: activitiesData['discountAmount'],
                                    discountType: activitiesData['discountType'],
                                    activitiesCode: activitiesData['activitiesCode'],
                                },
                            };
                        }
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid profile code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
ActivitiesService = ActivitiesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Activities')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], ActivitiesService);
exports.ActivitiesService = ActivitiesService;
//# sourceMappingURL=activities.service.js.map