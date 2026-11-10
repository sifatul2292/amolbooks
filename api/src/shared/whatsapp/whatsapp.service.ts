import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

export type WhatsappOrderKind = 'order_placed' | 'order_shipped';

/** A customer's tap on the order message's buttons, handed to OrderService. */
export interface WhatsappCustomerReply {
  action: 'confirm' | 'change';
  orderId: string;
  from: string;
  messageId?: string;
}
/** What OrderService did with it: decides the answer the customer gets. */
export interface WhatsappReplyResult {
  status: 'confirmed' | 'already' | 'change' | 'closed' | 'unknown';
  orderId?: string;
}
type ReplyHandler = (reply: WhatsappCustomerReply) => Promise<WhatsappReplyResult>;

/** Status order, so a late "delivered" never overwrites "read". */
const STATUS_RANK: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
const SEND_TIMEOUT_MS = 10000;
const MAX_PARAM_LENGTH = 200;
/** One hand-over answer per customer in this time, however many messages they send. */
const HANDOVER_EVERY_MS = 12 * 60 * 60 * 1000;
const SEEN_LIMIT = 2000;

/**
 * Automatic WhatsApp order messages through Meta's WhatsApp Cloud API (template messages).
 * Off unless WHATSAPP_ENABLED=true and the token, phone number id and template names are set
 * (see scripts/WHATSAPP_ORDERS.md). Every send is recorded on the order (whatsappMessages), at
 * most once per kind, and delivery updates arrive at POST /api/whatsapp/webhook.
 * The order SMS keeps going out as before; WhatsApp is extra.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private replyHandler: ReplyHandler | null = null;
  private readonly seenMessages = new Set<string>();
  private readonly lastHandover = new Map<string, number>();

  constructor(@InjectModel('Order') private readonly orderModel: Model<any>) {}

  /** Read at call time, so the switch works without code changes (restart after editing .env). */
  config() {
    const env = process.env;
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
      } as Record<WhatsappOrderKind, string>,
      appSecret: String(env.WHATSAPP_APP_SECRET || '').trim(),
      verifyToken: String(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim(),
      // The order template has the "অর্ডার কনফার্ম" / "পরিবর্তন চাই" buttons (template order_confirm).
      confirmButtons: env.WHATSAPP_CONFIRM_BUTTONS === 'true',
      // The staff WhatsApp (Business app) number customers are sent to for questions.
      helpNumber: String(env.WHATSAPP_HELP_NUMBER || '8801893058682').replace(/\D/g, ''),
    };
  }

  /** OrderService registers what a button tap does (confirm / change); see handleWhatsappReply. */
  onCustomerReply(handler: ReplyHandler): void {
    this.replyHandler = handler;
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

  static customerName(order: any): string {
    const name = String(order?.name || '').trim();
    return name || 'প্রিয় গ্রাহক';
  }

  /**
   * Template values, in placeholder order ({{1}}, {{2}}, ...). The approved templates must use
   * exactly these (scripts/WHATSAPP_ORDERS.md has the texts).
   */
  static templateParams(kind: WhatsappOrderKind, order: any, courierData?: any): string[] {
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
    try {
      const buttons = kind === 'order_placed' && this.config().confirmButtons
        ? [`confirm:${order._id}`, `change:${order._id}`]
        : undefined;
      const messageId = await this.sendTemplate(to, template, WhatsappService.templateParams(kind, order, courierData), buttons);
      update = { 'whatsappMessages.$.status': 'sent', 'whatsappMessages.$.messageId': messageId, 'whatsappMessages.$.updatedAt': new Date() };
    } catch (error) {
      const message = String(error?.message || error).slice(0, 300);
      this.logger.warn(`WhatsApp ${kind} not sent for order ${order.orderId}: ${message}`);
      update = { 'whatsappMessages.$.status': 'failed', 'whatsappMessages.$.error': message, 'whatsappMessages.$.updatedAt': new Date() };
    }
    await this.orderModel.updateOne({ _id: order._id, 'whatsappMessages.kind': kind }, { $set: update });
    return update['whatsappMessages.$.status'];
  }

  /** POST /{phone-number-id}/messages with a template; returns Meta's message id. */
  async sendTemplate(to: string, template: string, params: string[], buttonPayloads?: string[]): Promise<string> {
    const config = this.config();
    const components: any[] = params.length
      ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
      : [];
    (buttonPayloads || []).forEach((payload, index) => {
      components.push({ type: 'button', sub_type: 'quick_reply', index: String(index), parameters: [{ type: 'payload', payload }] });
    });
    return this.post(to, { type: 'template', template: { name: template, language: { code: config.language }, components } });
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
        for (const message of Array.isArray(change?.value?.messages) ? change.value.messages : []) {
          if (await this.handleMessage(message)) handled += 1;
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
   * A customer wrote to the API number. A tap on "অর্ডার কনফার্ম" / "পরিবর্তন চাই" goes to
   * OrderService; anything else gets one hand-over answer pointing to the staff number.
   */
  private async handleMessage(message: any): Promise<boolean> {
    const id = String(message?.id || '');
    const from = String(message?.from || '').replace(/\D/g, '');
    if (!id || !from || this.seenMessages.has(id)) return false;
    this.seenMessages.add(id);
    if (this.seenMessages.size > SEEN_LIMIT) this.seenMessages.delete(this.seenMessages.values().next().value);
    if (!this.isConfigured()) return false;

    const payload = String(
      message.type === 'button' ? message.button?.payload || ''
        : message.type === 'interactive' ? message.interactive?.button_reply?.id || ''
          : '',
    );
    const match = payload.match(/^(confirm|change):([a-f0-9]{24})$/);
    let text: string;
    if (match && this.replyHandler) {
      let result: WhatsappReplyResult = { status: 'unknown' };
      try {
        result = await this.replyHandler({ action: match[1] as 'confirm' | 'change', orderId: match[2], from, messageId: id });
      } catch (error) {
        this.logger.warn(`WhatsApp ${match[1]} for order ${match[2]} failed: ${error?.message || error}`);
      }
      text = this.replyText(result);
    } else {
      const last = this.lastHandover.get(from) || 0;
      if (Date.now() - last < HANDOVER_EVERY_MS) return true;
      this.lastHandover.set(from, Date.now());
      text = this.replyText({ status: 'unknown' });
    }
    try {
      await this.sendText(from, text);
    } catch (error) {
      this.logger.warn(`WhatsApp reply to a customer failed: ${error?.message || error}`);
    }
    return true;
  }

  /** Sending is possible (enabled + keys); replies don't need a template. */
  private isConfigured(): boolean {
    const config = this.config();
    return config.enabled && !!config.token && !!config.phoneNumberId;
  }

  replyText(result: WhatsappReplyResult): string {
    const order = result.orderId ? `#${result.orderId}` : '';
    if (result.status === 'confirmed') {
      return `ধন্যবাদ! আপনার অর্ডার ${order} কনফার্ম হয়েছে ✅\n৩ দিনের মধ্যে ডেলিভারি করা হবে ইনশাআল্লাহ।\n— আমল বুকস`;
    }
    if (result.status === 'already') {
      return `আপনার অর্ডার ${order} আগেই কনফার্ম করা আছে ✅\nকোনো প্রশ্ন থাকলে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👉 ${this.handoverLink(`অর্ডার ${order} নিয়ে কথা বলতে চাই`)}`;
    }
    if (result.status === 'change') {
      return `কী পরিবর্তন করতে চান, আমাদের অফিসিয়াল WhatsApp-এ জানান 👉 ${this.handoverLink(`অর্ডার ${order} পরিবর্তন করতে চাই`)}\nআমাদের টিম দ্রুত আপনার অর্ডারটি ঠিক করে দেবে ইনশাআল্লাহ।`;
    }
    if (result.status === 'closed') {
      return `অর্ডার ${order} নিয়ে কথা বলতে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👉 ${this.handoverLink(`অর্ডার ${order} নিয়ে কথা বলতে চাই`)}`;
    }
    return `এই নম্বরটি শুধু অর্ডারের আপডেটের জন্য। প্রশ্ন বা কথা বলতে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👉 ${this.handoverLink('আমল বুকস থেকে অর্ডার নিয়ে কথা বলতে চাই')}`;
  }

  private async applyStatus(status: any): Promise<boolean> {
    const messageId = String(status?.id || '');
    const next = String(status?.status || '');
    if (!messageId || !(next in STATUS_RANK)) return false;
    const order: any = await this.orderModel
      .findOne({ 'whatsappMessages.messageId': messageId })
      .select('whatsappMessages')
      .lean();
    const current = order?.whatsappMessages?.find((item: any) => item?.messageId === messageId);
    if (!current) return false;
    if (next !== 'failed' && (STATUS_RANK[current.status] ?? 0) >= STATUS_RANK[next]) return false;
    const error = Array.isArray(status?.errors) && status.errors[0]
      ? `${status.errors[0].code || ''} ${status.errors[0].title || status.errors[0].message || ''}`.trim().slice(0, 300)
      : undefined;
    const set: Record<string, any> = { 'whatsappMessages.$.status': next, 'whatsappMessages.$.updatedAt': new Date() };
    if (error) set['whatsappMessages.$.error'] = error;
    const result = await this.orderModel.updateOne(
      { _id: order._id, whatsappMessages: { $elemMatch: { messageId, status: current.status } } },
      { $set: set },
    );
    return result.modifiedCount > 0;
  }
}
