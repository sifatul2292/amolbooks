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
var YoutubeVideoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeVideoService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let YoutubeVideoService = YoutubeVideoService_1 = class YoutubeVideoService {
    constructor(youtubeVideoModel, userModel, configService, utilsService) {
        this.youtubeVideoModel = youtubeVideoModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(YoutubeVideoService_1.name);
    }
    async addYoutubeVideo(addYoutubeVideoDto) {
        const { name } = addYoutubeVideoDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addYoutubeVideoDto), defaultData);
        const newData = new this.youtubeVideoModel(mData);
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
    async insertManyYoutubeVideo(addYoutubeVideosDto, optionYoutubeVideoDto) {
        const { deleteMany } = optionYoutubeVideoDto;
        if (deleteMany) {
            await this.youtubeVideoModel.deleteMany({});
        }
        const mData = addYoutubeVideosDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.youtubeVideoModel.insertMany(mData);
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
    async getAllYoutubeVideosBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.youtubeVideoModel
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
    async getAllYoutubeVideos(filterYoutubeVideoDto, searchQuery) {
        const { filter } = filterYoutubeVideoDto;
        const { pagination } = filterYoutubeVideoDto;
        const { sort } = filterYoutubeVideoDto;
        const { select } = filterYoutubeVideoDto;
        const aggregateSyoutubeVideoes = [];
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
            aggregateSyoutubeVideoes.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSyoutubeVideoes.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSyoutubeVideoes.push({ $project: mSelect });
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
            aggregateSyoutubeVideoes.push(mPagination);
            aggregateSyoutubeVideoes.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.youtubeVideoModel.aggregate(aggregateSyoutubeVideoes);
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
    async getYoutubeVideoById(id, select) {
        try {
            const data = await this.youtubeVideoModel.findById(id).select(select);
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
    async updateYoutubeVideoById(id, updateYoutubeVideoDto) {
        const { name } = updateYoutubeVideoDto;
        let data;
        try {
            data = await this.youtubeVideoModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateYoutubeVideoDto);
            await this.youtubeVideoModel.findByIdAndUpdate(id, {
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
    async updateMultipleYoutubeVideoById(ids, updateYoutubeVideoDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.youtubeVideoModel.updateMany({ _id: { $in: mIds } }, { $set: updateYoutubeVideoDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteYoutubeVideoById(id, checkUsage) {
        let data;
        try {
            data = await this.youtubeVideoModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.youtubeVideoModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Delete Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleYoutubeVideoById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.youtubeVideoModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkYoutubeVideoAvailability(user, checkYoutubeVideoDto) {
        try {
            const { youtubeVideoCode, subTotal } = checkYoutubeVideoDto;
            const youtubeVideoData = await this.youtubeVideoModel.findOne({
                youtubeVideoCode,
            });
            if (youtubeVideoData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! YoutubeVideo offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! YoutubeVideo Expired',
                        data: null,
                    };
                }
                else {
                    const userYoutubeVideoExists = await this.userModel.findOne({
                        _id: user._id,
                        usedYoutubeVideos: youtubeVideoData._id,
                    });
                    if (userYoutubeVideoExists) {
                        return {
                            success: false,
                            message: 'Sorry! YoutubeVideo already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (youtubeVideoData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! YoutubeVideo minimum amount is ${youtubeVideoData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! YoutubeVideo added.',
                                data: {
                                    _id: youtubeVideoData._id,
                                    discountAmount: youtubeVideoData['discountAmount'],
                                    discountType: youtubeVideoData['discountType'],
                                    youtubeVideoCode: youtubeVideoData['youtubeVideoCode'],
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
YoutubeVideoService = YoutubeVideoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('YoutubeVideo')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], YoutubeVideoService);
exports.YoutubeVideoService = YoutubeVideoService;
//# sourceMappingURL=youtube-video.service.js.map