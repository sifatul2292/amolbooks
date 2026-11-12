import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhatsappBook, WhatsappService } from './whatsapp.service';

/** Meta lets the shop answer freely for 24 hours after the customer's latest message. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
const CHATS_PER_PAGE = 30;
const MESSAGES_PER_PAGE = 80;
const MAX_REPLY_LENGTH = 4096;
/** An open chat page asks every 6 s; after this without a word the staff member has left. */
const PRESENCE_MS = 20 * 1000;
/** "is typing" lasts this long after the last key (the page reports every 3 s while typing). */
const TYPING_MS = 7 * 1000;
const STAFF_NAME_CACHE_MS = 10 * 60 * 1000;
type Presence = { name: string; seenAt: number; typingAt: number };
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * WhatsApp Inbox (owner, 2026-11-10): staff read what customers write to the API number and
 * answer from the admin page (gtm-snippets/whatsapp-inbox.html). Messages are stored by
 * WhatsappService.recordChat; replies go out as free-form messages inside Meta's 24-hour window.
 */
@Injectable()
export class WhatsappInboxService {
  /**
   * Who has which chat open right now (owner, 2026-11-11: "how do we know who is talking to the
   * customer?"), in memory: number -> staff id -> name, last seen, last typed. Lost on restart,
   * which only means a few seconds without names.
   */
  private readonly presence = new Map<string, Map<string, Presence>>();
  private readonly staffNames = new Map<string, { staff: { _id?: Types.ObjectId; name: string }; at: number }>();

  constructor(
    @InjectModel('WhatsappChat') private readonly chatModel: Model<any>,
    @InjectModel('WhatsappChatMessage') private readonly messageModel: Model<any>,
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Admin') private readonly adminModel: Model<any>,
    private readonly whatsapp: WhatsappService,
  ) {}

  static wa(value: any): string {
    const wa = WhatsappService.toWhatsappNumber(value);
    if (!wa) throw new BadRequestException('Unknown WhatsApp number.');
    return wa;
  }

  /** 8801XXXXXXXXX -> 01XXXXXXXXX (how orders keep the phone number). */
  static localPhone(wa: string): string {
    return '0' + String(wa).slice(3);
  }

  static replyUntil(chat: any, now = Date.now()): Date | null {
    const last = chat?.lastCustomerAt ? new Date(chat.lastCustomerAt).getTime() : 0;
    return last && last + REPLY_WINDOW_MS > now ? new Date(last + REPLY_WINDOW_MS) : null;
  }

  private static chatRow(chat: any) {
    return {
      lastKind: chat.lastKind || '',
      lastBy: chat.lastBy || '',
      lastStaff: chat.lastStaff?.name ? { name: chat.lastStaff.name, at: chat.lastStaff.at } : null,
      wa: chat.wa,
      phone: WhatsappInboxService.localPhone(chat.wa),
      name: chat.name || '',
      lastAt: chat.lastAt || null,
      lastText: chat.lastText || '',
      lastDirection: chat.lastDirection || '',
      lastCustomerAt: chat.lastCustomerAt || null,
      unread: Number(chat.unread || 0),
      replyUntil: WhatsappInboxService.replyUntil(chat),
      request: chat.request?.kind
        ? { kind: chat.request.kind, orderId: chat.request.orderId || '', at: chat.request.at || null }
        : null,
    };
  }

  /** The order can still be changed: not booked with the courier, not cancelled / delivered. */
  static editable(order: any): boolean {
    return [0, 1, 2, 3].includes(Number(order?.orderStatus)) && !order?.courierData?.consignmentId && !order?.customerCancelledAt;
  }

  /** The customer's open "more books" / "change" request (newest order first), if staff have not handled it. */
  static pendingRequest(orders: any[]): any | null {
    const order = orders.find((item) => item?.customerRequest?.kind && !item.customerRequest.doneAt && WhatsappInboxService.editable(item));
    return order
      ? { kind: order.customerRequest.kind, orderId: String(order.orderId || ''), order: order._id, at: order.customerRequest.at || new Date() }
      : null;
  }

