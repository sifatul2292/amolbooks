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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(notificationModel, productModel, configService, utilsService) {
        this.notificationModel = notificationModel;
        this.productModel = productModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(NotificationService_1.name);
    }
    async addNotification(addNotificationDto) {
        const defaultData = {
            isReadNoti: false,
        };
        const mData = Object.assign(Object.assign({}, addNotificationDto), defaultData);
        const newData = new this.notificationModel(mData);
        try {
            const saveData = await newData.save();
            const data = {
                _id: saveData._id,
            };
            return {
                success: true,
                message: 'Address added successfully',
                data,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async insertManyNotification(addNotificationsDto, optionNotificationDto) {
        const { deleteMany } = optionNotificationDto;
        if (deleteMany) {
            await this.notificationModel.deleteMany({});
        }
        const mData = addNotificationsDto.map((m) => {
            return Object.assign(Object.assign({}, m), {
                slug: this.utilsService.transformToSlug(m.name),
            });
        });
        try {
            const saveData = await this.notificationModel.insertMany(mData);
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
    async getAllNotifications(filterNotificationDto, searchQuery) {
        const { filter } = filterNotificationDto;
        const { pagination } = filterNotificationDto;
        const { sort } = filterNotificationDto;
        const { select } = filterNotificationDto;
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
            const dataAggregates = await this.notificationModel.aggregate(aggregateStages);
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
    async getNotificationById(id, select) {
        try {
            const data = await this.notificationModel.findById(id).select(select);
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
    async updateNotificationById(id, updateNotificationDto) {
        const { name } = updateNotificationDto;
        let data;
        try {
            data = await this.notificationModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            const finalData = Object.assign({}, updateNotificationDto);
            if (name)
                if (name && data.name !== name) {
                    finalData.slug = this.utilsService.transformToSlug(name, true);
                }
            await this.notificationModel.findByIdAndUpdate(id, {
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
    async updateMultipleNotificationById(ids, updateNotificationDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateNotificationDto.slug) {
            delete updateNotificationDto.slug;
        }
        try {
            await this.notificationModel.updateMany({ _id: { $in: mIds } }, { $set: updateNotificationDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteNotificationById(id, checkUsage) {
        let data;
        try {
            data = await this.notificationModel.findById(id);
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
            await this.notificationModel.findByIdAndDelete(id);
            if (checkUsage) {
                const defaultNotification = await this.notificationModel.findOne({
                    readOnly: true,
                });
                const resetNotification = {
                    notification: {
                        _id: defaultNotification._id,
                        name: defaultNotification.name,
                        slug: defaultNotification.slug,
                    },
                };
                await this.productModel.updateMany({ 'notification._id': new ObjectId(id) }, { $set: resetNotification });
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
    async deleteMultipleNotificationById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            const allCategory = await this.notificationModel.find({
                _id: { $in: mIds },
            });
            const filteredIds = allCategory
                .filter((f) => f.readOnly !== true)
                .map((m) => m._id);
            await this.notificationModel.deleteMany({ _id: filteredIds });
            if (checkUsage) {
                const defaultNotification = await this.notificationModel.findOne({
                    readOnly: true,
                });
                const resetNotification = {
                    notification: {
                        _id: defaultNotification._id,
                        name: defaultNotification.name,
                        slug: defaultNotification.slug,
                    },
                };
                await this.productModel.updateMany({ 'notification._id': { $in: mIds } }, { $set: resetNotification });
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
NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Notification')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], NotificationService);
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map