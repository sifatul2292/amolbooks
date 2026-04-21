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
var CategoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let CategoryService = CategoryService_1 = class CategoryService {
    constructor(categoryModel, productModel, subCategoryModel, configService, utilsService) {
        this.categoryModel = categoryModel;
        this.productModel = productModel;
        this.subCategoryModel = subCategoryModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(CategoryService_1.name);
    }
    async addCategory(addCategoryDto) {
        const { name, slug } = addCategoryDto;
        try {
            let finalSlug;
            const fData = await this.categoryModel.findOne({ slug: slug });
            if (fData) {
                finalSlug = this.utilsService.transformToSlug(slug, true);
            }
            else {
                finalSlug = slug;
            }
            const defaultData = {
                slug: finalSlug,
            };
            const mData = Object.assign(Object.assign({}, addCategoryDto), defaultData);
            const newData = new this.categoryModel(mData);
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
    async insertManyCategory(addCategorysDto, optionCategoryDto) {
        const { deleteMany } = optionCategoryDto;
        if (deleteMany) {
            await this.categoryModel.deleteMany({});
        }
        const mData = addCategorysDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.categoryModel.insertMany(mData);
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
    async getAllCategories(filterCategoryDto, searchQuery) {
        const { filter } = filterCategoryDto;
        const { pagination } = filterCategoryDto;
        const { sort } = filterCategoryDto;
        const { select } = filterCategoryDto;
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
            const dataAggregates = await this.categoryModel.aggregate(aggregateStages);
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
    async getCategoryById(id, select) {
        try {
            const data = await this.categoryModel.findById(id).select(select);
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
    async updateCategoryById(id, updateCategoryDto) {
        try {
            const { name, slug } = updateCategoryDto;
            let finalSlug;
            const fData = await this.categoryModel.findById(id);
            if (fData.slug !== slug) {
                const fData = await this.categoryModel.findOne({ slug: slug });
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
            const finalData = Object.assign(Object.assign({}, updateCategoryDto), defaultData);
            await this.categoryModel.findByIdAndUpdate(id, {
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
    async updateMultipleCategoryById(ids, updateCategoryDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateCategoryDto.slug) {
            delete updateCategoryDto.slug;
        }
        try {
            await this.categoryModel.updateMany({ _id: { $in: mIds } }, { $set: updateCategoryDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async changeMultipleCategoryStatus(ids, updateCategoryDto) {
        const { status } = updateCategoryDto;
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.categoryModel.updateMany({ _id: { $in: mIds } }, { $set: { status: status } });
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
    async deleteCategoryById(id, checkUsage) {
        let data;
        try {
            data = await this.categoryModel.findById(id);
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
            await this.categoryModel.findByIdAndDelete(id);
            if (checkUsage) {
                const defaultCategory = await this.categoryModel.findOne({
                    readOnly: true,
                });
                const defaultSubCategory = await this.subCategoryModel.findOne({
                    category: new ObjectId(defaultCategory._id),
                });
                const resetCategory = {
                    category: {
                        _id: defaultCategory._id,
                        name: defaultCategory.name,
                        slug: defaultCategory.slug,
                    },
                    subCategory: {
                        _id: defaultSubCategory._id,
                        name: defaultSubCategory.name,
                        slug: defaultSubCategory.slug,
                    },
                };
                await this.subCategoryModel.updateMany({ category: new ObjectId(id) }, { $set: { category: defaultCategory._id } });
                await this.productModel.updateMany({ 'category._id': new ObjectId(id) }, { $set: resetCategory });
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
    async deleteMultipleCategoryById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.categoryModel.find({ _id: { $in: mIds } });
            const filteredIds = allCategory
                .filter((f) => f.readOnly !== true)
                .map((m) => m._id);
            await this.categoryModel.deleteMany({ _id: filteredIds });
            if (checkUsage) {
                const defaultCategory = await this.categoryModel.findOne({
                    readOnly: true,
                });
                const defaultSubCategory = await this.subCategoryModel.findOne({
                    category: new ObjectId(defaultCategory._id),
                });
                const resetCategory = {
                    category: {
                        _id: defaultCategory._id,
                        name: defaultCategory.name,
                        slug: defaultCategory.slug,
                    },
                    subCategory: {
                        _id: defaultSubCategory._id,
                        name: defaultSubCategory.name,
                        slug: defaultSubCategory.slug,
                    },
                };
                await this.subCategoryModel.updateMany({ category: { $in: mIds } }, { $set: { category: defaultCategory._id } });
                await this.productModel.updateMany({ 'category._id': { $in: mIds } }, { $set: resetCategory });
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
CategoryService = CategoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Category')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __param(2, (0, mongoose_1.InjectModel)('SubCategory')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], CategoryService);
exports.CategoryService = CategoryService;
//# sourceMappingURL=category.service.js.map