  private static messageRow(message: any) {
    return {
      _id: String(message._id),
      direction: message.direction,
      kind: message.kind || '',
      type: message.type || 'text',
      text: message.text || '',
      media: message.media?.id ? { id: message.media.id, mime: message.media.mime || '', filename: message.media.filename || '' } : null,
      status: message.status || '',
      error: message.error || '',
      orderId: message.orderId || '',
      by: message.by?.name || '',
      at: message.at,
    };
  }

  /** What the inbox shows of an order: the books, money, payment, address and courier (owner, 2026-11-11). */
  static orderRow(order: any) {
    const items = Array.isArray(order.orderedItems) ? order.orderedItems : [];
    const place = [order.area, order.zone, order.city || order.division].map((part) => String(part || '').trim()).filter(Boolean);
    return {
      _id: String(order._id),
      orderId: String(order.orderId || ''),
      orderStatus: Number(order.orderStatus),
      createdAt: order.createdAt,
      name: order.name || '',
      items: items.slice(0, 40).map((item: any) => {
        const quantity = Number(item?.quantity || item?.selectedQty || 1);
        const price = Number(item?.salePrice ?? item?.unitPrice ?? item?.regularPrice ?? 0);
        return {
          name: String(item?.name || item?.product?.name || 'Item'),
          quantity,
          price,
          total: Math.round(price * quantity),
          image: typeof item?.image === 'string' ? item.image : '',
          gift: !!item?.isGift,
        };
      }),
      subTotal: Number(order.subTotal || 0),
      deliveryCharge: Number(order.deliveryCharge || 0),
      discount: Number(order.discount || 0),
      grandTotal: Number(order.grandTotal || 0),
      paymentType: order.paymentType || '',
      paymentStatus: order.paymentStatus || '',
      address: [order.shippingAddress, ...place.filter((part) => !String(order.shippingAddress || '').includes(part))].filter(Boolean).join(', '),
      note: order.note || '',
      courier: order.courierData?.consignmentId || order.courierData?.trackingId
        ? { name: order.courierData.providerName || '', tracking: String(order.courierData.trackingId || order.courierData.consignmentId || '') }
        : null,
      booked: !!order.courierData?.consignmentId,
      // Handled requests ("Mark done") are not shown as open any more.
      request: order.customerRequest?.kind && !order.customerRequest.doneAt ? order.customerRequest.kind : '',
      requestDone: order.customerRequest?.doneAt ? { at: order.customerRequest.doneAt, by: order.customerRequest.doneBy || '' } : null,
      confirmed: order.customerConfirmation?.status === 'confirmed',
    };
  }

  /** Chats where the customer wrote, newest first; unread=1 for unread only; needs=1 for open requests; q = name or number. */
  async chats(query: any, admin?: any) {
    await this.dropSettledRequests();
    const filter: Record<string, any> = { lastCustomerAt: { $exists: true } };
    if (String(query?.unread || '') === '1') filter.unread = { $gt: 0 };
    if (String(query?.needs || '') === '1') filter['request.kind'] = { $exists: true };
    const q = String(query?.q || '').trim().slice(0, 60);
    if (q) {
      const ascii = q.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
      const digits = ascii.replace(/\D/g, '').replace(/^(?:880|0)/, '');
      const or: Record<string, any>[] = [{ name: { $regex: escapeRegex(q), $options: 'i' } }];
      if (digits.length >= 3) or.push({ wa: { $regex: escapeRegex(digits) } });
      filter.$or = or;
    }
    const page = Math.max(0, Math.min(1000, parseInt(query?.page, 10) || 0));
    const [rows, unreadChats, needsAction] = await Promise.all([
      this.chatModel.find(filter).sort({ lastAt: -1 }).skip(page * CHATS_PER_PAGE).limit(CHATS_PER_PAGE + 1).lean(),
      this.chatModel.countDocuments({ lastCustomerAt: { $exists: true }, unread: { $gt: 0 } }),
      this.chatModel.countDocuments({ 'request.kind': { $exists: true } }),
    ]);
    const me = admin ? await this.staff(admin) : null;
    return {
      success: true,
      data: {
        chats: rows.slice(0, CHATS_PER_PAGE).map((chat) => ({
          ...WhatsappInboxService.chatRow(chat),
          viewers: this.present(chat.wa, me?._id ? String(me._id) : ''),
        })),
        more: rows.length > CHATS_PER_PAGE,
        unreadChats,
        needsAction,
        canSend: this.whatsapp.isConfigured(),
      },
    };
  }

