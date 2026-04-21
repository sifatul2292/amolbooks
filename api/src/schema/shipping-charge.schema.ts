import * as mongoose from 'mongoose';

export const ShippingChargeSchema = new mongoose.Schema(
  {
    deliveryInDhaka: {
      type: Number,
      required: true,
    },
    deliveryOutsideDhaka: {
      type: Number,
      required: true,
    },
    deliveryOutsideBD: {
      type: Number,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
