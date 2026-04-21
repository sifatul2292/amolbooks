import * as mongoose from 'mongoose';

export const BannerCaroselSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    image: {
      type: String,
      required: false,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    mobileImage: {
      type: String,
      required: false,
    },
    bannerType: {
      type: String,
      required: false,
    },
    priority: {
      type: Number,
      required: false,
    },
    url: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
