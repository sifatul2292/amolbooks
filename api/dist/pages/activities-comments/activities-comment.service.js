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
var ActivitiesCommentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesCommentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let ActivitiesCommentService = ActivitiesCommentService_1 = class ActivitiesCommentService {
    constructor(activitiesCommentModel, userModel, activitiesModel, configService, utilsService) {
        this.activitiesCommentModel = activitiesCommentModel;
        this.userModel = userModel;
        this.activitiesModel = activitiesModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(ActivitiesCommentService_1.name);
    }
    async addActivitiesComment(user, addActivitiesCommentDto) {
        try {
            const activitiesData = await this.activitiesModel
                .findById({ _id: addActivitiesCommentDto.activities })
                .select('name slug image');
            const userData = await this.userModel
                .findById({ _id: user._id })
                .select('name profileImg');
            const mData = Object.assign(Object.assign({}, addActivitiesCommentDto), {
                activities: {
                    _id: activitiesData._id,
                    name: activitiesData.name,
                    image: activitiesData.image,
                    slug: activitiesData.slug,
                },
                user: {
                    _id: userData._id,
                    name: addActivitiesCommentDto.userName,
                    profileImg: userData.profileImg,
                },
            });
            const newData = new this.activitiesCommentModel(mData);
            await newData.save();
            return {
                success: true,
                message: 'activitiesComment Added Successfully!',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async addActivitiesCommentByAdmin(addActivitiesCommentDto) {
        try {
            const activitiesData = await this.activitiesModel
                .findById({ _id: addActivitiesCommentDto.activities })
                .select('name slug image');
            const mData = Object.assign(Object.assign({}, addActivitiesCommentDto), {
                activities: {
                    _id: activitiesData._id,
                    name: activitiesData.name,
                    image: activitiesData.image,
                    slug: activitiesData.slug,
                },
                user: {
                    _id: null,
                    name: addActivitiesCommentDto.name,
                    profileImg: null,
                },
            });
            const newData = new this.activitiesCommentModel(mData);
            await newData.save();
            await this.activitiesModel.findByIdAndUpdate(addActivitiesCommentDto.activities, {
                $inc: {
                    ratingCount: addActivitiesCommentDto.rating,
                    ratingTotal: 1,
                    activitiesCommentTotal: 1,
                },
            });
            switch (addActivitiesCommentDto.rating) {
                case 1: {
                    await this.activitiesModel.findByIdAndUpdate(addActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.oneStar': 1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 2: {
                    await this.activitiesModel.findByIdAndUpdate(addActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.twoStar': 1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 3: {
                    await this.activitiesModel.findByIdAndUpdate(addActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.threeStar': 1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 4: {
                    await this.activitiesModel.findByIdAndUpdate(addActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.fourStar': 1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 5: {
                    await this.activitiesModel.findByIdAndUpdate(addActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.fiveStar': 1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                default: {
                    break;
                }
            }
            return {
                success: true,
                message: 'activitiesComment Added Successfully!',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getActivitiesCommentByUserId(user) {
        console.log(user);
        try {
            const data = await this.activitiesCommentModel
                .find({ 'user._id': user._id })
                .populate('user', 'name phoneNo profileImg username')
                .populate('activities', 'name slug image ')
                .sort({ createdAt: -1 });
            return {
                data: data,
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async getAllActivitiesCommentsByQuery(filterActivitiesCommentDto, searchQuery) {
        const { filter } = filterActivitiesCommentDto;
        const { pagination } = filterActivitiesCommentDto;
        const { sort } = filterActivitiesCommentDto;
        const { select } = filterActivitiesCommentDto;
        const { filterGroup } = filterActivitiesCommentDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            if (filter['activities._id']) {
                filter['activities._id'] = new ObjectId(filter['activities._id']);
            }
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = {
                $and: [
                    mFilter,
                    {
                        $or: [
                            { orderId: { $regex: searchQuery, $options: 'i' } },
                            { phoneNo: { $regex: searchQuery, $options: 'i' } },
                        ],
                    },
                ],
            };
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
            const dataAggregates = await this.activitiesCommentModel.aggregate(aggregateStages);
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
    async getAllActivitiesComments() {
        try {
            const activitiesComments = await this.activitiesCommentModel
                .find()
                .populate('user', 'name phoneNo profileImg username')
                .populate('activities', 'name slug image ')
                .sort({ createdAt: -1 });
            return {
                success: true,
                message: 'Success',
                data: activitiesComments,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getActivitiesCommentById(id, select) {
        try {
            const data = await this.activitiesCommentModel
                .findById(id)
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
    async updateActivitiesCommentById(updateActivitiesCommentDto) {
        try {
            const data = await this.activitiesCommentModel.findById(updateActivitiesCommentDto);
            if (data.status === updateActivitiesCommentDto.status) {
                await this.activitiesCommentModel.updateOne({ _id: updateActivitiesCommentDto }, { $set: updateActivitiesCommentDto });
            }
            else {
                if (data.status === true &&
                    updateActivitiesCommentDto.status === false) {
                    await this.activitiesCommentModel.updateOne({ _id: updateActivitiesCommentDto }, { $set: updateActivitiesCommentDto });
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities._id, {
                        $inc: {
                            ratingCount: -updateActivitiesCommentDto.rating,
                            ratingTotal: -1,
                            activitiesCommentTotal: -1,
                        },
                    });
                    switch (updateActivitiesCommentDto.rating) {
                        case 1: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.oneStar': -1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 2: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.twoStar': -1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 3: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.threeStar': -1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 4: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.fourStar': -1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 5: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.fiveStar': -1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
                else {
                    await this.activitiesCommentModel.updateOne({ _id: updateActivitiesCommentDto }, { $set: updateActivitiesCommentDto });
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities._id, {
                        $inc: {
                            ratingCount: updateActivitiesCommentDto.rating,
                            ratingTotal: 1,
                            activitiesCommentTotal: 1,
                        },
                    });
                    switch (updateActivitiesCommentDto.rating) {
                        case 1: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.oneStar': 1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 2: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.twoStar': 1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 3: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.threeStar': 1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 4: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.fourStar': 1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        case 5: {
                            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                                $inc: {
                                    'ratingDetails.fiveStar': 1,
                                },
                            }, {
                                upsert: true,
                                new: true,
                            });
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
            }
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateActivitiesCommentByIdAndDelete(updateActivitiesCommentDto) {
        try {
            await this.activitiesCommentModel.updateOne({ _id: updateActivitiesCommentDto }, { $set: updateActivitiesCommentDto });
            await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities._id, {
                $inc: {
                    ratingCount: -updateActivitiesCommentDto.rating,
                    ratingTotal: -1,
                    activitiesCommentTotal: -1,
                },
            });
            switch (updateActivitiesCommentDto.rating) {
                case 1: {
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.oneStar': -1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 2: {
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.twoStar': -1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 3: {
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.threeStar': -1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 4: {
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.fourStar': -1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                case 5: {
                    await this.activitiesModel.findByIdAndUpdate(updateActivitiesCommentDto.activities, {
                        $inc: {
                            'ratingDetails.fiveStar': -1,
                        },
                    }, {
                        upsert: true,
                        new: true,
                    });
                    break;
                }
                default: {
                    break;
                }
            }
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteActivitiesCommentById(id) {
        try {
            await this.activitiesCommentModel.deleteOne({ _id: id });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(id, user) {
        try {
            await this.activitiesCommentModel.deleteOne({
                _id: id,
                'user._id': user._id,
            });
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
ActivitiesCommentService = ActivitiesCommentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ActivitiesComment')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __param(2, (0, mongoose_1.InjectModel)('Activities')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], ActivitiesCommentService);
exports.ActivitiesCommentService = ActivitiesCommentService;
//# sourceMappingURL=activities-comment.service.js.map