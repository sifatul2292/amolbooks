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
var StoreInfoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreInfoService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let StoreInfoService = StoreInfoService_1 = class StoreInfoService {
    constructor(storeInfoModel, configService, utilsService) {
        this.storeInfoModel = storeInfoModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(StoreInfoService_1.name);
    }
    async addStoreInfo(addStoreInfoDto) {
        const mData = Object.assign({}, addStoreInfoDto);
        const newData = new this.storeInfoModel(mData);
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
    async insertManyStoreInfo(addStoreInfosDto, optionStoreInfoDto) {
        const { deleteMany } = optionStoreInfoDto;
        if (deleteMany) {
            await this.storeInfoModel.deleteMany({});
        }
        const mData = addStoreInfosDto.map((m) => {
            return Object.assign({}, m);
        });
        try {
            const saveData = await this.storeInfoModel.insertMany(mData);
            return {
                success: true,
                message: `${saveData && saveData.length ? saveData.length : 0}  Data Added Success`,
            };
        }
        catch (error) {
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException();
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async getAllStoreInfosBasic() {
        try {
            const pageSize = 10;
            const currentPage = 1;
            const data = await this.storeInfoModel
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
    async getAllStoreInfos(filterStoreInfoDto, searchQuery) {
        const { filter } = filterStoreInfoDto;
        const { pagination } = filterStoreInfoDto;
        const { sort } = filterStoreInfoDto;
        const { select } = filterStoreInfoDto;
        const aggregateSstoreInfoes = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = Object.assign(Object.assign({}, mFilter), { title: new RegExp(searchQuery, 'i') });
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
            mSelect = { title: 1 };
        }
        if (Object.keys(mFilter).length) {
            aggregateSstoreInfoes.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSstoreInfoes.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSstoreInfoes.push({ $project: mSelect });
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
            aggregateSstoreInfoes.push(mPagination);
            aggregateSstoreInfoes.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.storeInfoModel.aggregate(aggregateSstoreInfoes);
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
    async getStoreInfoById(id, select) {
        try {
            const data = await this.storeInfoModel.findById(id).select(select);
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
    async updateStoreInfoById(id, updateStoreInfoDto) {
        const { title } = updateStoreInfoDto;
        let data;
        try {
            data = await this.storeInfoModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateStoreInfoDto);
            await this.storeInfoModel.findByIdAndUpdate(id, {
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
    async updateMultipleStoreInfoById(ids, updateStoreInfoDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        try {
            await this.storeInfoModel.updateMany({ _id: { $in: mIds } }, { $set: updateStoreInfoDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteStoreInfoById(id) {
        let data;
        try {
            data = await this.storeInfoModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.storeInfoModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleStoreInfoById(ids) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.storeInfoModel.deleteMany({ _id: ids });
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
StoreInfoService = StoreInfoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('StoreInfo')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], StoreInfoService);
exports.StoreInfoService = StoreInfoService;
//# sourceMappingURL=store-info.service.js.map