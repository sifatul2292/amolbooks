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
var ManuscriptSubjectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManuscriptSubjectService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let ManuscriptSubjectService = ManuscriptSubjectService_1 = class ManuscriptSubjectService {
    constructor(manuscriptSubjectModel, productModel, configService, utilsService) {
        this.manuscriptSubjectModel = manuscriptSubjectModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(ManuscriptSubjectService_1.name);
    }
    async addManuscriptSubject(addManuscriptSubjectDto) {
        const { name } = addManuscriptSubjectDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addManuscriptSubjectDto), defaultData);
        const newData = new this.manuscriptSubjectModel(mData);
        try {
            const saveData = await newData.save();
            const data = {
                _id: saveData._id,
            };
            return {
                success: true,
                message: 'Data Added Success',
                data,
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
    async insertManyManuscriptSubject(addManuscriptSubjectsDto, optionManuscriptSubjectDto) {
        const { deleteMany } = optionManuscriptSubjectDto;
        if (deleteMany) {
            await this.manuscriptSubjectModel.deleteMany({});
        }
        const mData = addManuscriptSubjectsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.manuscriptSubjectModel.insertMany(mData);
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
    async getAllManuscriptSubjects(filterManuscriptSubjectDto, searchQuery) {
        const { filter } = filterManuscriptSubjectDto;
        const { pagination } = filterManuscriptSubjectDto;
        const { sort } = filterManuscriptSubjectDto;
        const { select } = filterManuscriptSubjectDto;
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
            const dataAggregates = await this.manuscriptSubjectModel.aggregate(aggregateStages);
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
    async getManuscriptSubjectById(id, select) {
        try {
            const data = await this.manuscriptSubjectModel
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
    async updateManuscriptSubjectById(id, updateManuscriptSubjectDto) {
        const { name } = updateManuscriptSubjectDto;
        let data;
        try {
            data = await this.manuscriptSubjectModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateManuscriptSubjectDto);
            if (name)
                if (name && data.name !== name) {
                    finalData.slug = this.utilsService.transformToSlug(name, true);
                }
            await this.manuscriptSubjectModel.findByIdAndUpdate(id, {
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
    async updateMultipleManuscriptSubjectById(ids, updateManuscriptSubjectDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateManuscriptSubjectDto.slug) {
            delete updateManuscriptSubjectDto.slug;
        }
        try {
            await this.manuscriptSubjectModel.updateMany({ _id: { $in: mIds } }, { $set: updateManuscriptSubjectDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteManuscriptSubjectById(id, checkUsage) {
        let data;
        try {
            data = await this.manuscriptSubjectModel.findById(id);
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
            await this.manuscriptSubjectModel.findByIdAndDelete(id);
            if (checkUsage) {
                const defaultManuscriptSubject = await this.manuscriptSubjectModel.findOne({
                    readOnly: true,
                });
                const resetManuscriptSubject = {
                    manuscriptSubject: {
                        _id: defaultManuscriptSubject._id,
                        name: defaultManuscriptSubject.name,
                        slug: defaultManuscriptSubject.slug,
                    },
                };
                await this.productModel.updateMany({ 'manuscriptSubject._id': new ObjectId(id) }, { $set: resetManuscriptSubject });
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
    async deleteMultipleManuscriptSubjectById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.manuscriptSubjectModel.find({
                _id: { $in: mIds },
            });
            const filteredIds = allCategory
                .filter((f) => f.readOnly !== true)
                .map((m) => m._id);
            await this.manuscriptSubjectModel.deleteMany({ _id: filteredIds });
            if (checkUsage) {
                const defaultManuscriptSubject = await this.manuscriptSubjectModel.findOne({
                    readOnly: true,
                });
                const resetManuscriptSubject = {
                    manuscriptSubject: {
                        _id: defaultManuscriptSubject._id,
                        name: defaultManuscriptSubject.name,
                        slug: defaultManuscriptSubject.slug,
                    },
                };
                await this.productModel.updateMany({ 'manuscriptSubject._id': { $in: mIds } }, { $set: resetManuscriptSubject });
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
ManuscriptSubjectService = ManuscriptSubjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ManuscriptSubject')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], ManuscriptSubjectService);
exports.ManuscriptSubjectService = ManuscriptSubjectService;
//# sourceMappingURL=manuscript-subject.service.js.map