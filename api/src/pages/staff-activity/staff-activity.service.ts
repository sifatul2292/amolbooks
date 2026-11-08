import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { Admin } from '../../interfaces/admin/admin.interface';

// The order page's "Processing" tab (PROCESSING_STATUSES in custom-orders.html):
// Pending, Processing, Shipping and Courier.
export const PROCESSING_STATUSES = [0, 1, 3, 4, 8];

// The owner's points (2026-11-02) until they save other values. Moves out of
// Processing are still recorded but no longer score.
export const DEFAULT_STAFF_POINTS = {
  courierSent: 1,
  incompleteConverted: 10,
  crmConverted: 5,
  extraItems: 3,
};
const POINT_LABELS = {
  courierSent: 'Parcel sent to courier',
  incompleteConverted: 'Incomplete order converted',
  crmConverted: 'Customer Manager order',
  extraItems: 'Extra book added',
};
const ACTION_FIELDS = {
  courier_sent: 'courierSent',
  processing_moved: 'processingMoved',
  incomplete_converted: 'incompleteConverted',
  crm_converted: 'crmConverted',
  extra_items: 'extraItems',
};
const MANAGER_ROLES = ['super_admin', 'admin'];
// The owner's account is not an employee: it appears in the tables but is never
// ranked, called top performer or flagged as behind (owner, 2026-11-06).
const OWNER_ROLES = ['super_admin'];
// Roles that call customers are ranked even before their first point; other
// roles (editor, accountant...) only once they score.
const CALLING_ROLES = ['salesman', 'admin'];
// "Quite poor": under 40% of the leader's points, once the leader has 10+.
const POOR_SHARE = 0.4;
const POOR_MIN_LEADER = 10;
// A call shows as "calling now" for 15 minutes unless ended sooner; the list on
// the order pages covers the last 24 hours; rows are kept 120 days for counts.
const CALL_ACTIVE_MS = 15 * 60 * 1000;
const CALL_RECENT_MS = 24 * 60 * 60 * 1000;
const CALL_KEEP_MS = 120 * 24 * 60 * 60 * 1000;
const CALL_KINDS = ['order', 'incomplete', 'customer'];
const ACTOR_CACHE_MS = 5 * 60 * 1000;
// Staff notes on an order: up to 1000 characters each; the oldest drop off
// after 200.
const NOTE_MAX_CHARS = 1000;
const NOTE_MAX_ENTRIES = 200;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * A customer's phone as the local 01XXXXXXXXX form (also from +880/0088 and
 * Bengali digits), so every row with that customer shares one "calling" state.
 * Other numbers keep their digits; nothing usable gives null.
 */
export function callPhoneKey(value: any): string | null {
  const digits = String(value == null ? '' : value)
    .replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
    .replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('0088')) local = local.slice(4);
  else if (local.startsWith('88')) local = local.slice(2);
  if (/^1[3-9]\d{8}$/.test(local)) local = `0${local}`;
  if (/^01[3-9]\d{8}$/.test(local)) return local;
  return digits.length >= 6 && digits.length <= 15 ? digits : null;
}

/** Books in an order: each line's quantity except free gifts (a package counts once). */
export function itemCount(items: any): number {
  return (Array.isArray(items) ? items : []).reduce((sum: number, item: any) => {
    if (!item || item.isGift === true || item.orderType === 'gift') return sum;
    const quantity = Math.floor(Number(item.quantity));
    return sum + (quantity > 0 ? quantity : 0);
  }, 0);
}

export interface StaffActor {
  _id: Types.ObjectId;
  name: string;
  role: string;
}

@Injectable()
export class StaffActivityService {
  private actors = new Map<string, { at: number; actor: StaffActor }>();
  private jwt: JwtService;

