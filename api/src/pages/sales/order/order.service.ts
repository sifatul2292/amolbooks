import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Order } from '../../../interfaces/common/order.interface';
import { IncompleteOrder } from '../../../interfaces/common/incomplete-order.interface';
import {
  AddIncompleteOrderDto,
  FilterAndPaginationIncompleteOrderDto,
  UpdateIncompleteOrderDto,
} from '../../../dto/incomplete-order.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddOrderDto,
  FilterAndPaginationOrderDto,
  OptionOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from '../../../dto/order.dto';
import { Product } from '../../../interfaces/common/product.interface';
import { UniqueId } from '../../../interfaces/core/unique-id.interface';
import { OrderStatus } from '../../../enum/order.enum';
import { User } from '../../../interfaces/user/user.interface';
import { Cart } from '../../../interfaces/common/cart.interface';
import { BulkSmsService } from '../../../shared/bulk-sms/bulk-sms.service';
import { EmailService } from '../../../shared/email/email.service';
import { Coupon } from '../../../interfaces/common/coupon.interface';
import { DiscountTypeEnum } from '../../../enum/product.enum';
import { OrderOffer } from '../../../interfaces/common/order-offer.interface';
import { SpecialPackage } from '../../../interfaces/common/special-package.interface';
import { ShopInformation } from '../../../interfaces/common/shop-information.interface';
import { Setting } from '../../customization/setting/interface/setting.interface';
import {
  CourierApiConfig,
  SteadfastCourierPayload,
} from 'src/shared/courier/interfaces/courier.interface';
import { CourierService } from '../../../shared/courier/courier.service';
import * as schedule from 'node-schedule';
import * as crypto from 'crypto';
import { Admin } from '../../../interfaces/admin/admin.interface';
import { AnalyticsService } from '../../../shared/analytics/analytics.service';
import { StockMovement } from '../../../interfaces/common/stock-movement.interface';
import { withCalculatedSpecialPackageSubtotal } from '../../../shared/utils/special-package-price.util';
const ObjectId = Types.ObjectId;

// Process-level TTL cache for the public recent-buyers feed. Caps DB load on a
// high-traffic live site to ~1 query per product slug per RECENT_BUYERS_TTL_MS,
// regardless of pageview volume.
const RECENT_BUYERS_TTL_MS = 120000; // 2 min
const recentBuyersCache = new Map<string, { at: number; data: any[] }>();

type ManualOrderSource =
  | 'whatsapp'
  | 'whatsapp_ad'
  | 'phone'
  | 'facebook'
  | 'instagram'
  | 'email'
  | 'walk_in'
  | 'other';

interface OrderBackgroundOptions {
  isManualOrder?: boolean;
  manualOrderSource?: ManualOrderSource;
}

@Injectable()
export class OrderService {
  private logger = new Logger(OrderService.name);

  constructor(
    @InjectModel('Admin') private readonly adminModel: Model<Admin>,
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    @InjectModel('IncompleteOrder')
    private readonly incompleteOrderModel: Model<IncompleteOrder>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('SpecialPackage')
    private readonly specialPackageModel: Model<SpecialPackage>,
    @InjectModel('UniqueId') private readonly uniqueIdModel: Model<UniqueId>,
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('User') private readonly userModel: Model<Cart>,
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('Coupon') private readonly couponModel: Model<Coupon>,
    private readonly courierService: CourierService,
    @InjectModel('ShopInformation')
    private readonly shopInformationModel: Model<ShopInformation>,
    @InjectModel('OrderOffer')
    private readonly orderOfferModel: Model<OrderOffer>,
    @InjectModel('StockMovement')
    private readonly stockMovementModel: Model<StockMovement>,
    private configService: ConfigService,
    private utilsService: UtilsService,
    private bulkSmsService: BulkSmsService,
    private emailService: EmailService, // private pdfMakerService: TCreatedPdf,
    private analyticsService: AnalyticsService,
  ) {
    this.checkAndUpdateCourierStatus();
  }

  /**
   * addOrder
   * insertManyOrder
   */
  async addOrderAdmin(
    admin,
    addOrderDto: AddOrderDto,
  ): Promise<ResponsePayload> {
    if (!admin || !admin._id) {
      this.logger.error('Admin data is missing in addOrderAdmin');
      throw new BadRequestException(
        'Admin authentication failed: Admin data is missing',
      );
    }
    let user;
    let mData;
    const adminData = await this.adminModel.findById(admin._id);
    // this.logger.error(addOrderDto);
    // Increment Order Id Unique
    const incOrder = await this.uniqueIdModel.findOneAndUpdate(
      {},
      { $inc: { orderId: 1 } },
      { new: true, upsert: true },
    );

    const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);

    const dataExtra = {
      orderId: orderIdUnique,
      month: this.utilsService.getDateMonth(false, new Date()),
      year: this.utilsService.getDateYear(new Date()),
    };

    if (addOrderDto.phoneNo && !addOrderDto.user) {
      user = await this.userModel.findOne({ phoneNo: addOrderDto.phoneNo });
      // console.log(user);
      if (user) {
        mData = { ...addOrderDto, ...dataExtra, ...{ user: user._id } };
      } else {
        mData = { ...addOrderDto, ...dataExtra };
      }
    } else {
      mData = { ...addOrderDto, ...dataExtra, ...adminData };
    }

    const adminManualSource = this.normalizeManualOrderSource(
      addOrderDto.manualOrderSource,
    );
    mData.manualOrderSource = adminManualSource;
    mData.orderFrom =
      mData.orderFrom || this.manualOrderLabel(adminManualSource);
    mData = this.normalizeAdminOrderData(mData);
    mData.orderedItems = await this.attachCostSnapshots(mData.orderedItems);

    const newData = new this.orderModel(mData);

