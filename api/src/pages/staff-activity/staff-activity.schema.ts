import { Schema } from 'mongoose';

export const STAFF_ACTIONS = [
  'courier_sent',
  'processing_moved',
  'incomplete_converted',
];

// One scored action per order (or incomplete order). Retries, double clicks and
// toggling a status back and forth can never add points twice.
export const StaffActivitySchema = new Schema(
  {
    action: { type: String, enum: STAFF_ACTIONS, required: true },
    // Order _id, or IncompleteOrder _id for conversions.
    target: { type: Schema.Types.ObjectId, required: true },
    orderId: { type: String },
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminName: { type: String },
    adminRole: { type: String },
    fromStatus: { type: Number },
    toStatus: { type: Number },
    provider: { type: String },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);
StaffActivitySchema.index({ action: 1, target: 1 }, { unique: true });
StaffActivitySchema.index({ createdAt: -1, admin: 1 });

export const StaffPointsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    courierSent: { type: Number },
    processingMoved: { type: Number },
    incompleteConverted: { type: Number },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    updatedByName: { type: String },
  },
  { versionKey: false, timestamps: true },
);
