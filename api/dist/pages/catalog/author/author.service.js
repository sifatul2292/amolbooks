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
var AuthorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let AuthorService = AuthorService_1 = class AuthorService {
    constructor(authorModel, userModel, configService, utilsService) {
        this.authorModel = authorModel;
        this.userModel = userModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(AuthorService_1.name);
    }
    async addAuthor(addAuthorDto) {
        const { name, slug } = addAuthorDto;
        try {
            let finalSlug;
            const fData = await this.authorModel.findOne({ slug: slug });
            if (fData) {
                finalSlug = this.utilsService.transformToSlug(slug, true);
            }
            else {
                finalSlug = slug;
            }
            const defaultData = {
                slug: finalSlug,
            };
            const mData = Object.assign(Object.assign({}, addAuthorDto), defaultData);
            const newData = new this.authorModel(mData);
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
    async insertManyAuthor(addAuthorsDto, optionAuthorDto) {
        const { deleteMany } = optionAuthorDto;
        if (deleteMany) {
            await this.authorModel.deleteMany({});
        }
        const mData = addAuthorsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.authorModel.insertMany(mData);
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
    async getAllAuthorsBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.authorModel
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
    async getAllAuthors(filterAuthorDto, searchQuery) {
        const { filter } = filterAuthorDto;
        const { pagination } = filterAuthorDto;
        const { sort } = filterAuthorDto;
        const { select } = filterAuthorDto;
        const aggregateSauthores = [];
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
            aggregateSauthores.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSauthores.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSauthores.push({ $project: mSelect });
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
            aggregateSauthores.push(mPagination);
            aggregateSauthores.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.authorModel.aggregate(aggregateSauthores);
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
    async getAuthorById(id, select) {
        try {
            const data = await this.authorModel.findById(id).select(select);
            return {
                success: true,
                message: 'Single author get Successfully',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getAuthorBySlug(slug, select) {
        try {
            const data = await this.authorModel.findOne({ slug: slug }).select(select);
            return {
                success: true,
                message: 'Single author get Successfully',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async updateAuthorById(id, updateAuthorDto) {
        try {
            const { name, slug } = updateAuthorDto;
            let finalSlug;
            const fData = await this.authorModel.findById(id);
            if (fData.slug !== slug) {
                const fData = await this.authorModel.findOne({ slug: slug });
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
            const finalData = Object.assign(Object.assign({}, updateAuthorDto), defaultData);
            await this.authorModel.findByIdAndUpdate(id, {
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
    async updateMultipleAuthorById(ids, updateAuthorDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.authorModel.updateMany({ _id: { $in: mIds } }, { $set: updateAuthorDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteAuthorById(id, checkUsage) {
        let data;
        try {
            data = await this.authorModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.authorModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Delete Successfully',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleAuthorById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.authorModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkAuthorAvailability(user, checkAuthorDto) {
        try {
            const { authorCode, subTotal } = checkAuthorDto;
            const authorData = await this.authorModel.findOne({
                authorCode,
            });
            if (authorData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), 'seconds');
                const isStartDate = this.utilsService.getDateDifference(new Date(), 'seconds');
                if (isStartDate > 0) {
                    return {
                        success: false,
                        message: 'Sorry! Author offer is not start yet',
                        data: null,
                    };
                }
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Author Expired',
                        data: null,
                    };
                }
                else {
                    const userAuthorExists = await this.userModel.findOne({
                        _id: user._id,
                        usedAuthors: authorData._id,
                    });
                    if (userAuthorExists) {
                        return {
                            success: false,
                            message: 'Sorry! Author already used in your account.',
                            data: null,
                        };
                    }
                    else {
                        if (authorData['minimumAmount'] > subTotal) {
                            return {
                                success: false,
                                message: `Sorry! Author minimum amount is ${authorData['minimumAmount']}`,
                                data: null,
                            };
                        }
                        else {
                            return {
                                success: true,
                                message: 'Success! Author added.',
                                data: {
                                    _id: authorData._id,
                                    discountAmount: authorData['discountAmount'],
                                    discountType: authorData['discountType'],
                                    authorCode: authorData['authorCode'],
                                },
                            };
                        }
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid author code',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
AuthorService = AuthorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Author')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], AuthorService);
exports.AuthorService = AuthorService;
//# sourceMappingURL=author.service.js.map