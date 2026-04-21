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
var BlogCommentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogCommentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let BlogCommentService = BlogCommentService_1 = class BlogCommentService {
    constructor(blogCommentModel, userModel, blogModel, configService, utilsService) {
        this.blogCommentModel = blogCommentModel;
        this.userModel = userModel;
        this.blogModel = blogModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(BlogCommentService_1.name);
    }
    async addBlogComment(user, addBlogCommentDto) {
        try {
            const blogData = await this.blogModel
                .findById({ _id: addBlogCommentDto.blog })
                .select('name slug image');
            const userData = await this.userModel
                .findById({ _id: user._id })
                .select('name profileImg');
            const mData = Object.assign(Object.assign({}, addBlogCommentDto), {
                blog: {
                    _id: blogData._id,
                    name: blogData.name,
                    image: blogData.image,
                    slug: blogData.slug,
                },
                user: userData,
            });
            const newData = new this.blogCommentModel(mData);
            await newData.save();
            return {
                success: true,
                message: 'blogComment Added Successfully!',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async addBlogCommentByAdmin(addBlogCommentDto) {
        try {
            const blogData = await this.blogModel
                .findById({ _id: addBlogCommentDto.blog })
                .select('name slug image');
            const mData = Object.assign(Object.assign({}, addBlogCommentDto), {
                blog: {
                    _id: blogData._id,
                    name: blogData.name,
                    image: blogData.image,
                    slug: blogData.slug,
                },
                user: {
                    _id: null,
                    name: addBlogCommentDto.name,
                    profileImg: null,
                },
            });
            const newData = new this.blogCommentModel(mData);
            await newData.save();
            await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
                $inc: {
                    ratingCount: addBlogCommentDto.rating,
                    ratingTotal: 1,
                    blogCommentTotal: 1,
                },
            });
            switch (addBlogCommentDto.rating) {
                case 1: {
                    await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(addBlogCommentDto.blog, {
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
                message: 'blogComment Added Successfully!',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getBlogCommentByUserId(user) {
        console.log(user);
        try {
            const data = await this.blogCommentModel
                .find({ 'user._id': user._id })
                .populate('user', 'name phoneNo profileImg username')
                .populate('blog', 'name slug image ')
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
    async getAllBlogCommentsByQuery(filterBlogCommentDto, searchQuery) {
        const { filter } = filterBlogCommentDto;
        const { pagination } = filterBlogCommentDto;
        const { sort } = filterBlogCommentDto;
        const { select } = filterBlogCommentDto;
        const { filterGroup } = filterBlogCommentDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            if (filter['blog._id']) {
                filter['blog._id'] = new ObjectId(filter['blog._id']);
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
            const dataAggregates = await this.blogCommentModel.aggregate(aggregateStages);
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
    async getAllBlogComments() {
        try {
            const blogComments = await this.blogCommentModel
                .find()
                .populate('user', 'name phoneNo profileImg username')
                .populate('blog', 'name slug image ')
                .sort({ createdAt: -1 });
            return {
                success: true,
                message: 'Success',
                data: blogComments,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getBlogCommentById(id, select) {
        try {
            const data = await this.blogCommentModel.findById(id).select(select);
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
    async updateBlogCommentById(updateBlogCommentDto) {
        try {
            const data = await this.blogCommentModel.findById(updateBlogCommentDto);
            if (data.status === updateBlogCommentDto.status) {
                await this.blogCommentModel.updateOne({ _id: updateBlogCommentDto }, { $set: updateBlogCommentDto });
            }
            else {
                if (data.status === true && updateBlogCommentDto.status === false) {
                    await this.blogCommentModel.updateOne({ _id: updateBlogCommentDto }, { $set: updateBlogCommentDto });
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog._id, {
                        $inc: {
                            ratingCount: -updateBlogCommentDto.rating,
                            ratingTotal: -1,
                            blogCommentTotal: -1,
                        },
                    });
                    switch (updateBlogCommentDto.rating) {
                        case 1: {
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                    await this.blogCommentModel.updateOne({ _id: updateBlogCommentDto }, { $set: updateBlogCommentDto });
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog._id, {
                        $inc: {
                            ratingCount: updateBlogCommentDto.rating,
                            ratingTotal: 1,
                            blogCommentTotal: 1,
                        },
                    });
                    switch (updateBlogCommentDto.rating) {
                        case 1: {
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
    async updateBlogCommentByIdAndDelete(updateBlogCommentDto) {
        try {
            await this.blogCommentModel.updateOne({ _id: updateBlogCommentDto }, { $set: updateBlogCommentDto });
            await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog._id, {
                $inc: {
                    ratingCount: -updateBlogCommentDto.rating,
                    ratingTotal: -1,
                    blogCommentTotal: -1,
                },
            });
            switch (updateBlogCommentDto.rating) {
                case 1: {
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
                    await this.blogModel.findByIdAndUpdate(updateBlogCommentDto.blog, {
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
    async deleteBlogCommentById(id) {
        try {
            await this.blogCommentModel.deleteOne({ _id: id });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteBlogCommentByLoggedinUserAndBlogCommentId(id, user) {
        try {
            await this.blogCommentModel.deleteOne({ _id: id, 'user._id': user._id });
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
BlogCommentService = BlogCommentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('BlogComment')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __param(2, (0, mongoose_1.InjectModel)('Blog')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], BlogCommentService);
exports.BlogCommentService = BlogCommentService;
//# sourceMappingURL=blog-comment.service.js.map