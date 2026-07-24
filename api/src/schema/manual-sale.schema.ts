import { Schema } from 'mongoose';

export const ManualSaleSchema = new Schema(
  {
    date: { type: String, required: true },       // YYYY-MM-DD
    revenue: { type: Number, required: true },
    cost: { type: Number, required: false },
    deliveryCharge: { type: Number, default: 0 },
    actualCourierCost: { type: Number, required: false },
    packagingCost: { type: Number, required: false },
    paymentFee: { type: Number, required: false },
    refundAmount: { type: Number, required: false },
    returnLoss: { type: Number, required: false },
    orders: { type: Number, default: 1 },
    source: { type: String, enum: ['whatsapp', 'phone', 'other'], default: 'whatsapp' },
    campaign: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' },
    outcome: { type: String, enum: ['active', 'delivered', 'cancelled', 'refunded', 'returned'], default: 'active' },
    products: { type: [Schema.Types.Mixed], default: [] },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);
