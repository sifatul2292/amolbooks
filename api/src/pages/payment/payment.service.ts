import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Order } from '../../interfaces/common/order.interface';
import { SslcommerzService } from '../../shared/sslcommerz/sslcommerz.service';

// import { NagadGateway } from 'nagad-payment-gateway';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BulkSmsService } from '../../shared/bulk-sms/bulk-sms.service';
import { Product } from '../../interfaces/common/product.interface';
import {
  EpsInitializeResult,
  EpsService,
  EpsStatusResult,
} from '../../shared/eps/eps.service';
import { OrderService } from '../sales/order/order.service';
import { OrderStatus } from '../../enum/order.enum';
// import NagadGateway from 'nagad-payment-gateway';

// const Nagad = new NagadGateway({
//   apiVersion: 'v-0.2.0',
//   baseURL: 'https://api.mynagad.com',
//   callbackURL: 'https://redgrocer.com/payment/payment-nagad',
//   merchantID: '684044856091761',
//   merchantNumber: '684044856091761',
//   privKey: './nagad-key/merchantPrivateKey.txt',
//   pubKey: './nagad-key/pgPublicKey.txt',
//   isPath: true,
// });

// const Nagad = new NagadGateway({
//   apiVersion: 'v-0.2.0',
//   baseURL: 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0',
//   callbackURL: 'http://localhost:4200/payment/payment-nagad',
//   merchantID: '683002007104225',
//   merchantNumber: '683002007104225',
//   privKey: './nagad-key/merchantPrivateKey.txt',
//   pubKey: './nagad-key/pgPublicKey.txt',
//   isPath: true,
// });

const EPS_RECHECK_INTERVAL_MS = 5 * 60 * 1000;
const EPS_MAX_ATTEMPTS = 10;
const HOUR_MS = 60 * 60 * 1000;
const CLOSED_ORDER_STATUSES = [
  OrderStatus.CANCEL,
  OrderStatus.REFUND,
  OrderStatus.RETURN,
];
type EpsOutcome = 'paid' | 'pending' | 'failed' | 'cancelled' | 'review';
type EpsReturnHint = 'success' | 'fail' | 'cancel' | 'check';

function roundMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
}

