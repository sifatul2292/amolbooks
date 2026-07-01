import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export const StockMovementSchema = new mongoose.Schema(
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
    qtyChange: {
      type: Number,
      required: true,
    },
    stockAfter: {
      type: Number,
      required: false,
    },
    reason: {
      type: String,
      enum: [
        'order',
        'cancel_restock',
        'return_restock',
        'manual_adjustment',
        'purchase',
      ],
      required: true,
    },
    referenceType: {
      type: String,
      required: false,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
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

StockMovementSchema.index({ product: 1, createdAt: -1 });