  /** One chat: its latest messages (or older ones with ?before=), the customer's orders; opening it marks it read. */
  async messages(waParam: any, query: any, admin: any) {
    const wa = WhatsappInboxService.wa(waParam);
    const chat: any = await this.chatModel.findOne({ wa }).lean();
    if (!chat) throw new NotFoundException('No messages with this number yet.');
    const before = query?.before ? new Date(query.before) : null;
    const filter: Record<string, any> = { wa };
    if (before && !Number.isNaN(before.getTime())) filter.at = { $lt: before };
    const list: any[] = await this.messageModel.find(filter).sort({ at: -1, _id: -1 }).limit(MESSAGES_PER_PAGE + 1).lean();
    const staff = await this.staff(admin);
    // The open chat asks again every few seconds: that keeps "in this chat" up to date.
    if (!filter.at) this.touch(wa, staff, false);
    if (!filter.at && chat.unread) {
      await this.chatModel.updateOne({ wa }, { $set: { unread: 0, readAt: new Date(), readBy: staff.name } });
      chat.unread = 0;
    }
    const local = WhatsappInboxService.localPhone(wa);
    const orders: any[] = await this.orderModel
      .find({ phoneNo: { $in: [local, '+88' + local, '88' + local] } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        'orderId orderStatus grandTotal subTotal deliveryCharge discount paymentType paymentStatus createdAt name ' +
          'shippingAddress area zone city division note orderedItems customerRequest customerConfirmation customerCancelledAt ' +
          'courierData.providerName courierData.trackingId courierData.consignmentId',
      )
      .lean();
    // Keep the nudge in step with the order (handled, booked or cancelled since; or tapped before the inbox kept it).
    const pending = WhatsappInboxService.pendingRequest(orders);
    if (!filter.at) {
      const same = pending && chat.request?.kind === pending.kind && chat.request?.orderId === pending.orderId;
      if (pending && !same) {
        await this.chatModel.updateOne({ wa }, { $set: { request: pending } });
        chat.request = pending;
      } else if (!pending && chat.request?.kind) {
        await this.chatModel.updateOne({ wa }, { $unset: { request: 1 } });
        delete chat.request;
      }
    }
    return {
      success: true,
      data: {
        chat: WhatsappInboxService.chatRow(chat),
        messages: list.slice(0, MESSAGES_PER_PAGE).reverse().map(WhatsappInboxService.messageRow),
        more: list.length > MESSAGES_PER_PAGE,
        orders: orders.map(WhatsappInboxService.orderRow),
        viewers: this.present(wa, staff._id ? String(staff._id) : ''),
        canSend: this.whatsapp.isConfigured(),
      },
    };
  }

  /** Staff answer: free-form, only inside the 24-hour window; kept in the chat with the staff name. */
  async reply(waParam: any, body: any, admin: any) {
    const wa = WhatsappInboxService.wa(waParam);
    const text = String(body?.text ?? '').replace(/\r\n/g, '\n').trim();
    if (!text) throw new BadRequestException('Write a message first.');
    if (text.length > MAX_REPLY_LENGTH) throw new BadRequestException('Message is too long (4,096 characters at most).');
    if (!this.whatsapp.isConfigured()) throw new ServiceUnavailableException('WhatsApp is switched off on the server.');
    const chat: any = await this.chatModel.findOne({ wa }).lean();
    if (!WhatsappInboxService.replyUntil(chat)) {
      throw new BadRequestException(
        "More than 24 hours since the customer's last message: WhatsApp only allows replies within 24 hours. Call or SMS them, or wait until they write again.",
      );
    }
    const staff = await this.staff(admin);
    let messageId: string;
    try {
      messageId = await this.whatsapp.sendChatText(wa, text, { kind: 'staff', by: staff });
    } catch (error) {
      throw new BadRequestException(`WhatsApp did not send it: ${error?.message || error}`);
    }
    await this.chatModel.updateOne({ wa }, { $set: { unread: 0, readAt: new Date(), readBy: staff.name } });
    this.touch(wa, staff, false, true);
    const saved: any = await this.messageModel.findOne({ messageId }).lean();
    return { success: true, data: saved ? WhatsappInboxService.messageRow(saved) : null };
  }

  /**
   * Ready answers for the reply box (owner, 2026-11-12: replying was clunky): the more-books list
   * for the customer's open order, "books added" with the order's current total, the price list,
   * asking for name and address, delivery charge, thanks. Staff can edit before sending.
   */
  async quickReplies(waParam: any) {
    const wa = WhatsappInboxService.wa(waParam);
    const local = WhatsappInboxService.localPhone(wa);
    const orders: any[] = await this.orderModel
      .find({ phoneNo: { $in: [local, '+88' + local, '88' + local] } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('orderId orderStatus grandTotal orderedItems._id customerRequest customerCancelledAt courierData.consignmentId')
      .lean();
    // The order the customer asked about, else their newest order that can still change.
    const pending = WhatsappInboxService.pendingRequest(orders);
    const order = (pending && orders.find((item) => String(item._id) === String(pending.order))) || orders.find(WhatsappInboxService.editable) || null;
    const bn = WhatsappService.bengaliNumber;
    const replies: { id: string; title: string; text: string }[] = [];
    if (order) {
      const id = String(order.orderId || '');
      const inOrder = (order.orderedItems || []).map((item: any) => String(item?._id || ''));
      const more: WhatsappBook[] = await this.whatsapp.offeredBooks(inOrder);
      if (more.length) replies.push({ id: 'more', title: `More books · order #${id}`, text: WhatsappService.moreBooksText(`#${id}`, more) });
      replies.push({
        id: 'added',
        title: `Books added · order #${id}`,
        text: `আপনার অর্ডার #${id}-এ বই যোগ করা হয়েছে ✅\nএখন মোট: ${bn(Math.round(Number(order.grandTotal) || 0))} টাকা (ডেলিভারি চার্জসহ)।\nইনশাআল্লাহ ৩ দিনের মধ্যে ডেলিভারি করা হবে।\n— amolbooks.com`,
      });
    }
    const books = await this.whatsapp.offeredBooks();
    if (books.length) replies.push({ id: 'prices', title: 'Price list (popular books)', text: WhatsappService.priceListText(books) });
    replies.push(
      { id: 'address', title: 'Ask for name & address', text: 'অর্ডার করতে আপনার নাম, মোবাইল নম্বর, সম্পূর্ণ ঠিকানা ও পছন্দের বইয়ের নাম পাঠিয়ে দিন।' },
      { id: 'delivery', title: 'Delivery charge', text: 'ডেলিভারি চার্জ\nঢাকার মধ্যে ৬০/-\nঢাকার বাইরে ৭৫/-\n৩টি বা তার বেশি বই নিলে সারাদেশে ফ্রি ডেলিভারি।' },
      { id: 'thanks', title: 'Thank you', text: 'ধন্যবাদ! আর কিছু লাগলে এখানেই লিখুন।\n— amolbooks.com' },
    );
    return { success: true, data: { replies, orderId: order ? String(order.orderId || '') : '' } };
  }

  /** A customer's photo / voice note / file, only for media that arrived in the inbox. */
  async media(id: any): Promise<{ buffer: Buffer; mime: string }> {
    const mediaId = String(id || '');
    if (!/^\d{5,32}$/.test(mediaId)) throw new NotFoundException('No such file.');
    if (!(await this.messageModel.exists({ 'media.id': mediaId }))) throw new NotFoundException('No such file in the inbox.');
    try {
      return await this.whatsapp.fetchMedia(mediaId);
    } catch (error) {
      throw new NotFoundException(error?.message || 'This file is no longer available.');
    }
  }

  /** "Mark done": staff added the books / made the change; the order and the chat stop nudging. */
  async requestDone(waParam: any, admin: any) {
    const wa = WhatsappInboxService.wa(waParam);
    const chat: any = await this.chatModel.findOne({ wa }).lean();
    if (!chat) throw new NotFoundException('No messages with this number yet.');
    const staff = await this.staff(admin);
    const local = WhatsappInboxService.localPhone(wa);
    // Every open request on this number's orders (normally one).
    const result = await this.orderModel.updateMany(
      {
        phoneNo: { $in: [local, '+88' + local, '88' + local] },
        'customerRequest.kind': { $exists: true },
        'customerRequest.doneAt': { $exists: false },
      },
      { $set: { 'customerRequest.doneAt': new Date(), 'customerRequest.doneBy': staff.name } },
    );
    await this.chatModel.updateOne({ wa }, { $unset: { request: 1 } });
    return { success: true, data: { orders: result.modifiedCount } };
  }

  /** Requests whose order was booked, cancelled or handled meanwhile stop nudging in the list. */
  private async dropSettledRequests(): Promise<void> {
    const open: any[] = await this.chatModel.find({ 'request.kind': { $exists: true } }).select('wa request').limit(200).lean();
    if (!open.length) return;
    const ids = open.map((chat) => chat.request?.order).filter((id) => id && Types.ObjectId.isValid(String(id)));
    const orders: any[] = ids.length
      ? await this.orderModel.find({ _id: { $in: ids } }).select('orderStatus courierData.consignmentId customerCancelledAt customerRequest').lean()
      : [];
    const byId = new Map(orders.map((order) => [String(order._id), order]));
    const settled = open
      .filter((chat) => {
        const order = byId.get(String(chat.request?.order || ''));
        return !order || order.customerRequest?.doneAt || !WhatsappInboxService.editable(order);
      })
      .map((chat) => chat.wa);
    if (settled.length) await this.chatModel.updateMany({ wa: { $in: settled } }, { $unset: { request: 1 } });
  }

  /** The page says "typing" (every 3 s while staff type a reply). */
  async typing(waParam: any, admin: any) {
    const wa = WhatsappInboxService.wa(waParam);
    this.touch(wa, await this.staff(admin), true);
    return { success: true };
  }

  /** The page closed this chat (or opened another one). */
  async leave(waParam: any, admin: any) {
    const wa = WhatsappInboxService.wa(waParam);
    const staff = await this.staff(admin);
    const people = this.presence.get(wa);
    if (people && staff._id) {
      people.delete(String(staff._id));
      if (!people.size) this.presence.delete(wa);
    }
    return { success: true };
  }

  private touch(wa: string, staff: { _id?: Types.ObjectId; name: string }, typing: boolean, stoppedTyping = false) {
    if (!staff._id) return;
    const now = Date.now();
    const people = this.presence.get(wa) || new Map<string, Presence>();
    const id = String(staff._id);
    const before = people.get(id);
    people.set(id, { name: staff.name, seenAt: now, typingAt: typing ? now : stoppedTyping ? 0 : before?.typingAt || 0 });
    this.presence.set(wa, people);
    // Forget chats nobody has open any more.
    if (this.presence.size > 200) {
      for (const [key, map] of this.presence) {
        for (const [person, entry] of map) if (now - entry.seenAt > PRESENCE_MS) map.delete(person);
        if (!map.size) this.presence.delete(key);
      }
    }
  }

  /** Other staff with this chat open now (not the one asking). */
  private present(wa: string, selfId: string): { name: string; typing: boolean }[] {
    const people = this.presence.get(wa);
    if (!people) return [];
    const now = Date.now();
    const list: { name: string; typing: boolean }[] = [];
    for (const [id, entry] of people) {
      if (now - entry.seenAt > PRESENCE_MS) {
        people.delete(id);
        continue;
      }
      if (id !== selfId) list.push({ name: entry.name, typing: now - entry.typingAt < TYPING_MS });
    }
    if (!people.size) this.presence.delete(wa);
    return list;
  }

  private async staff(admin: any): Promise<{ _id?: Types.ObjectId; name: string }> {
    const id = admin?._id ? String(admin._id) : '';
    if (!Types.ObjectId.isValid(id)) return { name: String(admin?.username || 'Staff').slice(0, 80) };
    const cached = this.staffNames.get(id);
    if (cached && Date.now() - cached.at < STAFF_NAME_CACHE_MS) return cached.staff;
    const record: any = await this.adminModel.findById(id).select('name username').lean();
    const staff = {
      _id: new Types.ObjectId(id),
      name: String(record?.name || record?.username || admin?.username || 'Staff').trim().slice(0, 80),
    };
    this.staffNames.set(id, { staff, at: Date.now() });
    return staff;
  }
}
