import * as mongoose from 'mongoose';

export const RedirectUrlSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fromUrl: {
      type: String,
      required: false,
    },
    toUrl: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
