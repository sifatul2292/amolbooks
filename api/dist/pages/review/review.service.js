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
var ReviewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let ReviewService = ReviewService_1 = class ReviewService {
    constructor(reviewModel, productModel, userModel, configService, utilsService) {
        this.reviewModel = reviewModel;
        this.productModel = productModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(ReviewService_1.name);
    }
    async addReview(user, addReviewDto) {
        try {
            const productData = await this.productModel
                .findById({ _id: addReviewDto.product })
                .select('name slug images');
            const userData = await this.userModel
                .findById({ _id: user._id })
                .select('name profileImg');
            const mData = Object.assign(Object.assign({}, addReviewDto), {
                product: {
                    _id: productData._id,
                    name: productData.name,
                    images: productData.images,
                    slug: productData.slug,
                },
                user: {
                    _id: userData._id,
                    name: addReviewDto.name,
                    profileImg: userData.profileImg,
                },
            });
            const newData = new this.reviewModel(mData);
            await newData.save();
            return {
                success: true,
                message: 'review Added Successfully!',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async addReviewByAdmin(addReviewDto) {
        try {
            const productData = await this.productModel
                .findById({ _id: addReviewDto.product })
                .select('name slug images');
            const mData = Object.assign(Object.assign({}, addReviewDto), {
                product: {
                    _id: productData._id,
                    name: productData.name,
                    images: productData.images,
                    slug: productData.slug,
                },
                user: {
                    _id: null,
                    name: addReviewDto.name,
                    profileImg: null,
                },
            });
            const newData = new this.reviewModel(mData);
            await newData.save();
            await this.productModel.findByIdAndUpdate(addReviewDto.product, {
                $inc: {
                    ratingCount: addReviewDto.rating,
                    ratingTotal: 1,
                    reviewTotal: 1,
                },
            });
            switch (addReviewDto.rating) {
                case 1: {
                    await this.productModel.findByIdAndUpdate(addReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(addReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(addReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(addReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(addReviewDto.product, {
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
                message: 'review Added Successfully!',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getReviewByUserId(user) {
        try {
            const data = await this.reviewModel
                .find({ 'user._id': user._id })
                .populate('user', 'name phoneNo profileImg username')
                .populate('product', 'name slug images ')
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
    async getAllReviewsByQuery(filterReviewDto, searchQuery) {
        const { filter } = filterReviewDto;
        const { pagination } = filterReviewDto;
        const { sort } = filterReviewDto;
        const { select } = filterReviewDto;
        const { filterGroup } = filterReviewDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            if (filter['product._id']) {
                filter['product._id'] = new ObjectId(filter['product._id']);
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
            const dataAggregates = await this.reviewModel.aggregate(aggregateStages);
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
    async getAllReviews() {
        try {
            const reviews = await this.reviewModel
                .find()
                .populate('user', 'name phoneNo profileImg username')
                .populate('product', 'name slug images ')
                .sort({ createdAt: -1 });
            return {
                success: true,
                message: 'Success',
                data: reviews,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getReviewById(id, select) {
        try {
            const data = await this.reviewModel.findById(id).select(select);
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
    async updateReviewById(updateReviewDto) {
        try {
            const data = await this.reviewModel.findById(updateReviewDto);
            if (data.status === updateReviewDto.status) {
                await this.reviewModel.updateOne({ _id: updateReviewDto }, { $set: updateReviewDto });
            }
            else {
                if (data.status === true && updateReviewDto.status === false) {
                    await this.reviewModel.updateOne({ _id: updateReviewDto }, { $set: updateReviewDto });
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product._id, {
                        $inc: {
                            ratingCount: -updateReviewDto.rating,
                            ratingTotal: -1,
                            reviewTotal: -1,
                        },
                    });
                    switch (updateReviewDto.rating) {
                        case 1: {
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                    await this.reviewModel.updateOne({ _id: updateReviewDto }, { $set: updateReviewDto });
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product._id, {
                        $inc: {
                            ratingCount: updateReviewDto.rating,
                            ratingTotal: 1,
                            reviewTotal: 1,
                        },
                    });
                    switch (updateReviewDto.rating) {
                        case 1: {
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                            await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
    async updateReviewByIdAndDelete(updateReviewDto) {
        try {
            await this.reviewModel.updateOne({ _id: updateReviewDto }, { $set: updateReviewDto });
            await this.productModel.findByIdAndUpdate(updateReviewDto.product._id, {
                $inc: {
                    ratingCount: -updateReviewDto.rating,
                    ratingTotal: -1,
                    reviewTotal: -1,
                },
            });
            switch (updateReviewDto.rating) {
                case 1: {
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
                    await this.productModel.findByIdAndUpdate(updateReviewDto.product, {
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
    async deleteReviewById(id) {
        try {
            await this.reviewModel.deleteOne({ _id: id });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteReviewByLoggedinUserAndReviewId(id, user) {
        try {
            await this.reviewModel.deleteOne({ _id: id, 'user._id': user._id });
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
ReviewService = ReviewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Review')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __param(2, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], ReviewService);
exports.ReviewService = ReviewService;
//# sourceMappingURL=review.service.js.map