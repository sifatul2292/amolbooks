import * as mongoose from "mongoose";
import { Schema } from "mongoose";

export const IncompleteOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: false,
      trim: true,
    },
    phoneNo: {
      type: String,
      required: false,
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
      required: false,
    },
    // The checkout sends division/area/zone alongside the typed address. Mongoose
    // used to drop them (not in the schema), so a row where the customer picked a
    // location but had not typed the street yet showed no address at all.
    division: {
      type: Schema.Types.Mixed,
      required: false,
    },
    area: {
      type: Schema.Types.Mixed,
      required: false,
    },
    zone: {
      type: Schema.Types.Mixed,
      required: false,
    },
    paymentType: {
      type: String,
      required: false,
    },
    paymentStatus: {
      type: String,
      required: false,
    },
    orderStatus: {
      type: Number,
      required: false,
    },
    grandTotal: {
      type: Number,
      required: false,
    },
    subTotal: {
      type: Number,
      required: false,
    },
    discount: {
      type: Number,
      required: false,
    },
    deliveryCharge: {
      type: Number,
      required: false,
    },
    checkoutDate: {
      type: String,
      required: false,
    },
    status: {
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
    fraudChecker: {
      type: Schema.Types.Mixed,
      required: false,
    },
    orderedItems: {
      type: [Schema.Types.Mixed],
      required: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Preserve the ad click/browser identity while checkout is still incomplete.
    // If staff later converts this row by phone, the resulting Purchase can use
    // the original visit rather than looking like an unrelated manual order.
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
  },
  {
    versionKey: false,
    timestamps: true,
  }
);
