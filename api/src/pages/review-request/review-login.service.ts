import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { GuestOrdersService } from '../guest-orders/guest-orders.service';
import { normalizeOrderPhone, orderPhoneAliases } from '../guest-orders/guest-orders.policy';
import { ReviewRequestService } from './review-request.service';
import { cryptoJsEncrypt, storefrontLoginStorage } from './storefront-login';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const DEFAULT_LOGIN_SECONDS = 604800;

/**
 * Login on the review page (owner, 2026-11-13): after the review, the customer types their mobile
 * number, gets an SMS code (the same code system as "আমার অর্ডার", with its limits) and is logged in
 * to their shop account, made for them if they have none. The account keeps their name, phone
 * number and the order's address; their orders by that number show in "আমার অর্ডার" and the
 * order's reviews (pending until staff approve them) in "আমার রিভিউ".
 *
 * Only the order's own number can be used (the review link is the key, the SMS code proves the
 * phone). Orders already in another account are left alone, and so are orders whose Meta purchase
 * is still being sent (the account id becomes that event's external_id).
 */
@Injectable()
export class ReviewLoginService {
  private readonly logger = new Logger(ReviewLoginService.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('Address') private readonly addressModel: Model<any>,
    @InjectModel('Review') private readonly reviewModel: Model<any>,
    private readonly guestOrders: GuestOrdersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** 01712345678 → 017•••••678 */
  static maskPhone(phone: string): string {
    return phone.slice(0, 3) + '•••••' + phone.slice(-3);
  }

  static cleanName(value: any): string {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  private async orderAndPhone(token: string): Promise<{ order: any; phone: string }> {
    if (!TOKEN_PATTERN.test(String(token || ''))) throw new NotFoundException('এই লিংকটি খুঁজে পাওয়া যায়নি।');
    const order: any = await this.orderModel
      .findOne({ 'reviewRequest.token': token })
      .select('orderId name phoneNo city shippingAddress division area zone reviewRequest')
      .lean();
    if (!order) throw new NotFoundException('এই লিংকটি খুঁজে পাওয়া যায়নি।');
    if (ReviewRequestService.expired(order)) throw new BadRequestException('এই লিংকের মেয়াদ শেষ হয়ে গেছে।');
    let phone: string;
    try {
      phone = normalizeOrderPhone(String(order.phoneNo || ''));
    } catch {
      throw new BadRequestException('এই অর্ডারের মোবাইল নম্বরে কোড পাঠানো যাচ্ছে না।');
    }
    return { order, phone };
  }

  /** Send the SMS code to the order's number, once the customer typed that number. */
  async sendCode(token: string, typed?: any) {
    const { phone } = await this.orderAndPhone(token);
    let given = '';
    try {
      given = normalizeOrderPhone(String(typed || ''));
    } catch {
      throw new BadRequestException('সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)।');
    }
    if (given !== phone) {
      throw new BadRequestException(`অর্ডারে যে নম্বর দিয়েছিলেন সেটি দিন (${ReviewLoginService.maskPhone(phone)})।`);
    }
    if (!storefrontLoginStorage()) throw new ServiceUnavailableException('এখন লগইন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।');
    const sent = await this.guestOrders.requestCode(phone);
    return {
      success: true,
      message: 'কোড পাঠানো হয়েছে',
      data: { phone: ReviewLoginService.maskPhone(phone), retryAfter: sent?.retryAfter || 60 },
    };
  }

  /** Check the code, then log in (making the account if needed) and fill it from the order. */
  async login(token: string, code: any) {
    const { order, phone } = await this.orderAndPhone(token);
    const storage = storefrontLoginStorage();
    if (!storage) throw new ServiceUnavailableException('এখন লগইন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।');
    // Throws for a wrong or old code (5 tries per code, as in "আমার অর্ডার").
    await this.guestOrders.verifyCode(phone, String(code || '').trim());

    const user = await this.account(order, phone);
    if (!user.hasAccess) throw new UnauthorizedException('এই অ্যাকাউন্টে লগইন বন্ধ আছে। আমাদের সাথে যোগাযোগ করুন।');
    const addressSaved = await this.saveAddress(user, order, phone);
    const ordersLinked = await this.linkOrders(user._id, phone);
    // The order's reviews show in the account ("আমার রিভিউ"), and so will the ones written later.
    await this.reviewModel.updateMany(
      { 'order._id': order._id, $or: [{ 'user._id': { $exists: false } }, { 'user._id': null }] },
      { $set: { 'user._id': user._id } },
    );
    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { 'reviewRequest.user': user._id, 'reviewRequest.loginAt': new Date() } },
      { timestamps: false },
    );

    const seconds = Number(this.configService.get<number>('userTokenExpiredTime')) || DEFAULT_LOGIN_SECONDS;
    const accessToken = this.jwtService.sign({ _id: user._id, username: user.username });
    const expiredDate = new Date(Date.now() + seconds * 1000);
    // Exactly what the storefront saves after its own login, so it shows the customer logged in.
    const storageValue = cryptoJsEncrypt(
      JSON.stringify({ token: accessToken, expiredDate, userId: String(user._id) }),
      storage.secret,
    );
    this.logger.log(`Review page login for order ${order.orderId}: ${ordersLinked} order(s) added to the account`);
    return {
      success: true,
      message: 'লগইন হয়েছে',
      data: {
        storageKey: storage.key,
        storageValue,
        expiresAt: expiredDate,
        name: user.name || '',
        ordersLinked,
        addressSaved,
      },
    };
  }

