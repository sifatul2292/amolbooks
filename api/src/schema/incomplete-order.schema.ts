import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

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
      ref: 'User',
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
