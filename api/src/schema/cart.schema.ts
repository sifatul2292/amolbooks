import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export const CartSchema = new mongoose.Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    selectedQty: {
      type: Number,
      required: true,
    },
    specialPackage: {
      type: Schema.Types.ObjectId,
      ref: 'SpecialPackage',
      required: false,
    },
    cartType: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
