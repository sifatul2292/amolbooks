import * as mongoose from 'mongoose';

export const UniqueIdSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  },
);