  constructor(
    @InjectModel('StaffActivity') private readonly activityModel: Model<any>,
    @InjectModel('StaffPoints') private readonly pointsModel: Model<any>,
    @InjectModel('StaffCall') private readonly callModel: Model<any>,
    @InjectModel('Admin') private readonly adminModel: Model<Admin>,
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('IncompleteOrder')
    private readonly incompleteOrderModel: Model<any>,
    configService: ConfigService,
  ) {
    this.jwt = new JwtService({
      secret: configService.get<string>('adminJwtSecret'),
    });
  }

  /** Staff identity from a verified admin JWT; the display name comes from the admin record. */
  async resolveActor(admin: any): Promise<StaffActor | null> {
    const id = admin?._id ? String(admin._id) : '';
    if (!Types.ObjectId.isValid(id)) return null;
    const cached = this.actors.get(id);
    if (cached && Date.now() - cached.at < ACTOR_CACHE_MS) return cached.actor;
    const record: any = await this.adminModel
      .findById(id)
      .select('name username role')
      .lean();
    const actor = {
      _id: new Types.ObjectId(id),
      name: String(record?.name || record?.username || admin.username || 'Staff')
        .trim()
        .slice(0, 80),
      role: String(record?.role || admin.role || ''),
    };
    this.actors.set(id, { at: Date.now(), actor });
    return actor;
  }

  /** For routes without the admin guard: attribute only a valid admin token. */
  async actorFromToken(token?: string): Promise<StaffActor | null> {
    if (!token) return null;
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch (_error) {
      return null;
    }
    return this.resolveActor(payload);
  }

  async courierSent(order: any, courierData: any, actor: StaffActor | null) {
    if (!order?._id) return;
    if (actor) {
      await this.orderModel.updateOne(
        { _id: order._id },
        { $set: { courierSentBy: this.stamp(actor) } },
      );
      await this.record('courier_sent', actor, order, {
        provider: courierData?.providerName,
      });
    }
    await this.creditOnSend(order._id);
  }

  /**
   * Credit stored on a new staff order (Incomplete Orders Send/Add Order, or Customer
   * Manager's Create order). Nothing scores until the parcel is sent to the courier.
   */
  newOrderCredit(
    actor: StaffActor | null,
    source: { incompleteOrderId?: any; incompleteItems?: any; crm?: boolean },
    items: any,
  ) {
    if (!actor) return undefined;
    const credit: any = {};
    if (source.crm) credit.crm = this.stamp(actor);
    if (Types.ObjectId.isValid(String(source.incompleteOrderId || ''))) {
      credit.incomplete = {
        ...this.stamp(actor),
        incompleteOrderId: new Types.ObjectId(String(source.incompleteOrderId)),
      };
      // The abandoned cart is what the customer chose; more books were the call's doing.
      const base = itemCount(source.incompleteItems);
      if (base > 0) {
        credit.items = { base };
        if (itemCount(items) > base) credit.items.by = this.stamp(actor);
      }
    }
    return Object.keys(credit).length ? credit : undefined;
  }

  /**
   * Staff changed an order's books. The count before the first staff edit is what the
   * customer chose; whoever raises the count above it gets the extra books.
   */
  async itemsChanged(order: any, items: any, actor: StaffActor | null) {
    if (!order?._id || !Array.isArray(items)) return;
    const before = itemCount(order.orderedItems);
    const after = itemCount(items);
    const known = order.staffCredit?.items?.base;
    const base = Number.isInteger(known) ? known : before;
    const set: any = {};
    if (!Number.isInteger(known)) set['staffCredit.items.base'] = base;
    if (actor && after > before && after > base) {
      set['staffCredit.items.by'] = this.stamp(actor);
    }
    if (Object.keys(set).length) {
      await this.orderModel.updateOne({ _id: order._id }, { $set: set });
    }
  }

