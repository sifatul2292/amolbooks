import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { normalizeOrderPhone } from '../guest-orders/guest-orders.policy';
import { reviewHints } from './review-hints';
import {
  WhatsappReviewAnswer,
  WhatsappReviewReply,
  WhatsappService,
} from '../../shared/whatsapp/whatsapp.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 10 * 60 * 1000;
/** Orders delivered up to this many days before the mark still get asked (server was down). */
const CATCH_UP_DAYS = 3;
/** One review request per number in this time, however many orders it had. */
const ASK_AGAIN_DAYS = 30;
/** The review page link works this long after the request. */
const LINK_DAYS = 60;
const BATCH = 100;
const DEFAULT_DAILY_LIMIT = 50;
const MAX_DAILY_LIMIT = 1000;
const SETTING_KEY = 'review-request';
const SITE_URL = 'https://amolbooks.com';
// Cancelled, refunded, returned orders and failed / partial deliveries get no request.
const CLOSED_STATUSES = [6, 7, 9];
const BAD_COURIER = ['cancelled', 'partial_delivered', 'returned'];
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const SIGN = '— amolbooks.com';

type AskResult = 'sent' | 'failed' | 'skipped' | 'holdout' | 'busy';

/**
 * WhatsApp review request (owner, 2026-11-13): 14 days after delivery the customer gets one
 * message ("বইটি কেমন লাগছে?") with the review page link and three buttons. A tap opens Meta's
 * free 24-hour reply window, so the answer can carry the link again and, after "ভালো লাগছে", one
 * book suggestion. "সমস্যা আছে" opens a request in the WhatsApp Inbox for staff. Customers who
 * write "stop" get no more of these (order updates still go out).
 *
 * order.reviewRequest records each order once (sent, failed, skipped with the reason, holdout).
 * Reviews from the link are saved like any customer review (pending until staff approve them in
 * the admin panel) and carry the order, so they are verified purchases.
 *
 * Off until the approved template's name is set (WHATSAPP_TEMPLATE_REVIEW_REQUEST, see
 * scripts/WHATSAPP_ORDERS.md). REVIEW_REQUEST_DAYS (14), REVIEW_REQUEST_HOURS (19-21, Dhaka time),
 * REVIEW_REQUEST_HOLDOUT_PERCENT (0), REVIEW_REQUEST_SKIP_NUMBERS (staff numbers),
 * REVIEW_REWARD_COUPON (a coupon code made in the admin panel, shown after a review).
 */
