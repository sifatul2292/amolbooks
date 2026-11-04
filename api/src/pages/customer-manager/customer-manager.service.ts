import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderService } from '../sales/order/order.service';
import { UtilsService } from '../../shared/utils/utils.service';
import { AddOrderDto } from '../../dto/order.dto';
import { OrderStatus } from '../../enum/order.enum';

export const CONTACT_OUTCOMES = [
  'interested',
  'not_interested',
  'no_answer',
  'follow_up',
  'ordered',
  'dont_contact',
];
// Days until the next follow-up suggested for each outcome ("Don't contact" has none).
export const FOLLOW_UP_DAYS = {
  no_answer: 1,
  interested: 2,
  follow_up: 7,
  ordered: 30,
  not_interested: 90,
};
const INDEX_REFRESH_MS = 60 * 1000;

interface CustomerIndex {
  builtAt: number;
  orderCount: number;
  rows: any[];
}

function categoryNames(category: any): string[] {
  return []
    .concat(category || [])
    .map((entry: any) =>
      String((entry && typeof entry === 'object' ? entry.name : entry) || '').trim(),
    )
    .filter(Boolean);
}
export function normalizeCustomerPhone(value: string): string {
  let phone = String(value || '')
    .replace(/[০-৯]/g, (c) => String('০১২৩৪৫৬৭৮৯'.indexOf(c)))
    .replace(/[\s()+.-]/g, '');
  if (phone.startsWith('00880')) phone = phone.slice(4);
  if (phone.startsWith('880')) phone = phone.slice(2);
  return /^01[3-9]\d{8}$/.test(phone) ? phone : '';
}
export function dhakaToday(): string {
  return new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
}
export function followUpDate(outcome: string, from = dhakaToday()): string {
  const days = FOLLOW_UP_DAYS[outcome];
  if (!days) return '';
  const date = new Date(from + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class CustomerManagerService implements OnApplicationBootstrap {
  private index: CustomerIndex | null = null;
  private building: Promise<CustomerIndex> | null = null;

  constructor(
    @InjectModel('Order') private readonly orders: Model<any>,
    @InjectModel('CustomerContact') private readonly contacts: Model<any>,
    @InjectModel('Product') private readonly products: Model<any>,
    private readonly orderService: OrderService,
    private readonly utils: UtilsService,
  ) {}

  // Build the customer index after startup so the first page load is fast.
  onApplicationBootstrap() {
    setTimeout(() => this.customers().catch(() => undefined), 5000).unref?.();
  }

  private deliveredExpression(): any {
    return {
      $and: [
        {
          $not: [
            {
              $in: [
                '$orderStatus',
                [OrderStatus.CANCEL, OrderStatus.REFUND, OrderStatus.RETURN],
              ],
            },
          ],
        },
        {
          $not: [
            {
              $in: [
                { $ifNull: ['$courierStatus.status', ''] },
                ['cancelled', 'partial_delivered', 'returned'],
              ],
            },
          ],
        },
        {
          $or: [
            { $eq: ['$orderStatus', OrderStatus.DELIVERED] },
            { $eq: ['$courierStatus.status', 'delivered'] },
          ],
        },
      ],
    };
  }

  private base(deliveredOnly = true): any[] {
    const replacements = [
      ' ',
      '+',
      '-',
      '(',
      ')',
      '.',
      '\t',
      '\n',
      '\r',
      ...Array.from('০১২৩৪৫৬৭৮৯'),
    ];
    let expression: any = { $ifNull: ['$phoneNo', ''] };
    replacements.forEach((find, i) => {
      expression = {
        $replaceAll: {
          input: expression,
          find,
          replacement: i < 9 ? '' : String(i - 9),
        },
      };
    });
    return [
      { $set: { crmDelivered: this.deliveredExpression() } },
      ...(deliveredOnly ? [{ $match: { crmDelivered: true } }] : []),
      { $set: { crmPhone: expression } },
      {
        $set: {
          crmPhone: {
            $cond: [
              { $eq: [{ $substrCP: ['$crmPhone', 0, 5] }, '00880'] },
              {
                $substrCP: [
                  '$crmPhone',
                  4,
                  { $subtract: [{ $strLenCP: '$crmPhone' }, 4] },
                ],
              },
              '$crmPhone',
            ],
          },
        },
      },
      {
        $set: {
          crmPhone: {
            $cond: [
              { $eq: [{ $substrCP: ['$crmPhone', 0, 3] }, '880'] },
              {
                $substrCP: [
                  '$crmPhone',
                  2,
                  { $subtract: [{ $strLenCP: '$crmPhone' }, 2] },
                ],
              },
              '$crmPhone',
            ],
          },
        },
      },
      { $match: { crmPhone: /^01[3-9]\d{8}$/ } },
    ];
  }

  private failedExpression(): any {
    return {
      $or: [
        {
          $in: [
            '$orderStatus',
            [OrderStatus.CANCEL, OrderStatus.REFUND, OrderStatus.RETURN],
          ],
        },
        {
          $in: [
            { $ifNull: ['$courierStatus.status', ''] },
            ['cancelled', 'returned'],
          ],
        },
      ],
    };
  }

  /**
   * One row per phone with at least one delivered order. Building it scans
   * every order, so it is cached: rebuilt when the order count changes (new or
   * deleted orders) and refreshed in the background once it is a minute old.
   */
  private async customers(force = false): Promise<CustomerIndex> {
    const orderCount = await this.orders.estimatedDocumentCount();
    const current = this.index;
    if (!force && current && current.orderCount === orderCount) {
      if (Date.now() - current.builtAt > INDEX_REFRESH_MS)
        this.rebuild(orderCount).catch(() => undefined);
      return current;
    }
    return this.rebuild(orderCount);
  }

  private rebuild(orderCount: number): Promise<CustomerIndex> {
    if (!this.building) {
      this.building = this.buildIndex(orderCount)
        .then((index) => (this.index = index))
        .finally(() => (this.building = null));
    }
    return this.building;
  }

  private async buildIndex(orderCount: number): Promise<CustomerIndex> {
    const [groups, products] = await Promise.all([
      this.orders
        .aggregate([
          ...this.base(false),
          {
            $project: {
              crmPhone: 1,
              crmDelivered: 1,
              crmFailed: this.failedExpression(),
              name: 1,
              shippingAddress: 1,
              city: 1,
              createdAt: 1,
              grandTotal: 1,
              'orderedItems._id': 1,
              'orderedItems.name': 1,
              'orderedItems.category.name': 1,
              courier: {
                $cond: [
                  { $ifNull: ['$fraudChecker.overall', false] },
                  { at: '$createdAt', overall: '$fraudChecker.overall' },
                  null,
                ],
              },
            },
          },
          { $sort: { crmDelivered: -1, createdAt: -1, _id: -1 } },
          {
            $group: {
              _id: '$crmPhone',
              name: { $first: '$name' },
              shippingAddress: { $first: '$shippingAddress' },
              city: { $first: '$city' },
              lastPurchase: { $first: '$createdAt' },
              orderCount: { $sum: { $cond: ['$crmDelivered', 1, 0] } },
              totalOrderCount: { $sum: 1 },
              failedCount: { $sum: { $cond: ['$crmFailed', 1, 0] } },
              totalSpent: {
                $sum: { $cond: ['$crmDelivered', '$grandTotal', 0] },
              },
              maxOrderValue: {
                $max: { $cond: ['$crmDelivered', '$grandTotal', 0] },
              },
              // Latest saved courier (FraudSpy) ratio for this phone.
              courier: { $max: '$courier' },
              items: {
                $push: {
                  $cond: ['$crmDelivered', '$orderedItems', '$$REMOVE'],
                },
              },
            },
          },
          { $match: { orderCount: { $gt: 0 } } },
        ])
        .allowDiskUse(true),
      this.products.find({}).select('category.name').lean(),
    ]);
    // Older order snapshots may lack categories; fall back to the catalog.
    const catalog = new Map<string, string[]>();
    for (const product of products as any[])
      catalog.set(String(product._id), categoryNames(product.category));
    const rows = groups.map((group: any) => {
      const books = new Set<string>();
      const categories = new Set<string>();
      for (const item of [].concat(...(group.items || []))) {
        if (!item) continue;
        if (item.name) books.add(String(item.name).trim());
        const names = categoryNames(item.category);
        (names.length ? names : catalog.get(String(item._id)) || []).forEach(
          (name) => categories.add(name),
        );
      }
      const overall = group.courier?.overall;
      return {
        phone: group._id,
        name: group.name || '',
        shippingAddress: group.shippingAddress || '',
        city: group.city || '',
        orderCount: group.orderCount,
        totalOrderCount: group.totalOrderCount,
        failedCount: group.failedCount,
        totalSpent: group.totalSpent || 0,
        maxOrderValue: group.maxOrderValue || 0,
        lastPurchase: group.lastPurchase,
        ratio: Math.round((group.orderCount / group.totalOrderCount) * 1000) / 10,
        courierRatio: overall
          ? {
              total: Number(overall.total) || 0,
              delivered: Number(overall.delivered) || 0,
              returned: Number(overall.returned) || 0,
              ratio: Number(overall.success_ratio) || 0,
            }
          : null,
        books: [...books],
        bookText: [...books].join('\n').toLowerCase(),
        categoryText: [...categories].join('\n').toLowerCase(),
      };
    });
    return { builtAt: Date.now(), orderCount, rows };
  }

  /** Latest contact per phone (the contact log is small and indexed by phone). */
  private async latestContacts(): Promise<Map<string, any>> {
    const rows = await this.contacts.aggregate([
      { $sort: { phone: 1, createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: '$phone',
          outcome: { $first: '$outcome' },
          nextFollowUp: { $first: '$nextFollowUp' },
          createdAt: { $first: '$createdAt' },
          contactedByName: { $first: '$contactedByName' },
        },
      },
    ]);
    return new Map(rows.map((row: any) => [row._id, row]));
  }

  async list(query: any, admin?: any) {
    const numeric = (key: string) => {
      if (query[key] === undefined || query[key] === '') return undefined;
      const value = Number(query[key]);
      if (!Number.isFinite(value) || value < 0)
        throw new BadRequestException('Invalid ' + key);
      return value;
    };
    const min = numeric('minSpent'),
      max = numeric('maxSpent'),
      orderMin = numeric('minOrderValue'),
      days = numeric('days');
    const day = (key: string, time: string) => {
      if (!query[key]) return undefined;
      const value = String(query[key]);
      const date = new Date(value + 'T' + time + '+06:00');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(date.getTime()) ||
        new Date(date.getTime() + 6 * 3600000).toISOString().slice(0, 10) !==
          value
      )
        throw new BadRequestException('Invalid ' + key);
      return date;
    };
    const lastFrom = day('lastFrom', '00:00:00.000'),
      lastTo = day('lastTo', '23:59:59.999');
    if (query.frequency && !['once', 'repeat'].includes(query.frequency))
      throw new BadRequestException('Invalid frequency');
    if (query.ratio && !['good', 'mid', 'low'].includes(query.ratio))
      throw new BadRequestException('Invalid ratio');
    const status = query.status || '';
    if (
      status &&
      !['never', 'contacted', 'due', ...CONTACT_OUTCOMES].includes(status)
    )
      throw new BadRequestException('Invalid contact status');
    const sorts = {
      recent: (a, b) => b.lastPurchase - a.lastPurchase,
      spent: (a, b) => b.totalSpent - a.totalSpent,
      orders: (a, b) => b.orderCount - a.orderCount,
      ratio: (a, b) => b.ratio - a.ratio || b.orderCount - a.orderCount,
      followup: (a, b) =>
        (a.contact?.nextFollowUp || '9999').localeCompare(
          b.contact?.nextFollowUp || '9999',
        ),
    };
    const sort = sorts[query.sort] || sorts.recent;
    const exporting = query.export === '1';
    if (exporting && !['super_admin', 'admin'].includes(admin?.role))
      throw new ForbiddenException('Only Super Admin and Admin can export customers');
    const pageSize = exporting
      ? 5000
      : [20, 50, 100].includes(Number(query.pageSize))
      ? Number(query.pageSize)
      : 20;
    const page = Math.max(
      1,
      Math.min(100000, Math.floor(Number(query.page) || 1)),
    );

    const [index, contacts] = await Promise.all([
      this.customers(query.refresh === '1'),
      this.latestContacts(),
    ]);
    const text = (value: any) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .slice(0, 120);
    const q = text(query.q);
    const qDigits = q
      .replace(/[০-৯]/g, (c) => String('০১২৩৪৫৬৭৮৯'.indexOf(c)))
      .replace(/\D/g, '');
    const product = text(query.product),
      category = text(query.category);
    const cutoff =
      days !== undefined ? Date.now() - days * 86400000 : undefined;
    const today = dhakaToday();
    const isDue = (contact: any) =>
      Boolean(
        contact &&
          contact.outcome !== 'dont_contact' &&
          contact.nextFollowUp &&
          contact.nextFollowUp <= today,
      );

    const filtered = [];
    for (const row of index.rows) {
      if (
        q &&
        !row.name.toLowerCase().includes(q) &&
        !(qDigits.length >= 3 && row.phone.includes(qDigits))
      )
        continue;
      if (product && !row.bookText.includes(product)) continue;
      if (category && !row.categoryText.includes(category)) continue;
      const last = new Date(row.lastPurchase).getTime();
      if (lastFrom && last < lastFrom.getTime()) continue;
      if (lastTo && last > lastTo.getTime()) continue;
      if (cutoff !== undefined && last > cutoff) continue;
      if (min !== undefined && row.totalSpent < min) continue;
      if (max !== undefined && row.totalSpent > max) continue;
      if (orderMin !== undefined && row.maxOrderValue < orderMin) continue;
      if (query.frequency === 'repeat' && row.orderCount < 2) continue;
      if (query.frequency === 'once' && row.orderCount !== 1) continue;
      if (query.ratio === 'good' && row.ratio < 80) continue;
      if (query.ratio === 'mid' && (row.ratio < 50 || row.ratio >= 80))
        continue;
      if (query.ratio === 'low' && row.ratio >= 50) continue;
      filtered.push({ ...row, contact: contacts.get(row.phone) });
    }

    // Summary cards and tab counts follow every filter except the tab itself.
    const tabs = { all: 0, never: 0, due: 0, contacted: 0 };
    CONTACT_OUTCOMES.forEach((outcome) => (tabs[outcome] = 0));
    const summary = {
      customers: filtered.length,
      followedUp: 0,
      never: 0,
      due: 0,
      repeat: 0,
      spent: 0,
    };
    for (const row of filtered) {
      const contact = row.contact;
      summary.spent += row.totalSpent;
      if (row.orderCount > 1) summary.repeat++;
      if (!contact) {
        summary.never++;
        tabs.never++;
      } else {
        summary.followedUp++;
        tabs.contacted++;
        tabs[contact.outcome] = (tabs[contact.outcome] || 0) + 1;
      }
      if (isDue(contact)) {
        summary.due++;
        tabs.due++;
      }
      if (contact?.outcome !== 'dont_contact') tabs.all++;
    }
    const inTab = (row: any) => {
      const contact = row.contact;
      if (status === 'never') return !contact;
      if (status === 'contacted') return Boolean(contact);
      if (status === 'due') return isDue(contact);
      if (status) return contact?.outcome === status;
      return contact?.outcome !== 'dont_contact';
    };
    const matching = filtered.filter(inTab).sort(
      (a, b) => sort(a, b) || (a.phone < b.phone ? -1 : 1),
    );
    const rows = matching
      .slice((page - 1) * pageSize, page * pageSize)
      .map((row) => ({
        phone: row.phone,
        name: row.name,
        shippingAddress: row.shippingAddress,
        city: row.city,
        orderCount: row.orderCount,
        totalOrderCount: row.totalOrderCount,
        failedCount: row.failedCount,
        totalSpent: row.totalSpent,
        maxOrderValue: row.maxOrderValue,
        lastPurchase: row.lastPurchase,
        ratio: row.ratio,
        courierRatio: row.courierRatio,
        books: row.books.slice(0, 3),
        ...(row.contact
          ? {
              latestContact: {
                outcome: row.contact.outcome,
                nextFollowUp: row.contact.nextFollowUp,
                createdAt: row.contact.createdAt,
                contactedByName: row.contact.contactedByName,
              },
            }
          : {}),
      }));
    return {
      success: true,
      data: {
        rows,
        total: matching.length,
        page,
        pageSize,
        summary,
        tabs,
        followUpRules: FOLLOW_UP_DAYS,
        updatedAt: new Date(index.builtAt),
      },
    };
  }

  private phoneCandidates(phone: string): any {
    const separators = '[\\s()+.\\-]*';
    const digits = phone
      .slice(1)
      .split('')
      .map((digit) => '[' + digit + '০১২৩৪৫৬৭৮৯'[Number(digit)] + ']')
      .join(separators);
    return { phoneNo: new RegExp(digits + separators + '$') };
  }

  async detail(rawPhone: string) {
    const phone = normalizeCustomerPhone(rawPhone);
    if (!phone) throw new BadRequestException('Invalid phone number');
    const [result, history] = await Promise.all([
      this.orders.aggregate([
        { $match: this.phoneCandidates(phone) },
        ...this.base(false),
        { $match: { crmPhone: phone } },
        { $set: { crmFailed: this.failedExpression() } },
        {
          $facet: {
            customer: [
              {
                $group: {
                  _id: null,
                  orderCount: { $sum: { $cond: ['$crmDelivered', 1, 0] } },
                  totalOrderCount: { $sum: 1 },
                  failedCount: { $sum: { $cond: ['$crmFailed', 1, 0] } },
                  totalSpent: {
                    $sum: { $cond: ['$crmDelivered', '$grandTotal', 0] },
                  },
                },
              },
            ],
            // Every order (any status) for the customer popup.
            allOrders: [
              { $sort: { createdAt: -1, _id: -1 } },
              { $limit: 50 },
              {
                $project: {
                  orderId: 1,
                  createdAt: 1,
                  grandTotal: 1,
                  orderStatus: 1,
                  crmDelivered: 1,
                  crmFailed: 1,
                  'courierStatus.status': 1,
                  'fraudChecker.overall': 1,
                  'orderedItems.name': 1,
                  'orderedItems.quantity': 1,
                },
              },
            ],
            orders: [
              { $match: { crmDelivered: true } },
              { $sort: { createdAt: -1, _id: -1 } },
              { $limit: 50 },
              {
                $project: {
                  orderId: 1,
                  name: 1,
                  createdAt: 1,
                  grandTotal: 1,
                  shippingAddress: 1,
                  city: 1,
                  email: 1,
                  division: 1,
                  area: 1,
                  zone: 1,
                  deliveryCharge: 1,
                  paymentType: 1,
                  'orderedItems.name': 1,
                  'orderedItems.quantity': 1,
                  'orderedItems.category.name': 1,
                },
              },
            ],
          },
        },
      ]),
      this.contacts
        .find({ phone })
        .sort({ createdAt: -1, _id: -1 })
        .limit(50)
        .lean(),
    ]);
    const customer = result[0].customer,
      orders = result[0].orders,
      allOrders = result[0].allOrders;
    if (!customer.length || !customer[0].orderCount)
      throw new NotFoundException('No delivered orders for this customer');
    const overall = allOrders.find((order: any) => order.fraudChecker?.overall)
      ?.fraudChecker.overall;
    return {
      success: true,
      data: {
        phone,
        name: orders[0].name,
        customerInfo: {
          name: orders[0].name,
          phoneNo: phone,
          email: orders[0].email || '',
          shippingAddress: orders[0].shippingAddress || '',
          city: orders[0].city || '',
          division: orders[0].division,
          area: orders[0].area,
          zone: orders[0].zone,
          deliveryCharge: orders[0].deliveryCharge || 0,
          paymentType: orders[0].paymentType || 'cash_on_delivery',
        },
        orderCount: customer[0].orderCount,
        totalOrderCount: customer[0].totalOrderCount,
        failedCount: customer[0].failedCount,
        totalSpent: customer[0].totalSpent,
        ratio:
          Math.round(
            (customer[0].orderCount / customer[0].totalOrderCount) * 1000,
          ) / 10,
        courierRatio: overall
          ? {
              total: Number(overall.total) || 0,
              delivered: Number(overall.delivered) || 0,
              returned: Number(overall.returned) || 0,
              ratio: Number(overall.success_ratio) || 0,
            }
          : null,
        orders,
        allOrders: allOrders.map(({ fraudChecker, ...order }: any) => order),
        history,
        followUpRules: FOLLOW_UP_DAYS,
      },
    };
  }

  async searchPurchasedBooks(query: string) {
    const term = String(query || '')
      .trim()
      .toLowerCase()
      .slice(0, 120);
    if (term.length < 2) return { success: true, data: [] };
    const names = new Set<string>();
    for (const row of (await this.customers()).rows)
      for (const book of row.books)
        if (book.toLowerCase().includes(term)) names.add(book);
    return {
      success: true,
      data: [...names]
        .sort()
        .slice(0, 12)
        .map((name) => ({ name })),
    };
  }

  async searchProducts(query: string) {
    const term = String(query || '')
      .trim()
      .slice(0, 120);
    if (term.length < 2) return { success: true, data: [] };
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const products = await this.products
      .find({ $or: [{ name: regex }, { nameEn: regex }, { sku: regex }] })
      .select(
        'name nameEn salePrice discountType discountAmount images quantity stock',
      )
      .sort({ name: 1, _id: 1 })
      .limit(12)
      .lean();
    return {
      success: true,
      data: products.map((product: any) => ({
        _id: String(product._id),
        name: product.name,
        price: this.utils.transform(product, 'salePrice'),
      })),
    };
  }

  async createOrder(rawPhone: string, body: any, admin: any) {
    if (!body || typeof body !== 'object')
      throw new BadRequestException('Invalid order details');
    const detail = (await this.detail(rawPhone)).data;
    const info = detail.customerInfo;
    const text = (key: string, fallback: string, limit: number) => {
      const value = body[key] === undefined ? fallback : body[key];
      if (typeof value !== 'string' || value.length > limit)
        throw new BadRequestException('Invalid ' + key);
      return value.trim();
    };
    const name = text('name', info.name, 200),
      shippingAddress = text('shippingAddress', info.shippingAddress, 2000);
    const city = text('city', info.city, 200),
      email = text('email', info.email, 200);
    if (!name || !shippingAddress)
      throw new BadRequestException('Customer name and address are required');
    if (
      !Array.isArray(body.items) ||
      !body.items.length ||
      body.items.length > 50 ||
      body.items.some(
        (item: any) =>
          !item ||
          !Types.ObjectId.isValid(item.product) ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 100,
      )
    )
      throw new BadRequestException('Choose products with valid quantities');
    const deliveryCharge =
      body.deliveryCharge === undefined
        ? Number(info.deliveryCharge)
        : body.deliveryCharge;
    if (
      !Number.isFinite(deliveryCharge) ||
      deliveryCharge < 0 ||
      deliveryCharge > 10000
    )
      throw new BadRequestException('Invalid delivery charge');
    if (
      ![
        'cash_on_delivery',
        'bkash',
        'nagad',
        'card',
        'online_payment',
      ].includes(body.paymentType)
    )
      throw new BadRequestException('Choose a valid payment type');
    if (!['phone', 'whatsapp'].includes(body.source))
      throw new BadRequestException('Choose a valid order source');
    if (
      typeof body.requestId !== 'string' ||
      !/^crm-[a-zA-Z0-9-]{16,80}$/.test(body.requestId)
    )
      throw new BadRequestException('Invalid order request ID');
    const payload = {
      name,
      phoneNo: detail.phone,
      shippingAddress,
      city,
      email,
      division: info.division,
      area: info.area,
      zone: info.zone,
      paymentType: body.paymentType,
      paymentStatus: 'unpaid',
      deliveryCharge,
      manualOrderRequestId: body.requestId,
      cartData: body.items.map((item: any) => ({
        product: String(item.product),
        selectedQty: item.quantity,
      })),
    } as unknown as AddOrderDto;
    // Shared catalog pricing, order numbering, idempotency and bookkeeping.
    return this.orderService.addAiAssistOrderAdmin(
      admin,
      payload,
      body.source,
      'crm',
    );
  }

  async save(rawPhone: string, body: any, admin: any) {
    if (!body || typeof body !== 'object')
      throw new BadRequestException('Invalid contact details');
    const phone = normalizeCustomerPhone(rawPhone);
    if (
      !phone ||
      !CONTACT_OUTCOMES.includes(body.outcome) ||
      !['call', 'whatsapp', 'other'].includes(body.channel) ||
      typeof body.note !== 'string' ||
      body.note.length > 2000
    )
      throw new BadRequestException('Invalid contact details');
    // Omitted follow-up date: use the outcome's default. An empty string means none.
    const date =
      body.nextFollowUp === undefined
        ? followUpDate(body.outcome)
        : body.nextFollowUp || '';
    if (
      typeof date !== 'string' ||
      (date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date))
    )
      throw new BadRequestException('Invalid follow-up date');
    const exists = await this.orders.aggregate([
      { $match: this.phoneCandidates(phone) },
      ...this.base(),
      { $match: { crmPhone: phone } },
      { $limit: 1 },
      { $project: { _id: 1 } },
    ]);
    if (!exists.length)
      throw new NotFoundException('No delivered orders for this customer');
    await this.contacts.create({
      phone,
      outcome: body.outcome,
      channel: body.channel,
      note: body.note.trim(),
      nextFollowUp: body.outcome === 'dont_contact' ? '' : date,
      contactedBy: admin._id,
      contactedByName: admin.username,
    });
    return { success: true, message: 'Contact saved' };
  }
}
