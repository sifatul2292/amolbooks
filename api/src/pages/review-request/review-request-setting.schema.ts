import { Schema } from 'mongoose';

/**
 * Review request settings staff change from the Customer Manager page (owner, 2026-11-14: "send
 * out about 50 messages a day, we can increase it later on"). One document, key 'review-request'.
 */
export const ReviewRequestSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    dailyLimit: { type: Number },
    updatedByName: { type: String, default: '' },
  },
  { timestamps: true },
);
