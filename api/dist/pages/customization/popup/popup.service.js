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
var PopupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let PopupService = PopupService_1 = class PopupService {
    constructor(popupModel, productModel, configService, utilsService) {
        this.popupModel = popupModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(PopupService_1.name);
    }
    async addPopup(addPopupDto) {
        const { name } = addPopupDto;
        const defaultData = {
            slug: this.utilsService.transformToSlug(name),
        };
        const mData = Object.assign(Object.assign({}, addPopupDto), defaultData);
        const newData = new this.popupModel(mData);
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
    async insertManyPopup(addPopupsDto, optionPopupDto) {
        const { deleteMany } = optionPopupDto;
        if (deleteMany) {
            await this.popupModel.deleteMany({});
        }
        const mData = addPopupsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.popupModel.insertMany(mData);
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
    async getAllPopups(filterPopupDto, searchQuery) {
        const { filter } = filterPopupDto;
        const { pagination } = filterPopupDto;
        const { sort } = filterPopupDto;
        const { select } = filterPopupDto;
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
            const dataAggregates = await this.popupModel.aggregate(aggregateStages);
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
    async getPopupById(id, select) {
        try {
            const data = await this.popupModel.findById(id).select(select);
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
    async updatePopupById(id, updatePopupDto) {
        const { name } = updatePopupDto;
        let data;
        try {
            data = await this.popupModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updatePopupDto);
            if (name)
                if (name && data.name !== name) {
                    finalData.slug = this.utilsService.transformToSlug(name, true);
                }
            await this.popupModel.findByIdAndUpdate(id, {
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
    async updateMultiplePopupById(ids, updatePopupDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updatePopupDto.slug) {
            delete updatePopupDto.slug;
        }
        try {
            await this.popupModel.updateMany({ _id: { $in: mIds } }, { $set: updatePopupDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deletePopupById(id, checkUsage) {
        let data;
        try {
            data = await this.popupModel.findById(id);
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
            await this.popupModel.findByIdAndDelete(id);
            if (checkUsage) {
                const defaultPopup = await this.popupModel.findOne({
                    readOnly: true,
                });
                const resetPopup = {
                    popup: {
                        _id: defaultPopup._id,
                        name: defaultPopup.name,
                        slug: defaultPopup.slug,
                    },
                };
                await this.productModel.updateMany({ 'popup._id': new ObjectId(id) }, { $set: resetPopup });
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
    async deleteMultiplePopupById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.popupModel.find({
                _id: { $in: mIds },
            });
            const filteredIds = allCategory
                .filter((f) => f.readOnly !== true)
                .map((m) => m._id);
            await this.popupModel.deleteMany({ _id: filteredIds });
            if (checkUsage) {
                const defaultPopup = await this.popupModel.findOne({
                    readOnly: true,
                });
                const resetPopup = {
                    popup: {
                        _id: defaultPopup._id,
                        name: defaultPopup.name,
                        slug: defaultPopup.slug,
                    },
                };
                await this.productModel.updateMany({ 'popup._id': { $in: mIds } }, { $set: resetPopup });
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
PopupService = PopupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Popup')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], PopupService);
exports.PopupService = PopupService;
//# sourceMappingURL=popup.service.js.map