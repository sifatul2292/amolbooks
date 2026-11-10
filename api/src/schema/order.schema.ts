import * as mongoose from 'mongoose';
import { ORDER_ITEM_SCHEMA } from './sub-schema.schema';
import { Schema } from 'mongoose';

export const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNo: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    orderSmsSent: {
      type: Boolean,
      required: false,
      default: false,
    },
    courierData: {
      providerName: {
        type: String,
        required: false,
      },
      consignmentId: {
        type: String,
        required: false,
      },
      trackingId: {
        type: String,
        required: false,
      },
      createdAt: {
        type: String,
        required: false,
      },
    },
    zone: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Zone',
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
    },
    division: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Division',
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
    },
    area: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Area',
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
    },
    paymentType: {
      type: String,
      required: false,
    },
    orderFrom: {
      type: String,
      required: false,
    },
    orderOrigin: {
      type: String,
      enum: ['website', 'incomplete', 'admin'],
      required: false,
    },
    manualOrderSource: {
      type: String,
      enum: [
        'whatsapp',
        'whatsapp_ad',
        'phone',
        'facebook',
        'instagram',
        'email',
        'walk_in',
        'other',
      ],
      required: false,
    },
    manualOrderRequestId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    metaPurchaseStatus: {
      type: String,
      enum: ['sending', 'sent', 'failed'],
      required: false,
    },
    metaPurchaseEventId: {
      type: String,
      required: false,
    },
    metaPurchaseLastAttemptAt: {
      type: Date,
      required: false,
    },
    metaPurchaseAttemptCount: {
      type: Number,
      required: false,
      default: 0,
    },
    metaPurchaseSentAt: {
      type: Date,
      required: false,
    },
    metaPurchaseError: {
      type: String,
      required: false,
    },
    metaPurchaseDeliveryChannel: {
      type: String,
      enum: [
        'tagioo',
        'direct_meta',
        'direct_meta_fallback',
        'website_gap_fill',
      ],
      required: false,
    },
    // Set by the storefront purchase beacon the moment the browser actually
    // pushes purchase_stape to the dataLayer. Absence of this on a website
    // order is the signal that Stape never received a Purchase for it, which
    // is what the gap-fill job acts on.
    browserPurchaseFiredAt: {
      type: Date,
      required: false,
    },
    browserPurchaseEventId: {
      type: String,
      required: false,
    },
    tagiooPurchaseEventId: {
      type: String,
      required: false,
    },
    tagiooPurchaseError: {
      type: String,
      required: false,
    },
    attribution: {
      anonymousId: { type: String, required: false },
      gaClientId: { type: String, required: false },
      gaSessionId: { type: String, required: false },
      firstTouch: {
        source: { type: String, required: false },
        medium: { type: String, required: false },
        campaign: { type: String, required: false },
        campaignId: { type: String, required: false },
        adSet: { type: String, required: false },
        adSetId: { type: String, required: false },
        ad: { type: String, required: false },
        adId: { type: String, required: false },
        landingPage: { type: String, required: false },
        referrer: { type: String, required: false },
        fbclid: { type: String, required: false },
        gclid: { type: String, required: false },
        wbraid: { type: String, required: false },
        gbraid: { type: String, required: false },
        fbc: { type: String, required: false },
        fbp: { type: String, required: false },
        capturedAt: { type: Date, required: false },
      },
      lastTouch: {
        source: { type: String, required: false },
        medium: { type: String, required: false },
        campaign: { type: String, required: false },
        campaignId: { type: String, required: false },
        adSet: { type: String, required: false },
        adSetId: { type: String, required: false },
        ad: { type: String, required: false },
        adId: { type: String, required: false },
        landingPage: { type: String, required: false },
        referrer: { type: String, required: false },
        fbclid: { type: String, required: false },
        gclid: { type: String, required: false },
        wbraid: { type: String, required: false },
        gbraid: { type: String, required: false },
        fbc: { type: String, required: false },
        fbp: { type: String, required: false },
        capturedAt: { type: Date, required: false },
      },
      // Client user agent and IP captured with the order POST. Meta requires a
      // matching pair alongside fbc/fbp for a website-source event.
      clientUserAgent: { type: String, required: false },
      clientIpAddress: { type: String, required: false },
    },
    courierStatus: {
      status: { type: String, required: false },
      notificationType: { type: String, required: false },
      trackingMessage: { type: String, required: false },
      codAmount: { type: Number, required: false },
      deliveryCharge: { type: Number, required: false },
      updatedAt: { type: String, required: false },
      receivedAt: { type: Date, required: false },
      lastSyncedAt: { type: Date, required: false },
      lastSyncError: { type: String, required: false },
      chargeLookupAttemptedAt: { type: Date, required: false },
      chargeLookupError: { type: String, required: false },
      backfillAttemptedAt: { type: Date, required: false },
      backfillError: { type: String, required: false },
    },
    courierStatusHistory: [
      {
        _id: false,
        eventKey: { type: String, required: true },
        notificationType: { type: String, required: true },
        status: { type: String, required: false },
        trackingMessage: { type: String, required: false },
        updatedAt: { type: String, required: false },
        receivedAt: { type: Date, required: true },
      },
    ],
    paymentStatus: {
      type: String,
      required: true,
    },
    courierLink: {
      type: String,
      required: false,
    },
    orderedItems: [ORDER_ITEM_SCHEMA],
    subTotal: {
      type: Number,
      required: true,
    },
    deliveryCharge: {
      type: Number,
      required: false,
    },
    actualCourierCost: { type: Number, required: false },
    packagingCost: { type: Number, required: false },
    paymentFee: { type: Number, required: false },
    refundAmount: { type: Number, required: false },
    returnLoss: { type: Number, required: false },
    fraudChecker: {
      type: Schema.Types.Mixed,
      required: false,
    },
    weightBasedDeliveryCharge: {
      type: Number,
      required: false,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
    },
    orderDiscountFromApps: {
      type: Number,
      required: false,
    },
    month: {
      type: Number,
      required: false,
    },
    year: {
      type: Number,
      required: false,
    },
    productDiscount: {
      type: Number,
      required: false,
    },
    sslSessionId: {
      type: String,
      required: false,
    },
    bkashPaymentId: {
      type: String,
      required: false,
    },
    nagadPaymentId: {
      type: String,
      required: false,
    },
    grandTotal: {
      type: Number,
      required: false,
    },
    discountTypes: {
      type: [Object],
      required: false,
    },
    checkoutDate: {
      type: String,
      required: false,
    },
    deliveryDate: {
      type: Date,
      required: false,
    },
    deliveryDateString: {
      type: String,
      required: false,
    },
    orderStatus: {
      type: Number,
      required: true,
    },
    hasOrderTimeline: {
      type: Boolean,
      required: false,
    },
    orderTimeline: {
      type: Object,
      required: false,
    },
    processingDate: {
      type: Date,
      required: false,
    },
    shippingDate: {
      type: Date,
      required: false,
    },
    deliveringDate: {
      type: Date,
      required: false,
    },
    preferredDateString: {
      type: String,
      required: false,
    },
    preferredTime: {
      type: String,
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    adminNote: {
      type: String,
      required: false,
    },
    // Staff who last wrote adminNote (staff-activity).
    adminNoteBy: {
      _id: { type: Schema.Types.ObjectId, ref: 'Admin' },
      name: { type: String },
      role: { type: String },
      at: { type: Date },
    },
    // Every staff note, oldest first, with its writer and time (owner,
    // 2026-11-08); adminNote keeps the latest text. Unset on older records.
    adminNotes: {
      type: [
        {
          _id: false,
          text: { type: String },
          at: { type: Date },
          by: {
            _id: { type: Schema.Types.ObjectId, ref: 'Admin' },
            name: { type: String },
            role: { type: String },
          },
        },
      ],
      default: undefined,
    },
    // Automatic WhatsApp messages (shared/whatsapp): one per kind, with Meta's
    // delivery status. Unset until the first message.
    whatsappMessages: {
      type: [
        {
          _id: false,
          kind: { type: String },
          template: { type: String },
          to: { type: String },
          status: { type: String },
          messageId: { type: String },
          error: { type: String },
          at: { type: Date },
          updatedAt: { type: Date },
        },
      ],
      default: undefined,
    },
    // The customer's answer on the WhatsApp order message: confirmed (status set to
    // Confirmed). Older orders may have status change (now customerRequest). Unset until
    // they tap a button.
    customerConfirmation: {
      status: { type: String },
      at: { type: Date },
      via: { type: String },
      messageId: { type: String },
    },
    // "একই ডেলিভারি চার্জে আরও বই নিবো" (kind more) or "পরিবর্তন চাই" (kind change) tapped on the WhatsApp order
    // message: staff add the books / call. Unset until the customer asks.
    customerRequest: {
      kind: { type: String },
      at: { type: Date },
      via: { type: String },
      messageId: { type: String },
      // Staff handled it (WhatsApp Inbox "Mark done"): the nudge goes away.
      doneAt: { type: Date },
      doneBy: { type: String },
    },
    // Order SMS held back while the WhatsApp order message is on its way (WhatsappService
    // settles it: SMS when not delivered in time, else orderSmsSkippedAt).
    orderSmsDueAt: { type: Date, required: false },
    orderSmsSkippedAt: { type: Date, required: false },
    // Staff whose action booked the courier parcel.
    courierSentBy: {
      _id: { type: Schema.Types.ObjectId, ref: 'Admin' },
      name: { type: String },
      role: { type: String },
      at: { type: Date },
    },
    // Staff credit scored when the parcel is sent (staff-activity): who converted the
    // order (incomplete / crm) and the customer's own book count plus who added more.
    staffCredit: {
      type: Schema.Types.Mixed,
      required: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    admin: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
    },
    coupon: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: false,
    },
    couponDiscount: {
      type: Number,
      required: false,
    },
    customerCancelledAt: { type: Date },
    customerCancellationReason: { type: String },
    customerCancellationPhone: { type: String },
    customerRestockCompletedAt: { type: Date },
    inventoryRestockKey: { type: String, select: false },
    courierBookingStartedAt: { type: Date },
    // Future delivery (owner, 2026-11-08): sent to the courier automatically at `at`
    // (pages/sales/courier-schedule). status: scheduled | sending | sent | failed.
    courierSchedule: {
      at: { type: Date },
      status: { type: String },
      by: {
        _id: { type: Schema.Types.ObjectId, ref: 'Admin' },
        name: { type: String },
        role: { type: String },
      },
      scheduledAt: { type: Date },
      startedAt: { type: Date },
      sentAt: { type: Date },
      failedAt: { type: Date },
      error: { type: String },
    },
    stockOperationInProgress: { type: Boolean },
    stockDecremented: {
      type: Boolean,
      required: false,
      default: false,
    },
    stockRestocked: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

OrderSchema.index({ phoneNo: 1, createdAt: 1 });

// WhatsApp delivery updates find their order by message id.
OrderSchema.index({ 'whatsappMessages.messageId': 1 }, { sparse: true });
// Held order SMS (only orders waiting for their WhatsApp delivery) and the hand-over
// answer's latest order for a customer's number.
OrderSchema.index({ orderSmsDueAt: 1 }, { sparse: true });
OrderSchema.index({ 'whatsappMessages.to': 1, createdAt: -1 }, { name: 'whatsapp_to_latest', partialFilterExpression: { 'whatsappMessages.to': { $exists: true } } });

// Future delivery: the every-minute run and the Orders page tab.
OrderSchema.index(
  { 'courierSchedule.status': 1, 'courierSchedule.at': 1 },
  { name: 'courier_schedule', partialFilterExpression: { 'courierSchedule.status': { $exists: true } } },
);

OrderSchema.index({ customerCancelledAt: 1, customerRestockCompletedAt: 1 }, {
  name: 'customer_cancellation_recovery',
  partialFilterExpression: { customerCancelledAt: { $exists: true }, stockDecremented: true },
});