    try {
      const saveData = await newData.save();

      // if (saveData.email) {
      //
      //   const file = await this.pdfMakerService.makePDF(saveData)
      //   await this.emailService.sendEmail(saveData.name, saveData.email, file);
      //
      // }

      const data = {
        _id: saveData._id,
        orderId: saveData.orderId,
      };

      await this.cleanupIncompleteOrdersForPlacedOrder(
        saveData,
        addOrderDto.incompleteOrderId,
      );

      if (addOrderDto.incompleteOrderId) {
        try {
          await this.markIncompleteOrderConverted(
            addOrderDto.incompleteOrderId,
            saveData.orderId,
          );
        } catch (error) {
          this.logger.warn(
            `Order ${saveData.orderId} was created, but incomplete order conversion marking failed:`,
            error?.message || error,
          );
        }
      }

      if (addOrderDto.user) {
        await this.cartModel.deleteMany({
          user: new ObjectId(addOrderDto.user),
        });
        await this.userModel.findOneAndUpdate(
          { _id: addOrderDto.user },
          {
            $set: {
              carts: [],
            },
          },
        );
        if (addOrderDto.coupon) {
          await this.userModel.findOneAndUpdate(
            { _id: addOrderDto.user },
            {
              $push: {
                usedCoupons: addOrderDto.coupon,
              },
            },
          );
        }
      }

      // Sales-counter increment only. Actual stock deduction is unified into
      // `decreaseProductStock` (single source of truth via the `stock` field
      // + StockMovement log) — the legacy `quantity` field is no longer
      // decremented here to stop the two counters from drifting apart.
      for (const f of (addOrderDto['orderedItems'] || [])) {
        try {
          if (!f?._id || !ObjectId.isValid(f._id)) {
            this.logger.warn(
              `Skipping totalSold update for order ${saveData.orderId}: invalid product id ${f?._id}`,
            );
            continue;
          }

          const quantity = Number(f.quantity) || 0;
          if (quantity <= 0) {
            continue;
          }

          await this.productModel.findByIdAndUpdate(f._id, {
            $inc: { totalSold: quantity },
          });
        } catch (error) {
          this.logger.warn(
            `Order ${saveData.orderId} was created, but totalSold update failed for product ${f?._id}:`,
            error?.message || error,
          );
        }
      }

      const response = {
        success: true,
        message: 'Order Added Success',
        data,
      } as ResponsePayload;

      if (addOrderDto.incompleteOrderId) {
        try {
          await this.markIncompleteOrderConverted(
            addOrderDto.incompleteOrderId,
            saveData.orderId,
          );
        } catch (error) {
          this.logger.warn(
            `Order ${saveData.orderId} was created, but incomplete order conversion marking failed:`,
            error?.message || error,
          );
        }
      }

      // Run background tasks after response is prepared (fire and forget)
      // This will execute after the response is sent to UI
      this.processOrderBackgroundTasks(saveData, addOrderDto, {
        isManualOrder: true,
        manualOrderSource: adminManualSource,
      }).catch((error) => {
        this.logger.error(
          `Error in background order processing for order ${saveData.orderId}:`,
          error,
        );
      });

      return response;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async trackManualOrderMetaAdmin(
    admin: Admin,
    orderId: string,
    source?: string,
  ): Promise<ResponsePayload> {
    if (!admin || !admin._id) {
      throw new BadRequestException('Admin authentication failed');
    }

    const order: any = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const manualOrderSource = this.normalizeManualOrderSource(
      source || 'whatsapp',
    );
    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          orderFrom: this.manualOrderLabel(manualOrderSource),
          manualOrderSource,
        },
      },
    );
    await this.sendManualOrderToMeta(order, manualOrderSource);

    const result: any = await this.orderModel
      .findById(order._id)
      .select('metaPurchaseStatus metaPurchaseEventId metaPurchaseError')
      .lean();
    const sent = result?.metaPurchaseStatus === 'sent';
    return {
      success: sent,
      message: sent
        ? 'Manual Purchase sent to Meta'
        : result?.metaPurchaseError || 'Manual Purchase was not sent to Meta',
      data: result,
    } as ResponsePayload;
  }

  async addOrder(
    addOrderDto: AddOrderDto,
    backgroundOptions: OrderBackgroundOptions = {},
  ): Promise<ResponsePayload> {
    try {
      let newOrderMake: any;
      const fraudCheckerData: any = null;
      const orderInput: any = { ...addOrderDto };
      if (!backgroundOptions.isManualOrder) {
        orderInput.orderFrom = 'Website';
        delete orderInput.manualOrderSource;
      }

      // New Order Make
      // if (addOrderDto.user) {
      newOrderMake = await this.newOrderMake(orderInput);
      // console.log('newOrderMake data', newOrderMake);
      // } else {
      //   newOrderMake = await this.newOrderMake(addOrderDto);
      // }
      // if (addOrderDto.phoneNo) {
      //   try {
      //     fraudCheckerData = await this.courierService.checkFraudOrder(
      //       addOrderDto.phoneNo,
      //     );
      //     // Validate response structure
      //     if (fraudCheckerData && !fraudCheckerData.summary) {
      //       this.logger.warn(
      //         `Fraud checker response missing summary for phone: ${addOrderDto.phoneNo}`,
      //       );
      //     }
      //   } catch (error) {
      //     this.logger.warn(
      //       `Failed to fetch fraud checker data for phone: ${addOrderDto?.phoneNo}`,
      //       error?.message || error,
      //     );
      //     // Continue with order creation even if fraud check fails
      //   }
      // }

      // Increment Order Id Unique
      const incOrder = await this.uniqueIdModel.findOneAndUpdate(
        {},
        { $inc: { orderId: 1 } },
        { new: true, upsert: true },
      );

      const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);

      const dataExtra = {
        orderId: orderIdUnique,
        month: this.utilsService.getDateMonth(false, new Date()),
        year: this.utilsService.getDateYear(new Date()),
      };

      newOrderMake.orderedItems = await this.attachCostSnapshots(
        newOrderMake.orderedItems,
      );
      const mData = { ...newOrderMake, ...dataExtra };
      const newData = new this.orderModel(mData);

      const saveData = await newData.save();

      // Prepare response data immediately
      const data = {
        _id: saveData._id,
        orderId: saveData.orderId,
      };

      await this.cleanupIncompleteOrdersForPlacedOrder(
        saveData,
        addOrderDto.incompleteOrderId,
      );

      // Return response immediately - UI will get response fast
      const response = {
        success: true,
        message: 'Order Added Success',
        data,
      } as ResponsePayload;

      // Run background tasks after response is prepared (fire and forget)
      // This will execute after the response is sent to UI
      this.processOrderBackgroundTasks(
        saveData,
        orderInput,
        backgroundOptions,
      ).catch((error) => {
        this.logger.error(
          `Error in background order processing for order ${saveData.orderId}:`,
          error,
        );
      });

      return response;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Process background tasks after order is saved
   * This runs asynchronously without blocking the response
   */
  private async processOrderBackgroundTasks(
    saveData: any,
    addOrderDto: AddOrderDto,
    options: OrderBackgroundOptions = {},
  ): Promise<void> {
    try {
      // 0) Manual stock decrement (custom-orders.html). Only products with a
      // non-null `stock` are affected; others are ignored.
      const stockDecremented = await this.decreaseProductStock(
        saveData._id,
        saveData?.orderedItems,
      );
      if (stockDecremented) {
        await this.orderModel.updateOne(
          { _id: saveData._id },
          { $set: { stockDecremented: true } },
        );
      }

      // 1) Fraud Checker Call + Order Update
      if (addOrderDto.phoneNo) {
        try {
          const fraudCheckerData = await this.courierService.checkFraudOrder(
            addOrderDto.phoneNo,
          );

          // Validate response structure
          if (fraudCheckerData && !fraudCheckerData.summary) {
            this.logger.warn(
              `Fraud checker response missing summary for phone: ${addOrderDto.phoneNo}`,
            );
          }

          // Fraud data পেলে order এ সেট করি
          if (fraudCheckerData) {
            await this.orderModel.updateOne(
              { _id: saveData._id },
              { $set: { fraudChecker: fraudCheckerData } },
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to fetch fraud checker data for phone: ${addOrderDto?.phoneNo}`,
            error?.message || error,
          );
          // Fraud checker fail হলেও order ঠিক থাকবে
        }
      }

      // 2) Delete checkout-created incomplete records after a normal customer order.
      // Admin conversions (status 'converted') are kept as the audit row; only
      // un-converted abandoned records for this phone are removed.
      if (addOrderDto.phoneNo && !addOrderDto.incompleteOrderId) {
        await this.incompleteOrderModel.deleteMany({
          phoneNo: addOrderDto.phoneNo,
          status: { $ne: 'converted' },
        });
      }

      // 3) Cart cleanup and coupon update
      if (addOrderDto.user && saveData._id) {
        await this.cartModel.deleteMany({
          user: new ObjectId(addOrderDto.user),
        });
        await this.userModel.findOneAndUpdate(
          { _id: addOrderDto.user },
          {
            $set: {
              carts: [],
            },
          },
        );
        if (addOrderDto.coupon) {
          await this.userModel.findOneAndUpdate(
            { _id: addOrderDto.user },
            {
              $push: {
                usedCoupons: addOrderDto.coupon,
              },
            },
          );
        }
      }

      // 4) Generate Invoice PDF
      await this.utilsService.generateInvoicePdf(saveData);
      const pdfLink = `https://api.alambook.com/invoice/invoice-${saveData.orderId}.pdf`;

      // 5) Send SMS and Email for Cash on Delivery
      // Check from database if SMS has already been sent to prevent duplicate SMS
      if (saveData['paymentType'] === 'cash_on_delivery') {
        // Check database to see if SMS was already sent (prevents race condition)
        const orderCheck: any = await this.orderModel.findById(saveData._id).select('orderSmsSent');
        if (!orderCheck?.orderSmsSent) {
          const message = `অর্ডারটি কনফার্ম হয়েছে, ৩ দিনের মধ্যে ডেলিভারি করা হবে, amolbooks.com`;
          // const message = `আপনার অর্ডারটি alambook.com-এ সফলভাবে সম্পন্ন হয়েছে। আপনার অর্ডার আইডি (${saveData.orderId}) যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন 01754896763`;
          // const message = `Thank you for your purchase from alambook.com. Your order (${saveData.orderId}) has been placed successfully. Please wait for a confirmation Call.`;
          this.bulkSmsService.sentSingleSms(saveData.phoneNo, message);
          
          // Mark SMS as sent to prevent duplicate (atomic update)
          await this.orderModel.updateOne(
            { _id: saveData._id },
            { $set: { orderSmsSent: true } },
          );
        }

        // Sent Email
        if (saveData.email) {
          const html = `
      <p>Thank you for your purchase from alambook.com. Your order (${saveData.orderId}) has been placed successfully. Please wait for a confirmation Call. Track your order alambook.com/order-track/${saveData._id}
      </p>
      <iframe src="${pdfLink}" frameborder="0" width="100%" height="500px"></iframe>
      <a href="${pdfLink}">Download your invoice</a>
      `;
          this.emailService.sendEmail(saveData.email, 'Alambook', html);
        }
      }

      // 6) Meta CAPI Purchase — ONLY for authenticated admin/manual flows.
      // Public website orders fire Purchase through Tagioo and never reach
      // this branch, preventing browser/server duplicates.
      if (options.isManualOrder) {
        await this.sendManualOrderToMeta(
          saveData,
          options.manualOrderSource || 'other',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing background tasks for order ${saveData.orderId}:`,
        error,
      );
      // Don't throw - background tasks should not fail the order
    }
  }

  /**
   * Sends one server-side Meta Purchase for an authenticated manual order.
   * The database claim prevents repeat submissions while the stable event ID
   * gives Meta a second deduplication layer if a network retry is ambiguous.
   */
  private async sendManualOrderToMeta(
    saveData: any,
    manualOrderSource: ManualOrderSource,
  ): Promise<void> {
    const eventId = `order_${saveData.orderId}`;
    const staleSendingBefore = new Date(Date.now() - 10 * 60 * 1000);
    const claimedOrder: any = await this.orderModel.findOneAndUpdate(
      {
        _id: saveData._id,
        $or: [
          { metaPurchaseStatus: { $exists: false } },
          { metaPurchaseStatus: 'failed' },
          {
            metaPurchaseStatus: 'sending',
            metaPurchaseLastAttemptAt: { $lt: staleSendingBefore },
          },
        ],
      },
      {
        $set: {
          manualOrderSource,
          metaPurchaseStatus: 'sending',
          metaPurchaseEventId: eventId,
          metaPurchaseLastAttemptAt: new Date(),
        },
        $unset: { metaPurchaseError: 1 },
      },
      { new: true },
    );

    if (!claimedOrder) {
      this.logger.log(
        `Manual-order CAPI Purchase already claimed/sent for order ${saveData.orderId}`,
      );
      return;
    }

    try {
      const fSetting = await this.settingModel.findOne().select('analytics');
      const analytics: any = fSetting?.analytics;
      if (
        !analytics?.facebookPixelId ||
        !analytics?.facebookPixelAccessToken
      ) {
        throw new Error('Meta Pixel ID or access token is not configured');
      }

      const hash = (value: string) =>
        crypto
          .createHash('sha256')
          .update(String(value).trim().toLowerCase())
          .digest('hex');
      const phoneDigits = String(claimedOrder.phoneNo || '').replace(/\D/g, '');
      const normalizedPhone = phoneDigits.startsWith('88')
        ? phoneDigits
        : `88${phoneDigits}`;
      const userData: any = {};
      if (normalizedPhone.length > 2) userData.ph = hash(normalizedPhone);
      if (claimedOrder.email) userData.em = hash(claimedOrder.email);

      const nameParts = String(claimedOrder.name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (nameParts[0]) userData.fn = hash(nameParts[0]);
      if (nameParts.length > 1) {
        userData.ln = hash(nameParts.slice(1).join(''));
      }
      if (claimedOrder.city) userData.ct = hash(claimedOrder.city);
      userData.country = hash('bd');

      if (!userData.ph && !userData.em) {
        throw new Error('Manual order has no phone or email for Meta matching');
      }

      const contents = (claimedOrder.orderedItems || [])
        .filter((item: any) => item?._id)
        .map((item: any) => ({
          id: String(item._id),
          quantity: Math.max(1, Number(item.quantity) || 1),
          item_price: Number(item.unitPrice ?? item.salePrice ?? 0),
        }));
      const eventTimestamp = new Date(
        claimedOrder.createdAt || Date.now(),
      ).getTime();
      const payload: any = {
        event_name: 'Purchase',
        event_time: Math.floor(eventTimestamp / 1000),
        action_source: this.metaActionSource(manualOrderSource),
        event_id: eventId,
        custom_data: {
          currency: 'BDT',
          value: Number(claimedOrder.grandTotal || 0),
          content_type: 'product',
          content_ids: contents.map((item: any) => item.id),
          contents,
          order_id: String(claimedOrder.orderId),
        },
        user_data: userData,
      };
      const requestData =
        analytics.isEnablePixelTestEvent &&
        analytics.facebookPixelTestEventId
          ? {
              data: [payload],
              test_event_code: analytics.facebookPixelTestEventId,
            }
          : { data: [payload] };

      const result = await this.analyticsService.trackFbConversionEventClient(
        analytics.facebookPixelId,
        analytics.facebookPixelAccessToken,
        requestData,
      );
      if (!result || Number(result.events_received) < 1) {
        throw new Error('Meta did not acknowledge the Purchase event');
      }

      await this.orderModel.updateOne(
        { _id: saveData._id, metaPurchaseEventId: eventId },
        {
          $set: {
            metaPurchaseStatus: 'sent',
            metaPurchaseSentAt: new Date(),
          },
          $unset: { metaPurchaseError: 1 },
        },
      );
      this.logger.log(
        `Manual-order CAPI Purchase sent for order ${saveData.orderId}`,
      );
    } catch (error) {
      const message = String(error?.message || error).slice(0, 500);
      await this.orderModel.updateOne(
        { _id: saveData._id, metaPurchaseEventId: eventId },
        {
          $set: {
            metaPurchaseStatus: 'failed',
            metaPurchaseError: message,
          },
        },
      );
      this.logger.warn(
        `Manual-order CAPI Purchase failed for order ${saveData.orderId}: ${message}`,
      );
    }
  }

  private normalizeManualOrderSource(value: any): ManualOrderSource {
    const allowed: ManualOrderSource[] = [
      'whatsapp',
      'whatsapp_ad',
      'phone',
      'facebook',
      'instagram',
      'email',
      'walk_in',
      'other',
    ];
    return allowed.includes(value) ? value : 'other';
  }

  private manualOrderLabel(source: ManualOrderSource): string {
    const labels: Record<ManualOrderSource, string> = {
      whatsapp: 'WhatsApp',
      whatsapp_ad: 'WhatsApp Ad',
      phone: 'Phone',
      facebook: 'Facebook',
      instagram: 'Instagram',
      email: 'Email',
      walk_in: 'Walk-in',
      other: 'Manual',
    };
    return labels[source];
  }

  private metaActionSource(source: ManualOrderSource): string {
    if (source === 'whatsapp_ad') return 'business_messaging';
    if (source === 'phone') return 'phone_call';
    if (source === 'email') return 'email';
    if (source === 'walk_in') return 'physical_store';
    if (
      source === 'whatsapp' ||
      source === 'facebook' ||
      source === 'instagram'
    ) {
      return 'chat';
    }
    return 'other';
  }

  private normalizeAdminOrderData(orderData: any): any {
    const orderedItems = this.normalizeOrderItems(orderData?.orderedItems || []);

    if (!orderedItems.length) {
      throw new BadRequestException('Please select product on cart');
    }

    const deliveryCharge = this.toFiniteNumber(orderData?.deliveryCharge, 0);
    const subTotalFromItems = orderedItems.reduce(
      (sum, item) => sum + item.regularPrice * item.quantity,
      0,
    );
    const saleTotalFromItems = orderedItems.reduce(
      (sum, item) => sum + item.salePrice * item.quantity,
      0,
    );
    const subTotal = this.toFiniteNumber(orderData?.subTotal, subTotalFromItems);
    const discount = this.toFiniteNumber(
      orderData?.discount,
      Math.max(subTotal - saleTotalFromItems, 0),
    );
    const grandTotal = this.toFiniteNumber(
      orderData?.grandTotal,
      saleTotalFromItems + deliveryCharge,
    );

    return {
      ...orderData,
      orderedItems,
      deliveryCharge,
      subTotal,
      discount,
      grandTotal,
    };
  }

  /**
   * Decrement manual stock for ordered items. Only products with a non-null
   * `stock` field are touched. Fire-and-forget; never blocks order flow.
   */
  /**
   * Decrement `stock` for tracked products (stock !== null) on order creation.
   * Returns true if the bulk write ran (used by the caller to mark the order
   * as `stockDecremented`, which gates restock-on-cancel below). Fire-and-
   * forget style preserved: never throws, only logs.
   */
  private async decreaseProductStock(
    orderId: string,
    items: any[],
  ): Promise<boolean> {
    try {
      if (!Array.isArray(items) || !items.length) return false;
      const parsed = items
        .map((it) => {
          const id = it?._id || it?.product || it?.productId;
          const qty = Math.max(1, Math.floor(Number(it?.quantity)) || 1);
          if (!id) return null;
          return { id, qty };
        })
        .filter(Boolean) as { id: string; qty: number }[];
      if (!parsed.length) return false;

      const ops = parsed.map(({ id, qty }) => ({
        updateOne: {
          filter: { _id: id, stock: { $ne: null } },
          update: { $inc: { stock: -qty } },
        },
      }));
      await this.productModel.bulkWrite(ops as any);

      // Only tracked products (stock !== null) actually matched the update
      // above; re-fetch to log a movement solely for those, with the
      // post-decrement stock value.
      const trackedIds = parsed.map((p) => p.id);
      const trackedProducts = await this.productModel
        .find({ _id: { $in: trackedIds } })
        .select('sku stock')
        .lean();
      const trackedById = new Map(
        trackedProducts.map((p: any) => [String(p._id), p]),
      );

      const movements = parsed
        .filter(({ id }) => trackedById.has(String(id)))
        .map(({ id, qty }) => {
          const product = trackedById.get(String(id));
          return {
            product: id,
            sku: product?.sku,
            qtyChange: -qty,
            stockAfter: product?.stock,
            reason: 'order',
            referenceType: 'order',
            referenceId: orderId,
          };
        });
      if (movements.length) {
        try {
          await this.stockMovementModel.insertMany(movements);
        } catch (err) {
          this.logger.warn(
            `Failed to log stock movements for order ${orderId}: ${err?.message || err}`,
          );
        }
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `decreaseProductStock failed: ${err?.message || err}`,
      );
      return false;
    }
  }

  /**
   * Reverse `decreaseProductStock` when an order is cancelled/refunded/
   * returned. Mirrors the tracked-only filter so untracked products are
   * silently skipped, same as on the way down.
   */
  private async restockProducts(
    orderId: string,
    items: any[],
    reason: 'cancel_restock' | 'return_restock',
  ): Promise<void> {
    try {
      if (!Array.isArray(items) || !items.length) return;
      const parsed = items
        .map((it) => {
          const id = it?._id || it?.product || it?.productId;
          const qty = Math.max(1, Math.floor(Number(it?.quantity)) || 1);
          if (!id) return null;
          return { id, qty };
        })
        .filter(Boolean) as { id: string; qty: number }[];
      if (!parsed.length) return;

      const ops = parsed.map(({ id, qty }) => ({
        updateOne: {
          filter: { _id: id, stock: { $ne: null } },
          update: { $inc: { stock: qty } },
        },
      }));
      await this.productModel.bulkWrite(ops as any);

      const trackedIds = parsed.map((p) => p.id);
      const trackedProducts = await this.productModel
        .find({ _id: { $in: trackedIds } })
        .select('sku stock')
        .lean();
      const trackedById = new Map(
        trackedProducts.map((p: any) => [String(p._id), p]),
      );

      const movements = parsed
        .filter(({ id }) => trackedById.has(String(id)))
        .map(({ id, qty }) => {
          const product = trackedById.get(String(id));
          return {
            product: id,
            sku: product?.sku,
            qtyChange: qty,
            stockAfter: product?.stock,
            reason,
            referenceType: 'order',
            referenceId: orderId,
          };
        });
      if (movements.length) {
        await this.stockMovementModel.insertMany(movements);
      }
    } catch (err) {
      this.logger.warn(
        `restockProducts failed for order ${orderId}: ${err?.message || err}`,
      );
    }
  }

  private normalizeOrderItems(items: any[]): any[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => this.normalizeOrderItem(item))
      .filter((item) => Boolean(item));
  }

  private async attachCostSnapshots(items: any[]): Promise<any[]> {
    if (!Array.isArray(items) || !items.length) return [];

    const ids = items
      .map((item) => item?._id || item?.product || item?.productId)
      .filter((id) => id && ObjectId.isValid(id));
    const products = ids.length
      ? await this.productModel
          .find({ _id: { $in: ids } })
          .select('_id costPrice')
          .lean()
      : [];
    const catalogCost = new Map(
      products.map((product: any) => [
        String(product._id),
        this.optionalNonNegativeNumber(product.costPrice),
      ]),
    );

    return items.map((item) => {
      const itemCost = this.optionalNonNegativeNumber(item?.costPriceAtOrder);
      const fallback = catalogCost.get(
        String(item?._id || item?.product || item?.productId || ''),
      );
      const costPriceAtOrder = itemCost ?? fallback;
      return costPriceAtOrder === undefined
        ? { ...item }
        : { ...item, costPriceAtOrder };
    });
  }

  private optionalNonNegativeNumber(value: any): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private getProductUnitCostSnapshot(product: any): number | undefined {
    const directCost = this.optionalNonNegativeNumber(product?.costPrice);
    if (directCost !== undefined) return directCost;

    if (!Array.isArray(product?.products)) return undefined;
    let complete = true;
    const packageCost = product.products.reduce((sum: number, entry: any) => {
      const itemCost = this.optionalNonNegativeNumber(entry?.product?.costPrice);
      if (itemCost === undefined) {
        complete = false;
        return sum;
      }
      return sum + itemCost * Math.max(1, Number(entry?.quantity) || 1);
    }, 0);
    return complete ? packageCost : undefined;
  }

  private normalizeAttribution(value: any): any {
    if (!value || typeof value !== 'object') return undefined;
    const text = (input: any, max = 500) => {
      if (input === undefined || input === null) return undefined;
      return String(input).trim().slice(0, max) || undefined;
    };
    const touch = (input: any) => {
      if (!input || typeof input !== 'object') return undefined;
      return {
        source: text(input.source, 120),
        medium: text(input.medium, 120),
        campaign: text(input.campaign, 200),
        campaignId: text(input.campaignId, 120),
        adSet: text(input.adSet, 200),
        adSetId: text(input.adSetId, 120),
        ad: text(input.ad, 200),
        adId: text(input.adId, 120),
        landingPage: text(input.landingPage),
        referrer: text(input.referrer),
        fbclid: text(input.fbclid, 300),
        capturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined,
      };
    };
    return {
      anonymousId: text(value.anonymousId, 120),
      firstTouch: touch(value.firstTouch),
      lastTouch: touch(value.lastTouch),
    };
  }

  private normalizeOrderItem(item: any): any {
    const product = this.getOrderItemProduct(item);
    const productId = this.getOrderItemProductId(item, product);

    if (!productId) {
      this.logger.warn(
        `Skipping incomplete order item without product id: ${JSON.stringify(item)}`,
      );
      return null;
    }

    const quantity = Math.max(
      1,
      this.toFiniteNumber(item?.quantity ?? item?.selectedQty ?? item?.qty, 1),
    );
    const salePrice = this.toFiniteNumber(
      item?.unitPrice ??
        item?.salePrice ??
        product?.salePrice ??
        product?.price ??
        product?.regularPrice,
      0,
    );
    const regularPrice = this.toFiniteNumber(
      item?.regularPrice ??
        item?.costPrice ??
        product?.regularPrice ??
        product?.price ??
        salePrice,
      salePrice,
    );
    const image = this.getOrderItemImage(item, product);

    return {
      _id: productId,
      name: item?.name ?? product?.name,
      nameEn: item?.nameEn ?? product?.nameEn,
      slug: item?.slug ?? product?.slug,
      image,
      author: this.normalizeOrderItemRef(item?.author ?? product?.author),
      category: this.normalizeOrderItemRef(item?.category ?? product?.category),
      subCategory: this.normalizeOrderItemRef(
        item?.subCategory ?? product?.subCategory,
      ),
      publisher: this.normalizeOrderItemRef(
        item?.publisher ?? product?.publisher,
      ),
      brand: this.normalizeOrderItemRef(item?.brand ?? product?.brand),
      regularPrice,
      unitPrice: salePrice,
      salePrice,
      costPriceAtOrder:
        this.optionalNonNegativeNumber(item?.costPriceAtOrder) ??
        this.optionalNonNegativeNumber(product?.costPrice),
      quantity,
      orderType: item?.orderType ?? 'regular',
      discountAmount: this.toFiniteNumber(item?.discountAmount, 0),
      discountType: item?.discountType ?? null,
      unit: item?.unit ?? product?.unit ?? null,
    };
  }

  private getOrderItemProduct(item: any): any {
    if (item?.product && typeof item.product === 'object') {
      return item.product;
    }
    if (item?.productId && typeof item.productId === 'object') {
      return item.productId;
    }
    if (item?.productData && typeof item.productData === 'object') {
      return item.productData;
    }
    return item || {};
  }

  private getOrderItemProductId(item: any, product: any): string | null {
    const candidates = [
      product?._id,
      product?.id,
      typeof item?.product === 'string' ? item.product : null,
      typeof item?.productId === 'string' ? item.productId : null,
      item?._id,
      item?.id,
    ];
    const id = candidates.find((candidate) => ObjectId.isValid(candidate));
    return id ? String(id) : null;
  }

  private getOrderItemImage(item: any, product: any): string | null {
    if (item?.image) {
      return item.image;
    }
    if (Array.isArray(item?.images) && item.images.length) {
      return item.images[0];
    }
    if (Array.isArray(product?.images) && product.images.length) {
      return product.images[0];
    }
    return product?.image ?? null;
  }

  private normalizeOrderItemRef(value: any): any {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return {
      _id: ObjectId.isValid(value?._id) ? value._id : undefined,
      name: value?.name,
      slug: value?.slug,
    };
  }

  private toFiniteNumber(value: any, fallback = 0): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  private async markIncompleteOrderConverted(
    incompleteOrderId: string,
    orderId: string,
  ): Promise<void> {
    if (!ObjectId.isValid(incompleteOrderId)) {
      this.logger.warn(`Invalid incomplete order id: ${incompleteOrderId}`);
      return;
    }

    await this.incompleteOrderModel.findByIdAndUpdate(incompleteOrderId, {
      $set: {
        status: 'converted',
        orderId,
      },
    });
  }

  private async cleanupIncompleteOrdersForPlacedOrder(
    saveData: any,
    exceptIncompleteOrderId?: string,
  ): Promise<void> {
    if (!saveData?.phoneNo) {
      return;
    }

    // A real order now exists for this phone, so any abandoned checkout for it
    // is no longer abandoned — DELETE it (it should not appear on the incomplete
    // page at all). The single record that was converted from the incomplete
    // page (exceptIncompleteOrderId) is kept and marked 'converted' separately.
    const createdAt = saveData.createdAt || new Date();
    const match: any = {
      phoneNo: saveData.phoneNo,
      createdAt: { $lte: createdAt },
    };
    if (
      exceptIncompleteOrderId &&
      ObjectId.isValid(exceptIncompleteOrderId)
    ) {
      match._id = { $ne: new ObjectId(exceptIncompleteOrderId) };
    }
    await this.incompleteOrderModel.deleteMany(match);
  }

  async addOrderByUser(
    addOrderDto: AddOrderDto,
    user: User,
  ): Promise<ResponsePayload> {
    // Add user ID on order dto
    if (user) {
      addOrderDto.user = user._id;
    }
    return this.addOrder(addOrderDto);
  }

  async addOrderByAnonymous(
    addOrderDto: AddOrderDto,
  ): Promise<ResponsePayload> {
    // Add user ID on order dto
    // if (user) {
    //   addOrderDto.user = user._id;
    // }
    return this.addOrder(addOrderDto);
  }

  async updateDate(): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel.find();

      if (data) {
        data.forEach(async (f) => {
          const date = this.utilsService.getDateString(f.preferredDate);
          // console.log('updateDate', date);
          await this.orderModel.findByIdAndUpdate(f._id, {
            $set: { preferredDateString: date },
            // $unset: {preferredDate: ''}
          });
        });
      }

      return {
        success: true,
        message: 'Date updated successfully!',
        data: null,
      };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async checkFraudSpy(phoneNo: string): Promise<ResponsePayload> {
    try {
      const fraudData = await this.courierService.checkFraudOrder(phoneNo);
      return {
        success: true,
        message: 'Fraud check completed',
        data: fraudData,
      };
    } catch (err) {
      this.logger.error('Fraud check failed: ' + err.message);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getRepeatCustomers(): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel.aggregate([
        { $group: { _id: '$phoneNo', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 }, _id: { $nin: [null, ''] } } },
        { $project: { _id: 0, phoneNo: '$_id', count: 1 } },
      ]);
      return { success: true, message: 'Success', data } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * getRecentBuyersByProduct
   * Public, privacy-capped feed for the product-page social-proof ticker.
   * Returns ONLY first name + purchase time of recent buyers of a product.
   * No full name, phone, email, or address is ever exposed.
   */
  async getRecentBuyersByProduct(slug: string): Promise<ResponsePayload> {
    try {
      if (!slug) {
        return { success: true, message: 'No slug', data: [] } as ResponsePayload;
      }

      // Serve from cache when fresh — protects DB under high pageview volume.
      const cached = recentBuyersCache.get(slug);
      if (cached && Date.now() - cached.at < RECENT_BUYERS_TTL_MS) {
        return {
          success: true,
          message: 'Success',
          data: cached.data,
        } as ResponsePayload;
      }

      const limit = 12;
      const orders = await this.orderModel
        .find({ 'orderedItems.slug': slug }, { name: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .maxTimeMS(2000) // abort a runaway query instead of piling up connections
        .lean();

      const data = (orders || [])
        .map((o: any) => {
          const firstName = (o?.name || '')
            .toString()
            .trim()
            .split(/\s+/)[0];
          if (!firstName) return null;
          return { firstName, purchasedAt: o?.createdAt ?? null };
        })
        .filter(Boolean);

      recentBuyersCache.set(slug, { at: Date.now(), data });
      return { success: true, message: 'Success', data } as ResponsePayload;
    } catch (err) {
      // Public, non-critical feed. Never 500 a product page over it — degrade
      // to an empty list (the ticker then shows the urgency line only).
      this.logger.warn('getRecentBuyersByProduct failed: ' + err.message);
      return { success: true, message: 'Success', data: [] } as ResponsePayload;
    }
  }

  private async buildInvoicePayload(fOrderData: any) {
    const fShopInfo = await this.shopInformationModel.findOne({});

    return {
      _id: fOrderData._id,
      shopLogo: fShopInfo?.navLogo,
      signatureImage: null,
      shopName: fShopInfo?.siteName,
      shopPhoneNo: fShopInfo?.phones?.length
        ? fShopInfo?.phones[0]?.value
        : '-',
      shopWhatsappNo: fShopInfo?.phones?.length
        ? fShopInfo?.phones[0]?.value
        : '-',
      shopAddress: fShopInfo?.addresses?.length
        ? fShopInfo?.addresses[0]?.value
        : '-',
      shopEmail: fShopInfo?.emails?.length ? fShopInfo?.emails[0]?.value : '-',
      orderId: fOrderData.orderId,
      customerId: null,
      name: fOrderData.name,
      phoneNo: fOrderData.phoneNo,
      address: fOrderData.addresses,
      additionalDiscount: fOrderData.additionalDiscount,
      division: fOrderData.division?.name,
      area: fOrderData.area?.name,
      shippingAddress: fOrderData.shippingAddress,
      date: fOrderData?.checkoutDate,
      paymentStatus: fOrderData?.paymentStatus,
      subTotal: fOrderData.subTotal,
      discount: fOrderData.discount,
      deliveryCharge: fOrderData.deliveryCharge,
      weightBasedDeliveryCharge: fOrderData.weightBasedDeliveryCharge || 0,
      grandTotal: fOrderData.grandTotal,
      items: fOrderData.orderedItems,
      couponDiscount: fOrderData.couponDiscount,
      deliveryNote: fOrderData.deliveryNote,
      paymentType: fOrderData.paymentType,
      paidAmount: fOrderData.paidAmount,
      advancePaymentStatus: fOrderData.advancePaymentStatus,
      advancePayment: fOrderData.advancePayment,
      trackingId: fOrderData.trackingId ?? null,
      customerNotes: fOrderData.customerNotes ?? null,
    };
  }

  async generateInvoicesByIds(ids: string[]): Promise<ResponsePayload> {
    try {
      const objectIds = ids.map((id) => new Types.ObjectId(id));
      const orders = await this.orderModel.find({ _id: { $in: objectIds } });

      // না পাওয়া গেলে খালি
      if (!orders?.length) {
        return { success: true, message: 'No orders found', data: [] };
      }

      // payloads
      const payloads = [];
      for (const order of orders) {
        const plain = JSON.parse(JSON.stringify(order));
        const invoice = await this.buildInvoicePayload(plain);
        payloads.push(invoice);
      }

      return {
        success: true,
        message: 'Success',
        data: payloads,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Invoice Methods
   * generateInvoiceById()
   */

  async generateInvoiceById(
    shop: string,
    id: string,
  ): Promise<ResponsePayload> {
    try {
      const fShopInfo = await this.shopInformationModel.findOne({
        shop: shop,
      });

      const fOrderData = JSON.parse(
        JSON.stringify(await this.orderModel.findById(id)),
      );

      const invoiceData = {
        _id: fOrderData._id,
        shopLogo: fShopInfo.navLogo,
        signatureImage: null,
        shopName: fShopInfo.siteName,
        shopPhoneNo: fShopInfo.phones.length ? fShopInfo.phones[0].value : '-',
        shopWhatsappNo: fShopInfo.phones.length
          ? fShopInfo.phones[0].value
          : '-',
        shopAddress: fShopInfo.addresses.length
          ? fShopInfo.addresses[0].value
          : '-',
        shopEmail: fShopInfo.emails.length ? fShopInfo.emails[0].value : '-',
        orderId: fOrderData.orderId,
        customerId: null,
        name: fOrderData.name,
        phoneNo: fOrderData.phoneNo,
        sku: fOrderData.sku,
        address: fOrderData.addresses,
        additionalDiscount: fOrderData.additionalDiscount,
        shippingAddress: fOrderData.shippingAddress,
        date: fOrderData?.checkoutDate,
        paymentStatus: fOrderData?.paymentStatus,
        subTotal: fOrderData.subTotal,
        discount: fOrderData.discount,
        deliveryCharge: fOrderData.deliveryCharge,
        weightBasedDeliveryCharge: fOrderData.weightBasedDeliveryCharge || 0,
        grandTotal: fOrderData.grandTotal,
        items: fOrderData.orderedItems.map((item) => ({
          ...item,
          sku: item.variation?.sku ?? item.sku ?? null,
        })),
        couponDiscount: fOrderData.couponDiscount,
        deliveryNote: fOrderData.deliveryNote,
        paymentType: fOrderData.paymentType,
        paidAmount: fOrderData.paidAmount,
        advancePaymentStatus: fOrderData.advancePaymentStatus,
        advancePayment: fOrderData?.advancePayment,
        postCode: fOrderData?.postCode,
        trackingId: fOrderData?.courierData
          ? fOrderData.courierData.providerName === 'Pathao Courier'
            ? fOrderData.courierData.consignmentId ??
              fOrderData.courierData.trackingId ??
              null
            : fOrderData.courierData.consignmentId ??
              fOrderData.courierData.trackingId ??
              null
          : null,
        providerName: fOrderData?.courierData?.providerName ?? null,
      };

      return {
        success: true,
        message: 'Success',
        data: invoiceData,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getOrderByOrderId(
    orderId: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel
        .findOne({ orderId: orderId })
        .select(select);
      return {
        success: true,
        message: 'Success! Order fetch successfully.',
        data,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async insertManyOrder(
    addOrdersDto: AddOrderDto[],
    optionOrderDto: OptionOrderDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionOrderDto;
    if (deleteMany) {
      await this.orderModel.deleteMany({});
    }
    const mData = await Promise.all(addOrdersDto.map(async (m: any) => {
      return {
        ...m,
        orderedItems: await this.attachCostSnapshots(m.orderedItems || []),
        attribution: this.normalizeAttribution(m.attribution),
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    }));
    try {
      const saveData = await this.orderModel.insertMany(mData);
      return {
        success: true,
        message: `${
          saveData && saveData.length ? saveData.length : 0
        }  Data Added Success`,
      } as ResponsePayload;
    } catch (error) {
      // console.log(error);
      if (error?.code && error?.code?.toString() === ErrorCodes?.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error?.message);
      }
    }
  }

  /**
   * getAllOrders
   * getOrderById
   */
  async getAllOrders(
    filterOrderDto: FilterAndPaginationOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterOrderDto;
    const { pagination } = filterOrderDto;
    const { sort } = filterOrderDto;
    const { select } = filterOrderDto;

    // Calculations
    const aggregateStagesCalculation = [];
    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }

    // Coerce YYYY-MM-DD string date filters to Date objects (timestamps: true stores Date)
    const mf = mFilter as any;
    const coerceDate = (dateStr: string, endOfDay: boolean): Date => {
      const iso = endOfDay
        ? dateStr + 'T23:59:59.999+06:00'
        : dateStr + 'T00:00:00.000+06:00';
      return new Date(iso);
    };
    if (mf.createdAt && typeof mf.createdAt === 'object') {
      if (mf.createdAt.$gte && typeof mf.createdAt.$gte === 'string')
        mf.createdAt.$gte = coerceDate(mf.createdAt.$gte, false);
      if (mf.createdAt.$lte && typeof mf.createdAt.$lte === 'string')
        mf.createdAt.$lte = coerceDate(mf.createdAt.$lte, true);
    }

    if (searchQuery) {
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { orderId: { $regex: searchQuery, $options: 'i' } },
              { phoneNo: { $regex: searchQuery, $options: 'i' } },
              { name: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        ],
      };
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
      const group = {
        $group: {
          _id: null,
          grandTotal: { $sum: '$grandTotal' },
          // totalPaid: { $sum: '$paidAmount' },
          // totalDiscount: { $sum: '$discount' },
        },
      };
      aggregateStagesCalculation.push({ $match: mFilter });
      aggregateStagesCalculation.push(group);
    } else {
      const group = {
        $group: {
          _id: null,
          grandTotal: { $sum: '$grandTotal' },
          // totalPaid: { $sum: '$paidAmount' },
          // totalDiscount: { $sum: '$discount' },
        },
      };
      aggregateStagesCalculation.push(group);
    }

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateStages.push({ $project: mSelect });
    }

    // Pagination
    if (pagination) {
      if (Object.keys(mSelect).length) {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
              { $project: mSelect },
            ],
          },
        };
      } else {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
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
      const dataAggregates = await this.orderModel.aggregate(aggregateStages);
      const calculateAggregates = await this.orderModel.aggregate(
        aggregateStagesCalculation,
      );
      if (pagination) {
        return {
          ...{ ...dataAggregates[0] },
          ...{
            calculation: calculateAggregates[0],
            success: true,
            message: 'Success',
          },
        } as ResponsePayload;
      } else {
        return {
          data: dataAggregates,
          //
          success: true,
          message: 'Success',
          count: dataAggregates.length,
        } as ResponsePayload;
      }
    } catch (err) {
      this.logger.error(err);
      if (
        err?.code &&
        err?.code?.toString() === ErrorCodes?.PROJECTION_MISMATCH
      ) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  /**
   * Get Sales Statistics by Publisher or Category
   * getSalesStatsByFilter()
   */
  async getSalesStatsByFilter(
    filterType: 'publisher' | 'category',
    filterId: string,
  ): Promise<ResponsePayload> {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Convert filterId to ObjectId
      const filterObjectId = new Types.ObjectId(filterId);

      // Build match condition based on filter type
      const matchCondition =
        filterType === 'publisher'
          ? { 'orderedItems.publisher._id': filterObjectId }
          : { 'orderedItems.category._id': filterObjectId };

      // Aggregate query for today's sales
      const todayStats = await this.orderModel.aggregate([
        {
          $match: {
            checkoutDate: {
              $gte: today,
              $lt: tomorrow,
            },
            orderStatus: { $ne: 6 }, // Exclude cancelled orders
          },
        },
        {
          $unwind: '$orderedItems',
        },
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: null,
            todayBooksSold: { $sum: '$orderedItems.quantity' },
            todaySalesAmount: {
              $sum: {
                $multiply: [
                  '$orderedItems.unitPrice',
                  '$orderedItems.quantity',
                ],
              },
            },
          },
        },
      ]);

      // Aggregate query for all-time sales (with total amount)
      const allTimeStats = await this.orderModel.aggregate([
        {
          $match: {
            orderStatus: { $ne: 6 }, // Exclude cancelled orders
          },
        },
        {
          $unwind: '$orderedItems',
        },
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: null,
            totalBooksSold: { $sum: '$orderedItems.quantity' },
            totalSalesAmount: {
              $sum: {
                $multiply: [
                  '$orderedItems.unitPrice',
                  '$orderedItems.quantity',
                ],
              },
            },
          },
        },
      ]);

      const result = {
        todayBooksSold: todayStats[0]?.todayBooksSold || 0,
        todaySalesAmount: todayStats[0]?.todaySalesAmount || 0,
        totalBooksSold: allTimeStats[0]?.totalBooksSold || 0,
        totalSalesAmount: allTimeStats[0]?.totalSalesAmount || 0,
      };

      return {
        success: true,
        message: 'Sales statistics retrieved successfully',
        data: result,
      } as ResponsePayload;
    } catch (error) {
      this.logger.error('Error getting sales stats:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getOrdersByUser(
    user: User,
    filterOrderDto: FilterAndPaginationOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterOrderDto;

    let mFilter;

    if (filter) {
      mFilter = { ...{ user: new ObjectId(user._id) }, ...filter };
    } else {
      mFilter = { user: new ObjectId(user._id) };
    }

    filterOrderDto.filter = mFilter;

    return this.getAllOrders(filterOrderDto, searchQuery);
  }

  async getOrderById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateOrderById
   * updateMultipleOrderById
   */
  async updateOrderById(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<ResponsePayload> {
    const { name, orderStatus } = updateOrderDto;
    let data;
    try {
      data = await this.orderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.orderModel.findByIdAndUpdate(id, {
        $set: updateOrderDto,
      }, { strict: false });

      // Setting Data
      const fSetting: any = await this.settingModel
        .findOne()
        .select(
          'smsSendingOption currency smsMethods orderSetting courierMethods -_id',
        );

      // Product Setting Providers
      const fProductSetting = fSetting?.productSetting ?? {};
      // Courier Providers
      const fCourierMethods = fSetting?.courierMethods ?? [];
      const courierMethod = fCourierMethods.find(
        (f: any) => f.status === 'active',
      );

      // Sms Providers
      const fSmsMethods = fSetting?.smsMethods ?? [];
      const smsMethod = fSmsMethods.find((f) => f.status === 'active');
      const smsSendingOption = fSetting?.smsSendingOption;

      if (orderStatus) {
        // await this.adjustDataOnOrderStatusUpdate({
        //   order_id: id,
        //   orderStatus: orderStatus,
        //   smsMethod: smsMethod,
        //   smsSendingOption: smsSendingOption,
        //   fProductSetting: fProductSetting,
        // });

        // Courier Manage
        this.addSingleOrderToCourier({
          orderStatus: orderStatus,
          courierMethod: courierMethod,
          id: id,
        });
      }
      return {
        success: true,
        message: 'Order updated successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultipleOrderById(
    ids: string[],
    updateOrderDto: UpdateOrderDto,
  ): Promise<ResponsePayload> {
    const { orderStatus } = updateOrderDto;
    const mIds = ids.map((m) => new ObjectId(m));

    // const orderStatusRaw = updateOrderDto?.orderStatus
    //   ? String(updateOrderDto.orderStatus).trim()
    //   : '';

    // const hasOrderStatus = !!orderStatusRaw;

    try {
      await this.orderModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateOrderDto },
      );
      const fSetting = await this.settingModel
        .findOne()
        .select(
          'smsSendingOption currency smsMethods productSetting courierMethods -_id',
        );
      // Courier Providers
      const fCourierMethods = fSetting?.courierMethods ?? [];
      const courierMethod = fCourierMethods.find(
        (f: any) => f.status === 'active',
      );
      // Sms Providers
      const fSmsMethods = fSetting?.smsMethods ?? [];
      const smsMethod = fSmsMethods.find((f) => f.status === 'active');
      const smsSendingOption = fSetting?.smsSendingOption;

      // if (hasOrderStatus) {
      // Courier Manage
      this.addMultipleOrderToCourier({
        orderStatus: orderStatus,
        courierMethod: courierMethod,
        mIds: mIds,
      });
      // // console.log('mIds', mIds);
      // for (const id of mIds) {
      //   await this.adjustDataOnOrderStatusUpdate({
      //     order_id: id,
      //     orderStatus: orderStatus,
      //     smsMethod: smsMethod,
      //     smsSendingOption: smsSendingOption,
      //     fProductSetting: fProductSetting,
      //   });
      // }
      // }

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async sendToCourier(id: string): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel.findOne();
      const courierMethods = fSetting?.courierMethods ?? [];
      const courierMethod = courierMethods.find((f: any) => f.status === 'active');
      await this.addSingleOrderToCourier({ orderStatus: 8, courierMethod, id });
      await this.orderModel.findByIdAndUpdate(id, { $set: { orderStatus: 2 } });
      return { success: true, message: 'Order sent to courier successfully' } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Courier Methods
   * addSingleOrderToCourier()
   * addMultipleOrderToCourier()
   */

  private async addSingleOrderToCourier(data: {
    orderStatus: any;
    courierMethod: any;
    id: string;
  }) {
    const { orderStatus, courierMethod, id } = data;
    if (orderStatus === 8 && courierMethod) {
      const courierApiConfig: CourierApiConfig = {
        providerName: courierMethod?.providerName,
        apiKey: courierMethod?.apiKey,
        secretKey: courierMethod?.secretKey,
        merchantCode: courierMethod?.merchantCode,
        pickMerchantThana: courierMethod?.thana,
        pickMerchantDistrict: courierMethod?.district,
        pickMerchantAddress: courierMethod?.address,
        pickMerchantName: courierMethod?.merchant_name,
        pickupMerchantPhone: courierMethod?.contact_number,
        username: courierMethod?.username,
        password: courierMethod?.password,
        specialInstruction: courierMethod?.specialInstruction,
        storeId: courierMethod?.storeId,
      };
      const fOrder = await this.orderModel.findById(id);
      const mdata = {};
      if (courierMethod?.providerName === 'Steadfast Courier') {
        if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
        } else {
          const getFullAddress = () => {
            const parts: string[] = [];
            if (fOrder?.division?.name) parts.push(fOrder.division.name);
            const area = typeof fOrder?.area === 'object' ? fOrder?.area?.name : fOrder?.area;
            if (area) parts.push(area);
            if (fOrder?.zone?.name) parts.push(fOrder.zone.name);
            if (fOrder?.shippingAddress) parts.push(fOrder.shippingAddress);
            return parts.join(', ');
          };

          const cashOnDeliveryAmount = () => {
            if (fOrder?.paymentStatus === 'paid') {
              return 0;
            } else {
              return fOrder?.grandTotal ?? 0;
            }
          };
          const payload: SteadfastCourierPayload = {
            invoice: fOrder?.orderId,
            recipient_name: fOrder?.name,
            recipient_phone: fOrder?.phoneNo,
            recipient_email: fOrder?.email ?? null,
            recipient_address: getFullAddress(),
            cod_amount: cashOnDeliveryAmount(),
            item_description:
              fOrder?.orderedItems?.map((i: any) => `${i.name} x${i.quantity || 1}`).join(', ') || '',
            note: fOrder?.deliveryNote
              ? `${fOrder.deliveryNote} (${
                  courierMethod?.specialInstruction || ''
                })`
              : courierMethod?.specialInstruction || '',
          };

          // console.log('payload', payload);

          const courierResponse =
            await this.courierService.createOrderWithProvider(
              courierApiConfig,
              payload,
            );

          if (courierResponse.status === 200) {
            // console.log('courierResponse', courierResponse);

            const orderCourierData = {
              providerName: 'Steadfast Courier',
              consignmentId: courierResponse?.consignment?.consignment_id,
              trackingId: courierResponse?.consignment?.tracking_code,
              createdAt: this.utilsService.getDateString(new Date()),
            };
            await this.orderModel.findByIdAndUpdate(id, {
              $set: {
                courierData: orderCourierData,
              },
            });
          }
        }
      }

      if (courierMethod?.providerName === 'Pathao Courier') {
        // if (courierMethod) {
        if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
        } else {
          console.log('fOrder', fOrder);
          const courierResponse =
            await this.courierService.createOrderWithProvider(
              courierApiConfig,
              fOrder,
            );

          console.log('courierResponse', courierResponse);

          if (courierResponse.code === 200) {
            const orderCourierData = {
              providerName: courierMethod?.providerName,
              consignmentId: courierResponse?.data?.consignment_id,
              trackingId: courierResponse?.data?.merchant_order_id,
              createdAt: this.utilsService.getDateString(new Date()),
            };
            await this.orderModel.findByIdAndUpdate(id, {
              $set: {
                courierData: orderCourierData,
              },
            });
          }
        }
      }
      if (courierMethod?.providerName === 'Paperfly Courier') {
        if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
        } else {
          const getFullAddress = () => {
            return `${fOrder?.division?.name}, ${fOrder?.area?.name}, ${fOrder?.shippingAddress}`;
          };

          const cashOnDeliveryAmount = () => {
            if (fOrder?.paymentStatus === 'paid') {
              return 0;
            } else {
              return fOrder?.grandTotal ?? 0;
            }
          };
          const payload = {
            merOrderRef: fOrder?.orderId,
            custname: fOrder.name,
            custPhone: fOrder.phoneNo,
            custaddress: getFullAddress(), // Provide a fallback
            customerThana: fOrder.area?.name ?? 'Mirpur',
            customerDistrict: fOrder.division?.name,
            productSizeWeight: 'standard', // Adjust if needed
            productBrief:
              this.getOrderItemProductNames(fOrder?.orderedItems) ||
              'No description',
            packagePrice: fOrder?.grandTotal, // Total price
            max_weight: 1, // Adjust based on requirements
            deliveryOption: 'regular',
            merchantCode: courierMethod?.merchantCode,
            pickMerchantThana: courierMethod?.thana,
            pickMerchantDistrict: courierMethod?.district,
            pickMerchantAddress: courierMethod?.address,
            pickMerchantName: courierMethod?.merchant_name,
            pickupMerchantPhone: courierMethod?.contact_number,
            special_instruction: courierMethod?.specialInstruction ?? '',
          };

          const courierResponse =
            await this.courierService.createOrderWithProvider(
              courierApiConfig,
              payload,
            );
          if (courierResponse.response_code === 200) {
            const orderCourierData = {
              providerName: 'Paperfly Courier',
              trackingId: courierResponse?.success?.tracking_number,
              consignmentId: courierResponse?.success?.tracking_number,
              createdAt: this.utilsService.getDateString(new Date()),
            };
            await this.orderModel.findByIdAndUpdate(id, {
              $set: {
                courierData: orderCourierData,
              },
            });
          }
        }
      }
    }
  }

  getOrderItemProductNames(orderItems: any[]): string {
    // Extract product names and join them with a comma
    return orderItems
      .map((item: any) => item?.name || '') // Safely access 'name' and handle missing values
      .filter((name) => name) // Remove empty or undefined names
      .join(',');
  }

  private async addMultipleOrderToCourier(data: {
    orderStatus: any;
    courierMethod: any;
    mIds: any[];
  }) {
    const { orderStatus, courierMethod, mIds } = data;
    if (orderStatus === 8 && courierMethod) {
      const courierApiConfig: CourierApiConfig = {
        providerName: courierMethod?.providerName,
        apiKey: courierMethod?.apiKey,
        secretKey: courierMethod?.secretKey,
        merchantCode: courierMethod?.merchantCode,
        pickMerchantThana: courierMethod?.thana,
        pickMerchantDistrict: courierMethod?.district,
        pickMerchantAddress: courierMethod?.address,
        pickMerchantName: courierMethod?.merchant_name,
        pickupMerchantPhone: courierMethod?.contact_number,
        username: courierMethod?.username,
        password: courierMethod?.password,
        specialInstruction: courierMethod?.specialInstruction ?? '',
        storeId: courierMethod?.storeId,
      };
      for (const id of mIds) {
        const fOrder = await this.orderModel.findById(id);

        if (courierMethod?.providerName === 'Steadfast Courier') {
          if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
          } else {
            const getFullAddress = () => {
              const parts: string[] = [];
              if (fOrder?.division?.name) parts.push(fOrder.division.name);
              const area = typeof fOrder?.area === 'object' ? fOrder?.area?.name : fOrder?.area;
              if (area) parts.push(area);
              if (fOrder?.zone?.name) parts.push(fOrder.zone.name);
              if (fOrder?.shippingAddress) parts.push(fOrder.shippingAddress);
              return parts.join(', ');
            };

            const cashOnDeliveryAmount = () => {
              if (fOrder?.paymentStatus === 'paid') {
                return 0;
              } else {
                return fOrder?.grandTotal ?? 0;
              }
            };
            const payload: SteadfastCourierPayload = {
              invoice: fOrder?.orderId,
              recipient_name: fOrder?.name,
              recipient_phone: fOrder?.phoneNo,
              recipient_address: getFullAddress(),
              cod_amount: cashOnDeliveryAmount(),
              item_description:
                fOrder?.orderedItems?.map((i: any) => `${i.name} x${i.quantity || 1}`).join(', ') || '',
              note: fOrder?.deliveryNote
                ? `${fOrder.deliveryNote} (${
                    courierMethod?.specialInstruction || ''
                  })`
                : courierMethod?.specialInstruction || '',
            };

            // console.log('payload', payload);

            const courierResponse =
              await this.courierService.createOrderWithProvider(
                courierApiConfig,
                payload,
              );
            if (courierResponse.status === 200) {
              // console.log('courierResponse', courierResponse);
              const orderCourierData = {
                providerName: 'Steadfast Courier',
                consignmentId: courierResponse?.consignment?.consignment_id,
                trackingId: courierResponse?.consignment?.tracking_code,
                createdAt: this.utilsService.getDateString(new Date()),
              };
              await this.orderModel.findByIdAndUpdate(id, {
                $set: {
                  courierData: orderCourierData,
                },
              });
            }
          }
        }

        if (courierMethod?.providerName === 'Pathao Courier') {
          // if (courierMethod) {
          if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
          } else {
            const courierResponse =
              await this.courierService.createOrderWithProvider(
                courierApiConfig,
                fOrder,
              );

            if (courierResponse.code === 200) {
              const orderCourierData = {
                providerName: courierMethod?.providerName,
                consignmentId: courierResponse?.data?.consignment_id,
                trackingId: courierResponse?.data?.merchant_order_id,
                createdAt: this.utilsService.getDateString(new Date()),
              };
              await this.orderModel.findByIdAndUpdate(id, {
                $set: {
                  courierData: orderCourierData,
                },
              });
            }
          }
        }
        if (courierMethod?.providerName === 'Paperfly Courier') {
          if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
          } else {
            const getFullAddress = () => {
              return `${fOrder?.division?.name}, ${fOrder?.area?.name}, ${fOrder?.shippingAddress}`;
            };

            const cashOnDeliveryAmount = () => {
              if (fOrder?.paymentStatus === 'paid') {
                return 0;
              } else {
                return fOrder?.grandTotal ?? 0;
              }
            };
            const payload = {
              merOrderRef: fOrder?.orderId,
              custname: fOrder.name,
              custPhone: fOrder.phoneNo,
              custaddress: getFullAddress(), // Provide a fallback
              // customerThana: fOrder.area,
              customerThana: fOrder.area?.name ?? 'Mirpur',
              customerDistrict: fOrder.division?.name,
              productSizeWeight: 'standard', // Adjust if needed
              productBrief:
                this.getOrderItemProductNames(fOrder?.orderedItems) ||
                'No description',
              packagePrice: fOrder?.grandTotal, // Total price
              max_weight: 1, // Adjust based on requirements
              deliveryOption: 'regular',
              merchantCode: courierMethod?.merchantCode,
              pickMerchantThana: courierMethod?.thana,
              pickMerchantDistrict: courierMethod?.district,
              pickMerchantAddress: courierMethod?.address,
              pickMerchantName: courierMethod?.merchant_name,
              pickupMerchantPhone: courierMethod?.contact_number,
              special_instruction: courierMethod?.specialInstruction ?? '',
            };

            const courierResponse =
              await this.courierService.createOrderWithProvider(
                courierApiConfig,
                payload,
              );
            if (courierResponse.response_code === 200) {
              const orderCourierData = {
                providerName: 'Paperfly Courier',
                trackingId: courierResponse?.success?.tracking_number,
                consignmentId: courierResponse?.success?.tracking_number,
                createdAt: this.utilsService.getDateString(new Date()),
              };
              await this.orderModel.findByIdAndUpdate(id, {
                $set: {
                  courierData: orderCourierData,
                },
              });
            }
          }
        }
      }
    }
  }

  async updateOrderSessionKey(
    id: string,
    updateOrderDto: any,
  ): Promise<ResponsePayload> {
    try {
      await this.orderModel.findByIdAndUpdate(id, {
        $set: updateOrderDto,
      });

      return {
        success: true,
        message: 'Order updated successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async changeOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<ResponsePayload> {
    const { orderStatus } = updateOrderStatusDto;

    let data;
    try {
      data = await this.orderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      // console.log('updateOrderStatusDto', updateOrderStatusDto);
      let deliveryDate;
      let deliveryDateString;
      // console.log('orderStatus', orderStatus);
      if (orderStatus === 5) {
        deliveryDate = this.utilsService.getLocalDateTime();
        deliveryDateString = this.utilsService.getDateString(
          this.utilsService.getLocalDateTime(),
        );
      } else {
        deliveryDate = null;
        deliveryDateString = null;
      }

      // console.log('data', data);
      let orderTimeline;
      if (data.hasOrderTimeline) {
        orderTimeline = data.orderTimeline;
        if (orderStatus === OrderStatus.CONFIRM) {
          orderTimeline.confirmed = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: null,
          };
        } else if (orderStatus === OrderStatus.PROCESSING) {
          orderTimeline.processed = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: data.orderTimeline.processed.expectedDate,
          };
        } else if (orderStatus === OrderStatus.SHIPPING) {
          orderTimeline.shipped = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: data.orderTimeline.shipped.expectedDate,
          };
        } else if (orderStatus === OrderStatus.DELIVERED) {
          orderTimeline.delivered = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: data.orderTimeline.delivered.expectedDate,
          };
          if (!orderTimeline.confirmed.success) {
            orderTimeline.confirmed = {
              success: true,
              date: this.utilsService.getLocalDateTime(),
              expectedDate: null,
            };
          }
          if (!orderTimeline.processed.success) {
            orderTimeline.processed = {
              success: true,
              date: this.utilsService.getLocalDateTime(),
              expectedDate: data.orderTimeline.processed.expectedDate,
            };
          }
          if (!orderTimeline.shipped.success) {
            orderTimeline.shipped = {
              success: true,
              date: this.utilsService.getLocalDateTime(),
              expectedDate: data.orderTimeline.shipped.expectedDate,
            };
          }
        } else if (orderStatus === OrderStatus.CANCEL) {
          orderTimeline.canceled = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: null,
          };
        } else if (orderStatus === OrderStatus.REFUND) {
          orderTimeline.refunded = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: null,
          };
        }
      } else {
        orderTimeline = null;
      }

      // Restock: only if stock was actually decremented for this order and
      // it hasn't already been restocked (idempotent — toggling the status
      // back and forth won't double-restock).
      const isRestockStatus = [
        OrderStatus.CANCEL,
        OrderStatus.REFUND,
        OrderStatus.RETURN,
      ].includes(orderStatus);
      const shouldRestock =
        isRestockStatus && data.stockDecremented === true && !data.stockRestocked;

      const mData: any = {
        courierLink: updateOrderStatusDto.courierLink,
        orderStatus: orderStatus,
        orderTimeline: orderTimeline,
        paymentStatus:
          orderStatus === OrderStatus.DELIVERED ? 'paid' : data.paymentStatus,
        deliveryDate: deliveryDate,
        deliveryDateString: deliveryDateString,
      };
      if (shouldRestock) {
        mData.stockRestocked = true;
      }
      await this.orderModel.findByIdAndUpdate(id, {
        $set: mData,
      });

      if (shouldRestock) {
        const restockReason =
          orderStatus === OrderStatus.RETURN
            ? 'return_restock'
            : 'cancel_restock';
        await this.restockProducts(id, data['orderedItems'], restockReason);
      }

      if (orderStatus === 2) {
        const message = `আপনার অর্ডার আইডি ${data?.orderId} নিশ্চিত করা হয়েছে। ডেলিভারি সময়: ঢাকার ভিতরে ১–২ কার্যদিবস, ঢাকার বাইরে ৩–৬ কার্যদিবস। ধন্যবাদ আলম বুক এর সঙ্গে থাকার জন্য।`;
        //const message = `Your order No: ${data?.orderId} has been Shipped. Total Amount ${data?.grandTotal} Tk. Thanks from alambook.com`;
        // const message = `Hi ${data.name} \nwe just conform your order from alambook.com. Your order is estimated to arrive in 1-2 business days.`;
        // const message = `অভিনন্দন! ${updateOrderStatusDto.name} আপনি সফলভাবে অর্ডারটি সম্পূর্ণ করেছেন।`;
        this.bulkSmsService.sentSingleSms(data.phoneNo, message);
        // console.log('orderStatus', data.phoneNo);
      }

      // if (orderStatus === 5) {
      //   const message = `Your order No: ${data?.orderId} has been Delivered. Total Amount ${data?.grandTotal} Tk. Thanks from alambook.com`;
      //   // const message = `অভিনন্দন! ${updateOrderStatusDto.name} আপনি সফলভাবে অর্ডারটি সম্পূর্ণ করেছেন।`;
      //   this.bulkSmsService.sentSingleSms(data.phoneNo, message);
      //   // console.log('orderStatus', data.phoneNo);
      // }

      // if (orderStatus === 4) {
      //   //const message = `Your order No: ${data?.orderId} has been Shipped. Total Amount ${data?.grandTotal} Tk. Thanks from alambook.com`;
      //   const message = `Hi ${data.name} \nwe just shipped your order from alambook.com. Your order is estimated to arrive in 1-2 business days.`;
      //   // const message = `অভিনন্দন! ${updateOrderStatusDto.name} আপনি সফলভাবে অর্ডারটি সম্পূর্ণ করেছেন।`;
      //   this.bulkSmsService.sentSingleSms(data.phoneNo, message);
      //   // console.log('orderStatus', data.phoneNo);
      // }

      // NOTE: previously this block re-decremented the legacy `quantity`
      // field and re-incremented `totalSold` again on DELIVERED — both
      // already happen once at order creation (see `addOrderAdmin`'s
      // orderedItems loop). Removed as part of unifying stock accounting
      // onto the single `stock` field + StockMovement log; keeping it would
      // have double-counted totalSold and kept legacy `quantity` drifting.

      return {
        success: true,
        message: 'Order updated successfully',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  /**
   * deleteOrderById
   * deleteMultipleOrderById
   */
  async deleteOrderById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.orderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.orderModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleOrderById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      await this.orderModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // New Order Make
  private async newOrderMake(orderData: any) {
    let cartItems: any[] = [];

    // Card Data Get
    if (!orderData?.user) {
      const fProducts = JSON.parse(
        JSON.stringify(
          await this.productModel.find({
            _id: { $in: orderData.carts.map((m) => new ObjectId(m)) },
          }),
        ),
      );

      // Fetch special package data if cartType is 1
      const fSpecialPackages = orderData.cartData
        .filter((item) => item.cartType === 1)
        .map((item) => item.specialPackage);

      const specialPackages = fSpecialPackages.length
        ? JSON.parse(
            JSON.stringify(
              await this.specialPackageModel
                .find({
                  _id: { $in: fSpecialPackages.map((id) => new ObjectId(id)) },
                })
                .populate(
                  'products.product',
                  'salePrice costPrice discountType discountAmount variationsOptions hasVariations',
                ),
            ),
          )
        : [];

      if ((fProducts && fProducts.length) || specialPackages) {
        cartItems = orderData.cartData.map((t1) => {
          const productFromFProducts = fProducts.find(
            (t2) => t2._id === t1.product,
          );
          const productFromSpecialPackages = specialPackages.find(
            (t2) =>
              String(t2._id) ===
              String(t1.specialPackage || t1.product),
          );
          return {
            ...t1,
            product: { ...productFromFProducts },
            specialPackage: { ...productFromSpecialPackages },
          };
        });
      }
    } else {
      cartItems = JSON.parse(
        JSON.stringify(
          await this.cartModel
            .find({ user: orderData.user })
            .populate(
              'product',
              'name nameEn slug author description publisher salePrice costPrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit',
            )
            .populate({
              path: 'specialPackage',
              populate: {
                path: 'products.product',
                select:
                  'salePrice costPrice discountType discountAmount variationsOptions hasVariations',
              },
            }),
        ),
      );
    }

    const finalData = cartItems
      .map((item: any) => {
        if (item.cartType === 1) {
          if (item.specialPackage) {
            const images = [item.specialPackage.image];
            const specialPackage = withCalculatedSpecialPackageSubtotal(
              item.specialPackage,
            );
            return {
              ...item,
              product: { ...specialPackage, images },
            };
          }
          return null;
        }
        return item;
      })
      .filter((item) => item !== null);

    // Order Items

    const products: any = finalData.map((m) => ({
      _id: m.product._id,
      name: m.product.name,
      nameEn: m.product.nameEn,
      slug: m.product.slug,
      image: m.product.images?.[0] || null,
      category: {
        _id: m.product.category?._id,
        name: m.product.category?.name,
        slug: m.product.category?.slug,
      },
      author: {
        _id: m.product.author?._id,
        name: m.product.author?.name,
        slug: m.product.author?.slug,
      },
      publisher: {
        _id: m.product.publisher?._id,
        name: m.product.publisher?.name,
        slug: m.product.publisher?.slug,
      },
      subCategory: {
        _id: m.product.subCategory?._id,
        name: m.product.subCategory?.name,
        slug: m.product.subCategory?.slug,
      },
      brand: {
        _id: m.product.brand?._id,
        name: m.product.brand?.name,
        slug: m.product.brand?.slug,
      },
      discountType: m.product.discountType,
      discountAmount: m.product.discountAmount,
      regularPrice: this.utilsService.transform(m.product, 'regularPrice'),
      unitPrice: this.utilsService.transform(m.product, 'salePrice'),
      salePrice: this.utilsService.transform(m.product, 'salePrice'),
      costPriceAtOrder: this.getProductUnitCostSnapshot(m.product),
      quantity: m.selectedQty,
      orderType: 'regular',
    }));

    // Cart SubTotal
    const cartSubTotal = finalData.reduce(
      (acc, t) =>
        acc +
        this.utilsService.transform(t.product, 'regularPrice', t.selectedQty),
      0,
    );
    // Free-gift (notebook) — zero-prices the gift line if eligible. If the
    // gift product is already a cart line (customer added the notebook
    // themselves, e.g. from the checkout-page "claim" widget), that line is
    // re-priced to 0 in place; otherwise a new zero-price line is appended.
    // Added/adjusted in orderedItems only; does NOT affect subtotal/discount/
    // grandTotal (those are computed above from finalData/cartSubTotal,
    // unaffected by whatever evaluateGiftLine does to `products`).
    const giftLine = await this.evaluateGiftLine(products, finalData);
    if (giftLine) products.push(giftLine);

    // Cart Discount Amount
    const cartDiscountAmount = finalData.reduce(
      (acc, t) =>
        acc +
        this.utilsService.transform(t.product, 'discountAmount', t.selectedQty),
      0,
    );

    // Coupon Discount
    const couponDiscount = await this.calculateCouponDiscount(
      cartSubTotal,
      orderData?.coupon,
    );

    // Order Discount
    const orderDiscount =
      cartSubTotal > 0
        ? await this.calculateOrderDiscount(
            cartSubTotal,
            orderData?.user,
            orderData.orderFrom,
          )
        : 0;

    // Calculate Weight-Based Delivery Charge (for record-keeping only)
    // Note: Frontend already includes weight charge in deliveryCharge, so we don't add it again to grandTotal
    const weightBasedDeliveryCharge = this.calculateWeightBasedDeliveryCharge(
      finalData,
      orderData?.division?.name,
      orderData?.area?.name,
      orderData?.zone?.name,
    );

    // Grand Total
    // Note: orderData?.deliveryCharge already includes weight-based charge from frontend
    // So we don't add weightBasedDeliveryCharge again to avoid double counting
    const grandTotal =
      cartSubTotal +
      orderData?.deliveryCharge -
      couponDiscount -
      cartDiscountAmount -
      orderDiscount;

    // New Order Data
    const newOrderData = {
      name: orderData?.name,
      phoneNo: orderData?.phoneNo,
      shippingAddress: orderData?.shippingAddress,
      division: orderData?.division,
      note: orderData?.note,
      area: orderData?.area,
      zone: orderData?.zone,
      city: orderData?.city,
      orderFrom: orderData?.orderFrom || 'Website',
      manualOrderSource: orderData?.manualOrderSource,
      paymentType: orderData?.paymentType,
      country: orderData?.country,
      paymentStatus: 'unpaid',
      orderStatus: OrderStatus.PENDING,
      orderedItems: products,
      subTotal: cartSubTotal,
      deliveryCharge: orderData?.deliveryCharge || 0,
      weightBasedDeliveryCharge: weightBasedDeliveryCharge,
      discount: cartDiscountAmount.toFixed(2),
      totalSave: cartDiscountAmount,
      grandTotal,
      discountTypes: [{ productDiscount: cartDiscountAmount.toFixed(2) }],
      checkoutDate: this.utilsService.getDateString(new Date()),
      user: orderData?.user || null,
      email: orderData?.email || null,
      coupon: orderData?.coupon ?? null,
      couponDiscount,
      hasOrderTimeline: true,
      orderTimeline: orderData?.orderTimeline,
      attribution: this.normalizeAttribution(orderData?.attribution),
    };

    return newOrderData;
  }

  /**
   * evaluateGiftLine
   * Decides whether a free gift (notebook) should be attached to the order.
   * Config lives on the single OrderOffer doc. Two independent triggers:
   *   A) global   : sale-price subtotal (EXCLUDING the gift product's own
   *                 line) >= giftMinAmount  (any other products)
   *   B) this book: a line with slug === giftBuyXProductSlug and qty >= giftBuyXQty
   *
   * Trigger A deliberately excludes the gift product's own price from the
   * qualifying subtotal — otherwise a customer could add the ৳150 notebook
   * itself to push their cart just over ৳750 and "earn" a discount on a
   * purchase that was never really ৳750 of other books. Mutates `products`
   * in place if the gift product is already a cart line (customer added it
   * themselves, e.g. via the checkout-page auto-add widget), re-pricing it
   * to 0 instead of charging it and instead of skipping the discount — the
   * old behavior did both of those wrong things. Returns a new zero-price
   * ordered-item to be appended by the caller when the gift product isn't
   * already a line, or null (nothing to append — either not eligible, or
   * already handled in place).
   */
  private async evaluateGiftLine(
    products: any[],
    finalData: any[],
  ): Promise<any | null> {
    try {
      const cfg = JSON.parse(
        JSON.stringify(await this.orderOfferModel.findOne({})),
      );
      if (!cfg || !cfg.giftEnabled || !cfg.giftProduct || !cfg.giftProduct._id) {
        return null;
      }

      const giftId = String(cfg.giftProduct._id);
      // Hard guard: a malformed gift id would throw on order .save() and fail
      // the customer's checkout. Never let gift config break an order.
      if (!Types.ObjectId.isValid(giftId)) {
        this.logger.error('evaluateGiftLine: invalid giftProduct._id ' + giftId);
        return null;
      }

      const giftEligibleSubTotal = finalData.reduce((acc, t) => {
        if (String(t.product?._id) === giftId) return acc; // exclude gift's own price
        return (
          acc + this.utilsService.transform(t.product, 'salePrice', t.selectedQty)
        );
      }, 0);

      let eligible = false;
      if (cfg.giftMinAmount && giftEligibleSubTotal >= Number(cfg.giftMinAmount)) {
        eligible = true;
      }
      if (!eligible && cfg.giftBuyXProductSlug && cfg.giftBuyXQty) {
        const match = products.find(
          (p) => p.slug === cfg.giftBuyXProductSlug,
        );
        if (match && Number(match.quantity) >= Number(cfg.giftBuyXQty)) {
          eligible = true;
        }
      }

      const existing = products.find((p) => String(p._id) === giftId);

      if (!eligible) {
        // Not eligible: if the customer manually added the notebook, it
        // stays a normal purchased line at its real price. Nothing to do.
        return null;
      }

      if (existing) {
        // Already a cart line — re-price it to free in place rather than
        // appending a duplicate.
        existing.regularPrice = 0;
        existing.unitPrice = 0;
        existing.salePrice = 0;
        existing.discountType = undefined;
        existing.discountAmount = 0;
        existing.orderType = 'gift';
        existing.isGift = true;
        return null;
      }

      return {
        _id: cfg.giftProduct._id,
        name: cfg.giftProduct.name || cfg.giftLabel || 'উপহার',
        nameEn: cfg.giftProduct.nameEn || 'Free Gift',
        slug: cfg.giftProduct.slug || null,
        image: cfg.giftProduct.image || null,
        regularPrice: 0,
        unitPrice: 0,
        salePrice: 0,
        quantity: 1,
        orderType: 'gift',
        isGift: true,
      };
    } catch (err) {
      // Never block order creation because of the gift step.
      this.logger.error('evaluateGiftLine failed: ' + err.message);
      return null;
    }
  }

  // Calculate Coupon Discount
  async calculateCouponDiscount(
    cartSubTotal: number,
    couponId: any,
  ): Promise<ResponsePayload | any> {
    // Coupon data
    const coupon = JSON.parse(
      JSON.stringify(await this.couponModel.findOne({ _id: couponId })),
    );

    if (!coupon) {
      return 0;
    }

    const discount =
      coupon.discountType === DiscountTypeEnum.PERCENTAGE
        ? Math.floor((coupon.discountAmount / 100) * cartSubTotal)
        : Math.floor(coupon.discountAmount);

    return discount;
  }

  // Calculate Order Discount
  async calculateOrderDiscount(
    cartSubTotal: number,
    userId: any,
    orderFrom: any,
  ): Promise<ResponsePayload | any> {
    // Order Offer Data

    const fOrderOfferData = await this.orderOfferModel.findOne({});

    const orderOfferData = JSON.parse(JSON.stringify(fOrderOfferData));
    let finalData: any;
    let orderDiscount = 0;
    let orderDiscountFromApps = 0;

    // Order Offer Data

    if (orderOfferData) {
      // Order Count
      const orderCount = await this.orderModel.countDocuments({
        user: new ObjectId(userId),
      });
      const currentMonth = this.utilsService.getDateMonth(false, new Date());
      const currentYear = this.utilsService.getDateYear(new Date());

      // Order In Month
      const orderInMonth = await this.orderModel.find({
        user: new ObjectId(userId),
        month: currentMonth,
        year: currentYear,
      });
      const jOrderInMonth = JSON.parse(JSON.stringify(orderInMonth));

      let hasMonthDiscount = false;

      for (const data of jOrderInMonth) {
        if (data.hasMonthDiscount) {
          hasMonthDiscount = true;
        }
      }

      const orderInMonthAmount = jOrderInMonth
        .map((m: any) => m.grandTotal)
        .reduce((acc: number, value: number) => acc + value, 0);

      if (orderCount === 0) {
        finalData = {
          ...orderOfferData,
          ...{
            hasFirstOrderDiscount: true,
          },
        };
      } else {
        finalData = {
          ...orderOfferData,
          ...{
            hasFirstOrderDiscount: false,
            orderInMonthAmount: hasMonthDiscount ? 0 : orderInMonthAmount,
          },
        };
      }
    } else {
      finalData = {
        ...orderOfferData,
        ...{
          hasFirstOrderDiscount: false,
          orderInMonthAmount: null,
        },
      };
    }

    // Final Data
    if (finalData) {
      if (
        cartSubTotal >= finalData.amount3OrderMinAmount &&
        cartSubTotal < finalData.monthOrderMinAmount
      ) {
        if (
          finalData.amount3OrderDiscountType === DiscountTypeEnum.PERCENTAGE
        ) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amount3OrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amount3OrderDiscountAmount,
          );
        }
      } else if (
        cartSubTotal >= finalData.amount3OrderMinAmount &&
        finalData.monthOrderMinAmount! >= 0
      ) {
        if (
          finalData.amount3OrderDiscountType === DiscountTypeEnum.PERCENTAGE
        ) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amount3OrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amount3OrderDiscountAmount,
          );
        }
      } else if (
        cartSubTotal >= finalData.amount2OrderMinAmount &&
        cartSubTotal < finalData.amount3OrderMinAmount
      ) {
        if (
          finalData.amount2OrderDiscountType === DiscountTypeEnum.PERCENTAGE
        ) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amount2OrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amount2OrderDiscountAmount,
          );
        }
      } else if (
        cartSubTotal >= finalData.amountOrderMinAmount &&
        cartSubTotal < finalData.amount2OrderMinAmount
      ) {
        if (finalData.amountOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amountOrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amountOrderDiscountAmount,
          );
        }
      } else if (
        finalData.hasFirstOrderDiscount &&
        cartSubTotal >= finalData.firstOrderDiscountAmount &&
        cartSubTotal < finalData.amountOrderMinAmount
      ) {
        if (finalData.firstOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.firstOrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.firstOrderDiscountAmount,
          );
        }
      } else if (
        finalData.orderInMonthAmount >= finalData.monthOrderValue &&
        finalData.monthOrderMinAmount <= cartSubTotal
      ) {
        if (finalData.monthOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.monthOrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.monthOrderDiscountAmount,
          );
        }
      }

      // Order Discount From Apps

      if (orderFrom && orderFrom === 'Apps') {
        if (
          finalData.appsOrderMinAmount &&
          cartSubTotal >= finalData.appsOrderMinAmount
        ) {
          if (finalData.appsOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
            orderDiscountFromApps = this.utilsService.roundNumber(
              (finalData.appsOrderDiscountAmount / 100) * cartSubTotal,
            );
          } else {
            orderDiscountFromApps = this.utilsService.roundNumber(
              finalData.appsOrderDiscountAmount,
            );
          }
        }
      }

      return orderDiscount + orderDiscountFromApps;
    }
  }

  // Calculate Weight-Based Delivery Charge
  private calculateWeightBasedDeliveryCharge(
    cartItems: any[],
    division?: string,
    area?: string,
    zone?: string,
  ): number {
    // List of Dhaka areas that should NOT have weight charges (use outsideDhaka charge but no weight charge)
    const dhakaOutsideAreas = [
      'Savar >> সাভার',
      'Dohar — দোহার',
      'Nawabganj — নবাবগঞ্জ',
      'Keraniganj — কেরানীগঞ্জ',
      'Dhamrai — ধামরাই',
    ];

    // Check if division is Dhaka (with different possible formats)
    const isDhakaDivision =
      division === 'Dhaka > ঢাকা' ||
      division === 'Dhaka >> ঢাকা' ||
      division === 'Dhaka >ঢাকা';

    // Skip weight charge for:
    // 1. Dhaka division (all areas in Dhaka except specific outside areas)
    // 2. Specific areas in Dhaka that use outsideDhaka charge (Savar, Dohar, etc.)
    if (isDhakaDivision) {
      // If it's one of the specific outside areas, still skip weight charge
      // (they use outsideDhaka base charge but no weight-based charge)
      if (area && dhakaOutsideAreas.includes(area)) {
        return 0;
      }
      // For all other Dhaka areas, skip weight charge
      return 0;
    }

    // Calculate total weight of all items in the cart
    const totalWeight = cartItems.reduce((totalWeight, item) => {
      const itemWeight = item.product?.weight || 0; // Get weight from product, default to 0
      const quantity = item.selectedQty || 1;
      return totalWeight + itemWeight * quantity;
    }, 0);

    // If total weight is above 2000 grams (2 kg), calculate additional delivery charge
    // This only applies to areas outside Dhaka
    if (totalWeight > 2000) {
      const excessWeight = totalWeight - 2000; // Weight above 2000 grams
      const additionalKg = Math.ceil(excessWeight / 1000); // Convert to kg and round up
      const additionalCharge = additionalKg * 15; // 15 taka per kg
      return additionalCharge;
    }

    return 0; // No additional charge if weight is 2000 grams or less
  }

  // Job Scheduler For Courier Status
  private async checkAndUpdateCourierStatus() {
    // schedule.scheduleJob('*/1 * * * *', async () => {
    schedule.scheduleJob('0 */6 * * *', async () => {
      // schedule.scheduleJob('*/20 * * * *', async () => {
      console.log('Get All Courier Status And Update Start...');
      await this.getAllCourierStatusAndUpdate();
    });
  }

  // get All Courier Status And Update

  async getAllCourierStatusAndUpdate(): Promise<void> {
    const last3Days = new Date(
      this.utilsService.getNextDateString(new Date(), -15),
    );
    const formattedDate = last3Days.toISOString().split('T')[0];

    const orders = await this.orderModel.find({
      'courierData.createdAt': { $gte: formattedDate },
      courierData: { $exists: true, $ne: null },
    });

    if (orders.length === 0) {
      console.log('No orders found for the last 3 days with courierData.');
      return;
    }

    const courierMethodArray: { courier: any }[] = [];

    // Step 1: Prepare courier methods per shop
    try {
      const fSetting = await this.settingModel
        .findOne()
        .select('courierMethods -_id');

      const fCourierMethods = fSetting?.courierMethods ?? [];
      const activeCourier = fCourierMethods.find(
        (c: any) => c.status === 'active',
      );

      if (activeCourier) {
        courierMethodArray.push({ courier: activeCourier });
      }
    } catch (err) {
      console.error(`Failed to fetch courier setting`, err);
    }

    // Step 2: Batch process orders
    const BATCH_SIZE = 100;
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (order) => {
        const matchedCourier: any = courierMethodArray;

        if (matchedCourier) {
          try {
            await this.getAndUpdateOrderStatusFromCourier(
              order,
              matchedCourier.courier,
            );
          } catch (err) {
            console.error(
              `Failed to update order ${order._id}`,
              err?.response?.data || err.message,
            );
          }
        }
      });

      // Wait for all promises in the batch to finish (even if some fail)
      await Promise.allSettled(batchPromises);
      console.log(`✅ Processed batch ${i / BATCH_SIZE + 1}`);
    }

    console.log('🎉 All courier status updates complete.');
  }

  async getAndUpdateOrderStatusFromCourier(order: any, courierMethod: any) {
    // Implement your logic here
    let orderStatus: any;
    // Courier Api Config
    const courierApiConfig: CourierApiConfig = {
      providerName: courierMethod?.providerName,
      apiKey: courierMethod?.apiKey,
      merchantCode: courierMethod?.merchantCode,
      pickMerchantThana: courierMethod?.thana,
      pickMerchantDistrict: courierMethod?.district,
      pickMerchantAddress: courierMethod?.address,
      pickMerchantName: courierMethod?.merchant_name,
      pickupMerchantPhone: courierMethod?.contact_number,
      secretKey: courierMethod?.secretKey,
      username: courierMethod?.username,
      password: courierMethod?.password,
    };

    if (order.courierData.consignmentId) {
      const courierResponse =
        await this.courierService.getOrderStatusFormCourier(
          courierApiConfig,
          order.courierData.consignmentId,
          order?.orderId,
        );

      switch (courierResponse && courierMethod?.providerName) {
        case 'Steadfast Courier':
          if (courierResponse.status === 200) {
            switch (courierResponse.delivery_status) {
              case 'delivered':
                orderStatus = 'delivered';
                break;
              case 'cancelled':
                orderStatus = 'cancelled';
                break;
            }

            await this.orderModel.findByIdAndUpdate(order.id, {
              $set: {
                orderStatus: orderStatus,
              },
            });
          }
          break;
        case 'Pathao Courier':
          if (courierResponse.code === 200) {
            console.log(
              'courierResponse.data.order_status',
              courierResponse.data.order_status,
            );
            switch (courierResponse.data.order_status) {
              case 'Delivered':
                orderStatus = 'delivered';
                break;
              case 'Cancelled':
                orderStatus = 'cancelled';
                break;
              case 'Cancel':
                orderStatus = 'cancelled';
                break;
              case 'Return':
                orderStatus = 'refunded';
                break;
              case 'Pending':
                orderStatus = 'Pathao Checking';
                break;

              // case 'Pending':
              //   console.log('Pending');
              //   orderStatus = 'confirmed';
              //   break;
              default:
                orderStatus = courierResponse.data.order_status; // default রাখবে
                break;
            }

            await this.orderModel.findByIdAndUpdate(order.id, {
              $set: {
                orderStatus: orderStatus,
              },
            });
          }
          break;

        case 'Paperfly Courier':
          if (
            courierResponse.response_code === 200 &&
            courierResponse.success?.trackingStatus?.length > 0
          ) {
            const statusObj = courierResponse.success.trackingStatus[0]; // array-এর প্রথম object

            // সবগুলা টাইম বের করে latest খুঁজে বের করি
            const statusKeys = [
              'Pick',
              'inTransit',
              'ReceivedAtPoint',
              'PickedForDelivery',
              'Delivered',
              'Returned',
              'Partial',
              'onHoldSchedule',
              'close',
              'Cancelled',
              'Cancel',
              'Not yet picked',
            ];

            let latestStatus = null;
            let latestTime = null;

            for (const key of statusKeys) {
              const timeKey = key + 'Time';
              const timeStr = statusObj[timeKey];
              if (timeStr) {
                const t = new Date(timeStr);
                if (!latestTime || t > latestTime) {
                  latestTime = t;
                  latestStatus = key;
                }
              }
            }

            let orderStatus: string;

            switch (latestStatus) {
              case 'Delivered':
                orderStatus = 'delivered';
                break;
              case 'Cancelled':
              case 'Cancel':
                orderStatus = 'cancelled';
                break;
              case 'inTransit':
                orderStatus = 'Order is in the processing';
                break;
              case 'ReceivedAtPoint':
                orderStatus = 'Order has been received at point';
                break;
              case 'Pick':
                orderStatus = 'Order has been picked';
                break;
              case 'PickedForDelivery':
                orderStatus = 'Picked for delivery';
                break;
              case 'Returned':
                orderStatus = 'Order has been returned';
                break;
              // default:
              //   orderStatus = latestStatus ?? 'unknown';
              //   break;
            }

            await this.orderModel.findByIdAndUpdate(order.id, {
              $set: {
                orderStatus,
              },
            });
          }
          break;
      }
    }
  }

  /**
   * Incomplete Order Methods
   */
  async addIncompleteOrder(
    addIncompleteOrderDto: AddIncompleteOrderDto,
  ): Promise<ResponsePayload> {
    try {
      const newData = new this.incompleteOrderModel(addIncompleteOrderDto);
      const saveData = await newData.save();

      // Auto-run fraud check the moment an abandoned checkout arrives, so the
      // result is already populated when admin opens the Incomplete Orders page.
      // Fire-and-forget: never block / fail the save on a fraud-API hiccup.
      if (saveData.phoneNo) {
        this.runIncompleteOrderFraudCheck(
          String(saveData._id),
          saveData.phoneNo,
        ).catch((error) => {
          this.logger.warn(
            `Auto fraud check failed for incomplete order ${saveData._id}:`,
            error?.message || error,
          );
        });
      }

      return {
        success: true,
        message: 'Incomplete order saved successfully',
        data: { _id: saveData._id },
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  private async runIncompleteOrderFraudCheck(
    incompleteOrderId: string,
    phoneNo: string,
  ): Promise<void> {
    const fraudCheckerData = await this.courierService.checkFraudOrder(phoneNo);
    if (fraudCheckerData) {
      await this.incompleteOrderModel.updateOne(
        { _id: incompleteOrderId },
        { $set: { fraudChecker: fraudCheckerData } },
      );
    }
  }

  async getAllIncompleteOrders(
    filterDto: FilterAndPaginationIncompleteOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter, pagination, sort, select } = filterDto;

    const aggregateStages: any[] = [];
    let mFilter: any = {};
    let mSort: any = { createdAt: -1 };
    let mSelect: any = {};
    let mPagination: any = {};

    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }

    // Coerce YYYY-MM-DD string date filters to Date objects (timestamps: true stores Date)
    const mf = mFilter as any;
    const coerceDate = (dateStr: string, endOfDay: boolean): Date => {
      const iso = endOfDay
        ? dateStr + 'T23:59:59.999+06:00'
        : dateStr + 'T00:00:00.000+06:00';
      return new Date(iso);
    };
    if (mf.createdAt && typeof mf.createdAt === 'object') {
      if (mf.createdAt.$gte && typeof mf.createdAt.$gte === 'string')
        mf.createdAt.$gte = coerceDate(mf.createdAt.$gte, false);
      if (mf.createdAt.$lte && typeof mf.createdAt.$lte === 'string')
        mf.createdAt.$lte = coerceDate(mf.createdAt.$lte, true);
    }

    if (searchQuery) {
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { phoneNo: { $regex: searchQuery, $options: 'i' } },
              { orderId: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        ],
      };
    }

    if (sort) {
      mSort = sort;
    }

    if (select) {
      mSelect = { ...select };
    }

    if (Object.keys(mFilter).length) {
      aggregateStages.push({ $match: mFilter });
    }

    aggregateStages.push(
      {
        $lookup: {
          from: 'orders',
          let: {
            incompletePhoneNo: '$phoneNo',
            incompleteCreatedAt: '$createdAt',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$phoneNo', '$$incompletePhoneNo'] },
                    { $gte: ['$createdAt', '$$incompleteCreatedAt'] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'placedOrders',
        },
      },
      {
        // Hide records where the customer placed the order themselves on the
        // website (a matching order exists) — those are not abandoned. But keep
        // admin-converted records (status 'converted') so they stay on this page
        // marked converted, even though a real order now exists for them.
        $match: {
          $or: [{ status: 'converted' }, { placedOrders: { $size: 0 } }],
        },
      },
    );

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    let pageSize = 25;
    let currentPage = 1;
    if (pagination) {
      pageSize =
        pagination.pageSize && Number(pagination.pageSize) > 0
          ? Number(pagination.pageSize)
          : 25;
      currentPage =
        pagination.currentPage && Number(pagination.currentPage) > 0
          ? Number(pagination.currentPage)
          : 1;
      mPagination = {
        skip: pageSize * (currentPage - 1),
        limit: pageSize,
      };
    }

    // Run data/count/grandTotal in ONE pass via $facet — the $lookup above is
    // the expensive stage (scans `orders` per incomplete-order doc); running
    // the pipeline 3x (data, count, calculation) tripled that cost for nothing.
    const dataPipeline: any[] = [
      { $skip: mPagination.skip || 0 },
      { $limit: mPagination.limit || pageSize },
    ];
    if (Object.keys(mSelect).length) {
      dataPipeline.push({ $project: mSelect });
    }

    aggregateStages.push({
      $facet: {
        data: dataPipeline,
        count: [{ $count: 'count' }],
        calculation: [
          { $group: { _id: null, grandTotal: { $sum: '$grandTotal' } } },
        ],
      },
    });

    try {
      const [result] = await this.incompleteOrderModel.aggregate(
        aggregateStages,
      );
      const data = result?.data || [];
      const count = result?.count?.[0]?.count || 0;
      const calculation = {
        grandTotal: result?.calculation?.[0]?.grandTotal || 0,
      };
      return {
        success: true,
        message: 'Incomplete orders retrieved successfully',
        data,
        count,
        calculation,
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getIncompleteOrderById(id: string): Promise<ResponsePayload> {
    try {
      const data = await this.incompleteOrderModel
        .findById(id)
        .populate('user', 'name email phoneNo');
      if (!data) {
        throw new NotFoundException('Incomplete order not found');
      }
      return {
        success: true,
        message: 'Incomplete order retrieved successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async updateIncompleteOrderById(
    id: string,
    updateIncompleteOrderDto: UpdateIncompleteOrderDto,
  ): Promise<ResponsePayload> {
    try {
      // This endpoint also saves fraud checks and admin notes from the
      // incomplete-order table. Keep conversion and audit fields immutable.
      const editableFields = [
        'name',
        'phoneNo',
        'email',
        'city',
        'shippingAddress',
        'paymentType',
        'paymentStatus',
        'deliveryCharge',
        'subTotal',
        'discount',
        'grandTotal',
        'orderedItems',
        'note',
        'adminNote',
        'fraudChecker',
      ];
      const dto = updateIncompleteOrderDto as Record<string, any>;
      const updateData = editableFields.reduce((result, field) => {
        if (Object.prototype.hasOwnProperty.call(dto || {}, field)) {
          result[field] = dto[field];
        }
        return result;
      }, {} as Record<string, any>);

      const data = await this.incompleteOrderModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      );
      if (!data) {
        throw new NotFoundException('Incomplete order not found');
      }
      return {
        success: true,
        message: 'Incomplete order updated successfully',
        data,
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleIncompleteOrderById(
    ids: string[],
  ): Promise<ResponsePayload> {
    try {
      await this.incompleteOrderModel.deleteMany({
        _id: { $in: ids },
      });
      return {
        success: true,
        message: 'Incomplete orders deleted successfully',
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }
}
