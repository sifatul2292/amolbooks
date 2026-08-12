import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../interfaces/common/order.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';

const DHAKA_TZ = 'Asia/Dhaka';
const DEFAULT_DAYS = 14;
const MAX_DAYS = 90;

/**
 * Answers one question the Meta Events Manager cannot: for every order we took,
 * did Meta actually receive a Purchase, and through which path?
 *
 * Website orders reach Meta from the browser only, so a lost browser event is
 * invisible in Meta's own coverage stats — those measure the quality of events
 * that arrived, never the ones that never fired. Reading it from our own order
 * records is the only way to see the hole.
 */
@Injectable()
export class MetaTrackingHealthService {
  private logger = new Logger(MetaTrackingHealthService.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<Order>,
  ) {}

  async getMetaTrackingHealth(days?: string): Promise<ResponsePayload> {
    const dayCount = Math.min(
      MAX_DAYS,
      Math.max(1, Number(days) || DEFAULT_DAYS),
    );
    const since = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);

    const isWebsite = { $eq: ['$orderFrom', 'Website'] };
    const purchaseReported = {
      $or: [
        { $ne: ['$browserPurchaseFiredAt', null] },
        { $eq: ['$metaPurchaseStatus', 'sent'] },
      ],
    };

    const rows: any[] = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $project: {
          orderId: 1,
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: DHAKA_TZ,
            },
          },
          units: {
            $sum: {
              $map: {
                input: { $ifNull: ['$orderedItems', []] },
                as: 'item',
                in: { $max: [1, { $ifNull: ['$$item.quantity', 1] }] },
              },
            },
          },
          isWebsite,
          reported: purchaseReported,
          browserFired: { $ne: ['$browserPurchaseFiredAt', null] },
          gapFilled: {
            $eq: ['$metaPurchaseDeliveryChannel', 'website_gap_fill'],
          },
          manualSent: {
            $and: [
              { $not: [isWebsite] },
              { $eq: ['$metaPurchaseStatus', 'sent'] },
            ],
          },
          failed: { $eq: ['$metaPurchaseStatus', 'failed'] },
        },
      },
      {
        $group: {
          _id: '$day',
          orders: { $sum: 1 },
          units: { $sum: '$units' },
          websiteOrders: { $sum: { $cond: ['$isWebsite', 1, 0] } },
          manualOrders: { $sum: { $cond: ['$isWebsite', 0, 1] } },
          browserFired: { $sum: { $cond: ['$browserFired', 1, 0] } },
          gapFilled: { $sum: { $cond: ['$gapFilled', 1, 0] } },
          manualSent: { $sum: { $cond: ['$manualSent', 1, 0] } },
          failed: { $sum: { $cond: ['$failed', 1, 0] } },
          reported: { $sum: { $cond: ['$reported', 1, 0] } },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const days_ = rows.map((row) => ({
      date: row._id,
      orders: row.orders,
      units: row.units,
      websiteOrders: row.websiteOrders,
      manualOrders: row.manualOrders,
      browserFired: row.browserFired,
      gapFilled: row.gapFilled,
      manualSent: row.manualSent,
      failed: row.failed,
      reported: row.reported,
      // Website orders Meta was never told about. Before the gap-fill job
      // existed this was silent revenue Meta could not attribute.
      untrackedWebsite: Math.max(
        0,
        row.websiteOrders - row.browserFired - row.gapFilled,
      ),
      coverage: row.orders
        ? Math.round((row.reported / row.orders) * 1000) / 10
        : 0,
    }));

    const totals = days_.reduce(
      (sum, day) => ({
        orders: sum.orders + day.orders,
        units: sum.units + day.units,
        websiteOrders: sum.websiteOrders + day.websiteOrders,
        manualOrders: sum.manualOrders + day.manualOrders,
        browserFired: sum.browserFired + day.browserFired,
        gapFilled: sum.gapFilled + day.gapFilled,
        manualSent: sum.manualSent + day.manualSent,
        failed: sum.failed + day.failed,
        reported: sum.reported + day.reported,
        untrackedWebsite: sum.untrackedWebsite + day.untrackedWebsite,
      }),
      {
        orders: 0,
        units: 0,
        websiteOrders: 0,
        manualOrders: 0,
        browserFired: 0,
        gapFilled: 0,
        manualSent: 0,
        failed: 0,
        reported: 0,
        untrackedWebsite: 0,
      },
    );

    const failures: any[] = await this.orderModel
      .find({ createdAt: { $gte: since }, metaPurchaseStatus: 'failed' })
      .select(
        'orderId orderFrom manualOrderSource metaPurchaseError tagiooPurchaseError metaPurchaseAttemptCount createdAt',
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Which event_id format Stape settles on is visible here once beacons start
    // arriving — needed before browser and server events can be deduplicated
    // against each other rather than kept mutually exclusive.
    const beaconSamples: any[] = await this.orderModel
      .find({ browserPurchaseEventId: { $exists: true, $ne: null } })
      .select('orderId browserPurchaseEventId browserPurchaseFiredAt')
      .sort({ browserPurchaseFiredAt: -1 })
      .limit(5)
      .lean();

    return {
      success: true,
      message: 'Meta tracking health',
      data: {
        rangeDays: dayCount,
        totals: {
          ...totals,
          coverage: totals.orders
            ? Math.round((totals.reported / totals.orders) * 1000) / 10
            : 0,
        },
        days: days_,
        failures,
        beaconSamples,
      },
    } as ResponsePayload;
  }
}
