import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderService } from '../sales/order/order.service';
import { UtilsService } from '../../shared/utils/utils.service';
import { AddOrderDto } from '../../dto/order.dto';
import { OrderStatus } from '../../enum/order.enum';

export const CONTACT_OUTCOMES = [
  'interested',
  'no_answer',
  'follow_up',
  'ordered',
  'dont_contact',
];
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

@Injectable()
export class CustomerManagerService {
  constructor(
    @InjectModel('Order') private readonly orders: Model<any>,
    @InjectModel('CustomerContact') private readonly contacts: Model<any>,
    @InjectModel('Product') private readonly products: Model<any>,
    private readonly orderService: OrderService,
    private readonly utils: UtilsService,
  ) {}

  private base(): any[] {
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
      {
        $match: {
          orderStatus: {
            $nin: [OrderStatus.CANCEL, OrderStatus.REFUND, OrderStatus.RETURN],
          },
          'courierStatus.status': {
            $nin: ['cancelled', 'partial_delivered', 'returned'],
          },
          $or: [
            { orderStatus: OrderStatus.DELIVERED },
            { 'courierStatus.status': 'delivered' },
          ],
        },
      },
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

  private customerPipeline(): any[] {
    return [
      ...this.base(),
      {
        $project: {
          crmPhone: 1,
          name: 1,
          shippingAddress: 1,
          city: 1,
          createdAt: 1,
          grandTotal: 1,
          'orderedItems._id': 1,
          'orderedItems.name': 1,
          'orderedItems.category': 1,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: '$crmPhone',
          name: { $first: '$name' },
          shippingAddress: { $first: '$shippingAddress' },
          city: { $first: '$city' },
          lastPurchase: { $first: '$createdAt' },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$grandTotal' },
          maxOrderValue: { $max: '$grandTotal' },
          itemGroups: { $push: { $ifNull: ['$orderedItems', []] } },
        },
      },
      {
        $set: {
          items: {
            $reduce: {
              input: '$itemGroups',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] },
            },
          },
        },
      },
      {
        $set: {
          missingCategoryProductIds: {
            $map: {
              input: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $not: [{ $ifNull: ['$$item.category.name', false] }],
                  },
                },
              },
              as: 'item',
              in: '$$item._id',
            },
          },
        },
      },
      {
        $lookup: {
          from: this.products.collection.name,
          localField: 'missingCategoryProductIds',
          foreignField: '_id',
          as: 'catalog',
        },
      },
      {
        $lookup: {
          from: this.contacts.collection.name,
          let: { phone: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$phone', '$$phone'] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 1 },
          ],
          as: 'contact',
        },
      },
      {
        $set: {
          latestContact: { $arrayElemAt: ['$contact', 0] },
          phone: '$_id',
        },
      },
    ];
  }

  async list(query: any) {
    const match: any = {};
    const numeric = (key: string) => {
      if (!query[key]) return undefined;
      const value = Number(query[key]);
      if (!Number.isFinite(value) || value < 0)
        throw new BadRequestException('Invalid ' + key);
      return value;
    };
    const min = numeric('minSpent'),
      max = numeric('maxSpent'),
      orderMin = numeric('minOrderValue'),
      days = numeric('days');
    if (min !== undefined || max !== undefined)
      match.totalSpent = {
        ...(min !== undefined ? { $gte: min } : {}),
        ...(max !== undefined ? { $lte: max } : {}),
      };
    if (orderMin !== undefined) match.maxOrderValue = { $gte: orderMin };
    if (days !== undefined)
      match.lastPurchase = { $lte: new Date(Date.now() - days * 86400000) };
    if (query.frequency === 'repeat') match.orderCount = { $gte: 2 };
    if (query.frequency === 'once') match.orderCount = 1;
    const escaped = (s: string) =>
      String(s)
        .slice(0, 120)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (query.q)
      match.$or = [
        { name: new RegExp(escaped(query.q), 'i') },
        { phone: new RegExp(escaped(query.q), 'i') },
      ];
    if (query.product)
      match['items.name'] = new RegExp(escaped(query.product), 'i');
    if (query.category)
      match.$and = [
        {
          $or: [
            { 'items.category.name': new RegExp(escaped(query.category), 'i') },
            {
              'catalog.category.name': new RegExp(escaped(query.category), 'i'),
            },
          ],
        },
      ];
    const due = {
      'latestContact.nextFollowUp': { $gt: '', $lte: dhakaToday() },
      'latestContact.outcome': { $ne: 'dont_contact' },
    };
    if (query.status === 'never') match['latestContact'] = { $exists: false };
    else if (query.status === 'contacted')
      match.latestContact = { $exists: true };
    else if (query.status === 'due') Object.assign(match, due);
    else if (CONTACT_OUTCOMES.includes(query.status))
      match['latestContact.outcome'] = query.status;
    else if (query.status)
      throw new BadRequestException('Invalid contact status');
    if (!['dont_contact', 'contacted'].includes(query.status))
      match['latestContact.outcome'] = match['latestContact.outcome'] || {
        $ne: 'dont_contact',
      };
    const page = Math.max(
      1,
      Math.min(100000, Math.floor(Number(query.page) || 1)),
    );
    const sort =
      query.sort === 'spent'
        ? { totalSpent: -1, _id: 1 }
        : { lastPurchase: -1, _id: 1 };
    const result = await this.orders
      .aggregate([
        ...this.customerPipeline(),
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  customers: { $sum: 1 },
                  followedUp: {
                    $sum: {
                      $cond: [{ $ifNull: ['$latestContact', false] }, 1, 0],
                    },
                  },
                  never: {
                    $sum: { $cond: [{ $not: ['$latestContact'] }, 1, 0] },
                  },
                  due: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gt: ['$latestContact.nextFollowUp', ''] },
                            {
                              $lte: [
                                '$latestContact.nextFollowUp',
                                dhakaToday(),
                              ],
                            },
                            { $ne: ['$latestContact.outcome', 'dont_contact'] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            rows: [
              { $match: match },
              { $sort: sort },
              { $skip: (page - 1) * 20 },
              { $limit: 20 },
              {
                $project: {
                  _id: 0,
                  phone: 1,
                  name: 1,
                  shippingAddress: 1,
                  city: 1,
                  orderCount: 1,
                  totalSpent: 1,
                  lastPurchase: 1,
                  latestContact: 1,
                },
              },
            ],
            count: [{ $match: match }, { $count: 'value' }],
          },
        },
      ])
      .allowDiskUse(true);
    return {
      success: true,
      data: {
        rows: result[0].rows,
        total: result[0].count[0]?.value || 0,
        page,
        pageSize: 20,
        summary: result[0].summary[0] || {
          customers: 0,
          followedUp: 0,
          never: 0,
          due: 0,
        },
      },
    };
  }

  async detail(rawPhone: string) {
    const phone = normalizeCustomerPhone(rawPhone);
    if (!phone) throw new BadRequestException('Invalid phone number');
    const customer = await this.orders.aggregate([
      ...this.base(),
      { $match: { crmPhone: phone } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$grandTotal' },
        },
      },
    ]);
    if (!customer.length)
      throw new NotFoundException('No delivered orders for this customer');
    const [orders, history] = await Promise.all([
      this.orders.aggregate([
        ...this.base(),
        { $match: { crmPhone: phone } },
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
      ]),
      this.contacts
        .find({ phone })
        .sort({ createdAt: -1, _id: -1 })
        .limit(50)
        .lean(),
    ]);
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
        totalSpent: customer[0].totalSpent,
        orders,
        history,
      },
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
    return this.orderService.addAiAssistOrderAdmin(admin, payload, body.source);
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
    const date = body.nextFollowUp || '';
    if (
      typeof date !== 'string' ||
      (date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date))
    )
      throw new BadRequestException('Invalid follow-up date');
    await this.detail(phone);
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
