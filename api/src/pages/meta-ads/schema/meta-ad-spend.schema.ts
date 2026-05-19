import { Schema } from 'mongoose';

export const MetaAdSpendSchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    spend: { type: Number, required: true, default: 0 },
    source: { type: String, enum: ['manual', 'api'], default: 'manual' },
    currency: { type: String, default: 'BDT' },
  },
  { timestamps: true },
);

MetaAdSpendSchema.index({ date: 1 }, { unique: true });

export const MetaTokenSchema = new Schema(
  {
    accessToken: { type: String },
    adAccountId: { type: String },
    lastSync: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);
