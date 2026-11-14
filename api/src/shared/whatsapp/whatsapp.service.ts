import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

export type WhatsappOrderKind = 'order_placed' | 'order_shipped' | 'review_request' | 'review_approved';
/** A template button: a quick reply's payload, or the variable end of a "Visit website" address. */
export type TemplateButton = string | { url: string };
/** What the order message's second button means: "একই ডেলিভারি চার্জে আরও বই নিবো" (order_confirm_v2) or "পরিবর্তন চাই" (order_confirm). */
export type WhatsappSecondButton = 'more' | 'change';

/** A customer's tap on the order message's buttons, handed to OrderService. */
export interface WhatsappCustomerReply {
  action: 'confirm' | 'change' | 'more';
  orderId: string;
  from: string;
  messageId?: string;
}
/** What OrderService did with it: decides the answer the customer gets. */
export interface WhatsappReplyResult {
  status: 'confirmed' | 'already' | 'change' | 'more' | 'closed' | 'unknown';
  orderId?: string;
  /** "more": books to offer (not the ones already in the order), with today's shop price. */
  books?: WhatsappBook[];
}
/** A book offered on WhatsApp (the "আরও বই" answer and the inbox's price list). */
export interface WhatsappBook {
  name: string;
  price: number;
  slug: string;
}
type ReplyHandler = (reply: WhatsappCustomerReply) => Promise<WhatsappReplyResult>;
/**
 * A tap on the review request's buttons: ভালো লাগছে (liked) / এখনো পড়িনি (unread) / সমস্যা আছে
 * (problem); or on the "review published" message's: হ্যাঁ, বই লাগবে (more) / এখন না (nomore).
 */
export interface WhatsappReviewReply {
  action: 'liked' | 'unread' | 'problem' | 'more' | 'nomore';
  orderId: string;
  from: string;
  messageId?: string;
}
/** ReviewRequestService's answer: the text, and for "problem" the inbox nudge for staff. */
export interface WhatsappReviewAnswer {
  text: string;
  request?: { kind: string; orderId: string; order: any };
}
type ReviewReplyHandler = (reply: WhatsappReviewReply) => Promise<WhatsappReviewAnswer | null>;
type ReviewApprovedHandler = (reviewId: string) => Promise<unknown>;
type OrderSmsHandler = (orderId: string) => Promise<void>;
/** One message for the WhatsApp Inbox (whatsapp-chat.schema.ts). */
export interface WhatsappChatEntry {
  wa: string;
  direction: 'in' | 'out';
  kind: 'customer' | 'order' | 'auto' | 'staff';
  type: string;
  text?: string;
  media?: { id?: string; mime?: string; filename?: string };
  messageId?: string;
  status?: string;
  error?: string;
  orderId?: string;
  by?: { _id?: any; name?: string };
  at?: Date;
  name?: string;
}
/** What customers get when they write (not a button): see replyText. */
export type WhatsappAutoReply = 'inbox' | 'handover' | 'off';

/** Status order, so a late "delivered" never overwrites "read". */
const STATUS_RANK: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
const SEND_TIMEOUT_MS = 10000;
const MAX_PARAM_LENGTH = 200;
/** One hand-over answer per customer in this time, however many messages they send. */
const HANDOVER_EVERY_MS = 12 * 60 * 60 * 1000;
const SEEN_LIMIT = 2000;
/** How long an order SMS waits for the WhatsApp message to be delivered (WHATSAPP_SMS_WAIT_SECONDS). */
const DEFAULT_SMS_WAIT_SECONDS = 120;
const SMS_CHECK_EVERY_MS = 15 * 1000;
const SMS_BATCH = 100;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
const SITE_URL = 'https://amolbooks.com';
/**
 * Books offered when a customer wants more (the owner's WhatsApp price list, 2026-11-12), by their
 * slug on amolbooks.com. Name and price are read from the shop each time, so price changes follow;
 * unpublished or unknown slugs are skipped ("পাওয়ার অব দুয়া" is not on the site yet).
 * WHATSAPP_BOOK_LIST (slugs, comma-separated) replaces the list without a code change.
 */
const DEFAULT_BOOK_LIST = [
  '500 shobder kuraner 75%',
  'productive muslim',
  'the-barakah-effect',
  'islami-orthonity-o-uddokta-47',
  'the-story-of-muhammad',
  'secrets-of-wealth-and-provision',
];
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';
/** A customer's "stop" (whole message): no more review requests or book suggestions; order updates still go out. */
const STOP_WORDS = ['stop', 'unsubscribe', 'বন্ধ', 'বন্ধ করুন', 'বন্ধ করো', 'বন্ধ কর', 'মেসেজ বন্ধ', 'মেসেজ বন্ধ করুন', 'আর মেসেজ দিবেন না', 'আর মেসেজ দেবেন না'];

/**
 * Automatic WhatsApp order messages through Meta's WhatsApp Cloud API (template messages).
 * Off unless WHATSAPP_ENABLED=true and the token, phone number id and template names are set
 * (see scripts/WHATSAPP_ORDERS.md). Every send is recorded on the order (whatsappMessages), at
 * most once per kind, and delivery updates arrive at POST /api/whatsapp/webhook.
 * The order-placed SMS waits for the WhatsApp message and goes out only when that is not
 * delivered in time (owner, 2026-11-10): holdOrderSms / settleOrderSms.
 */
