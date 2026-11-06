import { Schema } from 'mongoose';

export const STAFF_ACTIONS = [
  'courier_sent',
  'processing_moved',
  'incomplete_converted',
  'crm_converted',
  'extra_items',
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
    // extra_items: books staff added beyond what the customer chose.
    quantity: { type: Number },
    // incomplete_converted: the order whose parcel scored the conversion.
    creditedOrder: { type: Schema.Types.ObjectId },
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
    crmConverted: { type: Number },
    extraItems: { type: Number },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    updatedByName: { type: String },
  },
  { versionKey: false, timestamps: true },
);

// "Who is calling whom" on the order pages. One row per call a staff member
// starts (phone link or "I'm calling"); `phoneKey` is the local 01XXXXXXXXX
// form, so every row with that customer shows the same call. A call stays
// active until "Done", a new call by the same person, or `expiresAt`; the row
// itself is removed by Mongo three days later.
export const StaffCallSchema = new Schema(
  {
    phoneKey: { type: String, required: true },
    phone: { type: String },
    kind: { type: String, enum: ['order', 'incomplete', 'customer'] },
    target: { type: String },
    label: { type: String },
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminName: { type: String },
    adminRole: { type: String },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    endedBy: { type: String },
    purgeAt: { type: Date, required: true },
  },
  { versionKey: false },
);
StaffCallSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
StaffCallSchema.index({ startedAt: -1 });
StaffCallSchema.index({ phoneKey: 1, startedAt: -1 });
