import * as mongoose from 'mongoose';
import { PACKAGE_ITEMS } from './sub-schema.schema';

export const SpecialPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
    discountType: {
      type: Number,
      required: false,
    },
    discountAmount: {
      type: Number,
      required: false,
    },
    salePrice: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    active: {
      type:Boolean,
      required: false,
    },
    gifts: {
      type: [Object],
      required: false,
    },
    products: [PACKAGE_ITEMS],
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