  /** The parcel went out: score the conversion and the books added that this order carries. */
  private async creditOnSend(orderId: any) {
    const order: any = await this.orderModel
      .findById(orderId)
      .select('orderId orderedItems staffCredit')
      .lean();
    const credit = order?.staffCredit;
    if (!credit) return;
    const incomplete = credit.incomplete;
    if (incomplete?._id && incomplete.incompleteOrderId) {
      // Keyed by the incomplete order: one conversion, however many orders it produced.
      await this.record(
        'incomplete_converted',
        this.actorOf(incomplete),
        { _id: incomplete.incompleteOrderId, orderId: order.orderId },
        { creditedOrder: order._id },
      );
    }
    if (credit.crm?._id) {
      // A Customer Manager order scores as a whole, without extra books on top.
      await this.record('crm_converted', this.actorOf(credit.crm), order);
      return;
    }
    const base = credit.items?.base;
    const extra = itemCount(order.orderedItems) - base;
    if (credit.items?.by?._id && Number.isInteger(base) && extra > 0) {
      await this.record('extra_items', this.actorOf(credit.items.by), order, {
        quantity: extra,
      });
    }
  }

  /** Counts the first staff move of an order out of the Processing tab. */
  async statusChanged(order: any, toStatus: any, actor: StaffActor | null) {
    const from = Number(order?.orderStatus);
    const to = Number(toStatus);
    if (
      !actor ||
      !order?._id ||
      !Number.isInteger(to) ||
      !PROCESSING_STATUSES.includes(from) ||
      PROCESSING_STATUSES.includes(to)
    ) {
      return;
    }
    await this.record('processing_moved', actor, order, {
      fromStatus: from,
      toStatus: to,
    });
  }

  /**
   * adminNote saved from another admin screen: the new text joins the note list
   * too. A note changed without a verified staff identity loses its author; a
   * cleared note keeps the earlier entries.
   */
  async adminNoteChanged(
    kind: 'order' | 'incomplete',
    record: any,
    note: any,
    actor: StaffActor | null,
  ) {
    if (!record?._id || typeof note !== 'string') return;
    const after = note.trim();
    if (String(record.adminNote || '').trim() === after) return;
    const model = kind === 'order' ? this.orderModel : this.incompleteOrderModel;
    if (!after) {
      await model.updateOne({ _id: record._id }, { $unset: { adminNoteBy: 1 } });
      return;
    }
    const current: any = await model
      .findById(record._id)
      .select('adminNoteBy adminNotes')
      .lean();
    const loose = this.looseNote(
      { adminNote: record.adminNote, adminNoteBy: current?.adminNoteBy },
      this.noteEntries(current),
    );
    const stamp = actor ? this.stamp(actor) : null;
    const entry = { text: after, at: stamp ? stamp.at : new Date(), by: actor ? this.noteAuthor(actor) : null };
    await model.updateOne(
      { _id: record._id },
      {
        $push: { adminNotes: { $each: loose ? [loose, entry] : [entry], $slice: -NOTE_MAX_ENTRIES } },
        ...(stamp ? { $set: { adminNoteBy: stamp } } : { $unset: { adminNoteBy: 1 } }),
      },
    );
  }