/** Last 10 digits of a Bangladesh phone (01XXXXXXXXX, +8801..., Bengali digits). */
function phoneKey(value: unknown): string {
  const digits = String(value ?? '')
    .replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class PaymentService implements OnApplicationBootstrap {
  private logger = new Logger(PaymentService.name);
  private epsReconciling = false;

  constructor(
    @InjectModel('Order')
    private readonly orderModel: Model<Order>,
    @InjectModel('Product')
    private readonly productModel: Model<Product>,
    private utilsService: UtilsService,
    private sslService: SslcommerzService,
    private configService: ConfigService,
    private http: HttpService,
    private bulkSmsService: BulkSmsService,
    private eps: EpsService,
    private orderService: OrderService,
  ) {}

  onApplicationBootstrap() {
    if (!this.eps.isConfigured()) return;
    // Shoppers who paid but never came back to the site (closed tab, lost network)
    // still get their order marked paid.
    const timer = setInterval(() => {
      this.reconcileEpsPayments().catch((error) =>
        this.logger.warn(`EPS payment re-check failed: ${error?.message}`),
      );
    }, EPS_RECHECK_INTERVAL_MS);
    timer.unref?.();
  }

  /**
   * NAGAD Payment
   * nagadCreatePayment()
   * nagadVerifyPayment()
   */
  // async nagadCreatePayment(data: any): Promise<ResponsePayload> {
  //   try {
  //     // const format = {
  //     //   amount: '100',
  //     //   ip: '45.118.63.70',
  //     //   orderId: `${Date.now()}`,
  //     //   productDetails: { a: '1', b: '2' },
  //     //   clientType: 'PC_WEB',
  //     // }
  //     // console.log('data', data);
  //     const nagadURL = await Nagad.createPayment({
  //       ...data,
  //       ...{
  //         orderId: `${this.utilsService.makeNumberOfRandomCharacter(5)}${
  //           data.orderId
  //         }`,
  //       },
  //     });
  //
  //     console.log('nagadURL', nagadURL);
  //
  //     return {
  //       success: true,
  //       message: 'Success!',
  //       nagadURL: nagadURL,
  //     } as ResponsePayload;
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  //
  // async nagadVerifyPayment(data: any): Promise<ResponsePayload> {
  //   try {
  //     const { paymentRefID } = data;
  //
  //     console.log('paymentRefID', paymentRefID);
  //
  //     const paymentInfo = await Nagad.verifyPayment(paymentRefID);
  //
  //     console.log('paymentInfo', paymentInfo);
  //
  //     if (paymentInfo && paymentInfo.status === 'Success') {
  //       await this.orderModel.findOneAndUpdate(
  //         { nagadPaymentId: paymentRefID },
  //         {
  //           paymentStatus: 'paid',
  //         },
  //       );
  //
  //       return {
  //         success: true,
  //         message: 'Payment Success!',
  //         data: {
  //           status: paymentInfo.status,
  //           statusCode: paymentInfo.statusCode,
  //         },
  //       } as ResponsePayload;
  //     } else {
  //       await this.orderModel.findOneAndDelete({
  //         nagadPaymentId: paymentRefID,
  //       });
  //       return {
  //         success: false,
  //         message: 'Failed!',
  //         data: {
  //           status: paymentInfo.status,
  //           statusCode: paymentInfo.statusCode,
  //         },
  //       } as ResponsePayload;
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  /**
   * SSL COMMERCE PAYMENT
   * initSSLPayment()
   * ipn()
   */
  async initSSLPayment(body: any, req?: any): Promise<ResponsePayload> {
    // The compiled checkout's "online_payment" option posts here. With EPS settings
    // present, EPS is used; the old SSLCommerz code below is left as it was.
    if (this.eps.isConfigured()) {
      return this.startEpsPaymentFromCheckout(body, req);
    }
    if (body.tran_id) {
      try {
        const order: any = await this.orderModel.findOne({ orderId: String(body.tran_id) })
          .select('isGiftOrder giftWrap grandTotal');
        if (order?.isGiftOrder || order?.giftWrap) {
          body = { ...body, total_amount: order.grandTotal };
        }
        const response = await this.sslService.sslInit(body);
        return {
          success: true,
          message: 'Success!',
          data: response,
        } as ResponsePayload;
      } catch (error) {
        console.warn(error);
        throw new InternalServerErrorException(error.message);
      }
    } else {
      throw new InternalServerErrorException();
    }
  }

  async ipn(body: {
    status: string;
    tran_id: string;
    amount: number;
  }): Promise<ResponsePayload> {
    if (body.tran_id) {
      try {
        const order: Order = await this.orderModel.findOne({
          orderId: body.tran_id,
        });
        if (!order || order.paymentGateway === 'eps') {
          throw new BadRequestException('This order cannot use the SSL callback.');
        }
        const response: any =
          await this.sslService.transactionQueryBySessionIdSSL({
            sessionkey: order.sslSessionId,
          });

        if (response.status === 'VALID') {
          if (order) {
            await this.orderModel.findOneAndUpdate(
              { orderId: body.tran_id },
              {
                paymentStatus: 'paid',
                paidAmount: Number(response.amount ?? 0),
              },
            );
          }
          // for (const f of order['packages']) {
          //   for (const g of f['orderItems']) {
          //     await this.productModel.findByIdAndUpdate(
          //       g._id,
          //       {
          //         $inc: {
          //           totalSold: g.selectedQuantity,
          //         },
          //       },
          //       {
          //         new: true,
          //         upsert: true,
          //       },
          //     );
          //   }
          // }
          for (const f of order['orderedItems']) {
            await this.productModel.findByIdAndUpdate(f._id, {
              $inc: {
                totalSold: f.quantity,
              },
            });

            await this.productModel.findByIdAndUpdate(f._id, {
              $inc: {
                quantity: -f.quantity,
              },
            });
          }
        } else {
          // Delete Order
          await this.orderModel.deleteOne({ orderId: body.tran_id });
        }
        // }
        return {
          success: true,
          message: 'Success!',
        } as ResponsePayload;
      } catch (error) {
        console.warn(error);
        throw new InternalServerErrorException(error.message);
      }
    } else {
      throw new InternalServerErrorException();
    }
  }

  /**
   * EPS ONLINE PAYMENT (eps.com.bd)
   * Checkout saves the order, posts init-ssl and sends the shopper to GatewayPageURL.
   * EPS sends the shopper back to epsReturn(). The order becomes 'paid' only after
   * CheckMerchantTransactionStatus confirms it with the right amount; the return URL
   * itself is never trusted. Failed/cancelled orders are kept (unpaid) for staff.
   */
  epsEnabled(): boolean {
    return this.eps.isConfigured();
  }

  private storefrontUrl(): string {
    return String(
      this.configService.get<string>('STOREFRONT_URL') || 'https://www.amolbooks.com',
    ).replace(/\/+$/, '');
  }

  private epsReturnBaseUrl(): string {
    return String(
      this.configService.get<string>('EPS_RETURN_BASE_URL') ||
        'https://apisub.amolbooks.com',
    ).replace(/\/+$/, '');
  }

  private async startEpsPaymentFromCheckout(
    body: any,
    req?: any,
  ): Promise<ResponsePayload> {
    const orderId = String(body?.tran_id ?? '').trim();
    if (!/^[A-Za-z0-9-]{1,40}$/.test(orderId)) {
      throw new BadRequestException('Invalid order.');
    }
    const order: any = await this.orderModel.findOne({ orderId }).lean();
    // Order numbers are sequential, so the checkout's phone number must match too.
    const phone = phoneKey(body?.cus_phone);
    if (!order || !phone || phoneKey(order.phoneNo) !== phone) {
      throw new NotFoundException('Order not found.');
    }
    if (Date.now() - new Date(order.createdAt).getTime() > 24 * HOUR_MS) {
      throw new BadRequestException('This order can no longer be paid online.');
    }
    return this.createEpsSession(order, req);
  }

  private async createEpsSession(order: any, req?: any): Promise<ResponsePayload> {
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('This order is already paid.');
    }
    if (order.paymentType !== 'online_payment') {
      throw new BadRequestException('This order is not an online payment order.');
    }
    if (
      CLOSED_ORDER_STATUSES.includes(order.orderStatus) ||
      order.customerCancelledAt
    ) {
      throw new BadRequestException('This order was cancelled.');
    }
    const amount = roundMoney(order.grandTotal);
    if (!(amount > 0)) {
      throw new BadRequestException('This order has nothing to pay.');
    }
    if ((order.epsAttempts || []).length >= EPS_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many payment attempts. Please call us.');
    }

    const merchantTransactionId = EpsService.newMerchantTransactionId();
    const attemptFilter = {
      arrayFilters: [{ 'a.merchantTransactionId': merchantTransactionId }],
    };
    // Record the attempt before calling EPS, so a later status check can find it.
    const started = await this.orderModel.updateOne(
      { _id: order._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentGateway: 'eps',
          paymentGatewayStatus: 'initiated',
          epsMerchantTransactionId: merchantTransactionId,
        },
        $unset: { paymentGatewayMessage: 1, epsTransactionId: 1 },
        $push: {
          epsAttempts: {
            merchantTransactionId,
            amount,
            status: 'initiated',
            createdAt: new Date(),
          },
        },
      },
    );
    if (!started.modifiedCount) {
      throw new BadRequestException('This order is already paid.');
    }

    const returnUrl = (result: string) =>
      `${this.epsReturnBaseUrl()}/api/payment/eps/return/${merchantTransactionId}/${result}`;
    const city = String(order.division?.name || order.city || 'Dhaka').slice(0, 50);
    const email = String(order.email || '').trim();
    let session: EpsInitializeResult;
    try {
      session = await this.eps.initialize({
        merchantTransactionId,
        customerOrderId: `${order.orderId}-${merchantTransactionId.slice(-6)}`,
        totalAmount: amount,
        successUrl: returnUrl('success'),
        failUrl: returnUrl('fail'),
        cancelUrl: returnUrl('cancel'),
        ipAddress: req ? this.utilsService.getClientIp(req) : undefined,
        customer: {
          name: String(order.name || 'Customer').slice(0, 100),
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? email
            : 'noreply@amolbooks.com',
          phone: String(order.phoneNo || ''),
          address: String(order.shippingAddress || city).slice(0, 200),
          city,
          state: String(order.area?.name || city).slice(0, 50),
          postcode: '1000',
        },
        products: (order.orderedItems || [])
          .filter((item: any) => Number(item?.quantity) > 0)
          .map((item: any) => ({
            name: String(item.nameEn || item.name || 'Book'),
            quantity: Math.max(1, Math.floor(Number(item.quantity))),
            price: roundMoney(item.unitPrice) || 0,
          })),
        valueA: String(order._id),
      });
    } catch (error) {
      this.logger.error(
        `EPS payment could not start for order ${order.orderId}: ${error?.message}`,
      );
      await this.orderModel.updateOne(
        { _id: order._id, paymentStatus: { $ne: 'paid' } },
        {
          $set: {
            paymentGatewayStatus: 'init_failed',
            paymentGatewayMessage: String(error?.message || '').slice(0, 300),
            'epsAttempts.$[a].status': 'init_failed',
          },
        },
        attemptFilter,
      );
      throw new ServiceUnavailableException(
        'Online payment is not available right now.',
      );
    }

    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { 'epsAttempts.$[a].transactionId': session.transactionId } },
      attemptFilter,
    );
    await this.orderModel.updateOne(
      { _id: order._id, epsMerchantTransactionId: merchantTransactionId },
      { $set: { epsTransactionId: session.transactionId } },
    );
    return {
      success: true,
      message: 'Success!',
      data: {
        sessionkey: session.transactionId,
        GatewayPageURL: session.redirectUrl,
      },
    } as ResponsePayload;
  }

  /** EPS success/fail/cancel URL: re-check with EPS, then pick the shopper's page. */
  async epsReturn(merchantTransactionId: string, result: string): Promise<string> {
    const failedPage = `${this.storefrontUrl()}/payment/fail?state=failed`;
    const mtid = String(merchantTransactionId || '');
    if (!/^\d{10,30}$/.test(mtid)) return failedPage;
    const order: any = await this.orderModel
      .findOne({ 'epsAttempts.merchantTransactionId': mtid })
      .lean();
    if (!order) return failedPage;
    const hint: EpsReturnHint =
      result === 'success' ? 'success' : result === 'cancel' ? 'cancel' : 'fail';
    const outcome = await this.verifyEpsAttempt(order, mtid, hint);
    return this.epsResultUrl(order, outcome);
  }

  epsResultUrl(order: any, outcome: EpsOutcome): string {
    const id = encodeURIComponent(String(order?._id || ''));
    return outcome === 'paid'
      ? `${this.storefrontUrl()}/checkout/order-success/${id}?payment=paid`
      : `${this.storefrontUrl()}/payment/fail?order=${id}&state=${outcome}`;
  }

  private epsFinalStatus(status: string): boolean {
    const state = String(status || '').toLowerCase();
    return (
      state === 'success' ||
      /(cancel|fail|declin|reject|expire|invalid|timeout|error)/.test(state)
    );
  }

  /** Ask EPS about one payment attempt and store the answer. Safe to repeat. */
  private async verifyEpsAttempt(
    order: any,
    mtid: string,
    hint: EpsReturnHint,
  ): Promise<EpsOutcome> {
    const attempt = (order.epsAttempts || []).find(
      (item: any) => item.merchantTransactionId === mtid,
    );
    if (!attempt) return order.paymentStatus === 'paid' ? 'paid' : 'failed';
    const attemptFilter = { arrayFilters: [{ 'a.merchantTransactionId': mtid }] };

    let status: EpsStatusResult | null = null;
    // Right after a successful payment EPS may still report it as in progress.
    const tries = hint === 'success' ? 3 : 1;
    for (let i = 0; i < tries; i++) {
      if (i) await sleep(1500);
      try {
        status = await this.eps.checkStatus(mtid);
      } catch (error) {
        status = null;
        this.logger.warn(
          `EPS status check failed for order ${order.orderId}: ${error?.message}`,
        );
      }
      if (status && this.epsFinalStatus(status.status)) break;
    }

    const now = new Date();
    if (
      !status ||
      status.merchantTransactionId !== mtid
    ) {
      if (status) {
        this.logger.error(`EPS status reply for ${mtid} named another transaction`);
      }
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { paymentCheckedAt: now } },
      );
      return order.paymentStatus === 'paid' ? 'paid' : 'pending';
    }

    const state = status.status.toLowerCase();
    if (state === 'success') {
      const expected = roundMoney(attempt.amount);
      if (
        status.totalAmount === null ||
        Math.round(roundMoney(order.grandTotal) * 100) !== Math.round(expected * 100) ||
        Math.round(status.totalAmount * 100) !== Math.round(expected * 100)
      ) {
        this.logger.error(
          `EPS amount mismatch for order ${order.orderId}: paid ${status.totalAmount}, expected ${expected}`,
        );
        await this.orderModel.updateOne(
          { _id: order._id, paymentStatus: { $ne: 'paid' } },
          {
            $set: {
              paymentGatewayStatus: 'review',
              paymentGatewayMessage: `EPS paid amount ${status.totalAmount} does not match attempt ${expected} / order ${order.grandTotal} (transaction ${mtid}). Check before shipping.`,
              paymentCheckedAt: now,
              'epsAttempts.$[a].status': 'amount_mismatch',
            },
          },
          attemptFilter,
        );
        return order.paymentStatus === 'paid' ? 'paid' : 'review';
      }

      const paid: any = await this.orderModel
        .findOneAndUpdate(
          { _id: order._id, paymentStatus: { $ne: 'paid' } },
          {
            $set: {
              paymentStatus: 'paid',
              paymentGatewayStatus: 'paid',
              paidAmount: status.totalAmount,
              paidAt: now,
              paymentCheckedAt: now,
              paymentFinancialEntity: status.financialEntity || 'EPS',
              epsMerchantTransactionId: mtid,
              ...(attempt.transactionId
                ? { epsTransactionId: attempt.transactionId }
                : {}),
              'epsAttempts.$[a].status': 'paid',
            },
            $unset: { paymentGatewayMessage: 1 },
          },
          { new: true, ...attemptFilter },
        )
        .lean();
      if (paid) {
        this.logger.log(
          `EPS payment confirmed for order ${paid.orderId} (${paid.paymentFinancialEntity})`,
        );
        // Order SMS/email for online orders are sent only now (once per order).
        this.orderService.sendOrderPlacedNotifications(paid).catch((error) =>
          this.logger.error(
            `Order notifications failed for paid order ${paid.orderId}: ${error?.message}`,
          ),
        );
      } else if (!['paid', 'paid_duplicate'].includes(attempt.status)) {
        const current: any = await this.orderModel
          .findById(order._id)
          .select('epsMerchantTransactionId')
          .lean();
        if (current && current.epsMerchantTransactionId !== mtid) {
          this.logger.error(
            `EPS transaction ${mtid} also succeeded for already-paid order ${order.orderId}; one payment needs a refund`,
          );
          await this.orderModel.updateOne(
            { _id: order._id },
            {
              $set: {
                paymentGatewayMessage: `Paid twice: EPS transaction ${mtid} also succeeded. Refund one payment.`,
                'epsAttempts.$[a].status': 'paid_duplicate',
              },
            },
            attemptFilter,
          );
        }
      }
      return 'paid';
    }

    let outcome: 'failed' | 'cancelled' | null = null;
    if (state.includes('cancel')) outcome = 'cancelled';
    else if (this.epsFinalStatus(state)) outcome = 'failed';
    // Still open at EPS ("Initiated"/"Pending"), but EPS sent the shopper to fail/cancel.
    else if (hint === 'cancel') outcome = 'cancelled';
    else if (hint === 'fail') outcome = 'failed';

    if (outcome) {
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { paymentCheckedAt: now, 'epsAttempts.$[a].status': outcome } },
        attemptFilter,
      );
    } else {
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { paymentCheckedAt: now } },
      );
    }
    const gatewayStatus = outcome || (hint === 'success' ? 'pending' : null);
    if (gatewayStatus) {
      // Only the latest attempt decides the order's payment state.
      await this.orderModel.updateOne(
        {
          _id: order._id,
          paymentStatus: { $ne: 'paid' },
          epsMerchantTransactionId: mtid,
        },
        {
          $set: {
            paymentGatewayStatus: gatewayStatus,
            paymentGatewayMessage: String(
              status.errorMessage || status.status || '',
            ).slice(0, 300),
          },
        },
      );
    }
    if (order.paymentStatus === 'paid') return 'paid';
    return outcome || 'pending';
  }

  /** Small public payment state for the storefront result pages (no personal data). */
  async epsOrderStatus(id: string): Promise<ResponsePayload> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Order not found.');
    const fields =
      'orderId paymentType paymentStatus paymentGatewayStatus grandTotal paidAmount paymentFinancialEntity epsMerchantTransactionId epsAttempts paymentCheckedAt';
    let order: any = await this.orderModel.findById(id).select(fields).lean();
    if (!order) throw new NotFoundException('Order not found.');
    const checkedAgo = order.paymentCheckedAt
      ? Date.now() - new Date(order.paymentCheckedAt).getTime()
      : Infinity;
    if (
      this.eps.isConfigured() &&
      order.paymentStatus !== 'paid' &&
      ['initiated', 'pending'].includes(order.paymentGatewayStatus) &&
      order.epsMerchantTransactionId &&
      checkedAgo > 15000
    ) {
      await this.verifyEpsAttempt(order, order.epsMerchantTransactionId, 'check');
      order = await this.orderModel.findById(id).select(fields).lean();
    }
    return {
      success: true,
      message: 'Success',
      data: {
        _id: order._id,
        orderId: order.orderId,
        paymentType: order.paymentType,
        paymentStatus: order.paymentStatus,
        paymentGatewayStatus: order.paymentGatewayStatus || null,
        amount: order.grandTotal,
        paidAmount: order.paidAmount ?? null,
        paidWith: order.paymentFinancialEntity || null,
      },
    } as ResponsePayload;
  }

  /** "Pay again" on the failed page: same order, new EPS attempt, amount from the order. */
  async retryEpsPayment(id: string, req?: any): Promise<ResponsePayload> {
    if (!this.eps.isConfigured()) {
      throw new ServiceUnavailableException('Online payment is not available right now.');
    }
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Order not found.');
    let order: any = await this.orderModel.findById(id).lean();
    if (!order) throw new NotFoundException('Order not found.');
    if (order.paymentStatus !== 'paid' && order.epsMerchantTransactionId) {
      // The last attempt may have gone through after all.
      await this.verifyEpsAttempt(order, order.epsMerchantTransactionId, 'check');
      order = await this.orderModel.findById(id).lean();
    }
    if (order.paymentStatus === 'paid') {
      return {
        success: true,
        message: 'Already paid',
        data: { paid: true, redirectUrl: this.epsResultUrl(order, 'paid') },
      } as ResponsePayload;
    }
    if (order.paymentGatewayStatus === 'review') {
      throw new BadRequestException('We are checking this payment. Please call us.');
    }
    if (Date.now() - new Date(order.createdAt).getTime() > 7 * 24 * HOUR_MS) {
      throw new BadRequestException('This order can no longer be paid online.');
    }
    return this.createEpsSession(order, req);
  }

  /** Re-check unresolved attempts, including attempts superseded by retries. */
  async reconcileEpsPayments(): Promise<number> {
    if (this.epsReconciling || !this.eps.isConfigured()) return 0;
    this.epsReconciling = true;
    try {
      const now = Date.now();
      const orders: any[] = await this.orderModel
        .find({
          paymentGateway: 'eps',
          epsAttempts: { $elemMatch: { $or: [
            { status: { $in: ['initiated', 'pending'] }, createdAt: { $gte: new Date(now - 48 * HOUR_MS) } },
            { status: { $in: ['failed', 'cancelled'] }, createdAt: { $gte: new Date(now - 6 * HOUR_MS) } },
          ] } },
          $or: [
            { paymentCheckedAt: { $exists: false } },
            { paymentCheckedAt: { $lt: new Date(now - 4 * 60 * 1000) } },
          ],
        })
        .select('orderId paymentStatus grandTotal epsMerchantTransactionId epsAttempts')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      for (const order of orders) {
        // A shopper can finish an older payment tab after starting another attempt.
        for (const attempt of order.epsAttempts || []) {
          const cutoff = ['initiated', 'pending'].includes(attempt.status) ? 48 :
            ['failed', 'cancelled'].includes(attempt.status) ? 6 : 0;
          if (cutoff && new Date(attempt.createdAt).getTime() >= now - cutoff * HOUR_MS) {
            await this.verifyEpsAttempt(order, attempt.merchantTransactionId, 'check');
          }
        }
      }
      return orders.length;
    } finally {
      this.epsReconciling = false;
    }
  }

  /**
   * BKASH PAYMENT
   * getBkashToken()
   * executeBkashPayment()
   * createBkashPayment()
   * callbackBkashPayment()
   */

  private async getBkashToken(): Promise<any> {
    try {
      const url = this.configService.get<string>('bkashUrl');
      const username = this.configService.get<string>('bkashUsername');
      const password = this.configService.get<string>('bkashPassword');
      const appKey = this.configService.get<string>('bkashAppKey');
      const appSecret = this.configService.get<string>('bkashAppSecret');

      // console.log('username', username);
      // console.log('password', password);
      // console.log('appKey', appKey);
      // console.log('appSecret', appSecret);

      const httpReq = async () => {
        return new Promise((resolve, reject) => {
          this.http
            .post(
              `${url}/token/grant`,
              {
                app_key: appKey,
                app_secret: appSecret,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  username: username,
                  password: password,
                },
              },
            )
            .subscribe({
              next: (res) => {
                resolve(res);
              },
              error: (err) => {
                reject(err);
                console.log(err);
              },
            });
        });
      };

      const result = await httpReq();
      return result['data'];
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  private async executeBkashPayment(paymentID: string): Promise<any> {
    try {
      const token = await this.getBkashToken();

      const url = this.configService.get<string>('bkashUrl');
      const appKey = this.configService.get<string>('bkashAppKey');

      const httpReq = async () => {
        return new Promise((resolve, reject) => {
          this.http
            .post(
              `${url}/execute`,
              {
                paymentID: paymentID,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  authorization: token.id_token,
                  'x-app-key': appKey,
                },
              },
            )
            .subscribe({
              next: (res) => {
                resolve(res);
              },
              error: (err) => {
                reject(err);
                console.log(err);
              },
            });
        });
      };

      const result = await httpReq();
      return result['data'];
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async createBkashPayment(body: any): Promise<ResponsePayload> {
    try {
      const token = await this.getBkashToken();

      const url = this.configService.get<string>('bkashUrl');
      const appKey = this.configService.get<string>('bkashAppKey');

      const httpReq = async () => {
        return new Promise((resolve, reject) => {
          this.http
            .post(`${url}/create`, body, {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                authorization: token.id_token,
                'x-app-key': appKey,
              },
            })
            .subscribe({
              next: (res) => {
                resolve(res);
              },
              error: (err) => {
                reject(err);
                console.log(err);
              },
            });
        });
      };

      const result = await httpReq();

      return {
        success: true,
        message: 'Success',
        data: result['data'],
      } as ResponsePayload;
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async callbackBkashPayment(body: {
    paymentID: string;
    status: string;
  }): Promise<ResponsePayload> {
    try {
      const { paymentID, status } = body;

      const orderData = await this.orderModel.findOne({
        bkashPaymentId: paymentID,
      });

      if (status === 'success') {
        const result = await this.executeBkashPayment(paymentID);

        if (result.statusCode === '0000') {
          await this.orderModel.findByIdAndUpdate(orderData._id, {
            paymentStatus: 'paid',
          });
          // Sent SMS to User
          const message = `Hi ${orderData.name} \nThanks for Shopping with redgrocer.com. Please wait for confirmation.`;
          this.bulkSmsService.sentSingleSms(orderData.phoneNo, message);

          return {
            success: true,
            message: 'Success',
            data: {
              statusCode: result.statusCode,
              message: result.statusMessage,
            },
          } as ResponsePayload;
        } else {
          // Delete Order
          await this.orderModel.findByIdAndDelete(orderData._id);
          return {
            success: false,
            message: 'Payment Error',
            data: {
              statusCode: result.statusCode,
              message: result.statusMessage,
            },
          } as ResponsePayload;
        }
      } else {
        // Delete Order
        await this.orderModel.findByIdAndDelete(orderData._id);
        return {
          success: false,
          message: 'Payment Canceled',
          data: {
            statusCode: null,
            message: 'Payment Canceled',
          },
        } as ResponsePayload;
      }
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
