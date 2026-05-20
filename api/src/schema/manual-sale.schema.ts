import { Schema } from 'mongoose';

export const ManualSaleSchema = new Schema(
  {
    date: { type: String, required: true },       // YYYY-MM-DD
    revenue: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    orders: { type: Number, default: 1 },
    source: { type: String, enum: ['whatsapp', 'phone', 'other'], default: 'whatsapp' },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);