@Injectable()
export class ReviewRequestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReviewRequestService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** Dhaka date (YYYY-MM-DD) whose requests are all done. */
  private doneDay = '';
  private limitCache: { at: number; value: number } | null = null;

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Product') private readonly productModel: Model<any>,
    @InjectModel('Review') private readonly reviewModel: Model<any>,
    @InjectModel('WhatsappChat') private readonly chatModel: Model<any>,
    private readonly whatsapp: WhatsappService,
    // The daily limit staff set on the Customer Manager page (review-request-setting.schema.ts).
    @Optional() @InjectModel('ReviewRequestSetting') private readonly settingModel?: Model<any>,
  ) {}

  onModuleInit() {
    this.whatsapp.onReviewReply((reply) => this.answerReply(reply));
    this.whatsapp.onReviewApproved((reviewId) => this.notifyApproved(reviewId));
    if (process.env.REVIEW_REQUEST_DISABLED === '1') return;
    this.timer = setInterval(() => void this.tick().catch((error) =>
      this.logger.warn(`Review requests failed: ${error?.message || error}`)), TICK_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Read at call time (restart after editing .env). */
  config() {
    const env = process.env;
    const hours = String(env.REVIEW_REQUEST_HOURS || '19-21').match(/^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/);
    const from = hours ? Math.min(23, Number(hours[1])) : 19;
    const to = hours ? Math.min(24, Number(hours[2])) : 21;
    return {
      days: Math.max(1, Math.round(Number(env.REVIEW_REQUEST_DAYS) || 14)),
      // Dhaka hours [from, to): 19-21 = 7:00 pm to 8:59 pm.
      hours: to > from ? [from, to] : [19, 21],
      holdout: Math.min(50, Math.max(0, Math.round(Number(env.REVIEW_REQUEST_HOLDOUT_PERCENT) || 0))),
      skipNumbers: String(env.REVIEW_REQUEST_SKIP_NUMBERS || '')
        .split(',')
        .map((phone) => WhatsappService.toWhatsappNumber(phone))
        .filter(Boolean) as string[],
      rewardCoupon: String(env.REVIEW_REWARD_COUPON || '').trim().slice(0, 40),
      // Most review requests sent in one day (Dhaka); staff can change it on the Customer Manager
      // page, which wins over this default.
      dailyLimit: ReviewRequestService.limitValue(env.REVIEW_REQUEST_DAILY_LIMIT, DEFAULT_DAILY_LIMIT),
    };
  }

  static limitValue(value: any, fallback: number): number {
    const number = Math.round(Number(value));
    return value !== undefined && value !== null && value !== '' && Number.isFinite(number)
      ? Math.min(MAX_DAILY_LIMIT, Math.max(0, number))
      : fallback;
  }

  /** The day's limit: the Customer Manager setting, else REVIEW_REQUEST_DAILY_LIMIT, else 50. */
  async dailyLimit(): Promise<number> {
    if (this.limitCache && Date.now() - this.limitCache.at < 60 * 1000) return this.limitCache.value;
    let value = this.config().dailyLimit;
    try {
      const saved: any = await this.settingModel?.findOne({ key: SETTING_KEY }).select('dailyLimit').lean();
      if (saved && saved.dailyLimit !== undefined && saved.dailyLimit !== null) {
        value = ReviewRequestService.limitValue(saved.dailyLimit, value);
      }
    } catch (error) {
      this.logger.warn(`Review request limit not read: ${error?.message || error}`);
    }
    this.limitCache = { at: Date.now(), value };
    return value;
  }

  /** Review requests sent today (Dhaka day). */
  async sentToday(now = new Date()): Promise<number> {
    const start = new Date(`${ReviewRequestService.dhakaTime(now).day}T00:00:00+06:00`);
    return this.orderModel.countDocuments({ 'reviewRequest.status': 'sent', 'reviewRequest.at': { $gte: start } });
  }

  /** What the Customer Manager page shows and changes. */
  async settings(now = new Date()) {
    const config = this.config();
    const [dailyLimit, sentToday, saved] = await Promise.all([
      this.dailyLimit(),
      this.sentToday(now),
      this.settingModel?.findOne({ key: SETTING_KEY }).select('updatedByName updatedAt').lean().catch(() => null),
    ]);
    return {
      success: true,
      data: {
        dailyLimit,
        sentToday,
        maxDailyLimit: MAX_DAILY_LIMIT,
        active: this.whatsapp.isActive('review_request'),
        approvedActive: this.whatsapp.isActive('review_approved'),
        days: config.days,
        hours: config.hours,
        updatedByName: (saved as any)?.updatedByName || '',
        updatedAt: (saved as any)?.updatedAt || null,
      },
    };
  }

  async setDailyLimit(value: any, admin: any) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0 || number > MAX_DAILY_LIMIT) {
      throw new BadRequestException(`Daily limit must be a whole number from 0 to ${MAX_DAILY_LIMIT}`);
    }
    if (!this.settingModel) throw new BadRequestException('Settings are not available');
    await this.settingModel.updateOne(
      { key: SETTING_KEY },
      { $set: { dailyLimit: number, updatedByName: String(admin?.name || admin?.username || '').slice(0, 80) } },
      { upsert: true },
    );
    this.limitCache = null;
    return this.settings();
  }

  static dhakaTime(now: Date): { day: string; hour: number } {
    const local = new Date(now.getTime() + DHAKA_OFFSET_MS);
    return { day: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
  }

  /** Every 10 minutes: inside the send hours, ask the day's orders (once a day once all are done). */
  async tick(now = new Date()): Promise<void> {
    if (this.running || !this.whatsapp.isActive('review_request')) return;
    const { day, hour } = ReviewRequestService.dhakaTime(now);
    const [from, to] = this.config().hours;
    if (hour < from || hour >= to || this.doneDay === day) return;
    this.running = true;
    try {
      // At most the day's limit (owner: about 50 a day to start); the rest of the day waits.
      const left = (await this.dailyLimit()) - (await this.sentToday(now));
      if (left <= 0) {
        this.doneDay = day;
        return;
      }
      const result = await this.sendDue(now, BATCH, left);
      if (!result.more || result.capped) this.doneDay = day;
    } finally {
      this.running = false;
    }
  }

  /**
   * Orders delivered `days` ago (up to CATCH_UP_DAYS more) that were never looked at: ask each one,
   * or record why not. `more` = another batch is waiting.
   */
  async sendDue(now = new Date(), limit = BATCH, maxSends = Infinity) {
    const config = this.config();
    const to = new Date(now.getTime() - config.days * DAY_MS);
    const from = new Date(to.getTime() - CATCH_UP_DAYS * DAY_MS);
    const range = { $gte: from, $lte: to };
    const orders: any[] = await this.orderModel
      .find({
        reviewRequest: { $exists: false },
        orderStatus: { $nin: CLOSED_STATUSES },
        'courierStatus.status': { $nin: BAD_COURIER },
        $or: [
          { orderStatus: 5, deliveryDate: range },
          { 'courierStatus.status': 'delivered', courierStatusHistory: { $elemMatch: { status: 'delivered', receivedAt: range } } },
          { 'courierStatus.status': 'delivered', 'courierStatus.receivedAt': range },
        ],
      })
      // Newest first: with a daily limit, each day's deliveries are asked at the 14-day mark; the
      // catch-up days (server down) come after them.
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .select('orderId phoneNo name orderedItems orderStatus deliveryDate courierStatus.status courierStatus.receivedAt courierStatusHistory createdAt')
      .lean();
    const counts: Record<AskResult, number> = { sent: 0, failed: 0, skipped: 0, holdout: 0, busy: 0 };
    let capped = false;
    for (const order of orders.slice(0, limit)) {
      if (counts.sent >= maxSends) {
        capped = true;
        break;
      }
      const deliveredAt = ReviewRequestService.deliveredAt(order);
      // A later courier update moved receivedAt; the real delivery is outside the window.
      if (!deliveredAt || deliveredAt > to) continue;
      try {
        counts[await this.ask(order, deliveredAt, deliveredAt < from ? 'delivered_too_long_ago' : '', now, config)] += 1;
      } catch (error) {
        this.logger.warn(`Review request for order ${order.orderId} failed: ${error?.message || error}`);
      }
    }
    return { ...counts, more: orders.length > limit, capped };
  }

  /** When the books arrived: the Delivered status date, else the courier's "delivered" update. */
  static deliveredAt(order: any): Date | null {
    const dates: Date[] = [];
    if (Number(order?.orderStatus) === 5 && order?.deliveryDate) dates.push(new Date(order.deliveryDate));
    const history = (Array.isArray(order?.courierStatusHistory) ? order.courierStatusHistory : [])
      .filter((entry: any) => entry?.status === 'delivered' && entry?.receivedAt)
      .map((entry: any) => new Date(entry.receivedAt));
    if (history.length) dates.push(new Date(Math.min(...history.map((date) => date.getTime()))));
    else if (order?.courierStatus?.status === 'delivered' && order?.courierStatus?.receivedAt) dates.push(new Date(order.courierStatus.receivedAt));
    const valid = dates.filter((date) => !Number.isNaN(date.getTime()));
    return valid.length ? new Date(Math.min(...valid.map((date) => date.getTime()))) : null;
  }

  /** The books in an order (gifts such as the free notebook left out), one row per book. */
  static books(order: any): any[] {
    const seen = new Set<string>();
    return (Array.isArray(order?.orderedItems) ? order.orderedItems : []).filter((item: any) => {
      const id = String(item?._id || '');
      if (!id || item?.isGift || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  /** 8801XXXXXXXXX -> the ways the shop stores that phone number on orders. */
  static phoneVariants(wa: string): string[] {
    const local = '0' + String(wa).slice(3);
    return [local, '+88' + local, '88' + local];
  }

  /** Same number -> same bucket 0-99 (holdout group). */
  static bucket(wa: string): number {
    return crypto.createHash('sha256').update(`review-holdout:${wa}`).digest().readUInt16BE(0) % 100;
  }

  private async ask(order: any, deliveredAt: Date, tooOld: string, now: Date, config: ReturnType<ReviewRequestService['config']>): Promise<AskResult> {
    const claim = await this.orderModel.updateOne(
      { _id: order._id, reviewRequest: { $exists: false } },
      { $set: { reviewRequest: { status: 'checking', at: now, deliveredAt } } },
    );
    if (!claim.modifiedCount) return 'busy';
    const finish = async (status: 'skipped' | 'holdout' | 'failed' | 'sent', reason = '', extra: Record<string, any> = {}) => {
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { 'reviewRequest.status': status, ...(reason ? { 'reviewRequest.reason': reason } : {}), ...extra } },
      );
      return status;
    };
    if (tooOld) return finish('skipped', tooOld);
    const books = ReviewRequestService.books(order);
    if (!books.length) return finish('skipped', 'no_books');
    const wa = WhatsappService.toWhatsappNumber(order.phoneNo);
    if (!wa) return finish('skipped', 'no_whatsapp_number');
    const withWa = { 'reviewRequest.wa': wa };
    if (config.skipNumbers.includes(wa)) return finish('skipped', 'staff_number', withWa);
    const blocked = await this.whatsapp.followUpBlocked(wa);
    if (blocked) return finish('skipped', blocked, withWa);
    const asked = await this.orderModel.exists({
      _id: { $ne: order._id },
      'reviewRequest.wa': wa,
      'reviewRequest.status': { $in: ['sent', 'holdout'] },
      'reviewRequest.at': { $gte: new Date(now.getTime() - ASK_AGAIN_DAYS * DAY_MS) },
    });
    if (asked) return finish('skipped', 'asked_recently', withWa);
    // Holdout: not asked, so the dashboard can compare their reorders with the asked customers'.
    if (config.holdout && ReviewRequestService.bucket(wa) < config.holdout) return finish('holdout', '', withWa);
    const token = crypto.randomBytes(12).toString('base64url');
    await this.orderModel.updateOne({ _id: order._id }, { $set: { 'reviewRequest.token': token, ...withWa } });
    const result = await this.whatsapp.notifyOrder('review_request', { ...order, orderedItems: books, reviewRequest: { token } });
    if (result === 'sent') return finish('sent');
    if (result === 'failed') {
      const saved: any = await this.orderModel.findById(order._id).select('whatsappMessages').lean();
      const message = (saved?.whatsappMessages || []).find((item: any) => item?.kind === 'review_request');
      return finish('failed', String(message?.error || 'not sent').slice(0, 300));
    }
    return finish('skipped', 'whatsapp_off');
  }

  /** The answer to a tap on the review request's buttons (WhatsappService sends it). */
  async answerReply(reply: WhatsappReviewReply): Promise<WhatsappReviewAnswer | null> {
    if (!Types.ObjectId.isValid(reply.orderId)) return null;
    const order: any = await this.orderModel
      .findById(reply.orderId)
      .select('orderId phoneNo orderedItems reviewRequest createdAt')
      .lean();
    const request = order?.reviewRequest;
    if (!request?.token) return null;
    // Only the number the request went to.
    if (request.wa !== reply.from && WhatsappService.toWhatsappNumber(order.phoneNo) !== reply.from) return null;
    const now = new Date();
    if (reply.action === 'more' || reply.action === 'nomore') return this.answerMoreBooks(order, reply, now);
    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { 'reviewRequest.reply': reply.action, 'reviewRequest.repliedAt': now } },
    );
    const link = WhatsappService.reviewLink(request.token);
    if (reply.action === 'problem') {
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { customerRequest: { kind: 'problem', at: now, via: 'whatsapp', ...(reply.messageId ? { messageId: reply.messageId } : {}) } } },
      );
      return {
        text: [
          'দুঃখিত! 😔 কী সমস্যা হয়েছে, এখানেই লিখে জানান। ছবি দিলে আরও ভালো হয়।',
          'আমাদের টিম দ্রুত সমাধান করবে ইনশাআল্লাহ।',
          '',
          `চাইলে বই নিয়ে আপনার মতামতও লিখতে পারেন: ${link}`,
          SIGN,
        ].join('\n'),
        request: { kind: 'problem', orderId: String(order.orderId || ''), order: order._id },
      };
    }
    if (reply.action === 'unread') {
      return {
        text: [
          'কোনো সমস্যা নেই! 📖',
          'পড়া শেষ হলে এই লিংকে বই নিয়ে আপনার মতামত লিখুন (লিংকটি ৬০ দিন খোলা থাকবে):',
          link,
          SIGN,
        ].join('\n'),
      };
    }
    const config = this.config();
    const lines = [
      'শুনে খুব ভালো লাগলো! 😊',
      'বই নিয়ে দুই লাইন লিখে দিলে অন্য পাঠকরা বই বাছতে সাহায্য পাবেন:',
      link,
    ];
    if (config.rewardCoupon) lines.push('', 'রিভিউ দিলেই পাবেন পরের অর্ডারে ছাড়ের কুপন 🎁');
    // A customer who already ordered again needs no suggestion.
    const orderedAgain = await this.orderModel.exists({
      _id: { $ne: order._id },
      phoneNo: { $in: ReviewRequestService.phoneVariants(reply.from) },
      createdAt: { $gt: request.deliveredAt || order.createdAt },
    });
    const book = orderedAgain ? null : await this.suggestBook(order, reply.from);
    if (book) {
      lines.push(
        '',
        `আপনার জন্য পরের বই: ${book.name} — ${WhatsappService.bengaliNumber(WhatsappService.shopPrice(book))} টাকা`,
        WhatsappService.productLink(book.slug),
      );
      await this.orderModel.updateOne({ _id: order._id }, { $set: { 'reviewRequest.suggested': String(book.slug) } });
    }
    lines.push(SIGN);
    return { text: lines.join('\n') };
  }

  /**
   * One book for the customer: the best seller by the same author, else the same publisher, else
   * the same category, that is published, in stock and not bought on this number before.
   */
  async suggestBook(order: any, wa: string): Promise<any | null> {
    return (await this.suggestBooks(order, wa, 1))[0] || null;
  }

  /**
   * Up to `limit` such books (owner, 2026-11-14: "they can purchase more products along the way"):
   * best sellers by the same author first, then publisher, then category; no book twice.
   */
  async suggestBooks(order: any, wa: string, limit = 4): Promise<any[]> {
    const picked: any[] = [];
    try {
      const past: any[] = await this.orderModel
        .find({ phoneNo: { $in: ReviewRequestService.phoneVariants(wa) } })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('orderedItems._id')
        .lean();
      const bought = new Set<string>(ReviewRequestService.books(order).map((item: any) => String(item._id)));
      past.forEach((item) => (item.orderedItems || []).forEach((line: any) => line?._id && bought.add(String(line._id))));
      const ids = ReviewRequestService.books(order).map((item: any) => item._id).filter((id: any) => Types.ObjectId.isValid(String(id)));
      const read: any[] = ids.length
        ? await this.productModel.find({ _id: { $in: ids } }).select('author._id publisher._id category._id').lean()
        : [];
      const objectIds = (values: any[]) => [...new Set(values.filter((id) => id && Types.ObjectId.isValid(String(id))).map(String))]
        .map((id) => new Types.ObjectId(id));
      const authors = objectIds(read.flatMap((product) => (product.author || []).map((author: any) => author?._id)));
      const publishers = objectIds(read.map((product) => product.publisher?._id));
      const categories = objectIds(read.flatMap((product) => (product.category || []).map((category: any) => category?._id)));
      const base = {
        status: 'publish',
        _id: { $nin: [...bought].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) },
        salePrice: { $gt: 0 },
        quantity: { $gt: 0 },
        stock: { $not: { $lte: 0 } },
        isPreOrder: { $ne: true },
      };
      const tiers = [
        authors.length ? { 'author._id': { $in: authors } } : null,
        publishers.length ? { 'publisher._id': { $in: publishers } } : null,
        categories.length ? { 'category._id': { $in: categories } } : null,
      ].filter(Boolean);
      for (const tier of tiers) {
        if (picked.length >= limit) break;
        const products: any[] = await this.productModel
          .find({ ...base, ...tier, _id: { $nin: [...base._id.$nin, ...picked.map((product) => product._id)] } })
          .sort({ totalSold: -1, _id: -1 })
          .limit(limit - picked.length)
          .select('name slug salePrice discountType discountAmount images author.name')
          .lean();
        products.forEach((product) => {
          if (product?.slug && WhatsappService.shopPrice(product) > 0) picked.push(product);
        });
      }
    } catch (error) {
      this.logger.warn(`Book suggestion failed: ${error?.message || error}`);
    }
    return picked.slice(0, limit);
  }

  /** Suggested books as the shop pages show them (review page, customer dashboard). */
  static shelf(products: any[]) {
    return products.map((product) => ({
      name: String(product.name || ''),
      slug: String(product.slug || ''),
      image: String((product.images || [])[0] || ''),
      author: (product.author || []).map((author: any) => author?.name).filter(Boolean).join(', '),
      price: WhatsappService.shopPrice(product),
      listPrice: Math.floor(Math.max(0, Number(product.salePrice) || 0)),
    }));
  }

  /** More books for the customer behind a review link (shown under the reviews). */
  private async moreFor(order: any) {
    const wa = WhatsappService.toWhatsappNumber(order?.phoneNo) || String(order?.phoneNo || '');
    return ReviewRequestService.shelf(await this.suggestBooks(order, wa, 4));
  }

  /** More books for a logged-in customer, from their latest order (customer dashboard). */
  async moreForUser(user: any) {
    const id = String(user?._id || '');
    if (!Types.ObjectId.isValid(id)) return { success: true, data: [] };
    const order: any = await this.orderModel
      .findOne({ user: new Types.ObjectId(id), orderStatus: { $nin: [...CLOSED_STATUSES, 10] } }) // not cancelled / returned / trash
      .sort({ createdAt: -1 })
      .select('phoneNo orderedItems')
      .lean();
    return { success: true, data: order ? await this.moreFor(order) : [] };
  }

  /** Review page links of a logged-in customer's orders that are still open (60 days). */
  async linksFor(user: any) {
    const id = String(user?._id || '');
    if (!Types.ObjectId.isValid(id)) return { success: true, data: [] };
    const orders: any[] = await this.orderModel
      .find({ user: new Types.ObjectId(id), 'reviewRequest.token': { $type: 'string' } })
      .select('reviewRequest.token reviewRequest.at')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return {
      success: true,
      data: orders
        .filter((order) => !ReviewRequestService.expired(order))
        .map((order) => ({ order: String(order._id), token: String(order.reviewRequest.token) })),
    };
  }

  /* ---------------- Review published (owner, 2026-11-13) ---------------- */

  /**
   * Staff approved a review written from the WhatsApp link: one message per order ("your review is
   * published, see it here", template review_approved) that also asks if they need more books.
   * Not for numbers that said "stop". Off until WHATSAPP_TEMPLATE_REVIEW_APPROVED is set.
   */
  async notifyApproved(reviewId: string): Promise<'sent' | 'failed' | 'skipped'> {
    if (!Types.ObjectId.isValid(String(reviewId || ''))) return 'skipped';
    if (!this.whatsapp.isActive('review_approved')) return 'skipped';
    const review: any = await this.reviewModel.findById(reviewId).select('status order product').lean();
    if (review?.status !== true || !review.order?._id) return 'skipped';
    const order: any = await this.orderModel
      .findById(review.order._id)
      .select('orderId name phoneNo orderedItems reviewRequest')
      .lean();
    if (!order?.reviewRequest?.token) return 'skipped';
    const wa = WhatsappService.toWhatsappNumber(order.phoneNo);
    if (!wa || (await this.whatsapp.followUpBlocked(wa)) === 'opted_out') return 'skipped';
    const product: any = review.product?._id
      ? await this.productModel.findById(review.product._id).select('name slug').lean()
      : null;
    const approved = {
      name: String(product?.name || review.product?.name || ''),
      slug: String(product?.slug || review.product?.slug || ''),
      review: review._id,
      at: new Date(),
    };
    if (!approved.name || !approved.slug) return 'skipped';
    await this.orderModel.updateOne(
      { _id: order._id, 'reviewRequest.approved': { $exists: false } },
      { $set: { 'reviewRequest.approved': approved } },
    );
    return this.whatsapp.notifyOrder('review_approved', { ...order, reviewRequest: { ...order.reviewRequest, approved } });
  }

  /** Taps on the "review published" message: হ্যাঁ, বই লাগবে (more) / এখন না (nomore). */
  private async answerMoreBooks(order: any, reply: WhatsappReviewReply, now: Date): Promise<WhatsappReviewAnswer> {
    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { 'reviewRequest.approvedReply': reply.action, 'reviewRequest.approvedReplyAt': now } },
    );
    if (reply.action === 'nomore') {
      return { text: ['ঠিক আছে! 😊 কখনো বই লাগলে এখানেই লিখবেন।', 'রিভিউ দেওয়ার জন্য আবারও ধন্যবাদ।', SIGN].join('\n') };
    }
    // Staff see "📚 Wants new books" in the WhatsApp Inbox until Mark done (an open problem stays first).
    const flagged = await this.orderModel.updateOne(
      {
        _id: order._id,
        $or: [{ customerRequest: { $exists: false } }, { customerRequest: null }, { 'customerRequest.doneAt': { $exists: true } }],
      },
      { $set: { customerRequest: { kind: 'books', at: now, via: 'whatsapp', ...(reply.messageId ? { messageId: reply.messageId } : {}) } } },
    );
    const lines = ['আলহামদুলিল্লাহ! কোন বই লাগবে, এখানেই নাম লিখে জানান।', 'আমাদের টিম আপনার জন্য নতুন অর্ডার করে দেবে ইনশাআল্লাহ।'];
    const book = await this.suggestBook(order, reply.from);
    if (book) {
      lines.push(
        '',
        `আপনার জন্য একটি বই: ${book.name} — ${WhatsappService.bengaliNumber(WhatsappService.shopPrice(book))} টাকা`,
        WhatsappService.productLink(book.slug),
      );
    }
    lines.push('', `সব বই: ${SITE_URL}`, SIGN);
    return {
      text: lines.join('\n'),
      ...(flagged.modifiedCount ? { request: { kind: 'books', orderId: String(order.orderId || ''), order: order._id } } : {}),
    };
  }

  /* ---------------- Review page (amolbooks.com/rate/<token>) ---------------- */

  private async orderByToken(token: string): Promise<any> {
    if (!TOKEN_PATTERN.test(String(token || ''))) throw new NotFoundException('এই লিংকটি খুঁজে পাওয়া যায়নি।');
    const order: any = await this.orderModel
      .findOne({ 'reviewRequest.token': token })
      .select('orderId name phoneNo orderedItems reviewRequest')
      .lean();
    if (!order) throw new NotFoundException('এই লিংকটি খুঁজে পাওয়া যায়নি।');
    return order;
  }

  /** The order's number as the login box shows it (017•••••678), or '' when no code can go to it. */
  static phoneHint(phoneNo: any): string {
    try {
      const phone = normalizeOrderPhone(String(phoneNo || ''));
      return phone.slice(0, 3) + '•••••' + phone.slice(-3);
    } catch {
      return '';
    }
  }

  static expired(order: any, now = new Date()): boolean {
    const at = new Date(order?.reviewRequest?.at || 0).getTime();
    return !at || now.getTime() > at + LINK_DAYS * DAY_MS;
  }

  /** What the review page shows: the books of the order and the reviews already written. */
  async page(token: string) {
    const order = await this.orderByToken(token);
    const books = ReviewRequestService.books(order);
    const products: any[] = await this.productModel
      .find({ _id: { $in: books.map((item: any) => item._id).filter((id: any) => Types.ObjectId.isValid(String(id))) } })
      .select('name slug images author.name category.name description shortDescription')
      .lean();
    const byId = new Map(products.map((product) => [String(product._id), product]));
    const reviews: any[] = await this.reviewModel
      .find({ 'order._id': order._id })
      .select('product._id rating review status images')
      .lean();
    const reviewed = new Map(reviews.map((review) => [String(review.product?._id), review]));
    // A book this customer already reviewed from an earlier order (same number) is not asked again.
    const earlier = new Map<string, any>();
    const ids = books.map((item: any) => item._id).filter((id: any) => Types.ObjectId.isValid(String(id)));
    const wa = WhatsappService.toWhatsappNumber(order.phoneNo);
    if (wa && ids.length) {
      const others: any[] = await this.orderModel
        .find({ _id: { $ne: order._id }, phoneNo: { $in: ReviewRequestService.phoneVariants(wa) } })
        .select('_id')
        .limit(200)
        .lean();
      if (others.length) {
        const old: any[] = await this.reviewModel
          .find({ 'order._id': { $in: others.map((other) => other._id) }, 'product._id': { $in: ids } })
          .select('product._id rating review status')
          .lean();
        old.forEach((review) => earlier.set(String(review.product?._id), review));
      }
    }
    const reward = this.config().rewardCoupon;
    return {
      success: true,
      data: {
        // Books to buy next, under the reviews (also when the link has expired).
        more: await this.moreFor(order),
        orderId: String(order.orderId || ''),
        name: String(order.name || '').trim().slice(0, 60),
        expired: ReviewRequestService.expired(order),
        // Login with an SMS code to this number (ReviewLoginService).
        phoneHint: ReviewRequestService.phoneHint(order.phoneNo),
        rewardOffered: !!reward,
        reward: reviews.length && reward ? reward : '',
        books: books.map((item: any) => {
          const product = byId.get(String(item._id)) || {};
          const review = reviewed.get(String(item._id));
          const before = review ? null : earlier.get(String(item._id));
          return {
            product: String(item._id),
            name: String(product.name || item.name || ''),
            slug: String(product.slug || item.slug || ''),
            image: String((product.images || [])[0] || item.image || ''),
            author: (product.author || []).map((author: any) => author?.name).filter(Boolean).join(', '),
            // Writing help from the book's description (review-hints.ts).
            hints: reviewHints({ name: product.name || item.name, description: product.description, shortDescription: product.shortDescription, category: product.category }),
            review: review
              ? { rating: review.rating, review: review.review, images: review.images || [], approved: review.status === true }
              : before
                ? { rating: before.rating, review: before.review, images: [], approved: before.status === true, earlier: true }
                : null,
          };
        }),
      },
    };
  }

  /** Photos uploaded through the shop's image upload (…/api/upload/images/<file>). */
  static cleanImages(images: any, host: string): string[] {
    if (!Array.isArray(images)) return [];
    return images
      .map((url) => String(url || '').trim())
      .filter((url) => {
        try {
          const parsed = new URL(url);
          const sameShop = parsed.hostname === host || parsed.hostname === 'amolbooks.com' || parsed.hostname.endsWith('.amolbooks.com');
          return ['http:', 'https:'].includes(parsed.protocol) && sameShop
            && /^\/api\/upload\/images\/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i.test(parsed.pathname);
        } catch {
          return false;
        }
      })
      .slice(0, 3);
  }

  /** Save (or, until staff approve it, change) the review of one book in the order. */
  async submit(token: string, body: any, host = '') {
    const order = await this.orderByToken(token);
    if (ReviewRequestService.expired(order)) throw new BadRequestException('এই লিংকের মেয়াদ শেষ হয়ে গেছে।');
    const item = ReviewRequestService.books(order).find((book: any) => String(book._id) === String(body?.product || ''));
    if (!item) throw new BadRequestException('এই বইটি এই অর্ডারে নেই।');
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('১ থেকে ৫ তারা দিন।');
    const text = String(body?.review || '').replace(/\s+\n/g, '\n').trim();
    if (text.length < 2) throw new BadRequestException('বই নিয়ে অন্তত এক লাইন লিখুন।');
    if (text.length > 1500) throw new BadRequestException('রিভিউ ১৫০০ অক্ষরের মধ্যে লিখুন।');
    const name = String(body?.name || order.name || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'পাঠক';
    const images = ReviewRequestService.cleanImages(body?.images, host);
    const existing: any = await this.reviewModel.findOne({ 'order._id': order._id, 'product._id': item._id }).lean();
    if (existing?.status === true) {
      return { success: true, data: { already: true, reward: this.config().rewardCoupon } };
    }
    if (existing) {
      await this.reviewModel.updateOne(
        { _id: existing._id, status: { $ne: true } },
        { $set: { rating, review: text, images, 'user.name': name, reviewDate: new Date() } },
      );
    } else {
      const product: any = await this.productModel.findById(item._id).select('name slug images').lean();
      try {
        await this.reviewModel.create({
          // The account, once the customer logged in on the page (ReviewLoginService); else none yet.
          user: { _id: order.reviewRequest?.user || null, name, profileImg: null },
          product: {
            _id: item._id,
            name: product?.name || item.name,
            images: product?.images || (item.image ? [item.image] : []),
            slug: product?.slug || item.slug,
          },
          review: text,
          rating,
          // Pending like every customer review: staff approve it in the admin panel's Reviews.
          status: false,
          reviewDate: new Date(),
          images,
          order: { _id: order._id, orderId: String(order.orderId || '') },
          verifiedPurchase: true,
        });
      } catch (error) {
        // Sent twice at once: the first one is kept.
        if (error?.code !== 11000) throw error;
      }
    }
    const count = await this.reviewModel.countDocuments({ 'order._id': order._id });
    await this.orderModel.updateOne(
      { _id: order._id },
      { $set: { 'reviewRequest.reviews': count, 'reviewRequest.reviewedAt': new Date() } },
    );
    return { success: true, data: { saved: true, reward: this.config().rewardCoupon } };
  }

  /* ---------------- Numbers for staff ---------------- */

  /** Requests in the last `days` days: sent, read, taps, reviews, and reorders within 30 days. */
  async stats(daysParam: any) {
    const days = Math.min(180, Math.max(1, Math.round(Number(daysParam) || 30)));
    const now = Date.now();
    const since = new Date(now - days * DAY_MS);
    const orders: any[] = await this.orderModel
      .find({ 'reviewRequest.at': { $gte: since } })
      .select('orderId name phoneNo reviewRequest whatsappMessages.kind whatsappMessages.status')
      .sort({ 'reviewRequest.at': -1 })
      .limit(5000)
      .lean();
    const groups: Record<string, any[]> = { sent: [], holdout: [] };
    const skipped: Record<string, number> = {};
    let failed = 0;
    let read = 0;
    let delivered = 0;
    const replies: Record<string, number> = { liked: 0, unread: 0, problem: 0 };
    let reviewed = 0;
    let reviews = 0;
    for (const order of orders) {
      const request = order.reviewRequest || {};
      if (request.status === 'sent') {
        groups.sent.push(order);
        const message = (order.whatsappMessages || []).find((item: any) => item?.kind === 'review_request');
        if (message?.status === 'read') read += 1;
        if (['delivered', 'read'].includes(message?.status)) delivered += 1;
        if (request.reply && replies[request.reply] !== undefined) replies[request.reply] += 1;
        if (request.reviews > 0) {
          reviewed += 1;
          reviews += request.reviews;
        }
      } else if (request.status === 'holdout') groups.holdout.push(order);
      else if (request.status === 'failed') failed += 1;
      else if (request.status === 'skipped') skipped[request.reason || 'other'] = (skipped[request.reason || 'other'] || 0) + 1;
    }
    // Reorders: another order on the same number within 30 days after the request.
    const reordered = async (list: any[]) => {
      const wanted = list.filter((order) => order.reviewRequest?.wa);
      if (!wanted.length) return { count: 0, suggestedBought: 0 };
      const phones = [...new Set(wanted.flatMap((order) => ReviewRequestService.phoneVariants(order.reviewRequest.wa)))];
      const later: any[] = await this.orderModel
        .find({ phoneNo: { $in: phones }, createdAt: { $gte: since }, orderStatus: { $nin: CLOSED_STATUSES } })
        .select('phoneNo createdAt orderedItems.slug')
        .lean();
      let count = 0;
      let suggestedBought = 0;
      for (const order of wanted) {
        const variants = new Set(ReviewRequestService.phoneVariants(order.reviewRequest.wa));
        const start = new Date(order.reviewRequest.at).getTime();
        const matches = later.filter((next) => variants.has(String(next.phoneNo)) && new Date(next.createdAt).getTime() > start
          && new Date(next.createdAt).getTime() <= start + 30 * DAY_MS && String(next._id) !== String(order._id));
        if (matches.length) count += 1;
        const suggested = order.reviewRequest.suggested;
        if (suggested && matches.some((next) => (next.orderedItems || []).some((line: any) => line?.slug === suggested))) suggestedBought += 1;
      }
      return { count, suggestedBought };
    };
    const sentReorders = await reordered(groups.sent);
    const holdoutReorders = await reordered(groups.holdout);
    const optedOut = await this.chatModel.countDocuments({ followUpOptOut: true });
    return {
      success: true,
      data: {
        days,
        active: this.whatsapp.isActive('review_request'),
        sent: groups.sent.length,
        delivered,
        read,
        failed,
        skipped,
        replies,
        reviewedOrders: reviewed,
        reviews,
        reorders: sentReorders.count,
        suggestedBought: sentReorders.suggestedBought,
        holdout: groups.holdout.length,
        holdoutReorders: holdoutReorders.count,
        optedOut,
        recent: orders.slice(0, 50).map((order) => ({
          orderId: String(order.orderId || ''),
          name: String(order.name || ''),
          at: order.reviewRequest?.at || null,
          status: order.reviewRequest?.status || '',
          reason: order.reviewRequest?.reason || '',
          message: ((order.whatsappMessages || []).find((item: any) => item?.kind === 'review_request') || {}).status || '',
          reply: order.reviewRequest?.reply || '',
          reviews: order.reviewRequest?.reviews || 0,
          suggested: order.reviewRequest?.suggested || '',
        })),
      },
    };
  }
}
