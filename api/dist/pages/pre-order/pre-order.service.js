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
var PreOrderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreOrderService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const utils_service_1 = require("../../shared/utils/utils.service");
let PreOrderService = PreOrderService_1 = class PreOrderService {
    constructor(preOrderModel, utilsService) {
        this.preOrderModel = preOrderModel;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(PreOrderService_1.name);
    }
    async addPreOrder(addPreOrderDto) {
        try {
            const newPreOrder = new this.preOrderModel(addPreOrderDto);
            const saveData = await newPreOrder.save();
            return {
                success: true,
                message: 'Pre Order Added Successfully',
                data: saveData,
            };
        }
        catch (error) {
            this.logger.error(`Error adding pre-order: ${error.message}`, error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getAllPreOrders(filterPreOrderDto, searchQuery) {
        const { filter } = filterPreOrderDto;
        const { pagination } = filterPreOrderDto;
        const { sort } = filterPreOrderDto;
        const { select } = filterPreOrderDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = {
                $and: [
                    mFilter,
                    {
                        $or: [
                            { name: { $regex: searchQuery, $options: 'i' } },
                            { phoneNo: { $regex: searchQuery, $options: 'i' } },
                            { email: { $regex: searchQuery, $options: 'i' } },
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
        if (Object.keys(mFilter).length) {
            aggregateStages.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateStages.push({ $sort: mSort });
        }
        if (Object.keys(mSelect).length) {
            aggregateStages.push({ $project: mSelect });
        }
        if (pagination) {
            const pageSize = pagination.pageSize && Number(pagination.pageSize) > 0
                ? Number(pagination.pageSize)
                : 25;
            const currentPage = pagination.currentPage && Number(pagination.currentPage) > 0
                ? Number(pagination.currentPage)
                : 1;
            mPagination = {
                skip: pageSize * (currentPage - 1),
                limit: pageSize,
            };
            aggregateStages.push({ $skip: mPagination['skip'] });
            aggregateStages.push({ $limit: mPagination['limit'] });
        }
        aggregateStages.push({
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'product',
            },
        });
        aggregateStages.push({
            $unwind: {
                path: '$product',
                preserveNullAndEmptyArrays: true,
            },
        });
        aggregateStages.push({
            $project: {
                'product.name': 1,
                'product.nameEn': 1,
                'product.images': 1,
                'product.salePrice': 1,
                name: 1,
                _id: 1,
                phoneNo: 1,
                email: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        });
        try {
            const preOrders = await this.preOrderModel.aggregate(aggregateStages);
            const countFilter = mFilter;
            const totalCount = await this.preOrderModel.countDocuments(countFilter);
            return {
                success: true,
                message: 'Pre Orders Retrieved Successfully',
                data: preOrders,
                count: totalCount,
            };
        }
        catch (error) {
            this.logger.error(`Error getting pre-orders: ${error.message}`, error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getSinglePreOrderById(id, select) {
        try {
            let query = this.preOrderModel.findById(id);
            if (select) {
                query = query.select(select);
            }
            const data = await query
                .populate('product', 'name nameEn images salePrice')
                .populate('user', 'name email phoneNo');
            if (!data) {
                throw new common_1.NotFoundException('Pre Order not found');
            }
            return {
                success: true,
                message: 'Pre Order Retrieved Successfully',
                data,
            };
        }
        catch (error) {
            this.logger.error(`Error getting pre-order: ${error.message}`, error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async updatePreOrderStatus(id, updatePreOrderStatusDto) {
        try {
            const preOrder = await this.preOrderModel.findById(id);
            if (!preOrder) {
                throw new common_1.NotFoundException('Pre Order not found');
            }
            const updatedData = await this.preOrderModel.findByIdAndUpdate(id, { $set: updatePreOrderStatusDto }, { new: true });
            return {
                success: true,
                message: 'Pre Order Status Updated Successfully',
                data: updatedData,
            };
        }
        catch (error) {
            this.logger.error(`Error updating pre-order status: ${error.message}`, error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async deletePreOrderById(id) {
        try {
            const preOrder = await this.preOrderModel.findById(id);
            if (!preOrder) {
                throw new common_1.NotFoundException('Pre Order not found');
            }
            await this.preOrderModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Pre Order Deleted Successfully',
            };
        }
        catch (error) {
            this.logger.error(`Error deleting pre-order: ${error.message}`, error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
PreOrderService = PreOrderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('PreOrder')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        utils_service_1.UtilsService])
], PreOrderService);
exports.PreOrderService = PreOrderService;
//# sourceMappingURL=pre-order.service.js.map