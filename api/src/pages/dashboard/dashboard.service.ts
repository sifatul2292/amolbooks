import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { Order } from '../../interfaces/common/order.interface';
import { Admin } from '../../interfaces/admin/admin.interface';
import { User } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Product } from '../../interfaces/common/product.interface';
import { FilterAndPaginationOrderDto } from '../../dto/order.dto';
import { ErrorCodes } from '../../enum/error-code.enum';

const ObjectId = Types.ObjectId;

@Injectable()
export class DashboardService {
  private logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel('Admin')
    private readonly adminModel: Model<Admin>,
    @InjectModel('User')
    private readonly userModel: Model<User>,
    @InjectModel('Product')
    private readonly productModel: Model<Product>,
    @InjectModel('Order')
    private readonly orderModel: Model<Order>,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  async getAdminDashboard(
    filterOrderDto: FilterAndPaginationOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterOrderDto || {};
    try {
      const today = this.utilsService.getDateString(new Date());
      const nextDay = this.utilsService.getNextDateString(new Date(), 1);
      const last7Day = this.utilsService.getNextDateString(new Date(), -7);
      const currentMonth = this.utilsService.getDateMonth(false, new Date());
      const currentYear = this.utilsService.getDateYear(new Date());

      const monthlyTotalOrders = await this.orderModel.countDocuments({
        ...filter,
      });

      const monthlyPendingOrders = await this.orderModel.countDocuments({
        orderStatus: 1,
        ...filter,
      });
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
      const monthlyConfirmOrders = await this.orderModel.countDocuments({
        orderStatus: 2,
        month: currentMonth,
        ...filter,
      });
      const monthlyProcessingOrders = await this.orderModel.countDocuments({
        orderStatus: 3,
        month: currentMonth,
        ...filter,
      });
      const monthlyShippingOrders = await this.orderModel.countDocuments({
        orderStatus: 4,
        month: currentMonth,
        ...filter,
      });
      // Build filter for monthly delivered orders - ensure orderStatus is not overridden
      const monthlyDeliveredFilter: any = {
        month: currentMonth,
        year: currentYear,
        orderStatus: 5,
      };
      // Apply additional filters if provided, but don't override orderStatus
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (key !== 'orderStatus') {
            monthlyDeliveredFilter[key] = filter[key];
          }
        });
      }
      const monthlyDeliveredOrders = await this.orderModel.countDocuments(monthlyDeliveredFilter);
      const monthlyCancelOrders = await this.orderModel.countDocuments({
        orderStatus: 6,
        month: currentMonth,
        ...filter,
      });
      const monthlyRefundOrders = await this.orderModel.countDocuments({
        orderStatus: 7,
        month: currentMonth,
        ...filter,
      });
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

      // console.log('todayOrderAmount', todayOrderAmount);

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

      // console.log('monthlyOrderAmount', monthlyOrderAmount);
      // console.log('todayUnpaidOrderAmount', todayUnpaidOrderAmount);

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
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getOrderDashboard(): Promise<ResponsePayload> {
    try {
      const today = this.utilsService.getDateString(new Date());
      // Calculations
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

      const totalCashOneDeliveryOrderCount =
        await this.orderModel.countDocuments({
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
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getUserCountDashboard(): Promise<ResponsePayload> {
    try {
      const today = this.utilsService.getDateString(new Date());
      // Calculations
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
      } as ResponsePayload;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllOrdersForDashbord(
    filterOrderDto: FilterAndPaginationOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterOrderDto;
    const { pagination } = filterOrderDto;
    const { sort } = filterOrderDto;
    const { select } = filterOrderDto;

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};

    // Calculations
    const aggregateStagesCalculation = [];

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
      aggregateStagesCalculation.push({ $match: mFilter });
    }

    // Sort
    if (sort) {
      mSort = sort;
    } else {
      mSort = { createdAt: -1 };
    }

    // Select
    if (select) {
      mSelect = { ...select };
    } else {
      mSelect = { name: 1 };
    }

    // Finalize
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
      const calculateAggregates = await this.orderModel.aggregate(
        aggregateStagesCalculation,
      );

      return {
        // data: dataAggregates,
        success: true,
        message: 'Success',
        calculation: calculateAggregates[0],
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  // Method to get sales data by yearly, monthly, and weekly
  async getSalesData(period: string): Promise<any> {
    let startDate: Date;
    const endDate = new Date(); // Current date as the end date

    // Define the start date based on the period
    if (period === 'yearly') {
      startDate = new Date(endDate.getFullYear() - 2, 0, 1); // Start from 2 years ago
    } else if (period === 'monthly') {
      startDate = new Date(endDate.getFullYear(), 0, 1); // Start of the current year
    } else if (period === 'weekly') {
      // Calculate the start of the current week (Monday to Sunday)
      const currentDay = endDate.getDay();
      const daysToStartOfWeek = currentDay === 0 ? 6 : currentDay - 1; // If it's Sunday (0), go back 6 days
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - daysToStartOfWeek); // Move to Monday of the same week
      startDate.setHours(0, 0, 0, 0); // Set start of the day
    } else {
      throw new Error('Invalid period');
    }

    // Log the date range to ensure it's correct
    // console.log(`Fetching sales data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Aggregation query for fetching sales data based on the selected period
    const salesData = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          orderStatus: {
            $ne: 6, // Exclude orders with status 6 (canceled)
          },
        },
      },
      {
        $group: {
          _id:
            period === 'yearly'
              ? { $year: '$createdAt' }
              : period === 'monthly'
              ? { $month: '$createdAt' }
              : { $dayOfWeek: '$createdAt' }, // Group by day of the week
          totalSales: { $sum: '$grandTotal' },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by the grouped field (year, month, or day of the week)
      },
    ]);

    // console.log('Aggregated sales data:', salesData); // Log the sales data

    let labels: string[] = [];
    let sales: number[] = [];

    if (period === 'yearly') {
      // Handle yearly data
      labels = [
        String(endDate.getFullYear() - 2),
        String(endDate.getFullYear() - 1),
        String(endDate.getFullYear()),
      ];
      sales = labels.map((year) => {
        const salesForYear = salesData.find(
          (data: any) => String(data._id) === year,
        );
        return salesForYear ? salesForYear.totalSales : 0;
      });
    } else if (period === 'monthly') {
      // Handle monthly data
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
        const salesForMonth = salesData.find(
          (data: any) => data._id === index + 1,
        ); // Month index starts from 1
        return salesForMonth ? salesForMonth.totalSales : 0;
      });
    } else if (period === 'weekly') {
      // Handle weekly data
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

      // console.log('Weekly sales data:', salesData); // Log the weekly data

      // Map sales to days of the week
      sales = labels.map((_, index) => {
        const salesForDay = salesData.find(
          (data: any) => data._id === index + 1, // MongoDB's $dayOfWeek returns 1 (Sunday) to 7 (Saturday)
        );
        return salesForDay ? salesForDay.totalSales : 0;
      });

      // console.log('Mapped weekly sales:', sales); // Debug mapped weekly sales
    }

    return { labels, sales };
  }
}
