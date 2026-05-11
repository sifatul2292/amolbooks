import * as mongoose from 'mongoose';

export const AdSpendSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true, // one doc per day
    },
    spendUSD: {
      type: Number,
      required: true,
      default: 0,
    },
    spendBDT: {
      type: Number,
      required: true,
      default: 0,
    },
    exchangeRate: {
      type: Number,
      required: false,
      default: 130,
    },
    source: {
      type: String,
      required: false,
      enum: ['meta_auto', 'manual'],
      default: 'manual',
    },
    campaigns: [
      {
        name: { type: String },
        spendUSD: { type: Number },
      },
    ],
    adAccountId: {
      type: String,
      required: false,
    },
    fetchedAt: {
      type: Date,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
