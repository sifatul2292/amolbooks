import * as mongoose from 'mongoose';

const ShippingChargeRuleSchema = new mongoose.Schema({
  fromGram: {
    type: Number,
    required: true,
    min: 0,
  },
  toGram: {
    type: Number,
    required: true,
    min: 0,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
});

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
    insideDhakaRules: {
      type: [ShippingChargeRuleSchema],
      required: false,
    },
    outsideDhakaRules: {
      type: [ShippingChargeRuleSchema],
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
