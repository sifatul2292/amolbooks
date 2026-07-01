import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export const StockPurchaseSchema = new mongoose.Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: {
      type: String,
      required: false,
    },
    qty: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      required: true,
    },
    totalCost: {
      type: Number,
      required: false,
    },
    supplierName: {
      type: String,
      required: false,
    },
    note: {
      type: String,
      required: false,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    adminName: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

StockPurchaseSchema.index({ product: 1, createdAt: -1 });