  /** The account whose login is this number, or a new one; fills a missing name and phone. */
  private async account(order: any, phone: string): Promise<any> {
    const aliases = orderPhoneAliases(phone);
    const name = ReviewLoginService.cleanName(order.name);
    let user: any = await this.userModel
      .findOne({ username: { $in: aliases } })
      .sort({ createdAt: 1 })
      .select('name username phoneNo hasAccess addressLine division area zone')
      .lean();
    if (!user) {
      // A random password: the customer logs in with SMS codes (or sets one with "পাসওয়ার্ড ভুলে গেছেন").
      const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), await bcrypt.genSalt());
      const created = await this.userModel.create({
        name,
        username: phone,
        phoneNo: phone,
        registrationType: 'phone',
        hasAccess: true,
        password,
        addressLine: String(order.shippingAddress || '').trim() || undefined,
        ...(order.division?._id ? { division: order.division } : {}),
        ...(order.area?._id ? { area: order.area } : {}),
        ...(order.zone?._id ? { zone: order.zone } : {}),
      });
      return created.toObject();
    }
    const set: any = {};
    if (!ReviewLoginService.cleanName(user.name) && name) set.name = name;
    if (!user.phoneNo) set.phoneNo = phone;
    if (!user.addressLine && String(order.shippingAddress || '').trim()) {
      set.addressLine = String(order.shippingAddress).trim();
      if (!user.division?._id && order.division?._id) set.division = order.division;
      if (!user.area?._id && order.area?._id) set.area = order.area;
      if (!user.zone?._id && order.zone?._id) set.zone = order.zone;
    }
    if (Object.keys(set).length) {
      await this.userModel.updateOne({ _id: user._id }, { $set: set });
      user = { ...user, ...set };
    }
    return user;
  }

  /** The order's address in the account's address book, unless it is already there. */
  private async saveAddress(user: any, order: any, phone: string): Promise<boolean> {
    const text = String(order.shippingAddress || '').trim();
    if (!text) return false;
    const same = (value: any) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const existing: any[] = await this.addressModel.find({ user: user._id }).select('address').lean();
    if (existing.some((address) => same(address.address) === same(text))) return false;
    const address: any = await this.addressModel.create({
      user: user._id,
      name: ReviewLoginService.cleanName(order.name) || ReviewLoginService.cleanName(user.name),
      phone,
      city: order.city || undefined,
      ...(order.division?._id ? { division: order.division } : {}),
      ...(order.area?._id ? { area: order.area } : {}),
      ...(order.zone?._id ? { zone: order.zone } : {}),
      address: text,
      setDefaultAddress: existing.length === 0,
    });
    await this.userModel.updateOne({ _id: user._id }, { $addToSet: { addresses: address._id } });
    return true;
  }

  /** The number's orders that are in no account yet show in this one ("আমার অর্ডার"). */
  private async linkOrders(userId: any, phone: string): Promise<number> {
    const result: any = await this.orderModel.updateMany(
      {
        phoneNo: { $in: orderPhoneAliases(phone) },
        $or: [{ user: { $exists: false } }, { user: null }],
        metaPurchaseStatus: { $nin: ['sending', 'failed'] },
      },
      { $set: { user: userId } },
      { timestamps: false },
    );
    return Number(result?.modifiedCount ?? result?.nModified ?? 0);
  }
}