  /**
   * "+ Add note" on the order pages (owner, 2026-11-08): the note joins the
   * order's list with its writer and time; earlier notes stay. adminNote keeps
   * the latest text for the other admin screens.
   */
  async addNote(body: any, admin: any) {
    const kind = body?.kind === 'incomplete' ? 'incomplete' : 'order';
    const id = String(body?.id || '');
    const text = String(body?.text == null ? '' : body.text).trim();
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Unknown order.');
    if (!text) throw new BadRequestException('Write a note first.');
    if (text.length > NOTE_MAX_CHARS) {
      throw new BadRequestException(`Keep the note under ${NOTE_MAX_CHARS} characters.`);
    }
    const actor = await this.resolveActor(admin);
    if (!actor) {
      throw new UnauthorizedException('Login expired. Please log in again to save the note.');
    }
    const model = kind === 'order' ? this.orderModel : this.incompleteOrderModel;
    // A note written before the list existed (or text the system added) joins the
    // list first, exactly once: updatedAt lets only one of two saves at the same
    // moment do it; the other reads again.
    for (let attempt = 0; ; attempt++) {
      const doc: any = await model
        .findById(id)
        .select('adminNote adminNoteBy adminNotes updatedAt')
        .lean();
      if (!doc) throw new NotFoundException('Order not found.');
      const loose = this.looseNote(doc, this.noteEntries(doc));
      if (!loose) break;
      const seeded = await model.updateOne(
        { _id: doc._id, updatedAt: doc.updatedAt ?? null },
        { $push: { adminNotes: { $each: [loose], $slice: -NOTE_MAX_ENTRIES } } },
      );
      if (seeded.matchedCount) break;
      if (attempt >= 4) {
        throw new ConflictException('The order changed while saving. Please try again.');
      }
    }
    // The new note itself is one atomic push: notes saved at the same moment all stay.
    const stamp = this.stamp(actor);
    const saved: any = await model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        {
          $push: {
            adminNotes: {
              $each: [{ text, at: stamp.at, by: this.noteAuthor(actor) }],
              $slice: -NOTE_MAX_ENTRIES,
            },
          },
          $set: { adminNote: text, adminNoteBy: stamp },
        },
        { new: true },
      )
      .select('adminNote adminNoteBy adminNotes')
      .lean();
    if (!saved) throw new NotFoundException('Order not found.');
    return { success: true, data: { notes: this.notesOf(saved) } };
  }

  /** Notes for the order pages, oldest first; the current adminNote is always among them. */
  notesOf(doc: any) {
    const entries = this.noteEntries(doc);
    const loose = this.looseNote(doc, entries);
    return (loose ? entries.concat(loose) : entries).map((n) => this.publicNote(n));
  }

  private noteEntries(doc: any): any[] {
    return (Array.isArray(doc?.adminNotes) ? doc.adminNotes : []).filter(
      (n: any) => n && String(n.text || '').trim(),
    );
  }

  /**
   * The current adminNote when the list does not end with it: a note saved
   * before the list existed (2026-11-08), or text added by the system (customer
   * cancellation). adminNoteBy names its writer only when the list is empty.
   */
  private looseNote(doc: any, entries: any[]) {
    const text = String(doc?.adminNote || '').trim();
    const last = entries[entries.length - 1];
    if (!text || (last && String(last.text || '').trim() === text)) return null;
    const by = !entries.length && doc?.adminNoteBy?.name ? doc.adminNoteBy : null;
    return { text, at: by?.at || null, by: by ? this.noteAuthor(by) : null };
  }

  private noteAuthor(actor: any) {
    return { _id: actor._id, name: actor.name, role: actor.role || '' };
  }

  private publicNote(note: any) {
    return {
      text: String(note.text || ''),
      at: note.at || null,
      by: note.by?.name ? { name: note.by.name, role: note.by.role || '' } : null,
    };
  }

  /**
   * Incomplete Orders page Send/Add Order turned an abandoned checkout into an order:
   * the first converter is named on the row; points follow when the parcel is sent.
   */
  async incompleteConverted(incompleteOrderId: any, actor: StaffActor | null) {
    if (!actor || !Types.ObjectId.isValid(String(incompleteOrderId))) return;
    await this.incompleteOrderModel.updateOne(
      {
        _id: new Types.ObjectId(String(incompleteOrderId)),
        convertedBy: { $exists: false },
      },
      { $set: { convertedBy: this.stamp(actor) } },
    );
  }

  async attribution(ids: any, kind: any) {
    if (!Array.isArray(ids) || ids.length > 200) {
      throw new BadRequestException('Send a list of up to 200 order IDs.');
    }
    const valid = ids
      .map((id) => String(id))
      .filter((id) => Types.ObjectId.isValid(id));
    const incomplete = kind === 'incomplete';
    const docs: any[] = await (incomplete
      ? this.incompleteOrderModel.find({ _id: { $in: valid } }).select('adminNoteBy convertedBy')
      : this.orderModel
          .find({ _id: { $in: valid } })
          .select('adminNoteBy courierSentBy courierData.providerName')
    ).lean();
    const data = {};
    for (const doc of docs) {
      const entry: any = {};
      if (doc.adminNoteBy?.name) entry.adminNoteBy = this.publicStamp(doc.adminNoteBy);
      if (doc.convertedBy?.name) entry.convertedBy = this.publicStamp(doc.convertedBy);
      if (doc.courierSentBy?.name) {
        entry.courierSentBy = {
          ...this.publicStamp(doc.courierSentBy),
          provider: doc.courierData?.providerName || '',
        };
      }
      if (Object.keys(entry).length) data[String(doc._id)] = entry;
    }
    return { success: true, data };
  }

  /** Per-staff counts and points; only Super Admin/Admin see other staff. */
  /**
   * Scores for a date range. Managers see everyone; other roles only themselves,
   * except `team` (today's board on the order pages), which every staff member sees.
   */
  async performance(query: any, viewer: any, team = false) {
    const { from, to, start, end } = this.range(team ? {} : query);
    const manager = MANAGER_ROLES.includes(viewer?.role);
    const everyone = manager || team;
    const viewerId = String(viewer?._id || '');
    if (!everyone && !Types.ObjectId.isValid(viewerId)) {
      throw new BadRequestException('Unknown staff account.');
    }
    const match: any = { createdAt: { $gte: start, $lte: end } };
    if (!everyone) match.admin = new Types.ObjectId(viewerId);
    const callMatch: any = { startedAt: { $gte: start, $lte: end } };
    if (match.admin) callMatch.admin = match.admin;
    const [settings, grouped, admins, perDay, calls] = await Promise.all([
      this.getPoints(),
      this.activityModel.aggregate([
        { $match: match },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: { admin: '$admin', action: '$action' },
            count: { $sum: { $ifNull: ['$quantity', 1] } },
            confirmed: { $sum: { $cond: [{ $eq: ['$toStatus', 2] }, 1, 0] } },
            name: { $last: '$adminName' },
            role: { $last: '$adminRole' },
          },
        },
      ]),
      this.adminModel
        .find(everyone ? {} : { _id: viewerId })
        .select('name username role hasAccess')
        .lean(),
      this.activityModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                  timezone: '+06:00',
                },
              },
              admin: '$admin',
              action: '$action',
            },
            count: { $sum: { $ifNull: ['$quantity', 1] } },
          },
        },
      ]),
      this.callModel.aggregate([
        { $match: callMatch },
        { $group: { _id: '$admin', count: { $sum: 1 } } },
      ]),
    ]);
    const points = settings.points;
    const rows = new Map<string, any>();
    const row = (id: string, name: string, role: string) => {
      if (!rows.has(id)) {
        rows.set(id, {
          adminId: id,
          name: name || 'Staff',
          role: role || '',
          courierSent: 0,
          processingMoved: 0,
          movedToConfirmed: 0,
          incompleteConverted: 0,
          crmConverted: 0,
          extraItems: 0,
          callsLogged: 0,
          points: 0,
        });
      }
      return rows.get(id);
    };
    for (const admin of admins as any[]) {
      if (admin.hasAccess === false) continue;
      row(String(admin._id), admin.name || admin.username, admin.role);
    }
    for (const group of grouped) {
      const field = ACTION_FIELDS[group._id.action];
      if (!field) continue;
      const entry = row(String(group._id.admin), group.name, group.role);
      entry[field] += group.count;
      if (field === 'processingMoved') entry.movedToConfirmed += group.confirmed;
    }
    for (const group of calls) {
      const entry = rows.get(String(group._id));
      if (entry) entry.callsLogged = group.count;
    }
    // Current admin records win over the names saved with older activity.
    for (const admin of admins as any[]) {
      const entry = rows.get(String(admin._id));
      if (!entry) continue;
      entry.name = admin.name || admin.username || entry.name;
      entry.role = admin.role || entry.role;
    }
    const list = [...rows.values()];
    const totals = {
      courierSent: 0,
      processingMoved: 0,
      movedToConfirmed: 0,
      incompleteConverted: 0,
      crmConverted: 0,
      extraItems: 0,
      callsLogged: 0,
      points: 0,
    };
    for (const entry of list) {
      entry.points = Object.keys(points).reduce(
        (sum, key) => sum + entry[key] * points[key],
        0,
      );
      for (const key of Object.keys(totals)) totals[key] += entry[key];
    }
    list.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    const standing = this.standings(list);
    // Points per Dhaka day and staff member, for the page's daily chart.
    const days = new Map<string, any>();
    for (const group of perDay) {
      const field = ACTION_FIELDS[group._id.action];
      if (!(field in points)) continue;
      const key = group._id.day + '|' + String(group._id.admin);
      if (!days.has(key)) {
        days.set(key, {
          day: group._id.day,
          adminId: String(group._id.admin),
          courierSent: 0,
          incompleteConverted: 0,
          crmConverted: 0,
          extraItems: 0,
          points: 0,
        });
      }
      const day = days.get(key);
      day[field] += group.count;
      day.points += group.count * points[field];
    }
    return {
      success: true,
      data: {
        from,
        to,
        scope: manager ? 'all' : team ? 'team' : 'self',
        viewerId,
        leaderPoints: standing.leaderPoints,
        rules: { poorShare: POOR_SHARE, poorMinLeader: POOR_MIN_LEADER },
        canEditPoints: manager,
        points,
        pointsUpdatedAt: settings.updatedAt,
        pointsUpdatedBy: settings.updatedByName,
        pointsAreDefault: settings.isDefault,
        rows: list,
        totals,
        daily: [...days.values()].sort(
          (a, b) => a.day.localeCompare(b.day) || a.adminId.localeCompare(b.adminId),
        ),
      },
    };
  }

  /** Today's board for every staff member (order pages). */
  teamToday(viewer: any) {
    return this.performance({}, viewer, true);
  }

  /**
   * Rank employees only (the owner never). Ties share a rank. status:
   * top (most points, above 0), poor (under 40% of a leader with 10+),
   * idle (no points yet), behind (the rest), owner (not ranked).
   */
  private standings(list: any[]) {
    for (const entry of list) {
      entry.ranked =
        !OWNER_ROLES.includes(entry.role) &&
        (CALLING_ROLES.includes(entry.role) || entry.points > 0);
    }
    const ranked = list.filter((entry) => entry.ranked);
    const leaderPoints = ranked.reduce((max, entry) => Math.max(max, entry.points), 0);
    let previous: number = null;
    ranked.forEach((entry, index) => {
      if (entry.points !== previous) {
        entry.rank = index + 1;
        previous = entry.points;
      } else {
        entry.rank = ranked[index - 1].rank;
      }
      if (leaderPoints > 0 && entry.points === leaderPoints) entry.status = 'top';
      else if (leaderPoints >= POOR_MIN_LEADER && entry.points < leaderPoints * POOR_SHARE)
        entry.status = 'poor';
      else if (entry.points === 0) entry.status = 'idle';
      else entry.status = 'behind';
    });
    for (const entry of list) {
      if (entry.ranked) continue;
      entry.rank = null;
      entry.status = OWNER_ROLES.includes(entry.role) ? 'owner' : 'unranked';
    }
    return { leaderPoints };
  }

  /**
   * Mark that the signed-in staff member is calling a customer. If someone else
   * is already on a call with that number, nothing starts unless `force`.
   * Starting a call ends the caller's previous one.
   */
  async startCall(body: any, admin: any) {
    const actor = await this.resolveActor(admin);
    if (!actor) throw new BadRequestException('Unknown staff account.');
    const phoneKey = callPhoneKey(body?.phone);
    if (!phoneKey) throw new BadRequestException('This phone number cannot be used.');
    const now = new Date();
    const live = { endedAt: null, expiresAt: { $gt: now } };
    const busy: any = await this.callModel
      .findOne({ ...live, phoneKey, admin: { $ne: actor._id } })
      .sort({ startedAt: -1 })
      .lean();
    if (busy && body?.force !== true) {
      return {
        success: true,
        data: { started: false, busy: this.publicCall(busy, actor._id, now) },
      };
    }
    const mine: any = await this.callModel
      .findOne({ ...live, phoneKey, admin: actor._id })
      .sort({ startedAt: -1 })
      .lean();
    if (busy) {
      await this.callModel.updateMany(
        { ...live, phoneKey, admin: { $ne: actor._id } },
        { $set: { endedAt: now, endedBy: 'Taken over by ' + actor.name } },
      );
    }
    await this.callModel.updateMany(
      { ...live, admin: actor._id, phoneKey: { $ne: phoneKey } },
      { $set: { endedAt: now, endedBy: actor.name } },
    );
    if (mine) {
      // Same person, same customer: keep the call going.
      const call = await this.callModel
        .findByIdAndUpdate(
          mine._id,
          { $set: { expiresAt: new Date(now.getTime() + CALL_ACTIVE_MS) } },
          { new: true },
        )
        .lean();
      return { success: true, data: { started: true, call: this.publicCall(call, actor._id, now) } };
    }
    const text = (value: any, max: number) =>
      String(value == null ? '' : value).trim().slice(0, max);
    const call: any = await this.callModel.create({
      phoneKey,
      phone: text(body?.phone, 24),
      kind: CALL_KINDS.includes(body?.kind) ? body.kind : 'order',
      target: text(body?.target, 40),
      label: text(body?.label, 40),
      admin: actor._id,
      adminName: actor.name,
      adminRole: actor.role,
      startedAt: now,
      expiresAt: new Date(now.getTime() + CALL_ACTIVE_MS),
      endedAt: null,
      purgeAt: new Date(now.getTime() + CALL_KEEP_MS),
    });
    return {
      success: true,
      data: { started: true, call: this.publicCall(call.toObject(), actor._id, now) },
    };
  }

  /** "Done": end one's own call (managers may end anyone's). */
  async endCall(body: any, admin: any) {
    const actor = await this.resolveActor(admin);
    if (!actor) throw new BadRequestException('Unknown staff account.');
    const id = String(body?.id || '');
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Unknown call.');
    const filter: any = { _id: new Types.ObjectId(id), endedAt: null };
    if (!MANAGER_ROLES.includes(actor.role)) filter.admin = actor._id;
    const now = new Date();
    const call = await this.callModel
      .findOneAndUpdate(filter, { $set: { endedAt: now, endedBy: actor.name } }, { new: true })
      .lean();
    return {
      success: true,
      data: { ended: Boolean(call), call: call ? this.publicCall(call, actor._id, now) : null },
    };
  }

  /** Calls of the last 24 hours, newest first (order pages poll this). */
  async listCalls(admin: any) {
    const actor = await this.resolveActor(admin);
    if (!actor) throw new BadRequestException('Unknown staff account.');
    const now = new Date();
    const calls = await this.callModel
      .find({ startedAt: { $gte: new Date(now.getTime() - CALL_RECENT_MS) } })
      .sort({ startedAt: -1 })
      .limit(400)
      .lean();
    return {
      success: true,
      data: {
        now: now.toISOString(),
        calls: calls.map((call) => this.publicCall(call, actor._id, now)),
      },
    };
  }

  private publicCall(call: any, viewerId: any, now: Date) {
    const expiresAt = new Date(call.expiresAt);
    const active = !call.endedAt && expiresAt > now;
    return {
      id: String(call._id),
      phoneKey: call.phoneKey,
      phone: call.phone || call.phoneKey,
      kind: call.kind || 'order',
      target: call.target || '',
      label: call.label || '',
      adminId: String(call.admin),
      adminName: call.adminName || 'Staff',
      startedAt: call.startedAt,
      endedAt: active ? null : call.endedAt || expiresAt,
      endedBy: call.endedBy || '',
      active,
      mine: String(call.admin) === String(viewerId),
    };
  }

  async getPoints() {
    const doc: any = await this.pointsModel.findOne({ key: 'default' }).lean();
    const points = { ...DEFAULT_STAFF_POINTS };
    for (const key of Object.keys(points)) {
      if (Number.isInteger(doc?.[key])) points[key] = doc[key];
    }
    return {
      points,
      updatedAt: doc?.updatedAt || null,
      updatedByName: doc?.updatedByName || '',
      isDefault: !doc,
    };
  }

  async savePoints(body: any, admin: any) {
    const update = {};
    for (const key of Object.keys(DEFAULT_STAFF_POINTS)) {
      const value = body?.[key];
      if (!Number.isInteger(value) || value < 0 || value > 1000) {
        throw new BadRequestException(
          `${POINT_LABELS[key]} points must be a whole number from 0 to 1000.`,
        );
      }
      update[key] = value;
    }
    const actor = await this.resolveActor(admin);
    await this.pointsModel.updateOne(
      { key: 'default' },
      {
        $set: {
          ...update,
          updatedBy: actor?._id,
          updatedByName: actor?.name || '',
        },
      },
      { upsert: true },
    );
    return { success: true, message: 'Points saved', data: await this.getPoints() };
  }

  /** Inserts the action once per target; false when it was already counted. */
  private async record(
    action: string,
    actor: StaffActor,
    target: any,
    extra: any = {},
  ): Promise<boolean> {
    const filter = { action, target: target._id };
    try {
      const result = await this.activityModel.updateOne(
        filter,
        {
          $setOnInsert: {
            ...filter,
            orderId: target.orderId,
            admin: actor._id,
            adminName: actor.name,
            adminRole: actor.role,
            ...extra,
          },
        },
        { upsert: true },
      );
      return result.upsertedCount > 0;
    } catch (error) {
      if (Number(error?.code) === 11000) return false;
      throw error;
    }
  }

  private actorOf(stamp: any): StaffActor {
    return { _id: stamp._id, name: stamp.name, role: stamp.role };
  }

  private stamp(actor: StaffActor) {
    return { _id: actor._id, name: actor.name, role: actor.role, at: new Date() };
  }

  private publicStamp(stamp: any) {
    return { name: stamp.name, role: stamp.role || '', at: stamp.at || null };
  }

  /** Inclusive Asia/Dhaka calendar days; defaults to today. */
  private range(query: any) {
    const today = new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
    const from = query?.from ? String(query.from) : today;
    const to = query?.to ? String(query.to) : today;
    const start = this.dhakaDay(from, '00:00:00.000');
    const end = this.dhakaDay(to, '23:59:59.999');
    if (!start || !end || start > end) {
      throw new BadRequestException('Choose a valid date range (YYYY-MM-DD).');
    }
    if (end.getTime() - start.getTime() > 400 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Choose a date range of one year or less.');
    }
    return { from, to, start, end };
  }

  private dhakaDay(day: string, time: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const date = new Date(`${day}T${time}+06:00`);
    if (Number.isNaN(date.getTime())) return null;
    // Reject roll-overs such as 2026-02-30.
    const roundTrip = new Date(date.getTime() + DHAKA_OFFSET_MS)
      .toISOString()
      .slice(0, 10);
    return roundTrip === day ? date : null;
  }
}