@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private replyHandler: ReplyHandler | null = null;
  private reviewHandler: ReviewReplyHandler | null = null;
  private reviewApprovedHandler: ReviewApprovedHandler | null = null;
  private orderSmsHandler: OrderSmsHandler | null = null;
  private readonly seenMessages = new Set<string>();
  private readonly lastHandover = new Map<string, number>();
  private smsTimer: NodeJS.Timeout | null = null;
  private settling = false;

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    // WhatsApp Inbox storage; without it (some checks) messages are simply not kept.
    @Optional() @InjectModel('WhatsappChat') private readonly chatModel?: Model<any>,
    @Optional() @InjectModel('WhatsappChatMessage') private readonly chatMessageModel?: Model<any>,
    // Book list in the "more books" answer; without it (some checks) the short answer is used.
    @Optional() @InjectModel('Product') private readonly productModel?: Model<any>,
  ) {}

  /** Held SMS are checked all the time (also after WhatsApp is switched off), so none is lost. */
  onModuleInit() {
    this.smsTimer = setInterval(() => void this.settleOrderSms().catch((error) =>
      this.logger.warn(`WhatsApp SMS check failed: ${error?.message || error}`)), SMS_CHECK_EVERY_MS);
    if (typeof this.smsTimer.unref === 'function') this.smsTimer.unref();
  }

  onModuleDestroy() {
    if (this.smsTimer) clearInterval(this.smsTimer);
    this.smsTimer = null;
  }

  /** Read at call time, so the switch works without code changes (restart after editing .env). */
  config() {
    const env = process.env;
    const buttons = String(env.WHATSAPP_CONFIRM_BUTTONS || '').trim().toLowerCase().replace(/\s+/g, '');
    return {
      enabled: env.WHATSAPP_ENABLED === 'true',
      token: String(env.WHATSAPP_ACCESS_TOKEN || '').trim(),
      phoneNumberId: String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
      apiVersion: String(env.WHATSAPP_API_VERSION || 'v26.0').trim(),
      graphBase: String(env.WHATSAPP_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/+$/, ''),
      language: String(env.WHATSAPP_TEMPLATE_LANGUAGE || 'bn').trim(),
      templates: {
        order_placed: String(env.WHATSAPP_TEMPLATE_ORDER_PLACED || '').trim(),
        order_shipped: String(env.WHATSAPP_TEMPLATE_ORDER_SHIPPED || '').trim(),
        // 14 days after delivery (ReviewRequestService); empty = no review requests.
        review_request: String(env.WHATSAPP_TEMPLATE_REVIEW_REQUEST || '').trim(),
        // When staff approve a review from the review page; empty = no message.
        review_approved: String(env.WHATSAPP_TEMPLATE_REVIEW_APPROVED || '').trim(),
      } as Record<WhatsappOrderKind, string>,
      appSecret: String(env.WHATSAPP_APP_SECRET || '').trim(),
      verifyToken: String(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim(),
      // The order template has two quick-reply buttons: "অর্ডার কনফার্ম" and a second one.
      confirmButtons: buttons === 'true' || /^confirm,(more|change)$/.test(buttons),
      // Second button: "true" follows the template (order_confirm = "পরিবর্তন চাই", later ones =
      // "একই ডেলিভারি চার্জে আরও বই নিবো"); "confirm,more" / "confirm,change" says it outright.
      secondButton: (buttons.startsWith('confirm,') ? buttons.slice(8)
        : String(env.WHATSAPP_TEMPLATE_ORDER_PLACED || '').trim() === 'order_confirm' ? 'change' : 'more') as WhatsappSecondButton,
      // How long the order SMS waits for the WhatsApp message to be delivered.
      smsWaitMs: Math.max(30, Number(env.WHATSAPP_SMS_WAIT_SECONDS) || DEFAULT_SMS_WAIT_SECONDS) * 1000,
      // The staff WhatsApp (Business app) number customers are sent to for questions.
      helpNumber: String(env.WHATSAPP_HELP_NUMBER || '8801893058682').replace(/\D/g, ''),
      // Customers' own messages: inbox (default since the WhatsApp Inbox, 2026-11-10: "we got it,
      // our team answers here"), handover (point them to helpNumber) or off (no automatic answer).
      autoReply: (['inbox', 'handover', 'off'].includes(String(env.WHATSAPP_AUTO_REPLY || '').trim().toLowerCase())
        ? String(env.WHATSAPP_AUTO_REPLY).trim().toLowerCase() : 'inbox') as WhatsappAutoReply,
      // Books offered to customers who want more (slugs on amolbooks.com).
      bookList: String(env.WHATSAPP_BOOK_LIST || '').trim()
        ? String(env.WHATSAPP_BOOK_LIST).split(',').map((slug) => slug.trim()).filter(Boolean)
        : DEFAULT_BOOK_LIST,
    };
  }

  /**
   * Keep one message for the WhatsApp Inbox and update its chat row. 'duplicate' when Meta
   * delivered the same message again (stored once). Never throws: the inbox must not break
   * order messages or button taps.
   */
  async recordChat(entry: WhatsappChatEntry): Promise<'saved' | 'duplicate' | 'skipped'> {
    if (!this.chatModel || !this.chatMessageModel || !entry?.wa) return 'skipped';
    const at = entry.at instanceof Date && !Number.isNaN(entry.at.getTime()) ? entry.at : new Date();
    const text = String(entry.text || '').slice(0, 4096);
    try {
      await this.chatMessageModel.create({
        wa: entry.wa, direction: entry.direction, kind: entry.kind, type: entry.type, text,
        ...(entry.media?.id ? { media: entry.media } : {}),
        ...(entry.messageId ? { messageId: entry.messageId } : {}),
        ...(entry.status ? { status: entry.status } : {}),
        ...(entry.error ? { error: entry.error } : {}),
        ...(entry.orderId ? { orderId: String(entry.orderId) } : {}),
        ...(entry.by?.name ? { by: entry.by } : {}),
        at,
      });
    } catch (error) {
      if (error?.code === 11000) return 'duplicate';
      this.logger.warn(`WhatsApp inbox could not keep a message: ${error?.message || error}`);
      return 'skipped';
    }
    const incoming = entry.direction === 'in';
    const preview = WhatsappService.previewText(entry.type, text);
    try {
      await this.chatModel.updateOne(
        { wa: entry.wa },
        {
          $set: {
            lastAt: at, lastText: preview, lastDirection: entry.direction,
            lastKind: entry.kind, lastBy: entry.kind === 'staff' ? String(entry.by?.name || '') : '',
            ...(incoming ? { lastCustomerAt: at } : {}),
            ...(entry.kind === 'staff' && entry.by?.name ? { lastStaff: { name: String(entry.by.name).slice(0, 80), at } } : {}),
            ...(entry.name ? { name: String(entry.name).slice(0, 120) } : {}),
          },
          ...(incoming ? { $inc: { unread: 1 } } : {}),
          $setOnInsert: { wa: entry.wa },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.warn(`WhatsApp inbox could not update a chat: ${error?.message || error}`);
    }
    return 'saved';
  }

  /** One line for the chat list: the text, or what was sent ("🎤 Voice note"). */
  static previewText(type: string, text: string): string {
    const label: Record<string, string> = { image: '📷 Photo', audio: '🎤 Voice note', video: '🎥 Video', document: '📄 File', sticker: 'Sticker', location: '📍 Location', contacts: '👤 Contact' };
    const body = String(text || '').replace(/\s+/g, ' ').trim();
    const line = label[type] && type !== 'location' && type !== 'contacts' ? (body ? `${label[type]}: ${body}` : label[type]) : body || label[type] || `[${type}]`;
    return line.slice(0, 160);
  }

  /** Free-form message that is also kept in the inbox (automatic answers and staff replies). */
  async sendChatText(to: string, text: string, meta: { kind: 'auto' | 'staff'; by?: { _id?: any; name?: string }; orderId?: string }): Promise<string> {
    const messageId = await this.sendText(to, text);
    await this.recordChat({ wa: to, direction: 'out', kind: meta.kind, type: 'text', text, messageId, status: 'sent', by: meta.by, orderId: meta.orderId });
    return messageId;
  }

  /** Inbox summary of an order message (the template text itself lives at Meta). */
  static templateSummary(kind: WhatsappOrderKind, params: string[]): string {
    if (kind === 'review_request') return `Review request #${params[1]}: ${params[2]}`;
    if (kind === 'review_approved') return `Review published #${params[1]}: ${params[2]}`;
    return kind === 'order_placed'
      ? `Order message #${params[1]}: ${params[2]} · ৳${params[3]}`
      : `Courier message #${params[1]}: ${params[2]} ${params[3]}`;
  }

  /** What a customer's message says, for the inbox: text, caption, button label, or a short note. */
  static incomingContent(message: any): { type: string; text: string; media?: { id?: string; mime?: string; filename?: string } } {
    const type = String(message?.type || 'unsupported');
    const part = message?.[type] || {};
    if (type === 'text') return { type, text: String(part.body || '') };
    if (type === 'button') return { type, text: String(part.text || part.payload || '') };
    if (type === 'interactive') {
      const reply = part.button_reply || part.list_reply || {};
      return { type: 'button', text: String(reply.title || reply.id || '') };
    }
    if (['image', 'audio', 'video', 'document', 'sticker'].includes(type)) {
      return {
        type,
        text: String(part.caption || part.filename || ''),
        media: { id: String(part.id || ''), mime: String(part.mime_type || ''), filename: part.filename ? String(part.filename) : undefined },
      };
    }
    if (type === 'location') {
      const place = [part.name, part.address].filter(Boolean).join(', ');
      return { type, text: `📍 ${place ? place + ' ' : ''}https://maps.google.com/?q=${Number(part.latitude)},${Number(part.longitude)}` };
    }
    if (type === 'contacts') {
      const names = (Array.isArray(message.contacts) ? message.contacts : [])
        .map((contact: any) => [contact?.name?.formatted_name, ...(contact?.phones || []).map((p: any) => p?.phone)].filter(Boolean).join(' '));
      return { type, text: `Contact: ${names.join('; ')}` };
    }
    if (type === 'reaction') return { type, text: `Reacted ${String(part.emoji || '')}`.trim() };
    return { type: 'unsupported', text: '[This message type cannot be shown]' };
  }

  /** OrderService registers what a button tap does (confirm / more / change); see handleWhatsappReply. */
  onCustomerReply(handler: ReplyHandler): void {
    this.replyHandler = handler;
  }

  /** ReviewRequestService registers the answers to the review request's buttons. */
  onReviewReply(handler: ReviewReplyHandler): void {
    this.reviewHandler = handler;
  }

  /** ReviewRequestService registers the "your review is published" message (ReviewRequestService.notifyApproved). */
  onReviewApproved(handler: ReviewApprovedHandler): void {
    this.reviewApprovedHandler = handler;
  }

  /** ReviewService calls this when staff approve a review. Never throws, never waits for WhatsApp. */
  reviewApproved(reviewId: any): void {
    if (!this.reviewApprovedHandler || !reviewId) return;
    void Promise.resolve()
      .then(() => this.reviewApprovedHandler(String(reviewId)))
      .catch((error) => this.logger.warn(`Review published message for ${reviewId} failed: ${error?.message || error}`));
  }

  /**
   * Why this number gets no review request now: it said "stop" (opted_out), or staff still have an
   * open request in the inbox (open_request). null = fine to ask.
   */
  async followUpBlocked(wa: string): Promise<'opted_out' | 'open_request' | null> {
    if (!this.chatModel || !wa) return null;
    const chat: any = await this.chatModel.findOne({ wa }).select('followUpOptOut request').lean();
    if (chat?.followUpOptOut) return 'opted_out';
    if (chat?.request?.kind) return 'open_request';
    return null;
  }

  /** The whole message is a "stop" (English or Bengali, any case, trailing punctuation ignored). */
  static isStopWord(text: any): boolean {
    const clean = String(text || '').toLowerCase().replace(/[\s।.!,?]+$/u, '').replace(/\s+/g, ' ').trim();
    return STOP_WORDS.includes(clean);
  }

  /** OrderService registers how a held order SMS is sent (OrderService.sendHeldOrderSms). */
  onOrderSms(handler: OrderSmsHandler): void {
    this.orderSmsHandler = handler;
  }

  /**
   * Hold the order-placed SMS while the WhatsApp message is on its way: true when held (the
   * caller then skips the SMS). Only when the message will really be sent: switched on, valid
   * number, SMS not sent yet, and OrderService can send it later.
   */
  async holdOrderSms(order: any): Promise<boolean> {
    if (!order?._id || !this.orderSmsHandler || !this.isActive('order_placed')) return false;
    if (!WhatsappService.toWhatsappNumber(order.phoneNo)) return false;
    const held = await this.orderModel.updateOne(
      { _id: order._id, orderSmsSent: { $ne: true }, orderSmsDueAt: { $exists: false } },
      { $set: { orderSmsDueAt: new Date(Date.now() + this.config().smsWaitMs) } },
    );
    return held.modifiedCount > 0;
  }

  /**
   * Decide held order SMS: WhatsApp delivered or read -> no SMS (orderSmsSkippedAt); failed, or
   * still not delivered when the wait is over -> send the SMS now. One order (after a failed send)
   * or every held order (the 15-second check). Returns how many were decided.
   */
  async settleOrderSms(orderId?: string): Promise<number> {
    if (!orderId) {
      if (this.settling) return 0;
      this.settling = true;
    }
    try {
      const filter: Record<string, any> = { orderSmsDueAt: { $exists: true } };
      if (orderId) filter._id = orderId;
      const held: any[] = await this.orderModel.find(filter)
        .select('orderSmsDueAt whatsappMessages').sort({ orderSmsDueAt: 1 }).limit(SMS_BATCH).lean();
      let decided = 0;
      for (const order of held) {
        const message = (order.whatsappMessages || []).find((item: any) => item?.kind === 'order_placed');
        const delivered = message?.status === 'delivered' || message?.status === 'read';
        const due = new Date(order.orderSmsDueAt).getTime() <= Date.now();
        if (!delivered && !due && message?.status !== 'failed') continue;
        if (!delivered && !this.orderSmsHandler) continue;
        // Claim it, so the check and a failed send never both send the SMS.
        const claimed = await this.orderModel.updateOne(
          { _id: order._id, orderSmsDueAt: order.orderSmsDueAt },
          delivered
            ? { $unset: { orderSmsDueAt: 1 }, $set: { orderSmsSkippedAt: new Date() } }
            : { $unset: { orderSmsDueAt: 1 } },
        );
        if (!claimed.modifiedCount) continue;
        decided += 1;
        if (delivered) continue;
        try {
          await this.orderSmsHandler(String(order._id));
        } catch (error) {
          this.logger.warn(`Held order SMS for ${order._id} failed: ${error?.message || error}`);
        }
      }
      return decided;
    } finally {
      if (!orderId) this.settling = false;
    }
  }

  /** wa.me link that opens a chat with the staff number, text already typed. */
  handoverLink(text: string): string {
    return `https://wa.me/${this.config().helpNumber}?text=${encodeURIComponent(text)}`;
  }

  /** True when this kind of message would be sent. */
  isActive(kind: WhatsappOrderKind): boolean {
    const config = this.config();
    return config.enabled && !!config.token && !!config.phoneNumberId && !!config.templates[kind];
  }

  /** 01XXXXXXXXX / +8801XXXXXXXXX / Bengali digits -> 8801XXXXXXXXX; null when not a BD mobile. */
  static toWhatsappNumber(phone: any): string | null {
    const ascii = String(phone == null ? '' : phone).replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
    let digits = ascii.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (/^01[3-9]\d{8}$/.test(digits)) return '88' + digits;
    if (/^8801[3-9]\d{8}$/.test(digits)) return digits;
    return null;
  }

  /** Template text values: one line, no tabs, no long runs of spaces (Meta rejects those). */
  static cleanParam(value: any): string {
    const text = String(value == null ? '' : value)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/ {4,}/g, '   ')
      .trim();
    if (!text) return '-';
    return text.length > MAX_PARAM_LENGTH ? text.slice(0, MAX_PARAM_LENGTH - 1) + '…' : text;
  }

  /** The order's review page (no login): amolbooks.com/rate/<token>. */
  static reviewLink(token: any): string {
    return `${SITE_URL}/rate/${String(token || '')}`;
  }

  /** The book's page on the shop (where a published review shows). */
  static productLink(slug: any): string {
    // ( and ) as %28 / %29, or the storefront's router opens a blank page.
    return `${SITE_URL}/product-details/${encodeURIComponent(String(slug || '')).replace(/\(/g, '%28').replace(/\)/g, '%29')}`;
  }

  static money(value: any): string {
    return Math.round(Math.max(0, Number(value) || 0)).toLocaleString('en-US');
  }

  /** "বই ক × 2, বই খ" — the books on the order, short enough for one template value. */
  static itemsSummary(order: any): string {
    const items = Array.isArray(order?.orderedItems) ? order.orderedItems : [];
    const parts = items.map((item: any) => {
      const name = String(item?.name || item?.product?.name || '').trim();
      const quantity = Number(item?.quantity || item?.selectedQty || 1);
      return name ? (quantity > 1 ? `${name} × ${quantity}` : name) : '';
    }).filter(Boolean);
    return parts.length ? parts.join(', ') : 'আপনার বই';
  }

  /**
   * The books for the review message, short enough for one line whatever the order size (owner,
   * 2026-11-14: "let's say that customer bought 3-4 books"): "বই ক", "বই ক ও বই খ",
   * "বই ক, বই খ ও আরও ২টি বই". The review page lists every book.
   */
  static reviewBooksSummary(order: any): string {
    const names: string[] = [];
    (Array.isArray(order?.orderedItems) ? order.orderedItems : []).forEach((item: any) => {
      const name = String(item?.name || item?.product?.name || '').trim();
      if (name && !names.includes(name)) names.push(name);
    });
    if (!names.length) return 'আপনার বই';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} ও ${names[1]}`;
    return `${names[0]}, ${names[1]} ও আরও ${WhatsappService.bengaliNumber(names.length - 2)}টি বই`;
  }

  static customerName(order: any): string {
    const name = String(order?.name || '').trim();
    return name || 'প্রিয় গ্রাহক';
  }

  /**
   * Template values, in placeholder order ({{1}}, {{2}}, ...). The approved templates must use
   * exactly these (scripts/WHATSAPP_ORDERS.md has the texts).
   */
  static templateParams(kind: WhatsappOrderKind, order: any, courierData?: any): string[] {
    // Review request (template order_feedback): {{1}} name, {{2}} order number, {{3}} the books.
    // Meta files a feedback request as Utility only when it names the order (2026-11-14: the first
    // version without it was moved to Marketing). Its "মতামত দিন" button opens the review page
    // (reviewButtons).
    if (kind === 'review_request') {
      return [
        WhatsappService.customerName(order),
        String(order?.orderId || ''),
        WhatsappService.reviewBooksSummary(order),
      ].map(WhatsappService.cleanParam);
    }
    // Review published (template review_published, Utility): {{1}} name, {{2}} order number,
    // {{3}} the book. Its only button, "রিভিউ দেখুন", opens the same page (the published review, a
    // link to the book, more books). No "need more books?" question or buttons: Meta files any
    // cross-sell as Marketing (the first version, review_approved, was).
    if (kind === 'review_approved') {
      const approved = order?.reviewRequest?.approved || {};
      return [
        WhatsappService.customerName(order),
        String(order?.orderId || ''),
        String(approved.name || WhatsappService.itemsSummary(order)),
      ].map(WhatsappService.cleanParam);
    }
    if (kind === 'order_placed') {
      return [
        WhatsappService.customerName(order),
        String(order?.orderId || ''),
        WhatsappService.itemsSummary(order),
        WhatsappService.money(order?.grandTotal),
      ].map(WhatsappService.cleanParam);
    }
    const courier = courierData || order?.courierData || {};
    return [
      WhatsappService.customerName(order),
      String(order?.orderId || ''),
      String(courier.providerName || 'কুরিয়ার').replace(/\s*Courier$/i, ''),
      String(courier.trackingId || courier.consignmentId || ''),
      String(order?._id || ''),
    ].map(WhatsappService.cleanParam);
  }

  /** Send one order message (at most once per order and kind). Never throws for the caller's flow. */
  async notifyOrder(kind: WhatsappOrderKind, order: any, courierData?: any): Promise<'sent' | 'failed' | 'skipped'> {
    if (!order?._id || !this.isActive(kind)) return 'skipped';
    const config = this.config();
    const to = WhatsappService.toWhatsappNumber(order.phoneNo);
    if (!to) return 'skipped';
    const template = config.templates[kind];
    const now = new Date();
    const claim = await this.orderModel.updateOne(
      { _id: order._id, 'whatsappMessages.kind': { $ne: kind } },
      { $push: { whatsappMessages: { kind, template, to, status: 'sending', at: now } } },
    );
    if (!claim.modifiedCount) return 'skipped';
    let update: Record<string, any>;
    const params = WhatsappService.templateParams(kind, order, courierData);
    const chat: WhatsappChatEntry = { wa: to, direction: 'out', kind: 'order', type: 'template', text: WhatsappService.templateSummary(kind, params), orderId: String(order.orderId || '') };
    try {
      const buttons = kind === 'order_placed' && config.confirmButtons
        ? [`confirm:${order._id}`, `${config.secondButton}:${order._id}`]
        : kind === 'review_request' || kind === 'review_approved'
          ? WhatsappService.reviewButtons(kind, order)
          : undefined;
      const messageId = await this.sendTemplate(to, template, params, buttons);
      update = { 'whatsappMessages.$.status': 'sent', 'whatsappMessages.$.messageId': messageId, 'whatsappMessages.$.updatedAt': new Date() };
      Object.assign(chat, { messageId, status: 'sent' });
    } catch (error) {
      const message = String(error?.message || error).slice(0, 300);
      this.logger.warn(`WhatsApp ${kind} not sent for order ${order.orderId}: ${message}`);
      update = { 'whatsappMessages.$.status': 'failed', 'whatsappMessages.$.error': message, 'whatsappMessages.$.updatedAt': new Date() };
      Object.assign(chat, { status: 'failed', error: message });
    }
    await this.orderModel.updateOne({ _id: order._id, 'whatsappMessages.kind': kind }, { $set: update });
    await this.recordChat(chat);
    // Not sent: a held order SMS goes out now instead of after the wait.
    if (kind === 'order_placed' && update['whatsappMessages.$.status'] === 'failed') {
      await this.settleOrderSms(String(order._id)).catch((error) =>
        this.logger.warn(`Held order SMS for ${order._id} failed: ${error?.message || error}`));
    }
    return update['whatsappMessages.$.status'];
  }

  /**
   * The review templates' buttons, in template order (scripts/WHATSAPP_ORDERS.md): first a "Visit
   * website" button whose address ends in the order's review code (amolbooks.com/rate/{{1}}),
   * then, for the review request only, two quick replies — এখনো পড়িনি / সমস্যা আছে. The review
   * published message has the link only (taps on older ones, হ্যাঁ, বই লাগবে / এখন না, still work).
   */
  static reviewButtons(kind: WhatsappOrderKind, order: any): TemplateButton[] {
    const id = String(order?._id || '');
    const replies = kind === 'review_request' ? ['unread', 'problem'] : [];
    return [
      { url: String(order?.reviewRequest?.token || '') },
      ...replies.map((action) => `review_${action}:${id}`),
    ];
  }

  /**
   * POST /{phone-number-id}/messages with a template; returns Meta's message id. Buttons in template
   * order: a string is a quick reply's payload, { url } the end of a "Visit website" button's address.
   */
  async sendTemplate(to: string, template: string, params: string[], buttons?: TemplateButton[]): Promise<string> {
    const config = this.config();
    const components: any[] = params.length
      ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
      : [];
    (buttons || []).forEach((button, index) => {
      components.push(typeof button === 'string'
        ? { type: 'button', sub_type: 'quick_reply', index: String(index), parameters: [{ type: 'payload', payload: button }] }
        : { type: 'button', sub_type: 'url', index: String(index), parameters: [{ type: 'text', text: button.url }] });
    });
    return this.post(to, { type: 'template', template: { name: template, language: { code: config.language }, components } });
  }

  /** A customer's photo / voice note / file (Meta keeps them 30 days): look up its address, then download it with the token. */
  async fetchMedia(mediaId: string): Promise<{ buffer: Buffer; mime: string }> {
    const config = this.config();
    if (!config.token) throw new Error('WhatsApp is not configured');
    const headers = { Authorization: `Bearer ${config.token}` };
    const signal = AbortSignal.timeout(SEND_TIMEOUT_MS * 2);
    const info: any = await fetch(`${config.graphBase}/${config.apiVersion}/${encodeURIComponent(mediaId)}`, { headers, signal })
      .then((response) => response.json().catch(() => ({})));
    if (!info?.url) throw new Error(info?.error?.message || 'This file is no longer available at WhatsApp');
    if (Number(info.file_size) > MAX_MEDIA_BYTES) throw new Error('File too large to show');
    const file = await fetch(String(info.url), { headers, signal });
    if (!file.ok) throw new Error(`WhatsApp file download failed (${file.status})`);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_MEDIA_BYTES) throw new Error('File too large to show');
    return { buffer, mime: String(info.mime_type || file.headers.get('content-type') || 'application/octet-stream') };
  }

  /** Free-form text; only allowed within 24 hours of the customer's last message (Meta's rule). */
  async sendText(to: string, text: string): Promise<string> {
    return this.post(to, { type: 'text', text: { preview_url: true, body: text } });
  }

  private async post(to: string, message: Record<string, any>): Promise<string> {
    const config = this.config();
    const body = { messaging_product: 'whatsapp', to, ...message };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${config.graphBase}/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      const result: any = await response.json().catch(() => ({}));
      const id = result?.messages?.[0]?.id;
      if (!response.ok || !id) {
        const error = result?.error || {};
        throw new Error(`${error.code || response.status} ${error.message || 'WhatsApp send failed'}`.trim());
      }
      return String(id);
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('timeout: WhatsApp did not answer in 10 s');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET webhook check from Meta: answer the challenge only for our verify token. */
  verifyWebhook(query: any): string | null {
    const { verifyToken } = this.config();
    if (!verifyToken || query?.['hub.mode'] !== 'subscribe') return null;
    const supplied = String(query?.['hub.verify_token'] || '');
    const a = crypto.createHash('sha256').update(supplied).digest();
    const b = crypto.createHash('sha256').update(verifyToken).digest();
    return crypto.timingSafeEqual(a, b) ? String(query?.['hub.challenge'] ?? '') : null;
  }

  /** X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(raw body, app secret). */
  validSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    const { appSecret } = this.config();
    if (!appSecret || !rawBody || !signature) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const a = Buffer.from(String(signature));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /** Delivery updates (sent / delivered / read / failed) and customers' messages. */
  async receiveWebhook(payload: any): Promise<{ updated: number; handled: number }> {
    let updated = 0;
    let handled = 0;
    for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        for (const status of Array.isArray(change?.value?.statuses) ? change.value.statuses : []) {
          if (await this.applyStatus(status)) updated += 1;
        }
        // The customer's WhatsApp profile name comes next to their messages.
        const names = new Map<string, string>();
        for (const contact of Array.isArray(change?.value?.contacts) ? change.value.contacts : []) {
          const wa = String(contact?.wa_id || '').replace(/\D/g, '');
          if (wa && contact?.profile?.name) names.set(wa, String(contact.profile.name));
        }
        for (const message of Array.isArray(change?.value?.messages) ? change.value.messages : []) {
          if (await this.handleMessage(message, names)) handled += 1;
        }
      }
    }
    return { updated, handled };
  }

  /** Kept for callers that only care about delivery updates. */
  async receiveStatuses(payload: any): Promise<number> {
    return (await this.receiveWebhook(payload)).updated;
  }

  /**
   * A customer wrote to the API number. Every message is kept for the WhatsApp Inbox. A tap on
   * "অর্ডার কনফার্ম" / "একই ডেলিভারি চার্জে আরও বই নিবো" / "পরিবর্তন চাই" goes to OrderService;
   * anything else gets at most one automatic answer per 12 hours (WHATSAPP_AUTO_REPLY), naming
   * the customer's latest order.
   */
  private async handleMessage(message: any, names: Map<string, string> = new Map()): Promise<boolean> {
    const id = String(message?.id || '');
    const from = String(message?.from || '').replace(/\D/g, '');
    if (!id || !from || this.seenMessages.has(id)) return false;
    this.seenMessages.add(id);
    if (this.seenMessages.size > SEEN_LIMIT) this.seenMessages.delete(this.seenMessages.values().next().value);
    const content = WhatsappService.incomingContent(message);
    // Arrival time (Meta's timestamp has whole seconds only), so the chat reads in the order
    // things happened, our answers included.
    const kept = await this.recordChat({
      wa: from, direction: 'in', kind: 'customer', type: content.type, text: content.text,
      media: content.media, messageId: id, at: new Date(), name: names.get(from),
    });
    // Meta sent it again (e.g. after a restart): already handled.
    if (kept === 'duplicate') return false;
    if (!this.isConfigured()) return false;

    const payload = String(
      message.type === 'button' ? message.button?.payload || ''
        : message.type === 'interactive' ? message.interactive?.button_reply?.id || ''
          : '',
    );
    const match = payload.match(/^(confirm|change|more):([a-f0-9]{24})$/);
    const review = payload.match(/^review_(liked|unread|problem|more|nomore):([a-f0-9]{24})$/);
    let text: string;
    if (review) {
      // Review request tap: the answer comes from ReviewRequestService (review link, a book, or "tell us").
      let answer: WhatsappReviewAnswer | null = null;
      try {
        answer = this.reviewHandler
          ? await this.reviewHandler({ action: review[1] as WhatsappReviewReply['action'], orderId: review[2], from, messageId: id })
          : null;
      } catch (error) {
        this.logger.warn(`WhatsApp review ${review[1]} for order ${review[2]} failed: ${error?.message || error}`);
      }
      if (answer?.request && this.chatModel) {
        await this.chatModel.updateOne({ wa: from }, { $set: { request: { ...answer.request, at: new Date() } } })
          .catch((error) => this.logger.warn(`WhatsApp inbox request flag failed: ${error?.message || error}`));
      }
      text = answer?.text || this.replyText({ status: 'unknown', orderId: await this.latestOrderId(from) });
    } else if (content.type === 'text' && WhatsappService.isStopWord(content.text)) {
      // "Stop": no more review requests / book suggestions (order updates still go out).
      if (this.chatModel) {
        await this.chatModel.updateOne({ wa: from }, { $set: { followUpOptOut: true, followUpOptOutAt: new Date() } })
          .catch((error) => this.logger.warn(`WhatsApp opt-out not saved: ${error?.message || error}`));
      }
      text = 'ঠিক আছে, রিভিউ বা নতুন বইয়ের মেসেজ আর পাঠানো হবে না।\nঅর্ডারের আপডেট আগের মতোই পাবেন।\n— amolbooks.com';
    } else if (match && this.replyHandler) {
      let result: WhatsappReplyResult = { status: 'unknown' };
      try {
        result = await this.replyHandler({ action: match[1] as WhatsappCustomerReply['action'], orderId: match[2], from, messageId: id });
      } catch (error) {
        this.logger.warn(`WhatsApp ${match[1]} for order ${match[2]} failed: ${error?.message || error}`);
      }
      // "more books" / "change": the inbox shows a nudge on this chat until staff mark it done.
      if ((result.status === 'more' || result.status === 'change') && this.chatModel) {
        await this.chatModel.updateOne(
          { wa: from },
          { $set: { request: { kind: result.status, orderId: String(result.orderId || ''), order: match[2], at: new Date() } } },
        ).catch((error) => this.logger.warn(`WhatsApp inbox request flag failed: ${error?.message || error}`));
      }
      // Order gone (deleted) or not theirs: still name their latest order.
      if (!result.orderId) result = { ...result, orderId: await this.latestOrderId(from) };
      // "More books": offer the shop's popular books they don't have in this order yet (owner, 2026-11-12).
      if (result.status === 'more' && this.config().autoReply !== 'handover') {
        result = { ...result, books: await this.offeredBooks(await this.orderProductIds(match[2])) };
      }
      text = this.replyText(result);
    } else {
      const mode = this.config().autoReply;
      // Reactions need no answer; "off" leaves customers' messages to staff in the inbox.
      if (mode === 'off' || content.type === 'reaction') return true;
      const last = this.lastHandover.get(from) || 0;
      if (Date.now() - last < HANDOVER_EVERY_MS) return true;
      // Staff are already talking with them in the inbox: no automatic note in between.
      if (mode === 'inbox' && (await this.staffRepliedSince(from, Date.now() - HANDOVER_EVERY_MS))) return true;
      this.lastHandover.set(from, Date.now());
      text = this.replyText({ status: 'unknown', orderId: await this.latestOrderId(from) });
    }
    try {
      await this.sendChatText(from, text, { kind: 'auto' });
    } catch (error) {
      this.logger.warn(`WhatsApp reply to a customer failed: ${error?.message || error}`);
    }
    return true;
  }

  private async staffRepliedSince(wa: string, since: number): Promise<boolean> {
    if (!this.chatMessageModel) return false;
    try {
      return !!(await this.chatMessageModel.exists({ wa, kind: 'staff', at: { $gte: new Date(since) } }));
    } catch {
      return false;
    }
  }

  /** Sending is possible (enabled + keys); replies don't need a template. */
  isConfigured(): boolean {
    const config = this.config();
    return config.enabled && !!config.token && !!config.phoneNumberId;
  }

  /** The customer's latest order that got a WhatsApp message on this number (for the answers). */
  private async latestOrderId(from: string): Promise<string | undefined> {
    try {
      const order: any = await this.orderModel.findOne({ 'whatsappMessages.to': from })
        .sort({ createdAt: -1 }).select('orderId').lean();
      return order?.orderId ? String(order.orderId) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Product ids in an order (by its _id), so the book list skips what the customer already ordered. */
  private async orderProductIds(orderObjectId: string): Promise<string[]> {
    try {
      const order: any = await this.orderModel.findById(orderObjectId).select('orderedItems._id').lean();
      return (order?.orderedItems || []).map((item: any) => String(item?._id || '')).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * The books to offer (WHATSAPP_BOOK_LIST order) with the price the shop shows today; published
   * books only, `exclude` = product ids left out. Never throws: empty means "use the short answer".
   */
  async offeredBooks(exclude: string[] = []): Promise<WhatsappBook[]> {
    const slugs = this.config().bookList;
    if (!this.productModel || !slugs.length) return [];
    try {
      const products: any[] = await this.productModel
        .find({ slug: { $in: slugs }, status: 'publish' })
        .select('name slug salePrice discountType discountAmount')
        .lean();
      const skip = new Set(exclude.map(String));
      return slugs
        .map((slug) => products.find((product) => product.slug === slug))
        .filter((product) => product && !skip.has(String(product._id)))
        .map((product) => ({ name: String(product.name || '').trim(), price: WhatsappService.shopPrice(product), slug: String(product.slug) }))
        .filter((book) => book.name && book.price > 0);
    } catch (error) {
      this.logger.warn(`WhatsApp book list failed: ${error?.message || error}`);
      return [];
    }
  }

  /** The price on the website: sale price less the discount (1 = percent, 2 = taka), as the storefront does. */
  static shopPrice(product: any): number {
    const sale = Math.max(0, Number(product?.salePrice) || 0);
    const discount = Math.max(0, Number(product?.discountAmount) || 0);
    const type = Number(product?.discountType) || 0;
    if (type === 1) return Math.max(0, Math.floor(sale - (sale * discount) / 100));
    if (type === 2) return Math.max(0, Math.floor(sale - discount));
    return Math.floor(sale);
  }

  static bengaliNumber(value: number | string): string {
    return String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)]);
  }

  /** "১. প্রোডাক্টিভ মুসলিম — ৩১৫ টাকা", one book per line. */
  static bookLines(books: WhatsappBook[]): string {
    return books
      .map((book, index) => `${WhatsappService.bengaliNumber(index + 1)}. ${book.name} — ${WhatsappService.bengaliNumber(book.price)} টাকা`)
      .join('\n');
  }

  /** Answer to "একই ডেলিভারি চার্জে আরও বই নিবো": the book list and the website, then "write the names here". */
  static moreBooksText(order: string, books: WhatsappBook[]): string {
    return [
      `অবশ্যই! ${order ? `অর্ডার ${order}-এ ` : ''}একই ডেলিভারি চার্জে আরও বই যোগ করা যাবে।`,
      '',
      'আমাদের জনপ্রিয় বই ও মূল্য:',
      WhatsappService.bookLines(books),
      '',
      `আরও বই দেখুন: ${SITE_URL}`,
      '',
      'কোন বই নিতে চান, বইয়ের নাম বা নম্বর এখানে লিখুন। আমাদের টিম অর্ডারে যোগ করে দেবে ইনশাআল্লাহ।',
      '— amolbooks.com',
    ].join('\n');
  }

  /** The owner's price-list message (inbox ready answer), with the shop's books and prices. */
  static priceListText(books: WhatsappBook[]): string {
    return [
      'আসসালামু আলাইকুম,',
      '',
      'আমাদের জনপ্রিয় বই ও মূল্যতালিকা:',
      WhatsappService.bookLines(books),
      '',
      '৩টি বা তার বেশি বই নিলে সারাদেশে ফ্রি ডেলিভারি।',
      '',
      'ডেলিভারি চার্জ',
      'ঢাকার মধ্যে ৬০/-',
      'ঢাকার বাইরে ৭৫/-',
      '',
      'অর্ডার করতে মোবাইল নম্বর, নাম, সম্পূর্ণ ঠিকানা ও পছন্দের বইয়ের নাম নম্বর পাঠিয়ে দিন।',
      `সব বই দেখুন: ${SITE_URL}`,
    ].join('\n');
  }

  /**
   * Answers on the API number. With the WhatsApp Inbox (WHATSAPP_AUTO_REPLY inbox or off) customers
   * are asked to write right here; with "handover" they get a chat link to the staff number with a
   * short English text ("Order #14869") so the link stays short and staff see the order number.
   */
  replyText(result: WhatsappReplyResult): string {
    const id = result.orderId ? String(result.orderId) : '';
    const order = id ? `#${id}` : '';
    const sign = '— amolbooks.com';
    if (this.config().autoReply !== 'handover') {
      if (result.status === 'confirmed') {
        return `ধন্যবাদ! আপনার অর্ডার ${order} কনফার্ম হয়েছে ✅\n৩ দিনের মধ্যে ডেলিভারি করা হবে ইনশাআল্লাহ।\n${sign}`;
      }
      if (result.status === 'already') {
        return `আপনার অর্ডার ${order} আগেই কনফার্ম করা আছে ✅\nকোনো প্রশ্ন থাকলে এখানেই লিখুন, আমাদের টিম উত্তর দেবে ইনশাআল্লাহ।\n${sign}`;
      }
      if (result.status === 'more') {
        if (result.books?.length) return WhatsappService.moreBooksText(order, result.books);
        return `অবশ্যই! অর্ডার ${order}-এ একই ডেলিভারি চার্জে আরও বই যোগ করা যাবে।\nকোন বই নিতে চান, এখানেই লিখুন, আমাদের টিম যোগ করে দেবে ইনশাআল্লাহ।\n${sign}`;
      }
      if (result.status === 'change') {
        return `অর্ডার ${order}-এ কী পরিবর্তন করতে চান, এখানেই লিখুন।\nআমাদের টিম দ্রুত ঠিক করে দেবে ইনশাআল্লাহ।\n${sign}`;
      }
      if (result.status === 'closed') {
        return `অর্ডার ${order} কুরিয়ারে পাঠানো বা বাতিল হয়ে গেছে, তাই এতে আর কিছু যোগ বা পরিবর্তন করা যাবে না।\nনতুন অর্ডার বা যেকোনো প্রশ্নে এখানেই লিখুন।\n${sign}`;
      }
      return `আপনার মেসেজ পেয়েছি ✅\n${id ? `অর্ডার ${order} নিয়ে ` : ''}আমাদের টিম এখানেই উত্তর দেবে ইনশাআল্লাহ।\n${sign}`;
    }
    const chat = (note = '') => this.handoverLink(id ? `Order #${id}${note ? ` - ${note}` : ''}` : 'Amol Books order');
    if (result.status === 'confirmed') {
      return `ধন্যবাদ! আপনার অর্ডার ${order} কনফার্ম হয়েছে ✅\n৩ দিনের মধ্যে ডেলিভারি করা হবে ইনশাআল্লাহ।\n${sign}`;
    }
    if (result.status === 'already') {
      return `আপনার অর্ডার ${order} আগেই কনফার্ম করা আছে ✅\nকোনো প্রশ্ন থাকলে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👇\n${chat()}\n${sign}`;
    }
    if (result.status === 'more') {
      return `অবশ্যই! অর্ডার ${order}-এ একই ডেলিভারি চার্জে আরও বই যোগ করা যাবে।\nকোন বই নিতে চান, আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👇\n${chat('add more books')}\n${sign}`;
    }
    if (result.status === 'change') {
      return `অর্ডার ${order}-এ কী পরিবর্তন করতে চান, আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👇\n${chat('change')}\nআমাদের টিম দ্রুত ঠিক করে দেবে ইনশাআল্লাহ।\n${sign}`;
    }
    if (result.status === 'closed') {
      return `অর্ডার ${order} কুরিয়ারে পাঠানো বা বাতিল হয়ে গেছে, তাই এতে আর কিছু যোগ বা পরিবর্তন করা যাবে না।\nনতুন অর্ডার বা যেকোনো প্রশ্নে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👇\n${chat()}\n${sign}`;
    }
    return `এই নম্বরটি শুধু অর্ডারের আপডেটের জন্য।\n${id ? `অর্ডার ${order} নিয়ে ` : ''}প্রশ্ন বা কথা বলতে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👇\n${chat()}\n${sign}`;
  }

  private async applyStatus(status: any): Promise<boolean> {
    const messageId = String(status?.id || '');
    const next = String(status?.status || '');
    if (!messageId || !(next in STATUS_RANK)) return false;
    const error = Array.isArray(status?.errors) && status.errors[0]
      ? `${status.errors[0].code || ''} ${status.errors[0].title || status.errors[0].message || ''}`.trim().slice(0, 300)
      : undefined;
    await this.applyChatStatus(messageId, next, error);
    const order: any = await this.orderModel
      .findOne({ 'whatsappMessages.messageId': messageId })
      .select('whatsappMessages')
      .lean();
    const current = order?.whatsappMessages?.find((item: any) => item?.messageId === messageId);
    if (!current) return false;
    if (next !== 'failed' && (STATUS_RANK[current.status] ?? 0) >= STATUS_RANK[next]) return false;
    const set: Record<string, any> = { 'whatsappMessages.$.status': next, 'whatsappMessages.$.updatedAt': new Date() };
    if (error) set['whatsappMessages.$.error'] = error;
    const result = await this.orderModel.updateOne(
      { _id: order._id, whatsappMessages: { $elemMatch: { messageId, status: current.status } } },
      { $set: set },
    );
    return result.modifiedCount > 0;
  }

  /** The inbox's ticks for the shop's messages (never backwards, like the order record). */
  private async applyChatStatus(messageId: string, next: string, error?: string): Promise<void> {
    if (!this.chatMessageModel) return;
    const lower = Object.keys(STATUS_RANK).filter((name) => next === 'failed' ? name !== 'failed' : STATUS_RANK[name] < STATUS_RANK[next]);
    try {
      await this.chatMessageModel.updateOne(
        { messageId, direction: 'out', status: { $in: lower } },
        { $set: { status: next, ...(error ? { error } : {}) } },
      );
    } catch (error) {
      this.logger.warn(`WhatsApp inbox tick update failed: ${error?.message || error}`);
    }
  }
}
