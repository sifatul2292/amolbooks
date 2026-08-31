"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSchema = void 0;
const mongoose = require("mongoose");
const sub_schema_schema_1 = require("./sub-schema.schema");
const mongoose_1 = require("mongoose");
exports.OrderSchema = new mongoose.Schema({
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
            type: mongoose_1.Schema.Types.ObjectId,
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
            type: mongoose_1.Schema.Types.ObjectId,
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
            type: mongoose_1.Schema.Types.ObjectId,
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
    orderedItems: [sub_schema_schema_1.ORDER_ITEM_SCHEMA],
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
        type: mongoose_1.Schema.Types.Mixed,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    admin: {
        _id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Admin',
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
    },
    coupon: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    versionKey: false,
    timestamps: true,
});
exports.OrderSchema.index({ phoneNo: 1, createdAt: 1 });
//# sourceMappingURL=order.schema.js.map