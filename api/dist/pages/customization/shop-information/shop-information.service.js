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
var ShopInformationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopInformationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../../shared/utils/utils.service");
const error_code_enum_1 = require("../../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let ShopInformationService = ShopInformationService_1 = class ShopInformationService {
    constructor(shopInformationModel, productModel, configService, utilsService) {
        this.shopInformationModel = shopInformationModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(ShopInformationService_1.name);
    }
    async addShopInformation(addShopInformationDto) {
        const newData = new this.shopInformationModel(addShopInformationDto);
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
    async insertManyShopInformation(addShopInformationsDto, optionShopInformationDto) {
        const { deleteMany } = optionShopInformationDto;
        if (deleteMany) {
            await this.shopInformationModel.deleteMany({});
        }
        const mData = addShopInformationsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.shopInformationModel.insertMany(mData);
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
    async getShopInformation(select) {
        try {
            const data = await this.shopInformationModel.findOne({}).select(select);
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
    async getAllShopInformationsBasic() {
        try {
            const pageSize = 10;
            const currentPage = 3;
            const data = await this.shopInformationModel
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
    async getAllShopInformations(filterShopInformationDto, searchQuery) {
        const { filter } = filterShopInformationDto;
        const { pagination } = filterShopInformationDto;
        const { sort } = filterShopInformationDto;
        const { select } = filterShopInformationDto;
        const aggregateSshopInformationes = [];
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
            aggregateSshopInformationes.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateSshopInformationes.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateSshopInformationes.push({ $project: mSelect });
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
            aggregateSshopInformationes.push(mPagination);
            aggregateSshopInformationes.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.shopInformationModel.aggregate(aggregateSshopInformationes);
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
    async getShopInformationById(id, select) {
        try {
            const data = await this.shopInformationModel.findById(id).select(select);
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
    async updateShopInformationById(id, updateShopInformationDto) {
        const { name } = updateShopInformationDto;
        let data;
        try {
            data = await this.shopInformationModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateShopInformationDto);
            if (name)
                if (name && data.name !== name) {
                    finalData.slug = this.utilsService.transformToSlug(name, true);
                }
            await this.shopInformationModel.findByIdAndUpdate(id, {
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
    async updateMultipleShopInformationById(ids, updateShopInformationDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateShopInformationDto.slug) {
            delete updateShopInformationDto.slug;
        }
        try {
            await this.shopInformationModel.updateMany({ _id: { $in: mIds } }, { $set: updateShopInformationDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteShopInformationById(id, checkUsage) {
        let data;
        try {
            data = await this.shopInformationModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.shopInformationModel.findByIdAndDelete(id);
            if (checkUsage) {
                await this.productModel.updateMany({}, {
                    $pull: { shopInformations: new ObjectId(id) },
                });
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
    async deleteMultipleShopInformationById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.shopInformationModel.deleteMany({ _id: ids });
            if (checkUsage) {
                await this.productModel.updateMany({}, { $pull: { shopInformations: { $in: mIds } } });
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
ShopInformationService = ShopInformationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ShopInformation')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], ShopInformationService);
exports.ShopInformationService = ShopInformationService;
//# sourceMappingURL=shop-information.service.js.map