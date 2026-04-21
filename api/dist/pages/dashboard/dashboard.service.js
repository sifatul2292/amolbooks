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
var DashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../../shared/utils/utils.service");
const error_code_enum_1 = require("../../enum/error-code.enum");
const ObjectId = mongoose_2.Types.ObjectId;
let DashboardService = DashboardService_1 = class DashboardService {
    constructor(adminModel, userModel, productModel, orderModel, configService, utilsService) {
        this.adminModel = adminModel;
        this.userModel = userModel;
        this.productModel = productModel;
        this.orderModel = orderModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(DashboardService_1.name);
    }
    async getAdminDashboard(filterOrderDto, searchQuery) {
        const { filter } = filterOrderDto || {};
        try {
            const today = this.utilsService.getDateString(new Date());
            const nextDay = this.utilsService.getNextDateString(new Date(), 1);
            const last7Day = this.utilsService.getNextDateString(new Date(), -7);
            const currentMonth = this.utilsService.getDateMonth(false, new Date());
            const currentYear = this.utilsService.getDateYear(new Date());
            const monthlyTotalOrders = await this.orderModel.countDocuments(Object.assign({}, filter));
            const monthlyPendingOrders = await this.orderModel.countDocuments(Object.assign({ orderStatus: 1 }, filter));
            const weeklyOrderCount = await this.orderModel.countDocuments({
                checkoutDate: { $gte: last7Day },
            });
            const monthlyOrderCount = await this.orderModel.countDocuments({
                month: currentMonth,
                year: currentYear,
            });
            const totalPendingOrders = await this.orderModel.countDocuments({
                orderStatus: 1,
            });
            const totalShippingOrders = await this.orderModel.countDocuments({
                orderStatus: 4,
            });
            const todayTotalShippingOrders = await this.orderModel.countDocuments({
                orderStatus: 4,
                checkoutDate: today,
            });
            const monthlyConfirmOrders = await this.orderModel.countDocuments(Object.assign({ orderStatus: 2, month: currentMonth }, filter));
            const monthlyProcessingOrders = await this.orderModel.countDocuments(Object.assign({ orderStatus: 3, month: currentMonth }, filter));
            const monthlyShippingOrders = await this.orderModel.countDocuments(Object.assign({ orderStatus: 4, month: currentMonth }, filter));
            const monthlyDeliveredFilter = {
                month: currentMonth,
                year: currentYear,
                orderStatus: 5,
            };
            if (filter) {
                Object.keys(filter).forEach(key => {
                    if (key !== 'orderStatus') {
                        monthlyDeliveredFilter[key] = filter[key];
                    }
                });
            }
            const monthlyDeliveredOrders = await this.orderModel.countDocuments(monthlyDeliveredFilter);
            const monthlyCancelOrders = await this.orderModel.countDocuments(Object.assign({ orderStatus: 6, month: currentMonth }, filter));
            const monthlyRefundOrders = await this.orderModel.countDocuments(Object.assign({ orderStatus: 7, month: currentMonth }, filter));
            const countTodayAddedOrder = await this.orderModel.countDocuments({
                createdAt: { $gte: new Date(today), $lt: new Date(nextDay) },
            });
            const totalMaleCustomerCount = await this.userModel.countDocuments({
                gender: 'male',
            });
            const totalFemaleCustomerCount = await this.userModel.countDocuments({
                gender: 'female',
            });
            const totalUndefinedCustomerCount = await this.userModel.countDocuments({
                gender: 'others',
            });
            const totalOrders = await this.orderModel.countDocuments();
            const totalCustomerCount = await this.userModel.countDocuments({});
            const todayCustomerCount = await this.userModel.countDocuments({
                checkoutDate: today,
            });
            const totalProducts = await this.productModel.countDocuments({});
            const totalLowStockProducts = await this.productModel.countDocuments({
                quantity: { $lte: 10 },
            });
            const todayOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        checkoutDate: today,
                        orderStatus: {
                            $ne: 6,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const todayUnpaidOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        checkoutDate: today,
                        orderStatus: {
                            $ne: 6,
                        },
                        paymentStatus: 'unpaid',
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const todayDelvedOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        checkoutDate: today,
                        orderStatus: 5,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const todayPaidOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        checkoutDate: today,
                        orderStatus: {
                            $ne: 6,
                        },
                        paymentStatus: 'paid',
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const weeklyOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        checkoutDate: { $gte: last7Day },
                        orderStatus: {
                            $ne: 6,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const monthlyOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        month: currentMonth,
                        year: currentYear,
                        orderStatus: {
                            $ne: 6,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const monthlyPaidOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        month: currentMonth,
                        year: currentYear,
                        orderStatus: {
                            $ne: 6,
                        },
                        paymentStatus: 'paid',
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const monthlyUnpaidOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        month: currentMonth,
                        year: currentYear,
                        orderStatus: {
                            $ne: 6,
                        },
                        paymentStatus: 'unpaid',
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const monthlyDeliveredOrderAmount = await this.orderModel.aggregate([
                {
                    $match: {
                        month: currentMonth,
                        year: currentYear,
                        orderStatus: 5,
                        paymentStatus: 'paid',
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$grandTotal' },
                    },
                },
            ]);
            const data = {
                today,
                todayOrderAmount: todayOrderAmount.length
                    ? todayOrderAmount[0].total
                    : 0,
                todayUnpaidOrderAmount: todayUnpaidOrderAmount.length
                    ? todayUnpaidOrderAmount[0].total
                    : 0,
                todayPaidOrderAmount: todayPaidOrderAmount.length
                    ? todayPaidOrderAmount[0].total
                    : 0,
                weeklyOrderCount,
                weeklyOrderAmount: weeklyOrderAmount.length
                    ? weeklyOrderAmount[0].total
                    : 0,
                monthlyOrderCount,
                monthlyOrderAmount: monthlyOrderAmount.length
                    ? monthlyOrderAmount[0].total
                    : 0,
                monthlyPaidOrderAmount: monthlyPaidOrderAmount.length
                    ? monthlyPaidOrderAmount[0].total
                    : 0,
                monthlyUnpaidOrderAmount: monthlyUnpaidOrderAmount.length
                    ? monthlyUnpaidOrderAmount[0].total
                    : 0,
                monthlyDeliveredOrderAmount: monthlyDeliveredOrderAmount.length
                    ? monthlyDeliveredOrderAmount[0].total
                    : 0,
                todayDelvedOrderAmount: todayDelvedOrderAmount.length
                    ? todayDelvedOrderAmount[0].total
                    : 0,
                totalOrders,
                totalPendingOrders,
                totalShippingOrders,
                todayTotalShippingOrders,
                countTodayAddedOrder,
                totalProducts,
                totalLowStockProducts,
                totalMaleCustomerCount,
                totalFemaleCustomerCount,
                totalUndefinedCustomerCount,
                totalCustomerCount,
                monthlyTotalOrders,
                monthlyPendingOrders,
                monthlyConfirmOrders,
                monthlyProcessingOrders,
                monthlyShippingOrders,
                monthlyDeliveredOrders,
                monthlyCancelOrders,
                monthlyRefundOrders,
                todayCustomerCount,
            };
            return {
                success: true,
                message: 'Data Retrieve Success',
                data,
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getOrderDashboard() {
        try {
            const today = this.utilsService.getDateString(new Date());
            const todayOrderCount = await this.orderModel.countDocuments({
                checkoutDate: today,
            });
            const totalMaleCustomerCount = await this.userModel.countDocuments({
                gender: 'male',
            });
            const totalFemaleCustomerCount = await this.userModel.countDocuments({
                gender: 'female',
            });
            const totalUndefinedCustomerCount = await this.userModel.countDocuments({
                gender: 'others',
            });
            const totalPendingOrders = await this.orderModel.countDocuments({
                orderStatus: 1,
            });
            const totalApprovedOrders = await this.orderModel.countDocuments({
                orderStatus: 2,
            });
            const totalProcessingOrders = await this.orderModel.countDocuments({
                orderStatus: 3,
            });
            const totalShippingOrders = await this.orderModel.countDocuments({
                orderStatus: 4,
            });
            const totalDeliveredOrders = await this.orderModel.countDocuments({
                orderStatus: 5,
            });
            const totalCancelOrders = await this.orderModel.countDocuments({
                orderStatus: 6,
            });
            const totalRefundOrders = await this.orderModel.countDocuments({
                orderStatus: 7,
            });
            const todayUnpaidOrderCount = await this.orderModel.countDocuments({
                checkoutDate: today,
                paymentStatus: 'unpaid',
            });
            const todayPaidOrderCount = await this.orderModel.countDocuments({
                checkoutDate: today,
                paymentStatus: 'paid',
            });
            const totalCashOneDeliveryOrderCount = await this.orderModel.countDocuments({
                paymentType: 'cash_on_delivery',
            });
            const totalOnlineOrderCount = await this.orderModel.countDocuments({
                paymentType: 'online_payment',
            });
            const data = {
                todayOrderCount,
                totalPendingOrders,
                totalApprovedOrders,
                totalOnlineOrderCount,
                totalCashOneDeliveryOrderCount,
                totalProcessingOrders,
                totalShippingOrders,
                totalDeliveredOrders,
                totalCancelOrders,
                todayPaidOrderCount,
                todayUnpaidOrderCount,
                totalRefundOrders,
                totalFemaleCustomerCount,
                totalMaleCustomerCount,
                totalUndefinedCustomerCount,
            };
            return {
                success: true,
                message: 'Data Retrieve Success',
                data,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getUserCountDashboard() {
        try {
            const today = this.utilsService.getDateString(new Date());
            const todayCustomerCount = await this.userModel.countDocuments({
                registrationDate: today,
            });
            const totalCustomerCount = await this.userModel.countDocuments({});
            const data = {
                todayCustomerCount,
                totalCustomerCount,
            };
            return {
                success: true,
                message: 'Data Retrieve Success',
                data,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getAllOrdersForDashbord(filterOrderDto, searchQuery) {
        const { filter } = filterOrderDto;
        const { pagination } = filterOrderDto;
        const { sort } = filterOrderDto;
        const { select } = filterOrderDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        const aggregateStagesCalculation = [];
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
            aggregateStagesCalculation.push({ $match: mFilter });
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
        try {
            const group = {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: '$quantity' },
                    sumPurchasePrice: { $sum: '$purchasePrice' },
                    sumSalePrice: { $sum: '$salePrice' },
                    totalPurchasePrice: {
                        $sum: {
                            $multiply: ['$purchasePrice', '$quantity'],
                        },
                    },
                    totalSalePrice: {
                        $sum: {
                            $multiply: ['$salePrice', '$quantity'],
                        },
                    },
                },
            };
            aggregateStagesCalculation.push(group);
            const calculateAggregates = await this.orderModel.aggregate(aggregateStagesCalculation);
            return {
                success: true,
                message: 'Success',
                calculation: calculateAggregates[0],
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
    async getSalesData(period) {
        let startDate;
        const endDate = new Date();
        if (period === 'yearly') {
            startDate = new Date(endDate.getFullYear() - 2, 0, 1);
        }
        else if (period === 'monthly') {
            startDate = new Date(endDate.getFullYear(), 0, 1);
        }
        else if (period === 'weekly') {
            const currentDay = endDate.getDay();
            const daysToStartOfWeek = currentDay === 0 ? 6 : currentDay - 1;
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - daysToStartOfWeek);
            startDate.setHours(0, 0, 0, 0);
        }
        else {
            throw new Error('Invalid period');
        }
        const salesData = await this.orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    orderStatus: {
                        $ne: 6,
                    },
                },
            },
            {
                $group: {
                    _id: period === 'yearly'
                        ? { $year: '$createdAt' }
                        : period === 'monthly'
                            ? { $month: '$createdAt' }
                            : { $dayOfWeek: '$createdAt' },
                    totalSales: { $sum: '$grandTotal' },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);
        let labels = [];
        let sales = [];
        if (period === 'yearly') {
            labels = [
                String(endDate.getFullYear() - 2),
                String(endDate.getFullYear() - 1),
                String(endDate.getFullYear()),
            ];
            sales = labels.map((year) => {
                const salesForYear = salesData.find((data) => String(data._id) === year);
                return salesForYear ? salesForYear.totalSales : 0;
            });
        }
        else if (period === 'monthly') {
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
            ];
            labels = months;
            sales = labels.map((_, index) => {
                const salesForMonth = salesData.find((data) => data._id === index + 1);
                return salesForMonth ? salesForMonth.totalSales : 0;
            });
        }
        else if (period === 'weekly') {
            const days = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
            ];
            labels = days;
            sales = labels.map((_, index) => {
                const salesForDay = salesData.find((data) => data._id === index + 1);
                return salesForDay ? salesForDay.totalSales : 0;
            });
        }
        return { labels, sales };
    }
};
DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Admin')),
    __param(1, (0, mongoose_1.InjectModel)('User')),
    __param(2, (0, mongoose_1.InjectModel)('Product')),
    __param(3, (0, mongoose_1.InjectModel)('Order')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], DashboardService);
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboard.service.js.map