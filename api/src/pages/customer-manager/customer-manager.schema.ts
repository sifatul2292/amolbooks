import { Schema } from 'mongoose';

export const CustomerContactSchema = new Schema(
  {
    phone: { type: String, required: true },
    outcome: { type: String, required: true },
    channel: { type: String, required: true },
    note: { type: String, maxlength: 2000, default: '' },
    nextFollowUp: { type: String, default: '' },
    contactedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    contactedByName: { type: String },
  },
  { timestamps: true },
);
CustomerContactSchema.index({ phone: 1, createdAt: -1, _id: -1 });
