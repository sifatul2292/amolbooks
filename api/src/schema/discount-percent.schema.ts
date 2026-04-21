import * as mongoose from 'mongoose';

export const DiscountPercentSchema = new mongoose.Schema(
  {
    readOnly: {
      type: Boolean,
      required: false,
    },
    discountType: {
      type: String,
      required: true,
      trim: true,
    },
    
  
    discountPercent: {
      type: Number,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
