import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes, randomInt } from 'crypto';
import { BulkSmsService } from '../../shared/bulk-sms/bulk-sms.service';
import { OrderService } from '../sales/order/order.service';
import {
  normalizeOrderPhone,
  orderPhoneAliases,
  canCustomerCancel,
} from './guest-orders.policy';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
@Injectable()
export class GuestOrdersService {
  constructor(
    @InjectModel('GuestOrderAccess') private readonly access: Model<any>,
    @InjectModel('Order') private readonly orders: Model<any>,
    private readonly sms: BulkSmsService,
    private readonly orderService: OrderService,
  ) {}

  async requestCode(input: string) {
    const phoneNo = normalizeOrderPhone(input);
    const now = new Date();
    try {
      await this.access.updateOne(
        { phoneNo },
        {
          $setOnInsert: {
            phoneNo,
            sends: 0,
            resendAfter: new Date(0),
            sendWindowResetAt: new Date(now.getTime() + 3600000),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (Number(error?.code) !== 11000) throw error;
    }
    await this.access.updateOne(
      { phoneNo, sendWindowResetAt: { $lte: now } },
      {
        $set: {
          sends: 0,
          sendWindowResetAt: new Date(now.getTime() + 3600000),
        },
      },
    );
    const code = String(randomInt(100000, 1000000));
    const codeHash = digest(phoneNo + ':' + code);
    const claimed = await this.access.findOneAndUpdate(
      {
        phoneNo,
        resendAfter: { $lte: now },
        sends: { $lt: 5 },
      },
      {
        $set: {
          codeHash,
          codeExpiresAt: new Date(now.getTime() + 300000),
          attempts: 0,
          resendAfter: new Date(now.getTime() + 60000),
          purgeAt: new Date(now.getTime() + 86400000),
        },
        $inc: { sends: 1 },
      },
    );
    if (!claimed)
      throw new HttpException('কিছুক্ষণ পরে আবার কোড চাইতে পারবেন', 429);
    try {
      await this.sms.sendOrderAccessOtp(
        phoneNo,
        `Amolbooks order access code: ${code}. Valid for 5 minutes. Do not share this code.`,
      );
    } catch (_) {
      await this.access.updateOne(
        { phoneNo, codeHash },
        { $unset: { codeHash: 1, codeExpiresAt: 1 } },
      );
      throw new ServiceUnavailableException(
        'কোড পাঠানো যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন',
      );
    }
    // Never look up orders here: the response cannot reveal whether a number bought anything.
    return {
      success: true,
      message: 'আপনার নম্বরে কোড পাঠানো হয়েছে',
      retryAfter: 60,
    };
  }

  async verifyCode(input: string, code: string) {
    const phoneNo = normalizeOrderPhone(input);
    const now = new Date();
    const invalid = () =>
      new UnauthorizedException('কোডটি ভুল অথবা মেয়াদ শেষ। নতুন কোড নিন');
    if (!/^\d{6}$/.test(code || '')) throw invalid();
    const attempt = await this.access
      .findOneAndUpdate(
        {
          phoneNo,
          codeHash: { $exists: true },
          codeExpiresAt: { $gt: now },
          attempts: { $lt: 5 },
        },
        { $inc: { attempts: 1 } },
        { new: true },
      )
      .lean();
    const codeHash = digest(phoneNo + ':' + code);
    if (!attempt || attempt.codeHash !== codeHash) throw invalid();
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + 30 * 60000);
    const consumed = await this.access.findOneAndUpdate(
      {
        _id: attempt._id,
        codeHash,
        codeExpiresAt: { $gt: now },
        attempts: { $lte: 5 },
      },
      {
        $set: { sessionHash: digest(token), sessionExpiresAt: expiresAt },
        $unset: { codeHash: 1, codeExpiresAt: 1 },
      },
    );
    if (!consumed) throw invalid();
    return { success: true, data: { token, expiresAt, phoneNo } };
  }

  async verifiedPhone(authorization: string): Promise<string> {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization || '');
    if (!match) throw new UnauthorizedException('মোবাইল নম্বর যাচাই করুন');
    const session = await this.access
      .findOne({
        sessionHash: digest(match[1]),
        sessionExpiresAt: { $gt: new Date() },
      })
      .select('phoneNo')
      .lean();
    if (!session)
      throw new UnauthorizedException(
        'সেশনের মেয়াদ শেষ। আবার মোবাইল নম্বর যাচাই করুন',
      );
    return session.phoneNo;
  }

  async list(authorization: string, cursor?: string) {
    const phone = await this.verifiedPhone(authorization);
    if (cursor && !/^[a-f\d]{24}$/i.test(cursor)) throw new NotFoundException();
    const rows = await this.orders
      .find({
        phoneNo: { $in: orderPhoneAliases(phone) },
        ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
      })
      .select(
        'orderId createdAt orderStatus paymentStatus paymentType grandTotal deliveryCharge orderedItems.name orderedItems.quantity orderedItems.salePrice courierData courierLink courierBookingStartedAt stockOperationInProgress customerCancelledAt customerCancellationReason',
      )
      .sort({ _id: -1 })
      .limit(21)
      .lean();
    return {
      success: true,
      data: rows.slice(0, 20).map((order) => ({
        _id: order._id,
        orderId: order.orderId,
        createdAt: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        grandTotal: order.grandTotal,
        deliveryCharge: order.deliveryCharge,
        items: (order.orderedItems || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),
        cancelledAt: order.customerCancelledAt,
        canCancel: canCustomerCancel(order),
        refundReviewRequired: Boolean(
          order.customerCancelledAt &&
            order.orderStatus !== 7 &&
            (order.paymentStatus === 'paid' ||
              (order.paymentType && order.paymentType !== 'cash_on_delivery')),
        ),
      })),
      nextCursor: rows.length > 20 ? String(rows[19]._id) : null,
    };
  }

  async cancel(authorization: string, id: string, reason: string) {
    const phone = await this.verifiedPhone(authorization);
    return this.orderService.cancelVerifiedCustomerOrder(id, phone, reason);
  }

  async logout(authorization: string) {
    await this.verifiedPhone(authorization);
    await this.access.updateOne(
      { sessionHash: digest(authorization.slice(7)) },
      { $unset: { sessionHash: 1, sessionExpiresAt: 1 } },
    );
    return { success: true };
  }
}
