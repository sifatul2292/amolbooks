import * as mongoose from 'mongoose';

export const GallerySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: true,
    },
    metaTitle: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    size: {
      type: Number,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
