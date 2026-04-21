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
var SubCategoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubCategoryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let SubCategoryService = SubCategoryService_1 = class SubCategoryService {
    constructor(subCategoryModel, productModel, configService, utilsService) {
        this.subCategoryModel = subCategoryModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(SubCategoryService_1.name);
    }
    async addSubCategory(addSubCategoryDto) {
        const { name, slug } = addSubCategoryDto;
        try {
            let finalSlug;
            const fData = await this.subCategoryModel.findOne({ slug: slug });
            if (fData) {
                finalSlug = this.utilsService.transformToSlug(slug, true);
            }
            else {
                finalSlug = slug;
            }
            const defaultData = {
                slug: finalSlug,
            };
            const mData = Object.assign(Object.assign({}, addSubCategoryDto), defaultData);
            const newData = new this.subCategoryModel(mData);
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
    async insertManySubCategory(addSubCategorysDto, optionSubCategoryDto) {
        const { deleteMany } = optionSubCategoryDto;
        if (deleteMany) {
            await this.subCategoryModel.deleteMany({});
        }
        const mData = addSubCategorysDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.subCategoryModel.insertMany(mData);
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
    async getAllSubCategories(filterSubCategoryDto, searchQuery) {
        const { filter } = filterSubCategoryDto;
        const { pagination } = filterSubCategoryDto;
        const { sort } = filterSubCategoryDto;
        const { select } = filterSubCategoryDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            if (filter['category']) {
                filter['category'] = new ObjectId(filter['category']);
            }
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
                            {
                                $lookup: {
                                    from: 'categories',
                                    localField: 'category',
                                    foreignField: '_id',
                                    as: 'categoryInfo',
                                },
                            },
                            {
                                $unwind: '$categoryInfo',
                            },
                            {
                                $project: Object.assign(Object.assign({}, mSelect), {
                                    categoryInfo: {
                                        name: '$categoryInfo.name',
                                    },
                                }),
                            },
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
            const dataAggregates = await this.subCategoryModel.aggregate(aggregateStages);
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
    async getSubCategoryById(id, select) {
        try {
            const data = await this.subCategoryModel.findById(id).select(select);
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
    async getSubCategoriesByCategoryId(id, select) {
        try {
            const data = await this.subCategoryModel
                .find({ category: id })
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
    async getSubCategoriesGroupByCategory() {
        const aggregateStages = [];
        aggregateStages.push({
            $match: {
                readOnly: { $ne: true },
                status: 'publish',
            },
        });
        aggregateStages.push({
            $group: {
                _id: '$category',
                subCategories: {
                    $push: '$$ROOT',
                },
            },
        });
        aggregateStages.push({
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category',
            },
        });
        try {
            const dataAggregates = await this.subCategoryModel.aggregate(aggregateStages);
            const mDataAggregates = JSON.parse(JSON.stringify(dataAggregates));
            const filteredData = [];
            mDataAggregates.forEach((m) => {
                var _a, _b;
                if (((_a = m.category[0]) === null || _a === void 0 ? void 0 : _a.status) === 'publish' &&
                    ((_b = m.category[0]) === null || _b === void 0 ? void 0 : _b.readOnly) !== true) {
                    const data = {
                        _id: m._id,
                        name: m.category[0].name,
                        image: m.category[0].image,
                        slug: m.category[0].slug,
                        readOnly: m.category[0].readOnly,
                        serial: m.category[0].serial,
                        subCategories: m.subCategories,
                        status: m.category[0].status,
                    };
                    filteredData.push(data);
                }
            });
            return {
                data: filteredData,
                success: true,
                message: 'Success',
                count: dataAggregates.length,
            };
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
    async updateSubCategoryById(id, updateSubCategoryDto) {
        try {
            const { name, slug } = updateSubCategoryDto;
            let finalSlug;
            const fData = await this.subCategoryModel.findById(id);
            if (fData.slug !== slug) {
                const fData = await this.subCategoryModel.findOne({ slug: slug });
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
            const finalData = Object.assign(Object.assign({}, updateSubCategoryDto), defaultData);
            await this.subCategoryModel.findByIdAndUpdate(id, {
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
    async updateMultipleSubCategoryById(ids, updateSubCategoryDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateSubCategoryDto.slug) {
            delete updateSubCategoryDto.slug;
        }
        try {
            await this.subCategoryModel.updateMany({ _id: { $in: mIds } }, { $set: updateSubCategoryDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async changeMultipleSubCategoryStatus(ids, updateCategoryDto) {
        const { status } = updateCategoryDto;
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.subCategoryModel.updateMany({ _id: { $in: mIds } }, { $set: { status: status } });
            await this.productModel.updateMany({ 'category._id': { $in: mIds } }, { $set: { status: status } });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteSubCategoryById(id, checkUsage) {
        let data;
        try {
            data = await this.subCategoryModel.findById(id);
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
            await this.subCategoryModel.findByIdAndDelete(id);
            if (checkUsage) {
                const defaultSubCategory = await this.subCategoryModel.findOne({
                    readOnly: true,
                });
                const resetCategory = {
                    subCategory: {
                        _id: defaultSubCategory._id,
                        name: defaultSubCategory.name,
                        slug: defaultSubCategory.slug,
                    },
                };
                await this.productModel.updateMany({ 'subCategory._id': new ObjectId(id) }, { $set: resetCategory });
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
    async deleteMultipleSubCategoryById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.subCategoryModel.find({
                _id: { $in: mIds },
            });
            const filteredIds = allCategory
                .filter((f) => f.readOnly !== true)
                .map((m) => m._id);
            await this.subCategoryModel.deleteMany({ _id: filteredIds });
            if (checkUsage) {
                const defaultSubCategory = await this.subCategoryModel.findOne({
                    readOnly: true,
                });
                const resetCategory = {
                    subCategory: {
                        _id: defaultSubCategory._id,
                        name: defaultSubCategory.name,
                        slug: defaultSubCategory.slug,
                    },
                };
                await this.productModel.updateMany({ 'subCategory._id': { $in: mIds } }, { $set: resetCategory });
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
};
SubCategoryService = SubCategoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('SubCategory')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], SubCategoryService);
exports.SubCategoryService = SubCategoryService;
//# sourceMappingURL=sub-category.service.js.map