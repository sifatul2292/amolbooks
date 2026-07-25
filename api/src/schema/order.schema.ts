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
    metaPurchaseSentAt: {
      type: Date,
      required: false,
    },
    metaPurchaseError: {
      type: String,
      required: false,
    },
    attribution: {
      anonymousId: { type: String, required: false },
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
        capturedAt: { type: Date, required: false },
      },
    },
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
