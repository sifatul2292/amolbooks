import { BadRequestException, Injectable } from '@nestjs/common';
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
const ACTOR_CACHE_MS = 5 * 60 * 1000;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

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

  /** A note changed without a verified staff identity loses its author. */
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
    await model.updateOne(
      { _id: record._id },
      after && actor
        ? { $set: { adminNoteBy: this.stamp(actor) } }
        : { $unset: { adminNoteBy: 1 } },
    );
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
  async performance(query: any, viewer: any) {
    const { from, to, start, end } = this.range(query);
    const manager = MANAGER_ROLES.includes(viewer?.role);
    const viewerId = String(viewer?._id || '');
    if (!manager && !Types.ObjectId.isValid(viewerId)) {
      throw new BadRequestException('Unknown staff account.');
    }
    const match: any = { createdAt: { $gte: start, $lte: end } };
    if (!manager) match.admin = new Types.ObjectId(viewerId);
    const [settings, grouped, admins] = await Promise.all([
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
        .find(manager ? {} : { _id: viewerId })
        .select('name username role hasAccess')
        .lean(),
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
    return {
      success: true,
      data: {
        from,
        to,
        scope: manager ? 'all' : 'self',
        canEditPoints: manager,
        points,
        pointsUpdatedAt: settings.updatedAt,
        pointsUpdatedBy: settings.updatedByName,
        pointsAreDefault: settings.isDefault,
        rows: list,
        totals,
      },
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
