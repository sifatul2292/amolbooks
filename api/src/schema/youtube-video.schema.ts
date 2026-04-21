import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export const YoutubeVideoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    url: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    titleEn: {
      type: String,
      required: false,
    },

    seoImage: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
