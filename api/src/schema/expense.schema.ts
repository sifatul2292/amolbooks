import * as mongoose from 'mongoose';

export const ExpenseSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true, // 'YYYY-MM-DD'
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    category: {
      type: String,
      required: false,
      enum: ['salary', 'courier', 'packaging', 'other'],
      default: 'other',
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
