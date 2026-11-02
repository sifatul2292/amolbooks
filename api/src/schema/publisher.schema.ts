import * as mongoose from 'mongoose';

export const PublisherSchema = new mongoose.Schema(
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
    nameEn: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    // About the publisher (HTML paragraphs), shown on its book list like Rokomari.
    description: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
