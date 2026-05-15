import * as mongoose from 'mongoose';

export const OtherExpenseSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: false,
      default: 'Other',
    },
    note: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
