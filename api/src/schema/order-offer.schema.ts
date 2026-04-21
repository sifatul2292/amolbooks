import * as mongoose from 'mongoose';

export const OrderOfferSchema = new mongoose.Schema(
  {
    // First Time Order Offer
    firstOrderDiscountAmount: {
      type: Number,
      required: false,
    },
    firstOrderDiscountType: {
      type: Number,
      required: false,
    },
    firstOrderMinAmount: {
      type: Number,
      required: false,
    },
    // First Time Order Offer
    monthOrderDiscountAmount: {
      type: Number,
      required: false,
    },
    monthOrderDiscountType: {
      type: Number,
      required: false,
    },
    monthOrderMinAmount: {
      type: Number,
      required: false,
    },
    monthOrderValue: {
      type: Number,
      required: false,
    },
    // Amount Order Offer
    amountOrderDiscountAmount: {
      type: Number,
      required: false,
    },
    amountOrderDiscountType: {
      type: Number,
      required: false,
    },
    amountOrderMinAmount: {
      type: Number,
      required: false,
    },
    // Amount Order Offer 2
    amount2OrderDiscountAmount: {
      type: Number,
      required: false,
    },
    amount2OrderDiscountType: {
      type: Number,
      required: false,
    },
    amount2OrderMinAmount: {
      type: Number,
      required: false,
    },
    // Amount Order Offer 3
    amount3OrderDiscountAmount: {
      type: Number,
      required: false,
    },
    amount3OrderDiscountType: {
      type: Number,
      required: false,
    },
    amount3OrderMinAmount: {
      type: Number,
      required: false,
    },

    // Apps Order Offer
    appsOrderDiscountAmount: {
      type: Number,
      required: false,
    },
    appsOrderDiscountType: {
      type: Number,
      required: false,
    },
    appsOrderMinAmount: {
      type: Number,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
