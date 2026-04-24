import * as mongoose from 'mongoose';

export const BoughtTogetherConfigSchema = new mongoose.Schema(
  {
    productIds: { type: [String], required: true, default: [] },
  },
  { versionKey: false, timestamps: true },
);
