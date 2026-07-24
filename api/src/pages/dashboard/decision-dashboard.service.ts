import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import * as moment from 'moment-timezone';
import { createHash } from 'crypto';
import { OrderStatus } from '../../enum/order.enum';

const DASHBOARD_TIME_ZONE = 'Asia/Dhaka';
const LOSS_STATUSES = [
  OrderStatus.CANCEL,
  OrderStatus.REFUND,
  OrderStatus.RETURN,
];
const ACTIVE_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRM,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPING,
  OrderStatus.Courier,
  OrderStatus.HOLD,
];

type MoneyBasis = 'actual' | 'estimated' | 'allocated' | 'unavailable';

interface CostResult {
  amount: number;
  snapshotItems: number;
  fallbackItems: number;
  missingItems: number;
  totalItems: number;
}

@Injectable()
export class DecisionDashboardService {
  private readonly logger = new Logger(DecisionDashboardService.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Product') private readonly productModel: Model<any>,
    @InjectModel('ManualSale') private readonly manualSaleModel: Model<any>,
    @InjectModel('MetaAdSpend') private readonly metaSpendModel: Model<any>,
    @InjectModel('AnalyticsAction') private readonly analyticsActionModel: Model<any>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getDecisionAnalytics(startDate: string, endDate: string): Promise<any> {
    const selected = this.parseRange(startDate, endDate);
    const previous = this.previousRange(selected.startMoment, selected.endMoment);

    const [orders, previousOrders, manualSales, previousManualSales, spendRows, previousSpendRows] =
      await Promise.all([
        this.getOrders(selected.start, selected.end),
        this.getOrders(previous.start, previous.end),
        this.getManualSales(startDate, endDate),
        this.getManualSales(previous.startDate, previous.endDate),
        this.getSpendRows(startDate, endDate),
        this.getSpendRows(previous.startDate, previous.endDate),
      ]);

    const productIds = Array.from(
      new Set(
        orders
          .concat(previousOrders)
          .flatMap((order) => order.orderedItems || [])
          .map((item) => String(item?._id || ''))
          .filter(Boolean),
      ),
    );
    const products = productIds.length
      ? await this.productModel
          .find({ _id: { $in: productIds } })
          .select('_id name stock quantity totalSold')
          .lean()
      : [];
    const productMap = new Map(products.map((product: any) => [String(product._id), product]));

    const phones = Array.from(new Set(orders.map((order) => order.phoneNo).filter(Boolean)));
    const customerHistory = await this.getCustomerHistory(phones, selected.end);
    const posthog = await this.getPosthogAnalytics(selected.start, selected.end);

    const current = this.buildPeriod(
      orders,
      manualSales,
      spendRows,
      productMap,
      selected.days,
      posthog,
      customerHistory,
    );
    const prior = this.buildPeriod(
      previousOrders,
      previousManualSales,
      previousSpendRows,
      productMap,
      selected.days,
      { available: false, reason: 'Comparison funnel is not queried.', funnel: {}, products: {} },
      new Map(),
    );
    await this.attachExperimentState(current.opportunities, current.summary);

    return {
      success: true,
      version: 2,
      generatedAt: new Date().toISOString(),
      timeZone: DASHBOARD_TIME_ZONE,
      range: {
        startDate,
        endDate,
        days: selected.days,
        comparisonStartDate: previous.startDate,
        comparisonEndDate: previous.endDate,
      },
      data: {
        summary: current.summary,
        comparison: this.buildComparison(current.summary, prior.summary),
        trend: current.trend,
        productPerformance: current.productPerformance,
        orderQuality: current.orderQuality,
        funnel: current.funnel,
        opportunities: current.opportunities,
        dataQuality: current.dataQuality,
      },
    };
  }

  async saveOrderCosts(orderId: string, body: any): Promise<any> {
    const allowedFields = [
      'actualCourierCost',
      'packagingCost',
      'paymentFee',
      'refundAmount',
      'returnLoss',
    ];
    const update: Record<string, number> = {};
    allowedFields.forEach((field) => {
      if (body[field] === '' || body[field] === null || body[field] === undefined) return;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException(`${field} must be a non-negative number`);
      }
      update[field] = value;
    });
    if (!Object.keys(update).length) {
      throw new BadRequestException('Enter at least one order cost');
    }

    const lookup: any = this.validObjectId(orderId)
      ? { $or: [{ orderId }, { _id: orderId }] }
      : { orderId };
    const order = await this.orderModel.findOneAndUpdate(
      lookup,
      { $set: update },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found');
    return { success: true, data: { orderId: order.orderId, ...update } };
  }

  async markRecommendationActedOn(body: any): Promise<any> {
    const opportunity = body?.opportunity || {};
    const title = String(opportunity.title || '').trim().slice(0, 180);
    const type = String(opportunity.type || '').trim().slice(0, 40);
    const action = String(opportunity.action || '').trim().slice(0, 80);
    this.parseRange(body?.rangeStart, body?.rangeEnd);
    if (!title || !type || !action) {
      throw new BadRequestException('Opportunity title, type, and action are required');
    }
    const opportunityKey = this.opportunityKey(opportunity);
    const baseline = this.sanitizeSummarySnapshot(body?.baseline);
    const saved = await this.analyticsActionModel.create({
      opportunityKey,
      type,
      title,
      action,
      targetId: String(opportunity.productId || opportunity.campaignId || '').slice(0, 120),
      rangeStart: String(body.rangeStart),
      rangeEnd: String(body.rangeEnd),
      baseline,
      note: String(body?.note || '').trim().slice(0, 500),
      actedOnAt: new Date(),
    });
    return {
      success: true,
      data: {
        opportunityKey,
        actedOnAt: saved.actedOnAt,
        baseline,
      },
    };
  }

  private parseRange(startDate: string, endDate: string): any {
    const startMoment = moment.tz(startDate, 'YYYY-MM-DD', true, DASHBOARD_TIME_ZONE);
    const endMoment = moment.tz(endDate, 'YYYY-MM-DD', true, DASHBOARD_TIME_ZONE);
    if (!startMoment.isValid() || !endMoment.isValid()) {
      throw new BadRequestException('startDate and endDate must use YYYY-MM-DD');
    }
    if (endMoment.isBefore(startMoment, 'day')) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    const days = endMoment.diff(startMoment, 'days') + 1;
    if (days > 366) throw new BadRequestException('Date range cannot exceed 366 days');
    return {
      startMoment,
      endMoment,
      start: startMoment.clone().startOf('day').toDate(),
      end: endMoment.clone().endOf('day').toDate(),
      days,
    };
  }

  private previousRange(start: moment.Moment, end: moment.Moment): any {
    const days = end.diff(start, 'days') + 1;
    const previousEnd = start.clone().subtract(1, 'day').endOf('day');
    const previousStart = previousEnd.clone().subtract(days - 1, 'days').startOf('day');
    return {
      start: previousStart.toDate(),
      end: previousEnd.toDate(),
      startDate: previousStart.format('YYYY-MM-DD'),
      endDate: previousEnd.format('YYYY-MM-DD'),
    };
  }

  private async getOrders(start: Date, end: Date): Promise<any[]> {
    return this.orderModel
      .find({ createdAt: { $gte: start, $lte: end } })
      .select(
        'orderId phoneNo city createdAt grandTotal deliveryCharge actualCourierCost packagingCost paymentFee refundAmount returnLoss orderStatus paymentType paymentStatus orderFrom attribution division area zone orderedItems',
      )
      .lean();
  }

  private async getManualSales(startDate: string, endDate: string): Promise<any[]> {
    return await this.manualSaleModel
      .find({ date: { $gte: startDate, $lte: endDate } })
      .lean();
  }

  private async getSpendRows(startDate: string, endDate: string): Promise<any[]> {
    return await this.metaSpendModel
      .find({ date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .lean();
  }

  private async getCustomerHistory(phones: string[], end: Date): Promise<Map<string, any>> {
    if (!phones.length) return new Map();
    const rows = await this.orderModel.aggregate([
      {
        $match: {
          phoneNo: { $in: phones },
          createdAt: { $lte: end },
          orderStatus: { $nin: LOSS_STATUSES },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$phoneNo',
          firstOrderAt: { $min: '$createdAt' },
          totalOrders: { $sum: 1 },
          customerRevenue: { $sum: '$grandTotal' },
          orderDates: { $push: '$createdAt' },
        },
      },
    ]);
    return new Map(rows.map((row) => [String(row._id), row]));
  }

  private buildPeriod(
    orders: any[],
    manualSales: any[],
    spendRows: any[],
    productMap: Map<string, any>,
    days: number,
    posthog: any,
    customerHistory: Map<string, any>,
  ): any {
    const spend = spendRows.reduce((sum, row) => sum + this.number(row.spend), 0);
    const validOrders = orders.filter((order) => !LOSS_STATUSES.includes(Number(order.orderStatus)));
    const deliveredOrders = orders.filter((order) => Number(order.orderStatus) === OrderStatus.DELIVERED);
    const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(Number(order.orderStatus)));
    const validManual = manualSales.filter((sale) => !['cancelled', 'refunded', 'returned'].includes(sale.outcome));
    const deliveredManual = manualSales.filter((sale) => sale.outcome === 'delivered');

    const quality = {
      snapshotItems: 0,
      fallbackItems: 0,
      missingItems: 0,
      totalItems: 0,
      actualCourierOrders: 0,
      completeOperationalOrders: 0,
      attributionOrders: 0,
      manualMissingCosts: 0,
      manualSales: manualSales.length,
    };

    manualSales.forEach((sale) => {
      if (!this.hasNumber(sale.cost)) quality.manualMissingCosts++;
    });

    const orderContribution = new Map<string, any>();
    orders.forEach((order) => {
      const cogs = this.orderCogs(order);
      quality.snapshotItems += cogs.snapshotItems;
      quality.fallbackItems += cogs.fallbackItems;
      quality.missingItems += cogs.missingItems;
      quality.totalItems += cogs.totalItems;
      if (this.hasNumber(order.actualCourierCost)) quality.actualCourierOrders++;
      if (
        this.hasNumber(order.actualCourierCost) &&
        this.hasNumber(order.packagingCost) &&
        this.hasNumber(order.paymentFee)
      ) {
        quality.completeOperationalOrders++;
      }
      if (order.attribution?.lastTouch?.source || order.attribution?.firstTouch?.source) {
        quality.attributionOrders++;
      }
      const courier = this.hasNumber(order.actualCourierCost)
        ? this.number(order.actualCourierCost)
        : this.number(order.deliveryCharge);
      const amount =
        this.number(order.grandTotal) -
        cogs.amount -
        courier -
        this.number(order.packagingCost) -
        this.number(order.paymentFee) -
        this.number(order.refundAmount) -
        this.number(order.returnLoss);
      orderContribution.set(String(order._id), {
        amount,
        cogs,
        basis:
          cogs.fallbackItems || cogs.missingItems || !this.hasNumber(order.actualCourierCost) ||
          !this.hasNumber(order.packagingCost) || !this.hasNumber(order.paymentFee)
            ? 'estimated'
            : 'actual',
      });
    });

    const manualContribution = (sale: any) =>
      this.number(sale.revenue) -
      this.number(sale.cost) -
      (this.hasNumber(sale.actualCourierCost)
        ? this.number(sale.actualCourierCost)
        : this.number(sale.deliveryCharge)) -
      this.number(sale.packagingCost) -
      this.number(sale.paymentFee) -
      this.number(sale.refundAmount) -
      this.number(sale.returnLoss);

    const expectedRevenue =
      validOrders.reduce((sum, order) => sum + this.number(order.grandTotal), 0) +
      validManual.reduce((sum, sale) => sum + this.number(sale.revenue), 0);
    const expectedBeforeAds =
      validOrders.reduce((sum, order) => sum + orderContribution.get(String(order._id)).amount, 0) +
      validManual.reduce((sum, sale) => sum + manualContribution(sale), 0);
    const realizedRevenue =
      deliveredOrders.reduce((sum, order) => sum + this.number(order.grandTotal), 0) +
      deliveredManual.reduce((sum, sale) => sum + this.number(sale.revenue), 0);
    const realizedBeforeAds =
      deliveredOrders.reduce((sum, order) => sum + orderContribution.get(String(order._id)).amount, 0) +
      deliveredManual.reduce((sum, sale) => sum + manualContribution(sale), 0);
    const realizedAdAllocation = expectedRevenue > 0 ? spend * (realizedRevenue / expectedRevenue) : 0;
    const expectedContribution = expectedBeforeAds - spend;
    const realizedContribution = realizedBeforeAds - realizedAdAllocation;
    const validOrderCount =
      validOrders.length + validManual.reduce((sum, sale) => sum + this.number(sale.orders, 1), 0);
    const deliveredOrderCount =
      deliveredOrders.length + deliveredManual.reduce((sum, sale) => sum + this.number(sale.orders, 1), 0);
    const costCompleteness = orders.length
      ? quality.completeOperationalOrders / orders.length
      : 0;
    const hasSpendCoverage = new Set(spendRows.map((row) => row.date)).size >= days;
    const profitUnavailable = quality.missingItems > 0 || quality.manualMissingCosts > 0 || !hasSpendCoverage;
    const profitBasis: MoneyBasis =
      quality.fallbackItems || quality.missingItems || costCompleteness < 1 || !hasSpendCoverage
        ? 'estimated'
        : 'actual';

    const summary = {
      expectedContribution: this.money(
        profitUnavailable ? null : expectedContribution,
        profitUnavailable ? 'unavailable' : profitBasis,
        this.profitMissingFields(quality, orders.length, hasSpendCoverage),
      ),
      realizedContribution: this.money(
        profitUnavailable ? null : realizedContribution,
        profitUnavailable ? 'unavailable' : realizedAdAllocation > 0 ? 'allocated' : profitBasis,
        this.profitMissingFields(quality, orders.length, hasSpendCoverage),
      ),
      netRevenue: this.money(expectedRevenue, 'actual'),
      deliveredOrders: { value: deliveredOrderCount, basis: 'actual' },
      placedOrders: { value: validOrderCount, basis: 'actual' },
      activeOrders: { value: activeOrders.length, basis: 'actual' },
      averageOrderValue: this.money(
        validOrderCount ? expectedRevenue / validOrderCount : 0,
        'actual',
      ),
      contributionMargin: {
        value: profitUnavailable
          ? null
          : expectedRevenue ? (expectedContribution / expectedRevenue) * 100 : 0,
        unit: 'percent',
        basis: profitUnavailable ? 'unavailable' : profitBasis,
      },
      adSpend: hasSpendCoverage
        ? this.money(spend, 'actual')
        : this.money(null, 'unavailable', ['Meta spend is not connected or logged for this range.']),
      costPerDeliveredOrder: hasSpendCoverage && deliveredOrderCount
        ? this.money(spend / deliveredOrderCount, 'allocated')
        : this.money(null, 'unavailable', ['Spend or delivered-order data is unavailable.']),
    };

    const productPerformance = this.buildProductPerformance(
      orders,
      productMap,
      posthog.products || {},
      days,
    );
    const orderQuality = this.buildOrderQuality(
      orders,
      manualSales,
      orderContribution,
      spendRows,
      customerHistory,
    );
    orderQuality.customerCohorts = this.buildCustomerCohorts(
      orders,
      orderContribution,
      customerHistory,
    );
    const funnel = this.buildFunnel(posthog, validOrderCount, deliveredOrderCount);
    const opportunities = this.buildOpportunities(
      productPerformance.rows,
      orderQuality,
      spendRows,
      orders,
      expectedBeforeAds,
      validOrderCount,
    );
    const trend = this.buildTrend(orders, manualSales, spendRows, orderContribution);
    const dataQuality = this.buildDataQuality(
      quality,
      orders.length,
      spendRows,
      posthog,
      days,
    );

    return {
      summary,
      productPerformance,
      orderQuality,
      funnel,
      opportunities,
      trend,
      dataQuality,
    };
  }

  private orderCogs(order: any): CostResult {
    return (order.orderedItems || []).reduce(
      (result: CostResult, item: any) => {
        const quantity = Math.max(1, this.number(item.quantity, 1));
        const snapshot = this.optionalNumber(item.costPriceAtOrder);
        result.totalItems++;
        if (snapshot !== undefined) {
          result.amount += snapshot * quantity;
          result.snapshotItems++;
        } else {
          result.missingItems++;
        }
        return result;
      },
      { amount: 0, snapshotItems: 0, fallbackItems: 0, missingItems: 0, totalItems: 0 },
    );
  }

  private buildProductPerformance(
    orders: any[],
    productMap: Map<string, any>,
    posthogProducts: Record<string, any>,
    days: number,
  ): any {
    const rows = new Map<string, any>();
    const validOrders = orders.filter((order) => !LOSS_STATUSES.includes(Number(order.orderStatus)));
    const qualifyingOrderCount = Math.max(validOrders.length, 1);
    orders.forEach((order) => {
      const isLoss = LOSS_STATUSES.includes(Number(order.orderStatus));
      (order.orderedItems || []).forEach((item: any) => {
        const id = String(item._id || item.slug || item.name || 'unknown');
        if (!rows.has(id)) {
          const product = productMap.get(String(item._id));
          rows.set(id, {
            productId: String(item._id || ''),
            name: item.name || product?.name || 'Unknown product',
            units: 0,
            orderIds: new Set<string>(),
            lossOrderIds: new Set<string>(),
            netSales: 0,
            cogs: 0,
            missingCost: false,
            stock: this.optionalNumber(product?.stock),
          });
        }
        const row = rows.get(id);
        const quantity = Math.max(1, this.number(item.quantity, 1));
        const itemRevenue = this.number(item.salePrice ?? item.unitPrice) * quantity;
        const unitCost = this.optionalNumber(item.costPriceAtOrder);
        row.orderIds.add(String(order._id));
        if (isLoss) row.lossOrderIds.add(String(order._id));
        if (!isLoss) {
          row.units += quantity;
          row.netSales += itemRevenue;
          if (unitCost === undefined) row.missingCost = true;
          else row.cogs += unitCost * quantity;
        }
      });
    });

    const result = Array.from(rows.values()).map((row) => {
      const analytics = posthogProducts[row.productId] || {};
      const contribution = row.netSales - row.cogs;
      const margin = row.netSales ? (contribution / row.netSales) * 100 : 0;
      const dailyUnits = row.units / Math.max(days, 1);
      const stockCoverageDays = row.stock === undefined || dailyUnits <= 0
        ? null
        : row.stock / dailyUnits;
      const conversion = analytics.views
        ? (row.orderIds.size / analytics.views) * 100
        : null;
      const cancellationRate = row.orderIds.size
        ? (row.lossOrderIds.size / row.orderIds.size) * 100
        : 0;
      let recommendation = 'Monitor';
      if (row.stock !== undefined && (row.stock <= 0 || (stockCoverageDays !== null && stockCoverageDays < 14))) {
        recommendation = 'Restock';
      } else if (conversion !== null && analytics.views >= 20 && conversion < 1) {
        recommendation = 'Improve Page';
      } else if (cancellationRate >= 20) {
        recommendation = 'Reduce Promotion';
      } else if (!row.missingCost && margin >= 30 && row.orderIds.size >= Math.max(2, qualifyingOrderCount * 0.03)) {
        recommendation = 'Scale';
      } else if (!row.missingCost && row.units >= 3 && margin < 25) {
        recommendation = 'Bundle';
      }
      return {
        productId: row.productId,
        name: row.name,
        units: row.units,
        orders: row.orderIds.size,
        netSales: this.money(row.netSales, 'actual'),
        contribution: row.missingCost
          ? this.money(null, 'unavailable', ['One or more product costs are unavailable.'])
          : this.money(contribution, 'actual'),
        margin: { value: row.missingCost ? null : margin, unit: 'percent', basis: row.missingCost ? 'unavailable' : 'actual' },
        views: analytics.views ?? null,
        addToCarts: analytics.carts ?? null,
        conversion: conversion === null
          ? { value: null, unit: 'percent', basis: 'unavailable' }
          : { value: conversion, unit: 'percent', basis: 'actual' },
        cancellationRate,
        stock: row.stock ?? null,
        stockCoverageDays,
        recommendation,
      };
    });
    result.sort((a, b) => (b.contribution.amount || 0) - (a.contribution.amount || 0));
    return {
      note: 'Product contribution excludes order-level fulfillment costs and allocated ad spend.',
      rows: result.slice(0, 50),
      bundles: this.buildProductPairs(validOrders),
    };
  }

  private buildProductPairs(orders: any[]): any[] {
    const pairs = new Map<string, any>();
    orders.forEach((order) => {
      const items = Array.from(
        new Map(
          (order.orderedItems || []).map((item: any) => [
            String(item._id || item.name),
            { id: String(item._id || ''), name: item.name || 'Unknown product' },
          ]),
        ).values(),
      ) as any[];
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const sorted = [items[i], items[j]].sort((a, b) => a.id.localeCompare(b.id));
          const key = `${sorted[0].id}|${sorted[1].id}`;
          if (!pairs.has(key)) pairs.set(key, { products: sorted, orders: 0 });
          pairs.get(key).orders++;
        }
      }
    });
    return Array.from(pairs.values())
      .filter((pair) => pair.orders >= 2)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);
  }

  private buildOrderQuality(
    orders: any[],
    manualSales: any[],
    orderContribution: Map<string, any>,
    spendRows: any[],
    customerHistory: Map<string, any>,
  ): any {
    const statusCounts: Record<string, number> = {
      placed: orders.length,
      active: 0,
      confirmed: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
      returned: 0,
    };
    orders.forEach((order) => {
      const status = Number(order.orderStatus);
      if (ACTIVE_STATUSES.includes(status)) statusCounts.active++;
      if ([OrderStatus.CONFIRM, OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.Courier].includes(status)) statusCounts.confirmed++;
      if (status === OrderStatus.DELIVERED) statusCounts.delivered++;
      if (status === OrderStatus.CANCEL) statusCounts.cancelled++;
      if (status === OrderStatus.REFUND) statusCounts.refunded++;
      if (status === OrderStatus.RETURN) statusCounts.returned++;
    });
    manualSales.forEach((sale) => {
      const count = this.number(sale.orders, 1);
      statusCounts.placed += count;
      if (sale.outcome === 'delivered') statusCounts.delivered += count;
      else if (sale.outcome === 'cancelled') statusCounts.cancelled += count;
      else if (sale.outcome === 'refunded') statusCounts.refunded += count;
      else if (sale.outcome === 'returned') statusCounts.returned += count;
      else statusCounts.active += count;
    });

    const segment = (
      keyFn: (order: any) => string,
      manualKeyFn?: (sale: any) => string,
    ) => {
      const map = new Map<string, any>();
      orders.forEach((order) => {
        const key = keyFn(order) || 'Unknown';
        if (!map.has(key)) map.set(key, { label: key, orders: 0, delivered: 0, losses: 0, revenue: 0 });
        const row = map.get(key);
        row.orders++;
        row.revenue += this.number(order.grandTotal);
        if (Number(order.orderStatus) === OrderStatus.DELIVERED) row.delivered++;
        if (LOSS_STATUSES.includes(Number(order.orderStatus))) row.losses++;
      });
      if (manualKeyFn) {
        manualSales.forEach((sale) => {
          const key = manualKeyFn(sale) || 'Unknown';
          if (!map.has(key)) map.set(key, { label: key, orders: 0, delivered: 0, losses: 0, revenue: 0 });
          const row = map.get(key);
          const count = this.number(sale.orders, 1);
          row.orders += count;
          row.revenue += this.number(sale.revenue);
          if (sale.outcome === 'delivered') row.delivered += count;
          if (['cancelled', 'refunded', 'returned'].includes(sale.outcome)) row.losses += count;
        });
      }
      return Array.from(map.values())
        .map((row) => ({
          ...row,
          deliveryRate: row.orders ? (row.delivered / row.orders) * 100 : 0,
          lossRate: row.orders ? (row.losses / row.orders) * 100 : 0,
          revenueBasis: 'actual',
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 12);
    };

    const campaignSpend = new Map<string, any>();
    spendRows.forEach((day) => {
      (day.breakdown || []).forEach((row: any) => {
        const key = row.campaignId || row.campaignName || 'unknown';
        if (!campaignSpend.has(key)) campaignSpend.set(key, { campaignId: row.campaignId || '', campaignName: row.campaignName || 'Unknown campaign', spend: 0 });
        campaignSpend.get(key).spend += this.number(row.spend);
      });
    });
    const campaignOrders = new Map<string, any>();
    orders.forEach((order) => {
      const touch = order.attribution?.lastTouch || {};
      const key = touch.campaignId || touch.campaign || '';
      if (!key) return;
      if (!campaignOrders.has(key)) campaignOrders.set(key, { orders: 0, delivered: 0, revenue: 0, contribution: 0 });
      const row = campaignOrders.get(key);
      row.orders++;
      row.revenue += this.number(order.grandTotal);
      row.contribution += orderContribution.get(String(order._id))?.amount || 0;
      if (Number(order.orderStatus) === OrderStatus.DELIVERED) row.delivered++;
    });
    const campaigns = Array.from(campaignSpend.entries()).map(([key, spendRow]) => {
      const outcome = campaignOrders.get(key) || { orders: 0, delivered: 0, revenue: 0, contribution: 0 };
      return {
        ...spendRow,
        ...outcome,
        costPerOrder: outcome.orders ? spendRow.spend / outcome.orders : null,
        costPerDeliveredOrder: outcome.delivered ? spendRow.spend / outcome.delivered : null,
        attributedContributionAfterAds: outcome.contribution - spendRow.spend,
        moneyBasis: {
          spend: 'actual',
          revenue: 'actual',
          contribution: 'estimated',
          costPerOrder: outcome.orders ? 'allocated' : 'unavailable',
          costPerDeliveredOrder: outcome.delivered ? 'allocated' : 'unavailable',
          attributedContributionAfterAds: 'estimated',
        },
      };
    }).sort((a, b) => b.spend - a.spend);

    return {
      status: {
        ...statusCounts,
        deliveryRate: statusCounts.placed ? (statusCounts.delivered / statusCounts.placed) * 100 : 0,
        cancellationRate: statusCounts.placed ? (statusCounts.cancelled / statusCounts.placed) * 100 : 0,
        refundRate: statusCounts.placed ? (statusCounts.refunded / statusCounts.placed) * 100 : 0,
        returnRate: statusCounts.placed ? (statusCounts.returned / statusCounts.placed) * 100 : 0,
      },
      bySource: segment(
        (order) => order.attribution?.lastTouch?.source || order.orderFrom || 'Unknown',
        (sale) => sale.source || 'WhatsApp / phone',
      ),
      byPayment: segment(
        (order) => order.paymentType || 'Unknown',
        (sale) => sale.paymentStatus || 'Unknown',
      ),
      byLocation: segment((order) => order.division?.name || order.city || 'Unknown'),
      byOrderValue: segment((order) => {
        const value = this.number(order.grandTotal);
        if (value < 500) return 'Under ৳500';
        if (value < 1000) return '৳500–999';
        if (value < 2000) return '৳1,000–1,999';
        return '৳2,000+';
      }),
      byCustomerType: segment((order) => {
        const history = customerHistory.get(String(order.phoneNo));
        if (!history) return 'Unknown';
        return moment(history.firstOrderAt).isSame(moment(order.createdAt)) ? 'New' : 'Repeat';
      }),
      campaigns,
    };
  }

  private buildCustomerCohorts(
    orders: any[],
    contribution: Map<string, any>,
    customerHistory: Map<string, any>,
  ): any {
    const validOrders = orders.filter((order) => !LOSS_STATUSES.includes(Number(order.orderStatus)));
    const customers = new Map<string, any>();
    validOrders.forEach((order) => {
      const phone = String(order.phoneNo || '');
      if (!phone) return;
      const history = customerHistory.get(phone);
      const type = history && moment(history.firstOrderAt).isSame(moment(order.createdAt))
        ? 'new'
        : 'repeat';
      if (!customers.has(phone)) {
        customers.set(phone, { type, revenue: 0, contribution: 0, orders: 0 });
      }
      const customer = customers.get(phone);
      if (type === 'new') customer.type = 'new';
      customer.orders++;
      customer.revenue += this.number(order.grandTotal);
      customer.contribution += contribution.get(String(order._id))?.amount || 0;
    });
    const histories = Array.from(customerHistory.values());
    const reorderIntervals: number[] = [];
    histories.forEach((history: any) => {
      const dates = history.orderDates || [];
      for (let index = 1; index < dates.length; index++) {
        reorderIntervals.push(moment(dates[index]).diff(moment(dates[index - 1]), 'days', true));
      }
    });
    const rows = Array.from(customers.values());
    const aggregate = (type: string) => {
      const selected = rows.filter((row) => row.type === type);
      return {
        customers: selected.length,
        orders: selected.reduce((sum, row) => sum + row.orders, 0),
        revenue: this.money(selected.reduce((sum, row) => sum + row.revenue, 0), 'actual'),
        contribution: this.money(
          selected.reduce((sum, row) => sum + row.contribution, 0),
          'estimated',
        ),
      };
    };
    return {
      customersInRange: customers.size,
      new: aggregate('new'),
      repeat: aggregate('repeat'),
      secondPurchaseRate: histories.length
        ? (histories.filter((history: any) => this.number(history.totalOrders) >= 2).length / histories.length) * 100
        : null,
      averageReorderIntervalDays: reorderIntervals.length
        ? reorderIntervals.reduce((sum, value) => sum + value, 0) / reorderIntervals.length
        : null,
      lifetimeRevenueForCustomers: this.money(
        histories.reduce((sum: number, history: any) => sum + this.number(history.customerRevenue), 0),
        'actual',
      ),
    };
  }

  private buildFunnel(posthog: any, orders: number, delivered: number): any {
    const source = posthog.funnel || {};
    const stages = [
      { key: 'visitors', label: 'Visitors', value: source.$pageview ?? null },
      { key: 'productViews', label: 'Product views', value: source.product_viewed ?? null },
      { key: 'addToCart', label: 'Add to cart', value: source.add_to_cart ?? null },
      { key: 'checkout', label: 'Checkout', value: source.checkout_initiated ?? null },
      { key: 'orders', label: 'Orders', value: orders },
      { key: 'delivered', label: 'Delivered', value: delivered },
    ];
    let largestDrop = null;
    stages.forEach((stage: any, index) => {
      const previous = index ? stages[index - 1].value : null;
      stage.conversionFromPrevious = previous && stage.value !== null
        ? (stage.value / previous) * 100
        : null;
      if (previous && stage.value !== null) {
        const drop = previous - stage.value;
        if (!largestDrop || drop > largestDrop.lost) {
          largestDrop = {
            from: stages[index - 1].label,
            to: stage.label,
            lost: drop,
            conversion: stage.conversionFromPrevious,
          };
        }
      }
    });
    return {
      available: posthog.available,
      reason: posthog.reason || null,
      stages,
      largestDrop,
    };
  }

  private buildOpportunities(
    products: any[],
    orderQuality: any,
    spendRows: any[],
    orders: any[],
    contributionBeforeAds: number,
    validOrderCount: number,
  ): any[] {
    const items: any[] = [];
    const priority: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    products.forEach((product) => {
      if (product.recommendation === 'Restock') {
        items.push({
          type: 'stock',
          priority: product.stock <= 0 ? 'critical' : 'high',
          title: `Restock ${product.name}`,
          detail: product.stock <= 0
            ? 'This product is out of stock while demand exists.'
            : `Estimated stock cover is ${Math.round(product.stockCoverageDays)} days.`,
          action: 'Restock',
          productId: product.productId,
        });
      } else if (product.recommendation === 'Improve Page') {
        items.push({
          type: 'conversion',
          priority: 'high',
          title: `Improve ${product.name}`,
          detail: `${product.views} tracked viewers produced ${product.orders} orders.`,
          action: 'Improve Page',
          productId: product.productId,
        });
      } else if (product.recommendation === 'Scale') {
        items.push({
          type: 'growth',
          priority: 'medium',
          title: `Scale ${product.name}`,
          detail: `${Math.round(product.margin.value)}% product margin across ${product.orders} orders.`,
          action: 'Scale',
          productId: product.productId,
        });
      } else if (product.recommendation === 'Reduce Promotion') {
        items.push({
          type: 'quality',
          priority: 'high',
          title: `Review promotion for ${product.name}`,
          detail: `${Math.round(product.cancellationRate)}% of its orders ended as cancellation, refund, or return.`,
          action: 'Reduce Promotion',
          productId: product.productId,
        });
      }
    });

    const avgPreAdContribution = validOrderCount ? contributionBeforeAds / validOrderCount : 0;
    (orderQuality.campaigns || []).forEach((campaign) => {
      if (campaign.costPerDeliveredOrder !== null && avgPreAdContribution > 0 && campaign.costPerDeliveredOrder > avgPreAdContribution) {
        items.push({
          type: 'campaign',
          priority: 'critical',
          title: `Reduce spend on ${campaign.campaignName}`,
          detail: `Cost per delivered order is ৳${Math.round(campaign.costPerDeliveredOrder)}, above the average pre-ad contribution of ৳${Math.round(avgPreAdContribution)}.`,
          action: 'Reduce Promotion',
          campaignId: campaign.campaignId,
        });
      }
    });

    if (orderQuality.status.cancellationRate >= 15 && orders.length >= 10) {
      items.push({
        type: 'quality',
        priority: 'critical',
        title: 'Investigate cancelled orders',
        detail: `${Math.round(orderQuality.status.cancellationRate)}% of placed orders were cancelled in this range.`,
        action: 'Review Orders',
      });
    }
    if (!spendRows.length) {
      items.push({
        type: 'data',
        priority: 'high',
        title: 'Connect or log advertising spend',
        detail: 'Profit after advertising cannot be trusted without spend for the selected range.',
        action: 'Add Spend',
      });
    }
    return items
      .sort((a, b) => priority[b.priority] - priority[a.priority])
      .slice(0, 5)
      .map((item) => ({ ...item, key: this.opportunityKey(item) }));
  }

  private buildTrend(
    orders: any[],
    manualSales: any[],
    spendRows: any[],
    contribution: Map<string, any>,
  ): any[] {
    const map = new Map<string, any>();
    const get = (date: string) => {
      if (!map.has(date)) {
        map.set(date, {
          date,
          revenue: 0,
          orders: 0,
          deliveredOrders: 0,
          realizedRevenue: 0,
          expectedContributionBeforeAds: 0,
          realizedContributionBeforeAds: 0,
          adSpend: null,
          profitUnavailable: false,
        });
      }
      return map.get(date);
    };
    orders.forEach((order) => {
      const date = moment(order.createdAt).tz(DASHBOARD_TIME_ZONE).format('YYYY-MM-DD');
      const row = get(date);
      if (!LOSS_STATUSES.includes(Number(order.orderStatus))) {
        row.revenue += this.number(order.grandTotal);
        row.orders++;
        row.expectedContributionBeforeAds += contribution.get(String(order._id))?.amount || 0;
        if (contribution.get(String(order._id))?.cogs?.missingItems) row.profitUnavailable = true;
      }
      if (Number(order.orderStatus) === OrderStatus.DELIVERED) {
        row.deliveredOrders++;
        row.realizedRevenue += this.number(order.grandTotal);
        row.realizedContributionBeforeAds += contribution.get(String(order._id))?.amount || 0;
      }
    });
    manualSales.forEach((sale) => {
      const row = get(sale.date);
      const manualContribution =
        this.number(sale.revenue) -
        this.number(sale.cost) -
        (this.hasNumber(sale.actualCourierCost)
          ? this.number(sale.actualCourierCost)
          : this.number(sale.deliveryCharge)) -
        this.number(sale.packagingCost) -
        this.number(sale.paymentFee) -
        this.number(sale.refundAmount) -
        this.number(sale.returnLoss);
      if (!['cancelled', 'refunded', 'returned'].includes(sale.outcome)) {
        row.revenue += this.number(sale.revenue);
        row.orders += this.number(sale.orders, 1);
        row.expectedContributionBeforeAds += manualContribution;
        if (!this.hasNumber(sale.cost)) row.profitUnavailable = true;
      }
      if (sale.outcome === 'delivered') {
        row.deliveredOrders += this.number(sale.orders, 1);
        row.realizedRevenue += this.number(sale.revenue);
        row.realizedContributionBeforeAds += manualContribution;
      }
    });
    spendRows.forEach((spend) => {
      get(spend.date).adSpend = this.number(spend.spend);
    });
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        expectedContribution: row.adSpend === null || row.profitUnavailable
          ? null
          : row.expectedContributionBeforeAds - row.adSpend,
        realizedContribution: row.adSpend === null || row.profitUnavailable
          ? null
          : row.realizedContributionBeforeAds - (
            row.revenue ? row.adSpend * (row.realizedRevenue / row.revenue) : 0
          ),
        moneyBasis: {
          revenue: 'actual',
          realizedRevenue: 'actual',
          adSpend: row.adSpend === null ? 'unavailable' : 'actual',
          expectedContributionBeforeAds: row.profitUnavailable ? 'unavailable' : 'estimated',
          realizedContributionBeforeAds: row.profitUnavailable ? 'unavailable' : 'estimated',
          expectedContribution: row.adSpend === null || row.profitUnavailable ? 'unavailable' : 'estimated',
          realizedContribution: row.adSpend === null || row.profitUnavailable ? 'unavailable' : 'allocated',
        },
      }));
  }

  private buildDataQuality(
    quality: any,
    orderCount: number,
    spendRows: any[],
    posthog: any,
    days: number,
  ): any {
    const costRecords = quality.totalItems + quality.manualSales;
    const knownManualCosts = quality.manualSales - quality.manualMissingCosts;
    const cogsCoverage = costRecords
      ? ((quality.snapshotItems + quality.fallbackItems + knownManualCosts) / costRecords) * 100
      : 100;
    const historicalCogsCoverage = costRecords
      ? ((quality.snapshotItems + knownManualCosts) / costRecords) * 100
      : 100;
    const courierCoverage = orderCount ? (quality.actualCourierOrders / orderCount) * 100 : 100;
    const operationalCoverage = orderCount ? (quality.completeOperationalOrders / orderCount) * 100 : 100;
    const attributionCoverage = orderCount ? (quality.attributionOrders / orderCount) * 100 : 100;
    const spendCoverage = Math.min(100, (new Set(spendRows.map((row) => row.date)).size / Math.max(days, 1)) * 100);
    const score =
      cogsCoverage * 0.35 +
      courierCoverage * 0.2 +
      operationalCoverage * 0.15 +
      attributionCoverage * 0.15 +
      spendCoverage * 0.1 +
      (posthog.available ? 100 : 0) * 0.05;
    const warnings: string[] = [];
    if (quality.fallbackItems) warnings.push(`${quality.fallbackItems} line items use current catalog cost as an estimate.`);
    if (quality.missingItems) warnings.push(`${quality.missingItems} line items have no usable product cost.`);
    if (quality.manualMissingCosts) warnings.push(`${quality.manualMissingCosts} phone or WhatsApp entries have no product cost.`);
    if (courierCoverage < 100) warnings.push('Some orders use the customer delivery charge as a courier-cost estimate.');
    if (operationalCoverage < 100) warnings.push('Packaging or payment fees are missing on some orders.');
    if (spendCoverage < 100) warnings.push(`Advertising spend covers ${Math.round(spendCoverage)}% of selected days.`);
    if (!posthog.available) warnings.push(posthog.reason || 'PostHog funnel data is unavailable.');
    return {
      score: Math.round(score),
      cogsCoverage: Math.round(cogsCoverage),
      historicalCogsCoverage: Math.round(historicalCogsCoverage),
      actualCourierCoverage: Math.round(courierCoverage),
      operationalCostCoverage: Math.round(operationalCoverage),
      attributionCoverage: Math.round(attributionCoverage),
      adSpendAvailable: spendCoverage === 100,
      adSpendCoverage: Math.round(spendCoverage),
      funnelAvailable: posthog.available,
      warnings,
    };
  }

  private profitMissingFields(quality: any, orders: number, hasSpend: boolean): string[] {
    const missing: string[] = [];
    if (quality.fallbackItems) missing.push('Historical COGS is estimated for some line items.');
    if (quality.missingItems) missing.push('COGS is unavailable for some line items.');
    if (quality.manualMissingCosts) missing.push('Product cost is unavailable for some phone or WhatsApp entries.');
    if (quality.actualCourierOrders < orders) missing.push('Actual courier cost is missing for some orders.');
    if (quality.completeOperationalOrders < orders) missing.push('Packaging or payment fees are missing for some orders.');
    if (!hasSpend) missing.push('Advertising spend is unavailable.');
    return missing;
  }

  private opportunityKey(opportunity: any): string {
    const identity = [
      opportunity.type,
      opportunity.productId || opportunity.campaignId || '',
      opportunity.title,
      opportunity.action,
    ].join('|');
    return createHash('sha256').update(identity).digest('hex').slice(0, 20);
  }

  private sanitizeSummarySnapshot(summary: any): Record<string, number | null> {
    const keys = [
      'expectedContribution',
      'realizedContribution',
      'netRevenue',
      'deliveredOrders',
      'contributionMargin',
      'costPerDeliveredOrder',
    ];
    return keys.reduce((snapshot, key) => {
      const raw = summary?.[key];
      const value = typeof raw === 'number' ? raw : this.metricValue(raw);
      snapshot[key] = value === null || value === undefined || !Number.isFinite(Number(value))
        ? null
        : Math.round(Number(value) * 100) / 100;
      return snapshot;
    }, {} as Record<string, number | null>);
  }

  private async attachExperimentState(opportunities: any[], summary: any): Promise<void> {
    if (!opportunities.length) return;
    const keys = opportunities.map((item) => item.key);
    const actions = await this.analyticsActionModel
      .find({ opportunityKey: { $in: keys } })
      .sort({ actedOnAt: -1 })
      .lean();
    const latest = new Map<string, any>();
    actions.forEach((action: any) => {
      if (!latest.has(action.opportunityKey)) latest.set(action.opportunityKey, action);
    });
    const current = this.sanitizeSummarySnapshot(summary);
    opportunities.forEach((opportunity) => {
      const action = latest.get(opportunity.key);
      opportunity.actedOn = Boolean(action);
      if (!action) return;
      opportunity.actedOnAt = action.actedOnAt;
      opportunity.experiment = {
        rangeStart: action.rangeStart,
        rangeEnd: action.rangeEnd,
        note: action.note || '',
        baseline: action.baseline,
        change: Object.keys(current).reduce((result, key) => {
          const before = action.baseline?.[key];
          const after = current[key];
          result[key] = before === null || before === undefined || after === null
            ? null
            : Math.round((after - before) * 100) / 100;
          return result;
        }, {} as Record<string, number | null>),
      };
    });
  }

  private buildComparison(current: any, previous: any): any {
    const keys = [
      'expectedContribution',
      'realizedContribution',
      'netRevenue',
      'deliveredOrders',
      'placedOrders',
      'averageOrderValue',
      'contributionMargin',
      'adSpend',
      'costPerDeliveredOrder',
    ];
    return keys.reduce((result, key) => {
      const currentValue = this.metricValue(current[key]);
      const previousValue = this.metricValue(previous[key]);
      const changePct = currentValue === null || previousValue === null || previousValue === 0
        ? null
        : ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      result[key] = { current: currentValue, previous: previousValue, changePct };
      return result;
    }, {} as Record<string, any>);
  }

  private metricValue(metric: any): number | null {
    if (!metric) return null;
    if (metric.amount !== undefined) return metric.amount;
    if (metric.value !== undefined) return metric.value;
    return null;
  }

  private async getPosthogAnalytics(start: Date, end: Date): Promise<any> {
    const personalKey = this.configService.get<string>('POSTHOG_PERSONAL_API_KEY');
    const projectId = this.configService.get<string>('POSTHOG_PROJECT_ID');
    if (!personalKey || !projectId) {
      return {
        available: false,
        reason: 'POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID is not configured.',
        funnel: {},
        products: {},
      };
    }
    const configuredHost = this.configService.get<string>('POSTHOG_QUERY_HOST');
    const host = (configuredHost || 'https://us.posthog.com').replace(/\/$/, '');
    const from = start.toISOString().replace('T', ' ').replace('Z', '');
    const to = end.toISOString().replace('T', ' ').replace('Z', '');
    const headers = { Authorization: `Bearer ${personalKey}`, 'Content-Type': 'application/json' };
    const queryUrl = `${host}/api/projects/${encodeURIComponent(projectId)}/query/`;
    const run = async (query: string) => {
      const response = await firstValueFrom(
        this.httpService.post(queryUrl, { query: { kind: 'HogQLQuery', query } }, { headers, timeout: 15000 }),
      );
      return response.data?.results || [];
    };
    try {
      const [funnelRows, productRows] = await Promise.all([
        run(`SELECT event, uniq(distinct_id) FROM events WHERE timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}') AND event IN ('$pageview','product_viewed','add_to_cart','checkout_initiated','purchase_completed') GROUP BY event`),
        run(`SELECT toString(properties.product_id), countIf(event = 'product_viewed'), countIf(event = 'add_to_cart') FROM events WHERE timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}') AND event IN ('product_viewed','add_to_cart') AND properties.product_id IS NOT NULL GROUP BY toString(properties.product_id)`),
      ]);
      const funnel = funnelRows.reduce((map: any, row: any[]) => {
        map[String(row[0])] = this.number(row[1]);
        return map;
      }, {});
      const products = productRows.reduce((map: any, row: any[]) => {
        map[String(row[0])] = { views: this.number(row[1]), carts: this.number(row[2]) };
        return map;
      }, {});
      return { available: true, funnel, products };
    } catch (error) {
      this.logger.warn(`PostHog decision query failed: ${error?.message || error}`);
      return {
        available: false,
        reason: 'PostHog query failed; verify the personal API key, project ID, and query host.',
        funnel: {},
        products: {},
      };
    }
  }

  private money(amount: number | null, basis: MoneyBasis, missing: string[] = []): any {
    return {
      amount: amount === null ? null : Math.round(amount * 100) / 100,
      currency: 'BDT',
      basis,
      missing,
    };
  }

  private number(value: any, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private optionalNumber(value: any): number | undefined {
    const parsed = Number(value);
    return value !== null && value !== undefined && value !== '' && Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : undefined;
  }

  private hasNumber(value: any): boolean {
    return this.optionalNumber(value) !== undefined;
  }

  private validObjectId(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(String(value || ''));
  }
}
